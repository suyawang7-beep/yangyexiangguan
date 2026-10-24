# 不吱岛动效候选：登岛导览与手机端

状态：研究与选择阶段，未安装依赖、未实施新动效、未部署。保留当前海蓝色主页和已确认群岛插画。

## 保留上一轮推荐

1. 个人中心叠放信封：Portal Labs Card Stack。
2. 收藏展台：Portal Labs Coverflow；与当前扇形/圆环/拖动展馆重叠，暂不重复建设。
3. 相册标签页：Portal Labs Folder Tabs。
4. 认证步骤条：Portal Labs Progress Stepper。
5. 手绘邮戳与线条：Truus SVG 绘制。
6. OC卡片展开：Truus ServiceCards；当前画廊已有交互，实施前确认差异。
7. 个人中心主次排版：PortfolioTemplate ProjectsSection。
8. 登岛旅程时间轴：PortfolioTemplate EducationTimeline。

原组合：A=1+3+4（优先），B=2+5+6，C=1+7+8。Impeccable作为排版与质量参考，不作为运行时动效库。

## 当前实现核对

依据本机源码和本轮本地页面截图；不是线上版本或手机真机验收。

- ui-preview/effects.js：海面流动、玻璃呼吸光；地图海水和山间雾气；非可见区域/后台暂停。
- installGuide：六站导览，地点点击、上/下一站、全岛总览、选中标记及小屏水平滚动定位。
- ui-preview/guide.css：地图舞台最小宽度1000px，小屏通过滚动查看；介绍面板在地图下方。未实现地图自定义双指缩放或地点介绍底部抽屉。
- 收藏已有网格/扇形/圆环与Pointer拖动；画廊已有滑动和惯性逻辑，不建议再堆同类效果。
- 鼠标跟随和部分视差只对鼠标启用；移动端应新增触屏操作反馈，而非照搬悬停。
- 全站已有动效开关和系统减少动态效果适配，应继续保留。

截图：../../test-results/guide-motion-review/01-current-guide.png（本机忽略目录，未提交截图）。

## 本轮GitHub候选

### M1 地图触屏探索：优先

来源：https://github.com/timmywil/panzoom

README确认支持触摸、双指缩放、SVG与直接脚本接入。建议保持当前插画，添加有边界的拖动与适度缩放、返回全岛按钮；放大缩小按钮作为替代操作。地图、地标锚点与文字标签必须同步，避免错位。需处理地图操作与页面纵向滚动的冲突。

### M2 地点详情底部抽屉：最优先

来源：https://github.com/tech-systems/panes

README确认是无依赖的移动端面板/抽屉交互库，并提供原生地图应用风格示例。建议点邮局等地点后，从底部出现介绍，提供收起、半展开、展开三种状态。收起时尽量保留地图，不自动跳转；进入地点使用明确按钮。

### M3 地点卡左右滑动：优先

来源：https://github.com/davidjerleke/embla-carousel

README确认无框架依赖、支持触屏滑动与平滑运动。建议在详情区域横向滑动六站卡片，松手对齐，地图定位同步跟随。保留前后按钮。仅在卡片区域响应横滑，避免与地图拖动互相抢手势。

备选：https://github.com/nolimits4web/swiper

Swiper支持移动触屏、视差、Coverflow等更多能力。若需求仅为六站切换，先选择较简单的实现；二者择一，不重复引入。

### M4 小岛旅行动效：后续装饰项

来源：https://github.com/juliangarnier/anime

支持CSS、SVG、DOM动画。可参考其能力，实现短暂的路线绘制、肥啾/小船抵达提示。具体沿路径运动仍需定向原型验证。不自动播放完整长导览，不阻塞点选，不要求引入整套动画库。

### 未列为生产首选

https://github.com/emilkowalski/vaul 的当前README声明暂停维护，且原实现基于React；保留交互灵感，不优先作为当前原生JS站点的新依赖。

## 建议选择

优先 M2+M3；需要自由探索地图时再加 M1。M4最后考虑。

不改主页视觉；先保留地图原画与已有海水/云雾，将新增效果集中在导览和触屏交互。实施前需手机原型验收，检查纵向滚动、地图拖动、抽屉拉动、横滑之间的手势冲突、安全区、可点击区域与减少动态模式。
