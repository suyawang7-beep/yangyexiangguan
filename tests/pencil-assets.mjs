import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import assert from 'node:assert/strict';
const folder=mkdtempSync(join(tmpdir(),'buzhi-pencil-assets-'));
const port=49000+Math.floor(Math.random()*500),base=`http://127.0.0.1:${port}`;
const server=spawn(process.execPath,['server/index.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:String(port),HOST:'127.0.0.1',DB_PATH:join(folder,'isolated.sqlite'),ADMIN_TOKEN:'pencil-asset-test-admin-not-live-20261020'},stdio:['ignore','ignore','pipe']});
let logs='';server.stderr.on('data',c=>logs+=c);
try{
 let ready=false;for(let i=0;i<80;i++){try{if((await fetch(base+'/health')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert(ready,logs);
 for(const path of ['/assets/pencil/shell.png','/assets/pencil/letter.png','/assets/pencil/bottle.png','/assets/pencil/party.png','/assets/pencil/empty-letter.png','/assets/pencil/stamp.png','/assets/pencil/postcard.png']){const r=await fetch(base+path);assert.equal(r.status,200,path);assert.equal(r.headers.get('content-type'),'image/png');const bytes=Buffer.from(await r.arrayBuffer());assert.equal(bytes.toString('ascii',1,4),'PNG');assert(bytes.length<40000,'Small local raster asset');}
 const license=await fetch(base+'/assets/pencil/LICENSE.txt');assert.equal(license.status,200);assert.match(await license.text(),/Required Notice: pencil-case/);
 const full=await fetch(base+'/assets/pencil/postcard-drawing.mp4');assert.equal(full.status,200);assert.equal(full.headers.get('content-type'),'video/mp4');const length=(await full.arrayBuffer()).byteLength;
 const part=await fetch(base+'/assets/pencil/postcard-drawing.mp4',{headers:{Range:'bytes=0-63'}});
 assert.equal(part.status,206,'Drawing playback supports byte ranges for mobile Safari');assert.equal(part.headers.get('content-range'),`bytes 0-63/${length}`);assert.equal((await part.arrayBuffer()).byteLength,64);
 const invalid=await fetch(base+'/assets/pencil/postcard-drawing.mp4',{headers:{Range:`bytes=${length+10}-`}});assert.equal(invalid.status,416);
 assert.equal((await fetch(base+'/assets/fonts/README.md')).status,404,'Public serving still rejects non-allowlisted source files');
 console.log('PASS pencil assets: seven real PNGs, attribution, MP4 MIME and valid/invalid byte ranges');
}finally{if(server.exitCode===null){const done=new Promise(r=>server.once('exit',r));server.kill();await done;}rmSync(folder,{recursive:true,force:true});}
