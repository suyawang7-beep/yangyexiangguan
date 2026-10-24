const assert=require('node:assert/strict'),{spawn}=require('node:child_process'),{mkdtempSync,rmSync}=require('node:fs'),{join}=require('node:path'),{tmpdir}=require('node:os'),{DatabaseSync}=require('node:sqlite');
const folder=mkdtempSync(join(tmpdir(),'buzhi-card-release-')),dbPath=join(folder,'test.sqlite'),admin='card-release-local-admin-000000000000';let server,db,base,logs='';
async function api(path,body,token,status=200){const r=await fetch(base+'/api/'+path,{method:body===undefined?'GET':'POST',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});assert.equal(r.status,status,path);return r.json()}
async function start(){const {availablePort}=await import('./helpers/port.mjs'),port=await availablePort();base='http://127.0.0.1:'+port;server=spawn(process.execPath,['server/index.mjs'],{env:{...process.env,HOST:'127.0.0.1',PORT:String(port),DB_PATH:dbPath,ASSET_DIR:join(folder,'assets'),ADMIN_TOKEN:admin},stdio:['ignore','ignore','pipe']});server.stderr.on('data',x=>logs+=x);for(let i=0;i<100;i++){try{if((await fetch(base+'/health')).ok)return}catch{}await new Promise(r=>setTimeout(r,100))}throw Error(logs)}
async function stop(){if(server){const exited=new Promise(r=>server.once('exit',r));server.kill();await exited;server=null}}
const newIds=[...Array.from({length:13},(_,i)=>'LOCK-'+(i+33)),'LOCK-50'];
(async()=>{
 await start();db=new DatabaseSync(dbPath);const initial=await api('catalog');assert.equal(initial.cards.length,46);assert.equal(initial.visibleCards,46);assert.equal(initial.totalSlots,50);assert.deepEqual(Object.fromEntries(['UR','SSR','SR','R','N'].map(r=>[r,initial.cards.filter(c=>c.rarity===r).length])),{UR:3,SSR:6,SR:8,R:13,N:16});
 assert.deepEqual(initial.cards.filter(c=>c.id.startsWith('LOCK-')).map(c=>c.id),newIds);assert.deepEqual(initial.cards.slice(0,32).map(c=>c.previewId),Array.from({length:32},(_,i)=>'BZ-'+String(i+1).padStart(2,'0')));
 for(const id of newIds){const response=await fetch(base+'/assets/cards/'+id+'.webp');assert.equal(response.status,200,id);assert.equal(response.headers.get('content-type'),'image/webp');const bytes=Buffer.from(await response.arrayBuffer());assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP')}
 const account=await api('register',{nickname:'卡池隔离测试',password:'card-release-fixture-password'}),token=account.token;
 await api('admin/cards',{cardId:'LOCK-33',name:'测试',rarity:'SSR'},undefined,403);await api('admin/cards',{cardId:'LOCK-33',name:'测试',rarity:'SSR'},token,403);
 await api('admin/cards',{cardId:'LOCK-33',name:'测试',rarity:'BAD'},admin,400);await api('admin/cards',{cardId:'LOCK-33',name:'测试',rarity:null},admin,400);await api('admin/cards',{cardId:'LOCK-33',name:'测试',rarity:'SSR',unreleased:false},admin,400);
 const before=db.prepare('SELECT * FROM ledger').all();await api('admin/cards',{cardId:'LOCK-33',name:'后台修改后的测试卡',story:'测试故事',rarity:'SSR'},admin);
 for(const card of initial.cards.filter(c=>['SSR','SR'].includes(c.rarity)))await api('admin/cards',{cardId:card.id,name:card.name,rarity:'N'},admin);
 await api('admin/cards',{cardId:'LOCK-33',name:'不能移除最后一张首抽卡',rarity:'N'},admin,400);assert.deepEqual(db.prepare('SELECT * FROM ledger').all(),before);
 const application=await api('membership/apply',{douyinId:'card_release_fixture'},token);const userId=db.prepare('SELECT id FROM users LIMIT 1').get().id;await api('admin/memberships/review',{userId,action:'approve',verificationCode:application.verificationCode,confirmed:true},admin);
 const draw=await api('draw',{},token);assert.equal(draw.card.id,'LOCK-33');assert.equal(draw.card.rarity,'SSR');assert.equal(draw.profile.coins,0);
 await api('admin/cards',{cardId:'LOCK-50',name:'第二张首抽卡',rarity:'SR'},admin);await api('admin/cards',{cardId:'LOCK-33',name:'后台修改后的测试卡',rarity:'UR'},admin);
 // A legacy client omitting rarity must preserve the saved value.
 await api('admin/cards',{cardId:'LOCK-33',name:'再次改名'},admin);assert.equal((await api('catalog')).cards.find(c=>c.id==='LOCK-33').rarity,'UR');assert.equal(db.prepare('SELECT rarity FROM draws WHERE card_id=?').get('LOCK-33').rarity,'SSR');
 await stop();await start();const saved=(await api('catalog')).cards.find(c=>c.id==='LOCK-33');assert.equal(saved.name,'再次改名');assert.equal(saved.rarity,'UR');assert.equal(db.prepare('SELECT amount FROM ledger ORDER BY id DESC LIMIT 1').get().amount,-50);
 console.log('PASS release: exact 14 assets/46 cards, original IDs, rarity permissions/validation, live first draw, ledger, historical rarity and restart persistence');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{await stop();if(db)db.close();rmSync(folder,{recursive:true,force:true})});
