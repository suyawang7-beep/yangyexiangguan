import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";

assert(
  existsSync(new URL("../server/card-collection.mjs", import.meta.url)),
  "Inventory and fusion must be testable through a standalone module",
);
const { createCardCollection } = await import("../server/card-collection.mjs");
const folder = mkdtempSync(join(tmpdir(), "card-collection-module-"));
const catalog = [
  { id: "N-1", rarity: "N" },
  { id: "R-1", rarity: "R" },
  { id: "SR-1", rarity: "SR" },
  { id: "SSR-1", rarity: "SSR" },
  { id: "UR-1", rarity: "UR" },
  { id: "hidden", rarity: "UR", unreleased: true },
  { id: "N-2", rarity: "N" },
];
let index = 0;
function fixture() {
  const path = join(folder, "test-" + index++ + ".sqlite");
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA foreign_keys=ON;
 CREATE TABLE users(id TEXT PRIMARY KEY);
 CREATE TABLE draws(id INTEGER PRIMARY KEY,user_id TEXT REFERENCES users(id),card_id TEXT,rarity TEXT,created_at TEXT);
 CREATE TABLE card_fusions(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id TEXT REFERENCES users(id),request_id TEXT,source_a TEXT,source_b TEXT,result_card_id TEXT,result_rarity TEXT,created_at TEXT,UNIQUE(user_id,request_id));
 CREATE TABLE ledger(user_id TEXT,amount REAL);INSERT INTO users VALUES('owner'),('other');INSERT INTO ledger VALUES('owner',50);`);
  let failProfile = false,
    collection;
  const error = (status, message) =>
    Object.assign(new Error(message), { status });
  const tx = (fn) => {
    db.exec("BEGIN IMMEDIATE");
    try {
      const value = fn();
      db.exec("COMMIT");
      return value;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  };
  const dependencies = {
    tx,
    getCards: () => catalog,
    requireVerified: (id) => {
      if (id !== "owner" && id !== "other") throw error(403, "仅岛民可融卡");
    },
    profile: (id) => {
      if (failProfile) throw Error("profile failed");
      return { id, ...collection.read(id) };
    },
    randomInt: () => 0,
    now: () => new Date().toISOString(),
    error,
  };
  collection = createCardCollection(db, dependencies);
  const seed = (id, card, count) => {
    for (let i = 0; i < count; i++)
      db.prepare(
        "INSERT INTO draws(user_id,card_id,rarity,created_at) VALUES(?,?,?,?)",
      ).run(
        id,
        card,
        catalog.find((c) => c.id === card).rarity,
        new Date().toISOString(),
      );
  };
  const snapshot = () => ({
    draws: db.prepare("SELECT * FROM draws ORDER BY id").all(),
    ledger: db.prepare("SELECT * FROM ledger").all(),
    fusions: db.prepare("SELECT * FROM card_fusions ORDER BY id").all(),
  });
  return {
    db,
    path,
    collection,
    dependencies,
    seed,
    snapshot,
    failProfile: (value) => {
      failProfile = value;
    },
  };
}
const closed = [];
try {
  {
    const f = fixture();
    closed.push(f.db);
    f.seed("owner", "N-1", 8);
    f.seed("owner", "R-1", 8);
    f.seed("owner", "SR-1", 8);
    f.seed("other", "N-1", 2);
    const before = f.snapshot();
    assert.equal(f.collection.read("owner").inventory["N-1"], 8);
    assert.equal(f.collection.read("other").inventory["N-1"], 2);
    const requests = [];
    for (const [n, rarity] of ["N", "R", "SR"].entries()) {
      const payload = {
        first: rarity + "-1",
        second: rarity + "-1",
        requestId: randomUUID(),
      };
      requests.push(payload);
      const result = f.collection.fuse("owner", payload);
      const allowed = {
        N: ["N", "SR", "SSR", "UR"],
        R: ["N", "R", "SSR", "UR"],
        SR: ["N", "R", "SR", "SSR", "UR"],
      }[rarity];
      assert(allowed.includes(result.card.rarity));
      assert.notEqual(result.card.id, "hidden");
      assert.equal(result.alreadyCompleted, false);
      assert.equal(result.profile.fusionDaily.used, n + 1);
      assert.equal(
        Object.values(result.profile.inventory).reduce(
          (sum, value) => sum + value,
          0,
        ),
        24 - (n + 1),
      );
    }
    const after = f.snapshot();
    assert.deepEqual(after.draws, before.draws);
    assert.deepEqual(after.ledger, before.ledger);
    assert.equal(f.collection.read("owner").fusionDaily.limit, 3);
    assert.equal(
      f.collection.read("owner").fusionDaily.timezone,
      "Asia/Shanghai",
    );
    assert.equal(
      f.collection.fuse("owner", requests[0]).alreadyCompleted,
      true,
      "Replay succeeds even after quota is exhausted",
    );
    assert.throws(
      () => f.collection.fuse("owner", { ...requests[0], second: "R-1" }),
      (error) => error.status === 409 && /更换材料/.test(error.message),
    );
    assert.throws(
      () =>
        f.collection.fuse("owner", {
          first: "N-1",
          second: "N-1",
          requestId: randomUUID(),
        }),
      (error) => error.status === 409 && /3次/.test(error.message),
    );
    assert.equal(f.snapshot().fusions.length, 3);
    assert.equal(f.collection.read("other").inventory["N-1"], 2);
    assert.equal(
      f.collection.fuse("other", requests[0]).alreadyCompleted,
      false,
      "Request IDs belong to one owner, not every user",
    );
    assert.equal(f.collection.read("other").inventory["N-1"], 1);
    assert.equal(f.collection.read("owner").fusionDaily.used, 3);
    const expected = f.collection.read("owner");
    f.db.close();
    closed.pop();
    const reopened = new DatabaseSync(f.path);
    closed.push(reopened);
    assert.deepEqual(
      createCardCollection(reopened, f.dependencies).read("owner"),
      expected,
      "Persisted inventory survives a new connection",
    );
  }
  {
    const f = fixture();
    closed.push(f.db);
    f.seed("owner", "N-1", 1);
    f.seed("owner", "R-1", 2);
    const before = f.snapshot();
    assert.throws(
      () => f.collection.fuse("visitor", {}),
      (error) => error.status === 403,
    );
    assert.throws(
      () => f.collection.fuse("owner", { requestId: "bad" }),
      (error) => error.status === 400,
    );
    assert.throws(
      () =>
        f.collection.fuse("owner", {
          first: "N-1",
          second: "N-1",
          requestId: randomUUID(),
        }),
      (error) => error.status === 409,
    );
    assert.throws(
      () =>
        f.collection.fuse("owner", {
          first: "N-1",
          second: "R-1",
          requestId: randomUUID(),
        }),
      (error) => error.status === 400,
    );
    assert.throws(
      () =>
        f.collection.fuse("owner", {
          first: "hidden",
          second: "hidden",
          requestId: randomUUID(),
        }),
      (error) => error.status === 400,
    );
    assert.deepEqual(
      f.snapshot(),
      before,
      "Invalid inputs do not change inventory or history",
    );
  }
  {
    const f = fixture();
    closed.push(f.db);
    f.seed("owner", "N-1", 4);
    const before = f.snapshot(),
      payload = { first: "N-1", second: "N-1", requestId: randomUUID() };
    f.db.exec(
      "CREATE TRIGGER reject_fusion BEFORE INSERT ON card_fusions BEGIN SELECT RAISE(ABORT,'fixture failure'); END",
    );
    assert.throws(() => f.collection.fuse("owner", payload), /fixture failure/);
    assert.deepEqual(f.snapshot(), before);
    f.db.exec("DROP TRIGGER reject_fusion");
    f.failProfile(true);
    assert.throws(() => f.collection.fuse("owner", payload), /profile failed/);
    assert.deepEqual(
      f.snapshot(),
      before,
      "Profile failure rolls the fusion write back",
    );
    f.failProfile(false);
    assert.equal(f.collection.fuse("owner", payload).alreadyCompleted, false);
    assert.equal(f.collection.read("owner").fusionDaily.used, 1);
  }
  {
    const f = fixture();
    closed.push(f.db);
    f.seed("owner", "N-1", 10);
    const day = f.db.prepare("SELECT date('now','+8 hours') AS day").get().day;
    const midnight = Date.parse(day + "T00:00:00+08:00");
    const insert = f.db.prepare(
      "INSERT INTO card_fusions(user_id,request_id,source_a,source_b,result_card_id,result_rarity,created_at) VALUES(?,?,?,?,?,?,?)",
    );
    insert.run(
      "owner",
      randomUUID(),
      "N-1",
      "N-1",
      "N-1",
      "N",
      new Date(midnight - 1000).toISOString(),
    );
    assert.equal(f.collection.read("owner").fusionDaily.used, 0);
    insert.run(
      "owner",
      randomUUID(),
      "N-1",
      "N-1",
      "N-1",
      "N",
      new Date(midnight + 1000).toISOString(),
    );
    assert.equal(
      f.collection.read("owner").fusionDaily.used,
      1,
      "Daily quota resets at Beijing midnight",
    );
  }
  {
    const f=fixture();closed.push(f.db);f.seed('owner','N-1',3);f.seed('owner','N-2',2);
    const result=f.collection.fuse('owner',{first:'N-1',second:'N-2',requestId:randomUUID()});
    assert.equal(result.profile.inventory['N-1'],3);assert.equal(result.profile.inventory['N-2'],1,'Distinct same-rarity materials both get consumed');
  }
  {
    const f=fixture();closed.push(f.db);f.seed('owner','N-1',130);let latest;
    for(let i=0;i<51;i++){
      latest=new Date(Date.now()-i*86400000).toISOString();
      f.db.prepare('INSERT INTO card_fusions(user_id,request_id,source_a,source_b,result_card_id,result_rarity,created_at) VALUES(?,?,?,?,?,?,?)').run('owner',randomUUID(),'N-1','N-1','N-1','N',latest);
    }
    const read=f.collection.read('owner');assert.equal(read.fusions.length,50);assert.equal(read.fusions[0].at,latest);assert.equal(read.inventory['N-1'],79,'Inventory replays all history, beyond the displayed 50 records');
    assert.deepEqual(Object.keys(read.fusions[0]),['first','second','result','rarity','at']);
  }
  console.log(
    "PASS collection module: owner inventory, rarity rules, quota/Beijing midnight, owner-scoped replay, persistence, immutable draws/coins, validation and transactional rollback",
  );
} finally {
  for (const db of closed) db.close();
  rmSync(folder, { recursive: true, force: true });
}
