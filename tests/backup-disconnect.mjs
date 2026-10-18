// The download handler must finish cleanup after a real HTTP client aborts.
import {createServer} from 'node:http';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import * as operations from '../server/operations.mjs';
assert.equal(typeof operations.streamBackup,'function','Backup streaming must expose an awaited completion lifecycle');
const folder=mkdtempSync(join(tmpdir(),'buzhi-cancel-')),file=join(folder,'large.sqlite');
writeFileSync(file,Buffer.alloc(16*1024*1024));
let finished=false,timeout;
let complete;
const done=new Promise(resolve=>complete=resolve);
const server=createServer(async(req,res)=>{await operations.streamBackup(res,{path:file,name:'manual-1-0123456789ab.sqlite',size:16*1024*1024});finished=true;complete()});
try{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const response=await fetch('http://127.0.0.1:'+server.address().port);
 const reader=response.body.getReader();assert((await reader.read()).value.length>0);
 assert.equal(finished,false,'Handler must not report completion while the transfer is pending');
 await reader.cancel();
 await Promise.race([done,new Promise((_,reject)=>timeout=setTimeout(()=>reject(Error('Cancelled backup stream did not finish cleanup')),1500))]);
 assert.equal(finished,true);
 console.log('PASS cancelled backup download releases its streaming lifecycle');
}finally{clearTimeout(timeout);server.closeAllConnections();await new Promise(resolve=>server.close(resolve));rmSync(folder,{recursive:true,force:true})}
