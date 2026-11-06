import {readFileSync,mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
export function createWeatherContent({db,assetDir,audit=()=>{}}){
 const defaults=JSON.parse(readFileSync(new URL('./weather-default.json',import.meta.url),'utf8'));
 const fail=(status,message)=>{throw Object.assign(Error(message),{status})};
 db.exec(`CREATE TABLE IF NOT EXISTS weather_content(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL,draft TEXT NOT NULL,published TEXT NOT NULL,updated_at TEXT NOT NULL);`);
 db.prepare('INSERT OR IGNORE INTO weather_content VALUES(1,0,?,?,?)').run(JSON.stringify(defaults),JSON.stringify(defaults),new Date().toISOString());
 function read(){const r=db.prepare('SELECT * FROM weather_content WHERE id=1').get();return {revision:r.revision,draft:JSON.parse(r.draft),published:JSON.parse(r.published),updatedAt:r.updated_at}}
 function validate(c){
  if(!c||typeof c.enabled!=='boolean'||!Array.isArray(c.weather)||c.weather.length!==6)fail(400,'配置不完整');
  const clean={enabled:c.enabled};
  for(const [k,max] of Object.entries({title:10,intro:60,notice:120,license:1000})){if(typeof c[k]!=='string'||!c[k].trim()||c[k].length>max)fail(400,'文案或授权说明长度无效：'+k);clean[k]=c[k].trim()}
  if(c.scene!==defaults.scene&&!/^\/assets\/weather-scenes\/[a-f0-9]{64}\.webp$/.test(c.scene||''))fail(400,'背景地址无效');
  clean.scene=c.scene;clean.weather=c.weather.map((w,i)=>{if(w?.id!==defaults.weather[i].id)fail(400,'天气编号及顺序不能改变');const v={id:w.id};for(const k of ['name','desc','sea','broadcast','advice','record']){if(typeof w[k]!=='string'||!w[k].trim()||w[k].length>({name:12,desc:60,sea:60,broadcast:75,advice:55,record:90}[k]))fail(400,'天气文案长度无效');v[k]=w[k].trim()}return v});return clean;
 }
 function change(b,publish=false){
  if(b.confirmed!==true||!Number.isSafeInteger(b.expectedRevision))fail(400,'请确认保存并提供编辑版本');
  let next=publish?null:validate(b.config);
  if(!publish&&b.sceneBase64){
   const s=b.sceneBase64;if(typeof s!=='string'||s.length>5600000||!/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(s))fail(400,'背景数据无效');const bytes=Buffer.from(s,'base64');
   if(bytes.length<24||bytes.length>4194304||bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WEBP'||!['VP8 ','VP8L','VP8X'].includes(bytes.toString('ascii',12,16))||bytes.readUInt32LE(4)+8!==bytes.length)fail(400,'仅接受完整WebP背景，最大4MiB');
   const hash=createHash('sha256').update(bytes).digest('hex'),dir=join(assetDir,'weather-scenes');mkdirSync(dir,{recursive:true});const file=join(dir,hash+'.webp');if(!existsSync(file))writeFileSync(file,bytes,{flag:'wx',mode:0o600});next.scene='/assets/weather-scenes/'+hash+'.webp';
  }
  db.exec('BEGIN IMMEDIATE');try{const old=read();if(old.revision!==b.expectedRevision)fail(409,'版本已更新，请重新读取');
   const config=publish?validate(old.draft):next;
   if(config.scene!==defaults.scene&&!existsSync(join(assetDir,'weather-scenes',config.scene.split('/').pop())))fail(409,'背景文件缺失');
   db.prepare('UPDATE weather_content SET revision=revision+1,draft=?,published=?,updated_at=? WHERE id=1').run(JSON.stringify(config),JSON.stringify(publish?config:old.published),new Date().toISOString());audit(publish?'weather.content.publish':'weather.content.draft',{revision:old.revision+1,enabled:config.enabled});db.exec('COMMIT');return read();
  }catch(e){db.exec('ROLLBACK');throw e}
 }
 function file(name,admin=false){if(!/^[a-f0-9]{64}\.webp$/.test(name))fail(404,'素材不存在');const r=read(),url='/assets/weather-scenes/'+name;if(r.published.scene!==url&&!(admin&&r.draft.scene===url))fail(404,'背景未发布');const f=join(assetDir,'weather-scenes',name);if(!existsSync(f))fail(404,'素材缺失');return readFileSync(f)}
 return {read,draft:b=>change(b),publish:b=>change(b,true),publicConfig:()=>read().published,file};
}
