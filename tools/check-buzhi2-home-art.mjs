// Verify the imported engineering snapshot and art files without running a browser or API.
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const read=p=>readFileSync(resolve(root,p));
const meta=JSON.parse(read('docs/design/buzhi2-home-art-source.json'));
let unchanged=0;
for(const entry of meta.engineeringFiles){
 if(entry.name==='index.html')continue;
 const data=read('ui-preview/buzhi2/'+entry.name);
 const blob=createHash('sha1').update(Buffer.concat([Buffer.from('blob '+data.length),Buffer.from([0]),data])).digest('hex');
 assert.equal(blob,entry.blob,'Engineering snapshot changed: '+entry.name);unchanged++;
}
const base='ui-preview/buzhi2/';
const assets=JSON.parse(read(base+'assets-v2/SOURCE.json'));
for(const item of assets.assets)assert.equal(createHash('sha256').update(read(base+'assets-v2/'+item.file)).digest('hex'),item.sha256,item.file);
const css=read(base+'home-art.css').toString();
for(const match of css.matchAll(/url[(]'([^']+)'[)]/g))assert(existsSync(resolve(root,base,match[1])),'Missing CSS asset: '+match[1]);
const html=read(base+'index.html').toString();
for(const match of html.matchAll(/(?:src|href)="([^"#]+)"/g))assert(existsSync(resolve(root,base,match[1].split('?')[0])),'Missing HTML resource: '+match[1]);
console.log('PASS: '+unchanged+' unchanged engineering files, 2 art hashes, CSS and HTML resources.');
