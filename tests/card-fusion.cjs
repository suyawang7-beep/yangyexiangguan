/* Card fusion integration test. Uses an isolated temporary SQLite database. */
const {spawn}=require('node:child_process');
const {DatabaseSync}=require('node:sqlite');
const {mkdtempSync,rmSync}=require('node:fs');
const {tmpdir}=require('node:os');
const {join}=require('node:path');
const {randomUUID}=require('node:crypto');
const assert=require('node:assert/strict');
const {verifyAccount}=require('./helpers/membership.cjs');
const folder=mkdtempSync(join(tmpdir(),'buzhi-card-fusion-'));
const dbPath=join(folder,'test.sqlite'),port=48000+Math.floor(Math.random()*900),base='http://127.0.0.1:'+port;
const admin='card-fusion-test-admin-20261025-very-long';
const server=spawn(process.execPath,['server/index.mjs'],{cwd:join(__dirname,'..'),env:{...process.env,HOST:'127.0.0.1',PORT:String(port),DB_PATH:dbPath,ASSET_DIR:join(folder,'assets'),ADMIN_TOKEN:admin},stdio:['ignore','ignore','pipe']});
let stderr='';server.stderr.on('data',c=>stderr+=c);
async function request(path,body,token){
 const response=await fetch(base+'/api/'+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});
 return {status:response.status,data:await response.json()};
}
(async()=>{
 let healthy=false;
 for(let i=0;i<80;i++){try{if((await fetch(base+'/health')).ok){healthy=true;break}}catch{}await new Promise(r=>setTimeout(r,100))}
 assert(healthy,stderr);
 const registered=await request('register',{nickname:'融卡测试岛民',password:'temporary-test-password'});
 assert.equal(registered.status,200);
 const user=registered.data;await verifyAccount(base,admin,user);
 const catalog=await request('catalog');assert.equal(catalog.status,200);
 const byRarity=Object.groupBy(catalog.data.cards,c=>c.rarity);
 for(const rarity of ['N','R','SR','SSR','UR'])assert((byRarity[rarity]||[]).length>0,'Missing '+rarity);
 const input=['SR','R','N'].map(rarity=>byRarity[rarity][0]);
 const db=new DatabaseSync(dbPath);
 for(const card of input)for(let j=0;j<2;j++)db.prepare('INSERT INTO draws(user_id,card_id,rarity,created_at) VALUES(?,?,?,?)').run(user.id,card.id,card.rarity,new Date().toISOString());
 db.close();
 const before=(await request('me',undefined,user.token)).data;assert.equal(before.draws.length,6);
 for(const card of input){
  const requestId=randomUUID();
  const payload={first:card.id,second:card.id,requestId};
  const a=await request('fuse',payload,user.token);assert.equal(a.status,200,JSON.stringify(a.data));
  const expected={N:['SR','SSR','UR'],R:['SSR','UR'],SR:['SSR','UR']}[card.rarity];
  assert(expected.includes(a.data.card.rarity),'result rarity '+a.data.card.rarity+' from '+card.rarity);
  assert.equal(a.data.profile.inventory[card.id]||0,0,'both materials consumed');
  const duplicate=await request('fuse',payload,user.token);assert.equal(duplicate.status,200);
  assert.equal(duplicate.data.alreadyCompleted,true);
  assert.deepEqual(duplicate.data.profile.inventory,a.data.profile.inventory,'retries cannot duplicate rewards');
  const depleted=await request('fuse',{...payload,requestId:randomUUID()},user.token);
  assert.equal(depleted.status,409,'depleted materials cannot be reused');
 }
 const quota=(await request('me',undefined,user.token)).data.fusionDaily;
 assert.deepEqual({used:quota.used,limit:quota.limit},{used:3,limit:3});
 const extra=new DatabaseSync(dbPath);
 for(let j=0;j<2;j++)extra.prepare('INSERT INTO draws(user_id,card_id,rarity,created_at) VALUES(?,?,?,?)').run(user.id,input[2].id,input[2].rarity,new Date().toISOString());
 extra.close();
 const fourth=await request('fuse',{first:input[2].id,second:input[2].id,requestId:randomUUID()},user.token);
 assert.equal(fourth.status,409,'fourth daily fusion must be denied even when cards exist');
 assert.match(fourth.data.error,/3次/);
 const after=(await request('me',undefined,user.token)).data;
 assert.equal(after.draws.length,before.draws.length+2,'fusion must not rewrite historical draws');
 assert.deepEqual(after.draws.slice(2),before.draws,'historical draw rows must stay unchanged');
 assert.deepEqual(after.ledger,before.ledger,'no unexpected coin changes');
 assert.equal(after.fusions.length,3);
 assert.equal(Object.values(after.inventory).reduce((a,b)=>a+b,0),5);
 console.log('PASS fusion rarity exclusions, inventory, transaction, idempotency and immutable history');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{if(server.exitCode===null){const ended=new Promise(resolve=>server.once('exit',resolve));server.kill();await ended}rmSync(folder,{recursive:true,force:true})});
