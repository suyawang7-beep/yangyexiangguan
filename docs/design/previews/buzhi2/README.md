# 不吱岛 2.0 · 有机布局视觉预览 v1

独立设计分支，不合并 main，不部署，不涉及真实业务。

## 使用

在仓库根目录运行 `python -m http.server 8080`，打开 `http://localhost:8080/docs/design/previews/buzhi2/index.html`。其余八页由导航进入。九个 HTML 文件是独立页面，并非一张长单页。

## 设计边界

- 所有用户态、库存、金额、时间、登录、融卡、兑换和发送操作均为**未接入**。禁用按钮绝非业务操作。
- 角色和商品是明确写出的占位示意，正式美术素材需替换为角色图、卡面、商店周边、地图等独立资源。
- 先验证 320/375/390/768/1440px，无横向溢出、触摸和 Tab 顺序，才能交工程整合；目前未做浏览器实测。
- 旧生日预设的三标签逻辑保留，但采用新生日抽屉/邀请函构图。

## 页面与挂钩

| 预览路由 | 工程路由 | 待接入交互 |
|---|---|---|
| index.html | index.html | 真实活动状态、角色与导航 |
| birthday.html | birthday.html | 生日来信/回忆/赴约标签；正式日期与立绘 |
| workshop.html | workshop.html | 真实卡选择、规则检查、确认及结果 |
| shop.html | shop.html | 商品资料、资格、库存与兑换 |
| collection.html | collection.html | 我的收藏、筛选与卡片详情 |
| mailbox.html | mailbox.html | 实名匿名、发送、回复权限与回执 |
| office.html | office.html | 任务状态、签到、领取与小测 |
| resident.html | resident.html | 登录、认证、OC、档案与作品 |
| guide.html | guide.html | 地图热点、地点详情、列表导航 |

## 素材插槽

`hero .character`：首页双岛主与生日吱吱独立立绘，需保证刘海仅薄荷绿挑染；`shop .scene`：实物商品图；`workshop .card`：真实卡面；`guide .guide-map`：既有群岛 SVG/图片；`mailbox .scene`：手绘信封；`resident .scene`：已绑定 OC。所有文字始终为 HTML 层，不写入背景图。

## 与工程楼的集成方式

不要直接覆盖工程分支。先核对 `docs/design/buzhi2-organic-layout-contract.md`，对每页只提取可用 DOM/CSS 与装饰槽位，保留原业务选择器、真实链接、账户状态和错误反馈。视觉设计文件只在 `docs/design/previews/buzhi2/`，没有触碰正式运行文件。
