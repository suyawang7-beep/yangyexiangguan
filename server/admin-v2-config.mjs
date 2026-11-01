import {createHash} from 'node:crypto';
// New console uses the original business functions, database, authentication and audit.
export function createAdminV2Config({cards,characters,activity,feature,saveCard,saveActivity,saveFeature,error}){
 const stableFeature=id=>{const {phase,...value}=feature(id);return value;};
 function read(){const value={cards:cards(),characters:characters(),activity:((v)=>({startsAt:v.startsAt,endsAt:v.endsAt,timezone:v.timezone}))(activity()),features:{pool:stableFeature('pool'),office:stableFeature('office')}};return {...value,activity:activity(),features:{pool:feature('pool'),office:feature('office')},revision:createHash('sha256').update(JSON.stringify(value)).digest('hex')};}
 function save(body){
  if(!body||!body.payload||typeof body.payload!=='object'||Array.isArray(body.payload)||body.confirmed!==true)throw error(400,'请确认变更后再保存');
  if(typeof body.expectedRevision!=='string'||!/^[a-f0-9]{64}$/.test(body.expectedRevision))throw error(400,'缺少有效的编辑版本，请重新读取');
  const guard=()=>{if(read().revision!==body.expectedRevision)throw error(409,'配置已由其他窗口更新，请重新读取后再编辑');};
  // The guard executes INSIDE the original BEGIN IMMEDIATE transaction.
  if(body.action==='card')saveCard(body.payload,guard);
  else if(body.action==='feature')saveFeature(body.payload,guard);
  else if(body.action==='activity')saveActivity(body.payload,guard);
  else throw error(400,'此操作尚未接入');
  return read();
 }
 return {read,save};
}
