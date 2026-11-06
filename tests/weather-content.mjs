import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';import {join} from 'node:path';
import {createWeatherContent} from '../server/weather-content.mjs';
test('weather draft isolation, publication, conflicts and audit rollback',()=>{
 const db=new DatabaseSync(':memory:'),dir=mkdtempSync(join(tmpdir(),'bzi-weather-'));const log=[];
 try{const s=createWeatherContent({db,assetDir:dir,audit:(...a)=>log.push(a)});const initial=s.read(),config=structuredClone(initial.draft);config.intro='测试草稿';config.enabled=false;
 assert.equal(initial.revision,0);assert.equal(s.publicConfig().enabled,true);
 const draft=s.draft({config,confirmed:true,expectedRevision:0});assert.equal(draft.revision,1);assert.equal(s.publicConfig().intro,initial.published.intro);
 assert.throws(()=>s.publish({expectedRevision:0,confirmed:true}),/版本/);s.publish({expectedRevision:1,confirmed:true});assert.equal(s.publicConfig().intro,'测试草稿');assert.equal(s.publicConfig().enabled,false);
 const wrong=structuredClone(config);wrong.weather[0].id='tampered';assert.throws(()=>s.draft({config:wrong,expectedRevision:2,confirmed:true}),/编号/);
 const bytes=readFileSync(new URL('../ui-preview/weather/assets/cloud-observatory.webp',import.meta.url));const withImage=s.draft({config,confirmed:true,expectedRevision:2,sceneBase64:bytes.toString('base64')});const name=withImage.draft.scene.split('/').pop();assert.throws(()=>s.file(name),/未发布/);assert.deepEqual(s.file(name,true),bytes);s.publish({expectedRevision:3,confirmed:true});assert.deepEqual(s.file(name),bytes);assert.throws(()=>s.file('../secret'),/不存在/);
 const failing=createWeatherContent({db,assetDir:dir,audit:()=>{throw Error('audit failure')}});assert.throws(()=>failing.draft({config,confirmed:true,expectedRevision:4}),/audit failure/);assert.equal(s.read().revision,4);assert.equal(log.length,4);
 }finally{db.close();rmSync(dir,{recursive:true,force:true})}
});
