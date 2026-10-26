// Exercise the view through its public interface, without app.js or a business server.
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const { readFileSync, existsSync } = require("node:fs");
const { resolve } = require("node:path");
let browser;
(async () => {
  browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.CHROMIUM_PATH ||
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
  });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  await page.route('http://pocket.test/**', route => route.abort());
  const errors = [],
    requests = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => requests.push(request.url()));
  await page.setContent(
    '<!doctype html><html><head><base href="http://pocket.test/"></head><body><div id="view"></div></body></html>',
  );
  // Old code loads successfully but lacks this interface: expected red before refactoring.
  const source = existsSync(
    resolve(__dirname, "../ui-preview/collection-pocket-view.js"),
  )
    ? "../ui-preview/collection-pocket-view.js"
    : "../ui-preview/collection-pocket.js";
  await page.addScriptTag({
    content: readFileSync(resolve(__dirname, source), "utf8"),
  });
  assert.equal(
    await page.evaluate(() => typeof window.BuzhiPocketView?.mount),
    "function",
    "The view must be mountable without app.js, a media query, or preview generation",
  );
  await page.evaluate(() => {
    const cards = Array.from({ length: 5 }, (_, i) => ({
      id: "card-" + i,
      name: i === 0 ? "<海风 & 回忆>" : "回忆 " + i,
      rarity: i === 0 ? "SR" : "N",
      characters: i === 0 ? "菜菜" : "吱吱",
      story: "真实故事 " + i,
      image:
        'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="100"/%3E',
      quantity: i === 0 ? 2 : 0,
    }));
    window.fixture = {
      catalogReady: true,
      profileReady: true,
      signedIn: true,
      cards,
      history: [
        {
          cardId: "card-0",
          at: Date.UTC(2026, 9, 26),
          fusion: true,
          rarity: "SR",
        },
      ],
    };
    window.view = window.BuzhiPocketView.mount(
      document.querySelector("#view"),
      fixture,
    );
  });
  const host = page.locator("#view");
  assert.equal(await host.locator("#pockets [data-card]").count(), 4);
  assert.equal(
    await host.locator(".intro-stats strong").textContent(),
    "1 种 / 2 张",
  );
  await host.locator("#page-next").click();
  assert.equal(await host.locator("#pockets [data-card]").count(), 1);
  assert.equal(await host.locator("#page-number").textContent(), "2 / 2 页");
  await host.locator("#tab-viewer").click();
  await host.locator(".big-card").click();
  assert.equal(
    await host.locator("#detail-title").textContent(),
    "<海风 & 回忆>",
  );
  assert.equal(await host.locator(".detail-story").textContent(), "真实故事 0");
  await host.locator('[data-close="detail"]').click();
  assert(
    await host
      .locator(".big-card")
      .evaluate((node) => node === node.getRootNode().activeElement),
  );
  await host.locator("#open-filters").click();
  await host.locator('input[name="search"]').fill("不存在");
  await host.locator('[data-close="filters"]').click();
  assert.equal(await host.locator("#card-number").textContent(), "1 / 5 张");
  await host.locator("#open-filters").click();
  await host.locator('input[name="search"]').fill("菜菜");
  await host.locator("#apply-filters").click();
  assert.equal(await host.locator("#card-number").textContent(), "1 / 1 张");
  await host.locator("#tab-history").click();
  assert.match(await host.locator(".history-entry").textContent(), /海风融卡/);
  const state = await page.evaluate(() => view.captureState());
  assert.equal(state.active, "history");
  assert.equal(state.filters.search, "菜菜");
  await page.evaluate(() => {
    const other = document.createElement("div");
    other.id = "restored";
    document.body.append(other);
    BuzhiPocketView.mount(other, fixture, view.captureState());
  });
  assert.equal(
    await page
      .locator("#restored")
      .locator("#tab-history")
      .getAttribute("aria-selected"),
    "true",
  );
  assert.deepEqual(errors, []);
  assert.equal(requests.filter((url) => url.includes("/api/")).length, 0);
  console.log(
    "PASS standalone view: paging, literal text, real story, focus, draft filters, character search, fusion history, capture/restore state, no business requests",
  );
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await browser?.close();
  });
