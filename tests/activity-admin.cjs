// Exercises the actual admin form; all writes use a disposable local database.
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const {mkdtempSync,rmSync}=require('node:fs');
const {tmpdir}=require('node:os');
const {join}=require('node:path');
const assert=require('node:assert/strict');
const folder=mkdtempSync(join(tmpdir(),'buzhi-admin-time-'));
const port=48500+Math.floor(Math.random()*1000),base='http://127.0.0.1:'+port;
const secret='isolated-admin-time-test-secret-00000000';
const server=spawn(process.execPath,['server/index.mjs'],{cwd:join(__dirname,'..'),env:{...process.env,PORT:String(port),HOST:'127.0.0.1',DB_PATH:join(folder,'test.sqlite'),ADMIN_TOKEN:secret},stdio:['ignore','ignore','pipe']});
let logs='',browser;server.stderr.on('data',c=>logs+=c);
(async()=>{
 let ready=false;for(let i=0;i<60;i++){try{if((await fetch(base+'/health')).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,100))}assert(ready,logs);
 browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:900},timezoneId:'America/Los_Angeles'});
  await page.goto(base+'/admin');await page.locator('#token').fill(secret);await page.locator('#enter').click();
  await page.locator('#activityForm').waitFor({timeout:3000});
  await page.locator('#activityStartsAt').fill('2099-10-20T00:00');await page.locator('#activityEndsAt').fill('2099-10-26T00:00');
  await page.locator('#saveActivity').click();await page.locator('#activityStatus').getByText(/未开始/).waitFor();
  let config=await fetch(base+'/api/activity').then(r=>r.json());assert.equal(config.startsAt,'2099-10-19T16:00:00.000Z');assert.equal(config.endsAt,'2099-10-25T16:00:00.000Z');
  await page.reload();await page.locator('#token').fill(secret);await page.locator('#enter').click();await page.locator('#activityStartsAt').waitFor();
  assert.match(await page.locator('#activityStartsAt').inputValue(),/^2099-10-20T00:00/);
  await page.locator('#activityStartsAt').fill('');await page.locator('#activityEndsAt').fill('');await page.locator('#saveActivity').click();await page.locator('#activityStatus').getByText(/进行中/).waitFor();
  config=await fetch(base+'/api/activity').then(r=>r.json());assert.equal(config.startsAt,null);assert.equal(config.endsAt,null);
  await page.close();
 }
 console.log('PASS admin activity form at desktop/mobile widths: explicit Beijing conversion independent of device timezone, save, reload and clear');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{await browser?.close();const done=new Promise(r=>server.once('exit',r));server.kill();await done;rmSync(folder,{recursive:true,force:true})});
