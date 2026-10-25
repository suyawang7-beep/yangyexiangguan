# 吱吱生日限定首页动效 · 测试分支说明（2026-10-26）
此分支仅改 `ui-preview/index.html`，新增 `ui-preview/zhizhi-birthday-motion.css` 和 `ui-preview/zhizhi-birthday-motion.js`。不覆盖官方 `decor/home-poster.webp`、`decor/home-background.webp`、OC 素材，不修改账户/抽卡/任务/服务端或生产入口。

## 动效
- 蓝鸟花瓣：Sakura 思路改写为本地轻量 SVG 花瓣漂浮，无外部依赖。
- 细长发带、羽翼：CSS transform 慢速微动，Motion 的动效理念，但没有引入 Motion 库。
- 生日信封：内置 SVG 从侧方缓缓飞入（一次）。
- 白色肥啾送信：内置示意 SVG 定期从边缘飞来；并非正式肥啾 OC 美术，Animora 仅为关键帧制作参考，没有引入 Animora。
- 所有插画装饰 `aria-hidden` 且 `pointer-events:none`，不可阻挡页面操作。

## 动效关闭与减动效
复用已存在的 `.world[data-motion]` 状态；关闭时停止动画并隐藏移动粒子。系统 `prefers-reduced-motion:reduce` 也关闭动画。未添加另一个相互冲突的可见开关。独立效果项由 JS `CONFIG` 控制，尚**未接入后台逐项开关**，因尚未确认后台接口及权限。

## 手工验收清单（待执行，不标记通过）
1. 在测试服务中选择此分支，打开 `ui-preview/index.html`，确认无报错，无缺失素材。
2. 1440、390、360 CSS px 检查：导航、主视觉、正文按钮、公告可读，没有横向滚动。
3. 测试「动效 · 关」：所有 5 种动态停下；再打开能恢复。
4. 操作系统“减少动态效果”启用时，无循环或入场动画。
5. 测试领通行证、岛民事务所、邮局和收藏入口导航不被遮挡。
6. 刷新后动效开关依然生效，确认手机无明显卡顿。
7. 仅验收测试分支；正式环境不得直接切换此分支。

## 后续需要的后台对接
检查正式后台动效资源数据结构/接口，必要时增加独立 `zhizhi-birthday` 主题及单项开关。默认关闭、仅测试环境可开启。接入前保持当前本地预览模式。
