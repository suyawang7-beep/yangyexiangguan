# PR #2 认证后台 CI 排查闭环 · 2026-10-21

分支：`fix/recovery-key-delivery`。调查开始时 HEAD：`770ae7cc6453c101f44f3349d0feabd91fd735e7`。不修改 main，不部署 Railway，不访问或修改生产参与者数据。

## 远端状态变化与后续分支

收尾前重新读取 [PR #2](https://github.com/suyawang7-beep/yangyexiangguan/pull/2)，官方页面状态已为 `MERGED`：提交 `770ae7cc` 于 `2026-10-20T18:13:38Z`（北京时间 10 月 21 日 02:13:38）合入 main。当前远端 main 为 `0bccd29291977fed2492db3337cecdc7c2b6025a`，包含后续 PR #3。上述合并不是本轮执行的操作。

因此交接中的“PR #2 未合并”已过期。继续推送旧分支不会更新已关闭的 PR #2，也不会按原计划触发它的 PR CI。用户已批准迁移到最新 main 的独立后续 PR：分支 `test/membership-ci-diagnostics-20261021`，基准 `0bccd29`。仅迁移本轮三个文件，不覆盖 PR #3 的加载修复等并行成果，不合并或部署。

## 先确认最新 CI

通过 GitHub 官方运行网页核对，而非沿用“排队中”的旧观察：

| 运行 | 提交 | 最终结果 |
| --- | --- | --- |
| [39405617725](https://github.com/suyawang7-beep/yangyexiangguan/actions/runs/39405617725) | `c6c1cc5` | Failure，标注 `FAIL tests/membership-admin.cjs` |
| [39406628633](https://github.com/suyawang7-beep/yangyexiangguan/actions/runs/39406628633) | `770ae7cc` | Success：browser-flow、windows-routes、visual-sync 全部通过 |
| [39391618500](https://github.com/suyawang7-beep/yangyexiangguan/actions/runs/39391618500) | 更早成功对照 | Success，包含同一套状态定位器 |

GitHub API 在本环境返回 Forbidden，提升执行权限也未改变结果；官方 HTML 页面可正常读取。因此 CI 结果取自官方运行页，不以 API 不可达误判 CI 状态。

## 根因与可重复证据

确认的竞态机制：`/api/me` 返回较晚时，`takeProfile()` 重建通行证主内容；旧认证面板被替换，新表单从服务器的尚未申请状态初始化，抖音号变为空字符串。点击提交后触发原生 required 校验，**没有发出 POST**，于是等待“待审核”超时。不是已经成功提交后被旧 GET 覆盖，也不是定位器必然匹配不到文本。

对照实验使用当前本地正式服务器和临时 SQLite：仅对旧版场景在浏览器路由中提供 `c6c1cc5:client/membership.js`，延迟真实 `/api/me` 响应；先填写，再释放响应并提交。未改服务器/生产数据。新版场景使用当前 `770ae7cc`。

| 客户端 | 屏宽 | 表单替换 | 输入保留 | 原生 invalid 次数 | POST 次数 | HTTP / 状态 | DOM 状态 | 原待审核定位器匹配数 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `c6c1cc5` | 390 | 是 | 否 | 1 | 0 | 无请求 | 游客 · 尚未申请 | 0 |
| `c6c1cc5` | 1440 | 是 | 否 | 1 | 0 | 无请求 | 游客 · 尚未申请 | 0 |
| `770ae7cc` | 390 | 是 | 是 | 0 | 1 | 200 / pending | 游客 · 待审核 | 1 |
| `770ae7cc` | 1440 | 是 | 是 | 0 | 1 | 200 / pending | 游客 · 待审核 | 1 |

四组均无 pageerror、失败网络请求或表单错误文案；只有新版显示认证码（只记录存在与否，不记录内容）。原 CI 没有保存申请阶段的请求诊断，因此不能逐请求还原那一次运行；上述实验在失败版本稳定重现了与其超时一致的路径，并证明已有修复可消除该路径。

业务修复**已经包含在 `770ae7cc`**：`renderApplication()` 仅在同一账户、同一认证状态下重建时读取旧面板草稿并恢复抖音号/说明；不同账户或新认证结果不复用草稿。`revision`、`applying` 和迟到 GET 版本保护全部保留。本轮不再次更改客户端或后台业务。

## 本轮最小改动

- `tests/helpers/membership-diagnostics.cjs`：测试专用脱敏诊断，记录 POST HTTP/白名单认证状态、输入存在布尔值、认证码存在布尔值、DOM 状态、表单错误、表单实例数、原生 invalid 字段，以及 pageerror/requestfailed。禁止记录请求头、响应体、抖音号/说明原文、令牌、恢复密钥、管理员口令和认证码；错误栈同样脱敏，响应体读取有超时上限。申请字段在填写前加入脱敏集合，覆盖原始文本及 JSON 转义形式；独立复核发现的转义遗漏已先红后绿验证。
- `tests/membership-admin.cjs`：保留原“待审核”“已认证岛民”定位器、等待和原有断言；失败时输出上述诊断。新增成功 POST 与 pending DOM 关联断言、真实签到/抽卡响应、撤销后的 UI/接口限制和奖励/收藏保留断言，并检查诊断脱敏。
- 本文：记录历史失败、对照证据及验证边界。

没有跳过或删除测试，没有调大原等待超时，没有改动账号、认证、奖励或素材规则。

## 验证记录

- 修改前：原 `membership-admin.cjs`、`membership-race.cjs` 在当前 `770ae7cc` 均通过。
- 历史客户端/当前客户端在 390、1440px 四组受控对照通过，脱敏结果见上表。
- 增强后的 `membership-admin.cjs` 独立通过；随后连续 5 轮通过，每轮 390/1440px，两种宽度均收到 `200/pending`，共 10 组重复认证流程。
- 连续回归覆盖管理员通过/撤销、认证码显示、真实签到和抽卡、撤销后的 403、金币/签到/卡片/任务/流水/阶段奖励保留、收藏可访问与 XSS 转义。
- 原 PR #2 基准逐项执行 22 个测试文件及 `ui-preview-draw.cjs --office-only`，**23/23 通过**，包括恢复密钥精确复制和重新登录、迟到响应/退出清除、账户数据保留、认证竞态、签到抽卡与正式页面布局。
- 用户批准后迁移到 `0bccd29` 新分支，按最新核心工作流重新执行：新增的 `loading-flow.cjs`、`loading-browser.cjs` 与原用例共 **25/25 通过**；认证专项再次连续 5 轮、390/1440px 共 10 组通过，原文和 JSON 转义脱敏断言均通过。
- 最新 main 上的 `pencil-assets.mjs`、`pencil-case.cjs --features-only` 通过（31 项交互/正式资源断言）。这些是本地 Chromium 验证，不冒充 Windows CI 的结果。
- `liquid-page-evidence.cjs` 在本地临时正式服务器对 10 页 × 2 种宽度生成 **20/20** 实际页面证据，均无页面错误、无横向溢出，主面板/侧栏液态层检查通过；GET-only，无任何账户写入。证据位于 `/tmp/buzhi-ci-final-visual`。
- 完整核心回归与本轮提交的 CI 结论，以对应最终 HEAD 的实际运行结果为准；不能用旧 `770ae7cc` 的绿单代替后继提交的验证。

本地运行使用 Node 24、系统 Chromium 及环境已有 Playwright；GitHub Actions 按工作流使用 Playwright 1.56.1。未修改依赖声明、锁文件或 CI 核心用例列表。

调查证据位置 `/tmp/buzhi-membership-before-after.json`、`/tmp/buzhi-pr2-membership-repeat/`、`/tmp/buzhi-pr2-core-check/` 属于本次本地环境，不是线上生产数据，也不替代 GitHub CI 的最终状态。

## 合并边界

原 PR #2 已由其他操作合并；本轮在用户批准的独立后续分支提交，基于最新 main 保留并行工作，重新验证最终 HEAD 的 CI，不能用旧绿单替代。本文不授权合并或部署。
