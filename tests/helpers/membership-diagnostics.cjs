// Test-only telemetry: never log response bodies, credentials, application fields or headers.
exports.redact=(value,secrets)=>{
  let text=String(value);
  const variants=[...secrets].filter(Boolean).flatMap(secret=>[secret,JSON.stringify(secret).slice(1,-1)]);
  for(const secret of [...new Set(variants)].sort((a,b)=>b.length-a.length))text=text.replaceAll(secret,'[redacted]');
  return text.replace(/\b(?:BZV|BZI)-[A-Za-z0-9_-]+/g,'[redacted-id]').replace(/\bBearer\s+[^\s"'<>]+/gi,'Bearer [redacted]').replace(/\b[A-Za-z0-9_-]{32,}\b/g,'[redacted]');
};
exports.watchMembership=async(page,width,secrets)=>{
  const record={width,applyRequests:[],applyResponses:[],pageErrors:[],failedRequests:[]},reads=[];
  page.on('pageerror',e=>record.pageErrors.push(e.message));
  page.on('requestfailed',r=>record.failedRequests.push({method:r.method(),path:new URL(r.url()).pathname,error:r.failure()?.errorText}));
  page.on('request',r=>{
    if(new URL(r.url()).pathname!=='/api/membership/apply'||r.method()!=='POST')return;
    try{const body=r.postDataJSON();record.applyRequests.push({douyinHasText:Boolean(body.douyinId),noteHasText:Boolean(body.note)});}catch{record.applyRequests.push({readable:false});}
  });
  page.on('response',r=>{
    if(new URL(r.url()).pathname!=='/api/membership/apply'||r.request().method()!=='POST')return;
    const response={http:r.status(),status:null};record.applyResponses.push(response);
    reads.push((async()=>{try{const data=await r.json();if(typeof data.verificationCode==='string')secrets.add(data.verificationCode);response.status=['visitor','pending','verified','rejected','revoked'].includes(data.status)?data.status:'unexpected';}catch{response.bodyReadable=false;}})());
  });
  await page.addInitScript(()=>{
    const seen=new WeakSet(),probe=window.__membershipProbe={formsSeen:0,invalidFields:[]};
    new MutationObserver(()=>document.querySelectorAll('#membershipApplyForm').forEach(form=>{if(!seen.has(form)){seen.add(form);probe.formsSeen++;}})).observe(document,{childList:true,subtree:true});
    document.addEventListener('invalid',e=>{if(['douyinId','membershipNote'].includes(e.target.id))probe.invalidFields.push(e.target.id);},true);
  });
  async function inspect(){
    if(page.isClosed())return {available:false};
    return page.evaluate(()=>({
      status:document.querySelector('#membershipApplicationStatus')?.textContent||null,
      formMessage:document.querySelector('#membershipFormMessage')?.textContent||'',
      formPresent:Boolean(document.querySelector('#membershipApplyForm')),
      douyinHasText:Boolean(document.querySelector('#douyinId')?.value),
      hasVerificationCode:Boolean(document.querySelector('#membershipVerificationCode')),
      formsSeen:window.__membershipProbe?.formsSeen||0,invalidFields:window.__membershipProbe?.invalidFields||[]
    })).catch(()=>({available:false}));
  }
  return {
    beforeSubmit:async()=>{record.beforeSubmit=await inspect();},
    successfulPost:()=>record.applyResponses.some(r=>r.http===200&&r.status==='pending'),
    report:async stage=>{
      // A stalled response body must not suppress timeout evidence.
      await new Promise(resolve=>{const timer=setTimeout(resolve,750);Promise.allSettled([...reads]).then(()=>{clearTimeout(timer);resolve();});});
      const safe=exports.redact(JSON.stringify({stage,...record,dom:await inspect()}),secrets);
      console.log('[membership-diagnostic] '+safe);return safe;
    }
  };
};
