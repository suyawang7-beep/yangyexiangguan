/* Personal-center visuals only. API fixtures never contact production or write accounts. */
const {chromium}=require('playwright');
const {createServer}=require('node:http');
const {readFile,mkdir}=require('node:fs/promises');
const {resolve,extname,sep}=require('node:path');
const assert=require('node:assert/strict');
const root=resolve(__dirname,'../ui-preview');
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{
  const file=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
  if(!file.startsWith(root+sep))return res.writeHead(403).end();
  try{const body=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream'}).end(body);}catch{res.writeHead(404).end();}
});
let browser,checks=0;
function check(value,label){assert.ok(value,label);checks++;}
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base=`http://127.0.0.1:${server.address().port}`;
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  const evidence=process.env.RESIDENT_EVIDENCE_DIR;
  if(evidence)await mkdir(evidence,{recursive:true});
  const errors=[],writes=[];
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  // Authentication fixtures expose the actual resident DOM without touching participant data.
  await context.route('**/api/**',route=>{
    if(route.request().method()!=='GET')writes.push(route.request().url());
    const payload=route.request().url().endsWith('/me')?{nickname:'海风里的小岛民',membership:{status:'verified'}}:{profile:{island:'',bio:''},works:[{id:1,title:'海边的小故事',body:'把今天的海风收进故事。',kind:'story',status:'draft'}]};
    return route.fulfill({json:payload});
  });
  await context.addInitScript(()=>sessionStorage.setItem('buzhi-online-token','local-visual-fixture'));
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/resident.html');
  await page.waitForSelector('#center:not(.resident-hidden)');
  check(await page.locator('#motion-toggle').count()===1,'Personal center has an accessible, usable motion control');
  await page.evaluate(()=>document.fonts.ready);
  check(await page.locator('h1').evaluate(el=>getComputedStyle(el).fontFamily.includes('Resident Hand')),'Hero uses the approved handwritten heading, not UI body type');
  check(await page.locator('#title').evaluate(el=>getComputedStyle(el).fontFamily.includes('Resident Rounded')&&parseFloat(getComputedStyle(el).fontSize)>=16),'Form uses a legible rounded font without mobile input zoom');
  check(await page.evaluate(()=>document.fonts.check('16px "Resident Rounded"')&&document.fonts.check('32px "Resident Hand"')),'Local heading and body font files really load');
  check(await page.locator('.resident-sticker').evaluateAll(els=>els.length===3&&els.every(el=>el.getAnimations().length===1)),'Each sticker gets exactly one managed animation');
  check(await page.locator('.resident-sticker').evaluateAll(els=>new Set(els.map(el=>el.getAnimations()[0].effect.getTiming().duration)).size===3),'Shell, wave and star have distinct gentle rhythms');
  const shell=page.locator('.resident-sticker.shell');
  const before=await shell.evaluate(el=>getComputedStyle(el).transform);
  await page.waitForTimeout(160);
  check(await shell.evaluate((el,b)=>getComputedStyle(el).transform!==b,before),'Visible sticker really moves');
  const titleBefore=await page.locator('h1').boundingBox();
  await page.waitForTimeout(160);
  assert.deepEqual(await page.locator('h1').boundingBox(),titleBefore);checks++;
  for(const width of [1440,768,390,320]){
    await page.setViewportSize({width,height:1000});await page.evaluate(()=>scrollTo(0,0));
    await page.waitForTimeout(80);
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width}: no horizontal overflow`);
    check(await page.locator('.resident-hero').evaluate(hero=>{
      const intersects=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
      const copy=[...hero.children].filter(el=>!el.matches('svg,.resident-note')).map(el=>el.getBoundingClientRect());
      const bounds=hero.getBoundingClientRect();
      return [...hero.querySelectorAll('.resident-sticker')].every(el=>{
        const b=el.getBoundingClientRect();
        return getComputedStyle(el).pointerEvents==='none'&&el.getAttribute('aria-hidden')==='true'&&b.left>=bounds.left&&b.right<=bounds.right&&!copy.some(c=>intersects(b,c));
      });
    }),`${width}: decorative stickers remain inside reserved space and do not cover text`);
    check(await page.locator('.resident-tabs button:not(.resident-hidden)').evaluateAll(els=>els.every(el=>el.getBoundingClientRect().height>=44)),`${width}: tabs retain accessible touch targets`);
    if(evidence)await page.screenshot({path:resolve(evidence,`resident-${width}.png`),fullPage:true});
  }
  await page.locator('#motion-toggle').click();
  check(await page.evaluate(()=>localStorage.getItem('buzhi-ui-motion')==='off'),'Personal center saves the same motion preference as the other pages');
  check(await page.locator('.resident-sticker').evaluateAll(els=>els.every(el=>el.getAnimations().every(a=>a.playState==='paused'))),'Switch pauses every sticker');
  check(await page.locator('body').evaluate(el=>el.getAnimations({subtree:true}).every(a=>a.playState!=='running')),'Switch also pauses sea light and all decorative motion');
  await page.reload();await page.waitForSelector('#center:not(.resident-hidden)');
  check(await page.locator('#motion-toggle').getAttribute('aria-pressed')==='false','Saved global setting survives reload');
  await page.locator('#motion-toggle').click();
  const other=await context.newPage();await other.goto(base+'/resident.html');
  await other.locator('#motion-toggle').click();
  await page.waitForFunction(()=>document.querySelector('#motion-toggle').getAttribute('aria-pressed')==='false');checks++;
  await other.close();await page.bringToFront();
  await page.locator('#motion-toggle').click();
  await page.evaluate(()=>scrollTo(0,document.body.scrollHeight));await page.waitForTimeout(140);
  check(await shell.evaluate(el=>el.getAnimations().every(a=>a.playState==='paused')),'Offscreen hero stickers pause');
  await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(140);
  check(await shell.evaluate(el=>el.getAnimations().some(a=>a.playState==='running')),'Stickers resume on returning to the hero');
  // Browser lifecycle is synthetic because headless Chromium may keep background tabs visible.
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
  const hiddenAnimations=await page.locator('body').evaluate(el=>el.getAnimations({subtree:true}).map(a=>({kind:a.constructor.name,name:a.animationName||a.transitionProperty,target:a.effect.target?.className,state:a.playState})));
  check(hiddenAnimations.every(a=>a.state!=='running'),`Hidden page suspends stickers and sea light: ${JSON.stringify(hiddenAnimations)}`);
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForFunction(()=>document.querySelector('#motion-toggle').disabled);
  check(await page.locator('#motion-toggle').isDisabled(),'System reduced-motion overrides the switch');
  check(await page.locator('body').evaluate(el=>el.getAnimations({subtree:true}).every(a=>a.playState!=='running')),'Reduced-motion is static, including managed WAAPI stickers');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.waitForFunction(()=>!document.querySelector('#motion-toggle').disabled);
  check(await page.locator('#motion-toggle').getAttribute('aria-pressed')==='true','Leaving reduced-motion restores the explicit preference');
  await page.locator('[data-tab="relations"]').click();
  check(await page.locator('#relations').isVisible()&&!await page.locator('#works').isVisible(),'Existing tabs still select the intended section');
  await page.locator('[data-tab="works"]').click();await page.locator('[data-edit="1"]').click();
  check(await page.locator('#title').inputValue()==='海边的小故事','Existing edit action still fills the original form');
  await page.locator('#clear').click();check(await page.locator('#title').inputValue()==='','Existing new-work button still clears the form');
  check(writes.length===0,'Visual testing performs no account, password or reward writes');
  check(errors.length===0,`No page errors: ${errors.join('; ')}`);
  await context.close();
  for(const mode of ['anonymous','unverified','blocked-storage']){
    const c=await browser.newContext({reducedMotion:mode==='blocked-storage'?'no-preference':'reduce'});
    if(mode==='unverified'){
      await c.addInitScript(()=>sessionStorage.setItem('buzhi-online-token','local-unverified-fixture'));
      await c.route('**/api/me',r=>r.fulfill({json:{membership:{status:'pending'}}}));
    }
    if(mode==='blocked-storage')await c.addInitScript(()=>Object.defineProperty(window,'localStorage',{configurable:true,get(){throw new DOMException('Blocked','SecurityError');}}));
    const p=await c.newPage(),localErrors=[];p.on('pageerror',e=>localErrors.push(e.message));await p.goto(base+'/resident.html');
    check(await p.locator('#motion-toggle').count()===1,`${mode}: motion control exists independently of account loading`);
    if(mode!=='blocked-storage')check(await p.locator('#center').isHidden(),`${mode}: visuals do not bypass membership gating`);
    else{
      await p.locator('#motion-toggle').click();
      check(await p.locator('#motion-toggle').getAttribute('aria-pressed')==='false','Blocked storage still allows a usable in-page motion switch');
      check(localErrors.length===0,'Blocked cosmetic preference storage causes no page error');
    }
    await c.close();
  }
  console.log(`PASS ${checks} personal-center appearance and motion assertions`);
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();await new Promise(r=>server.close(r));});
