# 个人中心字体与贴纸动效 · 2026-10-20

基于 `19d703645a4bdf21fcb0cc9d142e0670ec9d45f7`，仅调整个人中心视觉与装饰动效。

## 修改内容

- `ui-preview/resident.html`：原内联样式拆至独立 CSS，加入动效按钮；原账户、认证、作品与密码脚本逐字节保持不变。
- `ui-preview/resident.css`：本地手写标题与圆体正文/控件，输入框 16px，触控目标至少 44px；手机贴纸放在独立留白区；文字不参与滑入或缩放动画。
- `ui-preview/resident-motion.js`：贝壳轻摆、海浪起伏、海星漂浮，分别使用 8.6/10.2/12.4 秒节奏。沿用全站 `buzhi-ui-motion` 设置，响应跨标签同步、系统减少动态、页面隐藏与贴纸离屏暂停；浏览器禁止偏好存储时，开关仍可在当前页面使用。
- 原有明确配色海浪 SVG 保留，未重新引入跨 SVG 渐变导致的黑色贴纸。
- 未改后端、共享 app/effects 脚本或任何生产数据。

## 本次验证

使用系统 Chromium `/usr/bin/chromium`，无需安装新依赖。

| 检查 | 结果 |
| --- | --- |
| `node tests/resident-appearance.cjs` | 43 项通过，1440/768/390/320px；含登录/未认证外观、表单原交互、字体加载、真实动画、暂停恢复、存储受限 |
| `node tests/resident-production.cjs` | 通过；正式服务器路由及 MIME、认证后渲染、保存作品、动效与首页双向同步；临时数据库中的金币/任务/签到/抽卡/奖励/流水保持原值 |
| `node tests/deployment-artifact.mjs` | 通过；部署复制产物包含个人中心页面及新 CSS/JS |
| `node tests/pencil-assets.mjs` | 通过 |
| `node tests/liquid-page-evidence.cjs` | 其他 10 页 × 桌面/手机共 20 组实际页面记录通过 |
| `npm --prefix server run check`、动效 JS 语法、`git diff --check` | 通过 |
| 独立只读代码复核 | 未发现实质问题；独立重跑初版 41 项专项测试通过，之后新增的两项存储受限检查亦通过 |

截图：`/tmp/buzhi-resident-polish/resident-{1440,768,390,320}.png`。
液态玻璃回归证据：`/tmp/buzhi-resident-liquid-regression/evidence.json`。

## 全站旧回归的真实状态

完整执行 `.github/workflows/core-flow.yml` 的 19 个检查：**7 通过，12 失败，不是全绿**。

通过：`deployment-artifact.mjs`、`flow.mjs`、`activity-admin.cjs`、`backup-disconnect.mjs`、`admin-pages.cjs`、`message-board-flow.mjs`、`site-acceptance.cjs`。

以下 12 项均在未修改的 `19d7036` Git 归档副本中重跑，去除工作目录差异后，失败日志与本次工作区**完全一致**：

| 失败检查 | 观察到的失败 |
| --- | --- |
| `online-flow.mjs` | 旧断言期望 16 张卡，实际 32 张 |
| `activity-flow.mjs` | 测试注册只传昵称，新接口要求密码，返回 400 |
| `operations-flow.mjs` | 注册夹具失效后认证报登录已失效 |
| `operations-admin.cjs` | 无效账户夹具导致 SQLite 绑定参数无效 |
| `content-flow.mjs` | 旧断言期望 0 个角色，实际预置 2 个 |
| `content-admin.cjs` | 等待旧上传成功提示超时 |
| `membership-flow.mjs` | 注册夹具失效，状态接口返回 401 |
| `membership-admin.cjs` | 等待认证限制提示超时 |
| `membership-race.cjs` | 等待认证申请表超时 |
| `maintenance-flow.mjs` | 注册夹具失效后认证报登录已失效 |
| `maintenance-admin.cjs` | 等待 undefined 账户对应的游客复选框超时 |
| `production-layout.cjs` | 等待旧恢复密钥一次性弹窗超时 |

另：原有 `pencil-case.cjs` 的逐页外观部分执行后，在最后未认证真实账户夹具处超时；该夹具同样只传昵称，未传新接口要求的密码。未削弱断言或更改账户流程来让旧测试通过。

详细日志：`/tmp/buzhi-resident-core-suite/`、`/tmp/buzhi-resident-baseline-check/`。

## 发布边界

本次验证对象是本地源码、部署复制产物与隔离服务器。源码交接分支为 `codex/guide-alignment-resident-polish-20261020`，同时包含个人中心美化、地图校准及各自的回归测试；不合并主分支，也不代表已部署到 Railway 或 GitHub Pages。本环境之前的站点域名访问限制不应被当成网站故障；不得仅凭本地测试声明线上已更新。

可通过该分支中的 `ui-preview/resident.html`、`resident.css`、`resident-motion.js` 读取个人中心实现；地图实现及坐标说明见同目录 [GUIDE-ALIGNMENT.md](GUIDE-ALIGNMENT.md)。文中 `/tmp/` 路径只是本次本地证据位置，不属于推送的源码文件。
