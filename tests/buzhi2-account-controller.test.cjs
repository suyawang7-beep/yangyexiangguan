const test=require('node:test');const assert=require('node:assert/strict');
const {validateNickname,createAccountController}=require('../ui-preview/buzhi2/account-controller.js');
test('nickname accepts a normal name and trims whitespace',()=>assert.deepEqual(validateNickname(' 小岛居民 '),{ok:true,nickname:'小岛居民'}));
test('nickname rejects empty and >20 Unicode characters',()=>{assert.equal(validateNickname('   ').ok,false);assert.equal(validateNickname('🌊'.repeat(21)).ok,false)});
test('preview refuses actions and does not reach transport',async()=>{
 let calls=0;const c=createAccountController({request:async()=>{calls++},tokenProvider:()=> 'secret'});
 assert.equal((await c.updateNickname('小鱼')).ok,false);
 assert.equal((await c.logout()).ok,false);assert.equal(calls,0);
});
test('connected controller rejects missing tokens',async()=>{
 let calls=0;const c=createAccountController({preview:false,request:async()=>{calls++},tokenProvider:()=>null});
 assert.equal((await c.logout()).ok,false);assert.equal(calls,0);
});
test('authenticated nickname and logout hit only their intended endpoints',async()=>{
 const calls=[];const c=createAccountController({preview:false,tokenProvider:()=> 'test-token',request:async(...args)=>{calls.push(args);return {ok:true}}});
 assert.equal((await c.updateNickname(' 阿蓝 ')).ok,true);assert.equal((await c.logout()).ok,true);
 assert.deepEqual(calls,[['/api/profile/nickname',{nickname:'阿蓝'},'test-token'],['/api/logout',{},'test-token']]);
});
test('server rejection returns error instead of indicating success',async()=>{
 const c=createAccountController({preview:false,tokenProvider:()=> 'x',request:async()=>{throw Object.assign(Error('登录已失效'),{status:401})}});
 assert.deepEqual(await c.logout(),{ok:false,reason:'登录已失效',status:401});
});
