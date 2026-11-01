import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const shell=readFileSync('admin/v2/admin.js','utf8'),old=readFileSync('admin/index.html','utf8');
assert(!/api\.request\('fusion\/grants',/.test(shell),'no native direct fusion grant');
assert(!/req\('coins\/grant'/.test(old),'no legacy direct coin grant');
assert(!old.includes('id="coinGrantForm"'),'no direct coin form');
assert(shell.includes('composeMailReward'),'quota management routes to central inbox composer');
assert(old.includes('value="fusion"'));
console.log('PASS manual rewards have one mailbox composer; direct grant forms and calls removed');

assert(old.includes('window.prepareIslandGift='));assert(old.includes('if(pending||sending||pendingUncertain)'));assert(/coinMailCompose'\)\.onclick=\(\)=>window\.prepareIslandGift/.test(old));assert(old.includes("send.onclick=()=>window.prepareIslandGift({userId:u.id,kind:'coins'})"));
