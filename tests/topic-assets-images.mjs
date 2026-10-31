import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {mkdtempSync,rmSync,readFileSync} from 'node:fs';import {join} from 'node:path';import {tmpdir} from 'node:os';import {createTopicAssets} from '../server/topic-assets.mjs';
const root=mkdtempSync(join(tmpdir(),'buzhi-topic-image-')),db=new DatabaseSync(':memory:');
try{
 const bytes=readFileSync(new URL('../assets/cards/LOCK-50.webp',import.meta.url));
 const s=createTopicAssets({db,assetDir:root,slots:[{topic:'isolated',id:'radio.scene.a',kind:'image'}]});
 const draft=s.draft({topic:'isolated',slot:'radio.scene.a',expectedRevision:0,base64:bytes.toString('base64'),license:'Repository fixture used only for isolated technical verification'});
 const v=draft.versions[0],name=v.value.split('/').pop();assert.throws(()=>s.file(name),e=>e.status===404);
 assert.throws(()=>s.publish({topic:'isolated',expectedRevision:1,versions:{'radio.scene.a':v.id}}),e=>e.status===400);
 s.publish({topic:'isolated',expectedRevision:1,versions:{'radio.scene.a':v.id},authorized:true});
 const m=s.publicManifest('isolated');assert.equal(m.slots['radio.scene.a'].version,v.hash);assert.equal(m.slots['radio.scene.a'].authorized,true);assert.equal(m.slots['radio.scene.a'].enabled,true);assert.deepEqual(s.file(name).body,bytes);
 const slots=JSON.parse(readFileSync(new URL('../server/topic-asset-slots.json',import.meta.url),'utf8'));assert.equal(slots.length,18);assert(slots.every(x=>!x.id.includes('DEMO')&&!x.id.includes('{')&&!x.id.startsWith('home.')&&!x.id.startsWith('shop.')));
 console.log('PASS image lifecycle: real WebP fixture, draft private, authorization gate, published bytes/hash, consumer contract, 18 confirmed non-DEMO slots');
}finally{db.close();rmSync(root,{recursive:true,force:true});}
