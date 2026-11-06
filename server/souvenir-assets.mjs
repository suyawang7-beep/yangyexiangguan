import {createHash} from 'node:crypto';
import {mkdirSync,writeFileSync,existsSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
// Catalogue only: never writes mail, ownership, coins or card inventory.
export function createSouvenirAssets({db,assetDir,audit=()=>{}}){
 const fail=(s,m)=>{throw Object.assign(Error(m),{status:s})};
 db.exec(`CREATE TABLE IF NOT EXISTS souvenir_assets(item_name TEXT PRIMARY KEY,description TEXT NOT NULL,image_hash TEXT NOT NULL,license TEXT NOT NULL,revision INTEGER NOT NULL,updated_at TEXT NOT NULL)`);
 const list=()=>({items:db.prepare('SELECT item_name AS itemName,description,image_hash AS imageHash,license,revision,updated_at AS updatedAt FROM souvenir_assets ORDER BY updated_at DESC').all().map(r=>({...r,imageUrl:'/assets/souvenirs/'+r.imageHash+'.webp'}))});
 function save(b){
  const name=String(b.itemName||'').trim(),description=String(b.description||'').trim(),license=String(b.license||'').trim();
  if(!name||name.length>100||description.length>1000||!license||license.length>1000||b.confirmed!==true)fail(400,'请填写名称、授权说明并确认保存');
  if(!Number.isSafeInteger(b.expectedRevision)||b.expectedRevision<0)fail(400,'编辑版本无效');
  let hash=null;
  if(b.base64){
   if(typeof b.base64!=='string'||b.base64.length>5600000||!/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(b.base64))fail(400,'图片数据无效');
   const bytes=Buffer.from(b.base64,'base64');
   if(bytes.length<24||bytes.length>4194304||bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WEBP'||!['VP8 ','VP8L','VP8X'].includes(bytes.toString('ascii',12,16))||bytes.readUInt32LE(4)+8!==bytes.length)fail(400,'请上传完整WebP图片，最大4MiB');
   hash=createHash('sha256').update(bytes).digest('hex');const folder=join(assetDir,'souvenirs');mkdirSync(folder,{recursive:true});const file=join(folder,hash+'.webp');if(!existsSync(file))writeFileSync(file,bytes,{flag:'wx',mode:0o600});
  }
  db.exec('BEGIN IMMEDIATE');try{
   const old=db.prepare('SELECT * FROM souvenir_assets WHERE item_name=?').get(name);
   if((old?.revision||0)!==b.expectedRevision)fail(409,'素材已由其他窗口更新，请重新读取');
   hash=hash||old?.image_hash;if(!hash)fail(400,'首次保存必须上传图片');
   const revision=(old?.revision||0)+1,at=new Date().toISOString();
   db.prepare('INSERT INTO souvenir_assets VALUES(?,?,?,?,?,?) ON CONFLICT(item_name) DO UPDATE SET description=excluded.description,image_hash=excluded.image_hash,license=excluded.license,revision=excluded.revision,updated_at=excluded.updated_at').run(name,description,hash,license,revision,at);
   audit('souvenir.asset.save',{itemName:name,imageHash:hash,revision});db.exec('COMMIT');return list();
  }catch(e){db.exec('ROLLBACK');throw e}
 }
 function file(name){if(!/^[a-f0-9]{64}\.webp$/.test(name)||!db.prepare('SELECT 1 FROM souvenir_assets WHERE image_hash=?').get(name.slice(0,-5)))fail(404,'素材不存在');const p=join(assetDir,'souvenirs',name);if(!existsSync(p))fail(404,'素材文件缺失');return readFileSync(p)}
 return {list,save,file};
}
