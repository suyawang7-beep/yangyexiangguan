import {verifyAccount} from './helpers/membership.cjs';
// Real isolated SQLite/API tests: catches missing gates, partial writes, lost settings and time-boundary errors.
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';
const folder=mkdtempSync(join(tmpdir(),'buzhi-activity-'));
const dbPath=join(folder,'activity.sqlite');
const root=fileURLToPath(new URL('..',import.meta.url));
const port=47000+Math.floor(Math.random()*1000),base='http://127.0.0.1:'+port;
const admin='isolated-activity-admin-secret-0000000000';
let server,logs='';
async function start(){
 server=spawn(process.execPath,['server/index.mjs'],{cwd:root,env:{...process.env,HOST:'127.0.0.1',PORT:String(port),DB_PATH:dbPath,ADMIN_TOKEN:admin},stdio:['ignore','ignore','pipe']});
 server.stderr.on('data',chunk=>logs+=chunk);
 for(let i=0;i<60;i++){try{if((await fetch(base+'/health')).ok)return}catch{}await new Promise(r=>setTimeout(r,100))}
 throw Error('Server did not start: '+logs);
}
async function stop(){if(!server||server.exitCode!==null)return;const done=new Promise(r=>server.once('exit',r));server.kill();await done;}
async function api(path,body,token){const response=await fetch(base+'/api/'+path,{method:body===undefined?'GET':'POST',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});return {status:response.status,data:await response.json()}}
function snapshot(){const db=new DatabaseSync(dbPath);try{return Object.fromEntries(['users','ledger','tasks','task_writings','checkins','draws','bonuses','codes'].map(t=>[t,db.prepare('SELECT * FROM '+t+' ORDER BY rowid').all()]))}finally{db.close()}}
try{
 await start();
 const initial=await api('activity');assert.equal(initial.status,200,'Activity status endpoint must be available');
 assert.equal(initial.data.phase,'active');assert.equal(initial.data.startsAt,null);assert.equal(initial.data.endsAt,null);assert.equal(initial.data.timezone,'Asia/Shanghai');
 assert.equal((await api('admin/activity')).status,403);
 assert.equal((await api('admin/activity',{startsAt:null,endsAt:null})).status,403);
 const account=await api('register',{nickname:'隔离活动测试'});assert.equal(account.status,200);assert.equal(account.data.profile.coins,50);
 const {id,token,recoveryKey}=account.data;await verifyAccount(base,admin,account.data);
 const generated=await api('admin/codes',{taskId:'quiz',count:1},admin);assert.equal(generated.status,200);
 const code=generated.data.codes[0];
 const before=snapshot();
 for(const [settings,phase] of [
  [{startsAt:'2099-10-20T00:00:00+08:00',endsAt:'2099-10-26T00:00:00+08:00'},'upcoming'],
  [{startsAt:'2000-10-20T00:00:00+08:00',endsAt:'2000-10-26T00:00:00+08:00'},'ended']
 ]){
  const saved=await api('admin/activity',settings,admin);assert.equal(saved.status,200);assert.equal(saved.data.phase,phase);
  assert.equal((await api('activity')).data.phase,phase);
  for(const [path,body,auth] of [['register',{nickname:'不应创建'},undefined],['redeem',{taskId:'quiz',code},token],['checkin',{},token],['draw',{},token],['task-writing',{taskId:'letter',content:'这是未开放期间不应被写入数据库的生日来信'},token]]){
   const denied=await api(path,body,auth);assert.equal(denied.status,403,path+' must be blocked when '+phase);
  }
  assert.deepEqual(snapshot(),before,'Rejected operations must not change participant data or consume a code');
  assert.equal((await api('me',undefined,token)).data.coins,50);
  assert.equal((await api('login',{id,recoveryKey})).status,200);
  for(const path of ['catalog','announcements','assets-manifest'])assert.equal((await api(path)).status,200);
 }
 const saved=(await api('admin/activity',undefined,admin)).data;
 for(const bad of [{startsAt:'2026-10-20T00:00:00',endsAt:null},{startsAt:'2026-02-30T00:00:00Z',endsAt:null},{startsAt:'no',endsAt:null},{startsAt:'2026-10-21T00:00:00Z',endsAt:'2026-10-20T00:00:00Z'},{startsAt:null},{startsAt:null,endsAt:null,phase:'active'},{startsAt:42,endsAt:null}]){
  assert.equal((await api('admin/activity',bad,admin)).status,400,'Invalid schedule must be rejected');
 }
 assert.equal((await api('admin/activity',undefined,admin)).data.endsAt,saved.endsAt,'Invalid writes cannot clear the prior schedule');
 await stop();await start();assert.equal((await api('activity')).data.phase,'ended','Schedule must survive restart');
 assert.equal((await api('admin/activity',{startsAt:null,endsAt:null},admin)).status,200);
 assert.equal((await api('redeem',{taskId:'quiz',code},token)).data.coins,75);
 assert.equal((await api('checkin',{},token)).data.coins,85);
 const drawn=await api('draw',{},token);assert.equal(drawn.status,200);assert.equal(drawn.data.profile.coins,35);assert(['SSR','SR'].includes(drawn.data.card.rarity));
 const untouched=snapshot();
 for(const content of ['', '字'.repeat(14), ' '.repeat(30), '😀'.repeat(2001)])assert.equal((await api('task-writing',{taskId:'letter',content},token)).status,400);
 assert.deepEqual(snapshot(),untouched,'Invalid writing cannot award coins or alter tasks');
 assert.equal((await api('redeem',{taskId:'letter',code},token)).status,400,'Writing tasks cannot be claimed with redemption codes');
 assert.equal((await api('task-writing',{taskId:'letter',content:'😀'.repeat(15)},token)).data.coins,60,'Fifteen Unicode characters qualify');
 assert.equal((await api('task-writing',{taskId:'letter',content:'😀'.repeat(15)},token)).status,409,'A daily letter cannot be rewarded twice');
 assert.equal((await api('task-writing',{taskId:'memory',content:'这是仅用于隔离数据库的十五字以上岛屿回忆'},token)).data.coins,110,'Third distinct task awards the single 25-coin milestone');
 assert.equal((await api('task-writing',{taskId:'memory',content:'这是仅用于隔离数据库的另一段十五字以上回忆'},token)).status,409);
 assert.equal((await api('me',undefined,token)).data.coins,110,'Rejected duplicate writes do not award coins');
 const audit=(await api('admin/audit',undefined,admin)).data;assert(audit.some(x=>x.action==='activity.update'));assert(!JSON.stringify(audit).includes(recoveryKey));
 const {activityPhase}=await import('../server/activity.mjs');
 const schedule={startsAt:'2026-10-19T16:00:00.000Z',endsAt:'2026-10-20T16:00:00.000Z'};
 for(const [time,want] of [['2026-10-19T15:59:59.999Z','upcoming'],['2026-10-19T16:00:00.000Z','active'],['2026-10-20T15:59:59.999Z','active'],['2026-10-20T16:00:00.000Z','ended']])assert.equal(activityPhase(schedule,Date.parse(time)),want);
 assert.equal(activityPhase({startsAt:null,endsAt:null},0),'active');
 assert.equal(activityPhase({startsAt:null,endsAt:'2026-10-20T16:00:00Z'},Date.parse('2026-10-20T16:00:00Z')),'ended');
 console.log('PASS activity: default compatibility, authorization, strict dates, start-inclusive/end-exclusive boundaries, closed-window no-write protection, recovery/read access, restart persistence and resumed rewards');
}finally{await stop();rmSync(folder,{recursive:true,force:true})}
