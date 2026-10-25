import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync,readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {availablePort} from './helpers/port.mjs';
const dir=mkdtempSync(join(tmpdir(),'card-assets-')),port=await availablePort(),base='http://127.0.0.1:'+port;
const expected=Array.from({length:28},(_,i)=>'LOCK-'+(33+i));const placeholders=new Set([...Array.from({length:4},(_,i)=>'LOCK-'+(46+i)),...Array.from({length:10},(_,i)=>'LOCK-'+(51+i))]);
const server=spawn(process.execPath,['server/index.mjs'],{env:{...process.env,HOST:'127.0.0.1',PORT:String(port),DB_PATH:join(dir,'db.sqlite'),ASSET_DIR:join(dir,'assets'),ADMIN_TOKEN:'card-artwork-isolated-test-000000000000'},stdio:'ignore'});
try{
 for(let i=0;i<100;i++){try{if((await fetch(base+'/health')).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
 const catalog=await(await fetch(base+'/api/catalog')).json();
 assert.deepEqual(catalog.cards.filter(c=>c.id.startsWith('LOCK-')).map(c=>c.id),expected);
 assert.equal(catalog.cards.length,60);assert.equal(catalog.visibleCards,60);
 assert.deepEqual(Object.fromEntries(['UR','SSR','SR','R','N'].map(r=>[r,catalog.cards.filter(c=>c.rarity===r).length])),{UR:4,SSR:8,SR:11,R:17,N:20});
 assert.deepEqual(catalog.cards.slice(0,32).map(c=>c.previewId),Array.from({length:32},(_,i)=>'BZ-'+String(i+1).padStart(2,'0')));
 assert.equal(catalog.cards.at(-1).previewId,'BZ-60');
 const manifest=await(await fetch(base+'/api/assets-manifest')).json(),hash=b=>createHash('sha256').update(b).digest('hex');
 for(const id of expected){const path='cards/'+id+'.webp',r=await fetch(base+'/assets/'+path);assert.equal(r.status,200,id);const bytes=Buffer.from(await r.arrayBuffer());if(placeholders.has(id)){assert.match(r.headers.get('content-type'),/image\/svg\+xml/);assert.match(bytes.toString('utf8'),/<svg/);assert.equal(manifest.assets[path],false,id+' placeholder is not uploaded')}else{assert.equal(r.headers.get('content-type'),'image/webp');assert.equal(hash(bytes),hash(readFileSync('assets/'+path)),id+' artwork bytes');assert.equal(manifest.assets[path],true,id+' manifest')}}
 const override=readFileSync('assets/cards/LOCK-50.webp');mkdirSync(join(dir,'assets/cards'),{recursive:true});writeFileSync(join(dir,'assets/cards/LOCK-33.webp'),override);
 assert.equal(hash(Buffer.from(await(await fetch(base+'/assets/cards/LOCK-33.webp')).arrayBuffer())),hash(override),'uploaded art takes precedence');
 console.log('PASS 60 cards, original 14 artwork files, 14 generated placeholder responses, uploaded precedence, and rarity counts');
}finally{const exited=new Promise(r=>server.once('exit',r));server.kill();await exited;rmSync(dir,{recursive:true,force:true})}
