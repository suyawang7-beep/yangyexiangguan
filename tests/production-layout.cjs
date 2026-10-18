/* Isolated shared-layout/real-API check. Uses only temporary accounts/database. */
const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const { mkdtempSync, rmSync } = require('node:fs');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const assert = require('node:assert/strict');
const folder = mkdtempSync(join(tmpdir(), 'buzhi-layout-api-'));
const port = 45500 + Math.floor(Math.random() * 1000);
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['server/index.mjs'], {
  cwd: join(__dirname, '..'),
  env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', DB_PATH: join(folder, 'check.sqlite'), ADMIN_TOKEN: 'isolated-layout-test-token-not-production-20261017' },
  stdio: ['ignore', 'ignore', 'pipe'],
});
let browser;
let logs = '';
server.stderr.on('data', chunk => { logs += chunk; });
(async () => {
  let ready = false;
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(base + '/health')).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert(ready, 'Isolated production-mode service did not start: ' + logs);
  const font = await fetch(base + '/assets/fonts/buzhi-rounded.woff2');
  assert.equal(font.status, 200, 'Production server must serve the new local rounded font');
  assert.equal(font.headers.get('content-type'), 'font/woff2');
  assert((await font.arrayBuffer()).byteLength > 100000, 'Real font bytes must be served');
  if (process.argv.includes('--font-only')) { console.log('PASS production font route and MIME'); return; }
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => dialog.accept()); // Recovery values are never logged or captured.
  await page.route('**/*', route => route.request().url().startsWith(base + '/') ? route.continue() : route.abort());
  await page.goto(base + '/passport.html', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  assert(await page.evaluate(() => window.__BUZHI_PRODUCTION__ === true));
  assert(await page.evaluate(() => [...document.fonts].some(f => f.family === 'Buzhi Rounded' && f.status === 'loaded')));
  assert.match(await page.locator('.demo-line').textContent(), /正式账户/);
  assert.equal(await page.getByRole('tab').count(), 2, 'Real account mode also exposes the two passport entry tabs');
  await page.getByRole('tab', {name:'欢迎老岛民'}).click();
  assert(await page.locator('#returning-key').isVisible());
  assert.equal(await page.locator('#main > section:has(#live-login)').count(), 0);
  await page.getByRole('tab', {name:'新岛民登记'}).click();
  await page.locator('#nickname').fill('版式联调访客');
  await page.locator('#claim-pass').click();
  await page.locator('#recovery-once[open]').waitFor({ timeout: 2000 });
  assert.match(await page.locator('#recovery-once').textContent(), /只显示一次/);
  assert((await page.locator('#recovery-secret').inputValue()).length > 12, 'One-time recovery key must be shown, never silently discarded');
  assert.equal(await page.locator('#recovery-participant').inputValue(), await page.locator('#public-id').inputValue());
  // Keep test-only credentials in memory; never log, capture or persist them.
  const recovery = {id:await page.locator('#recovery-participant').inputValue(), key:await page.locator('#recovery-secret').inputValue()};
  await page.locator('#recovery-saved').click();
  await page.locator('#recovery-once').waitFor({ state: 'detached' });
  assert.equal(await page.locator('#recovery-once').count(), 0, 'Dismissed secret must be removed from the DOM');
  await page.locator('#public-id').waitFor();
  await page.locator('[data-ticket-ready="true"]').waitFor();
  assert.deepEqual(await page.locator('#ticket-image').evaluate(img=>[img.naturalWidth,img.naturalHeight]),[2400,1200], 'Real account mode also renders the public souvenir image');
  assert.match(await page.locator('.ticket-readable').textContent(),/访客 · 未核验/);
  await page.locator('#save-pass').click();
  const ticketDownload = await Promise.all([page.waitForEvent('download'),page.locator('#download-pass').click()]).then(items=>items[0]);
  assert.equal(await ticketDownload.failure(),null,'Production-mode souvenir download succeeds without an external screenshot service');
  assert(ticketDownload.suggestedFilename().endsWith('.png'));
  await page.locator('[data-ticket-close]').click();
  assert.match(await page.locator('#public-id').inputValue(), /^BZI-/);
  assert.match(await page.locator('.passport-grid > aside').textContent(), /服务器/);
  const returningContext = await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await returningContext.route('**/*', route => route.request().url().startsWith(base + '/') ? route.continue() : route.abort());
  const returningPage = await returningContext.newPage();
  returningPage.on('pageerror', error => errors.push(error.message));
  await returningPage.goto(base + '/passport.html', {waitUntil:'networkidle'});
  await returningPage.getByRole('tab', {name:'欢迎老岛民'}).click();
  await returningPage.locator('#returning-id').fill(recovery.id);
  await returningPage.locator('#returning-key').fill(recovery.key);
  await returningPage.locator('#toggle-returning-key').click();
  assert.equal(await returningPage.locator('#returning-key').getAttribute('type'), 'text');
  await returningPage.getByRole('tab', {name:'新岛民登记'}).click();
  await returningPage.getByRole('tab', {name:'欢迎老岛民'}).click();
  assert.equal(await returningPage.locator('#returning-id').inputValue(), recovery.id);
  assert.equal(await returningPage.locator('#returning-key').getAttribute('type'), 'password', 'Returning to the login tab re-masks the saved input');
  await returningPage.locator('#live-login button[type="submit"]').click();
  await returningPage.locator('#public-id').waitFor();
  assert.equal(await returningPage.locator('#public-id').inputValue(), recovery.id, 'Tab login restores the original identity rather than creating another');
  assert.equal(await returningPage.locator('[data-balance]').first().textContent(), '50', 'Restoring an identity never awards another welcome bonus');
  assert.equal(await returningPage.locator('#returning-key').count(), 0, 'Recovery fields disappear after successful login');
  assert.equal(await returningPage.evaluate(key => [...Object.values(localStorage), ...Object.values(sessionStorage)].some(value => String(value).includes(key)), recovery.key), false, 'Recovery credential is never persisted by tab switching or login');
  await returningContext.close();
  await page.goto(base + '/draw.html', { waitUntil: 'networkidle' });
  await page.locator('#draw-button').waitFor();
  assert.equal(await page.locator('[data-balance]').first().textContent(), '50');
  await page.locator('#draw-button').click();
  await page.locator('#draw-stage.is-revealed').waitFor({ timeout: 6000 });
  assert.match(await page.locator('#draw-result-label').textContent(), /^(SSR|SR) ·/);
  await page.goto(base + '/collection.html', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('#collection-grid .memory-card:not(.locked)'));
  assert.equal(await page.locator('#collection-grid .memory-card:not(.locked)').count(), 1);
  assert.equal(await page.locator('.collection-exhibit').count(), 1, 'Async production profile must not create duplicate exhibitions');
  assert(await page.locator('.collection-exhibit').isVisible());
  await page.goto(base + '/checkin.html', { waitUntil: 'networkidle' });
  await page.locator('#checkin-button').click();
  await page.waitForFunction(() => document.querySelector('#checkin-button')?.disabled);
  assert.equal(await page.locator('[data-balance]').first().textContent(), '10');
  await page.goto(base + '/office.html', { waitUntil: 'networkidle' });
  await page.locator('.office-layout .task-card').first().waitFor();
  assert.equal(await page.locator('.office-layout .task-card').count(), 6);
  assert.equal(await page.locator('.welcome-strip, [data-task="arrival"]').count(), 0);
  assert.match(await page.locator('.ledger').textContent(), /50/);
  await page.goto(base + '/mailbox.html', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('.letters').textContent.includes('尚未发布'));
  assert.equal(await page.locator('.mailbox-side nav a').getAttribute('href'), '#live-notices');
  assert.deepEqual(errors, []);
  console.log('PASS production-mode souvenir PNG download, passport tabs, cross-context account recovery without extra coins, rounded font, registration, draw, collection, sign-in, ledger and notices; no real accounts touched');
})().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(async () => {
  await browser?.close();
  const exited = new Promise(resolve => server.once('exit', resolve));
  server.kill('SIGTERM');
  await exited;
  rmSync(folder, { recursive: true, force: true });
});
