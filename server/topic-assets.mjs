import {createHash,randomUUID} from 'node:crypto';
import {mkdirSync,writeFileSync,existsSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
export function createTopicAssets({db,assetDir,slots=[],audit=()=>{}}){
 const fail=(status,message)=>{const e=Error(message);e.status=status;throw e;};
 const registry=new Map(slots.map(s=>[s.topic+'/'+s.id,s]));
 db.exec(`CREATE TABLE IF NOT EXISTS topic_asset_state(topic TEXT PRIMARY KEY,revision INTEGER NOT NULL DEFAULT 0,published TEXT NOT NULL DEFAULT '{}');
 CREATE TABLE IF NOT EXISTS topic_asset_versions(id TEXT PRIMARY KEY,topic TEXT NOT NULL,slot TEXT NOT NULL,kind TEXT NOT NULL,value TEXT NOT NULL,hash TEXT,ext TEXT,license TEXT NOT NULL,actor TEXT NOT NULL,created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS topic_asset_releases(id TEXT PRIMARY KEY,topic TEXT NOT NULL,manifest TEXT NOT NULL,actor TEXT NOT NULL,created_at TEXT NOT NULL);`);
 function transaction(fn){db.exec('BEGIN IMMEDIATE');try{const r=fn();db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}}
 function topic(id){if(![...registry.values()].some(s=>s.topic===id))fail(404,'活动尚无已核实的素材点位');db.prepare('INSERT OR IGNORE INTO topic_asset_state(topic) VALUES(?)').run(id);return db.prepare('SELECT * FROM topic_asset_state WHERE topic=?').get(id);}
 function check(id,revision){const row=topic(id);if(!Number.isSafeInteger(revision)||row.revision!==revision)fail(409,'版本已变化，请重新读取');return row;}
 function list(id){if(!id)return {slots:[...registry.values()],configured:registry.size>0};const state=topic(id);return {topic:id,revision:state.revision,published:JSON.parse(state.published),slots:slots.filter(s=>s.topic===id),versions:db.prepare('SELECT * FROM topic_asset_versions WHERE topic=? ORDER BY created_at DESC LIMIT 200').all(id),releases:db.prepare('SELECT id,actor,created_at FROM topic_asset_releases WHERE topic=? ORDER BY created_at DESC LIMIT 100').all(id)};}
 function draft(b){
  const spec=registry.get(b.topic+'/'+b.slot);if(!spec)fail(404,'素材点位尚未确认');
  let value='',hash=null,ext=null;const kind=spec.kind;
  const license=String(b.license||'').trim();if(license.length>1000)fail(400,'授权说明过长');
  if(kind==='text'){if(typeof b.text!=='string'||b.text.length>(spec.maxLength||3000))fail(400,'文案格式或长度不正确');value=b.text;}
  else{
   if(typeof b.base64!=='string'||!b.base64.length||b.base64.length>5600000||!/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(b.base64))fail(400,'文件内容无效或过大');
   const bytes=Buffer.from(b.base64,'base64');if(bytes.length<24||bytes.length>Math.min(spec.maxBytes||4194304,4194304))fail(400,'文件大小超限');
   if(kind==='image'){if(bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WEBP'||!['VP8 ','VP8L','VP8X'].includes(bytes.toString('ascii',12,16)))fail(400,'本阶段仅接受WebP图片');ext='webp';}
   else if(kind==='audio'){if(!license)fail(400,'音频必须提供来源及授权说明');if(bytes.length<44||bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WAVE')fail(400,'本阶段仅接受PCM WAV音频');
    let format=false,payload=false;for(let offset=12;offset+8<=bytes.length;){const tag=bytes.toString('ascii',offset,offset+4),length=bytes.readUInt32LE(offset+4),end=offset+8+length;if(end>bytes.length)fail(400,'音频数据不完整');if(tag==='fmt '){if(length<16||bytes.readUInt16LE(offset+8)!==1||![1,2].includes(bytes.readUInt16LE(offset+10))||![16,24].includes(bytes.readUInt16LE(offset+22))||bytes.readUInt32LE(offset+12)<8000||bytes.readUInt32LE(offset+12)>96000)fail(400,'仅支持8–96kHz、单/双声道16/24位PCM WAV');format=true;}if(tag==='data'&&length>0)payload=true;offset=end+(length%2);}if(!format||!payload)fail(400,'音频缺少格式或数据段');ext='wav';}else fail(400,'该资源类型尚不支持上传');
   if(bytes.readUInt32LE(4)+8!==bytes.length)fail(400,'文件容器长度不完整');
   hash=createHash('sha256').update(bytes).digest('hex');value='/assets/topic-versions/'+hash+'.'+ext;
   // Immutable files precede the DB commit; a failed transaction can only leave an unreferenced file.
   const folder=join(assetDir,'topic-versions');mkdirSync(folder,{recursive:true});const file=join(folder,hash+'.'+ext);if(!existsSync(file))writeFileSync(file,bytes,{flag:'wx',mode:0o600});
  }
  return transaction(()=>{check(b.topic,b.expectedRevision);const id=randomUUID(),at=new Date().toISOString();db.prepare('INSERT INTO topic_asset_versions VALUES(?,?,?,?,?,?,?,?,?,?)').run(id,b.topic,b.slot,kind,value,hash,ext,license,'admin',at);db.prepare('UPDATE topic_asset_state SET revision=revision+1 WHERE topic=?').run(b.topic);audit('topic.asset.draft',{topic:b.topic,slot:b.slot,version:id});return {version:id,...list(b.topic)};});
 }
 function publish(b){return transaction(()=>{
  check(b.topic,b.expectedRevision);let manifest;
  if(b.restoreRelease){const old=db.prepare('SELECT manifest FROM topic_asset_releases WHERE id=? AND topic=?').get(String(b.restoreRelease),b.topic);if(!old)fail(404,'历史发布不存在');manifest=JSON.parse(old.manifest);}
  else{if(!b.versions||Array.isArray(b.versions)||typeof b.versions!=='object')fail(400,'请选择发布版本');manifest={};
   for(const [slot,id] of Object.entries(b.versions)){const spec=registry.get(b.topic+'/'+slot);if(!spec)fail(400,'发布包含未确认点位');const v=db.prepare('SELECT * FROM topic_asset_versions WHERE id=? AND topic=? AND slot=?').get(String(id),b.topic,slot);if(!v)fail(400,'版本与活动点位不匹配');if(v.hash&&!existsSync(join(assetDir,'topic-versions',v.hash+'.'+v.ext)))fail(409,'文件缺失，旧发布保持不变');manifest[slot]={version:v.id,kind:v.kind,value:v.value,sha256:v.hash};}
   for(const spec of slots.filter(s=>s.topic===b.topic&&s.required))if(!manifest[spec.id])fail(400,'必需点位缺失');
  }
  for(const v of Object.values(manifest))if(v.sha256&&!existsSync(join(assetDir,'topic-versions',v.sha256+'.'+(v.kind==='audio'?'wav':'webp'))))fail(409,'文件缺失，旧发布保持不变');
  const id=randomUUID();db.prepare('INSERT INTO topic_asset_releases VALUES(?,?,?,?,?)').run(id,b.topic,JSON.stringify(manifest),'admin',new Date().toISOString());db.prepare('UPDATE topic_asset_state SET published=?,revision=revision+1 WHERE topic=?').run(JSON.stringify({release:id,assets:manifest}),b.topic);audit(b.restoreRelease?'topic.asset.restore':'topic.asset.publish',{topic:b.topic,release:id});return list(b.topic);
 });}
 function publicManifest(id){if(![...registry.values()].some(s=>s.topic===id))fail(404,'活动尚未接入');const row=db.prepare('SELECT published FROM topic_asset_state WHERE topic=?').get(id);return row?JSON.parse(row.published):{};}
 function file(name){if(!/^[a-f0-9]{64}\.(webp|wav)$/.test(name))fail(404,'素材不存在');const hash=name.split('.')[0];
  // Drafts are private; delivery is enabled only after an authoritative publication references the file.
  const releases=db.prepare('SELECT manifest FROM topic_asset_releases').all();if(!releases.some(s=>Object.values(JSON.parse(s.manifest)).some(v=>v.sha256===hash)))fail(404,'素材尚未发布');
  const path=join(assetDir,'topic-versions',name);if(!existsSync(path))fail(404,'素材文件缺失');return {body:readFileSync(path),type:name.endsWith('.webp')?'image/webp':'audio/wav'};}
 return {list,draft,publish,publicManifest,file};
}
