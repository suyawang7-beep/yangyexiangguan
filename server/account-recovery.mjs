import {randomBytes,createHash,scryptSync,timingSafeEqual} from 'node:crypto';
const fail=(status,message)=>Object.assign(new Error(message),{status});
const hash=s=>createHash('sha256').update(s).digest('hex');
const now=()=>Date.now();
const attempts=new Map();
export function createAccountRecovery(db,audit,tx){
 db.exec("CREATE TABLE IF NOT EXISTS account_recovery_requests(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),status TEXT NOT NULL CHECK(status IN ('pending','approved','completed','rejected')),token_hash TEXT,expires_at INTEGER,created_at INTEGER NOT NULL,reviewed_at INTEGER,completed_at INTEGER); CREATE INDEX IF NOT EXISTS recovery_pending_user ON account_recovery_requests(user_id,status)");
 function request(body,ip){
  const userId=String(body.userId||'').trim(),douyin=String(body.douyinId||'').trim().normalize('NFKC').toLowerCase();
  if(userId.length>110||douyin.length>64||!/^BZI-[A-Za-z0-9_-]{8,100}$/.test(userId)||!douyin||/[\s\p{C}]/u.test(douyin))throw fail(400,'请填写有效的岛民编号与已认证抖音号');
  const key=String(ip||'unknown').slice(0,100),recent=attempts.get(key)||[];const fresh=recent.filter(t=>now()-t<3600000);
  if(fresh.length>=5)throw fail(429,'申请过于频繁，请一小时后再试');fresh.push(now());attempts.set(key,fresh);
  const row=db.prepare("SELECT m.user_id FROM memberships m WHERE m.user_id=? AND m.normalized_id=? AND m.status='verified'").get(userId,douyin);
  if(row){const pending=db.prepare("SELECT id FROM account_recovery_requests WHERE user_id=? AND status='pending'").get(userId);if(!pending){const id='REC-'+randomBytes(12).toString('hex');db.prepare("INSERT INTO account_recovery_requests(id,user_id,status,created_at) VALUES(?,?,'pending',?)").run(id,userId,now())}}
  return {message:'若编号与认证资料匹配，找回申请已提交。请通过原认证渠道联系岛主核实身份。'};
 }
 function list(){return db.prepare("SELECT r.id,r.user_id AS userId,u.nickname,m.douyin_id AS douyinId,r.status,r.created_at AS createdAt,r.reviewed_at AS reviewedAt,r.expires_at AS expiresAt FROM account_recovery_requests r JOIN users u ON u.id=r.user_id JOIN memberships m ON m.user_id=r.user_id ORDER BY r.created_at DESC LIMIT 100").all()}
 function review(body){const id=String(body.id||''),decision=String(body.decision||''),verified=body.confirmed===true,note=String(body.note||'').trim();
 if(!/^REC-[a-f0-9]{24}$/.test(id)||!['approve','reject'].includes(decision)||!verified||note.length<6||note.length>200)throw fail(400,'请确认已通过独立渠道核实本人，并填写至少6字说明');
 return tx(()=>{const row=db.prepare("SELECT user_id,status FROM account_recovery_requests WHERE id=?").get(id);if(!row)throw fail(404,'申请不存在');if(row.status!=='pending')throw fail(409,'申请已经处理');
 if(decision==='reject'){db.prepare("UPDATE account_recovery_requests SET status='rejected',reviewed_at=? WHERE id=?").run(now(),id);audit('recovery.reject',{requestId:id,userId:row.user_id,note});return {ok:true}}
 const token=randomBytes(24).toString('base64url');db.prepare("UPDATE account_recovery_requests SET status='approved',token_hash=?,expires_at=?,reviewed_at=? WHERE id=?").run(hash(token),now()+30*60000,now(),id);audit('recovery.approve',{requestId:id,userId:row.user_id,note});return {ok:true,requestId:id,token,warning:'重置凭证仅显示一次，30分钟内有效。请通过已核实的私密渠道交付，不要公开发布。'}})}
 function reset(body){const id=String(body.requestId||''),token=String(body.token||''),password=body.password;
 if(typeof password!=='string'||password.length<10||password.length>128||token.length>150)throw fail(400,'凭证或新密码不符合要求');
 return tx(()=>{const row=db.prepare("SELECT user_id,token_hash,expires_at,status FROM account_recovery_requests WHERE id=?").get(id);if(!row||row.status!=='approved'||row.expires_at<now()||!row.token_hash||!timingSafeEqual(Buffer.from(hash(token)),Buffer.from(row.token_hash)))throw fail(403,'重置凭证无效或已过期');
 const salt=randomBytes(16).toString('hex');const passwordHash=salt+':'+scryptSync(password,salt,64).toString('hex');
 db.prepare("UPDATE users SET password_hash=?,secret_hash=? WHERE id=?").run(passwordHash,hash(randomBytes(32).toString('hex')),row.user_id);
 db.prepare('DELETE FROM sessions WHERE user_id=?').run(row.user_id);
 db.prepare("UPDATE account_recovery_requests SET status='completed',token_hash=NULL,completed_at=? WHERE id=?").run(now(),id);
 audit('recovery.complete',{requestId:id,userId:row.user_id});return {ok:true,message:'密码已设置，请返回通行证页面登录'}})}
 return {request,list,review,reset};
}
