import {createMessageBoard} from './message-board.mjs';
import {createAccountRecovery} from './account-recovery.mjs';
import {createResidentCenter} from './resident-center.mjs';
import {createMembership} from './membership.mjs';
import {listVisitors} from './visitors.mjs';
import {createMaintenance} from './maintenance.mjs';
import {assetHelp} from './asset-help.mjs';
import http from 'node:http';
import {createOperations,streamBackup} from './operations.mjs';
import {activityPhase,validateActivity} from './activity.mjs';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes,randomInt,createHash,timingSafeEqual,scryptSync} from 'node:crypto';
import {mkdirSync,readFileSync,existsSync,writeFileSync,renameSync,unlinkSync,copyFileSync,readdirSync,statSync} from 'node:fs';
import {dirname,resolve,extname} from 'node:path';

const SITE_HTML=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const ADMIN_PAGES=new Set(['messages','overview','activity','codes','announcements','visual','code-statistics','test-cleanup','users','user-details','audit','characters','cards','assets','asset-check','backups','members','visitors','site-maintenance','coins','recovery','residents','account-recovery']);
const ADMIN_SCRIPTS=new Set(['messages.js','navigation.js','membership.js','maintenance.js','residents.js','account-recovery.js']);
const ADMIN_HTML=readFileSync(new URL('../admin/index.html',import.meta.url),'utf8');
const PORT=Number(process.env.PORT||4178),HOST=process.env.HOST||'127.0.0.1',DB_PATH=resolve(process.env.DB_PATH||'./data/island.sqlite'),ADMIN=process.env.ADMIN_TOKEN||'';
const BUILD_REVISION=/^[a-f0-9]{7,40}$/i.test(process.env.RAILWAY_GIT_COMMIT_SHA||'')?process.env.RAILWAY_GIT_COMMIT_SHA:'unknown';
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
'CREATE TABLE IF NOT EXISTS visual_settings(key TEXT PRIMARY KEY,enabled INTEGER NOT NULL CHECK(enabled IN (0,1)),updated_at TEXT NOT NULL)',
'CREATE TABLE IF NOT EXISTS activity_settings(id INTEGER PRIMARY KEY CHECK(id=1),starts_at TEXT,ends_at TEXT,updated_at TEXT NOT NULL)',
'CREATE TABLE IF NOT EXISTS asset_layouts(name TEXT PRIMARY KEY,settings TEXT NOT NULL,updated_at TEXT NOT NULL)',
'CREATE TABLE IF NOT EXISTS oc_profiles(id TEXT PRIMARY KEY,name TEXT NOT NULL,description TEXT NOT NULL DEFAULT \'\',sort_order INTEGER NOT NULL DEFAULT 0,hidden INTEGER NOT NULL DEFAULT 0,updated_at TEXT NOT NULL)',
'CREATE TABLE IF NOT EXISTS card_profiles(card_id TEXT PRIMARY KEY,name TEXT NOT NULL,story TEXT NOT NULL DEFAULT \'\',oc_id TEXT,updated_at TEXT NOT NULL)'
];
for(const statement of schema)db.exec(statement);
if(!db.prepare('PRAGMA table_info(users)').all().some(c=>c.name==='password_hash'))db.exec('ALTER TABLE users ADD COLUMN password_hash TEXT');
db.exec("CREATE TABLE IF NOT EXISTS site_maintenance (id INTEGER PRIMARY KEY CHECK(id=1), enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)), message TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL)");
function maintenanceState(){const row=db.prepare('SELECT enabled,message,updated_at FROM site_maintenance WHERE id=1').get();return {enabled:!!row?.enabled,message:row?.message||'岛主正在整理海风送来的生日礼物，小岛暂时休港，请稍后再来赴约 ♡',updatedAt:row?.updated_at||null}}
function saveSiteMaintenance(b){if(typeof b.enabled!=='boolean'||typeof b.message!=='string'||b.message.length>300)throw error(400,'请输入有效的维护设置，公告最多300字');const t=now();db.prepare('INSERT INTO site_maintenance(id,enabled,message,updated_at) VALUES(1,?,?,?) ON CONFLICT(id) DO UPDATE SET enabled=excluded.enabled,message=excluded.message,updated_at=excluded.updated_at').run(b.enabled?1:0,b.message.trim(),t);auditAdmin('site.maintenance',{enabled:b.enabled});return maintenanceState()}
function maintenanceHtml(message){const escaped=message.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));return '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>不吱岛 · 暂时休港</title><style>*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;font-family:system-ui,"Microsoft YaHei",sans-serif;color:#285b7a;background:radial-gradient(circle at 20% 20%,#fff8 0,transparent 38%),linear-gradient(145deg,#b8e9f5,#d8effd 55%,#e9e2ff)}main{width:min(100%,640px);padding:clamp(30px,7vw,70px);border:1px solid #fff;border-radius:34px;text-align:center;background:#ffffff80;box-shadow:0 20px 75px #3e81ab26;backdrop-filter:blur(12px)}h1{font-size:clamp(30px,6vw,49px);margin:18px 0}p{font-size:17px;line-height:2;white-space:pre-wrap;overflow-wrap:anywhere}.symbol{font-size:48px}small{color:#6084a0}</style></head><body><main><div class="symbol">🌊</div><h1>不吱岛 · 暂时休港</h1><p>'+escaped+'</p><small>海风会替我们守着这座小岛，稍后再见 ♡</small></main></body></html>'}

const TASKS=new Set(['letter','memory','quiz','creative','support','commission','wish','live','song','islander','party']);
const CARDS=[...Array.from({length:1},(_,i)=>({id:'UR-'+(i+1),rarity:'UR'})),...Array.from({length:2},(_,i)=>({id:'SSR-'+(i+1),rarity:'SSR'})),...Array.from({length:4},(_,i)=>({id:'SR-'+(i+1),rarity:'SR'})),...Array.from({length:4},(_,i)=>({id:'R-'+(i+1),rarity:'R'})),...Array.from({length:5},(_,i)=>({id:'N-'+(i+1),rarity:'N'})),
  ...Array.from({length:1},(_,i)=>({id:'UR-'+(i+2),rarity:'UR'})),
  ...Array.from({length:2},(_,i)=>({id:'SSR-'+(i+3),rarity:'SSR'})),
  ...Array.from({length:2},(_,i)=>({id:'SR-'+(i+5),rarity:'SR'})),
  ...Array.from({length:5},(_,i)=>({id:'R-'+(i+5),rarity:'R'})),
  ...Array.from({length:6},(_,i)=>({id:'N-'+(i+6),rarity:'N'})),
  ...Array.from({length:18},(_,i)=>({id:'LOCK-'+String(i+33).padStart(2,'0'),rarity:'N',unreleased:true}))];
const CARD_TITLES=['岛屿与永恒','许愿的瞬间','与你共赴星海','海风来信','今日晴朗','雪啾旧梦','岛上的花','贝壳耳语','停靠的心愿','漂流的旋律','一片新绿','浪花一朵','小岛邮戳','口袋星光','来客留名','晚安小啾'];
const OFFICIAL_OC=[['oc-official-caicai','菜菜','不吱岛的共同岛主，也是这场生日庆典的主角。与吱吱一起欢迎每一位登岛的朋友。',-200],['oc-official-zhizhi','吱吱','不吱岛的共同岛主，与菜菜一起筹备庆典，收藏岛上每一份相遇与故事。',-199]];
for(const [id,name,description,sort] of OFFICIAL_OC)db.prepare('INSERT OR IGNORE INTO oc_profiles(id,name,description,sort_order,hidden,updated_at) VALUES(?,?,?,?,0,?)').run(id,name,description,sort,now());
function listOc(publicOnly=false){const rows=db.prepare('SELECT id,name,description,sort_order AS sortOrder,hidden,updated_at AS updatedAt FROM oc_profiles '+(publicOnly?'WHERE hidden=0 ':'')+'ORDER BY sort_order ASC,id ASC').all();return rows.map(r=>({...r,hidden:!!r.hidden,image:r.id==='oc-official-caicai'?'/assets/characters/caicai.webp':r.id==='oc-official-zhizhi'?'/assets/characters/zhizhi.webp':'/assets/oc/'+r.id+'.webp'}))}
function saveOc(b){const id=b.id?String(b.id):'oc-'+rand(9);if(!/^oc-[A-Za-z0-9_-]{8,30}$/.test(id))throw error(400,'OC 编号无效');const name=String(b.name||'').trim(),description=String(b.description||'').trim(),sortOrder=Number(b.sortOrder??0);if(!name||name.length>60||description.length>2000||!Number.isSafeInteger(sortOrder)||Math.abs(sortOrder)>100000)throw error(400,'OC 资料格式不正确');const hidden=b.hidden===true?1:0;db.prepare('INSERT INTO oc_profiles(id,name,description,sort_order,hidden,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,description=excluded.description,sort_order=excluded.sort_order,hidden=excluded.hidden,updated_at=excluded.updated_at').run(id,name,description,sortOrder,hidden,now());auditAdmin('oc.save',{id,hidden});return {id}}
function getCards(){const profiles=new Map(db.prepare('SELECT card_id,name,story,oc_id FROM card_profiles').all().map(r=>[r.card_id,r]));return CARDS.map((c,i)=>({...c,unreleased:!!c.unreleased,previewId:'BZ-'+String(i+1).padStart(2,'0'),name:profiles.get(c.id)?.name||CARD_TITLES[i]||(c.unreleased?'未公开卡面':'星海回忆 '+String(i+1).padStart(2,'0')),story:profiles.has(c.id)?profiles.get(c.id).story:null,characters:profiles.get(c.id)?.oc_id?db.prepare('SELECT name FROM oc_profiles WHERE id=?').get(profiles.get(c.id).oc_id)?.name:null,ocId:profiles.get(c.id)?.oc_id||null,image:'/assets/cards/'+c.id+'.webp'}))}
function saveCard(b){if(Object.keys(b).some(k=>!['cardId','name','story','ocId'].includes(k)))throw error(400,'只能编辑卡片资料');const id=String(b.cardId||'');if(!CARDS.some(c=>c.id===id))throw error(400,'卡片编号无效');const name=String(b.name||'').trim(),story=String(b.story||'').trim(),ocId=b.ocId?String(b.ocId):null;if(!name||name.length>80||story.length>3000)throw error(400,'卡片资料格式不正确');if(ocId&&!db.prepare('SELECT id FROM oc_profiles WHERE id=?').get(ocId))throw error(400,'关联人物不存在');db.prepare('INSERT INTO card_profiles(card_id,name,story,oc_id,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(card_id) DO UPDATE SET name=excluded.name,story=excluded.story,oc_id=excluded.oc_id,updated_at=excluded.updated_at').run(id,name,story,ocId,now());auditAdmin('card.save',{id,ocId});return {id}}

const sha=s=>createHash('sha256').update(String(s)).digest('hex'),rand=n=>randomBytes(n).toString('base64url'),now=()=>new Date().toISOString(),day=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const error=(status,message)=>Object.assign(new Error(message),{status});
const eq=(a,b)=>{const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&timingSafeEqual(x,y)};
function tx(f){db.exec('BEGIN IMMEDIATE');try{const out=f();db.exec('COMMIT');return out}catch(e){db.exec('ROLLBACK');throw e}}
function auth(req){const token=/^Bearer (.+)$/.exec(req.headers.authorization||'')?.[1];if(!token)throw error(401,'请先登录');const s=db.prepare('SELECT user_id FROM sessions WHERE token_hash=? AND expires>?').get(sha(token),Date.now());if(!s)throw error(401,'登录已失效');return s.user_id}
function admin(req){const token=/^Bearer (.+)$/.exec(req.headers.authorization||'')?.[1];if(!token||!eq(token,ADMIN))throw error(403,'无管理权限')}
function balance(id){return db.prepare('SELECT COALESCE(SUM(amount),0) AS n FROM ledger WHERE user_id=?').get(id).n}
function earn(id,amount,reason){db.prepare('INSERT INTO ledger(user_id,amount,reason,created_at) VALUES(?,?,?,?)').run(id,amount,reason,now())}
db.exec("CREATE TABLE IF NOT EXISTS admin_coin_grants (request_id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),amount INTEGER NOT NULL,reason TEXT NOT NULL,created_at TEXT NOT NULL)");
function grantCoins(b){
 const userId=String(b.userId||'').trim(),amount=b.amount,reason=String(b.reason||'').trim(),requestId=String(b.requestId||'');
 if(!/^BZI-[A-Za-z0-9_-]{8,100}$/.test(userId)||!Number.isSafeInteger(amount)||amount<1||amount>5000||reason.length<3||reason.length>150||!/^[0-9a-f-]{36}$/i.test(requestId))throw error(400,'请填写完整岛民ID、1至5000枚金币、3至150字的原因');
 return tx(()=>{
  const previous=db.prepare('SELECT user_id AS userId,amount,reason FROM admin_coin_grants WHERE request_id=?').get(requestId);
  if(previous){if(previous.userId!==userId||previous.amount!==amount||previous.reason!==reason)throw error(409,'请求编号已被使用');return {alreadyProcessed:true,...previous,coins:balance(userId)}}
  const user=db.prepare('SELECT id,nickname FROM users WHERE id=?').get(userId);if(!user)throw error(404,'没有找到对应的岛民ID');
  const t=now();db.prepare('INSERT INTO admin_coin_grants(request_id,user_id,amount,reason,created_at) VALUES(?,?,?,?,?)').run(requestId,userId,amount,reason,t);
  earn(userId,amount,'岛主赠送：'+reason);auditAdmin('coins.grant',{userId,amount,reason,requestId});
  return {userId,nickname:user.nickname,amount,reason,coins:balance(userId),createdAt:t,alreadyProcessed:false}
 });
}
function findIslanders(q){const term=String(q||'').trim();if(term.length<2||term.length>64)throw error(400,'请输入至少2个字符的昵称或通行证ID');const rows=db.prepare("SELECT u.id,u.nickname,COALESCE((SELECT SUM(amount) FROM ledger WHERE user_id=u.id),0) AS coins,CASE WHEN EXISTS(SELECT 1 FROM memberships WHERE user_id=u.id AND status='verified') THEN 'verified' ELSE 'visitor' END AS status FROM users u WHERE u.id LIKE ? OR u.nickname LIKE ? ORDER BY u.created_at DESC LIMIT 30").all('%'+term+'%','%'+term+'%');return {items:rows}}
function resetIslanderKey(b){const id=String(b.userId||''),confirmed=b.confirmed===true,note=String(b.note||'').trim();if(!/^BZI-[A-Za-z0-9_-]{8,100}$/.test(id)||!confirmed||note.length<6||note.length>200)throw error(400,'请确认身份核验，并填写6至200字找回说明');return tx(()=>{const u=db.prepare('SELECT id,nickname FROM users WHERE id=?').get(id);if(!u)throw error(404,'账户不存在');const recoveryKey=rand(32);db.prepare('UPDATE users SET secret_hash=? WHERE id=?').run(sha(recoveryKey),id);db.prepare('DELETE FROM sessions WHERE user_id=?').run(id);auditAdmin('account.recovery.reset',{userId:id,reason:note});return {userId:id,nickname:u.nickname,recoveryKey,warning:'仅本次显示新密钥，旧密钥及所有旧会话立即失效。请通过核验过的渠道交付本人。'}})}
function coinGrantHistory(){return db.prepare('SELECT g.user_id AS userId,u.nickname,g.amount,g.reason,g.created_at AS createdAt FROM admin_coin_grants g JOIN users u ON u.id=g.user_id ORDER BY g.created_at DESC LIMIT 100').all()}
function session(id){const token=rand(36);db.prepare('INSERT INTO sessions(token_hash,user_id,expires) VALUES(?,?,?)').run(sha(token),id,Date.now()+43200000);return token}
function state(id){const u=db.prepare('SELECT id,nickname,created_at FROM users WHERE id=?').get(id);return {...u,status:membership.get(id).status==='verified'?'islander':'visitor',membership:membership.get(id),coins:balance(id),ledger:db.prepare('SELECT amount,reason,created_at FROM ledger WHERE user_id=? ORDER BY id DESC LIMIT 100').all(id),tasks:db.prepare('SELECT task_id FROM tasks WHERE user_id=?').all(id).map(x=>x.task_id).filter(x=>!x.startsWith('letter:')||x==='letter:'+day()),bonuses:db.prepare('SELECT threshold FROM bonuses WHERE user_id=?').all(id).map(x=>x.threshold),checkins:db.prepare('SELECT day FROM checkins WHERE user_id=? ORDER BY day DESC').all(id).map(x=>x.day),draws:db.prepare('SELECT card_id,rarity,created_at FROM draws WHERE user_id=? ORDER BY id DESC').all(id)}}
function getActivity(){const row=db.prepare('SELECT starts_at,ends_at FROM activity_settings WHERE id=1').get();const settings={startsAt:row?.starts_at??null,endsAt:row?.ends_at??null};const at=Date.now();return {...settings,timezone:'Asia/Shanghai',phase:activityPhase(settings,at),serverTime:new Date(at).toISOString()}}
function requireActiveActivity(){const phase=getActivity().phase;if(phase!=='active')throw error(403,phase==='upcoming'?'活动尚未开始，暂不能登记、兑奖、签到或抽卡':'活动已结束，已有账户和收藏仍可查看')}
function saveActivity(payload){let settings;try{settings=validateActivity(payload)}catch(e){throw error(400,e.message)}return tx(()=>{db.prepare('INSERT INTO activity_settings(id,starts_at,ends_at,updated_at) VALUES(1,?,?,?) ON CONFLICT(id) DO UPDATE SET starts_at=excluded.starts_at,ends_at=excluded.ends_at,updated_at=excluded.updated_at').run(settings.startsAt,settings.endsAt,now());auditAdmin('activity.update',settings);return getActivity()})}
function passwordHash(value){const salt=randomBytes(16).toString('hex');return salt+':'+scryptSync(value,salt,64).toString('hex')}
function passwordValid(value,stored){if(!stored||typeof value!=='string')return false;const [salt,hash]=stored.split(':');if(!salt||!hash||!/^[a-f0-9]{128}$/.test(hash))return false;return timingSafeEqual(scryptSync(value,salt,64),Buffer.from(hash,'hex'))}
function checkPassword(value){if(typeof value!=='string'||value.length<10||value.length>128)throw error(400,'密码需为10至128个字符')}
function updatePassword(id,b){checkPassword(b.password);const user=db.prepare('SELECT password_hash FROM users WHERE id=?').get(id);if(user.password_hash&&!passwordValid(b.currentPassword,user.password_hash))throw error(403,'原密码错误');db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(passwordHash(b.password),id);db.prepare('DELETE FROM sessions WHERE user_id=?').run(id);return {ok:true,message:'密码已设置，请使用新密码重新登录'}}
function register(b){requireActiveActivity();const nickname=String(b.nickname||'').trim();checkPassword(b.password);if(!nickname||[...nickname].length>20)throw error(400,'昵称须为 1-20 字');return tx(()=>{const id='BZI-'+rand(12),recoveryKey=rand(32);db.prepare('INSERT INTO users(id,nickname,secret_hash,created_at,password_hash) VALUES(?,?,?,?,?)').run(id,nickname,sha(recoveryKey),now(),passwordHash(b.password));db.prepare('INSERT INTO tasks VALUES(?,?,?)').run(id,'report',now());earn(id,50,'首次登岛通行证奖励');return {id,recoveryKey,token:session(id),profile:state(id)}})}
function login(b){const id=String(b.id||''),key=String(b.recoveryKey||''),password=String(b.password||'');const u=db.prepare('SELECT secret_hash,password_hash FROM users WHERE id=?').get(id);if(!u||!(passwordValid(password,u.password_hash)||(key&&eq(sha(key),u.secret_hash))))throw error(401,'编号、密码或原恢复密钥不正确');return {token:session(id),profile:state(id),needsPassword:!u.password_hash}}
db.exec("CREATE TABLE IF NOT EXISTS task_writings (user_id TEXT NOT NULL REFERENCES users(id),task_key TEXT NOT NULL,body TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(user_id,task_key))");
function submitWriting(id,b){membership.requireVerified(id);requireActiveActivity();const task=String(b.taskId||'');if(task!=='letter'&&task!=='memory')throw error(400,'任务类型不支持直接填写');const body=String(b.content||'').trim(),length=Array.from(body.replace(/\s/g,'')).length;if(length<15||length>2000)throw error(400,'请填写至少15个字，最多2000字');return tx(()=>{const key=task==='letter'?'letter:'+day():task;if(db.prepare('SELECT 1 FROM tasks WHERE user_id=? AND task_id=?').get(id,key))throw error(409,task==='letter'?'今日生日来信已领取金币，明天再来吧':'岛屿回忆已经领取过金币');const stamp=now();db.prepare('INSERT INTO task_writings(user_id,task_key,body,created_at) VALUES(?,?,?,?)').run(id,key,body,stamp);db.prepare('INSERT INTO tasks VALUES(?,?,?)').run(id,key,stamp);earn(id,25,'文字任务 '+task);const n=db.prepare("SELECT COUNT(DISTINCT CASE WHEN task_id='letter' OR task_id LIKE 'letter:%' THEN 'letter' ELSE task_id END) AS n FROM tasks WHERE user_id=? AND task_id<>'report'").get(id).n;for(const threshold of [3,6,9])if(n>=threshold&&!db.prepare('SELECT 1 FROM bonuses WHERE user_id=? AND threshold=?').get(id,threshold)){db.prepare('INSERT INTO bonuses VALUES(?,?)').run(id,threshold);earn(id,25,'阶段奖励 '+threshold)}return state(id)})}
function redeem(id,b){membership.requireVerified(id);requireActiveActivity();const task=String(b.taskId||''),code=String(b.code||'').trim();if(!TASKS.has(task))throw error(400,'任务不存在');if(task==='letter'||task==='memory')throw error(400,'此任务已改为直接填写文字领取金币');return tx(()=>{const row=db.prepare('SELECT task_id,redeemed_by FROM codes WHERE hash=?').get(sha(code));if(!row||row.task_id!==task||row.redeemed_by)throw error(400,'完成代码无效或已兑换');const taskKey=task==='letter'?'letter:'+day():task;if(db.prepare('SELECT 1 FROM tasks WHERE user_id=? AND task_id=?').get(id,taskKey))throw error(409,task==='letter'?'今日生日来信奖励已领取，明天北京时间00:00后可再次领取':'该任务已完成');db.prepare('UPDATE codes SET redeemed_by=?,redeemed_at=? WHERE hash=?').run(id,now(),sha(code));db.prepare('INSERT INTO tasks VALUES(?,?,?)').run(id,taskKey,now());earn(id,25,'任务 '+taskKey);const n=db.prepare("SELECT COUNT(DISTINCT CASE WHEN task_id='letter' OR task_id LIKE 'letter:%' THEN 'letter' ELSE task_id END) AS n FROM tasks WHERE user_id=? AND task_id<>'report'").get(id).n;for(const threshold of [3,6,9])if(n>=threshold&&!db.prepare('SELECT 1 FROM bonuses WHERE user_id=? AND threshold=?').get(id,threshold)){db.prepare('INSERT INTO bonuses VALUES(?,?)').run(id,threshold);earn(id,25,'阶段奖励 '+threshold)}return state(id)})}
function checkin(id){membership.requireVerified(id);requireActiveActivity();return tx(()=>{const today=day();if(db.prepare('SELECT 1 FROM checkins WHERE user_id=? AND day=?').get(id,today))throw error(409,'今日已签到');db.prepare('INSERT INTO checkins VALUES(?,?)').run(id,today);earn(id,10,'签到 '+today);return state(id)})}
function draw(id){membership.requireVerified(id);requireActiveActivity();return tx(()=>{if(balance(id)<50)throw error(409,'金币不足');const first=db.prepare('SELECT COUNT(*) AS n FROM draws WHERE user_id=?').get(id).n===0;const pool=first?CARDS.filter(c=>!c.unreleased&&(c.rarity==='SSR'||c.rarity==='SR')):CARDS.filter(c=>!c.unreleased);const card=pool[randomInt(pool.length)];earn(id,-50,'抽卡 '+card.id);db.prepare('INSERT INTO draws(user_id,card_id,rarity,created_at) VALUES(?,?,?,?)').run(id,card.id,card.rarity,now());return {card,profile:state(id)}})}
function codes(b){const task=String(b.taskId||''),count=Number(b.count||1);if(!TASKS.has(task)||!Number.isInteger(count)||count<1||count>100)throw error(400,'任务或数量无效');return tx(()=>{const out=[];for(let i=0;i<count;i++){const c='ISL-'+rand(18);db.prepare('INSERT INTO codes(hash,task_id) VALUES(?,?)').run(sha(c),task);out.push(c)}return {taskId:task,codes:out}})}
const VISUAL_KEYS={collectionGrid:false,collectionFan:true,collectionRing:false,ocSlider:true,ocStagger:false,ocDepth:false,effectWater:true,effectStars:true,effectIsland:true,effectProgress:true,effectGuide:true,effectDraw:true,effectCheckin:true};
function getVisualSettings(){const rows=db.prepare('SELECT key,enabled FROM visual_settings').all();const result={...VISUAL_KEYS};for(const row of rows)if(Object.hasOwn(result,row.key))result[row.key]=!!row.enabled;return result}
function saveVisualSettings(payload){if(!payload||typeof payload!=='object'||Array.isArray(payload)||Object.keys(payload).length!==Object.keys(VISUAL_KEYS).length||Object.keys(payload).some(key=>!Object.hasOwn(VISUAL_KEYS,key)||typeof payload[key]!=='boolean'))throw error(400,'视效配置格式无效');if(!['collectionGrid','collectionFan','collectionRing'].some(k=>payload[k])||!['ocSlider','ocStagger','ocDepth'].some(k=>payload[k]))throw error(400,'每个画廊必须至少保留一种展示方式');return tx(()=>{const stmt=db.prepare('INSERT INTO visual_settings(key,enabled,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET enabled=excluded.enabled,updated_at=excluded.updated_at');for(const [k,v] of Object.entries(payload))stmt.run(k,v?1:0,now());auditAdmin('visual.update',{settings:payload});return getVisualSettings()})}
function auditAdmin(action,details){db.prepare('INSERT INTO admin_audit(action,details,created_at) VALUES(?,?,?)').run(action,JSON.stringify(details),now())}
const operations=createOperations(db,DB_PATH,auditAdmin);
const membership=createMembership(db,auditAdmin,tx);
const residentCenter=createResidentCenter(db,membership);
const accountRecovery=createAccountRecovery(db,auditAdmin,tx);
const messageBoard=createMessageBoard(db,auditAdmin,tx);
const maintenance=createMaintenance(db,operations,auditAdmin,tx);
function adminAudit(){return db.prepare('SELECT id,action,details,created_at FROM admin_audit ORDER BY id DESC LIMIT 100').all().map(row=>({...row,details:JSON.parse(row.details)}))}
function codeStats(){return db.prepare('SELECT task_id,COUNT(*) total,SUM(CASE WHEN redeemed_by IS NULL THEN 1 ELSE 0 END) unused,SUM(CASE WHEN redeemed_by IS NOT NULL THEN 1 ELSE 0 END) redeemed FROM codes GROUP BY task_id ORDER BY task_id').all()}
function userDetail(id){if(!/^BZI-[A-Za-z0-9_-]{8,100}$/.test(id))throw error(400,'参与者编号无效');const user=db.prepare('SELECT id,nickname,created_at FROM users WHERE id=?').get(id);if(!user)throw error(404,'岛民不存在');return {user,ledger:db.prepare('SELECT amount,reason,created_at FROM ledger WHERE user_id=? ORDER BY id DESC LIMIT 200').all(id),tasks:db.prepare('SELECT task_id,redeemed_at FROM tasks WHERE user_id=? ORDER BY redeemed_at DESC').all(id),checkins:db.prepare('SELECT day FROM checkins WHERE user_id=? ORDER BY day DESC LIMIT 90').all(id),draws:db.prepare('SELECT card_id,rarity,created_at FROM draws WHERE user_id=? ORDER BY id DESC LIMIT 100').all(id)}}
function overview(){return {users:db.prepare('SELECT COUNT(*) AS n FROM users').get().n,redeemed:db.prepare("SELECT COUNT(*) AS n FROM tasks WHERE task_id<>'report'").get().n,draws:db.prepare('SELECT COUNT(*) AS n FROM draws').get().n,codesUnused:db.prepare('SELECT COUNT(*) AS n FROM codes WHERE redeemed_by IS NULL').get().n,announcementsPublished:db.prepare('SELECT COUNT(*) AS n FROM announcements WHERE published=1').get().n}}
function listUsers(){return db.prepare("SELECT u.id,u.nickname,u.created_at,CASE WHEN EXISTS(SELECT 1 FROM memberships m WHERE m.user_id=u.id AND m.status='verified') THEN 'islander' ELSE 'visitor' END AS status,COALESCE((SELECT SUM(amount) FROM ledger l WHERE l.user_id=u.id),0) coins,(SELECT COUNT(*) FROM tasks t WHERE t.user_id=u.id) tasks,(SELECT COUNT(*) FROM draws d WHERE d.user_id=u.id) draws FROM users u ORDER BY u.created_at DESC LIMIT 100").all()}
// Existing accounts have no verified-islander field: never delete all 'visitor' profiles.
function cleanupCandidates(){
 const cutoff=new Date(Date.now()-24*3600000).toISOString();
 return db.prepare(`SELECT u.id,u.nickname,u.created_at FROM users u
 WHERE u.created_at < ?
 AND (u.nickname LIKE '远程测试%' OR u.nickname LIKE '新版页面测试%' OR u.nickname LIKE '自动化测试%' OR u.nickname LIKE '测试岛民%')
 AND NOT EXISTS(SELECT 1 FROM memberships m WHERE m.user_id=u.id)
 AND NOT EXISTS(SELECT 1 FROM checkins c WHERE c.user_id=u.id)
 AND NOT EXISTS(SELECT 1 FROM draws d WHERE d.user_id=u.id)
 AND NOT EXISTS(SELECT 1 FROM bonuses b WHERE b.user_id=u.id)
 AND NOT EXISTS(SELECT 1 FROM codes c WHERE c.redeemed_by=u.id)
 AND NOT EXISTS(SELECT 1 FROM tasks t WHERE t.user_id=u.id AND t.task_id<>'report')
 AND NOT EXISTS(SELECT 1 FROM ledger l WHERE l.user_id=u.id AND (l.amount<>50 OR l.reason<>'首次登岛通行证奖励'))
 ORDER BY u.created_at LIMIT 500`).all(cutoff)
}
function cleanupPreview(){
 const rows=cleanupCandidates();
 return {count:rows.length,ids:rows.map(r=>r.id),sample:rows.slice(0,20).map(r=>({nickname:r.nickname,created_at:r.created_at})),scope:'仅清理24小时前创建、符合测试昵称、没有任何正式参与行为的账户'};
}
function cleanupTestAccounts(b){
 const preview=cleanupPreview();
 if(b.confirm!=='确认清理测试账户'||!Array.isArray(b.ids)||JSON.stringify(b.ids)!==JSON.stringify(preview.ids))throw error(409,'候选账户发生变化，请重新预览确认');
 if(!preview.count)return {deleted:0};
 const folder=resolve(dirname(DB_PATH),'backups');mkdirSync(folder,{recursive:true});
 const file=resolve(folder,'before-test-cleanup-'+Date.now()+'-'+randomBytes(5).toString('hex')+'.sqlite');
 db.exec("VACUUM INTO '"+file.replaceAll("'","''")+"'");
 return tx(()=>{const delSessions=db.prepare('DELETE FROM sessions WHERE user_id=?'),delLedger=db.prepare('DELETE FROM ledger WHERE user_id=?'),delTasks=db.prepare('DELETE FROM tasks WHERE user_id=?'),delUsers=db.prepare('DELETE FROM users WHERE id=?');
 for(const id of preview.ids){delSessions.run(id);delLedger.run(id);delTasks.run(id);delUsers.run(id)}
 auditAdmin('users.test_cleanup',{deleted:preview.count,backup:file.split('/').pop()});
 return {deleted:preview.count,backupCreated:true}
 });
}
function announcements(adminView=false){return db.prepare('SELECT id,title,body,published,created_at,updated_at FROM announcements '+(adminView?'':'WHERE published=1 ')+'ORDER BY id DESC LIMIT 100').all()}
function saveAnnouncement(b){const title=String(b.title||'').trim(),body=String(b.body||'').trim(),published=b.published===true?1:0,id=b.id==null?null:Number(b.id);if(!title||title.length>80||!body||body.length>1500)throw error(400,'公告标题须为 1–80 字，正文须为 1–1500 字');if(id!==null&&(!Number.isSafeInteger(id)||id<1))throw error(400,'公告编号无效');return tx(()=>{const t=now();if(id===null)db.prepare('INSERT INTO announcements(title,body,published,created_at,updated_at) VALUES(?,?,?,?,?)').run(title,body,published,t,t);else{const result=db.prepare('UPDATE announcements SET title=?,body=?,published=?,updated_at=? WHERE id=?').run(title,body,published,t,id);if(!result.changes)throw error(404,'公告不存在')}return announcements(true)})}
function deleteAnnouncement(b){const id=Number(b.id);if(!Number.isSafeInteger(id)||id<1)throw error(400,'公告编号无效');const result=db.prepare('DELETE FROM announcements WHERE id=?').run(id);if(!result.changes)throw error(404,'公告不存在');return {deleted:id}}
const ASSET_NAMES=new Set(['characters/zhizhi.webp','characters/caicai.webp','decor/home-background.webp','decor/home-poster.webp','decor/island-map.webp','decor/office-background.webp','decor/checkin-background.webp','decor/post-office-background.webp','decor/collection-background.webp','decor/mailbox-background.webp',...CARDS.map(card=>'cards/'+card.id+'.webp')]);
function allAssetNames(){return [...ASSET_NAMES,...listOc().map(p=>'oc/'+p.id+'.webp')]}
function assetPath(name){if(!ASSET_NAMES.has(name)&&!(/^oc\/oc-[A-Za-z0-9_-]{8,30}\.webp$/.test(name)&&db.prepare('SELECT id FROM oc_profiles WHERE id=?').get(name.slice(3,-5))))throw error(400,'素材位置无效');return resolve(ASSET_DIR,name)}
function versionFolder(name){return resolve(ASSET_DIR,'history',name)}
function assetVersions(name){assetPath(name);const folder=versionFolder(name);if(!existsSync(folder))return [];return readdirSync(folder).filter(f=>/^[0-9TZ.-]+-[a-f0-9]{12}\.webp$/.test(f)).sort().reverse().slice(0,20).map(f=>({version:f,size:statSync(resolve(folder,f)).size}))}
const ASSET_LAYOUT_DEFAULT={scale:100,x:50,y:50,opacity:100,fit:'contain',layer:0};
function getAssetLayouts(){const out={};for(const row of db.prepare('SELECT name,settings FROM asset_layouts').all()){if(allAssetNames().includes(row.name)){try{out[row.name]=JSON.parse(row.settings)}catch{}}}return out}
function saveAssetLayout(b){const name=String(b.name||'');assetPath(name);const settings=b.settings;if(!settings||typeof settings!=='object'||Array.isArray(settings)||Object.keys(settings).length!==6)throw error(400,'布局参数不完整');const fields=['scale','x','y','opacity','fit','layer'];if(fields.some(k=>!Object.hasOwn(settings,k)))throw error(400,'布局参数不完整');for(const [k,min,max] of [['scale',30,250],['x',0,100],['y',0,100],['opacity',0,100],['layer',-5,5]])if(typeof settings[k]!=='number'||!Number.isFinite(settings[k])||settings[k]<min||settings[k]>max)throw error(400,'布局数值超出范围');if(!['contain','cover'].includes(settings.fit))throw error(400,'裁切方式不受支持');db.prepare('INSERT INTO asset_layouts(name,settings,updated_at) VALUES(?,?,?) ON CONFLICT(name) DO UPDATE SET settings=excluded.settings,updated_at=excluded.updated_at').run(name,JSON.stringify(settings),now());auditAdmin('asset.layout',{name,settings});return {name,settings}}
function assetStatus(){return allAssetNames().map(name=>({name,help:assetHelp(name),uploaded:existsSync(assetPath(name)),url:'/assets/'+name,versions:assetVersions(name).length}))}
function backupAsset(name){const filepath=assetPath(name);if(!existsSync(filepath))return null;const folder=versionFolder(name);mkdirSync(folder,{recursive:true});const version=now().replace(/[:]/g,'-')+'-'+randomBytes(6).toString('hex')+'.webp';copyFileSync(filepath,resolve(folder,version));return version}
function saveAsset(b){const name=String(b.name||'');const filepath=assetPath(name),raw=String(b.base64||'');if(!/^[A-Za-z0-9+/]+={0,2}$/.test(raw)||raw.length>5600000)throw error(400,'图片内容无效或超过 4 MB');const bytes=Buffer.from(raw,'base64');if(bytes.length<24||bytes.length>4*1024*1024||bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WEBP'||!['VP8 ','VP8L','VP8X'].includes(bytes.toString('ascii',12,16)))throw error(400,'仅允许有效的 WebP 图片（最大 4 MB）');mkdirSync(dirname(filepath),{recursive:true});const temp=filepath+'.'+rand(8)+'.tmp';try{writeFileSync(temp,bytes,{flag:'wx',mode:0o600});const previous=backupAsset(name);renameSync(temp,filepath);auditAdmin('asset.upload',{name,size:bytes.length,previous})}finally{if(existsSync(temp))unlinkSync(temp)}return {name,size:bytes.length,url:'/assets/'+name}}
function restoreAsset(b){const name=String(b.name||''),version=String(b.version||'');const filepath=assetPath(name);if(!/^[0-9TZ.-]+-[a-f0-9]{12}\.webp$/.test(version))throw error(400,'版本编号无效');const source=resolve(versionFolder(name),version);if(!existsSync(source))throw error(404,'历史版本不存在');mkdirSync(dirname(filepath),{recursive:true});const previous=backupAsset(name);const temp=filepath+'.'+rand(8)+'.tmp';try{copyFileSync(source,temp);renameSync(temp,filepath)}finally{if(existsSync(temp))unlinkSync(temp)}auditAdmin('asset.restore',{name,version,previous});return {name,url:'/assets/'+name,restored:version}}

function readBody(req,maxSize=8192){return new Promise((ok,no)=>{let chunks='',size=0;req.on('data',d=>{size+=d.length;if(size>maxSize){no(error(413,'请求过大'));req.destroy();return}chunks+=d});req.on('end',()=>{try{ok(chunks?JSON.parse(chunks):{})}catch{no(error(400,'JSON 无效'))}});req.on('error',no)})}
function send(res,code,data){res.writeHead(code,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(data))}
http.createServer(async(req,res)=>{try{res.setHeader('x-buzhi-revision',BUILD_REVISION);const path=new URL(req.url||'/', 'http://localhost').pathname;
if(path==='/api/admin/site-maintenance'&&req.method==='GET'){admin(req);return send(res,200,maintenanceState())}
if(path==='/api/admin/site-maintenance'&&req.method==='POST'){admin(req);if(!String(req.headers['content-type']||'').startsWith('application/json'))throw error(415,'请使用 JSON');return send(res,200,saveSiteMaintenance(await readBody(req,8192)))}
if(path==='/api/site-maintenance'&&req.method==='GET')return send(res,200,maintenanceState());
if(maintenanceState().enabled&&!path.startsWith('/admin')&&!path.startsWith('/api/admin/')&&path!=='/health'){
 if(path.startsWith('/api/'))throw error(503,'小岛正在维护中，暂时无法操作，请稍后再来');
 if(req.method==='GET'&&(path==='/'||path==='/legacy'||path.endsWith('.html'))){res.writeHead(503,{'content-type':'text/html; charset=utf-8','cache-control':'no-store','retry-after':'300'});return res.end(maintenanceHtml(maintenanceState().message))}
 if(req.method!=='GET'&&req.method!=='HEAD')throw error(503,'小岛正在维护中');
}
if(req.method==='GET'&&path==='/membership-client.js'){const body=readFileSync(new URL('../client/membership.js',import.meta.url),'utf8');res.writeHead(200,{'content-type':'text/javascript; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});return res.end(body)}
const pageNames=new Set(['resident.html','index.html','passport.html','verify.html','office.html','checkin.html','draw.html','collection.html','mailbox.html','guide.html','islanders.html']);
const previewRoot=resolve(new URL('../ui-preview/',import.meta.url).pathname);
const suffix=path==='/'?'index.html':path.startsWith('/ui-preview/')?path.slice('/ui-preview/'.length):path.slice(1);
if(req.method==='GET'&&!path.startsWith('/api/')&&pageNames.has(suffix)&&path!=='/legacy'){
 const html=readFileSync(resolve(previewRoot,suffix),'utf8').replace('<head>','<head><script>window.__BUZHI_PRODUCTION__=true</script>').replace('</head>','<script src="/membership-client.js" defer></script></head>');
 res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});
 return res.end(html);
}
if(req.method==='GET'&&path==='/legacy'){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});return res.end(SITE_HTML)}
if(req.method==='GET'&&!(path.startsWith('/assets/')&&path.endsWith('.webp'))&&/^(?:\/ui-preview\/)?(?:assets\/[a-zA-Z0-9_/-]+\.(?:svg|webp|png|woff2|css|mp4|txt)|[a-zA-Z0-9-]+\.(?:css|js))$/.test(suffix)){
const file=resolve(previewRoot,suffix);
if(!file.startsWith(previewRoot+'/')||!existsSync(file))throw error(404,'预览素材不存在');
const body=readFileSync(file);const ext=extname(file);
const headers={'content-type':{'.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2','.mp4':'video/mp4','.txt':'text/plain; charset=utf-8'}[ext]||'application/octet-stream','cache-control':'public,max-age=120','x-content-type-options':'nosniff'};
if(ext==='.mp4'){
 headers['accept-ranges']='bytes';
 if(req.headers.range){
  const range=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
  const start=range?.[1]?Number(range[1]):Math.max(0,body.length-Number(range?.[2]));
  const end=range?.[1]&&range[2]?Math.min(Number(range[2]),body.length-1):body.length-1;
  if(!range||(!range[1]&&!range[2])||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>=body.length||end<start){res.writeHead(416,{...headers,'content-range':'bytes */'+body.length});return res.end();}
  res.writeHead(206,{...headers,'content-range':`bytes ${start}-${end}/${body.length}`,'content-length':end-start+1});return res.end(body.subarray(start,end+1));
 }
}
res.writeHead(200,headers);return res.end(body);
}
if(req.method==='GET'&&/^\/assets\/(characters|cards|decor|oc)\/[a-zA-Z0-9_-]+\.webp$/.test(path)){const name=path.slice('/assets/'.length);try{assetPath(name)}catch{throw error(404,'素材不存在')}const uploaded=assetPath(name);const file=existsSync(uploaded)?uploaded:resolve(new URL('..',import.meta.url).pathname,'.'+path);if(!existsSync(file))throw error(404,'素材尚未上传');const body=readFileSync(file);res.writeHead(200,{'content-type':'image/webp','cache-control':'no-store, max-age=0','x-content-type-options':'nosniff'});return res.end(body)}if(req.method==='GET'&&path.startsWith('/admin/')&&ADMIN_SCRIPTS.has(path.slice(7))){const body=readFileSync(new URL('../admin/'+path.slice(7),import.meta.url),'utf8');res.writeHead(200,{'content-type':'text/javascript; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});return res.end(body)}if((path==='/admin'||(path.startsWith('/admin/')&&ADMIN_PAGES.has(path.slice(7))))&&req.method==='GET'){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});return res.end(ADMIN_HTML)}if((path==='/'||path==='/index.html')&&req.method==='GET'){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});return res.end(SITE_HTML)}if(path==='/health'&&req.method==='GET')return send(res,200,{ok:true});if(!path.startsWith('/api/'))throw error(404,'未找到');if(path.startsWith('/api/admin/'))admin(req);if(req.method==='POST'&&!String(req.headers['content-type']||'').startsWith('application/json'))throw error(415,'请使用 JSON');const b=req.method==='POST'?await readBody(req,path==='/api/admin/assets/upload'?5600000:path==='/api/resident/work'?24000:8192):{};let data;
if(path==='/api/register'&&req.method==='POST')data=register(b);
else if(path==='/api/login'&&req.method==='POST')data=login(b);
else if(path==='/api/recovery/request'&&req.method==='POST')data=accountRecovery.request(b,req.socket.remoteAddress);
else if(path==='/api/recovery/reset'&&req.method==='POST')data=accountRecovery.reset(b);
else if(path==='/api/admin/recovery/requests'&&req.method==='GET'){admin(req);data=accountRecovery.list()}
else if(path==='/api/admin/recovery/review'&&req.method==='POST'){admin(req);data=accountRecovery.review(b)}
else if(path==='/api/me'&&req.method==='GET')data=state(auth(req));
else if(path==='/api/password'&&req.method==='POST')data=updatePassword(auth(req),b);
else if(path==='/api/admin/residents'&&req.method==='GET'){admin(req);data=residentCenter.adminList()}
else if(path==='/api/admin/residents/review'&&req.method==='POST'){admin(req);data=residentCenter.adminReview(b)}
else if(path==='/api/resident'&&req.method==='GET')data=residentCenter.read(auth(req));
else if(path==='/api/resident/profile'&&req.method==='POST')data=residentCenter.save(auth(req),b);
else if(path==='/api/resident/work'&&req.method==='POST')data=residentCenter.work(auth(req),b);
else if(path==='/api/membership'&&req.method==='GET')data=membership.get(auth(req));
else if(path==='/api/membership/apply'&&req.method==='POST')data=membership.apply(auth(req),b);
else if(path==='/api/admin/memberships'&&req.method==='GET'){admin(req);data=membership.list(new URL(req.url,'http://localhost').searchParams)}
else if(path==='/api/admin/memberships/review'&&req.method==='POST'){admin(req);data=membership.review(b)}
else if(path==='/api/admin/visitors'&&req.method==='GET'){admin(req);data=listVisitors(db,new URL(req.url,'http://localhost').searchParams)}
else if(path==='/api/admin/visitors/preview-delete'&&req.method==='POST'){admin(req);data=maintenance.previewGuests(b)}
else if(path==='/api/admin/visitors/delete'&&req.method==='POST'){admin(req);data=maintenance.deleteGuests(b)}
else if(path==='/api/admin/audit/preview-clear'&&req.method==='POST'){admin(req);data=maintenance.previewAudit(b)}
else if(path==='/api/admin/audit/clear'&&req.method==='POST'){admin(req);data=maintenance.clearAudit(b)}
else if(path==='/api/task-writing'&&req.method==='POST')data=submitWriting(auth(req),b);
else if(path==='/api/redeem'&&req.method==='POST')data=redeem(auth(req),b);
else if(path==='/api/checkin'&&req.method==='POST')data=checkin(auth(req));
else if(path==='/api/draw'&&req.method==='POST')data=draw(auth(req));
else if(path==='/api/messages'&&req.method==='GET')data={items:messageBoard.publicRows(),accepting:getActivity().phase==='active'};
else if(path==='/api/messages'&&req.method==='POST'){requireActiveActivity();data=messageBoard.submit(auth(req),b)}
else if(path==='/api/admin/messages'&&req.method==='GET'){admin(req);data=messageBoard.adminRows()}
else if(path==='/api/admin/messages/reply'&&req.method==='POST'){admin(req);data=messageBoard.reply(b)}
else if(path==='/api/admin/messages/moderate'&&req.method==='POST'){admin(req);data=messageBoard.moderate(b)}
else if(path==='/api/announcements'&&req.method==='GET')data=announcements(false);
else if(path==='/api/assets-manifest'&&req.method==='GET')data={assets:Object.fromEntries(allAssetNames().map(name=>[name,existsSync(assetPath(name))])),versions:Object.fromEntries(allAssetNames().map(name=>[name,existsSync(assetPath(name))?Math.trunc(statSync(assetPath(name)).mtimeMs):0])),layouts:getAssetLayouts()};
else if(path==='/api/activity'&&req.method==='GET')data=getActivity();
else if(path==='/api/admin/activity'&&req.method==='GET'){admin(req);data=getActivity()}
else if(path==='/api/admin/activity'&&req.method==='POST'){admin(req);data=saveActivity(b)}
else if(path==='/api/catalog'&&req.method==='GET')data={cards:getCards().filter(c=>!c.unreleased),totalSlots:50,visibleCards:32,cost:50,firstDrawRarities:['SSR','SR'],timezone:'Asia/Shanghai',nicknameMaxLength:20};
else if(path==='/api/oc'&&req.method==='GET')data=listOc(true);
else if(path==='/api/admin/oc'&&req.method==='GET'){admin(req);data=listOc()}
else if(path==='/api/admin/oc'&&req.method==='POST'){admin(req);data=saveOc(b)}
else if(path==='/api/admin/cards'&&req.method==='GET'){admin(req);data=getCards()}
else if(path==='/api/admin/cards'&&req.method==='POST'){admin(req);data=saveCard(b)}
else if(path==='/api/visual-settings'&&req.method==='GET')data=getVisualSettings();
else if(path==='/api/admin/announcements'&&req.method==='GET'){admin(req);data=announcements(true)}
else if(path==='/api/admin/announcements'&&req.method==='POST'){admin(req);data=saveAnnouncement(b);auditAdmin('announcement.save',{id:b.id??null,published:b.published===true})}
else if(path==='/api/admin/announcements/delete'&&req.method==='POST'){admin(req);data=deleteAnnouncement(b);auditAdmin('announcement.delete',{id:data.deleted})}
else if(path==='/api/admin/users'&&req.method==='GET'){admin(req);data=listUsers()}
else if(path==='/api/admin/test-cleanup'&&req.method==='GET'){admin(req);data=cleanupPreview()}
else if(path==='/api/admin/test-cleanup'&&req.method==='POST'){admin(req);data=cleanupTestAccounts(b)}
else if(path==='/api/admin/codes'&&req.method==='POST'){admin(req);data=codes(b);auditAdmin('codes.generate',{taskId:data.taskId,count:data.codes.length})}
else if(path==='/api/admin/overview'&&req.method==='GET'){admin(req);data=overview()}
else if(path==='/api/admin/assets'&&req.method==='GET'){admin(req);data=assetStatus()}
else if(path==='/api/admin/assets/layout'&&req.method==='POST'){admin(req);data=saveAssetLayout(b)}
else if(path==='/api/admin/assets/upload'&&req.method==='POST'){admin(req);data=saveAsset(b)}
else if(path==='/api/admin/assets/versions'&&req.method==='GET'){admin(req);data=assetVersions(String(new URL(req.url,'http://localhost').searchParams.get('name')||''))}
else if(path==='/api/admin/assets/restore'&&req.method==='POST'){admin(req);data=restoreAsset(b)}
else if(path==='/api/admin/visual-settings'&&req.method==='GET'){admin(req);data=getVisualSettings()}
else if(path==='/api/admin/visual-settings'&&req.method==='POST'){admin(req);data=saveVisualSettings(b)}
else if(path==='/api/admin/islanders/find'&&req.method==='GET'){admin(req);data=findIslanders(new URL(req.url,'http://localhost').searchParams.get('q'))}
else if(path==='/api/admin/islanders/reset-key'&&req.method==='POST'){admin(req);data=resetIslanderKey(b)}
else if(path==='/api/admin/coins/preview'&&req.method==='GET'){admin(req);const id=String(new URL(req.url,'http://localhost').searchParams.get('id')||'');if(!/^BZI-[A-Za-z0-9_-]{8,100}$/.test(id))throw error(400,'岛民ID格式不正确');const u=db.prepare('SELECT id,nickname FROM users WHERE id=?').get(id);if(!u)throw error(404,'岛民不存在');data={...u,coins:balance(id)}}
else if(path==='/api/admin/coins/grant'&&req.method==='POST'){admin(req);data=grantCoins(b)}
else if(path==='/api/admin/coins/history'&&req.method==='GET'){admin(req);data=coinGrantHistory()}
else if(path==='/api/admin/user'&&req.method==='GET'){admin(req);data=userDetail(String(new URL(req.url,'http://localhost').searchParams.get('id')||''))}
else if(path==='/api/admin/code-stats'&&req.method==='GET'){admin(req);data=codeStats()}
else if(path==='/api/admin/backups'&&req.method==='GET'){admin(req);data=operations.listBackups()}
else if(path==='/api/admin/backups'&&req.method==='POST'){admin(req);data=operations.createBackup()}
else if(path==='/api/admin/backups/download'&&req.method==='GET'){admin(req);const file=operations.backupFile(new URL(req.url,'http://localhost').searchParams.get('name'));return streamBackup(res,file)}
else if(path==='/api/admin/export'&&req.method==='GET'){admin(req);const out=operations.exportOperations();res.writeHead(200,{'content-type':'application/json; charset=utf-8','content-disposition':'attachment; filename="buzhi-operations-'+Date.now()+'.json"','cache-control':'private, no-store','x-content-type-options':'nosniff'});return res.end(JSON.stringify(out))}
else if(path==='/api/admin/audit'&&req.method==='GET'){admin(req);data=adminAudit()}
else throw error(404,'未找到');
send(res,200,data)}catch(e){if(res.headersSent||res.destroyed){if(!res.destroyed)res.destroy();return}send(res,e.status||500,{error:e.status?e.message:'内部错误'})}}).listen(PORT,HOST,()=>console.log('Buzhi server listening on '+HOST+':'+PORT));





