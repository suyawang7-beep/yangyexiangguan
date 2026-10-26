// One owner for inventory replay, daily quota, idempotency and atomic fusion writes.
// Use the caller's existing synchronous BEGIN IMMEDIATE transaction and profile reader.
// This module creates no tables, changes no ledger rows, and applies no activity gate.
export function createCardCollection(
  db,
  { tx, getCards, requireVerified, profile, randomInt, now, error },
) {
  const FUSION_RARITIES = {
    N: ["N", "SR", "SSR", "UR"],
    R: ["N", "R", "SSR", "UR"],
    SR: ["N", "R", "SR", "SSR", "UR"],
  };
  function cardInventory(id) {
    const owned = new Map();
    for (const item of db
      .prepare("SELECT card_id FROM draws WHERE user_id=?")
      .all(id))
      owned.set(item.card_id, (owned.get(item.card_id) || 0) + 1);
    const history = db
      .prepare(
        "SELECT source_a,source_b,result_card_id FROM card_fusions WHERE user_id=? ORDER BY id",
      )
      .all(id);
    for (const h of history) {
      for (const key of [h.source_a, h.source_b])
        owned.set(key, (owned.get(key) || 0) - 1);
      owned.set(h.result_card_id, (owned.get(h.result_card_id) || 0) + 1);
    }
    return Object.fromEntries([...owned].filter(([, count]) => count > 0));
  }
  function dailyFusionCount(id) {
    return db
      .prepare(
        "SELECT COUNT(*) AS n FROM card_fusions WHERE user_id=? AND date(created_at,'+8 hours')=date('now','+8 hours')",
      )
      .get(id).n;
  }
  function fuseCards(id, b) {
    requireVerified(id);
    const first = String(b?.first || ""),
      second = String(b?.second || ""),
      requestId = String(b?.requestId || "");
    if (!/^[a-f0-9-]{20,80}$/i.test(requestId))
      throw error(400, "融卡请求编号无效");
    return tx(() => {
      const previous = db
        .prepare(
          "SELECT source_a,source_b,result_card_id,result_rarity,created_at FROM card_fusions WHERE user_id=? AND request_id=?",
        )
        .get(id, requestId);
      if (previous) {
        if (previous.source_a !== first || previous.source_b !== second)
          throw error(409, "同一融卡请求不能更换材料");
        return {
          card: { id: previous.result_card_id, rarity: previous.result_rarity },
          profile: profile(id),
          alreadyCompleted: true,
        };
      }
      if (dailyFusionCount(id) >= 3)
        throw error(409, "今天的3次融卡机会已用完，明天00:00（北京时间）刷新");
      const cards = getCards().filter((c) => !c.unreleased),
        byId = new Map(cards.map((c) => [c.id, c]));
      const a = byId.get(first),
        z = byId.get(second);
      if (
        !a ||
        !z ||
        a.rarity !== z.rarity ||
        !Object.hasOwn(FUSION_RARITIES, a.rarity)
      )
        throw error(400, "请选择两张同等级的N、R或SR卡");
      const owned = cardInventory(id),
        required = first === second ? 2 : 1;
      if (
        (owned[first] || 0) < required ||
        (owned[second] || 0) < (first === second ? required : 1)
      )
        throw error(409, "材料卡数量不足，请刷新收藏后重试");
      const options = cards.filter((c) =>
        FUSION_RARITIES[a.rarity].includes(c.rarity),
      );
      if (!options.length) throw error(409, "当前没有符合融卡规则的公开卡片");
      const card = options[randomInt(options.length)],
        createdAt = now();
      db.prepare(
        "INSERT INTO card_fusions(user_id,request_id,source_a,source_b,result_card_id,result_rarity,created_at) VALUES(?,?,?,?,?,?,?)",
      ).run(id, requestId, first, second, card.id, card.rarity, createdAt);
      return {
        card: { id: card.id, rarity: card.rarity },
        profile: profile(id),
        alreadyCompleted: false,
      };
    });
  }
  function read(id) {
    return {
      inventory: cardInventory(id),
      fusionDaily: {
        used: dailyFusionCount(id),
        limit: 3,
        timezone: "Asia/Shanghai",
      },
      fusions: db
        .prepare(
          "SELECT source_a AS first,source_b AS second,result_card_id AS result, result_rarity AS rarity,created_at AS at FROM card_fusions WHERE user_id=? ORDER BY id DESC LIMIT 50",
        )
        .all(id),
    };
  }
  return Object.freeze({ read, fuse: fuseCards });
}
