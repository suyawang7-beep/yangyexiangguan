// Engineering-owned adapter. Supply the existing admin token from the login UI;
// never persist it, add it to a URL, or create another admin account system.
export function createReadonlyAdminClient({getToken,fetchImpl=fetch}){
 return Object.freeze({async load({signal}={}){
  const token=getToken();if(!token)throw new Error('请先使用原后台管理员身份登录');
  const response=await fetchImpl('/api/admin/v2/read-model',{method:'GET',headers:{Authorization:'Bearer '+token},cache:'no-store',credentials:'same-origin',signal});
  if(!response.ok)throw new Error(response.status===403?'管理员身份失效，请重新登录':'真实管理数据暂不可用（'+response.status+'）');
  return response.json();
 }});
}
