import { activityPhase, validateActivity } from "./activity.mjs";

export function createFeatureAccess(
  db,
  { getActivity, tx, audit, error, clock = Date.now },
) {
  db.exec(
    "CREATE TABLE IF NOT EXISTS feature_access(feature TEXT PRIMARY KEY CHECK(feature IN ('pool','office')),enabled INTEGER NOT NULL CHECK(enabled IN (0,1)),starts_at TEXT,ends_at TEXT,updated_at TEXT NOT NULL)",
  );
  const valid = (feature) => {
    if (feature !== "pool" && feature !== "office")
      throw error(400, "管理入口无效");
  };
  function read(feature) {
    valid(feature);
    const row = db
      .prepare(
        "SELECT enabled,starts_at AS startsAt,ends_at AS endsAt FROM feature_access WHERE feature=?",
      )
      .get(feature);
    const settings = row || getActivity(),
      enabled = row ? !!row.enabled : true;
    return {
      feature,
      enabled,
      startsAt: settings.startsAt,
      endsAt: settings.endsAt,
      phase: enabled ? activityPhase(settings, clock()) : "paused",
      source: row ? "independent" : "activity",
      timezone: "Asia/Shanghai",
    };
  }
  function save(payload) {
    if (
      !payload ||
      typeof payload !== "object" ||
      Array.isArray(payload) ||
      Object.keys(payload).length !== 4 ||
      !["feature", "enabled", "startsAt", "endsAt"].every((key) =>
        Object.hasOwn(payload, key),
      )
    )
      throw error(400, "请完整提交入口、开关及开始和结束时间");
    valid(payload.feature);
    if (typeof payload.enabled !== "boolean")
      throw error(400, "开关须为开启或关闭");
    let settings;
    try {
      settings = validateActivity({
        startsAt: payload.startsAt,
        endsAt: payload.endsAt,
      });
    } catch (e) {
      throw error(400, e.message);
    }
    return tx(() => {
      db.prepare(
        "INSERT INTO feature_access(feature,enabled,starts_at,ends_at,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(feature) DO UPDATE SET enabled=excluded.enabled,starts_at=excluded.starts_at,ends_at=excluded.ends_at,updated_at=excluded.updated_at",
      ).run(
        payload.feature,
        payload.enabled ? 1 : 0,
        settings.startsAt,
        settings.endsAt,
        new Date(clock()).toISOString(),
      );
      audit("feature-access.update", {
        feature: payload.feature,
        enabled: payload.enabled,
        ...settings,
      });
      return read(payload.feature);
    });
  }
  function requireActive(feature) {
    const value = read(feature);
    if (value.phase === "active") return;
    const name = feature === "pool" ? "卡池抽卡" : "岛民事务所金币任务";
    const status = {
      paused: "已暂停",
      upcoming: "尚未开放",
      ended: "本次开放已结束",
    }[value.phase];
    throw error(403, name + status + "，已有金币、收藏与记录仍可查看");
  }
  return { read, save, requireActive };
}
