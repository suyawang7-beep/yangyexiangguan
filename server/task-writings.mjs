// Called only behind the existing /api/admin/ authentication gate.
export function listTaskWritings(db,params){
 const type=params.get('type')||'',q=(params.get('q')||'').trim(),rawPage=params.get('page')||'1',page=Number(rawPage),pageSize=50;
 if(!['','letter','memory'].includes(type)||q.length>100||!/^\d+$/.test(rawPage)||!Number.isSafeInteger(page)||page<1||page>1000000){const e=new Error('筛选条件或页码无效');e.status=400;throw e}
 const kind="CASE WHEN w.task_key='memory' THEN 'memory' ELSE 'letter' END";
 const where="(w.task_key='memory' OR w.task_key='letter' OR w.task_key GLOB 'letter:*') AND (?='' OR "+kind+"=?) AND (?='' OR instr(lower(u.nickname),lower(?))>0 OR instr(lower(u.id),lower(?))>0)",args=[type,type,q,q,q];
 const total=db.prepare('SELECT count(*) AS n FROM task_writings w JOIN users u ON u.id=w.user_id WHERE '+where).get(...args).n;
 const items=db.prepare('SELECT w.user_id AS userId,u.nickname,w.task_key AS taskKey,'+kind+' AS type,w.body,w.created_at AS createdAt FROM task_writings w JOIN users u ON u.id=w.user_id WHERE '+where+' ORDER BY w.created_at DESC,w.user_id,w.task_key LIMIT ? OFFSET ?').all(...args,pageSize,(page-1)*pageSize);
 return {items,total,page,pageSize};
}
