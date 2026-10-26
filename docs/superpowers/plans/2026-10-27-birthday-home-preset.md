# Birthday home preset implementation plan

**Goal:** 修正首页入口和任务说明，并交付独立的吱吱生日首页响应式预设。
**Architecture:** 沿用原生 HTML/CSS/JavaScript；正式渲染器只调整文案与首页行动状态。视觉预设放在 docs/design/previews，不替换线上首页，不调用生产 API。
**Spec:** docs/design/2026-10-27-design-review-and-birthday-direction.md

## Constraints
- 不更改数据库、卡池、奖励或后台权限；不部署。
- 未确认生日日期、立绘和祝福不冒充真实发布内容。
- 保留海蓝视觉；手机主操作优先，次要说明折叠；支持键盘与减少动效。

## Tasks
- [x] 首页读取公开 feature-access；仅在账户与活动状态确认后推荐抽卡，失败时提供安全浏览入口。
- [x] 修正“去岛上逛逛”去向和事务所任务说明；旧生日配置暂不替换。
- [x] 新增独立生日预设，包含邀请、短笺、回忆展示与折叠指南；提供明显预设标识。
- [x] 定向检查首页访客/待认证/开放/暂停/请求失败状态及预设资源；记录未完成视觉验收，不重复完整回归。

## Review focus
账户异步加载不可误当认证；开关缺失/失败不可误报开放；两入口独立；无伪造生日日期或公开祝福；320px 页面不依赖悬停。

## Verification result

2026-10-27：`node --test tests/home-invitation.cjs` 12/12 通过；`node --check ui-preview/app.js` 与 `git diff --check` 通过。本机预设 HTTP 200。尚未取得浏览器截图或完成实机视觉验收；没有连接生产、提交 Git 或部署。后台旧数量文案与最终生日活动配置待下一阶段处理。
