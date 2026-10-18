import {DatabaseSync} from 'node:sqlite';
import {randomBytes} from 'node:crypto';
import {mkdirSync,readdirSync,statSync,existsSync,renameSync,unlinkSync,chmodSync,createReadStream} from 'node:fs';
import {pipeline} from 'node:stream/promises';
import {dirname,resolve} from 'node:path';

const fail=(status,message)=>Object.assign(new Error(message),{status});
const manualName=/^manual-\d+-[a-f0-9]{12}\.sqlite$/;
const capacity=200*1024*1024;

export async function streamBackup(res,file){
 const input=createReadStream(file.path);
 res.writeHead(200,{'content-type':'application/octet-stream','content-disposition':'attachment; filename="'+file.name+'"','content-length':file.size,'cache-control':'private, no-store','x-content-type-options':'nosniff'});
 try{await pipeline(input,res)}catch{if(!res.destroyed)res.destroy()}
}

export function createOperations(db,dbPath,audit){
 const folder=resolve(dirname(dbPath),'backups');
 function listBackups(){
  if(!existsSync(folder))return [];
  return readdirSync(folder).filter(name=>manualName.test(name)).map(name=>{
   const info=statSync(resolve(folder,name));return {name,size:info.size,createdAt:info.mtime.toISOString()};
  }).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
 }
 function createBackup(){
  mkdirSync(folder,{recursive:true,mode:0o700});
  const existing=readdirSync(folder).filter(name=>name.endsWith('.sqlite'));
  const used=existing.reduce((total,name)=>total+statSync(resolve(folder,name)).size,0);
  const expected=db.prepare('PRAGMA page_count').get().page_count*db.prepare('PRAGMA page_size').get().page_size;
  if(existing.length>=50||used+expected>capacity)throw fail(409,'备份空间达到保留上限，请先由运维离线转存；系统不会自动删除旧备份');
  const name='manual-'+Date.now()+'-'+randomBytes(6).toString('hex')+'.sqlite';
  const target=resolve(folder,name),temporary=target+'.partial';
  try{
   db.exec("VACUUM INTO '"+temporary.replaceAll("'","''")+"'");
   chmodSync(temporary,0o600);
   const copy=new DatabaseSync(temporary,{readOnly:true});
   try{if(Object.values(copy.prepare('PRAGMA quick_check').get())[0]!=='ok')throw Error('Snapshot integrity check failed')}finally{copy.close()}
   renameSync(temporary,target);
  }finally{if(existsSync(temporary))unlinkSync(temporary)}
  const info=statSync(target);audit('backup.create',{name,size:info.size});
  return {name,size:info.size,createdAt:info.mtime.toISOString()};
 }
 function backupFile(name){
  if(typeof name!=='string'||!manualName.test(name))throw fail(400,'备份文件名无效');
  const path=resolve(folder,name);if(!existsSync(path)||!statSync(path).isFile())throw fail(404,'备份不存在');
  audit('backup.download',{name});return {path,name,size:statSync(path).size};
 }
 function exportOperations(){
  let out;
  db.exec('BEGIN');
  try{
   // Explicit columns: no recovery hashes, sessions, or redemption-code credentials.
   const data={
    users:db.prepare('SELECT u.id,u.nickname,u.created_at,COALESCE((SELECT SUM(l.amount) FROM ledger l WHERE l.user_id=u.id),0) AS coins FROM users u ORDER BY u.rowid').all(),
    ledger:db.prepare('SELECT id,user_id,amount,reason,created_at FROM ledger ORDER BY id').all(),
    tasks:db.prepare('SELECT user_id,task_id,redeemed_at FROM tasks ORDER BY rowid').all(),
    checkins:db.prepare('SELECT user_id,day FROM checkins ORDER BY rowid').all(),
    draws:db.prepare('SELECT id,user_id,card_id,rarity,created_at FROM draws ORDER BY id').all(),
    bonuses:db.prepare('SELECT user_id,threshold FROM bonuses ORDER BY rowid').all(),
    announcements:db.prepare('SELECT id,title,body,published,created_at,updated_at FROM announcements ORDER BY id').all(),
    activitySettings:db.prepare('SELECT starts_at,ends_at,updated_at FROM activity_settings ORDER BY id').all(),
    visualSettings:db.prepare('SELECT key,enabled,updated_at FROM visual_settings ORDER BY key').all(),
    assetLayouts:db.prepare('SELECT name,settings,updated_at FROM asset_layouts ORDER BY name').all(),
    ocProfiles:db.prepare('SELECT id,name,description,sort_order,hidden,updated_at FROM oc_profiles ORDER BY sort_order,id').all(),
    cardProfiles:db.prepare('SELECT card_id,name,story,oc_id,updated_at FROM card_profiles ORDER BY card_id').all()
   };
   out={format:'buzhi-operations',version:1,exportedAt:new Date().toISOString(),timezone:'Asia/Shanghai',data};
   db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e}
  audit('operations.export',{users:out.data.users.length,draws:out.data.draws.length});return out;
 }
 return {listBackups,createBackup,backupFile,exportOperations};
}
