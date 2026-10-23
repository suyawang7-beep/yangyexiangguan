// New passport membership dialog only; all accounts/data are disposable localhost fixtures.
const {chromium}=require('playwright'),{spawn}=require('node:child_process'),{mkdtempSync,rmSync,mkdirSync}=require('node:fs'),{tmpdir}=require('node:os'),{join}=require('node:path'),{DatabaseSync}=require('node:sqlite'),assert=require('node:assert/strict');
const folder=mkdtempSync(join(tmpdir(),'buzhi-membership-dialog-')),dbPath=join(folder,'test.sqlite'),admin='isolated-dialog-admin-0000000000000000';
let server,browser,db,logs='',base;
async function api(path,body,token){const r=await fetch(base+'/api/'+path,{method:body===undefined?'GET':'POST',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});assert.equal(r.status,200,path);return r.json()}
function records(){return Object.fromEntries(['users','ledger','tasks','draws','checkins','bonuses'].map(t=>[t,db.prepare('SELECT * FROM '+t+' ORDER BY rowid').all()]))}
(async()=>{
 const {availablePort}=await import('./helpers/port.mjs');const port=await availablePort();base='http://127.0.0.1:'+port;
 server=spawn(process.execPath,['server/index.mjs'],{env:{...process.env,HOST:'127.0.0.1',PORT:String(port),DB_PATH:dbPath,ASSET_DIR:join(folder,'assets'),ADMIN_TOKEN:admin},stdio:['ignore','ignore','pipe']});server.stderr.on('data',x=>logs+=x);
 let ready=false;for(let i=0;i<100;i++){try{if((await fetch(base+'/health')).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,100))}assert(ready,logs);db=new DatabaseSync(dbPath);
 browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 for(const width of [390,1440]){
  const account=await api('register',{nickname:'弹窗老岛民'+width,password:'isolated-dialog-password-2026'}),context=await browser.newContext({viewport:{width,height:900}}),errors=[];
  await context.addInitScript(t=>sessionStorage.setItem('buzhi-online-token',t),account.token);const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/passport.html',{waitUntil:'networkidle'});assert.equal(await page.locator('#openMembershipDialog').count(),1,'one entry across initial status and profile redraw');
  assert.equal(await page.locator('#membershipApplication').evaluate(n=>n.open),false,'returning visitors choose when to open');await page.locator('#openMembershipDialog').click();await page.locator('#membershipApplyForm').waitFor();
  await page.locator('#douyinId').fill('dialog_'+width);await page.locator('#membershipNote').fill('刷新前保留这段输入');
  for(let i=0;i<2;i++){const response=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/membership');await page.locator('#membershipApplication').getByRole('button',{name:'刷新认证状态'}).click();await response}
  assert.equal(await page.locator('#douyinId').inputValue(),'dialog_'+width);assert.equal(await page.locator('#openMembershipDialog').count(),1);
  const before=records();await page.locator('#submitMembership').click();await page.locator('#membershipApplicationStatus').filter({hasText:'待审核'}).waitFor();assert.deepEqual(records(),before,'applying never recreates accounts or grants coins');
  const membership=await api('membership',undefined,account.token);assert.match(await page.locator('#membershipVerificationCode').textContent(),/^BZV-/);
  await api('admin/memberships/review',{userId:account.id,action:'reject',confirmed:true,verificationCode:membership.verificationCode,note:'定向验收的审核反馈'},admin);
  await page.locator('#membershipApplication').getByRole('button',{name:'刷新认证状态'}).click();await page.locator('#membershipApplication').getByText('定向验收的审核反馈',{exact:false}).waitFor();
  await page.locator('#submitMembership').click();await page.locator('#membershipApplicationStatus').filter({hasText:'待审核'}).waitFor();const revised=await api('membership',undefined,account.token);
  await api('admin/memberships/review',{userId:account.id,action:'approve',confirmed:true,verificationCode:revised.verificationCode,note:'弹窗隔离验收'},admin);
  await page.locator('#membershipApplication').getByRole('button',{name:'刷新认证状态'}).click();await page.locator('#membershipApplicationStatus').filter({hasText:'已认证'}).waitFor();assert.equal(await page.locator('#membershipApplyForm').count(),0);
  await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('#membershipApplication').evaluate(n=>n.open),false);assert.deepEqual(records(),before);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);await context.close();

  const fresh=await browser.newPage({viewport:{width,height:900}});fresh.on('pageerror',e=>errors.push(e.message));await fresh.goto(base+'/passport.html',{waitUntil:'networkidle'});
  await fresh.locator('#nickname').fill('新岛民弹窗'+width);await fresh.locator('#passport-form input[name=password]').fill('new-islander-dialog-password');await fresh.locator('#passport-form button[type=submit]').click();
  await fresh.locator('#recovery-once[open]').waitFor();assert.equal(await fresh.locator('#membershipApplication').evaluate(n=>n.open),false,'credential saving has priority');
  await fresh.locator('#recovery-saved').click();await fresh.locator('#membershipApplication[open]').waitFor();assert.equal(await fresh.locator('#openMembershipDialog').count(),1);
  assert(await fresh.locator('#douyinId').isVisible());assert(await fresh.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));mkdirSync('test-results/membership-dialog',{recursive:true});await fresh.screenshot({path:'test-results/membership-dialog/'+width+'.png',fullPage:true});
  await fresh.locator('[aria-label="关闭认证弹窗"]').click();await fresh.goto(base+'/office.html',{waitUntil:'networkidle'});await fresh.locator('#membershipNotice a').click();await fresh.waitForURL('**/passport.html#membershipApplication');await fresh.locator('#membershipApplication[open]').waitFor();
  assert.deepEqual(errors,[]);await fresh.close();console.log('PASS dialog: registration/credentials order, one entry, draft, apply/review, verified no reapply, cross-page link, unchanged records, width '+width);
 }
 const first=await api('register',{nickname:'切换前账号',password:'dialog-account-switch-password'}),second=await api('register',{nickname:'切换后账号',password:'dialog-account-switch-password'});
 const switching=await browser.newPage();await switching.addInitScript(t=>sessionStorage.setItem('buzhi-online-token',t),first.token);await switching.goto(base+'/verify.html',{waitUntil:'networkidle'});
 let release,seen;const held=new Promise(r=>seen=r),gate=new Promise(r=>release=r);
 await switching.route('**/api/membership/apply',async route=>{const result=await route.fetch();seen();await gate;await route.fulfill({response:result})});
 await switching.locator('#douyinId').fill('only_first_account');await switching.locator('#submitMembership').click();await held;
 await switching.evaluate(token=>{sessionStorage.setItem('buzhi-online-token',token);document.dispatchEvent(new Event('buzhi:render'))},second.token);
 await switching.locator('#membershipApplicationStatus').filter({hasText:'尚未申请'}).waitFor();await switching.locator('#douyinId').fill('second_account_draft');
 const late=switching.waitForResponse(r=>new URL(r.url()).pathname==='/api/membership/apply');release();await late;assert.equal(await switching.locator('#douyinId').inputValue(),'second_account_draft');assert.equal(await switching.locator('#membershipVerificationCode').count(),0);
 assert.equal((await api('membership',undefined,second.token)).status,'visitor');await switching.close();console.log('PASS account switching ignores a previous account application response');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{await browser?.close();db?.close();if(server?.exitCode===null){const done=new Promise(r=>server.once('exit',r));server.kill();await done}rmSync(folder,{recursive:true,force:true})});
