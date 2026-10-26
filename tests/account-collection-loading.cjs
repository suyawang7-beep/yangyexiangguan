// Browser adapter coverage: disposable local database and API only.
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const { spawn } = require("node:child_process");
const { DatabaseSync } = require("node:sqlite");
const { mkdtempSync, rmSync, readFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const folder = mkdtempSync(join(tmpdir(), "account-loading-"));
const dbPath = join(folder, "test.sqlite");
let server, browser;
const releases = [];
(async () => {
  const { availablePort } = await import("./helpers/port.mjs");
  const port = await availablePort(),
    base = "http://127.0.0.1:" + port;
  server = spawn(process.execPath, ["server/index.mjs"], {
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: String(port),
      DB_PATH: dbPath,
      ASSET_DIR: join(folder, "assets"),
      ADMIN_TOKEN: "account-loading-isolated-000000000000",
    },
    stdio: "ignore",
  });
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(base + "/health")).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert(ready, "Disposable API failed to start");
  const response = await fetch(base + "/api/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      nickname: "加载时序测试",
      password: "account-loading-isolated-password",
    }),
  });
  assert.equal(response.status, 200);
  const account = await response.json();
  const db = new DatabaseSync(dbPath);
  db.prepare(
    "INSERT INTO draws(user_id,card_id,rarity,created_at) VALUES(?,?,?,?)",
  ).run(account.id, "SR-1", "SR", new Date().toISOString());
  db.close();
  browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.CHROMIUM_PATH ||
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
  });
  const errors = [],
    writes = [];
  async function context(signedIn = true) {
    const c = await browser.newContext({
      viewport: { width: 390, height: 844 },
      reducedMotion: "reduce",
    });
    if (signedIn)
      await c.addInitScript(
        ({ token, origin }) => {
          if (location.origin === origin)
            sessionStorage.setItem("buzhi-online-token", token);
        },
        { token: account.token, origin: base },
      );
    c.on("page", (p) => {
      p.on("pageerror", (error) => errors.push(error.message));
      p.on("request", (r) => {
        if (r.url().includes("/api/") && r.method() !== "GET")
          writes.push(r.url());
      });
    });
    return c;
  }
  for (const held of ["catalog", "me"]) {
    const c = await context(),
      page = await c.newPage();
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    releases.push(release);
    await page.route("**/api/" + held, async (route) => {
      await gate;
      await route.continue();
    });
    const other = held === "catalog" ? "me" : "catalog";
    const completed = page.waitForResponse(base + "/api/" + other);
    await page.goto(base + "/collection.html", {
      waitUntil: "domcontentloaded",
    });
    await completed;
    const pocket = page.locator("buzhi-pocket");
    await pocket.locator(".intro-stats strong").waitFor();
    assert.equal(
      await pocket.locator(".intro-stats strong").textContent(),
      "…",
    );
    release();
    await page.waitForLoadState("networkidle");
    assert.equal(
      await pocket.locator(".intro-stats strong").textContent(),
      "1 种 / 1 张",
    );
    await pocket.locator("#tab-history").click();
    assert.equal(await pocket.locator(".history-entry").count(), 1);
    await c.close();
  }
  for (const [endpoint, status] of [
    ["me", 401],
    ["me", 503],
    ["catalog", 503],
  ]) {
    const c = await context(),
      page = await c.newPage();
    await page.route("**/api/" + endpoint, (route) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify({ error: "隔离失败用例" }),
      }),
    );
    await page.goto(base + "/collection.html", { waitUntil: "networkidle" });
    const pocket = page.locator("buzhi-pocket");
    const token = await page.evaluate(() =>
      sessionStorage.getItem("buzhi-online-token"),
    );
    if (status === 401) {
      assert.equal(token, null);
      assert.equal(
        await pocket.locator(".intro-stats strong").textContent(),
        "0 种 / 0 张",
      );
    } else {
      assert.equal(token, account.token);
      assert.equal(
        await pocket.locator(".intro-stats strong").textContent(),
        "…",
      );
    }
    if (endpoint === "catalog") {
      assert.equal(await pocket.locator("#pockets [data-card]").count(), 0);
      assert.match(
        await pocket.locator("#pockets").textContent(),
        /暂时无法读取/,
      );
    }
    await c.close();
  }
  const anonymous = await context(false),
    page = await anonymous.newPage();
  // effects.html is intentionally a static preview, not a production page route.
  await page.route(base + "/effects.html", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html",
      body: readFileSync(join(__dirname, "../ui-preview/effects.html"), "utf8"),
    }),
  );
  for (const name of [
    "index",
    "office",
    "draw",
    "collection",
    "passport",
    "verify",
    "checkin",
    "guide",
    "islanders",
    "mailbox",
    "effects",
  ]) {
    await page.goto(base + "/" + name + ".html", { waitUntil: "networkidle" });
    assert.equal(await page.locator("#main").count(), 1, name + " initializes");
    assert.equal(
      await page.evaluate(() => typeof window.BuzhiAccountCollection?.create),
      "function",
      name + " loads dependency",
    );
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(writes, []);
  const check = new DatabaseSync(dbPath);
  assert.equal(check.prepare("SELECT count(*) n FROM draws").get().n, 1);
  check.close();
  console.log(
    "PASS browser loading: both response orders, 401 logout, transient failures preserve login, catalog failure, 11 shared entry points, zero business writes",
  );
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    releases.forEach((release) => release());
    await browser?.close();
    if (server?.exitCode === null) {
      const done = new Promise((resolve) => server.once("exit", resolve));
      server.kill();
      await done;
    }
    rmSync(folder, { recursive: true, force: true });
  });
