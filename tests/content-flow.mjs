import {verifyAccount} from './helpers/membership.cjs';
import {spawn} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const folder=mkdtempSync(join(tmpdir(),'buzhi-content-')),dbPath=join(folder,'test.sqlite');
const port=54500+Math.floor(Math.random()*1000),base='http://127.0.0.1:'+port,admin='isolated-content-admin-secret-0000000000';
let server,db,logs='';
async function start(){server=spawn(process.execPath,['server/index.mjs'],{cwd:fileURLToPath(new URL('..',import.meta.url)),env:{...process.env,HOST:'127.0.0.1',PORT:String(port),DB_PATH:dbPath,ADMIN_TOKEN:admin},stdio:['ignore','ignore','pipe']});server.stderr.on('data',c=>logs+=c);for(let i=0;i<60;i++){try{if((await fetch(base+'/health')).ok)return}catch{}await new Promise(r=>setTimeout(r,100))}throw Error(logs)}
async function stop(){if(server?.exitCode===null){const done=new Promise(r=>server.once('exit',r));server.kill();await done}}
async function api(path,body,token){const r=await fetch(base+'/api/'+path,{method:body===undefined?'GET':'POST',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json()}}
function snapshot(){return Object.fromEntries(['users','sessions','ledger','tasks','draws','checkins','codes','bonuses'].map(t=>[t,db.prepare('SELECT * FROM '+t+' ORDER BY rowid').all()]))}
try{
 await start();const initial=await api('admin/oc',undefined,admin);assert.equal(initial.status,200,'OC editing API');assert.deepEqual(initial.data.map(p=>p.id).sort(),['oc-official-caicai','oc-official-zhizhi']);
 const account=(await api('register',{password:'Isolated-test-password-2026!',nickname:'内容保留测试'})).data;await verifyAccount(base,admin,account);await api('draw',{},account.token);db=new DatabaseSync(dbPath);const before=snapshot();
 const form={name:'测试 OC <角色>',description:'故事 & 简介',sortOrder:0,hidden:false};
 for(const path of ['admin/oc','admin/cards']){assert.equal((await api(path)).status,403);assert.equal((await api(path,form,account.token)).status,403)}
 const added=await api('admin/oc',form,admin);assert.equal(added.status,200);const oc=added.data;oc.imageAsset='oc/'+oc.id+'.webp';assert.match(oc.id,/^oc-[A-Za-z0-9_-]{8,30}$/);
 assert((await api('oc')).data.some(p=>p.id===oc.id));
 assert.equal((await api('admin/oc',{...form,id:oc.id,sortOrder:999},admin)).status,200);assert.equal((await api('oc')).data.at(-1).id,oc.id,'Higher order must appear after existing profiles');
 const changed=await api('admin/oc',{...form,id:oc.id,name:'新人物',hidden:true,sortOrder:9},admin);assert.equal(changed.status,200);assert(!(await api('oc')).data.some(p=>p.id===oc.id));assert((await api('admin/oc',undefined,admin)).data.some(p=>p.id===oc.id));
 assert.equal((await api('admin/oc',{...form,name:''},admin)).status,400);
 const metadata={cardId:'UR-1',name:'新的卡名 <b>',rarity:'SSR',story:'新的故事 & 记忆',ocId:oc.id};assert.equal((await api('admin/cards',metadata,admin)).status,200);
 const catalog=(await api('catalog')).data;assert.equal(catalog.cards.length,46);assert.equal(catalog.visibleCards,46);assert.equal(catalog.totalSlots,50);assert.equal(catalog.cost,50);const card=catalog.cards.find(c=>c.id==='UR-1');assert.equal(card.name,metadata.name);assert.equal(card.story,metadata.story);assert.equal(card.characters,'新人物');assert.equal(card.rarity,'SSR');assert.equal(card.previewId,'BZ-01');
 for(const bad of [{...metadata,rarity:'INVALID'},{...metadata,cardId:'N-999'},{...metadata,ocId:'unknown'},{...metadata,name:''}])assert.equal((await api('admin/cards',bad,admin)).status,400);
 const image=Buffer.concat([Buffer.from('RIFF'),Buffer.from([16,0,0,0]),Buffer.from('WEBPVP8 '),Buffer.alloc(8)]).toString('base64');
 assert.equal((await api('admin/assets/upload',{name:oc.imageAsset,base64:image},admin)).status,200);assert.equal((await fetch(base+'/assets/'+oc.imageAsset)).status,200);
 const manifest=(await api('assets-manifest')).data;assert.equal(manifest.assets[oc.imageAsset],true);
 const settings={scale:125,x:40,y:30,opacity:80,fit:'cover',layer:1};assert.equal((await api('admin/assets/layout',{name:oc.imageAsset,settings},admin)).status,200);assert.deepEqual((await api('assets-manifest')).data.layouts[oc.imageAsset],settings);
 const assets=(await api('admin/assets',undefined,admin)).data;assert(assets.some(x=>x.name===oc.imageAsset));const help=assets.find(x=>x.name==='decor/collection-background.webp').help;assert(help.description.includes('统计'));assert(assets.find(x=>x.name==='cards/UR-1.webp').help.label.includes('卡'));
 const exported=(await api('admin/export',undefined,admin)).data;assert(exported.data.ocProfiles.some(p=>p.id===oc.id));assert(exported.data.cardProfiles.some(p=>p.card_id==='UR-1'));
 assert.deepEqual(snapshot(),before,'Content edits must preserve participants and card ownership');db.close();db=null;
 await stop();await start();assert((await api('admin/oc',undefined,admin)).data.some(p=>p.id===oc.id&&p.hidden));assert.equal((await api('catalog')).data.cards[0].name,metadata.name);assert.equal((await fetch(base+'/assets/'+oc.imageAsset)).status,200);
 console.log('PASS OC create/edit/hide/order/image persistence, 46-card public metadata, 4 hidden slots and unchanged rules, asset descriptions, export, auth and participant preservation');
}finally{db?.close();await stop();rmSync(folder,{recursive:true,force:true})}
