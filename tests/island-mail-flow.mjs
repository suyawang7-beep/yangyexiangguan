// Real HTTP + SQLite, exclusively disposable localhost accounts/databases.
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {verifyAccount} from './helpers/membership.cjs';

const folder=mkdtempSync(join(tmpdir(),'buzhi-inbox-')),dbPath=join(folder,'isolated.sqlite');
const admin='isolated-inbox-admin-000000000000000000',port=55000+Math.floor(Math.random()*500),base='http://127.0.0.1:'+port;
let server,db,a,b,visitor,logs='';
async function api(path,body,token,origin=base){const response=await fetch(origin+'/api/'+path,{method:body===undefined?'GET':'POST',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});return {status:response.status,data:await response.json()}}
async function start(){server=spawn(process.execPath,['server/index.mjs'],{env:{...process.env,NODE_ENV:'test',BUZHI_TEST_COIN_REDEMPTION_CODE:'ISOLATED-COIN-1314-CODE',HOST:'127.0.0.1',PORT:String(port),DB_PATH:dbPath,ASSET_DIR:join(folder,'assets'),ADMIN_TOKEN:admin},stdio:['ignore','ignore','pipe']});server.stderr.on('data',x=>logs+=x);for(let i=0;i<100;i++){try{if((await fetch(base+'/health')).ok)return}catch{}await new Promise(r=>setTimeout(r,100))}throw Error(logs)}
async function stop(){if(server?.exitCode===null){const done=new Promise(r=>server.once('exit',r));server.kill();await done}}
async function account(nickname,verified=true){const r=await api('register',{nickname,password:'isolated-inbox-password-2026'});assert.equal(r.status,200);if(verified)await verifyAccount(base,admin,r.data);return r.data}
function gift(userId=a.id,extra={}){return {userId,title:'海风礼物',message:'生日快乐',kind:'coins',amount:75,requestId:randomUUID(),...extra}}
async function send(body){const r=await api('admin/island-mail/send',body,admin);assert.equal(r.status,200,JSON.stringify(r.data));return r.data}
const coins=async token=>(await api('me',undefined,token)).data.coins;
before(async()=>{await start();db=new DatabaseSync(dbPath);a=await account('信箱甲');b=await account('信箱乙');visitor=await account('信箱游客',false)});
after(async()=>{db?.close();await stop();rmSync(folder,{recursive:true,force:true})});

test('mail and inventory require verified owner; send/history require admin',async()=>{
 const m=await send(gift());
 for(const path of ['island-mail','island-items']){
  assert.equal((await api(path)).status,401);
  assert.equal((await api(path,undefined,visitor.token)).status,403);
 }
 assert.equal((await api('island-mail/claim',{id:m.id},visitor.token)).status,403);
 assert.equal((await api('island-mail/claim',{id:m.id},b.token)).status,404);
 assert.equal((await api('island-mail?userId='+a.id,undefined,b.token)).data.items.length,0);
 assert.equal((await api('admin/island-mail',undefined,a.token)).status,403);
 assert.equal((await api('admin/island-mail/send',gift(),a.token)).status,403);
});
test('send retries compare all content including message and create one audit record',async()=>{
 const payload=gift(),m=await send(payload);assert.equal((await send(payload)).id,m.id);
 for(const changed of [{message:'另一段正文'},{userId:b.id},{amount:76},{title:'不同标题'},{kind:'item',itemName:'贝壳'}])assert.equal((await api('admin/island-mail/send',{...payload,...changed},admin)).status,409);
 assert.equal(db.prepare("SELECT count(*) n FROM admin_audit WHERE action='mail.send' AND json_extract(details,'$.id')=?").get(m.id).n,1);
});
test('invalid amounts, ids and cursors are rejected without writes',async()=>{
 const count=db.prepare('SELECT count(*) n FROM island_mail').get().n;
 for(const amount of [0,-1,1.51,5001,'75',true])assert.equal((await api('admin/island-mail/send',gift(a.id,{amount}),admin)).status,400);
 for(const id of [true,'1',null,0,-1,1.2])assert.equal((await api('island-mail/claim',{id},a.token)).status,400);
 for(const cursor of ['0','-1','no','1.5','9007199254740992'])assert.equal((await api('island-mail?before='+cursor,undefined,a.token)).status,400);
 assert.equal(db.prepare('SELECT count(*) n FROM island_mail').get().n,count);
 assert.equal((await api('admin/island-mail/send',gift('BZI-nonexistent'),admin)).status,404);
});
test('concurrent coin claims credit exactly once and persist a single ledger row',async()=>{
 const initial=await coins(a.token),m=await send(gift());assert.equal(await coins(a.token),initial,'send must not credit');
 const replies=await Promise.all(Array.from({length:12},()=>api('island-mail/claim',{id:m.id,userId:b.id},a.token)));
 assert(replies.every(r=>r.status===200));assert.equal(replies.filter(r=>r.data.claimed).length,1);assert.equal(replies.filter(r=>r.data.alreadyClaimed).length,11);
 assert.equal(await coins(a.token),initial+75);
 assert.equal(db.prepare("SELECT count(*) n FROM ledger WHERE user_id=? AND reason='岛民信箱：海风礼物'").get(a.id).n,1);
 assert.equal((await api('island-mail',undefined,a.token)).data.items.find(x=>x.id===m.id).claimedAt!==null,true);
});
test('ledger failure rolls claim status back and retry credits successfully',async()=>{
 const m=await send(gift()),initial=await coins(a.token);
 db.exec("CREATE TRIGGER fail_mail_ledger BEFORE INSERT ON ledger WHEN NEW.reason LIKE '岛民信箱：%' BEGIN SELECT RAISE(ABORT,'isolated fault'); END");
 try{assert.equal((await api('island-mail/claim',{id:m.id},a.token)).status,500);assert.equal(db.prepare('SELECT claimed_at FROM island_mail WHERE id=?').get(m.id).claimed_at,null);assert.equal(await coins(a.token),initial)}finally{db.exec('DROP TRIGGER fail_mail_ledger')}
 assert.equal((await api('island-mail/claim',{id:m.id},a.token)).status,200);assert.equal(await coins(a.token),initial+75);
});
test('items enter durable owner inventory once, inventory failure rolls claim back',async()=>{
 const m=await send(gift(a.id,{kind:'item',itemName:'海岛纪念贝壳'})),initial=await coins(a.token);
 assert.equal((await api('island-items',undefined,a.token)).status,200);
 db.exec("CREATE TRIGGER fail_mail_item BEFORE INSERT ON island_items BEGIN SELECT RAISE(ABORT,'isolated fault'); END");
 try{assert.equal((await api('island-mail/claim',{id:m.id},a.token)).status,500);assert.equal(db.prepare('SELECT claimed_at FROM island_mail WHERE id=?').get(m.id).claimed_at,null)}finally{db.exec('DROP TRIGGER fail_mail_item')}
 const replies=await Promise.all(Array.from({length:6},()=>api('island-mail/claim',{id:m.id},a.token)));assert(replies.every(r=>r.status===200));assert.equal(replies.filter(r=>r.data.claimed).length,1);
 assert.equal(await coins(a.token),initial);assert.equal(db.prepare('SELECT count(*) n FROM island_items WHERE mail_id=?').get(m.id).n,1);
 const items=(await api('island-items',undefined,a.token)).data.items;assert.equal(items.find(i=>i.mailId===m.id).itemName,'海岛纪念贝壳');assert.equal((await api('island-items',undefined,b.token)).data.items.length,0);
});
test('history pagination reaches old unclaimed mail beyond 100 and admin sees claim time',async()=>{
 const old=await send(gift(b.id,{kind:'item',itemName:'最早的信'}));
 for(let i=0;i<105;i++)await send(gift(b.id,{title:'分页信件'+i}));
 const first=(await api('island-mail',undefined,b.token)).data;assert.equal(first.items.length,100);assert.equal(first.unclaimed,106);assert(first.nextBefore);
 const second=(await api('island-mail?before='+first.nextBefore,undefined,b.token)).data;assert.equal(second.items.length,6);assert(second.items.some(m=>m.id===old.id));assert.equal(second.nextBefore,null);
 await api('island-mail/claim',{id:old.id},b.token);
 const history=(await api('admin/island-mail?before='+first.nextBefore,undefined,admin)).data;
 assert(history.items.find(m=>m.id===old.id).claimedAt);assert.equal(new Set([...first.items,...second.items].map(m=>m.id)).size,106);
});
test('restart backfills legacy claimed items without duplicates or coin credits; backup/export preserve records',async()=>{
 const m=await send(gift(a.id,{kind:'item',itemName:'旧版纪念品'}));db.prepare('UPDATE island_mail SET claimed_at=? WHERE id=?').run('2026-10-22T00:00:00.000Z',m.id);
 const initial=await coins(a.token);await stop();await start();await stop();await start();
 assert.equal(db.prepare('SELECT count(*) n FROM island_items WHERE mail_id=?').get(m.id).n,1);assert.equal(await coins(a.token),initial);
 assert((await api('island-items',undefined,a.token)).data.items.some(i=>i.mailId===m.id));
 const out=await api('admin/export',undefined,admin);assert.equal(out.status,200);assert(out.data.data.islandMail.some(i=>i.id===m.id));assert(out.data.data.islandItems.some(i=>i.mail_id===m.id));
 const backup=await api('admin/backups',{},admin);assert.equal(backup.status,200);const copy=new DatabaseSync(join(folder,'backups',backup.data.name),{readOnly:true});try{assert.equal(copy.prepare('SELECT count(*) n FROM island_items WHERE mail_id=?').get(m.id).n,1)}finally{copy.close()}
});
test('visitor deletion includes mail and inventory, rejects stale preview and backs up before deleting',async()=>{
 const u=await account('信箱清理'),m=await send(gift(u.id,{kind:'item',itemName:'清理测试物品'}));await api('island-mail/claim',{id:m.id},u.token);
 const membership=(await api('membership',undefined,u.token)).data;
 assert.equal((await api('admin/memberships/review',{userId:u.id,action:'revoke',confirmed:true,verificationCode:membership.verificationCode,note:'隔离信箱删除测试'},admin)).status,200);
 let preview=await api('admin/visitors/preview-delete',{ids:[u.id]},admin);assert.equal(preview.data.counts.islandMail,1);assert.equal(preview.data.counts.islandItems,1);
 await send(gift(u.id));assert.equal((await api('admin/visitors/delete',{token:preview.data.token,confirm:'确认删除所选游客'},admin)).status,409);
 preview=await api('admin/visitors/preview-delete',{ids:[u.id]},admin);const deleted=await api('admin/visitors/delete',{token:preview.data.token,confirm:'确认删除所选游客'},admin);assert.equal(deleted.status,200,JSON.stringify(deleted.data));
 assert.equal(db.prepare('SELECT count(*) n FROM island_mail WHERE user_id=?').get(u.id).n,0);assert.equal(db.prepare('SELECT count(*) n FROM island_items WHERE user_id=?').get(u.id).n,0);
 const copy=new DatabaseSync(join(folder,'backups',deleted.data.backup.name),{readOnly:true});try{assert.equal(copy.prepare('SELECT count(*) n FROM island_items WHERE user_id=?').get(u.id).n,1)}finally{copy.close()}
});
test('legacy automatic test cleanup excludes accounts that received gifts',async()=>{
 const u=await account('测试岛民信箱保护',false);db.prepare('UPDATE users SET created_at=? WHERE id=?').run('2000-01-01T00:00:00.000Z',u.id);
 assert((await api('admin/test-cleanup',undefined,admin)).data.ids.includes(u.id));
 await send(gift(u.id));assert.equal((await api('admin/test-cleanup',undefined,admin)).data.ids.includes(u.id),false,'gift history is participation and must not be auto-deleted');
});
test('two independent server processes racing on SQLite can credit one gift only once',async()=>{
 const otherPort=port+600,otherBase='http://127.0.0.1:'+otherPort;
 const other=spawn(process.execPath,['server/index.mjs'],{env:{...process.env,HOST:'127.0.0.1',PORT:String(otherPort),DB_PATH:dbPath,ASSET_DIR:join(folder,'assets'),ADMIN_TOKEN:admin},stdio:['ignore','ignore','pipe']});let otherLogs='';other.stderr.on('data',x=>otherLogs+=x);
 try{
  let ready=false;for(let i=0;i<100;i++){try{if((await fetch(otherBase+'/health')).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,100))}assert(ready,otherLogs);
  const m=await send(gift(a.id,{title:'双进程金币测试'})),initial=await coins(a.token);
  const replies=await Promise.all(Array.from({length:12},(_,i)=>api('island-mail/claim',{id:m.id},a.token,i%2?otherBase:base)));
  assert(replies.every(r=>r.status===200));assert.equal(replies.filter(r=>r.data.claimed).length,1);assert.equal(await coins(a.token),initial+75);
  assert.equal(db.prepare("SELECT count(*) n FROM ledger WHERE user_id=? AND reason='岛民信箱：双进程金币测试'").get(a.id).n,1);
  const f=await send(gift(a.id,{kind:'fusion',amount:2,title:'双进程融卡测试'})),before=(await api('me',undefined,a.token)).data.fusionDaily.extra;const raced=await Promise.all(Array.from({length:12},(_,i)=>api('island-mail/claim',{id:f.id},a.token,i%2?otherBase:base)));assert(raced.every(r=>r.status===200));assert.equal(raced.filter(r=>r.data.claimed).length,1);assert.equal((await api('me',undefined,a.token)).data.fusionDaily.extra,before+2);
 }finally{if(other.exitCode===null){const done=new Promise(r=>other.once('exit',r));other.kill();await done}}
});


test('131.4 coin redemption is verified-only, one-per-islander, atomic, and capped at 40 uses',async()=>{
 const code='ISOLATED-COIN-1314-CODE';
 assert.equal((await api('redeem-coin-code',{code})).status,401);
 assert.equal((await api('redeem-coin-code',{code},visitor.token)).status,403);
 const initialA=await coins(a.token);
 const racing=await Promise.all(Array.from({length:12},()=>api('redeem-coin-code',{code},a.token)));
 assert.equal(racing.filter(r=>r.status===200).length,1,JSON.stringify(racing.map(r=>r.status)));
 assert.equal(racing.filter(r=>r.status===409).length,11);
 const success=racing.find(r=>r.status===200).data;
 assert.equal(success.amount,131.4);
 assert.equal(success.remainingUses,39);
 assert.equal(success.profile.coins,initialA+131.4);
 assert.equal(await coins(a.token),initialA+131.4);
 assert.equal(db.prepare("SELECT count(*) n FROM ledger WHERE user_id=? AND reason='金币兑换码奖励 island-coin-1314-40'").get(a.id).n,1);
 assert.equal((await api('redeem-coin-code',{code},a.token)).status,409);
 const initialB=await coins(b.token);
 const second=await api('redeem-coin-code',{code},b.token);
 assert.equal(second.status,200,JSON.stringify(second.data));
 assert.equal(second.data.amount,131.4);
 assert.equal(second.data.remainingUses,38);
 assert.equal(await coins(b.token),initialB+131.4);
 const campaign=db.prepare("SELECT redeemed_count FROM coin_redemption_campaigns WHERE id='island-coin-1314-40'").get();
 assert.equal(campaign.redeemed_count,2);
 db.prepare("UPDATE coin_redemption_campaigns SET redeemed_count=40 WHERE id='island-coin-1314-40'").run();
 try{
  const c=await account('兑换码满额测试');
  const before=await coins(c.token);
  const full=await api('redeem-coin-code',{code},c.token);
  assert.equal(full.status,409);
  assert.match(full.data.error,/40次/);
  assert.equal(await coins(c.token),before);
  assert.equal(db.prepare("SELECT count(*) n FROM coin_redemption_claims WHERE campaign_id='island-coin-1314-40' AND user_id=?").get(c.id).n,0);
 }finally{db.prepare("UPDATE coin_redemption_campaigns SET redeemed_count=2 WHERE id='island-coin-1314-40'").run()}
});

test('fractional mail credits once',async()=>{const initial=await coins(a.token),m=await send(gift(a.id,{amount:131.4}));const replies=await Promise.all([api('island-mail/claim',{id:m.id},a.token),api('island-mail/claim',{id:m.id},a.token)]);assert(replies.every(r=>r.status===200));assert.equal(replies.filter(r=>r.data.claimed).length,1);assert.equal(await coins(a.token),Math.round((initial+131.4)*10)/10)});

test('fractional grants accumulate and draw deducts exactly, invalid precision never writes',async()=>{
 const initial=await coins(a.token),body={userId:a.id,amount:131.4,reason:'精度验收赠币',requestId:randomUUID()};
 for(let i=0;i<3;i++){const m=await send(gift(a.id,{amount:131.4}));assert.equal((await api('island-mail/claim',{id:m.id},a.token)).status,200)}
 assert.equal(await coins(a.token),Math.round((initial+394.2)*10)/10);
 for(const amount of [0.01,1.51,-1,0,'131.4',5001])assert.equal((await api('admin/island-mail/send',gift(a.id,{amount}),admin)).status,400);
 const before=await coins(a.token);assert.equal((await api('draw',{},a.token)).status,200);assert.equal(await coins(a.token),Math.round((before-50)*10)/10);
});

test('export balances and amounts use tenths without rewriting history',async()=>{
 const u=await account('导出金币精度',false),insert=db.prepare('INSERT INTO ledger(user_id,amount,reason,created_at) VALUES(?,?,?,?)');
 for(let i=0;i<40;i++)insert.run(u.id,131.4,'precision fixture',new Date().toISOString());
 insert.run(u.id,0.1+0.2,'legacy binary noise',new Date().toISOString());
 const before=db.prepare('SELECT * FROM ledger WHERE user_id=?').all(u.id);
 const result=await api('admin/export',undefined,admin);assert.equal(result.status,200);
 assert.equal(result.data.data.users.find(x=>x.id===u.id).coins,5306.3);
 assert.equal(result.data.data.ledger.find(x=>x.reason==='legacy binary noise').amount,0.3);
 assert.deepEqual(db.prepare('SELECT * FROM ledger WHERE user_id=?').all(u.id),before);
});
test('visitor deletion preview sums signed ledger rows in tenths',async()=>{
 const u=await account('游客金币精度',false),insert=db.prepare('INSERT INTO ledger(user_id,amount,reason,created_at) VALUES(?,?,?,?)');
 for(let i=0;i<40;i++)insert.run(u.id,131.4,'preview precision',new Date().toISOString());
 insert.run(u.id,-50,'preview deduction',new Date().toISOString());
 const before=db.prepare('SELECT * FROM ledger WHERE user_id=?').all(u.id);
 const result=await api('admin/visitors/preview-delete',{ids:[u.id]},admin);assert.equal(result.status,200);assert.equal(result.data.counts.coins,5256);
 assert.deepEqual(db.prepare('SELECT * FROM ledger WHERE user_id=?').all(u.id),before);
});

test('automatic test cleanup excludes accounts with admin fusion quota grants',async()=>{const u=await account('自动化测试融卡补发',false);db.prepare('UPDATE users SET created_at=? WHERE id=?').run('2020-01-01T00:00:00.000Z',u.id);await send(gift(u.id,{kind:'fusion',amount:2}));const preview=await api('admin/test-cleanup',undefined,admin);assert(!preview.data.ids.includes(u.id));assert.equal(db.prepare('SELECT COUNT(*) n FROM fusion_quota_grants WHERE user_id=?').get(u.id).n,0);});

test('legacy binary noise is normalized in all displayed histories without rewriting rows',async()=>{const value=0.30000000000000004;db.prepare('INSERT INTO ledger(user_id,amount,reason,created_at) VALUES(?,?,?,?)').run(a.id,value,'historical noise',new Date().toISOString());const user=(await api('me',undefined,a.token)).data;assert.equal(user.ledger.find(x=>x.reason==='historical noise').amount,0.3);const detail=(await api('admin/user?id='+a.id,undefined,admin)).data;assert.equal(detail.ledger.find(x=>x.reason==='historical noise').amount,0.3);db.prepare('INSERT INTO admin_coin_grants VALUES(?,?,?,?,?)').run(randomUUID(),a.id,value,'historical grant',new Date().toISOString());assert.equal((await api('admin/coins/history',undefined,admin)).data.find(x=>x.reason==='historical grant').amount,0.3);const mail=await send(gift(a.id,{amount:0.3,title:'historical noise mail'}));db.prepare('UPDATE island_mail SET amount=? WHERE id=?').run(value,mail.id);assert.equal((await api('island-mail',undefined,a.token)).data.items.find(x=>x.id===mail.id).amount,0.3);assert.equal(db.prepare("SELECT amount FROM ledger WHERE reason='historical noise'").get().amount,value);assert.equal(db.prepare('SELECT amount FROM island_mail WHERE id=?').get(mail.id).amount,value);});

test('fusion inbox reward credits only on owner claim, audit failure rolls back and restart never creates items',async()=>{
 for(const amount of [0,-1,1.2,101,'2'])assert.equal((await api('admin/island-mail/send',gift(a.id,{kind:'fusion',amount}),admin)).status,400);
 const initial=(await api('me',undefined,a.token)).data.fusionDaily.extra;
 const m=await send(gift(a.id,{kind:'fusion',amount:2,title:'融卡信箱奖励',reason:'额外融卡赠送原因'}));
 assert.equal((await api('me',undefined,a.token)).data.fusionDaily.extra,initial);
 const row=(await api('island-mail',undefined,a.token)).data.items.find(x=>x.id===m.id);assert.equal(row.kind,'fusion');assert.equal(row.amount,2);assert.equal(row.reason,'额外融卡赠送原因');
 assert.equal((await api('admin/island-mail/send',gift(a.id,{kind:'fusion',amount:2,title:'融卡信箱奖励',reason:'不同赠送原因',requestId:db.prepare('SELECT request_id FROM island_mail WHERE id=?').get(m.id).request_id}),admin)).status,409);
 assert.equal((await api('island-mail/claim',{id:m.id},b.token)).status,404);
 db.exec("CREATE TRIGGER fail_fusion_claim_audit BEFORE INSERT ON admin_audit WHEN NEW.action='fusion.quota.claim' BEGIN SELECT RAISE(ABORT,'audit unavailable'); END");
 try{assert.equal((await api('island-mail/claim',{id:m.id},a.token)).status,500);assert.equal(db.prepare('SELECT claimed_at FROM island_mail WHERE id=?').get(m.id).claimed_at,null);assert.equal((await api('me',undefined,a.token)).data.fusionDaily.extra,initial)}finally{db.exec('DROP TRIGGER fail_fusion_claim_audit')}
 db.exec("CREATE TRIGGER fail_fusion_credit BEFORE INSERT ON fusion_quota_grants BEGIN SELECT RAISE(ABORT,'credit unavailable'); END");try{assert.equal((await api('island-mail/claim',{id:m.id},a.token)).status,500);assert.equal(db.prepare('SELECT claimed_at FROM island_mail WHERE id=?').get(m.id).claimed_at,null)}finally{db.exec('DROP TRIGGER fail_fusion_credit')}
 const claims=await Promise.all(Array.from({length:8},()=>api('island-mail/claim',{id:m.id},a.token)));assert(claims.every(r=>r.status===200));assert.equal(claims.filter(r=>r.data.claimed).length,1);assert.equal(claims[0].data.fusionDaily.extra,initial+2);
 await stop();await start();assert.equal(db.prepare('SELECT COUNT(*) n FROM island_items WHERE mail_id=?').get(m.id).n,0);
 assert.equal((await api('island-mail',undefined,a.token)).data.items.find(x=>x.id===m.id).kind,'fusion');
 for(const path of ['admin/coins/grant','admin/fusion/grants']){assert.equal((await api(path,{userId:a.id,amount:2},a.token)).status,403);assert.equal((await api(path,{userId:a.id,amount:2},admin)).status,410)}
 const out=(await api('admin/export',undefined,admin)).data.data;assert(out.fusionMailRewards.some(x=>x.mail_id===m.id));assert.equal(out.islandMail.find(x=>x.id===m.id).kind,'fusion');assert.equal(out.islandMail.find(x=>x.id===m.id).reason,'额外融卡赠送原因');assert.equal(db.prepare('SELECT reason FROM fusion_quota_grants WHERE request_id=?').get('mail:'+m.id).reason,'额外融卡赠送原因');
});
