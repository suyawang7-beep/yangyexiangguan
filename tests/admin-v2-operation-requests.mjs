import assert from 'node:assert/strict';import {createOperationRequests} from '../admin/v2/operation-requests.js';
let token='synthetic',disposed=false,confirmed=true,calls=[];let snapshot={revision:'original',cards:[{id:'N-1',name:'测试'}],activity:{startsAt:null,endsAt:null,phase:'active'},features:{pool:{feature:'pool',enabled:true,phase:'active'},office:{feature:'office',enabled:true}}};
const request=async(path,data)=>{calls.push({path,data});if(path==='v2/config'&&data){assert.equal(data.expectedRevision,snapshot.revision);return {...snapshot,revision:'next',features:{...snapshot.features,pool:{...snapshot.features.pool,enabled:false}}};}return snapshot;};
const req=createOperationRequests({request,getToken:()=>token,isDisposed:()=>disposed,confirmAction:async()=>confirmed});
assert.deepEqual(await req('cards'),snapshot.cards);assert.deepEqual(await req('cards',{cardId:'N-1',name:'新卡名'}),{id:'N-1'});assert.equal(calls.at(-1).path,'v2/config');
await req('feature-access');assert.equal((await req('feature-access',{feature:'pool',enabled:false})).enabled,false);
confirmed=false;await assert.rejects(req('activity',{startsAt:null,endsAt:null}));disposed=true;await assert.rejects(req('users'));
let finish;disposed=false;const slow=createOperationRequests({request:()=>new Promise(r=>finish=r),getToken:()=>token,isDisposed:()=>disposed,confirmAction:async()=>true});const pending=slow('users');token='';finish([]);await assert.rejects(pending,/管理会话已结束/);
console.log('PASS migrated operation adapter: guarded original edits, original return shapes, cancellation, logout blocks late responses');
