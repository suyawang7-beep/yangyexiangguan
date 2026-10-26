# 不吱岛 2.0 · V4 美术方向定稿（2026-10-27）

> 用户已认可九屏海岛手账式视觉概念。此文件是**方向确认和工程细化规格**，不是已发布的站点、不是最终角色立绘、不是已接通数据的业务页面。

## 视觉定位
**海洋幻想世界 × 二次元角色 × 可交互手账 × 轻游戏 UI**。

融合参考：水彩海边贴纸（贝壳、海星、月亮海、灯塔）、活页书/手账/纸胶带/邮票、日系夏日字体、分层动漫角色页、游戏内事件面板。网页是可操作的小岛，不是把海报切成一堆图片。以前的「玻璃大卡 + 方正信息墙」仅能作为少量操作面板，不再作为全站默认语法。

## 页面构图、素材分层与交互

| 工程路由 | 构图目标 | 可切换动态层与素材 | 保留工程节点 |
|---|---|---|---|
| index.html | 生日主题合并首页：左侧或中后景的群岛/灯塔空间、吱吱作为主角、桌边悬浮信札；下方不再重复顶栏导航 | sky, distant-islands, lighthouse, mid-wave, zhizhi-full, petals, ribbon, birthday-envelope, pibao, fat-bird | `.home-birthday`, `.home-birthday-scene`, `.home-birthday-desk`, `#letter-panel`, `#memory-panel` |
| birthday.html | 保留兼容路由，生日专题可独立扩展；不要复制首页全套导航内容 | birthday-envelope, folded-paper, feather, flower, zhizhi-portrait | 生日标签及跨页链接 |
| workshop.html | 卡牌在正中潮汐台周围排布；规则像抽出的配方纸，操作确认固定可读 | workshop-bg, table-rim, card-front, magic-ring, rule-sheet | `[data-card]`, `#selection-summary`, disabled submit |
| shop.html | 高低错位海边展台/纸牌吊签；右侧或底部兑换便笺 | shelf, shop-awning, product-image, ticket | `#shop-filter`, `#shop-message`, disabled exchange |
| collection.html | 活页收藏册 + 拍立得卡面；筛选是书签 | album-base, page-shadow, tape, collection-card | `#rarity`, `#collection-grid` |
| mailbox.html | 写信纸 + 邮票蜡封 + 回复展示区，正文用清晰排版 | letter-paper, stamp, tape, postbox | `#sender`, `#message`, `#preview-letter`, `#letter-feedback` |
| office.html | 事务公告板/委托簿，任务状态先于贴纸 | noticeboard, tasks-paper, pin, bird | 工程公告节点；不可假装可领 |
| resident.html | OC 肖像、通行证和档案像叠放在桌上的手账 | portrait-slot, passport, tabs, tape | 真实登录/认证/OC 容器 |
| guide.html | 可以点击的群岛地图 + 地点列表，移动端专门组织地图和信息面板 | island-map, hotspot, route-stroke | 真实页面链接及键盘/触控 |

## 首页视觉优先级
1. 第一眼是群岛与灯塔、吱吱（面积大，不能被一堆导航控件掩盖）。
2. 第二眼是「吱吱生日季」和海风邀请函；字清楚，不烘焙进大背景图。
3. 第三眼是融卡与周边当前活动入口；它们是场景中的真实可点击路标。
4. 来信、回忆是书桌里可切换的抽屉；不用第二次平铺全站入口。
5. 菜菜是陪伴岛主，不能同吱吱抢生日主角位置。

## 角色 / 吉祥物准确性
- 吱吱：蓝灰长发，**仅刘海薄荷绿挑染**，蓝粉渐变瞳、刘海发带。
- 菜菜：银白及肩短发、宝蓝瞳、额间正中的圆润小角。
- 屁宝：白色拿破仑小猫；肥啾：白色圆鸟。
- 本期蓝鸟花、细长发带、羽翼与浪花；不把菜菜往期抽卡误说成本期。

## Design tokens（起点，可按屏幕继续微调）
- Sea Mist: `#BFEAF7`, Water Blue: `#8BCBE8`, Deep Sea Ink: `#285572`.
- Iris: `#CDC7F2`, Shell Pink: `#F5D2EA`, Cream Paper: `#FFFDF3`, Highlights: `#FFFFFF`.
- 白色不是纯墙：水彩浅纹理、纸边透明度、轻微颗粒，不使用廉价重噪点。
- 标题优先已授权的站酷快乐体 / 霞鹜漫黑 / 霞鹜文楷，正文保持易读；英文可使用有节制的衬线/手写标签。参考图字体不直接拷贝为字体文件。
- 文字底部应该有足够稳定的对比底色；装饰不穿过正文及表单区域。
- 动效优先 transform/opacity；支持 reduce-motion，不能劫持滚动。

## 页面素材输出契约
- 角色插画：独立透明底 PNG/WebP，不要把按钮、日期、标题画进人物图。
- 场景：远景、近景、纸张、贴纸、光效分别成层，支持前后景视差可关闭。
- 内容：卡面、商品、头像必须是受业务状态约束的图片槽位，不用概念图中的假资产替代正式数据。
- 桌面层级：background -> scenery -> portraits -> foreground decoration -> interactive UI -> focus/dialog。
- 手机层级：小尺寸海湾+主角优先，文案跟随，书桌抽屉随后，底部导航永远可触达；不是将桌面横向裁切。

## 划界
美术参考图里的日期、库存、卡片、金币、人物细节仅是概念，不得当真实信息。设计分支不更改 `main`、工程分支、腾讯云、岛民账户或数据库。阶段验收要审查 320/375/390/768/1440px、Tab 顺序、业务空态和减弱动效。

## 后续切片
首轮落地：首页与生日主题共享资源；第二轮：融卡与商店；第三轮：收藏、信箱、事务所；第四轮：个人、导览；最后全站响应式、真实素材与错误/空状态验收。与工程的挂钩以现有 `foundation.js` 选择器为准，视觉可以重构布局，但不能直接删除安全状态和 disabled 操作。
