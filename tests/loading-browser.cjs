const {chromium}=require('playwright'),{spawn}=require('node:child_process'),{mkdtempSync,rmSync}=require('node:fs'),{tmpdir}=require('node:os'),{join}=require('node:path'),assert=require('node:assert/strict');
const folder=mkdtempSync(join(tmpdir(),'buzhi-loading-')),port=59000+Math.floor(Math.random()*600),base='http://127.0.0.1:'+port,password='Isolated-loading-password-2026!';
let browser,logs='',releasePublic=()=>{};
const server=spawn(process.execPath,['server/index.mjs'],{cwd:join(__dirname,'..'),env:{...process.env,HOST:'127.0.0.1',PORT:String(port),DB_PATH:join(folder,'test.sqlite'),ADMIN_TOKEN:'isolated-loading-admin-secret-00000000'},stdio:['ignore','ignore','pipe']});server.stderr.on('data',c=>logs+=c);
(async()=>{
 let ready=false;for(let i=0;i<100;i++){try{if((await fetch(base+'/health')).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,100))}assert(ready,logs);
 const account=await fetch(base+'/api/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({nickname:'加载回归专用',password})}).then(r=>r.json());assert(account.token);
 browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const gate=new Promise(r=>releasePublic=r);let held=0;
  await page.route('**/api/*',async route=>{const path=new URL(route.request().url()).pathname;if(['/api/assets-manifest','/api/catalog','/api/oc'].includes(path)){held++;await gate}try{await route.continue()}catch{}});
  await page.goto(base+'/passport.html',{waitUntil:'domcontentloaded'});
  await page.locator('#passport-returning-tab').waitFor({timeout:5000});assert(held>0,'nonessential requests should still be pending');
  await page.locator('#passport-returning-tab').click();await page.locator('#returning-id').fill(account.id);await page.locator('#returning-key').fill(password);await page.locator('#live-login button[type=submit]').click();
  await page.locator('#public-id').waitFor({timeout:5000});assert.equal(await page.locator('#public-id').inputValue(),account.id);
  releasePublic();await page.waitForLoadState('networkidle');assert.equal(await page.locator('#public-id').inputValue(),account.id);assert.deepEqual(errors,[]);await page.close();
  console.log('PASS login usable before artwork/catalog/OC complete, width '+width);
 }
 const page=await browser.newPage();await page.addInitScript(t=>sessionStorage.setItem('buzhi-online-token',t),account.token);
 await page.route('**/api/me',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'temporary outage'})}));
 await page.goto(base+'/passport.html',{waitUntil:'networkidle'});await page.getByText('暂时无法读取账户，登录状态已保留，请刷新重试。',{exact:true}).waitFor();assert.equal(await page.evaluate(()=>sessionStorage.getItem('buzhi-online-token')),account.token);
 await page.unroute('**/api/me');await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('#public-id').inputValue(),account.id);await page.close();
 console.log('PASS transient account error retains session and reload recovers');
 const expired=await browser.newPage();await expired.addInitScript(t=>sessionStorage.setItem('buzhi-online-token',t),account.token);
 await expired.route('**/api/me',route=>route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({error:'expired'})}));
 await expired.goto(base+'/passport.html',{waitUntil:'networkidle'});assert.equal(await expired.evaluate(()=>sessionStorage.getItem('buzhi-online-token')),null);await expired.locator('#passport-returning-tab').waitFor();await expired.close();
 console.log('PASS expired account returns to login; no production data touched');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{releasePublic();await browser?.close();if(server.exitCode===null){const done=new Promise(r=>server.once('exit',r));server.kill();await done}rmSync(folder,{recursive:true,force:true})});
