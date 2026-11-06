import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createWeatherContent} from '../server/weather-content.mjs';
import {assetHelp} from '../server/asset-help.mjs';
import {TODAY_CARDS} from '../server/card-release.mjs';
import {PLANNED_SIXTY_CARDS} from '../server/card-expansion-planned.mjs';
test('weather draft preview uses the same coastal default and preserves draft-only custom access',()=>{
 const db=new DatabaseSync(':memory:'),dir=mkdtempSync(join(tmpdir(),'bzi-scene-sync-'));
 try{const content=createWeatherContent({db,assetDir:dir});const original=content.publicConfig();
 const preview=content.scenePreview();assert.match(preview.dataUrl,/^data:image\/png;base64,/);assert.deepEqual(Buffer.from(preview.dataUrl.split(',')[1],'base64'),readFileSync(new URL('../ui-preview/assets/weather-coastal-scene-20261107.png',import.meta.url)));
 assert.deepEqual(content.publicConfig(),original,'preview is read only');
 const custom=readFileSync(new URL('../ui-preview/weather/assets/cloud-observatory.webp',import.meta.url));const draft=content.draft({config:original,confirmed:true,expectedRevision:0,sceneBase64:custom.toString('base64')});assert.equal(content.scenePreview().dataUrl,'data:image/webp;base64,'+custom.toString('base64'));assert.equal(content.publicConfig().scene,original.scene);assert.throws(()=>content.file(draft.draft.scene.split('/').pop()),/未发布/);
 }finally{db.close();rmSync(dir,{recursive:true,force:true})}
});
test('every released expansion card has accurate live-use help, including fusion',()=>{
 for(const card of [...TODAY_CARDS,...PLANNED_SIXTY_CARDS]){const help=assetHelp('cards/'+card.id+'.webp');assert(help.label.includes(card.id),card.id+' must have a specific help entry');assert(!help.label.includes('待开放'),card.id+' is already in the current catalog');assert(help.pages.includes('羽翼融卡工坊'));assert(!help.description.includes('50张总容量'))}
});
