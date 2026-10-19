import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {cpSync,mkdtempSync,readFileSync,rmSync,unlinkSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

// Exercise only files actually copied into the production image, with a disposable database.
const root=fileURLToPath(new URL('..',import.meta.url));
const staging=mkdtempSync(join(root,'.artifact-test-'));
const port=59000+Math.floor(Math.random()*500),base='http://127.0.0.1:'+port;
let server,logs='';
try{
 const copies=readFileSync(join(root,'Dockerfile'),'utf8').split(/\r?\n/).filter(line=>/^COPY\s/.test(line));
 assert(copies.length>0);
 for(const line of copies){
  const match=/^COPY ([\w./-]+) \.\/([\w./-]+)$/.exec(line);
  assert(match,'Unsupported COPY instruction: '+line);
  assert(!match[1].includes('..')&&!match[2].includes('..'));
  cpSync(join(root,match[1]),join(staging,match[2]),{recursive:true});
 }
 server=spawn(process.execPath,['server/index.mjs'],{cwd:staging,env:{...process.env,HOST:'127.0.0.1',PORT:String(port),DB_PATH:join(staging,'isolated.sqlite'),ADMIN_TOKEN:'artifact-isolated-admin-token-0000000000'},stdio:['ignore','ignore','pipe']});
 server.stderr.on('data',chunk=>logs+=chunk);
 let ready=false;for(let i=0;i<100;i++){try{if((await fetch(base+'/health')).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,100))}
 assert(ready,logs);
 for(const path of ['/','/verify.html','/membership-client.js','/app.js','/effects.js','/assets/fonts/signature.css','/ui-preview/assets/fonts/signature.css','/admin/members','/admin/navigation.js','/admin/membership.js','/admin/maintenance.js']){
  const response=await fetch(base+path);assert.equal(response.status,200,'Packaged route '+path);assert((await response.text()).length>20,path);
 }
 const fontStyle=await fetch(base+'/assets/fonts/signature.css');assert.match(fontStyle.headers.get('content-type'),/^text\/css/);
 assert.equal((await fetch(base+'/assets/fonts/README.md')).status,404,'Only explicitly allowed public asset types are served');
 unlinkSync(join(staging,'client','membership.js'));
 const missing=await fetch(base+'/membership-client.js');assert.equal(missing.status,500);assert.deepEqual(await missing.json(),{error:'内部错误'});
 assert.equal((await fetch(base+'/health')).status,200,'A missing file must not terminate the server');
 assert.equal((await fetch(base+'/admin/navigation.js')).status,200);
 console.log('PASS production COPY artifact serves pages/scripts; missing script returns 500 without terminating server');
}finally{
 if(server?.exitCode===null){const done=new Promise(resolve=>server.once('exit',resolve));server.kill();await done}
 rmSync(staging,{recursive:true,force:true});
}
