import {createHash} from 'node:crypto';
// Durable delivery only. Credits and inventory remain exclusively in the inbox claim transaction.
export function createMailBatches({db,tx,error,now,audit,validate,send}){
 db.exec(`CREATE TABLE IF NOT EXISTS island_mail_batches(id TEXT PRIMARY KEY,gift TEXT NOT NULL,revision TEXT NOT NULL,actor TEXT NOT NULL,created_at TEXT NOT NULL,confirmed_at TEXT);
 CREATE TABLE IF NOT EXISTS island_mail_batch_recipients(batch_id TEXT NOT NULL REFERENCES island_mail_batches(id),user_id TEXT NOT NULL,verified INTEGER NOT NULL CHECK(verified IN (0,1)),status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sent','failed')),mail_id INTEGER UNIQUE REFERENCES island_mail(id) ON DELETE SET NULL,error_code TEXT,PRIMARY KEY(batch_id,user_id));
 CREATE INDEX IF NOT EXISTS idx_mail_batch_pending ON island_mail_batch_recipients(batch_id,status,user_id);
 CREATE TABLE IF NOT EXISTS island_mail_batch_retries(request_id TEXT PRIMARY KEY,batch_id TEXT NOT NULL REFERENCES island_mail_batches(id),created_at TEXT NOT NULL);`);
 const digest=s=>createHash('sha256').update(s).digest('hex');
 function id(value){if(typeof value!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value))throw error(400,'批次或请求编号无效');return value.toLowerCase()}
 function row(value){const r=db.prepare('SELECT * FROM island_mail_batches WHERE id=?').get(id(value));if(!r)throw error(404,'寄送批次不存在');return r}
 function status(value){const r=row(value),gift=JSON.parse(r.gift);const counts=db.prepare(`SELECT count(*) total,COALESCE(sum(status='sent'),0) sent,COALESCE(sum(status='failed'),0) failed,COALESCE(sum(status='pending'),0) pending,COALESCE(sum(verified),0) verified,COALESCE(sum(1-verified),0) unverified FROM island_mail_batch_recipients WHERE batch_id=?`).get(r.id);
  const total=gift.kind==='coins'?BigInt(Math.round(gift.amount*10))*BigInt(counts.total):BigInt(gift.kind==='fusion'?gift.amount:1)*BigInt(counts.total);
  const amount=gift.kind==='coins'?String(total/10n)+(total%10n?'.'+String(total%10n):''):String(total);
  return {id:r.id,revision:r.revision,gift,actor:r.actor,createdAt:r.created_at,confirmedAt:r.confirmed_at,status:!r.confirmed_at?'draft':counts.pending?'active':counts.failed?'partial':'complete',counts,totalReward:amount+' '+(gift.kind==='coins'?'金币':gift.kind==='fusion'?'次融卡机会':'件物品'),scope:'全部已注册账号（含未认证）；不含未注册浏览会话；快照后新注册账号不纳入。未认证账号仍须认证后领取。',failures:db.prepare("SELECT user_id AS userId,error_code AS code FROM island_mail_batch_recipients WHERE batch_id=? AND status='failed' ORDER BY user_id LIMIT 50").all(r.id)}
 }
 function preview(b){const batchId=id(b.requestId),v=validate({...b,userId:'BZI-BatchValidation',requestId:batchId});if(!v.message||v.reason.length<3)throw error(400,'群发必须填写留言和赠送原因');const gift={kind:v.kind,amount:v.kind==='item'?0:v.amount,itemName:v.kind==='item'?v.itemName:'',title:v.title,message:v.message,reason:v.reason},serialized=JSON.stringify(gift);
  return tx(()=>{const old=db.prepare('SELECT gift FROM island_mail_batches WHERE id=?').get(batchId);if(old){if(old.gift!==serialized)throw error(409,'请求编号已用于其他寄送内容');return status(batchId)}
   db.prepare('INSERT INTO island_mail_batches(id,gift,revision,actor,created_at) VALUES(?,?,?,?,?)').run(batchId,serialized,digest(batchId+serialized),'admin',now());
   db.prepare(`INSERT INTO island_mail_batch_recipients(batch_id,user_id,verified) SELECT ?,u.id,EXISTS(SELECT 1 FROM memberships m WHERE m.user_id=u.id AND m.status='verified') FROM users u`).run(batchId);
   const s=status(batchId);audit('mail.batch.preview',{batchId,actor:'admin',count:s.counts.total,verified:s.counts.verified,unverified:s.counts.unverified,kind:gift.kind,amount:gift.amount,reason:gift.reason});return s})
 }
 function confirm(b){if(b.confirmed!==true)throw error(400,'请明确确认群发范围及总量');return tx(()=>{const r=row(b.id);if(b.expectedRevision!==r.revision)throw error(409,'批次预览版本不匹配，请重新核对');if(!r.confirmed_at){if(!status(r.id).counts.total)throw error(409,'没有可寄送的已注册账号');db.prepare('UPDATE island_mail_batches SET confirmed_at=? WHERE id=?').run(now(),r.id);audit('mail.batch.confirm',{batchId:r.id,actor:'admin',revision:r.revision})}return status(r.id)})}
 function process(b){const r=row(b.id);if(!r.confirmed_at)throw error(409,'请先预览并确认群发');const gift=JSON.parse(r.gift);const recipients=db.prepare("SELECT user_id FROM island_mail_batch_recipients WHERE batch_id=? AND status='pending' ORDER BY user_id LIMIT 50").all(r.id);
  for(const recipient of recipients){try{tx(()=>{const current=db.prepare('SELECT status FROM island_mail_batch_recipients WHERE batch_id=? AND user_id=?').get(r.id,recipient.user_id);if(current?.status!=='pending')return;
    const hex=digest('bulk-mail:'+r.id+':'+recipient.user_id).slice(0,32),requestId=[hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-');
    const delivered=send({...gift,userId:recipient.user_id,requestId});
    db.prepare("UPDATE island_mail_batch_recipients SET status='sent',mail_id=?,error_code=NULL WHERE batch_id=? AND user_id=? AND status='pending'").run(delivered.id,r.id,recipient.user_id);
    audit('mail.batch.delivery',{batchId:r.id,userId:recipient.user_id,mailId:delivered.id,actor:'admin'});
   })}catch{tx(()=>{const failed=db.prepare("UPDATE island_mail_batch_recipients SET status='failed',error_code='delivery_failed' WHERE batch_id=? AND user_id=? AND status='pending'").run(r.id,recipient.user_id);if(failed.changes)audit('mail.batch.failure',{batchId:r.id,userId:recipient.user_id,code:'delivery_failed',actor:'admin'})})}}
  return status(r.id)
 }
 function retry(b){if(b.confirmed!==true)throw error(400,'请确认仅重试失败收件人');const requestId=id(b.requestId);return tx(()=>{const r=row(b.id);if(!r.confirmed_at)throw error(409,'批次尚未确认');const old=db.prepare('SELECT batch_id FROM island_mail_batch_retries WHERE request_id=?').get(requestId);if(old){if(old.batch_id!==r.id)throw error(409,'请求编号已用于其他批次');return status(r.id)}
  const changed=db.prepare("UPDATE island_mail_batch_recipients SET status='pending',error_code=NULL WHERE batch_id=? AND status='failed'").run(r.id);db.prepare('INSERT INTO island_mail_batch_retries VALUES(?,?,?)').run(requestId,r.id,now());audit('mail.batch.retry',{batchId:r.id,requestId,count:changed.changes,actor:'admin'});return status(r.id)})}
 return {preview,confirm,process,retry,status,list:()=>({items:db.prepare('SELECT id FROM island_mail_batches ORDER BY created_at DESC,id DESC LIMIT 20').all().map(r=>status(r.id))})};
}
