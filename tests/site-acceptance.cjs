// Read-only acceptance of the nine production pages at desktop/mobile widths.
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const {mkdtempSync,rmSync,mkdirSync,writeFileSync}=require('node:fs');
const {tmpdir}=require('node:os');
const {join,resolve}=require('node:path');
const assert=require('node:assert/strict');
const folder=mkdtempSync(join(tmpdir(),'buzhi-nine-pages-'));
const port=50000+Math.floor(Math.random()*1000);
const base=process.env.ACCEPTANCE_BASE_URL||'http://127.0.0.1:'+port;
const capture=process.env.ACCEPTANCE_CAPTURE_DIR;
const pages=['index','passport','office','checkin','draw','collection','mailbox','guide','islanders'];
let server,browser,logs='';const results=[];
(async()=>{
 if(!process.env.ACCEPTANCE_BASE_URL){server=spawn(process.execPath,['server/index.mjs'],{cwd:join(__dirname,'..'),env:{...process.env,HOST:'127.0.0.1',PORT:String(port),DB_PATH:join(folder,'test.sqlite'),ADMIN_TOKEN:'isolated-nine-page-readonly-test-0000000'},stdio:['ignore','ignore','pipe']});server.stderr.on('data',c=>logs+=c);}
 let ready=false;for(let i=0;i<60;i++){try{if((await fetch(base+'/health')).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,100))}assert(ready,'Health check failed: '+logs);
 if(capture)mkdirSync(capture,{recursive:true});
 browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:width===390?844:1000},reducedMotion:'reduce'});
  // No production participant data can be created or changed by this test.
  await context.route('**/*',async route=>{
   if(route.request().method()!=='GET'||!route.request().url().startsWith(base+'/'))return route.abort();
   // Real server data, delayed to catch effects binding before the first content render.
   if(route.request().url()===base+'/api/catalog')await new Promise(r=>setTimeout(r,250));
   return route.continue();
  });
  const page=await context.newPage();let errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const name of pages){
   errors=[];const start=Date.now();const response=await page.goto(base+'/'+(name==='index'?'':name+'.html'),{waitUntil:'networkidle'});
   assert.equal(response.status(),200,name+' HTTP');
   try{await page.waitForFunction(()=>document.querySelector('.world')?.dataset.effectsReady==='true',{},{timeout:5000})}catch(e){if(capture)await page.screenshot({path:resolve(capture,'failed-'+name+'-'+width+'.png'),fullPage:true});throw Error(name+' '+width+' effects initialization failed: '+JSON.stringify(errors));}
   await page.evaluate(()=>document.fonts.ready);
   assert(await page.evaluate(()=>window.__BUZHI_PRODUCTION__===true),name+' production mode');
   assert.equal(await page.locator('a[href="effects.html"]').count(),0);
   const metrics=await page.evaluate(()=>({width:innerWidth,documentWidth:document.documentElement.scrollWidth,heading:document.querySelector('h1')?.textContent.trim(),fontLoaded:[...document.fonts].some(f=>f.family==='Buzhi Rounded'&&f.status==='loaded')}));
   assert(metrics.heading,name+' heading');assert(metrics.fontLoaded,name+' rounded font');assert(metrics.documentWidth<=width+1,name+' horizontal overflow');assert.deepEqual(errors,[],name+' JavaScript errors');
   if(capture)await page.screenshot({path:resolve(capture,name+'-'+width+'.png'),fullPage:true,animations:'disabled'});
   results.push({page:name,width,status:'pass',...metrics,elapsedMs:Date.now()-start});
  }
  await context.close();
 }
 if(capture)writeFileSync(resolve(capture,'acceptance.json'),JSON.stringify({base,checkedAt:new Date().toISOString(),results},null,2));
 console.log('PASS nine production pages at 1440/390px: 18 checks, loaded font, server mode, no horizontal overflow or JavaScript errors; GET-only, no participant writes');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{await browser?.close();if(server){const done=new Promise(r=>server.once('exit',r));server.kill();await done;}rmSync(folder,{recursive:true,force:true})});
