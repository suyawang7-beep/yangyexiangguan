import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
assert(
  existsSync(new URL("../server/feature-access.mjs", import.meta.url)),
  "Independent pool and office controls are required",
);
const { createFeatureAccess } = await import("../server/feature-access.mjs");
const db = new DatabaseSync(":memory:");
let legacy = { startsAt: null, endsAt: null },
  at = Date.parse("2026-10-26T21:08:59+08:00"),
  failAudit = false;
const tx = (fn) => {
  db.exec("BEGIN IMMEDIATE");
  try {
    const out = fn();
    db.exec("COMMIT");
    return out;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
};
const access = createFeatureAccess(db, {
  getActivity: () => legacy,
  tx,
  audit: () => {
    if (failAudit) throw Error("audit failed");
  },
  error: (status, message) => Object.assign(new Error(message), { status }),
  clock: () => at,
});
try {
  assert.equal(access.read("pool").phase, "active");
  assert.equal(access.read("office").source, "activity");
  access.save({
    feature: "pool",
    enabled: false,
    startsAt: null,
    endsAt: null,
  });
  assert.throws(
    () => access.requireActive("pool"),
    (e) => e.status === 403,
  );
  assert.equal(access.read("office").phase, "active");
  legacy = { startsAt: null, endsAt: "2026-10-25T00:00:00Z" };
  assert.equal(access.read("office").phase, "ended");
  access.save({
    feature: "office",
    enabled: true,
    startsAt: null,
    endsAt: "2026-10-26T21:09:00+08:00",
  });
  assert.equal(access.read("office").phase, "active");
  at += 1000;
  assert.equal(access.read("office").phase, "ended");
  access.save({
    feature: "office",
    enabled: true,
    startsAt: "2026-10-31T19:00:00+08:00",
    endsAt: null,
  });
  assert.equal(access.read("office").phase, "upcoming");
  at = Date.parse("2026-10-31T19:00:00+08:00");
  assert.equal(access.read("office").phase, "active");
  assert.equal(access.read("pool").phase, "paused");
  for (const payload of [
    { feature: "wrong", enabled: true, startsAt: null, endsAt: null },
    { feature: "pool", enabled: "true", startsAt: null, endsAt: null },
    { feature: "pool", enabled: true, startsAt: null, endsAt: "bad" },
    {
      feature: "pool",
      enabled: true,
      startsAt: null,
      endsAt: null,
      amount: 999,
    },
  ])
    assert.throws(
      () => access.save(payload),
      (e) => e.status === 400,
    );
  const before = access.read("pool");
  failAudit = true;
  assert.throws(
    () =>
      access.save({
        feature: "pool",
        enabled: true,
        startsAt: null,
        endsAt: null,
      }),
    /audit failed/,
  );
  assert.deepEqual(access.read("pool"), before);
  console.log(
    "PASS feature access: inheritance, independent switches, exact end/start, invalid input and atomic audit rollback",
  );
} finally {
  db.close();
}
