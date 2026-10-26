// Disposable local API/database; no production campaigns or user rewards.
const assert = require("node:assert/strict"),
  { chromium } = require("playwright"),
  { spawn } = require("node:child_process"),
  { DatabaseSync } = require("node:sqlite"),
  { mkdtempSync, rmSync } = require("node:fs"),
  { tmpdir } = require("node:os"),
  { join } = require("node:path");
const { verifyAccount } = require("./helpers/membership.cjs");
const folder = mkdtempSync(join(tmpdir(), "admin-commission-")),
  dbPath = join(folder, "db.sqlite"),
  admin = "admin-commission-isolated-000000000000";
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
(async () => {
  const { availablePort } = await import("./helpers/port.mjs"),
    port = await availablePort();
  base = "http://127.0.0.1:" + port;
  server = spawn(process.execPath, ["server/index.mjs"], {
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: String(port),
      DB_PATH: dbPath,
      ASSET_DIR: join(folder, "assets"),
      ADMIN_TOKEN: admin,
    },
    stdio: "ignore",
  });
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(base + "/health")).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  assert.equal(
    (
      await api("admin/codes", {
        kind: "coins",
        taskId: "commission",
        count: 1,
      })
    ).status,
    403,
  );
  const generated = await api(
    "admin/codes",
    { kind: "coins", taskId: "commission", count: 1 },
    admin,
  );
  assert.equal(generated.status, 200);
  assert.equal(generated.data.kind, "coins");
  assert.equal(generated.data.amount, 131.4);
  assert.equal(generated.data.maxUses, 40);
  const code = generated.data.codes[0];
  assert.match(code, /^ISL-C-[A-Z0-9_-]+$/);
  db = new DatabaseSync(dbPath);
  const campaign = db
    .prepare("SELECT * FROM coin_redemption_campaigns WHERE id=?")
    .get(generated.data.campaigns[0].id);
  assert.equal(campaign.amount_tenths, 1314);
  assert.equal(campaign.max_uses, 40);
  assert(!JSON.stringify(campaign).includes(code));
  assert.equal(db.prepare("SELECT count(*) n FROM codes").get().n, 0);
  assert(!db.prepare('SELECT details FROM admin_audit WHERE action=?').all('coin-code.generate').some(row=>row.details.includes(code)));
  const campaignsBefore=db.prepare('SELECT count(*) n FROM coin_redemption_campaigns').get().n;
  db.exec("CREATE TRIGGER fail_campaign_audit BEFORE INSERT ON admin_audit WHEN NEW.action='coin-code.generate' BEGIN SELECT RAISE(ABORT,'isolated audit failure'); END");
  assert.equal((await api('admin/codes',{kind:'coins',taskId:'commission',count:1},admin)).status,500);
  assert.equal(db.prepare('SELECT count(*) n FROM coin_redemption_campaigns').get().n,campaignsBefore,'Campaign generation rolls back if audit persistence fails');
  db.exec('DROP TRIGGER fail_campaign_audit');
  const a = (
    await api("register", {
      nickname: "临时委托后台验收",
      password: "commission-admin-test-password",
    })
  ).data;
  await verifyAccount(base, admin, a);
  assert.equal(
    (
      await api(
        "admin/codes",
        { kind: "coins", taskId: "commission", count: 1 },
        a.token,
      )
    ).status,
    403,
  );
  assert.equal(
    (await api("admin/coin-code-stats", undefined, a.token)).status,
    403,
  );
  const result = await api(
    "redeem-coin-code",
    { code: code.toLowerCase() },
    a.token,
  );
  assert.equal(result.status, 200);
  assert.equal(result.data.profile.coins, 181.4);
  assert.equal(result.data.remainingUses, 39);
  assert.equal((await api("redeem-coin-code", { code }, a.token)).status, 409);
  const stats = await api("admin/coin-code-stats", undefined, admin);
  assert.equal(stats.status, 200);
  const row = stats.data.find((x) => x.id === campaign.id);
  assert.equal(row.redeemed, 1);
  assert.equal(row.remaining, 39);
  assert(!JSON.stringify(stats.data).includes(code));
  assert(!JSON.stringify(stats.data).includes("code_hash"));
  assert.equal(
    (
      await api(
        "admin/codes",
        { kind: "coins", taskId: "commission", count: 1, amount: 999 },
        admin,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await api(
        "admin/codes",
        { kind: "coins", taskId: "creative", count: 1 },
        admin,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await api(
        "admin/codes",
        { kind: "coins", taskId: "commission", count: 0 },
        admin,
      )
    ).status,
    400,
  );
  const old = await api("admin/codes", { taskId: "creative", count: 1 }, admin);
  assert.equal(old.status, 200);
  assert.equal(db.prepare("SELECT count(*) n FROM codes").get().n, 1);
  // Exhaustion must fail without appending another claim or reward.
  db.prepare(
    "UPDATE coin_redemption_campaigns SET redeemed_count=40 WHERE id=?",
  ).run(campaign.id);
  const b = (
    await api("register", {
      nickname: "名额验收",
      password: "commission-admin-test-password",
    })
  ).data;
  await verifyAccount(base, admin, b);
  const ledgerBefore = db.prepare("SELECT count(*) n FROM ledger").get().n;
  assert.equal((await api("redeem-coin-code", { code }, b.token)).status, 409);
  assert.equal(
    db.prepare("SELECT count(*) n FROM ledger").get().n,
    ledgerBefore,
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
    await page.goto(base + "/admin/code-statistics");
    await page.locator("#token").fill(admin);
    await page.locator("#enter").click();
    await page.locator("#generate").waitFor();
    assert.equal(new URL(page.url()).pathname, "/admin/codes");
    assert.equal(
      await page
        .locator('#adminNavigation a[href="/admin/code-statistics"]')
        .count(),
      0,
    );
    assert.equal(await page.locator("#app>section:visible").count(), 1);
    assert(await page.locator("#codeStatsRows").isVisible());
    assert(await page.locator("#coinCampaignRows").isVisible());
    assert.equal(
      await page.locator('#task option[value="support"]').count(),
      0,
    );
    await page.locator("#task").selectOption("commission");
    assert.match(await page.locator("#codeRules").innerText(), /131.4/);
    const wait = page.waitForResponse(
      (r) => new URL(r.url()).pathname === "/api/admin/codes",
    );
    await page.locator("#generate").click();
    const response = await wait;
    assert.equal((await response.json()).kind, "coins");
    assert.match(await page.locator("#codes").innerText(), /^ISL-C-/);
    assert.match(await page.locator("#generatedRules").innerText(), /40/);
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log(
    "PASS admin commission: generated 131.4/40 codes, claims/dedup/exhaustion, protected metadata, legacy compatibility, merged navigation, mobile/desktop",
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
