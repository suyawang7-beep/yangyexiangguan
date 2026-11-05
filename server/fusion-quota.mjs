// Daily grants are append-only; quota and grant writes share the inventory transaction.
export function createFusionQuota({db,tx,now=()=>new Date().toISOString(),error,audit}){
 db.exec('CREATE TABLE IF NOT EXISTS fusion_quota_grants(request_id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),day TEXT NOT NULL,amount INTEGER NOT NULL CHECK(amount BETWEEN 1 AND 100),reason TEXT NOT NULL,actor TEXT NOT NULL,created_at TEXT NOT NULL)');
 db.exec('CREATE INDEX IF NOT EXISTS fusion_quota_grants_user_day ON fusion_quota_grants(user_id,day)');
 function period(){const ms=Date.parse(now()),day=new Date(ms+28800000).toISOString().slice(0,10);return {day,resetAt:new Date(Date.parse(day+'T00:00:00.000Z')+57600000).toISOString()}}
 function daily(userId){const {day,resetAt}=period();const used=db.prepare("SELECT COUNT(*) AS n FROM card_fusions WHERE user_id=? AND date(created_at,'+8 hours')=?").get(userId,day).n;const extra=db.prepare('SELECT COALESCE(SUM(amount),0) AS n FROM fusion_quota_grants WHERE user_id=? AND day=?').get(userId,day).n;const taskExtra=db.prepare("SELECT COALESCE(SUM(amount),0) AS n FROM fusion_quota_grants WHERE user_id=? AND day=? AND actor='task'").get(userId,day).n;return {base:3,used,extra,taskExtra,adminExtra:extra-taskExtra,total:3+extra,limit:3+extra,remaining:Math.max(0,3+extra-used),resetAt,resetsAt:resetAt,timezone:'Asia/Shanghai'}}
 function history(userId){return {items:db.prepare('SELECT request_id AS requestId,user_id AS userId,day,amount,reason,actor,created_at AS createdAt FROM fusion_quota_grants '+(userId?'WHERE user_id=? ':'')+'ORDER BY created_at DESC,request_id DESC LIMIT 100').all(...(userId?[userId]:[]))}}
 function query(q){const term=String(q||'').trim();if(term.length<2||term.length>100)throw error(400,'请输入至少2个字符的昵称或通行证ID');const escaped=term.replace(/[\\%_]/g,'\\$&');return {items:db.prepare("SELECT id,nickname FROM users WHERE id LIKE ? ESCAPE '\\' OR nickname LIKE ? ESCAPE '\\' ORDER BY created_at DESC LIMIT 30").all('%'+escaped+'%','%'+escaped+'%').map(u=>({...u,...daily(u.id),recentFusions:db.prepare('SELECT source_a AS first,source_b AS second,result_card_id AS result,result_rarity AS rarity,created_at AS at FROM card_fusions WHERE user_id=? ORDER BY id DESC LIMIT 20').all(u.id)}))}}
 // Caller owns the same transaction that marks the inbox reward claimed.
 function claimMail({userId,mailId,amount,reason}){
  if(!Number.isSafeInteger(mailId)||mailId<1||!Number.isSafeInteger(amount)||amount<1||amount>100)throw error(400,'融卡奖励无效');
  const requestId='mail:'+mailId,previous=db.prepare('SELECT user_id,amount FROM fusion_quota_grants WHERE request_id=?').get(requestId);
  if(previous){if(previous.user_id!==userId||previous.amount!==amount)throw error(409,'信箱奖励记录不一致');return daily(userId)}
  const {day}=period(),createdAt=now();db.prepare('INSERT INTO fusion_quota_grants VALUES(?,?,?,?,?,?,?)').run(requestId,userId,day,amount,reason,'admin',createdAt);
  audit('fusion.quota.claim',{actor:'admin',userId,mailId,amount,reason,day,requestId,createdAt});return daily(userId);
 }
 // Completion evidence and claim marking must share this caller-owned transaction.
 function claimTask({userId,rewardKey,amount,reason}){
  if(!db.isTransaction)throw error(409,'任务奖励必须在领取事务中发放');
  if(typeof rewardKey!=='string'||!/^[a-zA-Z0-9:_-]{3,180}$/.test(rewardKey)||!Number.isSafeInteger(amount)||amount<1||amount>100||typeof reason!=='string'||!reason.trim()||reason.length>500)throw error(400,'任务奖励参数无效');
  const requestId='task:'+rewardKey,previous=db.prepare('SELECT user_id,amount,reason FROM fusion_quota_grants WHERE request_id=?').get(requestId);
  if(previous){if(previous.user_id!==userId||previous.amount!==amount||previous.reason!==reason)throw error(409,'任务奖励记录不一致');return daily(userId)}
  const {day}=period(),createdAt=now();db.prepare('INSERT INTO fusion_quota_grants VALUES(?,?,?,?,?,?,?)').run(requestId,userId,day,amount,reason,'task',createdAt);
  audit('fusion.quota.task.claim',{userId,amount,reason,day,requestId,createdAt});return daily(userId);
 }
 return {daily,query,history,claimMail,claimTask};
}
