// Public catalog UI uses disposable localhost data and a synthetic 46-card response.
const assert=require('node:assert/strict'),{spawn}=require('node:child_process'),{mkdtempSync,rmSync}=require('node:fs'),{tmpdir}=require('node:os'),{join}=require('node:path'),{chromium}=require('playwright');
let server,browser,logs='';const dir=mkdtempSync(join(tmpdir(),'buzhi-card-catalog-'));
(async()=>{
 const {availablePort}=await import('./helpers/port.mjs'),port=await availablePort(),base='http://127.0.0.1:'+port;
 server=spawn(process.execPath,['server/index.mjs'],{env:{...process.env,HOST:'127.0.0.1',PORT:String(port),DB_PATH:join(dir,'test.sqlite'),ASSET_DIR:join(dir,'assets'),ADMIN_TOKEN:'catalog-local-fixture-admin-000000000'},stdio:['ignore','ignore','pipe']});server.stderr.on('data',x=>logs+=x);
 let ready=false;for(let i=0;i<100;i++){try{if((await fetch(base+'/health')).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,100))}assert(ready,logs);
 const catalog=await (await fetch(base+'/api/catalog')).json();assert.equal(catalog.visibleCards,catalog.cards.length);assert(catalog.cards.every(c=>!c.unreleased));assert.equal(new Set(catalog.cards.map(c=>c.id)).size,catalog.visibleCards);
 // These names and rarities belong only to the browser fixture, never release data.
 const extra=[...Array.from({length:13},(_,i)=>33+i),50].map(n=>({id:'LOCK-'+n,previewId:'BZ-'+n,rarity:'N',name:'测试卡'+n,image:'/assets/cards/LOCK-'+n+'.webp',unreleased:false}));
 const fake={...catalog,cards:[...catalog.cards.slice(0,32),...extra],visibleCards:46,totalSlots:50};
 browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});const page=await browser.newPage();
 await page.route('**/api/catalog',r=>r.fulfill({contentType:'application/json',body:JSON.stringify(fake)}));
 await page.goto(base+'/draw.html',{waitUntil:'networkidle'});await page.locator('details summary').filter({hasText:'公开概率'}).click();
 assert.match(await page.locator('.draw-info').innerText(),/46张/,'normal pool follows catalog length');
 assert.match(await page.locator('.probability-list').innerText(),/N · 25 张/);assert.match(await page.locator('.probability-list').innerText(),/54\.348%/);
 await page.goto(base+'/collection.html',{waitUntil:'networkidle'});assert.match(await page.locator('.collection-summary').innerText(),/46/);assert.equal(await page.locator('.collection-grid .collection-item, .collection-grid .collection-card').count()||await page.locator('.collection-grid > *').count(),46);
 assert.match(await page.locator('.collection-grid').innerText(),/测试卡50/);
 await page.unroute('**/api/catalog');await page.goto(base+'/admin/cards',{waitUntil:'networkidle'});
 await page.locator('#token').fill('catalog-local-fixture-admin-000000000');await page.locator('#enter').click();await page.locator('#cardChoose option[value="LOCK-33"]').waitFor({state:'attached'});
 await page.locator('#cardChoose').selectOption('LOCK-33');await page.locator('#cardName').fill('后台浏览器测试卡');await page.locator('#cardRarity').selectOption('SSR');await page.locator('#cardForm button[type="submit"]').click();await page.locator('#cardStatus').filter({hasText:'已保存'}).waitFor();
 await page.locator('#cardChoose').selectOption('UR-1');await page.locator('#cardRarity').selectOption('SR');await page.locator('#cardForm button[type="submit"]').click();await page.waitForResponse(r=>new URL(r.url()).pathname==='/api/admin/cards'&&r.request().method()==='GET');
 const register=await fetch(base+'/api/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({nickname:'历史等级测试',password:'catalog-browser-fixture-password'})});const account=await register.json();
 const {DatabaseSync}=require('node:sqlite'),db=new DatabaseSync(join(dir,'test.sqlite'));db.prepare('INSERT INTO draws(user_id,card_id,rarity,created_at) VALUES(?,?,?,?)').run(db.prepare('SELECT id FROM users LIMIT 1').get().id,'UR-1','UR',new Date().toISOString());db.close();
 await page.addInitScript(t=>sessionStorage.setItem('buzhi-online-token',t),account.token);await page.goto(base+'/collection.html',{waitUntil:'networkidle'});
 assert.equal(await page.locator('#collection-grid [data-card="BZ-01"] .rarity').innerText(),'SR','current catalog updates original-card rarity');assert.equal(await page.locator('.history-row .rarity').innerText(),'UR','history retains recorded rarity');
 assert.equal(await page.locator('#collection-grid [data-card="BZ-33"] .rarity').innerText(),'SSR');assert.match(await page.locator('#collection-grid [data-card="BZ-33"]').innerText(),/后台浏览器测试卡/);
 assert(await page.locator('#collection-grid [data-card="BZ-33"] img[data-official-card]').evaluate(n=>n.complete&&n.naturalWidth>0),'packaged card artwork renders');
 await require('./helpers/membership.cjs').verifyAccount(base,'catalog-local-fixture-admin-000000000',account);
 const profile=await (await fetch(base+'/api/me',{headers:{authorization:'Bearer '+account.token}})).json();
 await page.goto(base+'/draw.html',{waitUntil:'networkidle'});
 // Model an administrator changing rarity after this page loaded. The confirmed
 // draw response must take precedence over the cached catalog used by the page.
 await page.route('**/api/draw',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({card:{id:'UR-1',rarity:'SSR'},profile:{...profile,coins:0,draws:[{card_id:'UR-1',rarity:'SSR',created_at:new Date().toISOString()},...profile.draws]}})}));
 await page.locator('#draw-button').click();await page.locator('#draw-result-label').filter({hasText:/^SSR ·/}).waitFor({timeout:6000});
 console.log('PASS catalog: server counts agree; 46-card draw probabilities and collection include non-contiguous BZ-50');
 console.log('PASS admin browser: edit name/rarity, render new artwork, keep historical rarity');
 console.log('PASS draw reveal uses server-confirmed rarity rather than stale catalog');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{if(browser)await browser.close();if(server){server.kill();await new Promise(r=>server.once('exit',r))}rmSync(dir,{recursive:true,force:true})});
