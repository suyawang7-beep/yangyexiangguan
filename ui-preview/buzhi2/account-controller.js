/* Buzhi 2.0 account adapter. No token storage; no implicit network. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.BuzhiAccount=api})(typeof window!=='undefined'?window:null,function(){
'use strict';
function validateNickname(input){if(typeof input!=='string')return {ok:false,message:'请填写昵称'};const nickname=input.trim();if(!nickname||[...nickname].length>20)return {ok:false,message:'昵称须为 1–20 字'};return {ok:true,nickname}}
function createAccountController({request,tokenProvider,preview=true}={}){
 if(preview!==false)return Object.freeze({status:'preview',updateNickname:async()=>({ok:false,reason:'静态预览不接受真实账户资料'}),logout:async()=>({ok:false,reason:'静态预览没有真实登录会话'})});
 if(typeof request!=='function'||typeof tokenProvider!=='function')throw Error('Missing authenticated transport');
 async function send(path,body){const token=tokenProvider();if(!token)return {ok:false,reason:'请先登录'};try{const data=await request(path,body,token);return {ok:true,data}}catch(e){return {ok:false,reason:e?.message||'请求失败',status:e?.status??null}}}
 return Object.freeze({status:'connected',updateNickname:async input=>{const validation=validateNickname(input);return validation.ok?send('/api/profile/nickname',{nickname:validation.nickname}):{ok:false,reason:validation.message}},logout:async()=>send('/api/logout',{})});
}
return Object.freeze({validateNickname,createAccountController});
});
