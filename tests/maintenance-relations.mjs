// New user-related tables must participate in preview, stale checks and deletion.
import {spawn} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {verifyAccount} from './helpers/membership.cjs';
const folder=mkdtempSync(join(tmpdir(),'buzhi-maintenance-relations-')),dbPath=join(folder,'db.sqlite');
const port=54000+Math.floor(Math.random()*500),base='http://127.0.0.1:'+port,admin='isolated-maintenance-relations-secret-0000000';
let server,db,logs='';
async function api(path,body,token){const r=await fetch(base+'/api/'+path,{method:body===undefined?'GET':'POST',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json()}}
try{
 server=spawn(process.execPath,['server/index.mjs'],{cwd:fileURLToPath(new URL('..',import.meta.url)),env:{...process.env,HOST:'127.0.0.1',PORT:String(port),DB_PATH:dbPath,ADMIN_TOKEN:admin},stdio:['ignore','ignore','pipe']});server.stderr.on('data',d=>logs+=d);
 let ready=false;for(let i=0;i<100;i++){try{if((await fetch(base+'/health')).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,100))}assert(ready,logs);
 const a=(await api('register',{password:'Isolated-test-password-2026!',nickname:'关联数据删除测试'})).data,b=(await api('register',{password:'Isolated-test-password-2026!',nickname:'关联数据保留测试'})).data;
 for(const account of [a,b]){
  await verifyAccount(base,admin,account);
  assert.equal((await api('task-writing',{taskId:'memory',content:'这是一段仅写入隔离测试数据库的回忆文字内容'},account.token)).status,200);
  assert.equal((await api('admin/coins/grant',{userId:account.id,amount:25,reason:'隔离关联数据测试',requestId:randomUUID()},admin)).status,200);
 }
 const member=(await api('membership',undefined,a.token)).data;
 assert.equal((await api('admin/memberships/review',{userId:a.id,action:'revoke',confirmed:true,verificationCode:member.verificationCode,note:'隔离测试转为游客'},admin)).status,200);
 db=new DatabaseSync(dbPath);
 for(const account of [a,b]){
  db.prepare('INSERT INTO resident_profiles VALUES(?,?,?,?)').run(account.id,'','隔离档案','2000-01-01');
  const work=db.prepare("INSERT INTO resident_works(user_id,title,body,kind,status,created_at,updated_at) VALUES(?,?,?,'story','submitted',?,?)").run(account.id,'隔离作品','测试正文','2000-01-01','2000-01-01');
  db.prepare("INSERT INTO resident_work_reviews VALUES(?,'approved',?)").run(work.lastInsertRowid,'2000-01-01');
  db.prepare("INSERT INTO account_recovery_requests(id,user_id,status,created_at) VALUES(?,?,'pending',?)").run('REC-'+account.id,account.id,1);
 }

 const preserved=()=>Object.fromEntries(['users','sessions','ledger','tasks','task_writings','admin_coin_grants','memberships','resident_profiles','resident_works','account_recovery_requests'].map(t=>[t,db.prepare('SELECT * FROM '+t+' WHERE '+(t==='users'?'id':'user_id')+'=? ORDER BY rowid').all(b.id)]));
 const before=preserved();
 const first=await api('admin/visitors/preview-delete',{ids:[a.id]},admin);assert.equal(first.status,200);
 db.prepare('UPDATE task_writings SET body=? WHERE user_id=?').run('预览后发生变化的隔离测试文字记录',a.id);
 assert.equal((await api('admin/visitors/delete',{token:first.data.token,confirm:'确认删除所选游客'},admin)).status,409,'Changed writings invalidate deletion preview');
 const preview=await api('admin/visitors/preview-delete',{ids:[a.id]},admin);assert.equal(preview.status,200);
 assert.equal(preview.data.counts.writings,1);assert.equal(preview.data.counts.coinGrants,1);assert.equal(preview.data.counts.residentWorks,1);assert.equal(preview.data.counts.workReviews,1);assert.equal(preview.data.counts.recoveryRequests,1);
 const changedGrant=preview.data.token;db.prepare('UPDATE admin_coin_grants SET reason=? WHERE user_id=?').run('预览后更改的隔离赠送原因',a.id);
 assert.equal((await api('admin/visitors/delete',{token:changedGrant,confirm:'确认删除所选游客'},admin)).status,409,'Changed grants invalidate deletion preview');
 const stale=(await api('admin/visitors/preview-delete',{ids:[a.id]},admin)).data;db.prepare("UPDATE resident_works SET body='预览后更改的作品' WHERE user_id=?").run(a.id);assert.equal((await api('admin/visitors/delete',{token:stale.token,confirm:'确认删除所选游客'},admin)).status,409);
 const fresh=(await api('admin/visitors/preview-delete',{ids:[a.id]},admin)).data;
 const removed=await api('admin/visitors/delete',{token:fresh.token,confirm:'确认删除所选游客'},admin);assert.equal(removed.status,200,JSON.stringify(removed.data));assert.equal(removed.data.deleted,1);
 for(const table of ['users','task_writings','admin_coin_grants','resident_profiles','resident_works','account_recovery_requests'])assert.equal(db.prepare('SELECT COUNT(*) n FROM '+table+' WHERE '+(table==='users'?'id':'user_id')+'=?').get(a.id).n,0);
 const backup=new DatabaseSync(join(folder,'backups',removed.data.backup.name),{readOnly:true});for(const table of ['task_writings','admin_coin_grants','resident_profiles','resident_works','account_recovery_requests'])assert.equal(backup.prepare('SELECT COUNT(*) n FROM '+table+' WHERE user_id=?').get(a.id).n,1);backup.close();
 assert.equal(db.prepare('SELECT COUNT(*) n FROM resident_work_reviews').get().n,1);assert.equal(db.prepare('SELECT COUNT(*) n FROM resident_work_reviews WHERE work_id IN (SELECT id FROM resident_works WHERE user_id=?)').get(b.id).n,1);
 assert.deepEqual(preserved(),before,'Unselected verified account and all its records remain untouched');
 assert.equal((await api('me',undefined,b.token)).status,200);
 console.log('PASS maintenance relations: writing/grant stale protection, full backup, complete selected deletion, unselected preservation');
}finally{db?.close();if(server?.exitCode===null){const done=new Promise(r=>server.once('exit',r));server.kill();await done}}
