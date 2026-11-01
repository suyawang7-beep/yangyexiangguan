import {createReadonlyAdminClient} from './readonly-client.js';
export function connectAdmin(getToken){
 const readonly=createReadonlyAdminClient({getToken});
 async function request(path,body){
  const token=getToken();if(!token)throw Error('请先验证管理员身份');
  const r=await fetch('/api/admin/'+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},cache:'no-store',credentials:'same-origin',...(body?{body:JSON.stringify(body)}:{})});
  if(!r.ok){let message='操作失败（'+r.status+'）';try{message=(await r.json()).error||message;}catch{}throw Error(r.status===403?'管理员身份失效，请重新登录':message);}
  return r.json();
 }
 return {load:readonly.load,config:()=>request('v2/config'),save:body=>request('v2/config',body),fusion:()=>request('v2/fusion'),assets:()=>request('assets')};
}
