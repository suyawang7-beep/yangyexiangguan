// Validate art assets and preserve the imported engineering snapshot.
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const read=p=>readFileSync(resolve(root,p));
const meta=JSON.parse(read('docs/design/buzhi2-home-art-source.json'));
let checked=0;
for(const entry of meta.engineeringFiles){
 let text=read('ui-preview/buzhi2/'+entry.name).toString().replaceAll('\r\n','\n');
 if(['index.html','workshop.html','office.html'].includes(entry.name)){
  text=text.replace(/<link rel="stylesheet" href="(?:home-art|spaces-art)\.css(?:\?[^" ]*)?">/g,'');
  text=text.replace(/<script defer src="(?:home-art|spaces-art)\.js"><\/script>/g,'');
  text=text.replace('width=device-width, initial-scale=1, viewport-fit=cover','width=device-width, initial-scale=1');
 }
 const data=Buffer.from(text);
 const blob=createHash('sha1').update(Buffer.concat([Buffer.from('blob '+data.length),Buffer.from([0]),data])).digest('hex');
 assert.equal(blob,entry.blob,'Engineering snapshot changed beyond approved art loading: '+entry.name);checked++;
}
const base='ui-preview/buzhi2/';
const assets=JSON.parse(read(base+'assets-v2/SOURCE.json'));
for(const item of assets.assets)assert.equal(createHash('sha256').update(read(base+'assets-v2/'+item.file)).digest('hex'),item.sha256,item.file);
for(const name of ['home-art.css','spaces-art.css'])for(const match of read(base+name).toString().matchAll(/url[(]'([^']+)'[)]/g))assert(existsSync(resolve(root,base,match[1])),'Missing CSS asset: '+match[1]);
for(const name of ['index.html','workshop.html','office.html'])for(const match of read(base+name).toString().matchAll(/(?:src|href)="([^"#]+)"/g))assert(existsSync(resolve(root,base,match[1].split('?')[0])),'Missing HTML resource: '+match[1]);
console.log('PASS: '+checked+' engineering snapshots preserved except art loading/safe-area meta; '+assets.assets.length+' art hashes; three page resources.');
