export function createPendingGrants(uuid=()=>crypto.randomUUID()){
 const pending=new Map();return {peek:userId=>pending.get(userId),prepare(userId,amount,reason){const old=pending.get(userId);if(old){if(old.amount!==amount||old.reason!==reason)throw Error('上次请求状态待确认，请保留原内容重试');return old;}const body=Object.freeze({userId,amount,reason,confirmed:true,requestId:uuid()});pending.set(userId,body);return body;},complete(userId,requestId){if(pending.get(userId)?.requestId===requestId)pending.delete(userId);}};
}
