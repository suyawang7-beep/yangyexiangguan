import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:net';
import {availablePort} from './helpers/port.mjs';
test('fixture port stays outside OS ephemeral client ports and skips an occupied listener',async()=>{
 const first=await availablePort();assert(first>=20000&&first<30000);
 const busy=createServer();await new Promise((resolve,reject)=>{busy.once('error',reject);busy.listen(first,'127.0.0.1',resolve)});
 try{const next=await availablePort(first);assert.notEqual(next,first);assert(next>=20000&&next<30000)}finally{await new Promise(r=>busy.close(r))}
});
