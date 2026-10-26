const {readFileSync}=require('node:fs');
const source=readFileSync(__dirname+'/../ui-preview/app.js','utf8');
const createAccountCollection=new Function('window',readFileSync(__dirname+'/../ui-preview/account-collection-state.js','utf8')+';return window.BuzhiAccountCollection.create;')({});
const check=(ok,message)=>{if(!ok)throw Error(message)};
function section(a,b){const start=source.indexOf(a);check(start>=0,'missing '+a);const end=source.indexOf(b,start);check(end>start,'missing boundary '+b);return source.slice(start,end)}
const initSource=section('  async function liveInit(){','\n  function activeAsset');
const apiSource=section('  async function liveApi(path,body){','\n  function takeProfile');
async function initProbe(blocked,errorStatus,switchAccount){
 const calls=[];let release;const gate=new Promise(r=>release=r);
 const run=new Function('env', 'let TASKS,liveOcProfiles=[],liveToken="test-token",state={};const LIVE_TASKS=[],CARDS=[],PAGE="passport";env.switchToken=v=>liveToken=v;const {loadManagedArtwork,liveApi,renderPage,toast,sessionStorage,blank}=env;const accountCollection=env.createAccountCollection({cards:CARDS,blank,getToken:()=>liveToken});const takeProfile=p=>{state=accountCollection.acceptProfile(p);env.takeProfile(p)};'+initSource+';return liveInit();');
 const env={
  loadManagedArtwork:async()=>{calls.push('artwork');if(blocked==='artwork')await gate},
  createAccountCollection,
  liveApi:async path=>{calls.push(path);if(path===blocked)await gate;if(path==='catalog')return {cards:[]};if(path==='oc')return [];if(path==='me'){if(errorStatus){const e=Error('temporary failure');e.status=errorStatus;throw e}return {id:'test',draws:[],tasks:[],bonuses:[],checkins:[]}}},
  takeProfile:()=>calls.push('profile'),renderPage:()=>calls.push('render'),toast:()=>calls.push('notice'),
  sessionStorage:{removeItem:()=>calls.push('logout')},blank:()=>({collection:{},history:[]})
 };
 const pending=run(env);
 for(let i=0;i<30;i++)await Promise.resolve();const before=[...calls];if(switchAccount)env.switchToken('other-token');release();await pending;return {before,calls};
}
async function apiProbe(kind){
 let clock,cleared=false,signal,posts=0;
 class Controller{constructor(){this.signal={aborted:false,addEventListener:(name,fn)=>{this.onabort=fn}}}abort(){this.signal.aborted=true;this.onabort?.()}}
 const fetch=async(url,options)=>{posts++;signal=options.signal;if(kind==='status'||kind==='draw-status')return {ok:false,status:kind==='draw-status'?503:401,json:async()=>({error:'expired'})};if(kind==='body')return {ok:true,json:()=>new Promise(()=>{})};return new Promise((resolve,reject)=>options.signal?.addEventListener('abort',()=>reject(Error('aborted'))))};
 const run=new Function('fetch','AbortController','setTimeout','clearTimeout','callPath','let liveToken="test";'+apiSource+';return liveApi(callPath,{});');
 const pending=run(fetch,Controller,fn=>{clock=fn;return 1},()=>{cleared=true},kind==='draw-status'?'draw':'login').then(value=>({value}),error=>({error}));
 for(let i=0;i<12;i++)await Promise.resolve();
 if(kind==='status'||kind==='draw-status')return {result:await pending,posts,cleared};
 check(typeof clock==='function','request must have a finite timeout');clock();
 for(let i=0;i<12;i++)await Promise.resolve();
 const result=await Promise.race([pending,Promise.resolve({stillPending:true})]);
 check(!result.stillPending,'timeout must cover response body too');
 return {result,posts,cleared,signal};
}

async function drawProbe(uncertain){
 let handler,current={disabled:false,textContent:''},replaced,finish,calls=0;
 const nodes={'#draw-stage':{classList:{remove(){},add(){}},setAttribute(){}},'#stage-card':{},'#draw-status':{},'#draw-result-label':{},'.world':{dataset:{motion:'on'}}};
 const document={querySelector:q=>q==='#draw-button'?Object.assign(current,{addEventListener:(name,fn)=>handler=fn}):nodes[q],addEventListener(){}};
 const body=section('  function bindLiveDraw(){','\n  function bindCollection');
 const compile=new Function('document','liveApi','takeProfile','setTimeout','let drawing=false;const accountCollection={catalogReady:true,catalog:[{id:"R-1",previewId:"p1"}]};const state={passport:{},balance:100,history:[]},CARDS=[{id:"p1",rarity:"R",name:"test"}],toast=()=>{},drawBack=()=>"",cardMarkup=()=>"";'+body+';bindLiveDraw();');
 compile(document,async()=>{calls++;if(uncertain)throw {uncertain:true,message:'unknown'};return {card:{id:'R-1'},profile:{}}},()=>{replaced=current;current={disabled:false,textContent:''}},fn=>finish=fn);
 await handler();finish?.();return {current,replaced,calls};
}

async function run(){
 const tests=[
 ['draw finishes on current button',async()=>{const r=await drawProbe(false);check(r.current.textContent==='再寄出一份期待 ↗','draw updated detached button')}],
 ['uncertain draw cannot be retried immediately',async()=>{const r=await drawProbe(true);check(r.current.disabled&&r.calls===1,'uncertain draw enabled another purchase')}],
 ['artwork cannot block login',async()=>check((await initProbe('artwork')).before.includes('profile'),'slow artwork blocked account render')],
 ['catalog cannot block passport',async()=>check((await initProbe('catalog')).before.includes('profile'),'slow catalog blocked account render')],
 ['OC cannot block passport',async()=>check((await initProbe('oc')).before.includes('profile'),'slow OC blocked account render')],
 ['temporary failure keeps session',async()=>{const r=await initProbe(null,503);check(!r.calls.includes('logout'),'temporary failure erased session');check(r.calls.includes('notice'),'temporary failure needs feedback')}],
 ['401 clears expired session',async()=>check((await initProbe(null,401)).calls.includes('logout'),'401 did not clear session')],
 ['old profile response cannot replace new login',async()=>{const r=await initProbe('me',null,true);check(!r.calls.includes('profile'),'old profile replaced new login')}],
 ['old 401 cannot clear new login',async()=>{const r=await initProbe('me',401,true);check(!r.calls.includes('logout'),'old 401 cleared new login')}],
 ['draw proxy failure remains uncertain',async()=>check((await apiProbe('draw-status')).result.error?.uncertain===true,'proxy failure must not invite another purchase')],
 ['API retains HTTP status',async()=>check((await apiProbe('status')).result.error?.status===401,'HTTP status lost')],
 ['timeout aborts once without retry',async()=>{const r=await apiProbe('network');check(r.result.error&&r.signal.aborted&&r.posts===1&&r.cleared,'timeout must abort, clean timer, and never retry')}],
 ['timeout covers stalled JSON body',async()=>check(!!(await apiProbe('body')).result.error,'stalled body needs timeout')]
 ];
 const results=[];for(const [name,test] of tests){try{await test();results.push({name,pass:true})}catch(e){results.push({name,pass:false,error:e.message})}}
 return results;
}
module.exports=run;
if(require.main===module)run().then(results=>{for(const r of results)console.log((r.pass?'PASS ':'FAIL ')+r.name+(r.error?': '+r.error:''));if(results.some(r=>!r.pass))process.exitCode=1});
