/* Real production integration, only in a disposable local database. */
const {chromium}=require('playwright');
const {verifyAccount}=require('./helpers/membership.cjs');
const {spawn}=require('node:child_process');
const {mkdtempSync,rmSync}=require('node:fs');
const {tmpdir}=require('node:os');
const {join}=require('node:path');
const assert=require('node:assert/strict');
const folder=mkdtempSync(join(tmpdir(),'buzhi-resident-production-'));
const port=48000+Math.floor(Math.random()*1000),base=`http://127.0.0.1:${port}`;
const admin='resident-isolated-admin-20261020-not-production';
const server=spawn(process.execPath,['server/index.mjs'],{cwd:join(__dirname,'..'),env:{...process.env,HOST:'127.0.0.1',PORT:String(port),DB_PATH:join(folder,'isolated.sqlite'),ADMIN_TOKEN:admin},stdio:['ignore','ignore','pipe']});
let logs='',browser;server.stderr.on('data',c=>logs+=c);
async function api(path,body,token){
  const response=await fetch(base+'/api/'+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});
  assert.equal(response.status,200,`${path}: ${response.status}`);return response.json();
}
(async()=>{
  let ready=false;for(let i=0;i<80;i++){try{if((await fetch(base+'/health')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert(ready,logs);
  for(const [path,type] of [['resident.html','text/html'],['resident.css','text/css'],['resident-motion.js','text/javascript'],['ui-preview/resident.css','text/css'],['ui-preview/resident-motion.js','text/javascript']]){
    const r=await fetch(base+'/'+path);assert.equal(r.status,200,path);assert(r.headers.get('Content-Type').startsWith(type),path+' MIME');
  }
  const account=await api('register',{nickname:'本地美化验收',password:'local-fixture-password-20261020'});
  await verifyAccount(base,admin,account);
  const stateBefore=await api('me',undefined,account.token);
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[],unexpected=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(r.method()!=='GET'&&!r.url().endsWith('/api/resident/work'))unexpected.push(r.url());});
  await page.addInitScript(token=>sessionStorage.setItem('buzhi-online-token',token),account.token);
  await page.goto(base+'/resident.html');await page.waitForSelector('#center:not(.resident-hidden)');
  assert(await page.evaluate(()=>window.__BUZHI_PRODUCTION__));
  assert(await page.locator('#hello').textContent().then(s=>s.includes('本地美化验收')));
  assert(await page.locator('#motion-toggle').isVisible());
  await page.locator('#title').fill('隔离数据库里的海风');await page.locator('#body').fill('此作品只存在于自动清理的本地测试数据库，不会写入正式小岛。');
  await page.locator('[data-status="draft"]').click();await page.waitForFunction(()=>document.querySelector('#work-list').textContent.includes('隔离数据库里的海风'));
  assert.equal((await api('resident',undefined,account.token)).works[0].status,'draft');
  const stateAfter=await api('me',undefined,account.token);
  for(const key of ['coins','tasks','checkins','draws','bonuses','ledger'])assert.deepEqual(stateAfter[key],stateBefore[key],key+' must not change during resident styling/work saving');
  await page.locator('#motion-toggle').click();await page.goto(base+'/index.html');
  await page.waitForFunction(()=>document.querySelector('.world')?.dataset.motion==='off');
  await page.locator('#motion-toggle').click();await page.goto(base+'/resident.html');
  await page.waitForFunction(()=>document.querySelector('#motion-toggle')?.getAttribute('aria-pressed')==='true');
  assert.equal(await page.locator('body').evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.deepEqual(unexpected,[],'No password, reward or other account mutations');assert.deepEqual(errors,[]);
  console.log('PASS real production resident CSS/JS routes, verified page, work form, unchanged reward records and two-way shared motion preference');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{
  await browser?.close();if(server.exitCode===null){const done=new Promise(r=>server.once('exit',r));server.kill();await done;}rmSync(folder,{recursive:true,force:true});
});
