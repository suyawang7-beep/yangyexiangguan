// Real disposable local data. Never contacts a deployed service or production database.
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {mkdtempSync,rmSync,mkdirSync}=require('node:fs');
const {tmpdir}=require('node:os');
const {join}=require('node:path');
const {randomUUID}=require('node:crypto');
const {chromium}=require('playwright');
const {DatabaseSync}=require('node:sqlite');
const {verifyAccount}=require('./helpers/membership.cjs');
const folder=mkdtempSync(join(tmpdir(),'buzhi-journal-'));
const admin='journal-local-admin-000000000000000000';
let server,browser,base,logs='';
async function api(path,body,token){
 const r=await fetch(base+'/api/'+path,{method:body===undefined?'GET':'POST',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});
 assert.equal(r.status,200,path+': '+r.status);return r.json();
}
(async()=>{
 const {availablePort}=await import('./helpers/port.mjs'),port=await availablePort();base='http://127.0.0.1:'+port;
 server=spawn(process.execPath,['server/index.mjs'],{env:{...process.env,HOST:'127.0.0.1',PORT:String(port),DB_PATH:join(folder,'test.sqlite'),ASSET_DIR:join(folder,'assets'),ADMIN_TOKEN:admin},stdio:['ignore','ignore','pipe']});server.stderr.on('data',x=>logs+=x);
 let ready=false;for(let i=0;i<100;i++){try{if((await fetch(base+'/health')).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,100))}assert(ready,logs);
 const account=await api('register',{nickname:'海风与贝壳的小岛民',password:'journal-disposable-password'});await verifyAccount(base,admin,account);
 await api('checkin',{},account.token);await api('draw',{},account.token);
 for(let i=0;i<5;i++)await api('admin/island-mail/send',{userId:account.id,kind:'coins',amount:7,title:'海风来信 '+i,message:i===0?'<img src=x onerror=alert(1)> 是信件里的原文':'今天的海风很轻，把这份小小的心意留给你。',requestId:randomUUID()},admin);
 await api('admin/island-mail/send',{userId:account.id,kind:'item',itemName:'海边拾到的贝壳',title:'给你的纪念',message:'收藏今天的小小惊喜',requestId:randomUUID()},admin);
 const before=await api('me',undefined,account.token),catalog=await api('catalog');
 browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});mkdirSync('test-results/resident-journal',{recursive:true});
 for(const width of [1440,768,390,320]){
  const context=await browser.newContext({viewport:{width,height:960},hasTouch:width<=390}),page=await context.newPage(),errors=[],writes=[];
  page.setDefaultTimeout(5000);page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()!=='GET')writes.push(r.url())});
  if(width===1440)await page.route('**/resident-journal.js*',async route=>{await new Promise(resolve=>setTimeout(resolve,600));await route.continue()});
  await context.addInitScript(t=>sessionStorage.setItem('buzhi-online-token',t),account.token);
  await page.goto(base+'/resident.html',{waitUntil:'networkidle'});
  await page.locator('#journal-identity').waitFor();
  assert.equal(await page.locator('#journal-coins').innerText(),String((await api('me',undefined,account.token)).coins),'identity uses actual balance');
  assert.equal(await page.locator('#journal-owned').innerText(),'1','collection counts unique owned cards');
  assert.equal(await page.locator('#journal-total').innerText(),String(catalog.cards.length),'collection uses live catalog size');
  assert.equal(await page.locator('#journal-checkin').innerText(),'今日已签到');
  assert.equal(await page.locator('#journal-collection .journal-memory').count(),1,'only owned cards are displayed');
  assert.equal(await page.locator('#journal-journey time').count(),4,'registration, latest approval, first checkin and first draw use stored timestamps');
  const times=await page.locator('#journal-journey time').evaluateAll(nodes=>nodes.map(n=>n.dateTime));assert(times.includes(before.created_at));assert(times.includes(before.draws[0].created_at));
  assert(!await page.locator('#journal-journey').innerText().then(t=>t.includes('首次认证')),'does not invent first-ever certification');
  assert.equal(await page.locator('#island-mail-list article:visible').count(),3);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),width+': no horizontal overflow');
  const boxes=await page.evaluate(()=>Object.fromEntries(['journal-identity','journal-welcome','island-mail-panel','journal-collection'].map(id=>{const b=document.getElementById(id).getBoundingClientRect();return [id,{x:b.x,y:b.y,right:b.right,bottom:b.bottom}]})));
  if(width<=680){assert(boxes['journal-identity'].y<boxes['journal-welcome'].y,'mobile identity first');assert(boxes['island-mail-panel'].bottom<=boxes['journal-collection'].y,'mobile mail before collection');assert(boxes['island-mail-panel'].y<960,'mail starts within initial mobile screen');}
  if(width>=1100){assert(boxes['journal-welcome'].right<=boxes['journal-identity'].x,'desktop asymmetric opening');assert(Math.abs(boxes['island-mail-panel'].y-boxes['journal-collection'].y)<2,'desktop mail and collection share a row');}
  assert.deepEqual(writes,[],'opening the journal cannot mutate rewards');
  await page.locator('#journal-collection').scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>[...document.querySelectorAll('.journal-memory img')].every(image=>image.complete));
  await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:'test-results/resident-journal/resident-'+width+'.png',fullPage:true});
  if(width===390){
   await page.locator('#island-mail-list article button').first().click();await page.waitForFunction(()=>document.querySelector('#island-items-list').textContent.includes('海边拾到的贝壳'));
   await page.locator('#island-mail-list article button').first().click();await page.waitForFunction(n=>document.querySelector('#journal-coins').textContent===String(n),before.coins+7);
   assert.equal((await api('me',undefined,account.token)).coins,before.coins+7);
   assert.equal(await page.locator('#island-mail-list img').count(),0,'mail remains literal text');
   await page.locator('#mail-stack-toggle').click();assert.equal(await page.locator('#island-mail-list article:visible').count(),6);
   await page.locator('[data-tab="works"]').click();await page.locator('#title').fill('小岛日记');await page.locator('#body').fill('只存在于一次性本地数据库的故事。');await page.locator('[data-status="draft"]').click();await page.locator('#work-list').getByText('小岛日记',{exact:true}).waitFor();
   assert.equal((await api('resident',undefined,account.token)).works[0].title,'小岛日记');
   const now=await api('me',undefined,account.token);for(const key of ['tasks','checkins','draws','bonuses'])assert.deepEqual(now[key],before[key],key+' unchanged');
   await page.emulateMedia({reducedMotion:'reduce'});assert(await page.locator('#journal-collection').evaluate(el=>getComputedStyle(el).animationName==='none'));
  }
  assert.deepEqual(errors,[]);await context.close();console.log('PASS journal real data, hierarchy and preserved actions: '+width);
 }
 const empty=await api('register',{nickname:'小岛的新朋友',password:'journal-empty-password'});await verifyAccount(base,admin,empty);
 const context=await browser.newContext({viewport:{width:320,height:844}});await context.addInitScript(t=>sessionStorage.setItem('buzhi-online-token',t),empty.token);const p=await context.newPage();
 await p.goto(base+'/resident.html',{waitUntil:'networkidle'});assert.equal(await p.locator('#journal-owned').innerText(),'0');assert.equal(await p.locator('.journal-memory').count(),0);assert.equal(await p.locator('#journal-journey time').count(),2);assert.match(await p.locator('#journal-collection').innerText(),/第一张|等待/);
 await p.route('**/api/catalog',r=>r.fulfill({status:503,json:{error:'暂不可用'}}));await p.reload({waitUntil:'networkidle'});assert.match(await p.locator('#journal-collection').innerText(),/暂时|重试/);assert.equal(await p.locator('#journal-total').innerText(),'—','failed catalog must not invent total');await p.unroute('**/api/catalog');await p.locator('#journal-retry').click();await p.waitForFunction(()=>document.querySelector('#journal-total').textContent==='60');
 await p.route('**/api/me',async r=>{const response=await r.fetch(),data=await response.json();data.nickname='<img src=x onerror=alert(1)>'.repeat(4);await r.fulfill({json:data})});await p.reload({waitUntil:'networkidle'});assert.equal(await p.locator('#journal-identity img').count(),0);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'hostile/long nickname remains contained');await context.close();
 for(const verified of [false,null]){const c=await browser.newContext();if(verified===false){const visitor=await api('register',{nickname:'未认证',password:'journal-unverified-password'});await c.addInitScript(t=>sessionStorage.setItem('buzhi-online-token',t),visitor.token)}const page=await c.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/resident.html',{waitUntil:'networkidle'});assert(await page.locator('#center').isHidden());assert(await page.locator('#entry').isVisible());assert.deepEqual(errors,[],'logged-out and unverified pages remain usable');await c.close()}
 // Extra isolated fixture records exercise duplicate ownership and the three-card stage.
 // These rows belong only to this temporary test database, never a live islander.
 const db=new DatabaseSync(join(folder,'test.sqlite'));
 for(const id of ['LOCK-33','LOCK-34','LOCK-35','LOCK-33'])db.prepare('INSERT INTO draws(user_id,card_id,rarity,created_at) VALUES(?,?,?,?)').run(account.id,id,catalog.cards.find(c=>c.id===id).rarity,new Date().toISOString());db.close();
 const visual=await browser.newContext({viewport:{width:1440,height:1050},reducedMotion:'reduce'});await visual.addInitScript(t=>sessionStorage.setItem('buzhi-online-token',t),account.token);const preview=await visual.newPage();await preview.goto(base+'/resident.html',{waitUntil:'networkidle'});
 assert.equal(await preview.locator('.journal-memory').count(),3);assert.equal(await preview.locator('#journal-owned').innerText(),String(new Set((await api('me',undefined,account.token)).draws.map(d=>d.card_id)).size),'duplicate draws do not inflate ownership');
 for(const width of [1440,390]){await preview.setViewportSize({width,height:1050});await preview.locator('#journal-collection').scrollIntoViewIfNeeded();await preview.waitForFunction(()=>[...document.querySelectorAll('.journal-memory img')].every(image=>image.complete));await preview.evaluate(()=>scrollTo(0,0));await preview.screenshot({path:'test-results/resident-journal/preview-'+width+'.png',fullPage:true});await preview.screenshot({path:'test-results/resident-journal/preview-top-'+width+'.png'});}
 await visual.close();
 console.log('PASS journal empty/error/retry, literal long names, membership isolation and reduced motion');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{await browser?.close();if(server?.exitCode===null){const done=new Promise(r=>server.once('exit',r));server.kill();await done}rmSync(folder,{recursive:true,force:true})});
