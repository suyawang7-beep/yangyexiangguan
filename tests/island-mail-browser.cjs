// Actual browser/admin/resident flows against a disposable local database only.
const {chromium}=require('playwright'),{spawn}=require('node:child_process'),{mkdtempSync,rmSync}=require('node:fs'),{tmpdir}=require('node:os'),{join}=require('node:path'),{randomUUID}=require('node:crypto'),assert=require('node:assert/strict');
const {verifyAccount}=require('./helpers/membership.cjs');
const folder=mkdtempSync(join(tmpdir(),'buzhi-mail-ui-')),admin='isolated-mail-browser-admin-000000000000',port=56000+Math.floor(Math.random()*500),base='http://127.0.0.1:'+port;
let server,browser,logs='';
async function api(path,body,token){const r=await fetch(base+'/api/'+path,{method:body===undefined?'GET':'POST',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});assert.equal(r.status,200,path);return r.json()}
(async()=>{
 server=spawn(process.execPath,['server/index.mjs'],{env:{...process.env,HOST:'127.0.0.1',PORT:String(port),DB_PATH:join(folder,'isolated.sqlite'),ASSET_DIR:join(folder,'assets'),ADMIN_TOKEN:admin},stdio:['ignore','ignore','pipe']});server.stderr.on('data',x=>logs+=x);
 let ready=false;for(let i=0;i<100;i++){try{if((await fetch(base+'/health')).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,100))}assert(ready,logs);
 browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 for(const width of [390,1440]){
  const u=await api('register',{nickname:'信箱界面'+width,password:'isolated-browser-password-2026'});await verifyAccount(base,admin,u);
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  assert.equal((await page.goto(base+'/admin/island-mail')).status(),200,'dedicated mail admin route');
  await page.locator('#token').fill(admin);await page.locator('#enter').click();await page.locator('#islandGiftPanel').waitFor();
  assert.equal(await page.locator('#app > section:visible').count(),1,'only mail panel visible');
  await page.locator('#islandGiftUser').fill(u.id);await page.locator('#islandGiftTitle').fill('金币来信');await page.locator('#islandGiftMessage').fill('<img src=x onerror=alert(1)>');await page.locator('#islandGiftAmount').fill('35');
  // Server commits but the response is lost. Retry must keep the request and payload.
  let attempts=0;await page.route('**/api/admin/island-mail/send',async route=>{attempts++;if(attempts===2)return route.fulfill({status:403,contentType:'application/json',body:JSON.stringify({error:'隔离模拟权限拒绝'})});if(attempts>2)return route.continue();await route.fetch();await route.abort('failed')});
  await page.locator('#islandGiftSend').click();await page.locator('#islandGiftStatus').filter({hasText:'操作未确认'}).waitFor();
  assert.equal(await page.locator('#islandGiftTitle').isDisabled(),true,'unconfirmed send locks the original payload');
  await page.locator('#islandGiftSend').click();await page.locator('#islandGiftStatus').filter({hasText:'隔离模拟权限拒绝'}).waitFor();
  assert.equal(await page.locator('#islandGiftTitle').isDisabled(),true,'a rejected retry cannot discard an earlier ambiguous success');
  await page.locator('#islandGiftSend').click();await page.locator('#islandGiftStatus').filter({hasText:'已寄送过'}).waitFor();
  let history=await api('admin/island-mail',undefined,admin);assert.equal(history.items.filter(x=>x.userId===u.id).length,1,'lost response never duplicates mail');
  await page.unroute('**/api/admin/island-mail/send');
  await page.locator('#islandGiftAmount').fill('');await page.locator('#islandGiftKind').selectOption('item');await page.locator('#islandGiftTitle').fill('贝壳来信');await page.locator('#islandGiftItem').fill('纪念贝壳');
  await page.locator('#islandGiftSend').click();await page.locator('#islandGiftStatus').filter({hasText:/^已寄送 ·/}).waitFor();
  await page.locator('#adminNavigation a[href="/admin/characters"]').click();assert.equal(await page.locator('#islandGiftPanel').isVisible(),false);
  const context=await browser.newContext({viewport:{width,height:900}});await context.addInitScript(token=>sessionStorage.setItem('buzhi-online-token',token),u.token);const resident=await context.newPage();resident.on('pageerror',e=>errors.push(e.message));
  await resident.goto(base+'/resident.html');await resident.locator('#center:not(.resident-hidden)').waitFor();await resident.locator('#island-mail-list article').first().waitFor();
  assert.equal(await resident.locator('#island-mail-count').textContent(),'2 封待领取');assert.equal(await resident.locator('#island-mail-list img').count(),0,'mail content is text, never executable markup');
  if(width<=680)await resident.locator('#mail-stack-toggle').click();
  const coin=resident.locator('#island-mail-list article').filter({hasText:'金币来信'});await coin.getByRole('button',{name:'领取岛屿礼物'}).click();await resident.waitForFunction(()=>document.querySelector('#journal-coins').textContent==='85');
  await resident.locator('#island-mail-list article').filter({hasText:'贝壳来信'}).getByRole('button',{name:'领取岛屿礼物'}).click();await resident.locator('#island-items-list').filter({hasText:'纪念贝壳'}).waitFor({state:'attached'});assert.equal(await resident.locator('#island-mail-count').textContent(),'0 封待领取');
  await resident.reload();await resident.locator('#island-items-list').filter({hasText:'纪念贝壳'}).waitFor({state:'attached'});assert.equal(await resident.locator('#island-mail-list button').count(),0);
  for(let i=0;i<101;i++)await api('admin/island-mail/send',{userId:u.id,title:'分页'+i,message:'历史',kind:'coins',amount:1,requestId:randomUUID()},admin);
  await resident.locator('#island-mail-refresh').click();await resident.locator('#island-mail-more:not([hidden])').waitFor();assert.equal(await resident.locator('#island-mail-list article').count(),100);
  await resident.locator('#island-mail-more').click();await resident.locator('#island-mail-list article').filter({hasText:'金币来信'}).waitFor();assert.equal(await resident.locator('#island-mail-list article').count(),103);
  assert(await resident.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);await context.close();await page.close();console.log('PASS mail admin/resident real clicks, lost-response retry, item/coin switch, inventory, text safety, history and layout at '+width);
 }
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{await browser?.close();if(server?.exitCode===null){const done=new Promise(r=>server.once('exit',r));server.kill();await done}rmSync(folder,{recursive:true,force:true})});
