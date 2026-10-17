import http from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {mkdirSync,readFileSync,existsSync,writeFileSync,renameSync,unlinkSync,copyFileSync,readdirSync,statSync} from 'node:fs';
import {dirname,resolve,extname} from 'node:path';

const SITE_HTML=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const ADMIN_HTML=readFileSync(new URL('../admin/index.html',import.meta.url),'utf8');
const PORT=Number(process.env.PORT||4178),HOST=process.env.HOST||'127.0.0.1',DB_PATH=resolve(process.env.DB_PATH||'./data/island.sqlite'),ADMIN=process.env.ADMIN_TOKEN||'';
if(ADMIN.length<32)throw Error('Set a random ADMIN_TOKEN of at least 32 characters');
mkdirSync(dirname(DB_PATH),{recursive:true});
const ASSET_DIR=resolve(process.env.ASSET_DIR||resolve(dirname(DB_PATH),'assets'));
mkdirSync(ASSET_DIR,{recursive:true});
const db=new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
const schema=[
'CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,nickname TEXT NOT NULL,secret_hash TEXT NOT NULL,created_at TEXT NOT NULL)',
'CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires INTEGER NOT NULL)',
'CREATE TABLE IF NOT EXISTS ledger(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id TEXT NOT NULL REFERENCES users(id),amount INTEGER NOT NULL,reason TEXT NOT NULL,created_at TEXT NOT NULL)',
'CREATE TABLE IF NOT EXISTS tasks(user_id TEXT NOT NULL REFERENCES users(id),task_id TEXT NOT NULL,redeemed_at TEXT NOT NULL,PRIMARY KEY(user_id,task_id))',
'CREATE TABLE IF NOT EXISTS codes(hash TEXT PRIMARY KEY,task_id TEXT NOT NULL,redeemed_by TEXT REFERENCES users(id),redeemed_at TEXT)',
'CREATE TABLE IF NOT EXISTS bonuses(user_id TEXT NOT NULL REFERENCES users(id),threshold INTEGER NOT NULL,PRIMARY KEY(user_id,threshold))',
'CREATE TABLE IF NOT EXISTS checkins(user_id TEXT NOT NULL REFERENCES users(id),day TEXT NOT NULL,PRIMARY KEY(user_id,day))',
'CREATE TABLE IF NOT EXISTS draws(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id TEXT NOT NULL REFERENCES users(id),card_id TEXT NOT NULL,rarity TEXT NOT NULL,created_at TEXT NOT NULL)',
'CREATE TABLE IF NOT EXISTS announcements(id INTEGER PRIMARY KEY AUTOINCREMENT,title TEXT NOT NULL,body TEXT NOT NULL,published INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)',
'CREATE TABLE IF NOT EXISTS admin_audit(id INTEGER PRIMARY KEY AUTOINCREMENT,action TEXT NOT NULL,details TEXT NOT NULL,created_at TEXT NOT NULL)',
'CREATE TABLE IF NOT EXISTS visual_settings(key TEXT PRIMARY KEY,enabled INTEGER NOT NULL CHECK(enabled IN (0,1)),updated_at TEXT NOT NULL)'
];
for(const statement of schema)db.exec(statement);
const TASKS=new Set(['letter','memory','quiz','creative','support','commission']);
const CARDS=[{id:'UR-1',rarity:'UR'},...Array.from({length:2},(_,i)=>({id:'SSR-'+(i+1),rarity:'SSR'})),...Array.from({length:4},(_,i)=>({id:'SR-'+(i+1),rarity:'SR'})),...Array.from({length:4},(_,i)=>({id:'R-'+(i+1),rarity:'R'})),...Array.from({length:5},(_,i)=>({id:'N-'+(i+1),rarity:'N'}))];
const CARD_TITLES=['岛屿与永恒','许愿的瞬间','与你共赴星海','海风来信','今日晴朗','雪啾旧梦','岛上的花','贝壳耳语','停靠的心愿','漂流的旋律','一片新绿','浪花一朵','小岛邮戳','口袋星光','来客留名','晚安小啾'];
const cardCatalog=CARDS.map((c,i)=>({...c,previewId:'BZ-'+String(i+1).padStart(2,'0'),name:CARD_TITLES[i],image:'/assets/cards/'+c.id+'.webp'}));
const sha=s=>createHash('sha256').update(String(s)).digest('hex'),rand=n=>randomBytes(n).toString('base64url'),now=()=>new Date().toISOString(),day=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const error=(status,message)=>Object.assign(new Error(message),{status});
const eq=(a,b)=>{const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&timingSafeEqual(x,y)};
function tx(f){db.exec('BEGIN IMMEDIATE');try{const out=f();db.exec('COMMIT');return out}catch(e){db.exec('ROLLBACK');throw e}}
function auth(req){const token=/^Bearer (.+)$/.exec(req.headers.authorization||'')?.[1];if(!token)throw error(401,'请先登录');const s=db.prepare('SELECT user_id FROM sessions WHERE token_hash=? AND expires>?').get(sha(token),Date.now());if(!s)throw error(401,'登录已失效');return s.user_id}
function admin(req){const token=/^Bearer (.+)$/.exec(req.headers.authorization||'')?.[1];if(!token||!eq(token,ADMIN))throw error(403,'无管理权限')}
function balance(id){return db.prepare('SELECT COALESCE(SUM(amount),0) AS n FROM ledger WHERE user_id=?').get(id).n}
function earn(id,amount,reason){db.prepare('INSERT INTO ledger(user_id,amount,reason,created_at) VALUES(?,?,?,?)').run(id,amount,reason,now())}
function session(id){const token=rand(36);db.prepare('INSERT INTO sessions(token_hash,user_id,expires) VALUES(?,?,?)').run(sha(token),id,Date.now()+43200000);return token}
function state(id){const u=db.prepare('SELECT id,nickname,created_at FROM users WHERE id=?').get(id);return {...u,status:'visitor',coins:balance(id),tasks:db.prepare('SELECT task_id FROM tasks WHERE user_id=?').all(id).map(x=>x.task_id),bonuses:db.prepare('SELECT threshold FROM bonuses WHERE user_id=?').all(id).map(x=>x.threshold),checkins:db.prepare('SELECT day FROM checkins WHERE user_id=? ORDER BY day DESC').all(id).map(x=>x.day),draws:db.prepare('SELECT card_id,rarity,created_at FROM draws WHERE user_id=? ORDER BY id DESC').all(id)}}
function register(b){const nickname=String(b.nickname||'').trim();if(!nickname||[...nickname].length>20)throw error(400,'昵称须为 1-20 字');return tx(()=>{const id='BZI-'+rand(12),recoveryKey=rand(32);db.prepare('INSERT INTO users VALUES(?,?,?,?)').run(id,nickname,sha(recoveryKey),now());db.prepare('INSERT INTO tasks VALUES(?,?,?)').run(id,'report',now());earn(id,50,'首次登岛通行证奖励');return {id,recoveryKey,token:session(id),profile:state(id)}})}
function login(b){const id=String(b.id||''),key=String(b.recoveryKey||'');const u=db.prepare('SELECT secret_hash FROM users WHERE id=?').get(id);if(!u||!eq(sha(key),u.secret_hash))throw error(401,'身份凭证错误');return {token:session(id),profile:state(id)}}
function redeem(id,b){const task=String(b.taskId||''),code=String(b.code||'').trim();if(!TASKS.has(task))throw error(400,'任务不存在');return tx(()=>{const row=db.prepare('SELECT task_id,redeemed_by FROM codes WHERE hash=?').get(sha(code));if(!row||row.task_id!==task||row.redeemed_by)throw error(400,'完成代码无效或已兑换');if(db.prepare('SELECT 1 FROM tasks WHERE user_id=? AND task_id=?').get(id,task))throw error(409,'该任务已完成');db.prepare('UPDATE codes SET redeemed_by=?,redeemed_at=? WHERE hash=?').run(id,now(),sha(code));db.prepare('INSERT INTO tasks VALUES(?,?,?)').run(id,task,now());earn(id,25,'任务 '+task);const n=db.prepare('SELECT COUNT(*) AS n FROM tasks WHERE user_id=?').get(id).n;for(const threshold of [3,6,9])if(n>=threshold&&!db.prepare('SELECT 1 FROM bonuses WHERE user_id=? AND threshold=?').get(id,threshold)){db.prepare('INSERT INTO bonuses VALUES(?,?)').run(id,threshold);earn(id,25,'阶段奖励 '+threshold)}return state(id)})}
function checkin(id){return tx(()=>{const today=day(),legacyUTC=now().slice(0,10);if(db.prepare('SELECT 1 FROM checkins WHERE user_id=? AND day IN (?,?)').get(id,today,legacyUTC))throw error(409,'今日已签到');db.prepare('INSERT INTO checkins VALUES(?,?)').run(id,today);earn(id,10,'签到 '+today);return state(id)})}
function draw(id){return tx(()=>{if(balance(id)<50)throw error(409,'金币不足');const first=db.prepare('SELECT COUNT(*) AS n FROM draws WHERE user_id=?').get(id).n===0;const pool=first?CARDS.filter(c=>c.rarity==='SSR'||c.rarity==='SR'):CARDS;const idx=randomBytes(4).readUInt32BE(0)%pool.length,card=pool[idx];earn(id,-50,'抽卡 '+card.id);db.prepare('INSERT INTO draws(user_id,card_id,rarity,created_at) VALUES(?,?,?,?)').run(id,card.id,card.rarity,now());return {card,profile:state(id)}})}
function codes(b){const task=String(b.taskId||''),count=Number(b.count||1);if(!TASKS.has(task)||!Number.isInteger(count)||count<1||count>100)throw error(400,'任务或数量无效');return tx(()=>{const out=[];for(let i=0;i<count;i++){const c='ISL-'+rand(18);db.prepare('INSERT INTO codes(hash,task_id) VALUES(?,?)').run(sha(c),task);out.push(c)}return {taskId:task,codes:out}})}
const VISUAL_KEYS={collectionGrid:false,collectionFan:true,collectionRing:false,ocSlider:true,ocStagger:false,ocDepth:false,effectWater:true,effectStars:true,effectIsland:true,effectProgress:true,effectGuide:true,effectDraw:true,effectCheckin:true};
function getVisualSettings(){const rows=db.prepare('SELECT key,enabled FROM visual_settings').all();const result={...VISUAL_KEYS};for(const row of rows)if(Object.hasOwn(result,row.key))result[row.key]=!!row.enabled;return result}
function saveVisualSettings(payload){if(!payload||typeof payload!=='object'||Array.isArray(payload)||Object.keys(payload).length!==Object.keys(VISUAL_KEYS).length||Object.keys(payload).some(key=>!Object.hasOwn(VISUAL_KEYS,key)||typeof payload[key]!=='boolean'))throw error(400,'视效配置格式无效');if(!['collectionGrid','collectionFan','collectionRing'].some(k=>payload[k])||!['ocSlider','ocStagger','ocDepth'].some(k=>payload[k]))throw error(400,'每个画廊必须至少保留一种展示方式');return tx(()=>{const stmt=db.prepare('INSERT INTO visual_settings(key,enabled,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET enabled=excluded.enabled,updated_at=excluded.updated_at');for(const [k,v] of Object.entries(payload))stmt.run(k,v?1:0,now());auditAdmin('visual.update',{settings:payload});return getVisualSettings()})}
function auditAdmin(action,details){db.prepare('INSERT INTO admin_audit(action,details,created_at) VALUES(?,?,?)').run(action,JSON.stringify(details),now())}
function adminAudit(){return db.prepare('SELECT id,action,details,created_at FROM admin_audit ORDER BY id DESC LIMIT 100').all().map(row=>({...row,details:JSON.parse(row.details)}))}
function codeStats(){return db.prepare('SELECT task_id,COUNT(*) total,SUM(CASE WHEN redeemed_by IS NULL THEN 1 ELSE 0 END) unused,SUM(CASE WHEN redeemed_by IS NOT NULL THEN 1 ELSE 0 END) redeemed FROM codes GROUP BY task_id ORDER BY task_id').all()}
function userDetail(id){if(!/^BZI-[A-Za-z0-9_-]{8,100}$/.test(id))throw error(400,'参与者编号无效');const user=db.prepare('SELECT id,nickname,created_at FROM users WHERE id=?').get(id);if(!user)throw error(404,'岛民不存在');return {user,ledger:db.prepare('SELECT amount,reason,created_at FROM ledger WHERE user_id=? ORDER BY id DESC LIMIT 200').all(id),tasks:db.prepare('SELECT task_id,redeemed_at FROM tasks WHERE user_id=? ORDER BY redeemed_at DESC').all(id),checkins:db.prepare('SELECT day FROM checkins WHERE user_id=? ORDER BY day DESC LIMIT 90').all(id),draws:db.prepare('SELECT card_id,rarity,created_at FROM draws WHERE user_id=? ORDER BY id DESC LIMIT 100').all(id)}}
function overview(){return {users:db.prepare('SELECT COUNT(*) AS n FROM users').get().n,redeemed:db.prepare("SELECT COUNT(*) AS n FROM tasks WHERE task_id<>'report'").get().n,draws:db.prepare('SELECT COUNT(*) AS n FROM draws').get().n,codesUnused:db.prepare('SELECT COUNT(*) AS n FROM codes WHERE redeemed_by IS NULL').get().n,announcementsPublished:db.prepare('SELECT COUNT(*) AS n FROM announcements WHERE published=1').get().n}}
function listUsers(){return db.prepare('SELECT u.id,u.nickname,u.created_at,COALESCE((SELECT SUM(amount) FROM ledger l WHERE l.user_id=u.id),0) coins,(SELECT COUNT(*) FROM tasks t WHERE t.user_id=u.id) tasks,(SELECT COUNT(*) FROM draws d WHERE d.user_id=u.id) draws FROM users u ORDER BY u.created_at DESC LIMIT 100').all()}
function announcements(adminView=false){return db.prepare('SELECT id,title,body,published,created_at,updated_at FROM announcements '+(adminView?'':'WHERE published=1 ')+'ORDER BY id DESC LIMIT 100').all()}
function saveAnnouncement(b){const title=String(b.title||'').trim(),body=String(b.body||'').trim(),published=b.published===true?1:0,id=b.id==null?null:Number(b.id);if(!title||title.length>80||!body||body.length>1500)throw error(400,'公告标题须为 1–80 字，正文须为 1–1500 字');if(id!==null&&(!Number.isSafeInteger(id)||id<1))throw error(400,'公告编号无效');return tx(()=>{const t=now();if(id===null)db.prepare('INSERT INTO announcements(title,body,published,created_at,updated_at) VALUES(?,?,?,?,?)').run(title,body,published,t,t);else{const result=db.prepare('UPDATE announcements SET title=?,body=?,published=?,updated_at=? WHERE id=?').run(title,body,published,t,id);if(!result.changes)throw error(404,'公告不存在')}return announcements(true)})}
function deleteAnnouncement(b){const id=Number(b.id);if(!Number.isSafeInteger(id)||id<1)throw error(400,'公告编号无效');const result=db.prepare('DELETE FROM announcements WHERE id=?').run(id);if(!result.changes)throw error(404,'公告不存在');return {deleted:id}}
const ASSET_NAMES=new Set(['characters/zhizhi.webp','characters/caicai.webp','decor/home-background.webp','decor/home-poster.webp','decor/island-map.webp','decor/office-background.webp','decor/checkin-background.webp','decor/post-office-background.webp','decor/collection-background.webp','decor/mailbox-background.webp',...['UR-1',...Array.from({length:2},(_,i)=>'SSR-'+(i+1)),...Array.from({length:4},(_,i)=>'SR-'+(i+1)),...Array.from({length:4},(_,i)=>'R-'+(i+1)),...Array.from({length:5},(_,i)=>'N-'+(i+1))].map(id=>'cards/'+id+'.webp')]);
function assetPath(name){if(!ASSET_NAMES.has(name))throw error(400,'素材位置无效');return resolve(ASSET_DIR,name)}
function versionFolder(name){return resolve(ASSET_DIR,'history',name)}
function assetVersions(name){assetPath(name);const folder=versionFolder(name);if(!existsSync(folder))return [];return readdirSync(folder).filter(f=>/^[0-9TZ.-]+-[a-f0-9]{12}\.webp$/.test(f)).sort().reverse().slice(0,20).map(f=>({version:f,size:statSync(resolve(folder,f)).size}))}
function assetStatus(){return [...ASSET_NAMES].map(name=>({name,uploaded:existsSync(assetPath(name)),url:'/assets/'+name,versions:assetVersions(name).length}))}
function backupAsset(name){const filepath=assetPath(name);if(!existsSync(filepath))return null;const folder=versionFolder(name);mkdirSync(folder,{recursive:true});const version=now().replace(/[:]/g,'-')+'-'+randomBytes(6).toString('hex')+'.webp';copyFileSync(filepath,resolve(folder,version));return version}
function saveAsset(b){const name=String(b.name||'');const filepath=assetPath(name),raw=String(b.base64||'');if(!/^[A-Za-z0-9+/]+={0,2}$/.test(raw)||raw.length>5600000)throw error(400,'图片内容无效或超过 4 MB');const bytes=Buffer.from(raw,'base64');if(bytes.length<24||bytes.length>4*1024*1024||bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WEBP'||!['VP8 ','VP8L','VP8X'].includes(bytes.toString('ascii',12,16)))throw error(400,'仅允许有效的 WebP 图片（最大 4 MB）');mkdirSync(dirname(filepath),{recursive:true});const temp=filepath+'.'+rand(8)+'.tmp';try{writeFileSync(temp,bytes,{flag:'wx',mode:0o600});const previous=backupAsset(name);renameSync(temp,filepath);auditAdmin('asset.upload',{name,size:bytes.length,previous})}finally{if(existsSync(temp))unlinkSync(temp)}return {name,size:bytes.length,url:'/assets/'+name}}
function restoreAsset(b){const name=String(b.name||''),version=String(b.version||'');const filepath=assetPath(name);if(!/^[0-9TZ.-]+-[a-f0-9]{12}\.webp$/.test(version))throw error(400,'版本编号无效');const source=resolve(versionFolder(name),version);if(!existsSync(source))throw error(404,'历史版本不存在');mkdirSync(dirname(filepath),{recursive:true});const previous=backupAsset(name);const temp=filepath+'.'+rand(8)+'.tmp';try{copyFileSync(source,temp);renameSync(temp,filepath)}finally{if(existsSync(temp))unlinkSync(temp)}auditAdmin('asset.restore',{name,version,previous});return {name,url:'/assets/'+name,restored:version}}

function readBody(req,maxSize=8192){return new Promise((ok,no)=>{let chunks='',size=0;req.on('data',d=>{size+=d.length;if(size>maxSize){no(error(413,'请求过大'));req.destroy();return}chunks+=d});req.on('end',()=>{try{ok(chunks?JSON.parse(chunks):{})}catch{no(error(400,'JSON 无效'))}});req.on('error',no)})}
function send(res,code,data){res.writeHead(code,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(data))}
http.createServer(async(req,res)=>{try{const path=new URL(req.url||'/', 'http://localhost').pathname;
const pageNames=new Set(['index.html','passport.html','office.html','checkin.html','draw.html','collection.html','mailbox.html','guide.html','islanders.html']);
const previewRoot=resolve(new URL('../ui-preview/',import.meta.url).pathname);
const suffix=path==='/'?'index.html':path.startsWith('/ui-preview/')?path.slice('/ui-preview/'.length):path.slice(1);
if(req.method==='GET'&&!path.startsWith('/api/')&&pageNames.has(suffix)&&path!=='/legacy'){
 const html=readFileSync(resolve(previewRoot,suffix),'utf8').replace('<head>','<head><script>window.__BUZHI_PRODUCTION__=true</script>');
 res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});
 return res.end(html);
}
if(req.method==='GET'&&path==='/legacy'){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});return res.end(SITE_HTML)}
if(req.method==='GET'&&/^(?:\/ui-preview\/)?(?:assets\/[a-zA-Z0-9_/-]+\.(?:svg|webp|png)|[a-zA-Z0-9-]+\.(?:css|js))$/.test(suffix)){
const file=resolve(previewRoot,suffix);
if(!file.startsWith(previewRoot+'/')||!existsSync(file))throw error(404,'预览素材不存在');
const ext=extname(file);res.writeHead(200,{'content-type':{'.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'}[ext]||'application/octet-stream','cache-control':'public,max-age=120','x-content-type-options':'nosniff'});return res.end(readFileSync(file));
}
if(req.method==='GET'&&/^\/assets\/(characters|cards|decor)\/[a-zA-Z0-9-]+\.webp$/.test(path)){const name=path.slice('/assets/'.length);if(!ASSET_NAMES.has(name))throw error(404,'素材不存在');const uploaded=assetPath(name);const file=existsSync(uploaded)?uploaded:resolve(new URL('..',import.meta.url).pathname,'.'+path);if(!existsSync(file))throw error(404,'素材尚未上传');res.writeHead(200,{'content-type':'image/webp','cache-control':'public, max-age=3600','x-content-type-options':'nosniff'});return res.end(readFileSync(file))}if(path==='/admin'&&req.method==='GET'){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});return res.end(ADMIN_HTML)}if((path==='/'||path==='/index.html')&&req.method==='GET'){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});return res.end(SITE_HTML)}if(path==='/health'&&req.method==='GET')return send(res,200,{ok:true});if(!path.startsWith('/api/'))throw error(404,'未找到');if(path==='/api/admin/assets/upload'&&req.method==='POST')admin(req);if(req.method==='POST'&&!String(req.headers['content-type']||'').startsWith('application/json'))throw error(415,'请使用 JSON');const b=req.method==='POST'?await readBody(req,path==='/api/admin/assets/upload'?5600000:8192):{};let data;
if(path==='/api/register'&&req.method==='POST')data=register(b);
else if(path==='/api/login'&&req.method==='POST')data=login(b);
else if(path==='/api/me'&&req.method==='GET')data=state(auth(req));
else if(path==='/api/redeem'&&req.method==='POST')data=redeem(auth(req),b);
else if(path==='/api/checkin'&&req.method==='POST')data=checkin(auth(req));
else if(path==='/api/draw'&&req.method==='POST')data=draw(auth(req));
else if(path==='/api/announcements'&&req.method==='GET')data=announcements(false);
else if(path==='/api/catalog'&&req.method==='GET')data={cards:cardCatalog,cost:50,firstDrawRarities:['SSR','SR'],timezone:'Asia/Shanghai',nicknameMaxLength:20};
else if(path==='/api/visual-settings'&&req.method==='GET')data=getVisualSettings();
else if(path==='/api/admin/announcements'&&req.method==='GET'){admin(req);data=announcements(true)}
else if(path==='/api/admin/announcements'&&req.method==='POST'){admin(req);data=saveAnnouncement(b);auditAdmin('announcement.save',{id:b.id??null,published:b.published===true})}
else if(path==='/api/admin/announcements/delete'&&req.method==='POST'){admin(req);data=deleteAnnouncement(b);auditAdmin('announcement.delete',{id:data.deleted})}
else if(path==='/api/admin/users'&&req.method==='GET'){admin(req);data=listUsers()}
else if(path==='/api/admin/codes'&&req.method==='POST'){admin(req);data=codes(b);auditAdmin('codes.generate',{taskId:data.taskId,count:data.codes.length})}
else if(path==='/api/admin/overview'&&req.method==='GET'){admin(req);data=overview()}
else if(path==='/api/admin/assets'&&req.method==='GET'){admin(req);data=assetStatus()}
else if(path==='/api/admin/assets/upload'&&req.method==='POST'){admin(req);data=saveAsset(b)}
else if(path==='/api/admin/assets/versions'&&req.method==='GET'){admin(req);data=assetVersions(String(new URL(req.url,'http://localhost').searchParams.get('name')||''))}
else if(path==='/api/admin/assets/restore'&&req.method==='POST'){admin(req);data=restoreAsset(b)}
else if(path==='/api/admin/visual-settings'&&req.method==='GET'){admin(req);data=getVisualSettings()}
else if(path==='/api/admin/visual-settings'&&req.method==='POST'){admin(req);data=saveVisualSettings(b)}
else if(path==='/api/admin/user'&&req.method==='GET'){admin(req);data=userDetail(String(new URL(req.url,'http://localhost').searchParams.get('id')||''))}
else if(path==='/api/admin/code-stats'&&req.method==='GET'){admin(req);data=codeStats()}
else if(path==='/api/admin/audit'&&req.method==='GET'){admin(req);data=adminAudit()}
else throw error(404,'未找到');
send(res,200,data)}catch(e){send(res,e.status||500,{error:e.status?e.message:'内部错误'})}}).listen(PORT,HOST,()=>console.log('Buzhi server listening on '+HOST+':'+PORT));
