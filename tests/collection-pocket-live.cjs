// Real API and disposable SQLite only; never connects to production.
const assert=require('node:assert/strict'),{chromium}=require('playwright'),{spawn}=require('node:child_process'),{DatabaseSync}=require('node:sqlite'),{mkdtempSync,rmSync}=require('node:fs'),{tmpdir}=require('node:os'),{join}=require('node:path');
const folder=mkdtempSync(join(tmpdir(),'pocket-live-')),dbPath=join(folder,'db.sqlite');let server,browser;
(async()=>{
 const {availablePort}=await import('./helpers/port.mjs'),port=await availablePort(),base='http://127.0.0.1:'+port;
 server=spawn(process.execPath,['server/index.mjs'],{env:{...process.env,HOST:'127.0.0.1',PORT:String(port),DB_PATH:dbPath,ASSET_DIR:join(folder,'assets'),ADMIN_TOKEN:'pocket-live-fixture-000000000000'},stdio:'ignore'});
 for(let i=0;i<100;i++){try{if((await fetch(base+'/health')).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
 const account=await(await fetch(base+'/api/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({nickname:'独立卡册测试',password:'isolated-pocket-password'})})).json();
 const db=new DatabaseSync(dbPath);db.prepare('INSERT INTO draws(user_id,card_id,rarity,created_at) VALUES(?,?,?,?)').run(account.id,'SR-1','SR',new Date().toISOString());db.close();
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true}),errors=[],writes=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('/api/')&&r.method()!=='GET')writes.push(r.url())});
 await page.addInitScript(t=>sessionStorage.setItem('buzhi-online-token',t),account.token);
 await page.goto(base+'/collection.html',{waitUntil:'networkidle'});
 const pocket=page.locator('buzhi-pocket');await pocket.locator('#pockets [data-card]').first().waitFor();
 assert.equal(await pocket.locator('#pockets [data-card]').count(),4);assert.match(await pocket.locator('.intro-stats strong').textContent(),/1 种 \/ 1 张/);assert.match(await pocket.locator('#page-number').textContent(),/1 \/ 15/);
 await pocket.locator('#page-next').click();assert.match(await pocket.locator('#page-number').textContent(),/2 \/ 15/);
 await pocket.locator('#tab-viewer').click();await pocket.locator('.big-card').click();assert(await pocket.locator('#detail').isVisible());assert((await pocket.locator('.detail-story').textContent()).length>0);await pocket.locator('[data-close="detail"]').click();
 await pocket.locator('#open-filters').click();await pocket.locator('input[name="ownership"][value="owned"]').check();await pocket.locator('#apply-filters').click();assert.match(await pocket.locator('#card-number').textContent(),/1 \/ 1/);
 await pocket.locator('#tab-history').click();assert.equal(await pocket.locator('.history-entry').count(),1);assert(await page.locator('#sea-fusion').isVisible());
 for(const [width,height]of [[320,640],[390,844],[1440,900]]){await page.setViewportSize({width,height});await page.waitForTimeout(100);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));if(width>680){assert.equal(await page.locator('buzhi-pocket').count(),0);assert(await page.locator('.collection-summary').isVisible());assert.equal(await page.locator('#collection-grid .memory-card').count(),60)}}
 await page.setViewportSize({width:390,height:844});await pocket.locator('#pockets').waitFor();await page.screenshot({path:'test-results/collection-pocket-live.png',fullPage:true});assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
 const check=new DatabaseSync(dbPath);assert.equal(check.prepare('SELECT count(*) n FROM draws').get().n,1);check.close();
 console.log('PASS live pocket: 60-card catalog, real holdings/history/story, paging, modal filters, responsive desktop/fusion preservation, zero API writes');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{await browser?.close();if(server?.exitCode===null){const done=new Promise(r=>server.once('exit',r));server.kill();await done}rmSync(folder,{recursive:true,force:true})});
