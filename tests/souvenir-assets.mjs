import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createSouvenirAssets} from '../server/souvenir-assets.mjs';
test('souvenir catalogue validates, conflicts and rolls back without asset grants',()=>{
 const db=new DatabaseSync(':memory:'),dir=mkdtempSync(join(tmpdir(),'bzi-souvenir-'));const audit=[];
 try{const service=createSouvenirAssets({db,assetDir:dir,audit:(...args)=>audit.push(args)});const bytes=readFileSync(new URL('../ui-preview/assets/workshop-atelier.webp',import.meta.url));
 const payload={itemName:'验收贝壳',description:'合成素材记录',license:'本仓库验收素材，仅隔离测试',expectedRevision:0,confirmed:true,base64:bytes.toString('base64')};
 assert.equal(service.list().items.length,0);assert.throws(()=>service.save({...payload,license:''}),/授权/);assert.throws(()=>service.save({...payload,base64:Buffer.from('invalid').toString('base64')}),/WebP/);
 const first=service.save(payload).items[0];assert.equal(first.revision,1);assert.deepEqual(service.file(first.imageHash+'.webp'),bytes);assert.throws(()=>service.save(payload),/其他窗口/);
 const next=service.save({...payload,expectedRevision:1,base64:undefined,description:'更新说明'}).items[0];assert.equal(next.revision,2);assert.equal(audit.length,2);
 assert.throws(()=>service.file('../private'),/不存在/);
 const failing=createSouvenirAssets({db,assetDir:dir,audit:()=>{throw Error('audit failed')}});assert.throws(()=>failing.save({...payload,expectedRevision:2}),/audit failed/);assert.equal(service.list().items[0].revision,2);
 assert.equal(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().length,1);
 }finally{db.close();rmSync(dir,{recursive:true,force:true})}
});
