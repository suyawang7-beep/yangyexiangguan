/* GET-only, fresh-browser evidence of each actual page, not stylesheet presence.
   Default: temporary local production server. LIVE_AUDIT_URL may select a public
   site or a Pages /ui-preview/ directory. Never register/login on a live site. */
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const {mkdtempSync,mkdirSync,writeFileSync,rmSync}=require('node:fs');
const {join,resolve}=require('node:path');
const {tmpdir}=require('node:os');
const assert=require('node:assert/strict');
const folder=mkdtempSync(join(tmpdir(),'buzhi-liquid-evidence-'));
const capture=process.env.LIQUID_EVIDENCE_DIR||join(folder,'evidence');
const pages=['index','passport','verify','office','checkin','draw','collection','islanders','mailbox','guide'];
const port=52000+Math.floor(Math.random()*500);
const base=(process.env.LIVE_AUDIT_URL||`http://127.0.0.1:${port}/`).replace(/\/?$/,'/');
let server,browser,logs='';const rows=[],failures=[];
(async()=>{
 if(!process.env.LIVE_AUDIT_URL){
  server=spawn(process.execPath,['server/index.mjs'],{cwd:resolve(__dirname,'..'),env:{...process.env,HOST:'127.0.0.1',PORT:String(port),DB_PATH:join(folder,'isolated.sqlite'),ADMIN_TOKEN:'isolated-liquid-evidence-not-production-20261020'},stdio:['ignore','ignore','pipe']});server.stderr.on('data',c=>logs+=c);
  let ready=false;for(let i=0;i<80;i++){try{if((await fetch(base+'health')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert(ready,logs);
 }
 mkdirSync(capture,{recursive:true});
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
  let blockedWrites=0;await context.route('**/*',r=>{if(r.request().method()!=='GET'){blockedWrites++;return r.abort();}return r.request().url().startsWith(new URL(base).origin+'/')?r.continue():r.abort();});
  const page=await context.newPage();let errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const name of pages){
   errors=[];const url=new URL(name+'.html',base).href;
   const response=await page.goto(url,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('.world')?.dataset.effectsReady==='true',{},{timeout:10000}).catch(()=>{});
   await page.evaluate(()=>document.fonts.ready);
   // Capture before evaluating visual assertions, retaining evidence on failure.
   await page.screenshot({path:join(capture,`${name}-${width}.png`),fullPage:true,animations:'disabled'});
   const detail=await page.evaluate(()=>{
    const visible=el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(el).display!=='none';};
    const describe=el=>{const s=getComputedStyle(el),p=el.querySelector(':scope > .liquid-room-glass');return {element:el.tagName.toLowerCase()+'.'+el.className,background:s.backgroundImage,backdrop:s.backdropFilter,planeBackdrop:p?getComputedStyle(p).backdropFilter:null,opacity:s.opacity,treated:el.hasAttribute('data-liquid-surface')};};
    const main=document.querySelector('main'),sea=document.querySelector('.site-liquid');
    return {production:window.__BUZHI_PRODUCTION__===true,ready:document.querySelector('.world')?.dataset.effectsReady==='true',sea:sea?describe(sea):null,rooms:[...document.querySelectorAll('main [data-liquid-room]')].filter(visible).map(describe),panels:[...document.querySelectorAll('main [data-liquid-surface]')].filter(visible).map(describe),sidebars:[...document.querySelectorAll('main aside')].filter(visible).map(describe),heading:main?.querySelector('h1')?.textContent.trim(),headingOpacity:main?.querySelector('h1')?getComputedStyle(main.querySelector('h1')).opacity:null,needsPassport:Boolean(main?.querySelector('.empty-state')),overflow:document.documentElement.scrollWidth>innerWidth,scripts:[...document.scripts].map(s=>s.src).filter(Boolean),styles:[...document.querySelectorAll('link[rel="stylesheet"]')].map(s=>s.href)};
   });
   const row={page:name,width,url,status:response.status(),revision:response.headers()['x-buzhi-revision']||null,cache:response.headers()['cache-control']||null,...detail,errors:[...errors],blockedWrites};rows.push(row);
   writeFileSync(join(capture,'evidence.json'),JSON.stringify({base,checkedAt:new Date().toISOString(),mode:process.env.LIVE_AUDIT_URL?'live-get-only':'isolated-production-get-only',rows,failures},null,2));
   if(row.status!==200||!row.ready||!row.sea||!row.rooms.length||!row.panels.length||row.headingOpacity!=='1'||row.overflow||row.errors.length)failures.push(`${name}/${width}: HTTP ${row.status}, ready=${row.ready}, sea=${!!row.sea}, rooms=${row.rooms.length}, panels=${row.panels.length}, errors=${row.errors.join(';')}`);
   console.log(`${name}/${width}: ${row.status}, liquid=${!!row.sea}, rooms=${row.rooms.length}, panels=${row.panels.length}, sidebars=${row.sidebars.length}, errors=${row.errors.length}`);
  }
  assert.equal(blockedWrites,0,'Audit must never try to mutate a live or test account');await context.close();
 }
 writeFileSync(join(capture,'evidence.json'),JSON.stringify({base,checkedAt:new Date().toISOString(),mode:process.env.LIVE_AUDIT_URL?'live-get-only':'isolated-production-get-only',rows,failures},null,2));
 assert.deepEqual(failures,[],failures.join('\n'));
 console.log(`PASS ${rows.length} actual-page liquid records; screenshots and computed main/side panels saved to ${capture}`);
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();if(server?.exitCode===null){const done=new Promise(r=>server.once('exit',r));server.kill();await done;}rmSync(folder,{recursive:true,force:true});});
