// Verify the actual release archive, then boot it with a disposable database.
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {spawn,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const source=resolve(process.argv[2]||'test-results/release-final'),manifest=JSON.parse(readFileSync(join(source,'manifest.json'),'utf8'));
const hash=x=>createHash('sha256').update(x).digest('hex');
assert.equal(manifest.dirty,false,'Release must be built from committed files');
const archive=join(source,manifest.archive);assert.equal(hash(readFileSync(archive)),manifest.archiveSha256);
const names=execFileSync('tar',['-tzf',archive],{encoding:'utf8'}).trim().split(/\r?\n/).sort();
assert.deepEqual(names,manifest.files.map(f=>f.path).sort());
assert(names.every(p=>!p.startsWith('/')&&!p.split('/').includes('..')&&!/(^|\/)(\.env[^/]*|\.git|node_modules|data)(\/|$)|\.sqlite(?:-|$)/.test(p)));
const root=resolve(tmpdir()),folder=mkdtempSync(join(root,'buzhi-release-smoke-')),port=58000+Math.floor(Math.random()*500),base='http://127.0.0.1:'+port;
let server,logs='';
try{
 execFileSync('tar',['-xzf',archive,'-C',folder]);
 for(const file of manifest.files)assert.equal(hash(readFileSync(join(folder,file.path))),file.sha256,file.path);
 server=spawn(process.execPath,['server/index.mjs'],{cwd:folder,env:{...process.env,HOST:'127.0.0.1',PORT:String(port),DB_PATH:join(folder,'isolated.sqlite'),ASSET_DIR:join(folder,'isolated-assets'),ADMIN_TOKEN:'isolated-release-smoke-admin-0000000000'},stdio:['ignore','ignore','pipe']});server.stderr.on('data',x=>logs+=x);
 let ready=false;for(let i=0;i<100;i++){try{if((await fetch(base+'/health')).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,100))}assert(ready,logs);
 for(const path of ['/','/resident.html','/resident.css','/admin/island-mail','/admin/navigation.js'])assert.equal((await fetch(base+path)).status,200,path);
 assert.equal((await fetch(base+'/api/island-mail')).status,401);assert.equal((await fetch(base+'/api/island-items')).status,401);
 console.log('PASS actual release archive: '+manifest.files.length+' hashed runtime files, no private data, isolated startup/routes/authentication; '+manifest.revision);
}finally{
 if(server?.exitCode===null){const done=new Promise(r=>server.once('exit',r));server.kill();await done}
 assert.equal(dirname(folder),root);rmSync(folder,{recursive:true,force:true});
}
