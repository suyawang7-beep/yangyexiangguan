export function createMessageBoard(db, audit, tx) {
  db.exec(`CREATE TABLE IF NOT EXISTS island_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id),
    body TEXT NOT NULL,
    anonymous INTEGER NOT NULL CHECK(anonymous IN (0,1)),
    reply TEXT,
    created_at TEXT NOT NULL,
    replied_at TEXT
  );
  CREATE INDEX IF NOT EXISTS island_messages_newest ON island_messages(id DESC);`);
  const err=(status,message)=>Object.assign(new Error(message),{status});
  const publicRows=()=>db.prepare(`SELECT m.id,m.body,m.anonymous AS anonymous,m.reply,m.created_at AS createdAt,m.replied_at AS repliedAt,
    CASE WHEN m.anonymous=1 THEN '匿名岛民' ELSE u.nickname END AS author
    FROM island_messages m JOIN users u ON u.id=m.user_id ORDER BY m.id DESC LIMIT 100`).all()
    .map(m=>({...m,anonymous:!!m.anonymous}));
  function submit(userId,payload) {
    const body=typeof payload.body==='string'?payload.body.trim():'';
    if(!body||body.length>500||typeof payload.anonymous!=='boolean')throw err(400,'留言需为1至500字，并选择实名或匿名');
    const recent=db.prepare('SELECT created_at FROM island_messages WHERE user_id=? ORDER BY id DESC LIMIT 1').get(userId);
    if(recent&&Date.now()-Date.parse(recent.created_at)<60000)throw err(429,'请稍后再留言（每分钟限一条）');
    return tx(()=>{const at=new Date().toISOString();const result=db.prepare('INSERT INTO island_messages(user_id,body,anonymous,created_at) VALUES(?,?,?,?)').run(userId,body,payload.anonymous?1:0,at);return {id:Number(result.lastInsertRowid),createdAt:at}});
  }
  const adminRows=()=>db.prepare(`SELECT m.id,m.user_id AS userId,u.nickname,m.body,m.anonymous,m.reply,m.created_at AS createdAt,m.replied_at AS repliedAt
    FROM island_messages m JOIN users u ON u.id=m.user_id ORDER BY m.id DESC LIMIT 200`).all().map(m=>({...m,anonymous:!!m.anonymous}));
  function reply(payload){
    const id=Number(payload.id),body=typeof payload.reply==='string'?payload.reply.trim():'';
    if(!Number.isSafeInteger(id)||id<1||body.length>1000)throw err(400,'回复内容最多1000字');
    return tx(()=>{const exists=db.prepare('SELECT id FROM island_messages WHERE id=?').get(id);if(!exists)throw err(404,'留言不存在');
      db.prepare('UPDATE island_messages SET reply=?,replied_at=? WHERE id=?').run(body||null,body?new Date().toISOString():null,id);
      audit('message.reply',{id,hasReply:!!body});return {id,reply:body||null};
    });
  }
  return {publicRows,submit,adminRows,reply};
}
