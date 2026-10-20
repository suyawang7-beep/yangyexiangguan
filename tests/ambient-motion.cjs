/* Real browser coverage for the approved archipelago, every page's stickers,
   and transparent glass. Run with NODE_PATH pointing to Playwright. */
const { chromium } = require('playwright');
const { createServer } = require('node:http');
const { readFile, mkdir } = require('node:fs/promises');
const { resolve, extname, sep } = require('node:path');
const assert = require('node:assert/strict');
const root = resolve(__dirname, '../ui-preview');
const mime = {'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png'};
const server = createServer(async (req,res) => {
  const file = resolve(root, '.' + new URL(req.url,'http://localhost').pathname);
  if (!file.startsWith(root + sep)) return res.writeHead(403).end();
  try {const body=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream'}).end(body);}
  catch {res.writeHead(404).end();}
});
let browser, checks = 0;
const failures = [], errors = [];
function check(value, label) {checks++;if (!value) failures.push(label);}
(async () => {
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  const context = await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'no-preference'});
  const base = `http://127.0.0.1:${server.address().port}`;
  await context.route('**/*', r=>r.request().url().startsWith(base+'/')?r.continue():r.abort());
  const page = await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  async function visit(name) {
    await page.goto(`${base}/${name}.html`,{waitUntil:'networkidle'});
    await page.waitForSelector('[data-effects-ready="true"]');
  }
  if (process.argv.includes('--liquid-only') || process.argv.includes('--liquid-baseline')) {
    const baseline=process.argv.includes('--liquid-baseline');
    const names=baseline?['office','collection','mailbox']:['index','passport','verify','office','checkin','draw','collection','islanders','mailbox','guide','effects'];
    await page.emulateMedia({reducedMotion:'reduce'});
    if(!baseline){
      await visit('passport');await page.locator('#nickname').fill('全站玻璃检查');await page.locator('#claim-pass').click();await page.locator('#public-id').waitFor();
    }
    for(const width of baseline?[1440]:[1440,390]) {
      await page.setViewportSize({width,height:1000});
      for(const name of names){
        console.log(`Liquid ${name} ${width}`);await visit(name);
        check(await page.locator('.site-liquid').count()===1,`${name}/${width}: its own full-page liquid sea is installed`);
        check(await page.locator('[data-liquid-room]').count()>=1,`${name}/${width}: main content backdrop is treated, not just the header`);
        check(await page.locator('[data-liquid-surface]').count()>=3,`${name}/${width}: header, panels and footer use unified glass`);
        if(baseline)continue;
        check(await page.locator('.site-liquid').evaluate(el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return s.position==='fixed'&&s.pointerEvents==='none'&&s.backgroundImage!=='none'&&r.width>=innerWidth&&r.height>=innerHeight&&el.getAttribute('aria-hidden')==='true'}),`${name}/${width}: visible fixed liquid layer stays decorative and covers the viewport`);
        check(await page.locator('[data-liquid-surface]').evaluateAll(els=>els.filter(el=>el.getBoundingClientRect().width>0).every(el=>{const s=getComputedStyle(el),plane=el.querySelector(':scope > .liquid-room-glass');return (s.backdropFilter!=='none'||plane&&getComputedStyle(plane).backdropFilter!=='none')&&s.backgroundImage.includes('rgba(')})),`${name}/${width}: rendered surfaces or their independent glass planes are genuinely translucent and refractive`);
        check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${name}/${width}: new background never widens the document`);
        check(await page.locator('main h1').evaluate(el=>getComputedStyle(el).opacity==='1'),`${name}/${width}: headings are not faded to simulate transparency`);
        check(await page.locator('.liquid-flow').evaluateAll(els=>els.length===2&&els.every(el=>el.getAnimations().every(a=>a.playState!=='running'))),`${name}/${width}: reduced-motion leaves a still liquid backdrop`);
        if(process.env.UI_PREVIEW_CAPTURE_DIR&&(width===1440||['office','draw','mailbox'].includes(name))){await mkdir(process.env.UI_PREVIEW_CAPTURE_DIR,{recursive:true});await page.screenshot({path:resolve(process.env.UI_PREVIEW_CAPTURE_DIR,`liquid-${name}-${width}.png`),animations:'disabled',timeout:15000});}
      }
    }
    if(!baseline){
      await page.emulateMedia({reducedMotion:'no-preference'});await visit('office');
      await page.waitForFunction(()=>[...document.querySelectorAll('.liquid-flow')].every(el=>el.getAnimations().some(a=>a.playState==='running')));
      const start=await page.locator('.liquid-flow').first().evaluate(el=>getComputedStyle(el).transform);
      await page.waitForTimeout(180);
      check(await page.locator('.liquid-flow').first().evaluate((el,before)=>getComputedStyle(el).transform!==before,start),'Subpage liquid current actually moves, not just a styled marker');
      await page.locator('#motion-toggle').click();
      check(await page.locator('.liquid-flow,.glass-breath-light').evaluateAll(els=>els.every(el=>el.getAnimations().every(a=>a.playState!=='running'))),'Global switch pauses liquid currents and panel breathing on subpages');
      await page.evaluate(()=>{const entry=document.createElement('article');entry.className='board-entry';entry.textContent='异步送达的一封信';document.querySelector('main').append(entry);});
      await page.waitForSelector('.board-entry[data-liquid-surface]');
      check(await page.locator('.board-entry .glass-breath-light').count()===1,'Late-arriving message surfaces receive the same glass treatment once');
      check(errors.length===0,`No liquid-site page errors: ${errors.join('; ')}`);
    }
    assert.deepEqual(failures,[],failures.join('; '));console.log(`PASS ${checks} full-site liquid assertions`);return;
  }
  await visit('guide');
  check((await page.locator('#map-camera image').getAttribute('href')).includes('buzhi-archipelago-soft-palette-draft.png'),'Guide actually loads the approved low-saturation archipelago');
  check(await page.locator('.guide-water-motion,.guide-cloud-motion').count()>=2,'Registered water and cloud layers accompany the map');
  if(process.argv.includes('--baseline')) {
    check(await page.locator('.island-sticker use').first().evaluate(el=>el.getAnimations().length===1),'Existing stickers have a real motion binding');
    await visit('index');
    check(await page.locator('.hero-copy .glass-breath-light').count()===1,'Home has a separate breathing highlight');
    check(await page.locator('.home-hero').evaluate(el=>{const s=getComputedStyle(el);return !/rgb\(/.test(s.backgroundImage)&&s.backgroundColor==='rgba(102, 201, 235, 0.12)'}),'The entire home backdrop is transparent liquid glass, not just its text panel');
    assert.deepEqual(failures,[],failures.join('; '));
    console.log(`PASS ${checks} baseline assertions`);return;
  }
  for (const name of ['index','passport','office','checkin','draw','collection','islanders','mailbox','guide','effects','verify']) {
    console.log(`Checking ${name}`);
    await visit(name);
    const stickers = page.locator('.island-sticker');
    check(await stickers.count()>=5,`${name}: original heading and scene stickers retained`);
    check(await stickers.evaluateAll(els=>els.every(el=>el.querySelector('use').getAnimations().length===1)),`${name}: every sticker has a bounded shared motion binding`);
    await stickers.first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(120);
    check(await stickers.first().evaluate(el=>el.querySelector('use').getAnimations().some(a=>a.playState==='running')),`${name}: visible sticker actually animates`);
    check(await stickers.evaluateAll(els=>els.every(el=>getComputedStyle(el).pointerEvents==='none'&&el.closest('[aria-hidden="true"]'))),`${name}: stickers stay decorative and never block actions`);
    await page.locator('#motion-toggle').click();
    check(await page.locator('.island-sticker use,.glass-breath-light').evaluateAll(els=>els.every(el=>el.getAnimations().every(a=>a.playState!=='running'))),`${name}: switch stops stickers and glass`);
    await page.locator('#motion-toggle').click();
  }
  await visit('index');
  const pane = page.locator('.hero-copy');
  check(await page.locator('.home-hero').evaluate(el=>{const s=getComputedStyle(el);return !/rgb\(/.test(s.backgroundImage)&&s.backgroundColor==='rgba(102, 201, 235, 0.12)'}),'The entire home backdrop lets the underlying sea show through');
  check(await pane.evaluate(el=>getComputedStyle(el).backgroundImage.match(/rgba\([^)]*, 0\.(?:0\d*|1\d*|2[0-5]?\d*)\)/)?.length>0),'Home pane has a genuinely transparent glass fill');
  check(await pane.locator('.glass-breath-light').count()===1,'Home uses a separate breathing highlight, not faded text');
  check(await pane.evaluate(el=>getComputedStyle(el).opacity==='1'&&getComputedStyle(el.querySelector('h1')).opacity==='1'),'Text and pane opacity remain intact');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForFunction(()=>document.querySelector('.world').dataset.motion==='off');
  check(await page.locator('.island-sticker use,.glass-breath-light').evaluateAll(els=>els.every(el=>el.getAnimations().every(a=>a.playState!=='running'))),'System reduced-motion stops all new ambient motion');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.waitForFunction(()=>document.querySelector('.world').dataset.motion==='on');
  await page.setViewportSize({width:1440,height:500});
  await page.locator('.site-footer').scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>document.querySelector('.heading-stickers .island-sticker').dataset.ambientRunning==='false');
  check(await page.locator('.heading-stickers .island-sticker use').first().evaluate(el=>el.getAnimations().every(a=>a.playState==='paused')),'Offscreen stickers pause their actual browser animation');
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  check(await page.locator('.island-sticker use,.glass-breath-light').evaluateAll(els=>els.every(el=>el.getAnimations().every(a=>a.playState!=='running'))),'Hidden-page lifecycle signal pauses every ambient animation');
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
  for(const width of [320,390,768,1440]) {
    await page.setViewportSize({width,height:1000});await visit('guide');
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width}: only the map scrolls, never the page`);
    for(const stop of [1,2,3,4,5]) {
      await page.locator(`[data-map-stop="${stop}"]`).click();
      check(await page.locator('#voyage').getAttribute('data-stop')===String(stop),`${width}: map location ${stop} remains actionable`);
    }
    await page.locator('#voyage-overview').click();
    await page.waitForFunction(()=>document.querySelector('#map-camera').transform.baseVal.consolidate().matrix.a<1.001);
    check(await page.locator('#voyage-count').textContent()==='01 / 06',`${width}: overview resets the tour`);
    if(process.env.UI_PREVIEW_CAPTURE_DIR){await mkdir(process.env.UI_PREVIEW_CAPTURE_DIR,{recursive:true});await page.screenshot({path:resolve(process.env.UI_PREVIEW_CAPTURE_DIR,`archipelago-${width}.png`),fullPage:true});}
  }
  await visit('index');
  if(process.env.UI_PREVIEW_CAPTURE_DIR)await page.screenshot({path:resolve(process.env.UI_PREVIEW_CAPTURE_DIR,'liquid-glass-1440.png')});
  check(errors.length===0,`No page errors: ${errors.join('; ')}`);
  assert.deepEqual(failures,[],`${failures.length} failed checks: ${failures.join('; ')}`);
  console.log(`PASS ${checks} ambient assertions across eleven pages and four map widths`);
})().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(async()=>{await browser?.close();server.close();});
