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
  check(errors.length === 0, `No page-level JavaScript errors: ${errors.join('; ')}`);
  console.log(`PASS ${checks} layout and flow assertions; widths 320/375/390/768/1440, first draw, collection, insufficient coins, guest and reduced motion`);
})().catch(error => { console.error('FAIL:', error); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
});
