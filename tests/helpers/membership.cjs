// Explicitly exercise the real application/review flow on an isolated test server.
exports.verifyAccount=async function verifyAccount(base,admin,account){
 const post=async(path,token,body)=>{const r=await fetch(base+'/api/'+path,{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw Error(path+': '+JSON.stringify(data));return data};
 const application=await post('membership/apply',account.token,{douyinId:'isolated_'+account.id,note:'仅限独立测试数据库的认证流程验收'});
 await post('admin/memberships/review',admin,{userId:account.id,action:'approve',confirmed:true,verificationCode:application.verificationCode,note:'隔离测试明确核验'});
};
