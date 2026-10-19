// Isolated regression: probability disclosure and loading state on both viewport sizes.
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const {mkdtempSync,rmSync}=require('node:fs');
const {tmpdir}=require('node:os');
const {join}=require('node:path');
const assert=require('node:assert/strict');
const dir=mkdtempSync(join(tmpdir(),'buzhi-pool-'));
const port=47000+Math.floor(Math.random()*1000),base='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['server/index.mjs'],{cwd:join(__dirname,'..'),env:{...process.env,HOST:'127.0.0.1',PORT:String(port),DB_PATH:join(dir,'test.sqlite'),ASSET_DIR:join(dir,'assets'),ADMIN_TOKEN:'isolated-pool-regression-secret-000000'},stdio:['ignore','ignore','pipe']});
let browser,logs='';server.stderr.on('data',d=>logs+=d);
(async()=>{
 let ready=false;for(let i=0;i<60;i++){try{if((await fetch(base+'/health')).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,100))}assert(ready,logs);
 const catalog=await fetch(base+'/api/catalog').then(r=>r.json());
 assert.equal(catalog.cards.length,32);assert.equal(catalog.totalSlots,50);
 const expected={UR:2,SSR:4,SR:6,R:9,N:11};
 assert.deepEqual(Object.fromEntries(Object.keys(expected).map(r=>[r,catalog.cards.filter(c=>c.rarity===r).length])),expected);
 browser=await chromium.launch({headless:true});
 for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>r.request().url().startsWith(base+'/')?r.continue():r.abort());
  await page.goto(base+'/draw.html',{waitUntil:'networkidle'});
  const rows=await page.locator('.probability-list li').allTextContents();
  for(const [rarity,count] of Object.entries(expected))assert(rows.some(row=>row.includes(`${rarity} · ${count} 张`)&&row.includes(`${count/32*100}%`)),`${width}px ${rarity} disclosure: ${rows}`);
  assert.equal(rows.reduce((sum,row)=>sum+Number(row.match(/([\d.]+)%/)[1]),0),100);
  assert.match(await page.locator('#draw-status').textContent(),/核验/);
  await page.goto(base+'/passport.html',{waitUntil:'networkidle'});
  assert.match(await page.locator('#passport-form').textContent(),/核验/);
  let release;const gate=new Promise(r=>release=r);
  await page.route('**/api/catalog',async r=>{await gate;await r.continue()});
  try{
   await page.goto(base+'/islanders.html',{waitUntil:'domcontentloaded'});
   await page.locator('#main[aria-busy="true"] [role="status"]').waitFor({timeout:5000});
   await page.waitForFunction(()=>document.querySelector('.world')?.dataset.effectsReady==='true',{}, {timeout:5000});
  }finally{release()}
  await page.locator('#main[aria-busy="false"] h1').waitFor();
  assert.deepEqual(errors,[],`${width}px delayed content must not crash effects`);
  await page.close();
 }
 console.log('PASS 32-card probability disclosures total 100%, verification guidance and delayed-loading status at 1440/390px');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{await browser?.close();if(server.exitCode===null){const done=new Promise(r=>server.once('exit',r));server.kill();await done}rmSync(dir,{recursive:true,force:true})});
