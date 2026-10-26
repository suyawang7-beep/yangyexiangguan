// Public module contract only: no DOM, HTTP server, browser, or SQLite.
const assert = require("node:assert/strict");
const { readFileSync, existsSync } = require("node:fs");
const { resolve } = require("node:path");
const vm = require("node:vm");
const file = resolve(__dirname, "../ui-preview/account-collection-state.js");
assert(
  existsSync(file),
  "Account/collection loading must be independently testable",
);
const window = {};
vm.runInNewContext(readFileSync(file, "utf8"), { window });
const create = window.BuzhiAccountCollection.create;
const plain = (value) => JSON.parse(JSON.stringify(value));
const catalog = {
  totalSlots: 60,
  cards: [
    {
      id: "SR-1",
      previewId: "BZ-01",
      rarity: "SR",
      name: "海风",
      story: "海风故事",
      characters: "菜菜",
    },
    {
      id: "N-2",
      previewId: "BZ-02",
      rarity: "N",
      name: "日记",
      story: "日记故事",
      characters: "吱吱",
    },
  ],
};
const profile = {
  id: "user-1",
  nickname: "岛民",
  coins: 80,
  ledger: [{ amount: 10, reason: "签到", created_at: "2026-10-26T00:00:00Z" }],
  tasks: ["report", "letter:2026-10-26", "quiz:2026-10-26"],
  bonuses: [3],
  checkins: ["2026-10-26"],
  quiz: { rewarded: true },
  draws: [
    { card_id: "SR-1", rarity: "SR", created_at: "2026-10-25T00:00:00Z" },
  ],
  inventory: { "N-2": 2 },
  fusionDaily: { used: 1, limit: 3 },
  fusions: [{ result: "N-2", rarity: "N", at: "2026-10-26T00:00:00Z" }],
};
const blank = () => ({
  collection: {},
  history: [],
  passport: null,
  bonuses: [],
  pendingMilestones: [],
});
function deferred() {
  let resolve, reject;
  const promise = new Promise((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
}
function fixture(initialToken = "token-1") {
  let token = initialToken,
    state = blank();
  const updates = [],
    errors = [],
    calls = [];
  const cards = [
    {
      id: "BZ-01",
      rarity: "UR",
      name: "演示",
      motif: "star",
      characters: "演示",
      story: "演示故事",
    },
  ];
  const model = create({ cards, blank, getToken: () => token });
  const onUpdate = (kind, value) => {
    updates.push(kind);
    if (kind === "profile") state = model.acceptProfile(value);
    if (kind === "catalog" && model.profileCurrent)
      state = model.acceptProfile(model.profile);
    if (kind === "expired") {
      token = "";
      state = blank();
    }
  };
  const load = (cat, me) =>
    model.load(
      (path) => {
        calls.push(path);
        return path === "catalog" ? cat.promise : me.promise;
      },
      onUpdate,
      (error) => errors.push(error),
    );
  return {
    model,
    load,
    updates,
    errors,
    calls,
    cards,
    state: () => state,
    token: (value) => {
      token = value;
    },
  };
}
(async () => {
  // Both completion orders must produce exactly the same real inventory and history.
  for (const first of ["profile", "catalog"]) {
    const f = fixture(),
      cat = deferred(),
      me = deferred(),
      pending = f.load(cat, me);
    if (first === "profile") {
      me.resolve(profile);
      await new Promise(setImmediate);
      assert.equal(f.state().passport.id, "user-1");
      assert.equal(Object.keys(f.state().collection).length, 0);
      cat.resolve(catalog);
    } else {
      cat.resolve(catalog);
      await new Promise(setImmediate);
      assert.equal(f.model.catalogReady, true);
      me.resolve(profile);
    }
    await pending;
    assert.equal(f.model.catalogFailed, false);
    assert.equal(f.model.totalSlots, 60);
    assert.equal(f.cards[0].name, "海风");
    assert.equal(f.cards.length, 2);
    assert.equal(f.state().collection["BZ-01"].quantity, 0); // Fusion inventory overrides raw draw counts.
    assert.equal(f.state().collection["BZ-02"].quantity, 2);
    assert.equal(f.state().history.length, 2);
    assert.equal(f.state().history[0].fusion, true);
    assert.equal(f.state().history[1].first, true);
    assert.equal(f.state().balance, 80);
    assert.deepEqual(plain(f.state().tasks), ["arrival", "letter", "quiz"]);
    const snapshot = f.model.snapshot(
      f.state(),
      (name) => "/assets/" + name,
      true,
    );
    assert.equal(snapshot.cards[1].image, "/assets/cards/N-2.webp");
    assert.equal(snapshot.cards[1].quantity, 2);
    assert.equal(snapshot.profileReady, true);
    assert.equal(snapshot.history.length, 2);
    assert.equal(JSON.stringify(snapshot).includes("token-1"), false);
  }
  {
    const f = fixture(),
      cat = deferred(),
      me = deferred(),
      pending = f.load(cat, me);
    assert.equal(
      f.model.snapshot(f.state(), (x) => x, true).catalogReady,
      false,
    );
    f.token("new-token");
    me.resolve(profile);
    cat.resolve(catalog);
    await pending;
    assert.equal(f.model.profile, null);
    assert.equal(f.state().passport, null);
    assert(!f.updates.includes("profile"));
  }
  {
    const f = fixture(),
      cat = deferred(),
      me = deferred(),
      pending = f.load(cat, me);
    f.model.invalidateProfile();
    me.resolve(profile);
    cat.resolve(catalog);
    await pending;
    assert.equal(f.model.profile, null);
    assert(!f.updates.includes("profile"));
  }
  {
    const f = fixture(),
      cat = deferred(),
      me = deferred(),
      pending = f.load(cat, me);
    f.model.acceptProfile(profile);
    cat.reject(new Error("目录失败"));
    me.reject(Object.assign(new Error("过期"), { status: 401 }));
    await pending;
    assert.equal(f.model.catalogFailed, true);
    assert.equal(f.model.profile, null);
    assert(f.updates.includes("expired"));
    assert.equal(f.model.snapshot(f.state(), (x) => x, true).signedIn, false);
  }
  {
    const f = fixture(),
      cat = deferred(),
      me = deferred(),
      pending = f.load(cat, me);
    cat.resolve(catalog);
    me.reject(Object.assign(new Error("暂时失败"), { status: 503 }));
    await pending;
    assert.equal(
      f.model.snapshot(f.state(), (x) => x, true).profileReady,
      false,
    );
    assert(!f.updates.includes("expired"));
    assert.equal(
      f.errors[0].message,
      "暂时无法读取账户，登录状态已保留，请刷新重试。",
    );
  }
  {
    const f = fixture(""),
      cat = deferred(),
      pending = f.load(cat, deferred());
    cat.resolve(catalog);
    await pending;
    assert.deepEqual(f.calls, ["catalog"]);
    assert.equal(
      f.model.snapshot(f.state(), (x) => x, true).profileReady,
      true,
    );
  }
  for (const status of [401, 503])
    for (const changed of ["token", "revision"]) {
      const f = fixture(),
        cat = deferred(),
        me = deferred(),
        pending = f.load(cat, me);
      if (changed === "token") f.token("replacement-token");
      else f.model.invalidateProfile();
      me.reject(Object.assign(new Error("旧请求失败"), { status }));
      cat.resolve(catalog);
      await pending;
      assert(!f.updates.includes("expired"));
      assert.deepEqual(f.errors, []);
    }
  // Preserve the existing insertion order instead of silently sorting history.
  {
    const f = fixture(),
      cat = deferred(),
      me = deferred(),
      pending = f.load(cat, me);
    const historyProfile = {
      ...profile,
      fusions: [
        { result: "N-2", rarity: "N", at: "2026-10-26T02:00:00Z" },
        { result: "N-2", rarity: "N", at: "2026-10-26T01:00:00Z" },
      ],
    };
    cat.resolve(catalog);
    me.resolve(historyProfile);
    await pending;
    assert.deepEqual(
      f.state().history.map((entry) => entry.at),
      [
        Date.parse("2026-10-26T01:00:00Z"),
        Date.parse("2026-10-26T02:00:00Z"),
        Date.parse("2026-10-25T00:00:00Z"),
      ],
    );
  }
  // Input profile is not mutated by the projection.
  assert.equal(profile.inventory["N-2"], 2);
  assert.equal(profile.draws.length, 1);
  console.log(
    "PASS account/collection state: both load orders, ID mapping, inventory override, fusion history, stale token/revision, errors, expiry, anonymous and safe snapshots",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
