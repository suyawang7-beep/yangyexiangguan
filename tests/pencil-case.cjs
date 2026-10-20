/* Browser regression for all seven selected pencil-case treatments.
   Uses a static preview and a temporary production server; never a live account. */
const {chromium}=require('playwright');
const {createServer}=require('node:http');
const {readFile,mkdir}=require('node:fs/promises');
const {mkdtempSync,rmSync}=require('node:fs');
const {resolve,extname,sep,join}=require('node:path');
const {tmpdir}=require('node:os');
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
const root=resolve(__dirname,'../ui-preview');
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.mp4':'video/mp4'};
const staticServer=createServer(async(req,res)=>{
  const file=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
  if(!file.startsWith(root+sep))return res.writeHead(403).end();
  try{const body=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream'}).end(body);}catch{res.writeHead(404).end();}
});
let browser,productionServer,folder,checks=0;
const errors=[];
function check(value,label){assert.ok(value,label);checks++;}
(async()=>{
  await new Promise(r=>staticServer.listen(0,'127.0.0.1',r));
  const base=`http://127.0.0.1:${staticServer.address().port}`;
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  await context.route('**/*',r=>r.request().url().startsWith(base+'/')?r.continue():r.abort());
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const visit=async name=>{
    await page.goto(`${base}/${name}.html`,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.querySelector('[data-effects-ready="true"][data-pencil-ready="true"]')&&document.querySelector('link[href*="pencil-case.css"]')?.sheet&&document.querySelector('#glass-surfaces')?.sheet);
    await page.evaluate(()=>document.fonts.ready);
  };
  await visit('index');
  check(await page.locator('.pencil-stickers').count()===1,'Selected hand-drawn sticker layer is present, not just the old SVG stickers');
  if(process.argv.includes('--empty-only')){
    await visit('collection');await page.locator('[data-filter="owned"]').click();
    check(await page.locator('.collection-exhibit .pencil-empty-art').count()===1,'The active fan exhibit, not only its hidden source grid, gets the empty illustration');
    check((await page.locator('.exhibit-empty').textContent()).includes('第一张卡'),'Active exhibit keeps the first-card guidance');
    console.log('PASS visible empty illustration');return;
  }
  if(process.argv.includes('--stamp-only')){
    await visit('passport');await page.locator('#nickname').fill('静态盖章');await page.locator('#claim-pass').click();
    await page.waitForSelector('[data-pencil-stamp="arrival"]');
    check(await page.locator('[data-pencil-stamp="arrival"] img').evaluate(el=>getComputedStyle(el).opacity==='1'),'Reduced-motion stamp is fully visible, not a partial animation frame');
    console.log('PASS reduced-motion stamp');return;
  }
  if(process.argv.includes('--replay-only')){
    await page.emulateMedia({reducedMotion:'no-preference'});await visit('mailbox');
    await page.locator('.pencil-reveal').scrollIntoViewIfNeeded();
    await page.evaluate(()=>{document.querySelector('.pencil-replay').click();document.querySelector('.pencil-replay').click();});
    const playing=await page.waitForFunction(()=>{const v=document.querySelector('.pencil-reveal video');return v.currentTime>.1&&!v.paused&&v.parentElement.dataset.playing==='true';});
    check(await playing.jsonValue(),'Rapid replay reaches real running playback, rather than accepting the previous ended frame');await playing.dispose();
    console.log('PASS rapid replay');return;
  }
  if(process.argv.includes('--mobile-postcard-only')){
    await page.setViewportSize({width:390,height:844});await visit('mailbox');
    check(await page.locator('.pencil-postcard').isVisible(),'Mobile mailbox must not hide the new postcard with its old compact-sidebar rule');
    console.log('PASS mobile postcard');return;
  }
  for(const width of process.argv.includes('--features-only')?[]:[1440,390,320]){
    console.log(`Pencil pages at ${width}px`);
    await page.setViewportSize({width,height:1000});
    for(const name of ['index','passport','verify','office','checkin','draw','collection','islanders','mailbox','guide','effects']){
      await visit(name);
      check(await page.locator('.pencil-stickers').count()===1,`${name}/${width}: one hand-drawn layer`);
      check(await page.locator('.pencil-stickers img').count()===3,`${name}/${width}: two penwash objects and a crayon accent`);
      await page.locator('.pencil-stickers').scrollIntoViewIfNeeded();
      await page.waitForFunction(()=>[...document.querySelectorAll('.pencil-stickers img')].every(i=>i.complete&&i.naturalWidth>0));
      check(await page.locator('.pencil-stickers').evaluate(el=>getComputedStyle(el).pointerEvents==='none'&&el.getAttribute('aria-hidden')==='true'),`${name}/${width}: accents cannot intercept navigation`);
      check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${name}/${width}: no page overflow`);
      if(name==='mailbox')check(await page.locator('.pencil-postcard').isVisible(),`${name}/${width}: postcard remains available outside desktop`);
      check(await page.locator('[data-pencil-ambient]').evaluateAll(els=>els.every(el=>el.getAnimations().every(a=>a.playState!=='running'))),`${name}/${width}: reduced motion is static`);
    }
  }
  await page.setViewportSize({width:1440,height:1000});
  await visit('guide');
  check((await page.locator('#map-camera > image').getAttribute('href')).includes('soft-palette'),'Approved clean map is retained');
  check(await page.locator('#map-camera .pencil-map-callouts').count()===1,'Callout lines share the same camera coordinate system');
  for(let i=1;i<=5;i++){await page.locator(`[data-map-stop="${i}"]`).click();check(await page.locator('#voyage').getAttribute('data-stop')===String(i),'Hand-drawn map annotations leave stops actionable');}
  await visit('mailbox');
  check(await page.locator('.pencil-postcard').count()===1,'One original island postcard accompanies the mailbox');
  check(await page.locator('.pencil-postcard figcaption').textContent().then(t=>/10\.20/.test(t)),'Postcard date is real legible DOM text');
  await page.evaluate(()=>{const letter=document.createElement('article');letter.className='glass letter';letter.innerHTML='<h2>异步来信</h2><p>这封信稍晚送到。</p>';document.querySelector('.letters').replaceChildren(letter);});
  await page.waitForSelector('.letters .pencil-letter-mark');
  check(await page.locator('.pencil-postcard').count()===1,'Late notices do not duplicate or remove the postcard');
  const video=page.locator('.pencil-reveal video');
  check(await video.evaluate(v=>v.paused),'No autoplay under reduced motion');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.locator('.pencil-reveal').scrollIntoViewIfNeeded();
  await page.locator('.pencil-replay').click();
  const playback=await page.waitForFunction(()=>{const v=document.querySelector('.pencil-reveal video');return v.currentTime>.15&&!v.paused;});
  check(await playback.jsonValue(),'Drawing process is a real playable sequence');await playback.dispose();
  await page.locator('#motion-toggle').click();
  check(await video.evaluate(v=>v.paused),'Global switch pauses drawing playback');
  check(await page.locator('.pencil-reveal').getAttribute('data-playing')==='false','Turning motion off restores the finished illustration');
  await page.locator('#motion-toggle').click();
  await page.locator('.pencil-replay').click();
  await page.waitForFunction(()=>!document.querySelector('.pencil-reveal video').paused);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  check(await video.evaluate(v=>v.paused),'Hidden tab stops drawing playback');
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
  await visit('collection');await page.locator('[data-filter="owned"]').click();
  await page.waitForSelector('.collection-exhibit .pencil-empty-art');
  check(await page.locator('.exhibit-empty').textContent().then(t=>t.includes('第一张卡')),'Empty illustration retains actionable explanatory text');
  await visit('passport');await page.locator('#nickname').fill('手绘验收');await page.locator('#claim-pass').click();
  await page.waitForSelector('[data-pencil-stamp="arrival"]');
  check(await page.locator('[data-pencil-stamp="arrival"]').textContent().then(t=>t.includes('已登岛')),'Arrival stamp reflects a completed registration');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForFunction(()=>document.querySelector('.world').dataset.motion==='off');
  check(await page.locator('[data-pencil-stamp="arrival"] img').evaluate(el=>getComputedStyle(el).opacity==='1'),'Reduced motion shows the completed stamp, never a faded first animation frame');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await visit('checkin');
  check(await page.locator('[data-pencil-stamp="checkin"]').count()===0,'No earned check-in stamp before success');
  await page.locator('#checkin-button').click();await page.waitForSelector('[data-pencil-stamp="checkin"]');
  check(await page.locator('[data-pencil-stamp="checkin"]').textContent().then(t=>t.includes('已签到')),'Check-in stamp follows the real saved state');
  await page.reload();await page.waitForSelector('[data-pencil-stamp="checkin"]');
  check(await page.locator('[data-pencil-stamp="checkin"]').count()===1,'Stamp survives refresh without duplicated state or reward');
  await visit('office');await page.locator('.office-verification summary').click();await page.locator('#demo-islander').click();await page.locator('[data-task]').first().click();await page.locator('#task-code').fill('ISLAND25');await page.locator('#task-code-form button[type="submit"]').click();
  await page.waitForSelector('[data-pencil-stamp="task"]');
  check(await page.locator('.task-card.completed [data-pencil-stamp="task"]').count()===1,'Task stamp only appears after successful completion');
  await page.locator('.pencil-stickers').scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>document.querySelector('.pencil-stickers [data-pencil-ambient]')?.dataset.ambientRunning==='true');
  check(await page.locator('.pencil-stickers [data-pencil-ambient]').first().evaluate(el=>el.getAnimations().some(a=>a.playState==='running')),'New stickers actually use the shared ambient lifecycle');
  await page.evaluate(()=>scrollTo(0,0));
  await page.waitForFunction(()=>document.querySelector('.pencil-stickers [data-pencil-ambient]')?.dataset.ambientRunning==='false');
  check(await page.locator('.pencil-stickers [data-pencil-ambient]').first().evaluate(el=>el.getAnimations().every(a=>a.playState!=='running')),'Offscreen hand-drawn stickers pause their real animations');
  await page.locator('#motion-toggle').click();
  check(await page.locator('[data-pencil-ambient]').evaluateAll(els=>els.every(el=>el.getAnimations().every(a=>a.playState!=='running'))),'Global switch stops new sticker and stamp motion');
  if(process.env.UI_PREVIEW_CAPTURE_DIR){
    await mkdir(process.env.UI_PREVIEW_CAPTURE_DIR,{recursive:true});
    for(const width of [1440,390])for(const name of ['index','mailbox','guide','collection','checkin']){await page.setViewportSize({width,height:1000});await visit(name);await page.screenshot({path:resolve(process.env.UI_PREVIEW_CAPTURE_DIR,`pencil-${name}-${width}.png`),fullPage:true,animations:'disabled'});}
  }
  // Exercise the asset through the actual server route, not only our static helper.
  folder=mkdtempSync(join(tmpdir(),'buzhi-pencil-api-'));
  const productionPort=48000+Math.floor(Math.random()*1000);
  productionServer=spawn(process.execPath,['server/index.mjs'],{cwd:resolve(__dirname,'..'),env:{...process.env,HOST:'127.0.0.1',PORT:String(productionPort),DB_PATH:join(folder,'check.sqlite'),ADMIN_TOKEN:'isolated-pencil-test-token-20261020-not-live'},stdio:['ignore','pipe','pipe']});
  let output='';productionServer.stdout.on('data',c=>output+=c);productionServer.stderr.on('data',c=>output+=c);
  let port;for(let i=0;i<80;i++){port=output.match(/127\.0\.0\.1:(\d+)/)?.[1];if(port)break;await new Promise(r=>setTimeout(r,100));}
  check(Boolean(port),'Temporary production server starts');
  const live=`http://127.0.0.1:${port}`;
  for(const [path,type] of [['/assets/pencil/postcard.png','image/png'],['/assets/pencil/postcard-drawing.mp4','video/mp4']]){const response=await fetch(live+path);check(response.status===200&&response.headers.get('content-type')===type,`Actual production route serves ${path} with the correct MIME`);}
  const registered=await fetch(live+'/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:'Isolated-test-password-2026!',nickname:'隔离未认证贴纸检查'})}).then(r=>r.json());
  const visitor=await browser.newContext({viewport:{width:390,height:1000},reducedMotion:'reduce'});
  await visitor.addInitScript(token=>sessionStorage.setItem('buzhi-online-token',token),registered.token);
  await visitor.route('**/*',r=>r.request().url().startsWith(live+'/')?r.continue():r.abort());
  const visitorPage=await visitor.newPage();visitorPage.on('pageerror',e=>errors.push(e.message));
  await visitorPage.goto(live+'/checkin.html',{waitUntil:'domcontentloaded'});
  await visitorPage.waitForSelector('#checkin-button[data-membership-blocked="true"]');
  await visitorPage.waitForSelector('[data-pencil-ready="true"]');
  check(await visitorPage.locator('[data-pencil-stamp="checkin"]').count()===0,'Unverified visitor lockout is not a successful check-in and must never receive an earned stamp');
  await visitor.close();
  check(errors.length===0,`No browser errors: ${errors.join('; ')}`);
  console.log(`PASS ${checks} pencil-case assertions: ${process.argv.includes('--features-only')?'targeted interactions':'seven treatments, eleven pages, three widths'} and production assets`);
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();await new Promise(r=>staticServer.close(r));if(productionServer){const stopped=new Promise(r=>productionServer.once('exit',r));productionServer.kill();await stopped;}if(folder)rmSync(folder,{recursive:true,force:true});});

