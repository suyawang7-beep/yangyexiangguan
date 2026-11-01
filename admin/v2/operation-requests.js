// Preserve original component contracts while sharing one volatile authenticated session.
export function createOperationRequests({request,getToken,isDisposed,confirmAction}){
 const revisions=new Map(),actions={cards:'card',activity:'activity','feature-access':'feature'};
 return async function operationRequest(path,data){
  const credential=getToken(),active=()=>!isDisposed()&&credential&&credential===getToken();if(!active())throw Error('管理会话已结束');
  const action=actions[path];let out;
  if(action&&data===undefined){const snapshot=await request('v2/config');if(!active())throw Error('管理会话已结束');revisions.set(action,snapshot.revision);out=action==='card'?snapshot.cards:action==='activity'?snapshot.activity:snapshot.features;}
  else if(action){const expectedRevision=revisions.get(action);if(!expectedRevision)throw Error('请先重新读取配置');if(!await confirmAction('确认保存此管理配置？其他窗口已修改时会拒绝保存。'))throw Error('已取消保存');if(!active())throw Error('管理会话已结束');const saved=await request('v2/config',{action,payload:data,expectedRevision,confirmed:true});if(!active())throw Error('管理会话已结束');revisions.set(action,saved.revision);out=action==='card'?{id:data.cardId}:action==='activity'?saved.activity:saved.features[data.feature];}
  else out=await request(path,data);
  if(!active())throw Error('管理会话已结束');return out;
 };
}
