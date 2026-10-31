// Administration only. Claims continue through the existing atomic redemption path.
export function createCoinCodeAdmin({ db, tx, sha, rand, now, error, audit }) {
  const amount = 131.4,
    maxUses = 40;
  function generate(payload) {
    const count = Number(payload.count ?? 1);
    if (
      payload.taskId !== "commission" ||
      !Number.isInteger(count) ||
      count < 1 ||
      count > 100
    )
      throw error(400, "请选择临时委托，生成数量须为1–100");
    if (Object.hasOwn(payload, "amount") || Object.hasOwn(payload, "maxUses"))
      throw error(400, "临时委托固定每人131.4金币，每码最多40人，不能修改");
    return tx(() => {
      const codes = [],
        campaigns = [];
      for (let i = 0; i < count; i++) {
        const code = ("ISL-C-" + rand(18)).toUpperCase(),
          id = "commission-" + rand(12),
          createdAt = now();
        db.prepare(
          "INSERT INTO coin_redemption_campaigns(id,code_hash,amount_tenths,max_uses,redeemed_count,active,created_at) VALUES(?,?,1314,40,0,1,?)",
        ).run(id, sha(code), createdAt);
        codes.push(code);
        campaigns.push({ id, amount, maxUses, createdAt });
      }
      audit("coin-code.generate", {
        taskId: "commission",
        count,
        amount,
        maxUses,
        campaignIds: campaigns.map((c) => c.id),
      });
      return {
        kind: "coins",
        taskId: "commission",
        amount,
        maxUses,
        codes,
        campaigns,
      };
    });
  }
  function list() {
    return db
      .prepare(
        "SELECT id,amount_tenths AS amountTenths,max_uses AS maxUses,redeemed_count AS redeemed,active,created_at AS createdAt FROM coin_redemption_campaigns ORDER BY created_at DESC,id DESC LIMIT 100",
      )
      .all()
      .map(({ amountTenths, ...row }) => ({
        ...row,
        amount: amountTenths / 10,
        remaining: row.maxUses - row.redeemed,
      }));
  }
  return { generate, list };
}
