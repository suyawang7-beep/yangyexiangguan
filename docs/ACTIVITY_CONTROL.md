# 活动时间控制

后台 `/admin` 的“活动时间控制”使用北京时间（UTC+8），即使管理员设备处于其他时区也不会改变解释方式。开始和结束可分别留空；初始配置两端均不限制，以兼容既有活动。

开始时间包含该时刻，结束时间不包含该时刻。例如设置结束为 10 月 26 日 00:00:00，表示可参与至 10 月 25 日结束。保存后服务端立即生效，不需要重新部署；配置保存在原持久化 SQLite 中，服务重启后保留。

活动未开始或已结束时，注册、任务兑奖、每日签到和抽卡返回 403，不创建用户、不消耗兑换码、不写入金币/签到/抽卡记录。已有账户登录恢复、个人记录、收藏及公告等读取继续可用。观众页面沿用 `ui-preview/`，被拒绝的请求通过现有提示显示原因。

接口：

- `GET /api/activity`：公开的起止时间（UTC ISO 格式）、`timezone: Asia/Shanghai`、`phase`（`upcoming` / `active` / `ended`）以及服务端当前时间。
- `GET /api/admin/activity`：管理密钥保护的当前配置。
- `POST /api/admin/activity`：管理密钥保护，提交且仅提交 `{startsAt,endsAt}`；时间须含 `Z` 或明确时区偏移，空端使用 `null`。返回当前配置和状态。

配置更改记录为 `activity.update` 管理审计，不包含恢复密钥或会话令牌。本功能仅新增配置表，不更新、迁移或删除既有参与者及奖励数据。

验证：`node tests/activity-flow.mjs` 使用临时数据库覆盖时间边界、日期校验、无权限请求、活动外零业务写入、恢复登录、重启持久化及恢复参与；`node tests/activity-admin.cjs` 验证桌面/手机后台和跨设备时区换算；`node tests/site-acceptance.cjs` 只读检查九页桌面/手机版式。浏览器测试需 Playwright Chromium，可用 `CHROMIUM_PATH` 指定已有浏览器。

`ACCEPTANCE_BASE_URL` 可指向正式站，只读验收测试会拦截一切非 GET 请求；`ACCEPTANCE_CAPTURE_DIR` 可指定截图与 JSON 检查记录的输出目录。不要把有写入的隔离全流程测试指向正式数据库。
