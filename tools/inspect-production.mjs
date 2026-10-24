// Authorized read-only SSH inspection, with an independently confirmed host key.
import {readFileSync} from 'node:fs';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const host='43.132.221.214',knownHosts='C:/Users/A/.ssh/known_hosts';
const expected='SHA256:lXHf+qbOD3sYYDpx+pJB/2rdIdLzjgohOETgt7hu0vQ';
const matches=execFileSync('ssh-keygen',['-F',host,'-f',knownHosts],{encoding:'utf8'}).split(/\r?\n/).filter(line=>line.includes(' ssh-ed25519 '));
if(!matches.some(line=>'SHA256:'+createHash('sha256').update(Buffer.from(line.trim().split(/\s+/)[2],'base64')).digest('base64').replace(/=+$/,'')===expected))throw Error('Independently confirmed host fingerprint mismatch');
const script=process.argv.includes('--unified-readonly')?'inspect-unified-release.sh':'inspect-production.sh';
const result=spawnSync('C:/Windows/System32/OpenSSH/ssh.exe',['-i','C:/Users/A/.ssh/buzhi_codex','-p','22','-o','IdentitiesOnly=yes','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','HostKeyAlgorithms=ssh-ed25519','-o','KexAlgorithms=curve25519-sha256','-o','ConnectTimeout=15','-o','UserKnownHostsFile='+knownHosts,'ubuntu@'+host,'bash -s'],{input:readFileSync(new URL('../deploy/tencent/'+script,import.meta.url)),encoding:'utf8',maxBuffer:4*1024*1024});
process.stdout.write(result.stdout||'');process.stderr.write(result.stderr||'');if(result.error)throw result.error;process.exitCode=result.status??1;
