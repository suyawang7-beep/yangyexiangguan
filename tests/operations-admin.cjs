const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const {mkdtempSync,rmSync,readFileSync}=require('node:fs');
const {tmpdir}=require('node:os');
const {join}=require('node:path');
const {DatabaseSync}=require('node:sqlite');
const assert=require('node:assert/strict');
const folder=mkdtempSync(join(tmpdir(),'buzhi-operations-ui-'));
const port=53500+Math.floor(Math.random()*1000),base='http://127.0.0.1:'+port;
const secret='isolated-operations-ui-admin-secret-0000000';
const server=spawn(process.execPath,['server/index.mjs'],{cwd:join(__dirname,'..'),env:{...process.env,HOST:'127.0.0.1',PORT:String(port),DB_PATH:join(folder,'db.sqlite'),ADMIN_TOKEN:secret},stdio:['ignore','ignore','pipe']});
let browser,logs='';server.stderr.on('data',c=>logs+=c);
(async()=>{
 let ready=false;for(let i=0;i<60;i++){try{if((await fetch(base+'/health')).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,100))}assert(ready,logs);
 const account=await fetch(base+'/api/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password:'Isolated-test-password-2026!',nickname:'下载验收'})}).then(r=>r.json());
 browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:900},acceptDownloads:true});
  await page.goto(base+'/admin/backups');await page.locator('#token').fill(secret);await page.locator('#enter').click();await page.locator('#operationsPanel').waitFor({timeout:3000});
  await page.locator('#createBackup').click();await page.locator('#operationsStatus').getByText(/已创建/).waitFor();
  const [snapshot]=await Promise.all([page.waitForEvent('download'),page.locator('#backupRows button').first().click()]);
  assert.match(snapshot.suggestedFilename(),/^manual-.*\.sqlite$/);const file=join(folder,'download-'+width+'.sqlite');await snapshot.saveAs(file);
  const db=new DatabaseSync(file,{readOnly:true});assert.equal(db.prepare('SELECT nickname FROM users WHERE id=?').get(account.id).nickname,'下载验收');db.close();
  const [operations]=await Promise.all([page.waitForEvent('download'),page.locator('#exportOperations').click()]);
  assert.match(operations.suggestedFilename(),/^buzhi-operations-.*\.json$/);const json=join(folder,'export-'+width+'.json');await operations.saveAs(json);
  const data=JSON.parse(readFileSync(json,'utf8'));assert.equal(data.data.users[0].id,account.id);assert.equal(data.data.users[0].coins,50);assert(!Object.hasOwn(data.data.users[0],'secret_hash'));
  await page.locator('#adminRouteLogout').click();assert.equal(await page.locator('#operationsPanel').isVisible(),false);await page.close();
 }
 console.log('PASS desktop/mobile admin snapshot creation, actual SQLite download/open, credential-free JSON download and logout visibility');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{await browser?.close();if(server.exitCode===null){const done=new Promise(r=>server.once('exit',r));server.kill();await done;}rmSync(folder,{recursive:true,force:true})});
