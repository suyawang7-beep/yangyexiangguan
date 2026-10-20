# 登岛导览定位与动效校准 · 2026-10-20

修复基线：`19d703645a4bdf21fcb0cc9d142e0670ec9d45f7`。此前个人中心的本地修改全部保留。

## 复现与原因

1. 旧码头锚点 `(580,755)` 落在客船上，旧庆典锚点 `(675,612)` 没有对准雕像基座。
2. 标签以中心对准坐标，却再向下绘制指针，实际指针终点比该坐标低约 27px。
3. SVG 镜头按独立预设中心缩放，横向滚动仍根据原始 x 值估算。两套坐标不一致，且标签跟随逐帧镜头移动，真实点击会等待标签稳定。
4. 海浪路径与半透明椭圆没有按当前图中海域/山谷约束，局部效果和底图不匹配。

## 修正

保留原地图 `buzhi-archipelago-soft-palette-draft.png`，Git 对象哈希与基线相同。

| 地点 | 地面锚点（1584×993 原图） | 标签中心 |
| --- | --- | --- |
| 庆典码头 | `(582,690)` 岸上入口 | `(540,642)` |
| 岛民事务所 | `(861,552)` 建筑入口 | `(934,480)` |
| 肥啾邮局 | `(510,592)` 建筑入口 | `(440,515)` |
| 回忆收藏室 | `(865,660)` 门前台阶 | `(850,704)` |
| 生日庆典 | `(673,568)` 雕像基座 | `(691,611)` |

- 分离标签与地面锚点，以清晰引线/定位圆点说明对应位置；全部共用同一 SVG viewBox。
- 固定地图及标签坐标，去掉独立的镜头缩放插值。选站只平移地图容器的可视窗口，按实际投影点居中并约束在地图边界内；窗口变化后保留并重新对准当前地点。
- 复用已有 `pencil-map-callouts` 图层，避免旧手绘标注再次叠加偏移装饰。
- 港湾与外海通道分别匹配海浪，山谷匹配低透明度有机山雾。每组使用固定裁剪区域，仅让内部笔触变化，不挪动陆地、建筑、文字或地图。
- 继续服从全站开关、后台 `effectGuide` 开关、系统减少动态、页面隐藏和离屏暂停。

修改范围：`renderGuide()`、共享效果脚本中的导览初始化/局部导览动效、`guide.css/html`、专项测试及视觉 CI。账户、进度、签到纪念角、奖励与后台逻辑均未修改；已比对 `app.js` 除导览渲染和效果缓存版本以外的内容完全相同。

## 验证

- `node tests/guide-alignment.cjs`：**180 项通过**，1440/1024/768/390/320px；真实点击、锚点和引线、标签不重叠、定位居中及边界、动态/静态模式、窗口变化、后台关闭、隐藏暂停。
- `node tests/ambient-motion.cjs`：**93 项通过**，11 页共享动效和四种导览屏宽。
- `node tests/liquid-page-evidence.cjs`：**20 组通过**，10 页桌面/手机实际页面和玻璃覆盖，无页面错误。
- 个人中心专项 **43 项通过**；个人中心隔离正式服务器联调通过。
- 部署复制产物检查、服务器与前端语法、视觉工作流 YAML、`git diff --check` 通过。
- 独立只读代码复核未发现实质问题，独立重跑最初 177 项导览检查通过；随后增加的窗口重新居中和后台关闭检查亦通过。

完整核心工作流重新执行：**7/19 通过，12 项失败，不是全绿**。以下失败日志在规范化目录后，与未修改基线逐字一致：

`online-flow.mjs`、`activity-flow.mjs`、`operations-flow.mjs`、`operations-admin.cjs`、`content-flow.mjs`、`content-admin.cjs`、`membership-flow.mjs`、`membership-admin.cjs`、`membership-race.cjs`、`maintenance-flow.mjs`、`maintenance-admin.cjs`、`production-layout.cjs`。

具体旧失败原因见 [个人中心验证记录](RESIDENT-APPEARANCE.md#全站旧回归的真实状态)。本轮核心日志：`/tmp/buzhi-guide-core-suite/`。

原 `pencil-case.cjs` 的逐页部分执行后，仍在最后未传注册密码的旧账户夹具处等待认证限制按钮超时，与基线一致；未削弱原断言。

## 预览与发布状态

- 修复前：`/tmp/buzhi-guide-before/overview-1440.png`、`coordinates.json`。
- 修复后：`/tmp/buzhi-guide-after/guide-1440-overview.png`、`guide-320-stop-5.png`、`alignment.json`。
- 其他页面回归：`/tmp/buzhi-guide-liquid-regression/evidence.json`。

以上是本地源码和隔离服务器验证。源码交接分支为 `codex/guide-alignment-resident-polish-20261020`，同时包含本次导览修复、此前个人中心美化和两份验证文档。只推送独立分支，不合并主分支；未宣称 Railway/GitHub Pages 在线版本已经更新。未访问或修改生产参与者数据。文中 `/tmp/` 路径只是本次本地证据位置，不属于推送的源码文件。
