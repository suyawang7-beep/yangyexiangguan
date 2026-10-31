import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';import {join} from 'node:path';
import {createTopicAssets} from '../server/topic-assets.mjs';
const dir=mkdtempSync(join(tmpdir(),'buzhi-topic-'));const db=new DatabaseSync(':memory:');let failAudit=false;
try{
 const store=createTopicAssets({db,assetDir:dir,slots:[{topic:'test-birthday',id:'radio-a-copy',kind:'text',required:true},{topic:'test-birthday',id:'radio-b-copy',kind:'text'}],audit(){if(failAudit)throw Error('audit failed');}});
 assert.equal(store.list().configured,true);assert.throws(()=>store.draft({topic:'test-birthday',slot:'invented'}),e=>e.status===404);
 let a=store.draft({topic:'test-birthday',slot:'radio-a-copy',text:'A 模式',expectedRevision:0});assert.equal(a.revision,1);assert.deepEqual(store.publicManifest('test-birthday'),{});
 assert.throws(()=>store.draft({topic:'test-birthday',slot:'radio-b-copy',text:'B',expectedRevision:0}),e=>e.status===409);
 let b=store.draft({topic:'test-birthday',slot:'radio-b-copy',text:'B 模式',expectedRevision:1});
 let pub=store.publish({topic:'test-birthday',expectedRevision:2,versions:{'radio-a-copy':a.version,'radio-b-copy':b.version}});const release=pub.published.release;
 assert.equal(store.publicManifest('test-birthday').assets['radio-a-copy'].value,'A 模式');assert.equal(store.publicManifest('test-birthday').assets['radio-b-copy'].value,'B 模式');
 assert.throws(()=>store.publish({topic:'test-birthday',expectedRevision:pub.revision,versions:{'radio-b-copy':a.version}}),e=>e.status===400);
 failAudit=true;assert.throws(()=>store.draft({topic:'test-birthday',slot:'radio-a-copy',text:'bad',expectedRevision:3}));assert.equal(store.list('test-birthday').revision,3);failAudit=false;
 const newer=store.draft({topic:'test-birthday',slot:'radio-a-copy',text:'新版',expectedRevision:3});store.publish({topic:'test-birthday',expectedRevision:4,versions:{'radio-a-copy':newer.version}});
 const restored=store.publish({topic:'test-birthday',expectedRevision:5,restoreRelease:release});assert.equal(restored.published.assets['radio-a-copy'].value,'A 模式');assert.equal(restored.revision,6);
 assert.throws(()=>store.file('../test'),e=>e.status===404);
 console.log('PASS topic assets: confirmed slots only; private draft; A/B independence; optimistic conflict; publication; immutable history; rollback; audit atomicity');
}finally{db.close();rmSync(dir,{recursive:true,force:true});}
