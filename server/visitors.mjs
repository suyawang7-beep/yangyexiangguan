export function listVisitors(db,params){
 const page=Number(params.get('page')||1),q=(params.get('q')||'').trim();if(!Number.isSafeInteger(page)||page<1||page>100000||q.length>80)throw Object.assign(new Error('游客筛选条件无效'),{status:400});
 const unApplied=params.get('unApplied')==='1';
 const where="WHERE "+(unApplied?"NOT EXISTS(SELECT 1 FROM memberships m WHERE m.user_id=u.id)":"NOT EXISTS(SELECT 1 FROM memberships m WHERE m.user_id=u.id AND m.status='verified')")+" AND (?='' OR instr(u.id,?)>0 OR instr(u.nickname,?)>0)",args=[q,q,q];

 const total=db.prepare('SELECT COUNT(*) n FROM users u '+where).get(...args).n;
 const items=db.prepare("SELECT u.id,u.nickname,u.created_at,COALESCE((SELECT status FROM memberships m WHERE m.user_id=u.id),'visitor') AS membershipStatus,COALESCE((SELECT SUM(amount) FROM ledger l WHERE l.user_id=u.id),0) AS coins,(SELECT COUNT(*) FROM draws d WHERE d.user_id=u.id) AS draws,(SELECT COUNT(*) FROM checkins c WHERE c.user_id=u.id) AS checkins,(SELECT COUNT(*) FROM tasks t WHERE t.user_id=u.id) AS tasks FROM users u "+where+' ORDER BY u.created_at DESC,u.id LIMIT 50 OFFSET ?').all(...args,(page-1)*50);
 return{items,total,page,pageSize:50};
}
