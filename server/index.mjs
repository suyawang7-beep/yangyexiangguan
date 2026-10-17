import http from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {mkdirSync,readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';

const SITE_HTML=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const ADMIN_HTML=readFileSync(new URL('../admin/index.html',import.meta.url),'utf8');
const PORT=Number(process.env.PORT||4178),HOST=process.env.HOST||'127.0.0.1',DB_PATH=resolve(process.env.DB_PATH||'./data/island.sqlite'),ADMIN=process.env.ADMIN_TOKEN||'';
if(ADMIN.length<32)throw Error('Set a random ADMIN_TOKEN of at least 32 characters');
mkdirSync(dirname(DB_PATH),{recursive:true});
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
'CREATE TABLE IF NOT EXISTS announcements(id INTEGER PRIMARY KEY AUTOINCREMENT,title TEXT NOT NULL,body TEXT NOT NULL,published INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)'
];
for(const statement of schema)db.exec(statement);
const TASKS=new Set(['letter','memory','quiz','creative','support','commission']);
const CARDS=[{id:'UR-1',rarity:'UR'},...Array.from({length:2},(_,i)=>({id:'SSR-'+(i+1),rarity:'SSR'})),...Array.from({length:4},(_,i)=>({id:'SR-'+(i+1),rarity:'SR'})),...Array.from({length:4},(_,i)=>({id:'R-'+(i+1),rarity:'R'})),...Array.from({length:5},(_,i)=>({id:'N-'+(i+1),rarity:'N'}))];
const sha=s=>createHash('sha256').update(String(s)).digest('hex'),rand=n=>randomBytes(n).toString('base64url'),now=()=>new Date().toISOString(),day=()=>now().slice(0,10);
const error=(status,message)=>Object.assign(new Error(message),{status});
const eq=(a,b)=>{const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&timingSafeEqual(x,y)};
function tx(f){db.exec('BEGIN IMMEDIATE');try{const out=f();db.exec('COMMIT');return out}catch(e){db.exec('ROLLBACK');throw e}}
function auth(req){const token=/^Bearer (.+)$/.exec(req.headers.authorization||'')?.[1];if(!token)throw error(401,'请先登录');const s=db.prepare('SELECT user_id FROM sessions WHERE token_hash=? AND expires>?').get(sha(token),Date.now());if(!s)throw error(401,'登录已失效');return s.user_id}
function admin(req){const token=/^Bearer (.+)$/.exec(req.headers.authorization||'')?.[1];if(!token||!eq(token,ADMIN))throw error(403,'无管理权限')}
function balance(id){return db.prepare('SELECT COALESCE(SUM(amount),0) AS n FROM ledger WHERE user_id=?').get(id).n}
function earn(id,amount,reason){db.prepare('INSERT INTO ledger(user_id,amount,reason,created_at) VALUES(?,?,?,?)').run(id,amount,reason,now())}
function session(id){const token=rand(36);db.prepare('INSERT INTO sessions(token_hash,user_id,expires) VALUES(?,?,?)').run(sha(token),id,Date.now()+43200000);return token}
function state(id){const u=db.prepare('SELECT id,nickname,created_at FROM users WHERE id=?').get(id);return {...u,status:'visitor',coins:balance(id),tasks:db.prepare('SELECT task_id FROM tasks WHERE user_id=?').all(id).map(x=>x.task_id),bonuses:db.prepare('SELECT threshold FROM bonuses WHERE user_id=?').all(id).map(x=>x.threshold),checkins:db.prepare('SELECT day FROM checkins WHERE user_id=? ORDER BY day DESC').all(id).map(x=>x.day),draws:db.prepare('SELECT card_id,rarity,created_at FROM draws WHERE user_id=? ORDER BY id DESC').all(id)}}
function register(b){const nickname=String(b.nickname||'').trim();if(!nickname||[...nickname].length>20)throw error(400,'昵称须为 1-20 字');return tx(()=>{const id='BZI-'+rand(12),recoveryKey=rand(32);db.prepare('INSERT INTO users VALUES(?,?,?,?)').run(id,nickname,sha(recoveryKey),now());db.prepare('INSERT INTO tasks VALUES(?,?,?)').run(id,'report',now());return {id,recoveryKey,token:session(id),profile:state(id)}})}
function login(b){const id=String(b.id||''),key=String(b.recoveryKey||'');const u=db.prepare('SELECT secret_hash FROM users WHERE id=?').get(id);if(!u||!eq(sha(key),u.secret_hash))throw error(401,'身份凭证错误');return {token:session(id),profile:state(id)}}
function redeem(id,b){const task=String(b.taskId||''),code=String(b.code||'').trim();if(!TASKS.has(task))throw error(400,'任务不存在');return tx(()=>{const row=db.prepare('SELECT task_id,redeemed_by FROM codes WHERE hash=?').get(sha(code));if(!row||row.task_id!==task||row.redeemed_by)throw error(400,'完成代码无效或已兑换');if(db.prepare('SELECT 1 FROM tasks WHERE user_id=? AND task_id=?').get(id,task))throw error(409,'该任务已完成');db.prepare('UPDATE codes SET redeemed_by=?,redeemed_at=? WHERE hash=?').run(id,now(),sha(code));db.prepare('INSERT INTO tasks VALUES(?,?,?)').run(id,task,now());earn(id,25,'任务 '+task);const n=db.prepare('SELECT COUNT(*) AS n FROM tasks WHERE user_id=?').get(id).n;for(const threshold of [3,6,9])if(n>=threshold&&!db.prepare('SELECT 1 FROM bonuses WHERE user_id=? AND threshold=?').get(id,threshold)){db.prepare('INSERT INTO bonuses VALUES(?,?)').run(id,threshold);earn(id,25,'阶段奖励 '+threshold)}return state(id)})}
function checkin(id){return tx(()=>{const today=day();if(db.prepare('SELECT 1 FROM checkins WHERE user_id=? AND day=?').get(id,today))throw error(409,'今日已签到');db.prepare('INSERT INTO checkins VALUES(?,?)').run(id,today);earn(id,10,'签到 '+today);return state(id)})}
function draw(id){return tx(()=>{if(balance(id)<50)throw error(409,'金币不足');const first=db.prepare('SELECT COUNT(*) AS n FROM draws WHERE user_id=?').get(id).n===0;const pool=first?CARDS.filter(c=>c.rarity==='SSR'||c.rarity==='SR'):CARDS;const idx=randomBytes(4).readUInt32BE(0)%pool.length,card=pool[idx];earn(id,-50,'抽卡 '+card.id);db.prepare('INSERT INTO draws(user_id,card_id,rarity,created_at) VALUES(?,?,?,?)').run(id,card.id,card.rarity,now());return {card,profile:state(id)}})}
function codes(b){const task=String(b.taskId||''),count=Number(b.count||1);if(!TASKS.has(task)||!Number.isInteger(count)||count<1||count>100)throw error(400,'任务或数量无效');return tx(()=>{const out=[];for(let i=0;i<count;i++){const c='ISL-'+rand(18);db.prepare('INSERT INTO codes(hash,task_id) VALUES(?,?)').run(sha(c),task);out.push(c)}return {taskId:task,codes:out}})}
function overview(){return {users:db.prepare('SELECT COUNT(*) AS n FROM users').get().n,redeemed:db.prepare("SELECT COUNT(*) AS n FROM tasks WHERE task_id<>'report'").get().n,draws:db.prepare('SELECT COUNT(*) AS n FROM draws').get().n,codesUnused:db.prepare('SELECT COUNT(*) AS n FROM codes WHERE redeemed_by IS NULL').get().n,announcementsPublished:db.prepare('SELECT COUNT(*) AS n FROM announcements WHERE published=1').get().n}}
function listUsers(){return db.prepare('SELECT u.id,u.nickname,u.created_at,COALESCE((SELECT SUM(amount) FROM ledger l WHERE l.user_id=u.id),0) coins,(SELECT COUNT(*) FROM tasks t WHERE t.user_id=u.id) tasks,(SELECT COUNT(*) FROM draws d WHERE d.user_id=u.id) draws FROM users u ORDER BY u.created_at DESC LIMIT 100').all()}
function announcements(adminView=false){return db.prepare('SELECT id,title,body,published,created_at,updated_at FROM announcements '+(adminView?'':'WHERE published=1 ')+'ORDER BY id DESC LIMIT 100').all()}
function saveAnnouncement(b){const title=String(b.title||'').trim(),body=String(b.body||'').trim(),published=b.published===true?1:0,id=b.id==null?null:Number(b.id);if(!title||title.length>80||!body||body.length>1500)throw error(400,'公告标题须为 1–80 字，正文须为 1–1500 字');if(id!==null&&(!Number.isSafeInteger(id)||id<1))throw error(400,'公告编号无效');return tx(()=>{const t=now();if(id===null)db.prepare('INSERT INTO announcements(title,body,published,created_at,updated_at) VALUES(?,?,?,?,?)').run(title,body,published,t,t);else{const result=db.prepare('UPDATE announcements SET title=?,body=?,published=?,updated_at=? WHERE id=?').run(title,body,published,t,id);if(!result.changes)throw error(404,'公告不存在')}return announcements(true)})}
function deleteAnnouncement(b){const id=Number(b.id);if(!Number.isSafeInteger(id)||id<1)throw error(400,'公告编号无效');const result=db.prepare('DELETE FROM announcements WHERE id=?').run(id);if(!result.changes)throw error(404,'公告不存在');return {deleted:id}}
function readBody(req){return new Promise((ok,no)=>{let chunks='',size=0;req.on('data',d=>{size+=d.length;if(size>8192){no(error(413,'请求过大'));req.destroy();return}chunks+=d});req.on('end',()=>{try{ok(chunks?JSON.parse(chunks):{})}catch{no(error(400,'JSON 无效'))}});req.on('error',no)})}
function send(res,code,data){res.writeHead(code,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(data))}
http.createServer(async(req,res)=>{try{const path=new URL(req.url||'/', 'http://localhost').pathname;if(path==='/admin'&&req.method==='GET'){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});return res.end(ADMIN_HTML)}if((path==='/'||path==='/index.html')&&req.method==='GET'){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});return res.end(SITE_HTML)}if(path==='/health'&&req.method==='GET')return send(res,200,{ok:true});if(!path.startsWith('/api/'))throw error(404,'未找到');if(req.method==='POST'&&!String(req.headers['content-type']||'').startsWith('application/json'))throw error(415,'请使用 JSON');const b=req.method==='POST'?await readBody(req):{};let data;
if(path==='/api/register'&&req.method==='POST')data=register(b);
else if(path==='/api/login'&&req.method==='POST')data=login(b);
else if(path==='/api/me'&&req.method==='GET')data=state(auth(req));
else if(path==='/api/redeem'&&req.method==='POST')data=redeem(auth(req),b);
else if(path==='/api/checkin'&&req.method==='POST')data=checkin(auth(req));
else if(path==='/api/draw'&&req.method==='POST')data=draw(auth(req));
else if(path==='/api/announcements'&&req.method==='GET')data=announcements(false);
else if(path==='/api/admin/announcements'&&req.method==='GET'){admin(req);data=announcements(true)}
else if(path==='/api/admin/announcements'&&req.method==='POST'){admin(req);data=saveAnnouncement(b)}
else if(path==='/api/admin/announcements/delete'&&req.method==='POST'){admin(req);data=deleteAnnouncement(b)}
else if(path==='/api/admin/users'&&req.method==='GET'){admin(req);data=listUsers()}
else if(path==='/api/admin/codes'&&req.method==='POST'){admin(req);data=codes(b)}
else if(path==='/api/admin/overview'&&req.method==='GET'){admin(req);data=overview()}
else throw error(404,'未找到');
send(res,200,data)}catch(e){send(res,e.status||500,{error:e.status?e.message:'内部错误'})}}).listen(PORT,HOST,()=>console.log('Buzhi server listening on '+HOST+':'+PORT));
