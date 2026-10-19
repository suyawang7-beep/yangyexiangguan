/* Run: NODE_PATH=<Playwright installation> node tests/ui-preview-draw.cjs
   Exercises the independent UI preview only; never touches production APIs. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { readFile, mkdir } = require('node:fs/promises');
const { resolve, extname, sep } = require('node:path');

const root = resolve(__dirname, '..');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = resolve(root, '.' + pathname);
    if (!file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' }).end(body);
  } catch { res.writeHead(404).end('Not found'); }
});

let browser;
let checks = 0;
const errors = [];
const check = (condition, message) => { assert.ok(condition, message); checks++; };

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await context.route('**/*', route => route.request().url().startsWith(base + '/') ? route.continue() : route.abort());
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  async function visit(name) {
    await page.goto(`${base}/ui-preview/${name}.html`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.querySelector('[data-effects-ready="true"]') && document.querySelector('#glass-surfaces')?.sheet);
  }
  async function layout(selector) {
    return page.locator(selector).evaluate(el => {
      const r = el.getBoundingClientRect();
      const nav = document.querySelector('.mobile-nav');
      const edge = getComputedStyle(nav).display === 'none' ? innerHeight : nav.getBoundingClientRect().top;
      return { top: r.top, bottom: r.bottom, x: r.x, width: r.width, edge, overflow: document.documentElement.scrollWidth > innerWidth };
    });
  }
  async function capture(name) {
    if (!process.env.UI_PREVIEW_CAPTURE_DIR) return;
    await mkdir(process.env.UI_PREVIEW_CAPTURE_DIR, { recursive: true });
    await page.screenshot({ path: resolve(process.env.UI_PREVIEW_CAPTURE_DIR, name + '.png'), animations: 'disabled' });
  }

  if (process.argv.includes('--guide-only')) {
    await visit('guide');
    check(await page.locator('.guide-explorer').count()===1,'Guide presents one map-first explorer instead of a split reading layout');
    check(await page.locator('[data-map-stop]').count()===5,'Five real island locations have native clickable map labels');
    check(await page.locator('.voyage-stop').count()===0,'Long scroll-driven description cards are removed');
    check(await page.locator('.guide-info').count()===1,'Only one current-place description accompanies the map');
    check(await page.locator('#map-camera image').evaluate(async el=>{const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=el.getAttribute('href')});return img.naturalWidth===1584&&img.naturalHeight===993&&el.getAttribute('href').includes('buzhi-archipelago-soft-palette-draft.png')}),'Guide loads the complete approved 1584 × 993 archipelago instead of the old single-island map');
    for(const width of [320,390,621,768,1024,1440]) {
      await page.setViewportSize({width,height:900});await visit('guide');
      const metrics=await page.locator('.voyage-map').evaluate(el=>{const r=el.getBoundingClientRect(),main=document.querySelector('main').getBoundingClientRect();return {width:r.width,height:r.height,main:main.width}});
      check(metrics.width>=metrics.main*.95&&metrics.height>=450,`${width}px: map dominates the page instead of a small sidebar`);
      check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width}px: guide has no horizontal overflow`);
      check(await page.locator('[data-map-stop]').evaluateAll(pins=>{const map=document.querySelector('.guide-map-stage').getBoundingClientRect();return pins.every(el=>{const r=el.getBoundingClientRect();return r.width>=44&&r.height>=44&&r.left>=map.left&&r.right<=map.right&&r.top>=map.top&&r.bottom<=map.bottom})}),`${width}px: all labels stay on the scrollable map and finger-sized`);
      check(await page.locator('[data-map-stop]').evaluateAll(pins=>{const boxes=pins.map(el=>el.getBoundingClientRect());return boxes.every((a,i)=>boxes.every((b,j)=>i===j||Math.min(a.right,b.right)-Math.max(a.left,b.left)<=1||Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)<=1))}),`${width}px: island labels do not overlap`);
      for(const stop of [1,2,3,4,5]) {
        await page.locator(`[data-map-stop="${stop}"]`).click({timeout:2500});
        check(await page.locator('#voyage').getAttribute('data-stop')===String(stop),`${width}px: place ${stop} is actually clickable, not covered by the info card`);
      }
      await page.locator('#voyage-overview').click();
      await capture(`guide-overview-${width}`);
    }
    await page.setViewportSize({width:390,height:844});await visit('guide');
    await page.getByRole('button',{name:'查看肥啾邮局',exact:true}).click();
    check((await page.locator('#voyage-location').textContent())==='肥啾邮局','Clicking an island label selects its own location');
    check((await page.locator('#voyage-count').textContent())==='04 / 06','Map labels and tour progress stay in sync');
    check(await page.locator('#voyage-destination').getAttribute('href')==='draw.html','Postal label points to the real draw page');
    check(await page.getByRole('button',{name:'查看肥啾邮局',exact:true}).getAttribute('aria-pressed')==='true','Selected label is visibly and accessibly marked');
    await page.locator('#voyage-next').click();
    check((await page.locator('#voyage-location').textContent())==='回忆收藏室','Next stop works without long document scrolling');
    await page.locator('#voyage-prev').click();
    check((await page.locator('#voyage-location').textContent())==='肥啾邮局','Previous stop returns to the corresponding map label');
    await page.locator('#voyage-overview').click();
    check((await page.locator('#voyage-count').textContent())==='01 / 06'&&await page.locator('#voyage-prev').isDisabled(),'Overview returns to the whole island and first stop');
    await page.getByRole('button',{name:'查看岛民事务所',exact:true}).focus();await page.keyboard.press('Enter');
    check((await page.locator('#voyage-location').textContent())==='岛民事务所','Map locations also work with the keyboard');
    await capture('guide-office-390');
    await page.getByRole('button',{name:'查看生日庆典',exact:true}).click();
    check(await page.locator('#voyage-next').isDisabled(),'Final tour stop has an honest disabled next control');
    check(await page.locator('#voyage-destination').getAttribute('href')==='passport.html','Birthday area keeps the passport entry point');
    await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'no-preference'});await visit('guide');
    const before=await page.locator('#map-camera').getAttribute('transform');await page.locator('#voyage-next').click();
    await page.waitForFunction(old=>document.querySelector('#map-camera').getAttribute('transform')!==old,before);
    check((await page.locator('#voyage-location').textContent())==='庆典码头','Existing next-station journey retains a real camera movement');
    await page.locator('#motion-toggle').click();
    check(await page.locator('#map-camera').getAttribute('transform')==='translate(0 0)','Motion-off keeps a still whole-island view');
    await page.getByRole('button',{name:'查看回忆收藏室',exact:true}).click();
    check((await page.locator('#voyage-location').textContent())==='回忆收藏室','Turning motion off never disables map navigation');
    check(await page.locator('#map-camera').getAttribute('transform')==='translate(0 0)','Static interaction does not restart camera motion');
    check(errors.length===0,`No map explorer errors: ${errors.join('; ')}`);
    console.log(`PASS ${checks} guide assertions; dominant map, five anchored labels, six widths, native clicks, keyboard, camera and static navigation`);return;
  }

  if (process.argv.includes('--ritual-only')) {
    await page.emulateMedia({reducedMotion:'no-preference'});
    await visit('draw');
    check(await page.locator('.draw-ritual').count()===1,'Draw reuses a bounded celestial ritual stage');
    check(await page.locator('.draw-meteor-sky').evaluate(el=>{const r=el.getBoundingClientRect();return Math.abs(r.left)<1&&Math.abs(r.width-innerWidth)<1}),'Fixed meteor sky retains full viewport width outside glass containing blocks');
    check(await page.locator('.draw-nightfall').count()===1,'Ceremony provides a full-screen non-interactive night backdrop');
    check(await page.locator('.draw-ritual [aria-hidden="true"]').count()>0,'New celestial decorations are excluded from assistive reading');
    check(await page.locator('.draw-meteor').count()===30,'Thirty reusable meteor nodes provide a richer one-shot shower');
    check(await page.locator('.draw-ritual').evaluate(el=>getComputedStyle(el).pointerEvents==='none'&&getComputedStyle(el).opacity==='0'),'Ritual is dormant and does not intercept controls before drawing');
    await visit('passport');await page.locator('#nickname').fill('星海开卡检查');await page.locator('#claim-pass').click();await page.locator('#public-id').waitFor();
    await visit('draw');
    await page.locator('#draw-button').click();
    await page.waitForFunction(()=>document.querySelector('#draw-stage.is-drawing'));
    check(await page.locator('#draw-stage').getAttribute('aria-busy')==='true','Original draw state, not a second settlement, drives the ritual');
    check(await page.locator('.liquid-flow,.glass-breath-light').evaluateAll(els=>els.every(el=>el.getAnimations().every(a=>a.playState!=='running'))),'Liquid background and pane breathing rest while the dark draw ceremony takes focus');
    await page.waitForFunction(()=>document.querySelector('.draw-ritual').getAnimations({subtree:true}).some(a=>a.animationName==='ritual-awaken'&&a.currentTime>650&&a.currentTime<2500));
    const moving=await page.locator('.draw-ritual').evaluate(el=>({opacity:+getComputedStyle(el).opacity,animations:el.getAnimations({subtree:true}).map(a=>({name:a.animationName,iterations:a.effect.getTiming().iterations}))}));
    check(moving.opacity>0&&moving.animations.length>=3,'Visible orbit, rising light and surrounding stars animate during the real draw');
    check(await page.locator('.draw-nightfall').evaluate(el=>+getComputedStyle(el).opacity>.9&&getComputedStyle(el).pointerEvents==='none'),'Background actually darkens during the draw without blocking controls');
    check(await page.locator('.draw-info').evaluate(el=>getComputedStyle(el).backgroundColor==='rgba(12, 27, 47, 0.88)'),'Draw controls use a readable night surface, not a bright competing panel');
    check(moving.animations.every(a=>a.iterations===1),'Ritual runs once rather than adding perpetual animation');
    check(await page.locator('.draw-meteor').evaluateAll(els=>els.filter(el=>getComputedStyle(el).display!=='none').length<=16),'Small phones use a bounded reduced meteor count');
    if(process.env.UI_PREVIEW_CAPTURE_DIR){await mkdir(process.env.UI_PREVIEW_CAPTURE_DIR,{recursive:true});await page.screenshot({path:resolve(process.env.UI_PREVIEW_CAPTURE_DIR,'ritual-in-progress-390.png')});}
    await page.waitForFunction(()=>document.querySelector('#draw-stage.is-revealed'));
    check((await page.locator('.header-actions [data-balance]').textContent())==='0','Enhanced performance deducts exactly one 50-coin draw');
    check(await page.locator('#stage-card .card-nameplate').count()===1,'Actual saved reward replaces the uniform back');
    await page.waitForFunction(()=>document.querySelector('.draw-ritual').getAnimations({subtree:true}).every(a=>a.playState==='finished'));
    check(await page.locator('.draw-ritual').evaluate(el=>+getComputedStyle(el).opacity===0),'Ceremony fades away after reveal');
    await page.waitForFunction(()=>+getComputedStyle(document.querySelector('.draw-nightfall')).opacity===0);
    check(await page.locator('.world').getAttribute('data-draw-night')==='false','Original daytime appearance returns after the reveal');
    await page.locator('#motion-toggle').click();
    check(await page.locator('.draw-ritual').evaluate(el=>getComputedStyle(el).display==='none'),'Global motion switch hides the complete ritual');
    await page.locator('#motion-toggle').click();
    check(await page.locator('.draw-ritual').evaluate(el=>el.getAnimations({subtree:true}).every(a=>a.playState==='finished')),'Turning motion back on never replays a completed ceremony');
    await page.evaluate(()=>localStorage.removeItem('buzhi-ui-preview-v3'));
    await visit('passport');await page.locator('#nickname').fill('中断开卡检查');await page.locator('#claim-pass').click();await page.locator('#public-id').waitFor();await visit('draw');
    await page.locator('#draw-button').click();await page.waitForFunction(()=>document.querySelector('#draw-stage.is-drawing'));
    await page.locator('#motion-toggle').click();await page.waitForFunction(()=>document.querySelector('#draw-stage.is-revealed'));
    check((await page.locator('.header-actions [data-balance]').textContent())==='0','Stopping effects mid-draw reveals the saved reward without another charge');
    check(await page.locator('.draw-ritual').evaluate(el=>getComputedStyle(el).display==='none'),'Interrupted ceremony leaves no overlay behind');
    check(await page.locator('.draw-nightfall').evaluate(el=>+getComputedStyle(el).opacity===0),'Interrupting effects restores the original background immediately');
    await page.emulateMedia({reducedMotion:'reduce'});await visit('draw');
    check(await page.locator('.draw-ritual').evaluate(el=>getComputedStyle(el).display==='none'),'System reduced-motion preference disables the ceremony');
    await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'no-preference'});
    await page.evaluate(()=>{localStorage.removeItem('buzhi-ui-preview-v3');localStorage.setItem('buzhi-ui-motion','on')});
    await visit('passport');await page.locator('#nickname').fill('电脑开卡检查');await page.locator('#claim-pass').click();await page.locator('#public-id').waitFor();await visit('draw');await page.locator('#draw-button').click();
    try {await page.waitForFunction(()=>document.querySelector('.draw-ritual').getAnimations({subtree:true}).some(a=>a.animationName==='ritual-awaken'&&a.currentTime>650));}
    catch(error){console.error('Desktop ritual state:',await page.evaluate(()=>({motion:document.querySelector('.world').dataset.motion,stage:document.querySelector('#draw-stage').className,ritual:document.querySelector('.draw-ritual').dataset.ritualState,animations:document.querySelector('.draw-ritual').getAnimations({subtree:true}).map(a=>({name:a.animationName,state:a.playState,time:a.currentTime}))})));throw error;}
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Desktop meteor/light layers do not cause horizontal overflow');
    if(process.env.UI_PREVIEW_CAPTURE_DIR)await page.screenshot({path:resolve(process.env.UI_PREVIEW_CAPTURE_DIR,'ritual-in-progress-1440.png')});
    check(errors.length===0,`No ritual errors: ${errors.join('; ')}`);
    console.log(`PASS ${checks} ritual assertions; finite live ceremony, bounded phone effects, preserved settlement and reduced/interrupted motion`);return;
  }

  if (process.argv.includes('--fantasy-only')) {
    await visit('draw');
    check(await page.locator('.pool-preview .card-nameplate').count()===8,'Every preview card uses the redesigned fantasy nameplate');
    check(await page.locator('.pool-preview .card-picture').first().evaluate(el=>getComputedStyle(el,'::before').backgroundImage.includes('memory-card-celestial.svg')),'Actual celestial artwork decorates the arched card window');
    check(await page.locator('.pool-preview .card-picture').first().evaluate(el=>parseFloat(getComputedStyle(el).borderTopLeftRadius)>parseFloat(getComputedStyle(el).borderBottomLeftRadius)),'Card art sits inside an arched fantasy window');
    for(const width of [320,390,768,1440]) {
      await page.setViewportSize({width,height:1000});await visit('draw');
      check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Fantasy cards fit ${width}px`);
      check(await page.locator('.pool-preview .card-title').evaluateAll(els=>els.every(el=>el.scrollWidth<=el.clientWidth+1&&el.scrollHeight<=el.clientHeight+1)),`Card names remain readable at ${width}px`);
      const cramped=await page.locator('.pool-preview .memory-card').evaluateAll(els=>els.map(el=>{const inner=el.querySelector('.card-inner').getBoundingClientRect(),title=el.querySelector('.card-title').getBoundingClientRect(),art=el.querySelector('.card-picture').getBoundingClientRect();return {title:el.querySelector('.card-title').textContent,artHeight:art.height,clipped:title.bottom>inner.bottom-2||title.left<inner.left||title.right>inner.right}}).filter(el=>el.clipped||el.artHeight<45));
      check(cramped.length===0,`Preview artwork and names fit their clipping ancestors at ${width}px: ${JSON.stringify(cramped)}`);
      await capture(`fantasy-draw-${width}`);
      if(process.env.UI_PREVIEW_CAPTURE_DIR)await page.locator('.pool-preview').screenshot({path:resolve(process.env.UI_PREVIEW_CAPTURE_DIR,`fantasy-pool-${width}.png`),animations:'disabled'});
    }
    await visit('collection');
    const cards=page.locator('#collection-grid .memory-card');
    check(await cards.count()===16,'All 16 cards, not just the first preview, use the fantasy design');
    check(await cards.locator('.card-nameplate').count()===16,'One shared design covers the full collection');
    check(await cards.evaluateAll(els=>new Set(els.map(el=>getComputedStyle(el).getPropertyValue('--relic-metal').trim())).size===5),'Five rarity tiers have five distinct metal palettes');
    check(await cards.evaluateAll(els=>els.every(el=>getComputedStyle(el,'::after').pointerEvents==='none')),'Ornamental frames never intercept card clicks');
    await capture('fantasy-collection-1440');
    await page.setViewportSize({width:390,height:844});await visit('passport');
    await page.locator('#nickname').fill('星海魔法卡检查');await page.locator('#claim-pass').click();await page.locator('#public-id').waitFor();
    await visit('draw');await page.locator('#draw-button').click();await page.waitForFunction(()=>document.querySelector('#stage-card [data-rarity]'));
    check(['SR','SSR'].includes(await page.locator('#stage-card .memory-card').getAttribute('data-rarity')),'First-draw SR/SSR guarantee is unchanged');
    check((await page.locator('.header-actions [data-balance]').textContent())==='0','Redesign leaves the 50-coin settlement unchanged');
    const name=await page.locator('#stage-card .card-title').textContent();
    check(await page.locator('#stage-card .card-nameplate').count()===1,'Revealed reward uses the new front');
    await capture('fantasy-result-390');await visit('collection');await page.locator('[data-filter="owned"]').click();
    const card=page.locator('.collection-exhibit .memory-card').first();await card.click();await page.locator('#card-detail[open]').waitFor();
    check((await page.locator('#card-detail-title').textContent())===name,'Collection details retain the real drawn card');
    check(await page.locator('#card-detail .card-nameplate').count()===1,'Enlarged details use the same fantasy front');
    await capture('fantasy-detail-390');
    check(errors.length===0,`No fantasy-card errors: ${errors.join('; ')}`);
    console.log(`PASS ${checks} fantasy-card assertions; all 16 fronts, five palettes, four widths, draw and details`);
    return;
  }

  if (process.argv.includes('--mystery-only')) {
    await visit('draw');
    check(await page.locator('.card-back img[src*="memory-card-back.svg"]').count()===1,'Waiting card uses the new original moon-and-sea back');
    check(await page.locator('.card-back img').evaluate(img=>img.complete&&img.naturalWidth===300&&img.naturalHeight===425),'Actual vector back loads at the unchanged card ratio');
    check(!(await page.locator('.card-back').getAttribute('data-rarity')),'Uniform back does not disclose the rarity before reveal');
    const names=await page.locator('.pool-preview .card-title').allTextContents();
    check(names.length===8&&names[0]==='岛屿与永恒'&&names[1]==='许愿的瞬间','Preview card titles and contents are retained');
    check(await page.locator('.pool-preview .memory-card').first().evaluate(el=>getComputedStyle(el,'::after').backgroundImage.includes('memory-card-frame.svg')&&getComputedStyle(el,'::after').pointerEvents==='none'),'New fine-line frame decorates cards without intercepting clicks');
    const contrast=await page.locator('.card-back img').evaluate(img=>{const c=document.createElement('canvas');c.width=300;c.height=425;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);const l=(x,y)=>[...ctx.getImageData(x,y,1,1).data].slice(0,3).reduce((a,b)=>a+b,0);return l(15,210)>l(55,245)+150});
    check(contrast,'The rendered back has a dark mystery window and lighter ornamental border');
    for (const width of [320,390,768,1440]) {
      await page.setViewportSize({width,height:900});await visit('draw');
      check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Card back fits ${width}px`);
      await capture(`mystery-back-${width}`);
    }
    await page.setViewportSize({width:390,height:844});
    await visit('passport');await page.locator('#nickname').fill('星月卡背检查');await page.locator('#claim-pass').click();await page.locator('#public-id').waitFor();
    await visit('draw');await page.locator('#draw-button').click();
    await page.waitForFunction(()=>document.querySelector('#stage-card [data-rarity]'));
    const rarity=await page.locator('#stage-card .memory-card').getAttribute('data-rarity');
    check(['SR','SSR'].includes(rarity),'First draw still guarantees only SR/SSR');
    check((await page.locator('.header-actions [data-balance]').textContent())==='0','One draw still costs exactly 50 coins');
    const name=await page.locator('#stage-card .card-title').textContent();
    check(await page.locator('#stage-card .memory-card').evaluate(el=>getComputedStyle(el,'::after').backgroundImage.includes('memory-card-frame.svg')),'Revealed result retains the same frame without changing its content');
    await capture('mystery-revealed-390');
    await visit('collection');await page.locator('[data-filter="owned"]').click();
    await page.waitForFunction(()=>document.querySelectorAll('.collection-exhibit .memory-card').length===1);
    const card=page.locator('.collection-exhibit .memory-card').first();
    check((await card.locator('.card-title').textContent())===name,'New frame preserves the drawn card in collection');
    await card.click();await page.locator('#card-detail[open]').waitFor();
    check((await page.locator('#card-detail-title').textContent())===name,'Framed collection card still opens its own details');
    check(await page.locator('#card-detail .memory-card').evaluate(el=>getComputedStyle(el,'::after').pointerEvents==='none'),'Detail-frame decoration is non-interactive');
    await capture('mystery-detail-390');
    await page.locator('#card-detail .dialog-close').click();
    await page.setViewportSize({width:1440,height:1000});await visit('collection');
    await capture('mystery-collection-1440');
    check(errors.length===0,`No card-frame errors: ${errors.join('; ')}`);
    console.log(`PASS ${checks} mystery-card assertions; original back, ornamental frame, four widths, unchanged first draw/50 coins, collection and details`);
    return;
  }

  if (process.argv.includes('--headers-only') || process.argv.includes('--decor-only')) {
    const enhanced = process.argv.includes('--decor-only');
    const rooms = ['index','passport','office','checkin','draw','collection','islanders','mailbox','guide','effects'];
    for (const width of [390,1440]) {
      await page.setViewportSize({width,height:width === 390 ? 844 : 1000});
      for (const room of rooms) {
        await visit(room); await page.evaluate(() => document.fonts.ready);
        check(await page.locator('.brand-mark img[src$="island-mark.svg"]').count() === 1, `${room}/${width}: island, not bird text, identifies the site`);
        check(await page.locator('.brand-mark img').evaluate(el => el.complete && el.naturalWidth > 0), `${room}/${width}: real island logo loads`);
        check(await page.locator('link[rel="icon"][href$="island-mark.svg"]').count() === 1, `${room}/${width}: browser icon is also the island`);
        check(await page.locator('main h1').count() === 1, `${room}/${width}: one primary title remains`);
        check(await page.locator('[data-scene-heading] .island-sticker').count() >= 1, `${room}/${width}: page has original vector sticker decoration`);
        check(await page.locator('.island-sticker').first().evaluate(el => getComputedStyle(el).fill === 'none'), `${room}/${width}: stroke-only sticker paths do not inherit unwanted black fill`);
        check(await page.locator('.heading-stickers').evaluate(el => el.getAttribute('aria-hidden') === 'true' && getComputedStyle(el).pointerEvents === 'none'), `${room}/${width}: decorative stickers cannot block controls or screen readers`);
        check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${room}/${width}: new title composition fits the viewport`);
        if (enhanced) {
          check(await page.locator('.scene-decor .island-sticker').count() >= 3, `${room}/${width}: sea stickers continue into page sections rather than only the heading`);
          check(await page.locator('.scene-decor').evaluate(el=>el.getAttribute('aria-hidden')==='true'&&getComputedStyle(el).pointerEvents==='none'), `${room}/${width}: new illustration groups never capture interactions`);
          if (room === 'index') {
            check(await page.locator('main h1').evaluate(el=>getComputedStyle(el).fontFamily.includes('Buzhi Playful')), 'Homepage has its own artistic Chinese title');
            check(await page.evaluate(()=>[...document.fonts].some(f=>f.family==='Buzhi Playful'&&f.status==='loaded')), 'Actual artistic font is loaded, not a system fallback');
            check(!(await page.locator('.subtitle').evaluate(el=>getComputedStyle(el).fontFamily.includes('Buzhi Playful'))), 'Artistic title font is not applied to explanatory text');
          }
        }
        if (room === 'office') {
          check(await page.locator('main h1').evaluate(el => getComputedStyle(el).fontFamily.includes('Buzhi Notice')), 'Office heading uses its own bold notice typeface');
          check(await page.evaluate(() => [...document.fonts].some(f => f.family === 'Buzhi Notice' && f.status === 'loaded')), 'Actual notice font is loaded, not a fallback');
          if (width === 1440) { const box = await page.locator('main h1').boundingBox(); check(Math.abs(box.x + box.width / 2 - width / 2) < 90, 'Office title is centered like a notice board'); }
        }
        if (room === 'islanders') {
          check(await page.locator('main h1').evaluate(el => getComputedStyle(el).fontFamily.includes('Buzhi Hand')), 'Gallery uses a genuinely different handwritten heading face');
          check(await page.evaluate(() => [...document.fonts].some(f => f.family === 'Buzhi Hand' && f.status === 'loaded')), 'Actual handwritten font loads locally');
          if (width === 1440) { const box = await page.locator('main h1').boundingBox(); check(box.x + box.width / 2 > width * .62, 'Gallery title is offset to the right, unlike the office'); }
          else { const box = await page.locator('main h1').boundingBox(); check(box.x + box.width / 2 > width * .6, 'Gallery title remains on the right on mobile, clear of the jellyfish'); }
          await page.locator('#oc-next').click(); await page.waitForFunction(() => document.querySelector('#oc-step').textContent === '02');
          check(await page.locator('.oc-slide.active .oc-caption strong').textContent() === '吱吱', 'Gallery controls still work beneath decorative stickers');
        }
        await capture(`headers-${room}-${width}`);
      }
    }
    await page.setViewportSize({width:320,height:680});
    for (const room of ['index','office','islanders','passport']) { await visit(room); check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${room}: small phone remains usable`); }
    check(errors.length === 0, `No heading/sticker errors: ${errors.join('; ')}`);
    console.log(`PASS ${checks} heading/sticker assertions; ten pages, real heading fonts, island brand, desktop/mobile layouts and gallery controls`);
    return;
  }

  if (process.argv.includes('--office-only')) {
    await visit('passport');
    await page.locator('#nickname').fill('事务所排版检查');
    await page.locator('#claim-pass').click();
    await page.locator('#public-id').waitFor();
    // Existing arrival records must survive removal of their presentation card.
    await page.evaluate(() => {
      const key = 'buzhi-ui-preview-v3';
      const saved = JSON.parse(localStorage.getItem(key));
      saved.tasks = ['arrival']; localStorage.setItem(key, JSON.stringify(saved));
    });
    await visit('office');
    check(await page.locator('.welcome-strip').count() === 0, 'Remove the entire today-to-do panel, not only its heading');
    check(await page.locator('.task-list .task-card').count() === 6, 'Keep the six celebration code tasks');
    check(await page.locator('[data-task="arrival"]').count() === 0, 'Remove the arrival action');
    check(!/报到|报道/.test(await page.locator('.task-list').innerText()), 'No arrival task card remains');
    check(await page.locator('.bird-journey').getAttribute('aria-valuenow') === '0', 'Arrival history is preserved without inflating formal-task progress');
    await page.locator('.office-verification').evaluate(el => { el.open = true; });
    await page.locator('#demo-islander').click();
    await page.locator('[data-task="wish"]').click();
    await page.locator('#task-code').fill('ISLAND25');
    await page.locator('#task-code-form button[type="submit"]').click();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('buzhi-ui-preview-v3')));
    check(saved.balance === 75 && saved.tasks.includes('arrival') && saved.tasks.includes('wish'), 'Task reward and existing participation records are unchanged');
    check(await page.locator('.bird-journey').getAttribute('aria-valuenow') === '1', 'Progress updates after completing one formal task');
    check((await page.locator('.ledger').innerText()).includes('25'), 'Coin ledger remains visible');
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const boxes = await page.locator('.task-list .task-card').evaluateAll(cards => cards.map(card => { const r = card.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom }; }));
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}: staggered tasks do not overflow`);
      check(boxes.every((a, i) => boxes.slice(i + 1).every(b => a.right <= b.x || b.right <= a.x || a.bottom <= b.y || b.bottom <= a.y)), `${width}: staggered cards never overlap`);
      if (width === 1440) check(Math.abs(boxes[0].y - boxes[1].y) >= 20, 'Desktop task cards use visibly staggered rows');
      else check(Math.abs(boxes[0].x - boxes[1].x) >= 6, `${width}: single-column cards alternate gentle horizontal offsets`);
      await capture(`office-stagger-${width}`);
    }
    check(errors.length === 0, 'No office JavaScript errors');
    console.log(`PASS ${checks} office assertions; removed panels, preserved records, code reward, bird progress and four-width staggered layout`);
    return;
  }

  if (process.argv.includes('--passport-tabs-only')) {
    await visit('passport');
    const tabs = page.getByRole('tab');
    check(await tabs.count() === 2, 'Passport offers new and returning islander tabs above the form');
    check(await page.getByRole('tab', {name:'新岛民登记'}).getAttribute('aria-selected') === 'true', 'New registration is selected by default');
    await page.locator('#nickname').fill('切换后保留昵称');
    await page.getByRole('tab', {name:'欢迎老岛民'}).click();
    check(await page.locator('#passport-form').isHidden(), 'Returning mode hides the new registration panel');
    check(await page.locator('#returning-islander-panel').isVisible(), 'Returning form appears in the same registration area');
    check(await page.locator('#main > section:has(#live-login)').count() === 0, 'No duplicate returning-islander card remains below the passport');
    check(await page.locator('#live-login').count() === 1, 'There is exactly one returning-islander form');
    check(await page.locator('.ticket-gift').isHidden(), 'Returning users are not shown a new-account 50-coin promise');
    check(await page.locator('#returning-key').getAttribute('type') === 'password', 'Recovery key remains masked');
    check(await page.locator('#live-login button[type="submit"]').isDisabled(), 'Static Pages preview never pretends to restore a real account');
    check(/预览/.test(await page.locator('#returning-islander-panel').innerText()), 'Preview mode explains its account limitation');
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({width, height:900});
      const tabRect = await layout('#passport-returning-tab');
      check(tabRect.top > 0 && tabRect.bottom < 500, `${width}: returning option is near the top instead of below the page`);
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}: both entry modes fit without horizontal overflow`);
      await capture(`passport-returning-${width}`);
    }
    await page.getByRole('tab', {name:'新岛民登记'}).click();
    check(await page.locator('#nickname').inputValue() === '切换后保留昵称', 'Switching modes preserves the unfinished nickname');
    await page.getByRole('tab', {name:'新岛民登记'}).press('ArrowRight');
    check(await page.getByRole('tab', {name:'欢迎老岛民'}).getAttribute('aria-selected') === 'true', 'Keyboard arrows switch entry mode');
    await page.getByRole('tab', {name:'欢迎老岛民'}).press('Home');
    check(await page.locator('#passport-form').isVisible(), 'Home key returns to new registration');
    await page.locator('#claim-pass').click();
    await page.locator('#public-id').waitFor();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('buzhi-ui-preview-v3')));
    check(saved.balance === 50 && saved.passport.nickname === '切换后保留昵称', 'Original registration still grants exactly 50 once');
    check(await tabs.count() === 0, 'Logged-in passport shows its ticket instead of duplicate signup/login controls');
    check(errors.length === 0, `No passport tab errors: ${errors.join('; ')}`);
    console.log(`PASS ${checks} passport-tab assertions; switching, keyboard, three widths, no lower duplicate and unchanged registration`);
    return;
  }

  await visit('passport');
  await page.evaluate(() => document.fonts.ready);
  check(await page.locator('body').evaluate(el => getComputedStyle(el).fontFamily.includes('Buzhi Rounded')), 'The cute rounded font is the actual UI font, not the old serif fallback');
  check(await page.evaluate(() => [...document.fonts].some(font => font.family === 'Buzhi Rounded' && font.status === 'loaded')), 'The bundled Chinese rounded font successfully loads');
  check(await page.locator('main .page-heading').count() === 0, 'Passport has its own ticket-office opening instead of the shared numbered header');
  const claimPosition = await layout('#claim-pass');
  check(claimPosition.bottom <= claimPosition.edge - 8, 'Passport claim action is above the mobile bottom bar');
  await page.locator('#nickname').fill('拆信布局检查');
  await page.locator('#claim-pass').click();
  await page.locator('#public-id').waitFor();
  await visit('draw');
  check(await page.locator('.draw-courier svg').count() === 1, 'One bird courier carries the card, including when reduced motion is enabled');
  check(await page.locator('.draw-meteor').count() === 30, 'Draw scene provides thirty staggered meteor trails');
  check(await page.locator('.draw-meteor-sky').evaluate(el => getComputedStyle(el).display) === 'none', 'Reduced motion hides the meteor sky');
  const initialState = await context.storageState();
  const firstButton = await layout('#draw-button');
  check(firstButton.top >= 0 && firstButton.bottom <= firstButton.edge - 8,
    `390×844: draw button must be fully above the bottom navigation; got bottom=${firstButton.bottom}, navigation=${firstButton.edge}`);
  check(await page.locator('main .page-heading').count() === 0, 'Draw page must not reuse the numbered page-heading template');
  check(await page.locator('main h1').count() === 1, 'Draw page keeps one accessible main heading');
  const stage = await page.locator('#draw-stage').boundingBox();
  check(Math.abs(stage.x + stage.width / 2 - 195) < 2, 'Draw stage is centered on mobile');
  await capture('draw-mobile-390');
  if (process.argv.includes('--layout-only')) { console.log(`PASS ${checks} initial layout assertions`); return; }

  if (process.argv.includes('--bird-only')) {
    check(await page.locator('.draw-button-bird svg').count() === 1, 'The real draw action gets one decorative bird, without replacing the button');
    check(await page.locator('.draw-button-nest').getAttribute('data-bird-mood') === 'rest', 'System reduced motion keeps the button bird still');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.waitForFunction(() => document.querySelector('.draw-button-nest')?.dataset.birdMood === 'sleep');
    check(await page.locator('.draw-button-bird .courier-eye-sleep').evaluate(el => getComputedStyle(el).opacity) === '1', 'Waiting bird has a visibly closed eye');
    await page.locator('#draw-button').hover();
    check(await page.locator('.draw-button-nest').getAttribute('data-bird-mood') === 'awake', 'Mouse hover wakes the button bird');
    check(await page.locator('#draw-stage').getAttribute('data-bird-mood') === 'awake', 'Existing courier responds to the button, too');
    check(await page.locator('.draw-button-bird .courier-eye-open').evaluate(el => getComputedStyle(el).opacity) === '1', 'Awake bird actually opens its eye');
    await page.mouse.move(0, 0);
    await page.locator('#draw-button').focus();
    check(await page.locator('.draw-button-nest').getAttribute('data-bird-mood') === 'awake', 'Keyboard focus also wakes the bird');
    await page.locator('#draw-button').evaluate(el => el.blur());
    for (const viewport of [{width:320,height:680},{width:390,height:844},{width:1440,height:1000}]) {
      await page.setViewportSize(viewport);
      const rect = await layout('#draw-button');
      check(!rect.overflow && rect.bottom <= rect.edge - 8, `${viewport.width}: bird decoration keeps the draw button visible and unclipped`);
      await capture(`button-bird-${viewport.width}`);
    }
    await page.locator('#draw-button').click();
    await page.waitForFunction(() => document.querySelector('.draw-button-nest')?.dataset.birdMood === 'sending');
    check(await page.locator('#draw-button').isDisabled(), 'Bird interaction cannot trigger a duplicate draw');
    await page.locator('#draw-stage.is-revealed').waitFor({timeout:6000});
    check(await page.locator('.draw-button-nest').getAttribute('data-bird-mood') === 'celebrate', 'Button bird cheers when the original courier reveals the result');
    check(await page.locator('.draw-button-bird svg').count() === 1, 'Result label updates do not delete the button decoration');
    const result = await page.evaluate(() => JSON.parse(localStorage.getItem('buzhi-ui-preview-v3')));
    check(result.balance === 0 && result.history.length === 1, 'Only the original 50-coin settlement runs');
    await page.locator('#motion-toggle').click();
    await page.waitForFunction(() => document.querySelector('.draw-button-nest')?.dataset.birdMood === 'rest');
    check(await page.locator('.draw-button-bird svg').evaluate(el => getComputedStyle(el).animationName) === 'none', 'Turning motion off stops the button bird');
    const touchContext = await browser.newContext({ viewport:{width:390,height:844}, hasTouch:true, isMobile:true, reducedMotion:'no-preference', storageState:initialState });
    await touchContext.route('**/*', route => route.request().url().startsWith(base + '/') ? route.continue() : route.abort());
    const touch = await touchContext.newPage(); touch.on('pageerror', error => errors.push(error.message));
    await touch.goto(`${base}/ui-preview/draw.html`, {waitUntil:'networkidle'});
    await touch.waitForSelector('.draw-button-bird');
    await touch.locator('#draw-button').tap();
    await touch.waitForFunction(() => document.querySelector('.draw-button-nest')?.dataset.birdMood === 'sending');
    check(await touch.locator('#draw-stage.is-drawing').count() === 1, 'Real touch tap starts the existing courier delivery without requiring hover');
    await touch.locator('#motion-toggle').tap();
    await touch.locator('#draw-stage.is-revealed').waitFor({timeout:1000});
    const touchResult = await touch.evaluate(() => JSON.parse(localStorage.getItem('buzhi-ui-preview-v3')));
    check(touchResult.balance === 0 && touchResult.history.length === 1, 'Touch interruption neither loses the result nor charges twice');
    await touchContext.close();
    check(errors.length === 0, `No bird interaction errors: ${errors.join('; ')}`);
    console.log(`PASS ${checks} focused bird/layout assertions; mouse, keyboard, touch, delivery, single settlement and motion controls`);
    return;
  }

  for (const viewport of [{ width: 320, height: 680 }, { width: 375, height: 812 }, { width: 768, height: 1024 }, { width: 1440, height: 1000 }]) {
    await page.setViewportSize(viewport);
    const rect = await layout('#draw-button');
    check(!rect.overflow, `${viewport.width}: no horizontal document overflow`);
    check(rect.top >= 0 && rect.bottom <= rect.edge - 8, `${viewport.width}: primary draw button remains fully visible without scrolling (bottom=${rect.bottom}, edge=${rect.edge})`);
    const card = await page.locator('#stage-card').boundingBox();
    check(Math.abs(card.x + card.width / 2 - viewport.width / 2) < 2, `${viewport.width}: card is horizontally centered`);
    await capture(`draw-${viewport.width}`);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#draw-button').click();
  await page.locator('#draw-stage.is-revealed').waitFor();
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('buzhi-ui-preview-v3')));
  check(state.balance === 0, 'First draw still deducts exactly 50 coins');
  check(state.history.length === 1 && state.history[0].first === true, 'First draw records one result');
  check(Object.values(state.collection).reduce((sum, item) => sum + item.quantity, 0) === 1, 'First result is saved once in collection');
  check(/^(SR|SSR) ·/.test(await page.locator('#draw-result-label').textContent()), 'First-draw SR/SSR guarantee is unchanged');
  check(await page.locator('#draw-button').isDisabled(), 'Insufficient balance prevents a second draw');
  check(/正常池/.test(await page.locator('.draw-info .pill').textContent()), 'First-draw status updates to the normal pool');
  check(/1\/16/.test(await page.locator('#draw-pool-description').textContent()), 'Pool explanation updates after first draw');
  const resultName = (await page.locator('#draw-result-label').textContent()).split(' · ')[1];
  const resultStatus = await page.locator('#draw-status').textContent();
  check(resultStatus.includes(resultName) && resultStatus.includes('现在拥有 1 张'), 'Result status announces the drawn card and actual owned quantity');
  await capture('draw-mobile-result');
  await page.locator('.draw-info summary').click();
  check(await page.locator('.probability-list').isVisible(), 'Public probability explanation still expands');
  await visit('collection');
  check(await page.locator('#collection-grid .memory-card:not(.locked)').count() === 1, 'Saved card appears in collection');
  await visit('draw');
  check(await page.locator('#draw-button').isDisabled(), 'Refresh/navigation preserves insufficient balance state');
  check(/16 张/.test(await page.locator('.draw-info .pill').textContent()), 'Return visit uses normal-pool description');

  await page.evaluate(() => localStorage.removeItem('buzhi-ui-preview-v3'));
  await visit('draw');
  check(await page.locator('#draw-button').count() === 0, 'Unregistered visitor cannot draw');
  const passportLink = page.locator('.draw-info a[href="passport.html"]');
  const guestButton = await layout('.draw-info a[href="passport.html"]');
  check(guestButton.bottom <= guestButton.edge - 8, 'Guest registration entry is fully visible in the first mobile viewport');
  check(await passportLink.isVisible(), 'Guest has a visible passport entry');
  await capture('draw-mobile-guest');
  // Actual animation, with isolated demo identity and unmocked settlement.
  const animationContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, storageState: initialState, reducedMotion: 'no-preference' });
  await animationContext.route('**/*', route => route.request().url().startsWith(base + '/') ? route.continue() : route.abort());
  const motionPage = await animationContext.newPage();
  motionPage.on('pageerror', error => errors.push(error.message));
  await motionPage.goto(`${base}/ui-preview/draw.html`, { waitUntil: 'networkidle' });
  await motionPage.waitForSelector('[data-delivery-ready="true"]');
  check(await motionPage.locator('.world').getAttribute('data-motion') === 'on', 'Animation is enabled when permitted by system and preference');
  if (process.env.UI_PREVIEW_CAPTURE_DIR) await motionPage.screenshot({ path: resolve(process.env.UI_PREVIEW_CAPTURE_DIR, 'courier-desktop-idle.png') });
  await motionPage.locator('#draw-button').click();
  check(await motionPage.locator('#draw-stage.is-drawing').count() === 1, 'Click starts the delivery performance');
  check(await motionPage.locator('#draw-stage').getAttribute('aria-busy') === 'true', 'Delivery announces its busy state');
  check(await motionPage.locator('#draw-button').isDisabled(), 'Delivery prevents double clicks');
  const during = await motionPage.evaluate(() => JSON.parse(localStorage.getItem('buzhi-ui-preview-v3')));
  check(during.balance === 0 && during.history.length === 1, 'Card is durably saved before the performance finishes');
  check(await motionPage.locator('.draw-meteor').first().evaluate(el => getComputedStyle(el).animationName) === 'birthday-meteor', 'Meteor flight has an active animation');
  if (process.env.UI_PREVIEW_CAPTURE_DIR) {
    // Only for a mid-flight evidence frame, not for deciding test outcomes.
    await motionPage.waitForTimeout(850);
    await motionPage.screenshot({ path: resolve(process.env.UI_PREVIEW_CAPTURE_DIR, 'courier-desktop-flight.png') });
  }
  await motionPage.locator('#draw-stage.is-revealed').waitFor({ timeout: 6000 });
  check(await motionPage.locator('#draw-stage').getAttribute('aria-busy') === 'false', 'Delivery clears its busy state at reveal');
  check(await motionPage.locator('.draw-courier').evaluate(el => getComputedStyle(el).animationName) === 'courier-celebrate', 'Courier celebrates beside the revealed card');
  await motionPage.reload({ waitUntil: 'networkidle' });
  check(await motionPage.locator('#draw-button').isDisabled(), 'Result survives reloading after the performance');

  const interruptContext = await browser.newContext({ viewport: { width: 390, height: 844 }, storageState: initialState, reducedMotion: 'no-preference' });
  await interruptContext.route('**/*', route => route.request().url().startsWith(base + '/') ? route.continue() : route.abort());
  const interrupted = await interruptContext.newPage();
  interrupted.on('pageerror', error => errors.push(error.message));
  await interrupted.goto(`${base}/ui-preview/draw.html`, { waitUntil: 'networkidle' });
  await interrupted.waitForSelector('[data-delivery-ready="true"]');
  const mobileMeteors = await interrupted.locator('.draw-meteor').evaluateAll(list => list.filter(el => getComputedStyle(el).display !== 'none').length);
  check(mobileMeteors === 16, 'Mobile keeps sixteen trails instead of thirty');
  await interrupted.locator('#draw-button').click();
  if (process.env.UI_PREVIEW_CAPTURE_DIR) {
    await interrupted.waitForTimeout(650);
    await interrupted.screenshot({ path: resolve(process.env.UI_PREVIEW_CAPTURE_DIR, 'courier-mobile-flight.png') });
  }
  await interrupted.locator('#motion-toggle').click();
  await interrupted.locator('#draw-stage.is-revealed').waitFor({ timeout: 1000 });
  check(await interrupted.locator('.draw-meteor-sky').evaluate(el => getComputedStyle(el).display) === 'none', 'Turning motion off during delivery immediately hides meteors');
  const afterSkip = await interrupted.evaluate(() => JSON.parse(localStorage.getItem('buzhi-ui-preview-v3')));
  check(afterSkip.balance === 0 && afterSkip.history.length === 1, 'Skipping motion neither charges again nor loses the result');
  for (const name of ['index', 'passport', 'office', 'checkin', 'draw', 'collection', 'islanders', 'mailbox', 'guide', 'effects']) {
    await visit(name);
    check((await page.locator('main').innerText()).trim().length > 0, `${name}: current preview page renders content`);
    check(await page.locator('main .page-heading').count() === 0, `${name}: does not repeat the old numbered header`);
    check(await page.locator('main h1').count() === 1, `${name}: has one clear primary heading`);
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name}: no mobile horizontal overflow`);
    await capture(`round-${name}-mobile`);
  }
  // Reuse an isolated registered fixture to inspect identity-dependent screens.
  const savedDemo = initialState.origins[0].localStorage.find(item => item.name === 'buzhi-ui-preview-v3');
  await page.evaluate(item => localStorage.setItem(item.name, item.value), savedDemo);
  await visit('checkin');
  const signPosition = await layout('#checkin-button');
  check(signPosition.bottom <= signPosition.edge - 8, 'Today\'s sign-in action comes before the calendar and is visible on mobile');
  await page.locator('#checkin-button').click();
  check(await page.locator('#checkin-button').isDisabled(), 'Rearranged calendar still completes sign-in');
  await capture('round-checkin-ready-mobile');
  await visit('office');
  await capture('round-office-ready-mobile');
  await page.locator('.office-verification').evaluate(el => { el.open = true; });
  await page.locator('#demo-islander').click();
  await page.locator('[data-task="wish"]').click();
  await page.locator('#task-code').fill('ISLAND25');
  await page.locator('#task-code-form button[type="submit"]').click();
  const taskState = await page.evaluate(() => JSON.parse(localStorage.getItem('buzhi-ui-preview-v3')));
  check(taskState.tasks.includes('wish') && await page.locator('[data-task="arrival"]').count() === 0, 'The remaining code task works without an arrival task card');
  check(taskState.balance === 85, 'Task board awards exactly 25 after the existing 50+10 balance');
  await visit('islanders');
  check(await page.locator('.oc-slide.active .oc-caption strong').evaluate(el => el.getBoundingClientRect().bottom < document.querySelector('.mobile-nav').getBoundingClientRect().top), 'OC name is visible in the first mobile viewport');
  await page.locator('#oc-next').click();
  await page.waitForFunction(() => document.querySelector('#oc-step').textContent === '02');
  check(await page.locator('.oc-slide.active .oc-caption strong').textContent() === '吱吱', 'Poster-style OC gallery still switches characters');
  await visit('collection');
  check(await page.locator('[data-layout][aria-pressed="true"]').count() === 1, 'Collection default display and selected mode agree');
  check(await page.locator('.collection-exhibit').isVisible(), 'Available fan display is active by default');
  await page.locator('#card-search').fill('不存在的回忆');
  await page.locator('.exhibit-empty').waitFor();
  check(await page.locator('.exhibit-empty').isVisible(), 'Rearranged collection filters still show an empty result');
  await visit('guide');
  await page.locator('#voyage-next').click();
  await page.waitForFunction(() => document.querySelector('#voyage-count').textContent === '02 / 06');
  check(await page.locator('#voyage-location').textContent() === '庆典码头', 'Compact map tour still advances to the next stop');
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const name of ['index', 'passport', 'office', 'checkin', 'collection', 'islanders', 'mailbox', 'guide', 'effects']) {
    await visit(name);
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name}: no desktop horizontal overflow`);
    await capture(`round-${name}-desktop`);
  }
  for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 680 }]) {
    await page.setViewportSize(viewport); await visit('index');
    const home = await page.evaluate(() => ({
      button: document.querySelector('.hero-copy .actions .primary').getBoundingClientRect().bottom,
      portrait: document.querySelector('.hero-art img').getBoundingClientRect().bottom,
      bottomBar: document.querySelector('.mobile-nav').getBoundingClientRect().top,
      motionRight: document.querySelector('#motion-toggle').getBoundingClientRect().right,
      width: innerWidth,
    }));
    check(home.button < home.bottomBar - 8, `${viewport.width}: home primary action remains above the bottom bar`);
    check(home.portrait < home.bottomBar, `${viewport.width}: island owners appear in the first home viewport`);
    check(home.motionRight < home.width, `${viewport.width}: top navigation controls are not clipped`);
    await capture(`round-index-final-${viewport.width}`);
  }
  check(errors.length === 0, `No page-level JavaScript errors: ${errors.join('; ')}`);
  console.log(`PASS ${checks} assertions; five widths, draw settlement, collection, guest, live courier/meteors, reduced/interrupted motion and ten-page render smoke check`);
})().catch(error => { console.error('FAIL:', error); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
});
