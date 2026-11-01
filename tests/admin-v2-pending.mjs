import assert from 'node:assert/strict';
import {createPendingGrants} from '../admin/v2/pending-grants.js';
let n=0;const store=createPendingGrants(()=>String(++n));const first=store.prepare('BZI-synthetic',2,'补发测试');
assert.equal(store.prepare('BZI-synthetic',2,'补发测试').requestId,first.requestId);
assert.equal(store.peek('BZI-synthetic').requestId,first.requestId); // re-render/re-query retains uncertain request
assert.throws(()=>store.prepare('BZI-synthetic',3,'另一内容'));
store.complete('BZI-synthetic',first.requestId);assert.equal(store.peek('BZI-synthetic'),undefined);assert.notEqual(store.prepare('BZI-synthetic',2,'补发测试').requestId,first.requestId);
console.log('PASS pending grants retain idempotency identity through render/requery until authoritative completion');
