# 不吱岛 2.0 · 新聊天楼总交接（2026-10-27）

> 本文是新聊天楼接手工程的入口。不要仅依据聊天记忆推断线上状态。请先核对分支与代码再改动。
> 用户最新决策：**不吱岛 2.0 是全站体验升级：视觉及交互大换血，保留后端业务内核和所有岛民数据。** 设计美术由另一聊天负责（其可用额度将耗尽），本聊天负责搭建、路由、状态、测试、上线保护。

## 项目与服务
- 仓库：`suyawang7-beep/yangyexiangguan`
- 正式站：`https://buzhi.click`，腾讯云轻量香港；**不得未经单独授权改动/重启/覆盖**。
- Railway 是独立静态测试：`buzhi-2-preview-20261027` 项目，服务 `buzhi2-static-preview`，`https://buzhi2-static-preview-preview.up.railway.app/`；不等于正式业务服务。
- 当前主要工程分支：`integration/buzhi2-safe-ui-20261027`；PR #28 草稿：`https://github.com/suyawang7-beep/yangyexiangguan/pull/28`。
- 工程基础 PR #27：`https://github.com/suyawang7-beep/yangyexiangguan/pull/27`。
- 隔壁视觉文档分支：`codex/shared-web-skills-20261027`，交接入口 `docs/design/2026-10-27-handoff.md`，推送点 `f2893b59cabb666b36002905c3d4a3db39ca90e9`。**没有合并进本工程分支**，仅有选择地参考交互逻辑。

## 本工程分支实际完成
- 静态多页面骨架，HTML 路由共 **9 页**，位于 `ui-preview/buzhi2/`：
  `index.html` 首页；`birthday.html` 生日邀请；`workshop.html` 融卡；`shop.html` 周边商店；`collection.html` 回忆收藏；`mailbox.html` 岛主信箱；`office.html` 岛民事务所；`resident.html` 个人中心；`guide.html` 登岛导览。
- 共享代码：`foundation.js` / `foundation.css`。已加跨页导航、状态告知、生日来信三标签及键盘左右/Home/End 切换、融卡选择与收藏筛选的**演示交互**；触控端补齐全部页面导航，底部保留五个快捷入口。
- 商店/融卡没有真实交易，所有需要后端确认的动作禁用。信箱不发送或保存内容。所有样例卡和商品均是演示，不代表真实卡池/库存。
- 工程/视觉交接：`docs/design/buzhi2-foundation-handoff.md`；安全集成：`docs/design/buzhi2-safe-integration-20261027.md`；**不方正视觉要求**：`docs/design/buzhi2-organic-layout-contract.md`。

## 最新用户审美底线
- 不喜欢单页式网页，不要再改成长滚动宣传海报。
- **不要旧站换皮、不要方正矩形卡片堆叠、不要固定标题左人物右**；最终首页应沉浸式场景，功能页各自构图：融卡操作台、商店陈列、收藏画廊、信箱信纸、岛民档案、导览地图。
- 要海蓝/冰透玻璃/虹彩粉紫、二次元海洋幻想，但不能满屏装饰；设计师自行做页面美观，工程代码中的方正盒子只是占位。
- 吱吱生日主视觉：蓝灰长发，**薄荷绿挑染仅限刘海**，蓝粉瞳及发带；菜菜是银白及肩短发、宝蓝瞳和额间小圆角；屁宝白色拿破仑猫、肥啾白色圆鸟、蓝鸟花、翅膀、细长发带与浪花。
- 本期偏重融卡与周边卡片兑换，抽卡属于菜菜先前活动。生日日期、配方、价格、活动窗口均不可杜撰。

## 架构与安全
- 本开发分支继承**仅用于静态预览的 nginx Dockerfile**，不要合并到 main，因为生产需要 Node 后端。
- 保留原账号、通行证、认证、金币、签到、抽卡历史、收藏、OC、后台、信箱与任务进度。不要重建数据库、改变奖励/卡率，也不要把静态预览作为生产替代。
- 下一阶段的工程应该由现有业务 API 映射入新页面，采用可核验的**服务端真实开放状态**；加载中/未知时不伪造金额/库存/已开放提示。高风险业务先写适配层/模拟契约，最终核对真实接口再接。
- 正式迁移应先通过独立测试环境，备份并验证回滚，得到用户明确上线授权。

## 隔壁资料的复用原则
- 生日书桌的标签键盘逻辑已复用，但不直接复制旧左右分栏视觉稿。
- 手机曾在隔壁预设完成 320/375px 的定向验证（其本地 HTML），**不代表本分支已通过同一实测**。
- 可借鉴 InteractivePoints 热点地图与 StackMotion 叠卡；GSAP、StyleKit、Huashu、Cursor Skill 仅是参考方法，未设为正式页面运行依赖。
- 原分支归档与来源许可见隔壁 `docs/design/resources/README.md`。

## 优先待办
1. 对 `ui-preview/buzhi2/` 全9页做真实浏览器验收：导航不404、tab点击/键盘、320/375/390/768/1440视口无横向溢出、减少动效、空数据安全状态。**尚未声明通过**。
2. 检查真实 Node 应用服务端/API 与前台现有接口；制作只读接口映射表、状态契约和后续接线计划。注意开发分支预览的 HTML 路径不等同线上路由。
3. 等视觉稿确认为新布局，再做语义 DOM 与素材接入，避免按当前方正布局固化 UI。
4. 逐个功能接入测试环境，保留现有用户数据，进行权限/重复提交/数据一致性测试。
5. 如需部署，仅允许对专用 Railway **测试服务**在用户既有授权范围内更新；正式站须另行授权。

## 给新聊天楼的简短接力指令
“请以 `suyawang7-beep/yangyexiangguan` 的 `integration/buzhi2-safe-ui-20261027` 分支为工程基础，先阅读 `docs/design/buzhi2-20261027-new-chat-handoff.md`、`docs/design/buzhi2-organic-layout-contract.md` 和隔壁 `codex/shared-web-skills-20261027/docs/design/2026-10-27-handoff.md`。继续执行多页面工程、测试和现有业务接口适配；不要做旧布局换皮，不要更改 main/生产，不要虚构融卡规则、生日日期或交易结果。”
