const assert=require('node:assert/strict'),{chromium}=require('playwright'),{spawn}=require('node:child_process'),{DatabaseSync}=require('node:sqlite'),{mkdtempSync,rmSync}=require('node:fs'),{tmpdir}=require('node:os'),{join}=require('node:path');
const {verifyAccount}=require('./helpers/membership.cjs');
const folder=mkdtempSync(join(tmpdir(),'commission-coin-')),dbPath=join(folder,'db.sqlite'),admin='commission-isolated-admin-000000000000',code='ISOLATED-COMMISSION-1314';let server,browser,db;
(async()=>{
 const {availablePort}=await import('./helpers/port.mjs'),port=await availablePort(),base='http://127.0.0.1:'+port;
 server=spawn(process.execPath,['server/index.mjs'],{env:{...process.env,NODE_ENV:'test',BUZHI_TEST_COIN_REDEMPTION_CODE:code,HOST:'127.0.0.1',PORT:String(port),DB_PATH:dbPath,ASSET_DIR:join(folder,'assets'),ADMIN_TOKEN:admin},stdio:'ignore'});
 for(let i=0;i<100;i++){try{if((await fetch(base+'/health')).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
 const account=await(await fetch(base+'/api/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({nickname:'委托兑换测试',password:'commission-isolated-password'})})).json();await verifyAccount(base,admin,account);
 db=new DatabaseSync(dbPath);for(const task of ['commission','support'])db.prepare('INSERT INTO tasks VALUES(?,?,?)').run(account.id,task,new Date().toISOString());
 const before=db.prepare('SELECT * FROM tasks ORDER BY rowid').all(),ledgerBefore=db.prepare('SELECT count(*) n FROM ledger').get().n;
 browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 const context=await browser.newContext({viewport:{width:390,height:900},reducedMotion:'reduce'});await context.addInitScript(t=>sessionStorage.setItem('buzhi-online-token',t),account.token);const page=await context.newPage();
 await page.goto(base+'/office.html',{waitUntil:'networkidle'});
 assert.equal(await page.locator('[data-task="support"]').count(),0,'support redemption entry is removed');
 assert.equal(await page.locator('#main').getByText('直播应援',{exact:true}).count(),0);
 await page.locator('[data-task="commission"]').click();await page.locator('#task-code').fill(code);
 const redeemed=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/redeem-coin-code');await page.locator('#task-code-form button[type=submit]').click();const response=await redeemed;assert.equal(response.status(),200);const result=await response.json();assert.equal(result.amount,131.4);assert.equal(result.remainingUses,39);assert.equal(result.profile.coins,181.4);
 await page.locator('#task-dialog').waitFor({state:'hidden'});await page.locator('[data-task="commission"]').click();await page.locator('#task-code').fill(code);
 const duplicate=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/redeem-coin-code');await page.locator('#task-code-form button[type=submit]').click();assert.equal((await duplicate).status(),409);
 assert.equal(db.prepare('SELECT count(*) n FROM ledger').get().n,ledgerBefore+1);assert.deepEqual(db.prepare('SELECT * FROM tasks ORDER BY rowid').all(),before);
 await page.setViewportSize({width:1440,height:1000});await page.locator('[data-close-dialog]').click();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.goto(base+'/legacy#/office',{waitUntil:'networkidle'});assert.equal(await page.locator('[data-task="support"]').count(),0);assert.equal(await page.locator('.bz-office-main #coinCodeForm').count(),1,'legacy redemption is inside temporary commission');assert.match(await page.locator('.bz-coin-code-panel').innerText(),/临时委托/);
 console.log('PASS commission 131.4 redemption, previous task completion, duplicate rejection, removed support entry, legacy placement and preserved history');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{await browser?.close();db?.close();if(server?.exitCode===null){const done=new Promise(r=>server.once('exit',r));server.kill();await done}rmSync(folder,{recursive:true,force:true})});
