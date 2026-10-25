const assert=require('node:assert/strict'),{chromium}=require('playwright'),{spawn}=require('node:child_process'),{DatabaseSync}=require('node:sqlite'),{mkdtempSync,rmSync}=require('node:fs'),{tmpdir}=require('node:os'),{join}=require('node:path');
const folder=mkdtempSync(join(tmpdir(),'card-profile-')),dbPath=join(folder,'db.sqlite');let server,browser,release=()=>{};
(async()=>{
 const {availablePort}=await import('./helpers/port.mjs'),port=await availablePort(),base='http://127.0.0.1:'+port;
 server=spawn(process.execPath,['server/index.mjs'],{env:{...process.env,HOST:'127.0.0.1',PORT:String(port),DB_PATH:dbPath,ADMIN_TOKEN:'card-profile-loading-fixture-0000000000'},stdio:'ignore'});
 for(let i=0;i<100;i++){try{if((await fetch(base+'/health')).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
 const account=await(await fetch(base+'/api/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({nickname:'历史抽卡加载测试',password:'isolated-profile-password'})})).json();
 const db=new DatabaseSync(dbPath);db.prepare('INSERT INTO draws(user_id,card_id,rarity,created_at) VALUES(?,?,?,?)').run(account.id,'SR-1','SR',new Date().toISOString());db.close();
 browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 const page=await browser.newPage();await page.addInitScript(t=>sessionStorage.setItem('buzhi-online-token',t),account.token);
 const gate=new Promise(r=>release=r);await page.route('**/api/catalog',async route=>{await gate;await route.continue()});
 await page.goto(base+'/draw.html',{waitUntil:'domcontentloaded'});await page.locator('#draw-button').waitFor();
 release();await page.waitForLoadState('networkidle');await page.locator('#draw-pool-description').filter({hasText:'60张'}).waitFor({timeout:3000});
 await page.goto(base+'/collection.html',{waitUntil:'networkidle'});assert.equal(await page.locator('.history-row').count(),1);
 console.log('PASS account loaded before catalog preserves historical draw and normal-pool explanation');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{release();await browser?.close();if(server?.exitCode===null){const done=new Promise(r=>server.once('exit',r));server.kill();await done}rmSync(folder,{recursive:true,force:true})});
