# 不吱岛 2.0：基础账户接口实施记录（未上线）
开发分支：`integration/buzhi2-safe-ui-20261027`。

## 本轮实现
- `POST /api/logout`：要求 Bearer token，删除 sessions 表中**当前令牌**的哈希匹配行；不删除 users、金币、卡牌、OC、任务或其他设备的会话；返回 `{ok:true,alreadyLoggedOut:boolean}`。
- `POST /api/profile/nickname`：要求有效会话，接收 `{nickname:string}`，首尾空白裁切，长度 1–20 个 Unicode 字符；仅更新 `users.nickname`，返回更新后的 `profile`。旧 BZI ID、认证状态和历史资产不变。

## 尚未完成，不要误报为已上线
- 尚未接入正式网站账户设置 UI；目前两个接口只存在于开发分支。
- 尚未在有完整迁移数据的数据库上运行集成测试；静态源码回归检查不能替代真实端到端验证。
- 唯一账号名、跨设备退出、安全限流和业务活动开关解耦另行实现。
- 仍需测试：访客 401、过期会话 401、改名边界、昵称重复、其他会话继续有效、退出后令牌失效、旧 BZI 登录和金币/OC/卡牌数据不变。
- 上正式版前务必先做 SQLite 及 assets 备份、测试环境演练、回滚准备。
