// Package only the runtime inputs declared by Dockerfile; never include user data.
import {readFileSync,writeFileSync,mkdirSync,readdirSync,statSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
const hash=value=>createHash('sha256').update(value).digest('hex');
const roots=readFileSync('Dockerfile','utf8').split(/\r?\n/).filter(s=>s.startsWith('COPY ')).map(s=>s.match(/^COPY ([\w./-]+) \.\/([\w./-]+)$/)?.[1]);
if(roots.some(p=>!p||p.includes('..')))throw Error('Unexpected runtime COPY');
const files=[];
function walk(path){const info=statSync(path);if(info.isDirectory())for(const name of readdirSync(path))walk(join(path,name));else{const normalized=path.replaceAll('\\','/');if(normalized==='server/.env.example')return;if(/(^|\/)(\.env[^/]*|node_modules|data)(\/|$)|\.sqlite(?:-|$)/.test(normalized))throw Error('Private runtime file: '+normalized);files.push({path:normalized,sha256:hash(readFileSync(path)),size:info.size})}}
roots.forEach(walk);files.sort((a,b)=>a.path.localeCompare(b.path));
const git=args=>execFileSync('git',args,{encoding:'utf8'}).trim();
const revision=git(['rev-parse','HEAD']),branch=git(['branch','--show-current']);
const out=process.argv[2]||'test-results/release';mkdirSync(out,{recursive:true});
const archive=out+'/buzhi-inbox.tar.gz';
if(existsSync(archive))throw Error('Release already exists; preserve it and choose a new output directory');
writeFileSync(out+'/files.txt',files.map(f=>f.path).join('\n')+'\n');
execFileSync('tar',['-czf',archive,'-T',out+'/files.txt']);
const manifest={createdAt:new Date().toISOString(),revision,branch,dirty:git(['status','--porcelain']).length>0,archive:'buzhi-inbox.tar.gz',archiveSha256:hash(readFileSync(archive)),files};
writeFileSync(out+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');
writeFileSync(out+'/SHA256SUMS',manifest.archiveSha256+'  buzhi-inbox.tar.gz\n'+hash(readFileSync(out+'/manifest.json'))+'  manifest.json\n');
console.log(JSON.stringify({archive,revision,branch,dirty:manifest.dirty,sha256:manifest.archiveSha256,files:files.length}));
