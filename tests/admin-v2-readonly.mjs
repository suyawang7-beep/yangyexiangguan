import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
import {createServer} from 'node:net';
const root=mkdtempSync(join(tmpdir(),'buzhi-admin-v2-'));
const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
const token='isolated-test-admin-token-'+ 'x'.repeat(40);
const child=spawn(process.execPath,['server/index.mjs'],{env:{...process.env,PORT:String(port),HOST:'127.0.0.1',DB_PATH:join(root,'test.sqlite'),ASSET_DIR:join(root,'assets'),ADMIN_TOKEN:token},stdio:['ignore','pipe','pipe']});
let stderr='';child.stderr.on('data',b=>stderr+=b);
const exited=once(child,'exit');let timeout;
try{
 await Promise.race([once(child.stdout,'data'),exited.then(()=>{throw Error(stderr)}),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('startup timeout')),15000)})]);
 const url='http://127.0.0.1:'+port;
 for(const headers of [{},{Authorization:'Bearer wrong'}])assert.equal((await fetch(url+'/api/admin/v2/read-model',{headers})).status,403);
 const headers={Authorization:'Bearer '+token};const res=await fetch(url+'/api/admin/v2/read-model',{headers});assert.equal(res.status,200);assert.match(res.headers.get('cache-control'),/no-store/);
 const data=await res.json();assert.equal(data.readOnly,true);assert.equal(data.overview.users,0);assert(data.cards.length>0);assert.deepEqual(data.residents.items,[]);assert.deepEqual(data.audit.items,[]);assert.equal(data.capabilities.writes,false);assert.equal(data.capabilities.fusion,false);
 assert.equal((await fetch(url+'/admin/v2/readonly-client.js')).status,200);
 assert.equal((await fetch(url+'/admin')).status,200);assert.equal((await fetch(url+'/admin/v2/')).status,503);
 assert.equal((await fetch(url+'/api/admin/v2/read-model',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:'{}'})).status,404);
 const old=await (await fetch(url+'/api/admin/overview',{headers})).json();assert.deepEqual(data.overview,old);
 console.log('PASS admin v2: auth isolation, real read model, no-store, legacy coexistence, missing-source 503, writes rejected; temporary DB/assets only');
}finally{clearTimeout(timeout);child.kill();await exited;rmSync(root,{recursive:true,force:true});}
