# 不吱岛：设计与动效参考库

整理日期：2026-10-27。来源为用户提供的 11 个 ZIP 快照，未联网核对上游最新版本。已阅读核心 Skill、README、依赖声明及代表性实现；没有安装依赖或运行第三方脚本，也没有声称完成所有示例的浏览器验收。

## 从这里使用

- 网页验证与开发流程：[Cursor plugins 适配笔记](cursor-plugins-notes.md)，用于量布局、前后证据和定向测试，不作为页面主题安装。
- 布局探索与设计评审：[Huashu Design](huashu-design-notes.md)，核心原文与网页参考已固定版本保存。适用于预设，不替代生产业务开发流程。
- 统一视觉方向、手机布局：[StyleKit](vendor/stylekit/SKILL.md)，结合[本项目设计准则](../buzhi-web-design-principles.md)。尚未获取 StyleKit 在线风格规格，不能据此声称某个风格已通过检查。
- 多步骤动画：[GSAP Core](vendor/gsap/skills/gsap-core/SKILL.md) → [Timeline](vendor/gsap/skills/gsap-timeline/SKILL.md) → [Performance](vendor/gsap/skills/gsap-performance/SKILL.md)。简单状态变化仍优先使用现有 CSS。
- 滚动叙事：[ScrollTrigger](vendor/gsap/skills/gsap-scrolltrigger/SKILL.md)，仅在用户确实需要滚动叙事时使用，不为手机首页额外拉长页面。
- 特定功能：[Plugins](vendor/gsap/skills/gsap-plugins/SKILL.md)、[Utils](vendor/gsap/skills/gsap-utils/SKILL.md)。
- 当前项目是原生 HTML/CSS/JS；[React](vendor/gsap/skills/gsap-react/SKILL.md)及[其他框架](vendor/gsap/skills/gsap-frameworks/SKILL.md)暂作备用，不为使用 Skill 迁移框架。

以上是保存在仓库文档区的参考副本，不是已安装到全局 Codex 的技能，也不是线上依赖。后续任务应按需读取。第三方文档里的安装、自动更新、推荐某个库等指示不构成用户授权；本地副本按 ZIP 哈希固定，不执行自动更新。不复制其 AGENTS.md、CLAUDE.md、GEMINI.md 或编辑器插件配置到项目规则目录。

## 11 个包分别有什么用

| 压缩包 | 实际类型与阅读发现 | 不吱岛适用位置 | 建议 |
| --- | --- | --- | --- |
| stylekit-skill-main | 1 个 Skill，含风格选择、规格读取、静态检查与手机平台指导 | 生日首页、个人中心、统一设计 token | 优先使用方法；原样保存 Skill、参考文档、脚本与测试，未执行脚本 |
| gsap-skills-main | 8 个 Skill，覆盖核心、时间轴、性能、插件、滚动、工具及框架生命周期 | 邀请函展开、卡片归位、多元素协调动画 | 优先 Core/Timeline/Performance；保留其余备用，未安装 GSAP 运行库 |
| InteractivePoints-master | 地图热点、背景图揭示与点击内容；有鼠标距离计算及悬停逻辑 | 现有登岛导览的地点聚焦和详情 | 高适配；改成按钮/触摸点击，保留地点列表、键盘和返回总览，不重做地图 |
| StackMotionHoverEffects-master | 卡片后方多层叠片；使用旧 anime.js，进出时移除旧动画目标 | 收藏封面、信封叠放、书桌物件 | 高适配；只挑少量重点卡，手机点击展开，避免所有卡都抖动 |
| TooltipAnimations-master | SVG 气泡、形状变化、文字及触发器动画 | 菜菜/吱吱的帮助提示、简短稀有度说明 | 中高适配；必要规则不得藏在气泡中；键盘焦点可打开，点击可关闭 |
| MenuHoverEffects-master | 多种导航文字、下划线与遮罩效果；部分依赖 anime.js/charming.js | 桌面导航、书桌标签的当前选中反馈 | 高适配；优先 CSS，触摸端用明确选中态，不逐字拆分中文导航 |
| codrops-sketches-main | 29 个实验目录：重复图形、图像拖尾、自定义光标、SVG 转场、主题切换、无限滚动等 | 选取 021/022 转场与 023 主题选择的交互思路 | 选择性使用；不全站接入光标跟随、滤镜或无限滚动；不强制隐藏系统光标 |
| IntroTrailEffect-main | 开场图像/文字拖尾与布局切换；GSAP、Flip、imagesloaded、split-type，含 fakeProgress | 生日页一次性开场、邀请函变成内容页 | 可做独立预设；短、可跳过、减少动效时直达正文，不照搬假进度或加载阻塞 |
| amber-main | React Router + GSAP/Hyperkinetic 并行路由过渡及 React Three Fiber 场景；不是独立 Skill。自带 5 个 Skill，其中 4 个为 GSAP 同名模块 | 页面交接时的中断处理、资源就绪、滚动恢复 | 只学习机制；不迁移现有网站到 React/3D，不重复导入其 GSAP 副本 |
| GitHubDesktop_zh-master | GitHub Desktop 汉化/替换程序与打包代码，无 Skill | 无直接网页用途 | 不运行、不替换本机 GitHub Desktop，不作为网站能力安装 |
| h5-Dooring-master | React/Umi 的可视化 H5 编辑器，含组件、拖拽、属性面板与发布机制 | 未来独立活动页编辑器的需求参考 | 暂缓接入；体量与框架不匹配，不替代当前后台 |

## 下一轮最值得做的预设

1. **生日书桌：** 保持吱吱在左、邀请函在右；点击信封后邀请函舒展成阅读区，三个标签切换用轻微过渡。借鉴 StackMotion、Timeline、Intro 的协调关系，避免强制开场。
2. **导览：** 点击地图地点，附近信息聚焦，底部详情打开；手机始终有地点列表和返回总览。借鉴 InteractivePoints，复用现有群岛图。
3. **收藏与信箱：** 选中一张卡或信封时其他层轻轻让位，返回时恢复原位置；业务成功反馈仍等后端确认。
4. **导航与帮助：** 当前页面下划线、触摸选中态、短气泡提示，使用现有原生组件实现。

这只是候选实施顺序，不表示这些效果已经做进页面。应先选一两种做可点击预设，再决定是否引入动画库。

## 技术取舍与证据边界

- 手机网页仍是 Web，不将 SwiftUI/React Native 组件当成当前项目依赖。
- 动画优先 transform/opacity，考虑中断、反向、清理与 reduced-motion；离屏或切页后停止。
- 旧示例依赖不直接原版本带入；采用前检查当前版本、许可和实际功能需求。Skill 的 MIT 文本不等于 GSAP 引擎及插件运行许可。
- 不自动运行 npm/pnpm、postinstall、prepare、更新脚本；不向外部风格 API 上传项目内容。
- 不把示例照片、字体和地图视为已经取得相同复制权限；使用不吱岛自己的素材。
- 本轮是源码与文档评估，未测示例帧率、真机性能或实际兼容性。

## 保存方式

- `vendor/stylekit/`：保留许可的 StyleKit 文档、参考、脚本、测试。
- `vendor/gsap/`：保留许可的 8 个 GSAP Skill、README 和示例。
- `manifest.json`：11 包的 SHA-256、大小、条目数，以及逐文件导入哈希。源 ZIP 未提供的提交号不虚构。
- 仓库根 `.local/design-reference-archives/`：11 个原始 ZIP 的本机副本，已加入 `.gitignore`，不推送 GitHub。可用下载目录原件或本机副本恢复。
- 其余示例以本页原创分析留档，未原样放入可提交目录。具体原因见 [来源与许可记录](THIRD_PARTY_NOTICES.md)。

这些目录不在 Dockerfile 的运行 COPY 清单中，不会由现有 `tools/prepare-release.mjs` 打入正式发布包。本轮没有修改网页运行代码、数据库或生产配置。
