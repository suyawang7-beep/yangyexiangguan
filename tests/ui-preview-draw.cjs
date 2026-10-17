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

  await visit('passport');
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
  }
  check(errors.length === 0, `No page-level JavaScript errors: ${errors.join('; ')}`);
  console.log(`PASS ${checks} assertions; five widths, draw settlement, collection, guest, live courier/meteors, reduced/interrupted motion and ten-page render smoke check`);
})().catch(error => { console.error('FAIL:', error); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
});
