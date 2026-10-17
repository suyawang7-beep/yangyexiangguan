import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {strict as assert} from 'node:assert';
import {chromium} from 'playwright';
const dir=mkdtempSync(join(tmpdir(),'buzhi-api-'));
const PORT=44000+Math.floor(Math.random()*1000),root='http://127.0.0.1:'+PORT;
const processServer=spawn(process.execPath,['server/index.mjs'],{cwd:new URL('..',import.meta.url).pathname,env:{...process.env,PORT:String(PORT),ADMIN_TOKEN:'test-only-secret-not-for-production-0000',DB_PATH:join(dir,'test.sqlite')},stdio:['ignore','pipe','pipe']});
let logs='';processServer.stderr.on('data',d=>logs+=d);
async function api(path,body,token){const res=await fetch(root+'/api/'+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});return {status:res.status,data:await res.json()}}
let browser;
try{
let ready=false;for(let i=0;i<50;i++){try{const res=await fetch(root+'/health');if(res.ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,100))}
assert(ready,'server did not start: '+logs);
const admin='test-only-secret-not-for-production-0000';
let c=await api('admin/codes',{taskId:'letter',count:1},admin);assert.equal(c.status,200);
let reg=await api('register',{nickname:'远程测试岛民'});assert.equal(reg.status,200);const {id,recoveryKey,token}=reg.data;assert.equal(reg.data.profile.coins,0);
let bad=await api('redeem',{taskId:'letter',code:'wrong'},token);assert.equal(bad.status,400);
let red=await api('redeem',{taskId:'letter',code:c.data.codes[0]},token);assert.equal(red.status,200);assert.equal(red.data.coins,25);
let again=await api('redeem',{taskId:'letter',code:c.data.codes[0]},token);assert.notEqual(again.status,200);
let sign=await api('checkin',{},token);assert.equal(sign.data.coins,35);
let duplicate=await api('checkin',{},token);assert.equal(duplicate.status,409);
let insufficient=await api('draw',{},token);assert.equal(insufficient.status,409);
let login=await api('login',{id,recoveryKey});assert.equal(login.status,200);assert.equal(login.data.profile.coins,35);
browser=await chromium.launch({headless:true});
const page=await browser.newPage();
page.on('pageerror',e=>{throw e});
await page.goto(root);
await page.getByRole('button',{name:/生日通行证/}).first().click();
await page.locator('#bzLoginId').fill(id);
await page.locator('#bzLoginKey').fill(recoveryKey);
await page.locator('#bzLoginBtn').click();
await page.locator('#bzIdText').waitFor();
assert.equal(await page.locator('#bzIdText').textContent(),id);
await page.reload();
await page.goto(root+'#/office');
assert.match(await page.locator('.bz-account-chip').textContent(),/35/);
console.log('PASS remote account: register / codes / redeem / checkin / low balance / recover / refresh');
}finally{await browser?.close();processServer.kill('SIGTERM');rmSync(dir,{recursive:true,force:true})}
