import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {createServer} from 'node:net';
import {tmpdir} from 'node:os';import {join} from 'node:path';import {once} from 'node:events';
const root=mkdtempSync(join(tmpdir(),'buzhi-v2-writes-')),token='isolated-test-admin-'+ 'x'.repeat(40);
const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
const child=spawn(process.execPath,['server/index.mjs'],{env:{...process.env,HOST:'127.0.0.1',PORT:String(port),DB_PATH:join(root,'test.sqlite'),ASSET_DIR:join(root,'assets'),ADMIN_TOKEN:token},stdio:['ignore','pipe','pipe']});
let log='';child.stderr.on('data',b=>log+=b);const exited=once(child,'exit');let timer;
try{
 const out=await Promise.race([once(child.stdout,'data'),exited.then(()=>{throw Error(log)}),new Promise((_,reject)=>timer=setTimeout(()=>reject(Error('startup')),15000))]);
 const base='http://127.0.0.1:'+port;
 const req=async(path,body,auth=true)=>{const r=await fetch(base+path,{method:body?'POST':'GET',headers:{...(auth?{Authorization:'Bearer '+token}:{}),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};};
 const get=()=>req('/api/admin/v2/config');let state=await get();assert.equal(state.status,200,'real configuration endpoint');
 assert.equal((await req('/api/admin/v2/config',null,false)).status,403);
 const before=state.data;assert.match(before.revision,/^[a-f0-9]{64}$/);const card=before.cards[0];
 const change={action:'card',expectedRevision:before.revision,confirmed:true,payload:{cardId:card.id,name:'隔离测试卡名',story:'Synthetic only',ocId:card.ocId,ocId2:card.ocId2,rarity:card.rarity}};
 assert.equal((await req('/api/admin/v2/config',{...change,confirmed:false})).status,400);
 assert.equal((await req('/api/admin/v2/config',change,false)).status,403);
 let saved=await req('/api/admin/v2/config',change);assert.equal(saved.status,200);assert.equal(saved.data.cards[0].name,'隔离测试卡名');
 assert.equal((await req('/api/admin/v2/config',change)).status,409,'stale editor rejected');
 let feature=saved.data.features.pool;
 const control={action:'feature',expectedRevision:saved.data.revision,confirmed:true,payload:{feature:'pool',enabled:false,startsAt:feature.startsAt,endsAt:feature.endsAt}};
 saved=await req('/api/admin/v2/config',control);assert.equal(saved.status,200);assert.equal(saved.data.features.pool.enabled,false);assert.deepEqual(saved.data.features.office,before.features.office);
 assert.equal((await req('/api/admin/v2/config',{...control,expectedRevision:saved.data.revision,payload:{...control.payload,enabled:'yes'}})).status,400);
 const audit=await req('/api/admin/audit');assert(audit.data.some(x=>x.action==='card.save'));assert(audit.data.some(x=>x.action==='feature-access.update'));
 assert.equal((await req('/api/admin/overview')).data.users,0);
 // Upload real WebP fixtures through the original API; verify public bytes and manifest hash change.
 const images=['LOCK-50','LOCK-33'].map(id=>readFileSync(new URL('../assets/cards/'+id+'.webp',import.meta.url)));let versions=[];
 for(const bytes of images){assert.equal((await req('/api/admin/assets/upload',{name:'cards/UR-1.webp',base64:bytes.toString('base64')})).status,200);const publicFile=await fetch(base+'/assets/cards/UR-1.webp');assert.deepEqual(Buffer.from(await publicFile.arrayBuffer()),bytes);assert.match(publicFile.headers.get('cache-control'),/no-store/);versions.push((await req('/api/assets-manifest')).data.versions['cards/UR-1.webp']);}
 assert.notEqual(versions[0],versions[1]);const history=await req('/api/admin/assets/versions?name=cards%2FUR-1.webp');assert(history.data.length>0);assert.equal((await req('/api/admin/assets/restore',{name:'cards/UR-1.webp',version:history.data[0].version})).status,200);assert.deepEqual(Buffer.from(await (await fetch(base+'/assets/cards/UR-1.webp')).arrayBuffer()),images[0]);
 console.log('PASS v2: auth, confirmed writes, stale conflict, card audit, independent controls, invalid input, synthetic-only DB, upload/public bytes/cache/restore');
}finally{clearTimeout(timer);child.kill();await exited;rmSync(root,{recursive:true,force:true});}
