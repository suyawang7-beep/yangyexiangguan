# 不吱岛视觉参考知识库 v0.1

此表描述**借鉴什么、适配到哪里、不要复制什么**。参考仓库代码与素材须分别遵守其许可。

| 参考源 | 提取的设计方法 | 不吱岛落地位置 | 不直接照搬 |
| --- | --- | --- | --- |
| [wlyUI](https://github.com/serendipityApe/wlyUI) | 手绘边框、主次按钮、状态反馈、响应式栅格思想 | 登岛按钮、任务卡、标签、移动导航 | Vue 2 / 老 Webpack 工具链与整套配色 |
| [Stylebase](https://github.com/w3118597378-max/stylebase-design-inspiration-library) | Visual DNA、颜色/构图/字体/交互的结构化归档，Prompt Kit，明确设计禁忌 | 本文件、DESIGN.md、设计验收流程 | 纸张工作台、硬黑轮廓、源素材直接拷贝 |
| [stylized-water](https://github.com/suyawang7-beep/stylized-water) | 水面表现研究 | 海洋动态背景 | 未验证实现细节前不直接移植 |
| [origami](https://github.com/suyawang7-beep/origami) | 折页互动方向 | 信箱、通行证 | 不对全站滥用翻页 |
| [codrops-sketches](https://github.com/suyawang7-beep/codrops-sketches) | 趣味创意交互的探索方向 | 抽卡反馈、页面过渡 | 不盲目复制效果 |
| [Floaty](https://github.com/suyawang7-beep/Floaty) | 漂浮动效方向 | 海报装饰 | 避免过量运动 |
| [mistwood-cottage](https://github.com/suyawang7-beep/mistwood-cottage) | 氛围与层次参考 | 背景空间感 | 不改变主色为森林色 |
| [FullscreenClipEffect](https://github.com/suyawang7-beep/FullscreenClipEffect) | 页面转场研究方向 | 庆典章节过渡 | 不影响可达性 |
| [IntroTrailEffect](https://github.com/suyawang7-beep/IntroTrailEffect) | 入场轨迹研究方向 | 首页首次进入 | 不强制每次播放 |

## 新参考的录入流程
1. 保存**原始链接、作者、图片或仓库名称、使用许可状态**。
2. 拆解六项视觉 DNA：构图、色彩、字体、材质、光影、动态。
3. 为每项写一条「可实现规则」和一条「禁用规则」。
4. 标明用于哪个页面和移动端适配。
5. 先原型验证，再纳入正式组件，不能直接把参考截图当生产素材。

## 已定视觉 DNA
- Layout：双角色大型视觉中心 + 漂浮信息卡 + 节奏性留白。
- Color：海洋淡蓝为主，浅青高光，粉紫虹彩点缀。
- Texture：清澈玻璃与细软描边，少量手绘星点/肥啾装饰。
- Motion：慢速水波、层级浮动、用户可关闭；尊重系统减少动态设置。
- Character：菜菜生日主角、吱吱共同岛主；实际立绘需等正式授权素材接入。

## 首页设计验收
[ ] 双角色都有位置且不被遮挡
[ ] 生日主体文案完整准确
[ ] 海洋蓝是主色，而非纸白
[ ] 入口按钮与公告在手机上可读可点
[ ] 降低动态偏好下不出现持续漂移动画
[ ] 引用素材留有权利记录

## 2026-10-17 · 开发资源与移动端组件参考
| 来源 | 验证的特点 | 不吱岛应用 | 取舍 |
| --- | --- | --- | --- |
| [Design Resources for Developers](https://github.com/bradtraversy/design-resources-for-developers) | UI 图形、字体、调色、图标、CSS 动画、UI 库及设计系统资源目录 | 后续素材检索清单，选型时附原始授权链接 | 目录本身不是可直接安装的 skill；不复制来源不明的图库素材 |
| [Tabler](https://github.com/tabler/tabler) | Bootstrap 5 基础的 UI 组件、响应式布局、状态、可访问性及 Tabler Icons | 任务状态、标签、金币数值、卡片与图标统一规则 | 不引入整套管理后台主题，以免覆盖海洋玻璃主题 |
| [Ionic Framework](https://github.com/ionic-team/ionic-framework) | 面向移动端的 Web Components、跨端框架、底部导航与触控模式 | 手机底部五入口导航、安全区域、44px 以上点击区域、键盘焦点 | 当前网站以原生 HTML/CSS/JS 为主，不引入 Ionic 全框架 |

### 此次实际落地
- `index.html` 加入独立的手机玻璃底部导航：首页／任务／抽卡／收藏／签到。
- 使用 hash 路由同步活动状态和 `aria-current=page`，不会改变原有路由。
- 控制触控目标最小尺寸，并为底部安全区域和内容留白做适配。
- 保留已有水面折射、气泡、双人海报及动效控制。

### 后续待处理
- 将抽卡、签到、领取任务从概念交互升级为真实持久化数据逻辑。
- 正式人物立绘接入前核实授权并保证海报不遮挡面部。
- 导航、透明对比、动效和滚动需要在实体移动设备浏览器验证。
