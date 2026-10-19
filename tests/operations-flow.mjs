import {verifyAccount} from './helpers/membership.cjs';
// Backups and exports must preserve all participant records and deny credential-free access.
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync,writeFileSync,truncateSync,statSync,unlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const folder=mkdtempSync(join(tmpdir(),'buzhi-operations-')),dbPath=join(folder,'test.sqlite');
const port=52000+Math.floor(Math.random()*1000),base='http://127.0.0.1:'+port;
const admin='isolated-operations-admin-secret-0000000000';
const server=spawn(process.execPath,['server/index.mjs'],{cwd:fileURLToPath(new URL('..',import.meta.url)),env:{...process.env,HOST:'127.0.0.1',PORT:String(port),DB_PATH:dbPath,ADMIN_TOKEN:admin},stdio:['ignore','ignore','pipe']});
let logs='';server.stderr.on('data',c=>logs+=c);
async function request(path,body,token){return fetch(base+'/api/'+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)})}
async function api(path,body,token){const r=await request(path,body,token);return {status:r.status,data:await r.json()}}
function rows(database){return Object.fromEntries(['users','sessions','ledger','tasks','codes','bonuses','checkins','draws'].map(table=>[table,database.prepare('SELECT * FROM '+table+' ORDER BY rowid').all()]))}
let db;
try{
 let ready=false;for(let i=0;i<60;i++){try{if((await fetch(base+'/health')).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,100))}assert(ready,logs);
 const empty=await api('admin/backups',undefined,admin);assert.equal(empty.status,200,'Admin can list snapshots');assert.deepEqual(empty.data,[]);
 const account=(await api('register',{nickname:'隔离备份测试'})).data;
 const {token,recoveryKey,id}=account;await verifyAccount(base,admin,account);
 const code=(await api('admin/codes',{taskId:'quiz',count:1},admin)).data.codes[0];
 await api('redeem',{taskId:'quiz',code},token);await api('checkin',{},token);await api('draw',{},token);
 db=new DatabaseSync(dbPath);
 // More than the admin list's 100-row cap: operational export must not silently truncate.
 const insert=db.prepare('INSERT INTO users(id,nickname,secret_hash,created_at) VALUES(?,?,?,?)');
 for(let i=0;i<105;i++)insert.run('BZI-fixture-'+i,'额外参与者'+i,'fixture-hash-'+i,'2026-01-01T00:00:00Z');
 const before=rows(db);
 for(const [path,body] of [['admin/backups',undefined],['admin/backups',{}],['admin/export',undefined],['admin/backups/download?name=manual-1-0123456789ab.sqlite',undefined]]){
  assert.equal((await request(path,body)).status,403,path+' anonymous');
  assert.equal((await request(path,body,token)).status,403,path+' participant token');
 }
 const made=await api('admin/backups',{},admin);assert.equal(made.status,200);assert.match(made.data.name,/^manual-\d+-[a-f0-9]{12}\.sqlite$/);assert(made.data.size>0);
 const listing=(await api('admin/backups',undefined,admin)).data;assert.equal(listing.length,1);assert.equal(listing[0].name,made.data.name);assert(!JSON.stringify(listing).includes(folder));
 const download=await request('admin/backups/download?name='+encodeURIComponent(made.data.name),undefined,admin);assert.equal(download.status,200);assert.match(download.headers.get('cache-control'),/no-store/);assert.match(download.headers.get('content-disposition'),/attachment/);
 const bytes=Buffer.from(await download.arrayBuffer());assert.equal(bytes.length,made.data.size);assert.equal(bytes.toString('ascii',0,15),'SQLite format 3');
 const copy=join(folder,'downloaded.sqlite');writeFileSync(copy,bytes);const snapshot=new DatabaseSync(copy,{readOnly:true});assert.equal(Object.values(snapshot.prepare('PRAGMA quick_check').get())[0],'ok');assert.deepEqual(rows(snapshot),before);snapshot.close();
 const exported=await request('admin/export',undefined,admin);assert.equal(exported.status,200);assert.match(exported.headers.get('content-disposition'),/attachment/);assert.match(exported.headers.get('cache-control'),/no-store/);
 const payload=await exported.json();assert.equal(payload.format,'buzhi-operations');assert.equal(payload.version,1);assert.equal(payload.timezone,'Asia/Shanghai');assert.equal(payload.data.users.length,106);assert.equal(payload.data.users.find(u=>u.id===id).coins,35);assert.equal(payload.data.draws.length,1);assert.equal(payload.data.checkins.length,1);
 for(const key of ['ledger','tasks','draws','checkins','bonuses'])assert.deepEqual(payload.data[key],JSON.parse(JSON.stringify(before[key])));
 assert(!Object.hasOwn(payload.data,'sessions'));assert(!Object.hasOwn(payload.data,'codes'));assert(!Object.hasOwn(payload.data.users[0],'secret_hash'));
 const text=JSON.stringify(payload);for(const secret of [admin,token,recoveryKey,code,createHash('sha256').update(recoveryKey).digest('hex'),createHash('sha256').update(token).digest('hex'),createHash('sha256').update(code).digest('hex')])assert(!text.includes(secret),'Export must omit credential material');
 assert.deepEqual(rows(db),before,'Create/download/export cannot mutate participant data');
 for(const name of ['../../test.sqlite','../test.sqlite',made.data.name+'/../test.sqlite','manual-1-0123456789ab.sqlite-wal','before-test-cleanup-1-abcdef.sqlite'])assert.equal((await request('admin/backups/download?name='+encodeURIComponent(name),undefined,admin)).status,400);
 assert.equal((await request('admin/backups/download?name=manual-1-0123456789ab.sqlite',undefined,admin)).status,404);
 assert.equal((await fetch(base+'/backups/'+made.data.name)).status,404,'No public backup route');
 assert.equal((await api('admin/backups/restore',{},admin)).status,404,'No production overwrite endpoint');
 const second=await api('admin/backups',{},admin);assert.equal(second.status,200);assert.notEqual(second.data.name,made.data.name);assert.equal((await api('admin/backups',undefined,admin)).data.length,2);
 const audit=(await api('admin/audit',undefined,admin)).data;for(const action of ['backup.create','backup.download','operations.export'])assert(audit.some(row=>row.action===action));
 const large=join(folder,'backups','manual-0-ffffffffffff.sqlite');writeFileSync(large,'');truncateSync(large,200*1024*1024);
 assert.equal((await api('admin/backups',{},admin)).status,409,'Byte quota must stop growth');assert.equal(statSync(large).size,200*1024*1024);unlinkSync(large);
 for(let i=0;i<48;i++)writeFileSync(join(folder,'backups','manual-0-'+String(i).padStart(12,'0')+'.sqlite'),'fixture');
 assert.equal((await api('admin/backups',{},admin)).status,409,'Retention cap must stop growth without pruning');
 assert.equal((await api('admin/backups',undefined,admin)).data.length,50,'Old snapshots must remain');
 assert.deepEqual(rows(db),before);
 console.log('PASS operations: authorized full SQLite snapshots, WAL contents, independent integrity, 106-user export without credentials, no participant mutations, private downloads, path validation, audit and no restore endpoint');
}finally{db?.close();if(server.exitCode===null){const done=new Promise(r=>server.once('exit',r));server.kill();await done;}rmSync(folder,{recursive:true,force:true})}
