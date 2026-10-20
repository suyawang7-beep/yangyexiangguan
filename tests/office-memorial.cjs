// Real isolated API and browser coverage; never accepts a production base URL.
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const {mkdtempSync,mkdirSync}=require('node:fs');
const {tmpdir}=require('node:os');
const {join,resolve}=require('node:path');
const {DatabaseSync}=require('node:sqlite');
const assert=require('node:assert/strict');
const folder=mkdtempSync(join(tmpdir(),'buzhi-office-memorial-')),dbPath=join(folder,'test.sqlite');
const port=51000+Math.floor(Math.random()*500),base='http://127.0.0.1:'+port,admin='isolated-office-memorial-admin-secret-00000000';
const slot='decor/checkin-memorial.webp',failures=[];let server,db,browser,logs='';
async function api(path,body,token){const r=await fetch(base+'/api/'+path,{method:body===undefined?'GET':'POST',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json()}}
async function check(name,fn){try{await fn();console.log('PASS '+name)}catch(e){failures.push(name);console.error('FAIL '+name+': '+e.stack)}}
async function account(name){const r=await api('register',{password:'Isolated-test-password-2026!',nickname:name});assert.equal(r.status,200);await require('./helpers/membership.cjs').verifyAccount(base,admin,r.data);return r.data}
async function userPage(account,width=1440,reducedMotion='no-preference'){
 const context=await browser.newContext({viewport:{width,height:1000},reducedMotion});await context.addInitScript(token=>{if(!sessionStorage.getItem('buzhi-online-token'))sessionStorage.setItem('buzhi-online-token',token)},account.token);
 const page=await context.newPage();page.on('pageerror',e=>failures.push('pageerror: '+e.message));return {page,context};
}
async function visit(page,path){await page.goto(base+path,{waitUntil:'networkidle'});await page.locator('[data-effects-ready="true"]').waitFor()}
async function write(page,task){await page.locator('[data-task="'+task+'"]').click();await page.locator('#task-writing').fill('这是只用于独立测试数据库的十五字以上真诚生日来信');const done=page.waitForResponse(r=>r.url().endsWith('/api/task-writing')&&r.request().method()==='POST');await page.locator('#task-code-form button[type=submit]').click();const r=await done;assert.equal(r.status(),200);await page.locator('#task-dialog').waitFor({state:'hidden'});return r.json()}
async function redeem(page,a,task){const code=(await api('admin/codes',{taskId:task,count:1},admin)).data.codes[0];if(task==='creative'){assert.equal((await api('redeem',{taskId:task,code},a.token)).status,200);await visit(page,'/office.html');return}await page.locator('[data-task="'+task+'"]').click();await page.locator('#task-code').fill(code);const done=page.waitForResponse(r=>r.url().endsWith('/api/redeem'));await page.locator('#task-code-form button[type=submit]').click();assert.equal((await done).status(),200);await page.locator('#task-dialog').waitFor({state:'hidden'})}
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
function records(){return Object.fromEntries(['users','ledger','tasks','task_writings','bonuses','checkins','draws'].map(t=>[t,db.prepare('SELECT * FROM '+t+' ORDER BY rowid').all()]))}
(async()=>{try{
 server=spawn(process.execPath,['server/index.mjs'],{cwd:resolve(__dirname,'..'),env:{...process.env,HOST:'127.0.0.1',PORT:String(port),DB_PATH:dbPath,ASSET_DIR:join(folder,'assets'),ADMIN_TOKEN:admin},stdio:['ignore','ignore','pipe']});server.stderr.on('data',c=>logs+=c);
 let ready=false;for(let i=0;i<100;i++){try{if((await fetch(base+'/health')).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,100))}assert(ready,logs);
 db=new DatabaseSync(dbPath);browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 await check('progress excludes arrival and retains historical daily letters',async()=>{
  const a=await account('历史进度测试');assert.equal((await api('me',undefined,a.token)).data.taskProgress?.completed,0,'Arrival is not a formal task');
  for(const task of ['letter:2000-01-01','letter:2000-01-02','quiz'])db.prepare('INSERT INTO tasks VALUES(?,?,?)').run(a.id,task,new Date().toISOString());
  const before=records(),profile=(await api('me',undefined,a.token)).data;assert.equal(profile.taskProgress.completed,2,'Old daily letters count as one historical task');assert(!profile.tasks.includes('letter:2000-01-01'));assert.deepEqual(records(),before,'Reading progress cannot change rewards or records');
 });
 await check('admin can upload and replace independent seven-day memorial artwork',async()=>{
  const {page,context}=await userPage(await account('素材保留测试'));await page.goto(base+'/admin/assets');await page.locator('#token').fill(admin);await page.locator('#enter').click();
  const option=page.locator('#assetSlot option[value="'+slot+'"]');assert.equal(await option.count(),1,'Memorial is a dedicated selectable asset');assert.match(await option.textContent(),/七日纪念卡/);
  await page.locator('#assetSlot').selectOption(slot);assert.match(await page.locator('#assetSlotGuide').textContent(),/签到/);assert.match(await page.locator('#assetSlotGuide').textContent(),/不.*卡池/);
  const before=records();
  for(const color of ['#99d8ef','#d5baf1']){
   const png=await page.evaluate(color=>{const c=document.createElement('canvas');c.width=300;c.height=400;const x=c.getContext('2d');x.fillStyle=color;x.fillRect(0,0,300,400);x.fillStyle='white';x.font='22px sans-serif';x.fillText('Seven days',70,210);return c.toDataURL('image/png').split(',')[1]},color);
   await page.locator('#assetFile').setInputFiles({name:'checkin-memorial.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});await page.locator('#assetUpload').click();await page.locator('#assetUploadStatus').getByText(/已上传/).waitFor();await page.locator('#assetUpload').waitFor({state:'visible'});await page.waitForFunction(()=>!document.querySelector('#assetUpload').disabled);
  }
  assert.equal((await api('admin/assets/versions?name='+encodeURIComponent(slot),undefined,admin)).data.length,1,'Replacement preserves previous artwork');assert.deepEqual(records(),before);
  assert.equal((await api('admin/assets/upload',{name:slot,base64:'AAAA'})).status,403);
  assert.equal((await api('assets-manifest')).data.assets[slot],true);assert.equal((await api('catalog')).data.cards.length,32,'Memorial never enters the draw pool');await context.close();
 });
 for(const width of [1440,390])await check('real milestone 3/6 celebration, once only, width '+width,async()=>{
  const a=await account('肥啾里程碑'+width),{page,context}=await userPage(a,width);await visit(page,'/office.html');
  assert.equal(await page.locator('.bird-journey').getAttribute('aria-valuenow'),'0');assert.equal(await page.locator('[data-milestone-celebration]').count(),0);
  for(const task of ['letter:2000-01-01','letter:2000-01-02','quiz'])db.prepare('INSERT INTO tasks VALUES(?,?,?)').run(a.id,task,new Date().toISOString());await visit(page,'/office.html');assert.equal(await page.locator('.bird-journey').getAttribute('aria-valuenow'),'2');
  const letter=await write(page,'letter');assert.equal(letter.taskProgress.completed,2,'A second day of the same task cannot inflate progress');assert.equal(await page.locator('[data-milestone-celebration]').count(),0);
  const third=await write(page,'memory');assert(third.bonuses.includes(3));assert.equal(third.coins,125,'Two 25-coin writings plus one existing 25-coin bonus');
  const surprise=page.locator('[data-milestone-celebration="3"]');await surprise.waitFor({timeout:5000});assert.match(await surprise.textContent(),/25/);assert.equal(await page.locator('.bird-journey').getAttribute('aria-valuenow'),'3');
  mkdirSync(resolve('test-results'),{recursive:true});await page.screenshot({path:resolve('test-results','milestone-'+width+'.png'),fullPage:true});await surprise.waitFor({state:'detached',timeout:6000});
  await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('[data-milestone-celebration]').count(),0,'Reload never replays an old reward');
  for(const task of ['creative','support','commission'])await redeem(page,a,task);
  await page.locator('[data-milestone-celebration="6"]').waitFor({timeout:5000});const last=(await api('me',undefined,a.token)).data;assert.equal(last.taskProgress.completed,6);assert.deepEqual(last.bonuses,[3,6]);assert.equal(last.coins,225,'Effects never mint an extra reward');
  await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('[data-milestone-celebration]').count(),0);
  await context.close();
 });
 await check('normal motion account switching cancels a pending reward',async()=>{
  const a=await account('等待惊喜时换号');for(const task of ['quiz','creative'])db.prepare('INSERT INTO tasks VALUES(?,?,?)').run(a.id,task,new Date().toISOString());
  const {page,context}=await userPage(a,390);await visit(page,'/office.html');await write(page,'memory');
  const b=await account('换号后没有奖励');await page.evaluate(t=>sessionStorage.setItem('buzhi-online-token',t),b.token);await visit(page,'/office.html');await page.waitForTimeout(1700);assert.equal(await page.locator('.bird-journey').getAttribute('aria-valuenow'),'0');assert.equal(await page.locator('[data-milestone-celebration]').count(),0);await context.close();
 });
 await check('historical progress above nine remains accessible without replay',async()=>{
  const a=await account('十一项历史进度');for(const task of ['letter','memory','quiz','creative','support','commission','wish','live','song','islander','party'])db.prepare('INSERT INTO tasks VALUES(?,?,?)').run(a.id,task,new Date().toISOString());
  const {page,context}=await userPage(a);await visit(page,'/office.html');assert.equal(await page.locator('.bird-journey').getAttribute('aria-valuenow'),'9');assert.match(await page.locator('.bird-journey').getAttribute('aria-valuetext'),/11/);await page.waitForTimeout(1700);assert.equal(await page.locator('[data-milestone-celebration]').count(),0);await context.close();
 });
 await check('reduced motion and account switching cannot replay another islander reward',async()=>{
  const a=await account('减少动态测试');for(const task of ['quiz','creative'])db.prepare('INSERT INTO tasks VALUES(?,?,?)').run(a.id,task,new Date().toISOString());
  const {page,context}=await userPage(a,390,'reduce');await visit(page,'/office.html');const profile=await write(page,'memory');assert(profile.bonuses.includes(3));assert.equal(await page.locator('[data-milestone-celebration]').count(),0);
  const b=await account('另一位进度零');await page.evaluate(t=>sessionStorage.setItem('buzhi-online-token',t),b.token);await visit(page,'/office.html');assert.equal(await page.locator('.bird-journey').getAttribute('aria-valuenow'),'0');assert.equal(await page.locator('[data-milestone-celebration]').count(),0);await context.close();
 });
 await check('memorial locked/unlocked display uses uploaded artwork without issuing cards',async()=>{
  const a=await account('七日纪念测试'),{page,context}=await userPage(a,390);await visit(page,'/checkin.html');const memorial=page.locator('[data-memorial-state]');assert.equal(await memorial.getAttribute('data-memorial-state'),'locked');const dimensions=await memorial.boundingBox();assert(dimensions.width>=200&&dimensions.height>dimensions.width,'Mobile memorial keeps a readable portrait card instead of the old tiny teaser');assert.equal(await memorial.locator('img').count(),1);assert.match(await memorial.locator('img').getAttribute('src'),/checkin-memorial\.webp/);
  const stamp=today();for(let i=0;i<7;i++){const date=new Date(stamp+'T12:00:00+08:00');date.setUTCDate(date.getUTCDate()-i);const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);db.prepare('INSERT INTO checkins VALUES(?,?)').run(a.id,day)}
  const before=records();await visit(page,'/checkin.html');assert.equal(await page.locator('[data-memorial-state]').getAttribute('data-memorial-state'),'unlocked');assert.deepEqual(records(),before,'Viewing a memorial never issues coins or cards');assert.equal((await api('me',undefined,a.token)).data.draws.length,0);
  await page.screenshot({path:resolve('test-results','memorial-390.png'),fullPage:true});await context.close();
 });
 if(failures.length)throw Error(failures.length+' office/memorial checks failed: '+failures.join('; '));
 }finally{await browser?.close();db?.close();if(server?.exitCode===null){const done=new Promise(r=>server.once('exit',r));server.kill();await done}}
})().catch(e=>{console.error(e);process.exitCode=1});
