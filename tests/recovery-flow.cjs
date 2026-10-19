// Regression: admin-delivered credentials must work in the real returning-islander form.
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const {mkdtempSync,readFileSync}=require('node:fs');
const {tmpdir}=require('node:os');
const {join,resolve}=require('node:path');
const {DatabaseSync}=require('node:sqlite');
const assert=require('node:assert/strict');
const {createHash,randomUUID}=require('node:crypto');
const root=resolve(__dirname,'..'),folder=mkdtempSync(join(tmpdir(),'buzhi-recovery-'));
const dbPath=join(folder,'isolated.sqlite'),port=53000+Math.floor(Math.random()*800),base='http://127.0.0.1:'+port;
const admin='isolated-recovery-admin-secret-0000000000';
let browser,db,server,logs='';
async function api(path,body,token){const r=await fetch(base+'/api/'+path,{method:body===undefined?'GET':'POST',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json()}}
function preserved(){return Object.fromEntries(['ledger','tasks','draws','checkins','codes','bonuses','memberships','admin_coin_grants'].map(t=>[t,db.prepare('SELECT * FROM '+t+' ORDER BY rowid').all()]))}
async function start(){server=spawn(process.execPath,['server/index.mjs'],{cwd:root,env:{...process.env,HOST:'127.0.0.1',PORT:String(port),DB_PATH:dbPath,ADMIN_TOKEN:admin,ASSET_DIR:join(folder,'assets')},stdio:['ignore','ignore','pipe']});server.stderr.on('data',c=>logs+=c);for(let i=0;i<100;i++){try{if((await fetch(base+'/health')).ok)return}catch{}await new Promise(r=>setTimeout(r,100))}throw Error(logs)}
async function stop(){if(server&&server.exitCode===null){const done=new Promise(r=>server.once('exit',r));server.kill();await done}}
(async()=>{try{
 await start();db=new DatabaseSync(dbPath);
 const a=(await api('register',{nickname:'找回测试岛民'})).data,b=(await api('register',{nickname:'另一位岛民'})).data;
 const {verifyAccount}=require('./helpers/membership.cjs');await verifyAccount(base,admin,a);
 assert.equal((await api('checkin',{},a.token)).status,200);assert.equal((await api('draw',{},a.token)).status,200);
 assert.equal((await api('admin/coins/grant',{userId:a.id,amount:25,reason:'隔离测试赠送记录',requestId:randomUUID()},admin)).status,200);
 assert.equal((await api('admin/codes',{taskId:'live',count:1},admin)).status,200);
 db.prepare('INSERT INTO bonuses(user_id,threshold) VALUES(?,?)').run(a.id,3);
 const before=preserved(),profile=(await api('me',undefined,a.token)).data;
 const payload={userId:a.id,confirmed:true,note:'隔离数据库身份核验测试'};
 assert.equal((await api('admin/islanders/reset-key',payload,a.token)).status,403);
 assert.equal((await api('admin/islanders/reset-key',{...payload,confirmed:false},admin)).status,400);
 assert.equal((await api('me',undefined,a.token)).status,200);
 const reset=await api('admin/islanders/reset-key',payload,admin);assert.equal(reset.status,200);
 const key=reset.data.recoveryKey;assert.match(key,/^[A-Za-z0-9_-]{43}$/);
 assert.equal(db.prepare('SELECT secret_hash FROM users WHERE id=?').get(a.id).secret_hash,createHash('sha256').update(key).digest('hex'));
 assert.notEqual(db.prepare('SELECT secret_hash FROM users WHERE id=?').get(a.id).secret_hash,key);
 assert.equal((await api('login',{id:a.id,recoveryKey:key})).status,200,'Raw reset API key works');
 assert.equal((await api('login',{id:a.id,recoveryKey:a.recoveryKey})).status,401);
 assert.equal((await api('me',undefined,a.token)).status,401,'Old sessions revoked');
 assert.equal((await api('me',undefined,b.token)).status,200,'Other accounts retain sessions');
 assert.deepEqual(preserved(),before,'Reset preserves membership, coins, tasks and draws');
 assert(!JSON.stringify(db.prepare('SELECT * FROM admin_audit').all()).includes(key),'Audit excludes plaintext key');
 await stop();await start();assert.equal((await api('login',{id:a.id,recoveryKey:key})).status,200,'Reset persists across restart');
 console.log('PASS: reset hashing, persistence, old-key/session rejection, authorization and data preservation');
 browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 const context=await browser.newContext({permissions:['clipboard-read','clipboard-write']});
 // Existing static-file routes assume POSIX paths. On Windows only, serve the same
 // unmodified public source files through Playwright; all APIs still use the real server.
 if(process.platform==='win32')await context.route(base+'/**',async route=>{const p=new URL(route.request().url()).pathname;if(p==='/passport.html'){let html=readFileSync(join(root,'ui-preview/passport.html'),'utf8').replace('<head>','<head><script>window.__BUZHI_PRODUCTION__=true</script>').replace('</head>','<script src="/membership-client.js" defer></script></head>');return route.fulfill({contentType:'text/html',body:html})}if(/^\/[\w-]+\.(js|css)$/.test(p)&&p!=='/membership-client.js')return route.fulfill({path:join(root,'ui-preview',p.slice(1))});return route.continue()});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.goto(base+'/admin/recovery');await page.locator('#token').fill(admin);await page.locator('#enter').click();await page.locator('#islanderSearchText').waitFor({state:'visible'});
 await page.locator('#islanderSearchText').fill(a.id);await page.locator('#islanderSearchButton').click();await page.getByRole('button',{name:'账户找回',exact:true}).click();
 await page.locator('#islanderRecoveryConfirmed').check();await page.locator('#islanderRecoveryNote').fill(payload.note);
 const response=page.waitForResponse(r=>r.url().endsWith('/api/admin/islanders/reset-key')&&r.request().method()==='POST');await page.locator('#islanderResetKey').click();const out=await (await response).json();
 await page.waitForFunction(()=>document.querySelector('#islanderRecoveryResult').textContent.includes('旧密钥'));
 assert.equal((await api('login',{id:a.id,recoveryKey:key})).status,401,'A second reset invalidates the previously reset key');
 const rendered=await page.locator('#islanderRecoveryResult').textContent();
 assert(!rendered.includes('\\n'),'Admin credential output must not contain literal backslash-n around the key');
 const delivered=await page.locator('#islanderRecoveryKey').inputValue();assert.equal(delivered,out.recoveryKey,'Selectable field contains only the key');
 await page.locator('#islanderRecoveryCopy').click();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),delivered,'Copy button excludes labels and warnings');
 await page.goto(base+'/passport.html');await page.locator('#passport-returning-tab').click();await page.locator('#returning-id').fill(a.id);await page.locator('#returning-key').fill(delivered);
 const request=page.waitForRequest(r=>r.url().endsWith('/api/login')&&r.method()==='POST');const loginResponse=page.waitForResponse(r=>r.url().endsWith('/api/login'));
 await page.locator('#live-login button[type=submit]').click();assert.deepEqual((await request).postDataJSON(),{id:a.id,recoveryKey:delivered});const logged=await loginResponse;assert.equal(logged.status(),200);assert.deepEqual((await logged.json()).profile,profile);
 assert.deepEqual(preserved(),before);assert.deepEqual(errors,[]);
 console.log('PASS: admin reset UI -> exact key copy -> returning-islander frontend -> login 200; original data preserved');
 }finally{if(browser)await browser.close();if(db)db.close();await stop()}
})().catch(e=>{console.error(e);process.exitCode=1});
