// Authorized release operations only, pinned to the user's independently verified host.
import {execFileSync,spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
const host='43.132.221.214',known='C:/Users/A/.ssh/known_hosts';
const matches=execFileSync('ssh-keygen',['-F',host,'-f',known],{encoding:'utf8'}).split(/\r?\n/).filter(s=>s.includes(' ssh-ed25519 '));
if(!matches.some(s=>'SHA256:'+createHash('sha256').update(Buffer.from(s.trim().split(/\s+/)[2],'base64')).digest('base64').replace(/=+$/,'')==='SHA256:lXHf+qbOD3sYYDpx+pJB/2rdIdLzjgohOETgt7hu0vQ'))throw Error('Production host fingerprint mismatch');
const options=['-i','C:/Users/A/.ssh/buzhi_codex','-o','BatchMode=yes','-o','IdentitiesOnly=yes','-o','StrictHostKeyChecking=yes','-o','HostKeyAlgorithms=ssh-ed25519','-o','KexAlgorithms=curve25519-sha256','-o','ConnectTimeout=15','-o','UserKnownHostsFile='+known];
const ssh=(command,input)=>{const r=spawnSync('C:/Windows/System32/OpenSSH/ssh.exe',[...options,'ubuntu@'+host,command],{input,encoding:'utf8',maxBuffer:8*1024*1024});process.stdout.write(r.stdout||'');process.stderr.write(r.stderr||'');if(r.error)throw r.error;if(r.status!==0)throw Error('SSH operation failed: '+r.status)};
const [mode,revision,folder,snapshot]=process.argv.slice(2);
if(mode==='--backup')ssh('sudo -n bash -s -- --approved-production',readFileSync(new URL('../deploy/tencent/backup-production.sh',import.meta.url)));
else if(['--upload','--deploy'].includes(mode)){
 if(!/^[a-f0-9]{40}$/.test(revision||''))throw Error('Full revision required');
 const source=resolve(folder),manifest=JSON.parse(readFileSync(join(source,'manifest.json'),'utf8'));
 if(manifest.revision!==revision||manifest.dirty!==false)throw Error('Release manifest mismatch');
 const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
 if(hash(join(source,'buzhi-inbox.tar.gz'))!==manifest.archiveSha256)throw Error('Local release hash mismatch');
 if(mode==='--upload'){
  const remote='/home/ubuntu/buzhi-unified-'+revision;
  ssh('mkdir -m 700 '+remote);
  const temp=mkdtempSync(join(tmpdir(),'buzhi-release-sftp-'));
  try{
   const batch=join(temp,'upload.txt');writeFileSync(batch,['cd '+remote,...['buzhi-inbox.tar.gz','manifest.json','SHA256SUMS'].map(name=>'put "'+join(source,name).replaceAll('\\','/')+'" '+name),'bye'].join('\n')+'\n');
   const r=spawnSync('C:/Windows/System32/OpenSSH/sftp.exe',[...options,'-b',batch,'ubuntu@'+host],{encoding:'utf8',maxBuffer:1024*1024});process.stdout.write(r.stdout||'');process.stderr.write(r.stderr||'');if(r.error)throw r.error;if(r.status!==0)throw Error('Release upload failed');
  }finally{rmSync(temp,{recursive:true,force:true})}
  ssh('cd '+remote+' && sha256sum -c SHA256SUMS');
 }else{
  if(!/^\d{8}T\d{6}Z-\d+$/.test(snapshot||''))throw Error('Verified snapshot identifier required');
  ssh('sudo -n python3 - '+[revision,manifest.archiveSha256,hash(join(source,'manifest.json')),snapshot].join(' '),readFileSync(new URL('../deploy/tencent/deploy-unified-release.py',import.meta.url)));
 }
}else throw Error('Use --backup, --upload REV FOLDER, or --deploy REV FOLDER VERIFIED_SNAPSHOT');
