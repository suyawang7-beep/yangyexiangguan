// Production diagnostics: anonymous browser contexts, GET/HEAD only, no account writes.
const {chromium}=require('playwright');
const {mkdirSync,writeFileSync}=require('node:fs');
const {join}=require('node:path');
const base='https://buzhi-web-production.up.railway.app';
const output=join(__dirname,'..','test-results','live-loading');mkdirSync(output,{recursive:true});
const results=[];let browser;
const round=n=>Math.round(n*10)/10;
(async()=>{
 browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 for(const width of [390,1440])for(const path of ['index.html','passport.html','draw.html']){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',serviceWorkers:'block'});
  const row={width,path,startedAt:new Date().toISOString(),blockedWrites:[],failedRequests:[],httpErrors:[],pageErrors:[]};results.push(row);
  const page=await context.newPage();
  await context.route('**/*',async route=>{const request=route.request();if(!['GET','HEAD'].includes(request.method())){row.blockedWrites.push({method:request.method(),url:request.url().split('?')[0]});return route.abort()}return route.continue()});
  page.on('requestfailed',request=>row.failedRequests.push({url:request.url().split('?')[0],error:request.failure()?.errorText}));
  page.on('response',response=>{if(response.status()>=400)row.httpErrors.push({url:response.url().split('?')[0],status:response.status()})});
  page.on('pageerror',error=>row.pageErrors.push(error.message));
  const began=Date.now();
  try{
   const response=await page.goto(base+'/'+path,{waitUntil:'domcontentloaded',timeout:20000});
   row.status=response.status();row.revision=response.headers()['x-buzhi-revision']||null;row.domContentLoadedMs=Date.now()-began;
   await page.locator(path==='passport.html'?'#passport-returning-tab':'#main h1').waitFor({timeout:8000});
   row.usableMs=Date.now()-began;
   await page.waitForLoadState('networkidle',{timeout:8000}).catch(()=>{row.networkStillActive=true});
   row.observedMs=Date.now()-began;
   row.timing=await page.evaluate(()=>{
    const nav=performance.getEntriesByType('navigation')[0];
    const resources=performance.getEntriesByType('resource').map(r=>({url:r.name.split('?')[0],durationMs:Math.round(r.duration),bytes:r.encodedBodySize,transferBytes:r.transferSize,type:r.initiatorType}));
    return {dnsMs:nav.domainLookupEnd-nav.domainLookupStart,connectMs:nav.connectEnd-nav.connectStart,ttfbMs:nav.responseStart-nav.requestStart,htmlResponseMs:nav.responseEnd-nav.responseStart,resourceCount:resources.length,encodedResourceBytes:resources.reduce((n,r)=>n+r.bytes,0),largestResources:[...resources].sort((a,b)=>b.bytes-a.bytes).slice(0,8),slowestResources:[...resources].sort((a,b)=>b.durationMs-a.durationMs).slice(0,8)};
   });
   await page.screenshot({path:join(output,path.replace('.html','')+'-'+width+'.png')});
  }catch(error){row.error=error.message;row.observedMs=Date.now()-began}
  finally{await context.close()}
  console.log(JSON.stringify(row));
 }
 const summary=results.map(r=>({page:r.path,width:r.width,status:r.status||null,revision:r.revision||null,usableMs:r.usableMs||null,resources:r.timing?.resourceCount||null,encodedMiB:r.timing?round(r.timing.encodedResourceBytes/1024/1024):null,requestFailures:r.failedRequests.length,serverErrors:r.httpErrors.filter(x=>x.status>=500).length,error:r.error||null}));
 writeFileSync(join(output,'results.json'),JSON.stringify({testedAt:new Date().toISOString(),base,location:'GitHub-hosted runner; not a mainland-China speed measurement',anonymous:true,allowedMethods:['GET','HEAD'],summary,results},null,2));
 console.log('READONLY_SUMMARY '+JSON.stringify(summary));
 if(results.some(r=>r.blockedWrites.length||r.error||r.status!==200))process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1}).finally(async()=>{await browser?.close()});
