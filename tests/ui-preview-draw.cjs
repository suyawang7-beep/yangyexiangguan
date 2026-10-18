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
    check(await page.locator('.bird-journey').getAttribute('aria-valuenow') === '1', 'Bird progress preserves historical arrival records without the removed panel');
    await page.locator('.office-verification').evaluate(el => { el.open = true; });
    await page.locator('#demo-islander').click();
    await page.locator('[data-task="wish"]').click();
    await page.locator('#task-code').fill('ISLAND25');
    await page.locator('#task-code-form button[type="submit"]').click();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('buzhi-ui-preview-v3')));
    check(saved.balance === 75 && saved.tasks.includes('arrival') && saved.tasks.includes('wish'), 'Task reward and existing participation records are unchanged');
    check(await page.locator('.bird-journey').getAttribute('aria-valuenow') === '2', 'Progress updates after completing a remaining task');
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
  check(await page.locator('.draw-meteor').count() === 18, 'Draw scene provides eighteen staggered meteor trails');
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
  check(mobileMeteors === 10, 'Mobile keeps ten trails instead of eighteen');
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
