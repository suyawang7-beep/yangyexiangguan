/* Buzhi 2.0: pure state normalization, NO network or storage. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.BuzhiState=api})(typeof window!=='undefined'?window:null,function(){
'use strict';
const PHASE=Object.freeze({IDLE:'idle',LOADING:'loading',READY:'ready',EMPTY:'empty',ERROR:'error',UNAVAILABLE:'unavailable'});
const USER=Object.freeze({GUEST:'guest',AUTHENTICATING:'authenticating',AUTHENTICATED:'authenticated',EXPIRED:'expired',ERROR:'error'});
const EVENTS=Object.freeze({UNKNOWN:'unknown',OPEN:'open',CLOSED:'closed',SCHEDULED:'scheduled'});
function result(phase,data=null,error=null){if(!Object.values(PHASE).includes(phase))throw Error('Invalid data phase');return Object.freeze({phase,data,error:phase===PHASE.ERROR?String(error||'读取失败'):null})}
function asCollectionResponse(payload){if(!payload||!Array.isArray(payload.cards))return result(PHASE.ERROR,null,'卡片目录响应格式不正确');return payload.cards.length?result(PHASE.READY,payload.cards):result(PHASE.EMPTY,[])}
function asProfileResponse(payload){if(!payload||!Number.isFinite(payload.coins)||payload.coins<0||!Array.isArray(payload.draws)||!Array.isArray(payload.ledger))return result(PHASE.ERROR,null,'账户数据响应格式不正确');return result(PHASE.READY,{id:payload.id,nickname:payload.nickname,coins:payload.coins,draws:payload.draws,ledger:payload.ledger,verified:payload.verified??null})}
function asListResponse(payload){if(!Array.isArray(payload))return result(PHASE.ERROR,null,'列表响应格式不正确');return result(payload.length?PHASE.READY:PHASE.EMPTY,payload)}
function safeEvent(value){return Object.values(EVENTS).includes(value)?value:EVENTS.UNKNOWN}
function canUseFeature({identity=USER.GUEST,activity=EVENTS.UNKNOWN,verified=false,ruleConfirmed=false}={}){
if(identity!==USER.AUTHENTICATED)return {enabled:false,reason:identity===USER.AUTHENTICATING?'正在确认登录状态':'请先登录'};
if(verified!==true)return {enabled:false,reason:'需核实参与资格'};
if(activity!==EVENTS.OPEN)return {enabled:false,reason:activity===EVENTS.CLOSED?'本期活动未开放':'活动状态尚未确认'};
if(ruleConfirmed!==true)return {enabled:false,reason:'规则待岛主确认'};
return {enabled:true,reason:''}
}
function createReadOnlyGateway({fetchJson,preview=true}={}){
if(preview!==false)return Object.freeze({read:async()=>result(PHASE.UNAVAILABLE,null,'当前为静态预览，不连接生产接口')});
if(typeof fetchJson!=='function')throw Error('Missing fetchJson transport');
const permitted=new Set(['catalog','me','oc','assets-manifest','announcements']);
return Object.freeze({read:async key=>{
if(!permitted.has(key))return result(PHASE.ERROR,null,'此接口未列入只读白名单');
try{const payload=await fetchJson('/api/'+key);if(key==='catalog')return asCollectionResponse(payload);if(key==='me')return asProfileResponse(payload);if(key==='announcements'||key==='oc')return asListResponse(payload);if(!payload||typeof payload!=='object')return result(PHASE.ERROR,null,'素材清单响应格式不正确');return result(PHASE.READY,payload)}
catch(err){return result(PHASE.ERROR,null,err?.message||'请求失败')}
}})
}
return Object.freeze({PHASE,USER,EVENTS,result,safeEvent,canUseFeature,asCollectionResponse,asProfileResponse,asListResponse,createReadOnlyGateway});
});
