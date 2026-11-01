# 人工奖励统一信箱领取（2026-11-01）

本说明覆盖上一版直接发放金币/融卡次数的设计。独立分支codex/admin-unified-20261101；本轮未部署生产、未操作生产数据库或重启正式服务。9efb917旧候选含直发功能，已被本轮替代，不得作为最终发布包上线。

## 唯一人工赠送路径

管理员在新版「活动与内容→信箱及物品寄送」填写真实BZI编号、奖励类型、数量、标题、原因及留言，确认后寄送；币0.1–5000、融卡机会整数1–100、物品沿用原规则。金币历史仅查询；融卡管理仅查询/历史及打开同一信箱寄送表单的快捷按钮，不存在第二套赠送表单。旧备用后台也移除直接金币赠送。

- POST /api/admin/coins/grant：原管理员鉴权后410。
- POST /api/admin/fusion/grants：原管理员鉴权后410；GET仍保留历史查询。
- 新增金币赠送码及临时委托发码：POST /api/admin/codes 的kind=coins或taskId=commission返回410；管理界面移除该生成选项。已发出兑换码继续按原规则可兑，不作废历史权益；正常任务完成码、签到、抽卡等自动结算规则不变。
- POST /api/admin/island-mail/send：只创建邮件，不增加余额/融卡额度；原UUID幂等比较包含原因。
- POST /api/island-mail/claim：仅认证收件人可领取。原BEGIN IMMEDIATE内完成奖励入账、标记领取及审计，失败整体回滚，重复/跨进程领取不重复计入。

融卡机会按**领取日**计入额外额度，领取日北京时间次日00:00到期。未领取邮件不是已到账额度；历史已发放/已领取记录不删除、不回写、不撤销。

## 数据兼容与回滚

新增island_mail_fusion_rewards、island_mail_reward_notes两张元数据表，不重建原island_mail、不修改历史金币、卡册或库存。为兼容原kind CHECK，融合奖励内部以原item行+独立奖励映射存储，对外API、导出及前端均投影为真实fusion类型。次数奖励不进入island_items；重启回填明确排除。

fusionQuota移除旧grant方法，仅保留claimMail由信箱领取事务调用。奖励记录request_id=mail:<mailId>唯一，原因及领取日进入审计；查询profile.fusionDaily沿用真实额度。历史直接补发记录仍只读保留。

另外新增两条保护触发器：旧程序不具备对应融卡入账记录时不能先标记签收；旧程序尝试把已领取融卡邮件回填物品时跳过。新程序先在同一事务中记录融卡入账，再标记领取；任何后续审计失败仍全部回滚。由此支持保留新数据的安全降级，不能简单认为旧程序能完整展示融合奖励；回滚时应维持维护/暂停相关领取，修复或重新发布支持版本，不删除新表或恢复旧数据库覆盖新数据。

本轮新增表/触发器仍属于待批准的生产schema变更。正式发布须重新核对生产基线、全新一致SQLite/WAL内容快照、素材/代码/root保护配置备份、异机校验恢复，并取得明确Go。本轮没有执行这些生产变更。

## 未决寄送保护

所有快捷入口共用window.prepareIslandGift及生成组件prepareMail。邮件发送中或结果不确定时，收件人、类型、数量及内容保持锁定，其他入口不能预填覆盖；重试沿用原请求UUID。实际浏览器故障注入测试：故意让mail.send审计失败返回500，尝试从另一岛民寄送次数，原收件人/coins/131.4仍锁定；移除合成故障后原请求重试成功且只寄送一次。合成触发器已清除，不保留在预览库。

## 验证证据

- `node --test tests/money.mjs tests/island-mail-flow.mjs tests/mail-rewards-client.mjs tests/operations-flow.mjs`：26/26通过，包括金币精度、20项信箱/权限/跨进程并发/回滚/降级保护/旧码权益相关子测试，客户端与导出备份验证。
- fusion-quota、fusion-quota-integration、quota-relations、maintenance-relations、admin-mail-only-ui、admin-v2-components、admin-v2-writes、admin-v2-operation-requests等定向脚本通过。未运行31项整套回归。
- tests/admin-commission-codes.cjs已从旧的发码浏览器测试更新为HTTP退场规则：新增赠送码410、未授权403、既有131.4仅兑一次、普通任务奖励不变，运行通过。
- 真浏览器：新合成岛民50金币、融卡3/3；寄送2次机会及131.4金币后，仍50与3/3；本人逐封领取后，181.4与3/5（剩2），两封均显示已领取，物品架未增加。对照截图mail-only-before-claim.png、mail-only-after-claim.png。
- 只读预览：http://127.0.0.1:28406/admin/v2/（管理表单为合成库可操作）；岛民预览为同一合成环境resident.html。正式buzhi.click尚未更新到本轮。

## 外部视觉交付暂存

Work另交付BZI-Fusion-Official-Card-Adapter.zip，本机路径C:/Users/A/Documents/Codex/2026-10-31/ready/outputs/。只读SHA256核对65aeff73a02d27771dc03858932b314dd034e2669fc877b64ab70a957b116bb6一致。本轮**未解包合入或部署**，避免与信箱业务改动混合；共享memory-card与真实catalog契约已另行交付Work。后续单独审查CSS/容器补丁，不能用其中演示页或DEMO映射覆盖正式卡池。
