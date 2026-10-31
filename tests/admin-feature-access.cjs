// Local disposable API and database: never writes to production.
const assert = require("node:assert/strict"),
  { spawn } = require("node:child_process"),
  { chromium } = require("playwright"),
  { DatabaseSync } = require("node:sqlite"),
  { mkdtempSync, rmSync } = require("node:fs"),
  { tmpdir } = require("node:os"),
  { join } = require("node:path");
const { verifyAccount } = require("./helpers/membership.cjs");
const folder = mkdtempSync(join(tmpdir(), "feature-access-")),
  dbPath = join(folder, "db.sqlite"),
  admin = "feature-access-test-admin-000000000000",
  code = "FEATURE-1314-FIXTURE";
let server, browser, db, base;
async function api(path, body, token) {
  const r = await fetch(base + "/api/" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: "Bearer " + token } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: r.status, data: await r.json() };
}
const setting = (feature, enabled, startsAt = null, endsAt = null) => ({
  feature,
  enabled,
  startsAt,
  endsAt,
});
(async () => {
  const { availablePort } = await import("./helpers/port.mjs"),
    port = await availablePort();
  base = "http://127.0.0.1:" + port;
  const launch = () =>
    spawn(process.execPath, ["server/index.mjs"], {
      env: {
        ...process.env,
        NODE_ENV: "test",
        BUZHI_TEST_COIN_REDEMPTION_CODE: code,
        HOST: "127.0.0.1",
        PORT: String(port),
        DB_PATH: dbPath,
        ASSET_DIR: join(folder, "assets"),
        ADMIN_TOKEN: admin,
      },
      stdio: "ignore",
    });
  server = launch();
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(base + "/health")).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  assert(ready);
  const a = (
      await api("register", {
        nickname: "入口权限测试",
        password: "feature-isolated-password",
      })
    ).data,
    b = (
      await api("register", {
        nickname: "独立卡池测试",
        password: "feature-isolated-password",
      })
    ).data;
  await verifyAccount(base, admin, a);
  await verifyAccount(base, admin, b);
  assert.equal(
    (await api("admin/feature-access", setting("pool", false))).status,
    403,
  );
  assert.equal(
    (await api("admin/feature-access", setting("pool", false), a.token)).status,
    403,
  );
  assert.equal(
    (await api("admin/feature-access", undefined, a.token)).status,
    403,
  );
  assert.equal(
    (await api("admin/feature-access", setting("pool", false), admin)).status,
    200,
  );
  assert.equal((await api("draw", {}, a.token)).status, 403);
  assert.equal(
    (
      await api(
        "task-writing",
        {
          taskId: "memory",
          content: "这是只在隔离数据库中填写的完整回忆测试文字",
        },
        a.token,
      )
    ).status,
    200,
    "Office remains active while pool is closed",
  );
  await api("admin/feature-access", setting("pool", true), admin);
  await api("admin/feature-access", setting("office", false), admin);
  const legacy = (
    await api("admin/codes", { taskId: "creative", count: 1 }, admin)
  ).data.codes[0];
  db = new DatabaseSync(dbPath);
  const tables = [
    "ledger",
    "tasks",
    "draws",
    "task_writings",
    "quiz_attempts",
    "coin_redemption_claims",
  ];
  const snapshot = () =>
    Object.fromEntries(
      tables.map((table) => [
        table,
        db.prepare("SELECT * FROM " + table + " ORDER BY rowid").all(),
      ]),
    );
  const before = snapshot();
  for (const [path, body] of [
    [
      "task-writing",
      { taskId: "letter", content: "这是暂停期间不会入账的完整测试文字内容" },
    ],
    ["redeem", { taskId: "creative", code: legacy }],
    ["quiz/submit", {}],
    ["redeem-coin-code", { code }],
  ])
    assert.equal(
      (await api(path, body, a.token)).status,
      403,
      path + " is protected",
    );
  assert.deepEqual(
    snapshot(),
    before,
    "Office rejection leaves every reward/history table unchanged",
  );
  assert.equal((await api("me", undefined, a.token)).status, 200);
  assert.equal(
    (await api("draw", {}, a.token)).status,
    200,
    "Pool remains active while office is closed",
  );
  await api(
    "admin/activity",
    { startsAt: null, endsAt: "2026-10-25T00:00:00Z" },
    admin,
  );
  assert.equal(
    (await api("draw", {}, b.token)).status,
    200,
    "Configured pool opens independently of old activity window",
  );
  await api("admin/feature-access", setting("office", true), admin);
  assert.equal(
    (await api("redeem-coin-code", { code }, a.token)).status,
    200,
    "Independent office also controls the 131.4 code",
  );
  assert.equal(
    (await api("checkin", {}, a.token)).status,
    403,
    "Separate check-in still follows its old activity rule",
  );
  assert.equal(
    (
      await api(
        "admin/feature-access",
        { ...setting("pool", true), amount: 999 },
        admin,
      )
    ).status,
    400,
  );
  browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.CHROMIUM_PATH ||
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
  });
  for (const width of [390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base + "/admin/office");
    await page.locator("#token").fill(admin);
    await page.locator("#enter").click();
    const form = page.locator('[data-feature-form="office"]');
    await form
      .locator("[data-feature-status]")
      .filter({ hasText: /开放中/ })
      .waitFor();
    assert.equal(
      await page.locator('#adminNavigation a[href="/admin/office"]').count(),
      1,
    );
    assert.equal(
      await page.locator('#adminNavigation a[href="/admin/cards"]').innerText(),
      "卡池管理",
    );
    await form.locator("[name=enabled]").uncheck();
    let saved = page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname === "/api/admin/feature-access" &&
        r.request().method() === "POST",
    );
    await form.locator("[type=submit]").click();
    assert.equal((await (await saved).json()).phase, "paused");
    await form.locator("[name=enabled]").check();
    await form.locator("[name=startsAt]").fill("2026-10-31T19:00");
    await form.locator("[name=endsAt]").fill("");
    saved = page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname === "/api/admin/feature-access" &&
        r.request().method() === "POST",
    );
    await form.locator("[type=submit]").click();
    assert.equal(
      (await (await saved).json()).startsAt,
      "2026-10-31T11:00:00.000Z",
    );
    await form.locator("[name=startsAt]").fill("");
    saved = page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname === "/api/admin/feature-access" &&
        r.request().method() === "POST",
    );
    await form.locator("[type=submit]").click();
    await saved;
    await page.locator('#adminNavigation a[href="/admin/cards"]').click();
    await page
      .locator('[data-feature-form="pool"] [data-feature-status]')
      .filter({ hasText: /开放中/ })
      .waitFor();
    assert(await page.locator("#cardForm").isVisible());
    assert.equal(await page.locator("#app>section:visible").count(), 1);
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    assert.deepEqual(errors, []);
    await page.close();
  }
  const beforeRace = snapshot();
  let finished = false;
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(
      "UPDATE feature_access SET enabled=0 WHERE feature='pool'",
    ).run();
    const pending = api("draw", {}, a.token).then((result) => {
      finished = true;
      return result;
    });
    await new Promise((resolve) => setTimeout(resolve, 200));
    assert.equal(
      finished,
      false,
      "Draw waits for the competing settings transaction",
    );
    db.exec("COMMIT");
    assert.equal(
      (await pending).status,
      403,
      "Draw rechecks the committed switch inside its own transaction",
    );
    assert.deepEqual(snapshot(), beforeRace);
  } catch (e) {
    try {
      db.exec("ROLLBACK");
    } catch {}
    throw e;
  }
  const beforeRestart = (await api("admin/feature-access", undefined, admin))
    .data;
  const stopped = new Promise((resolve) => server.once("exit", resolve));
  server.kill();
  await stopped;
  server = launch();
  ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(base + "/health")).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert(ready, "Isolated server restarted");
  assert.deepEqual(
    (await api("admin/feature-access", undefined, admin)).data,
    beforeRestart,
    "Independent settings survive restart",
  );
  console.log(
    "PASS independent admin entries/schedules, owner permissions, all office rewards including commission blocked without writes, competing switch transaction, separate pool/checkin behavior, 390/1440 UI",
  );
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await browser?.close();
    db?.close();
    if (server?.exitCode === null) {
      const done = new Promise((r) => server.once("exit", r));
      server.kill();
      await done;
    }
    rmSync(folder, { recursive: true, force: true });
  });
