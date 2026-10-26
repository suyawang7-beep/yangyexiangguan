# 2026-10-27 工程新骨架对齐 · 视觉细化 V3

## 已核对
工程分支 `integration/buzhi2-safe-ui-20261027` 的 `ui-preview/buzhi2/foundation.js`、`foundation.css`、工程交接文档。该工程的 `index.html` 把生日主题融进首页的 `home-birthday` 场景和 `letter-panel/memory-panel` 标签；**不要把上一版视觉预览里的单独生日页当成当前工程首页实现**。

## 本轮交付
`engineering-organic-v3.css`：基于真实工程 DOM 的纯 CSS 视觉覆盖层。加载顺序：`foundation.css` 后，`engineering-organic-v3.css`。不需要改 JavaScript、路由、业务或账户状态。重点改：
- 首页：椭圆海潮底景 + 左中人物插画位 + 错层生日书桌（保留工程标签和内容）
- 融卡：卡面扇形错层 + 独立规则纸签；保留 `data-card`、`aria-pressed`、禁用按钮
- 周边：高低错位展架；保留真实筛选挂钩
- 收藏：轻叠卡册；保留 `#rarity`、`#collection-grid`
- 信箱：信纸与回复小桌；保留输入计数和非发送反馈
- 事务所：布告栏；保留状态说明
- 个人：OC 肖像拱窗 + 档案页；不显示虚构资料
- 导览：群岛岛屿状节点；原有链接不改

## 衔接边界
该样式放在**设计分支** `docs/design/previews/buzhi2/`，而不是工程分支。工程楼按需 cherry-pick/复制 CSS 并加 link 引用即可。不要直接覆盖业务工程。工程现有九个独立路由继续保留。生日单独路由 `birthday.html` 仍是路由兼容项，主场景在首页。

## 还需验收
此轮是 DOM 结构对齐与 CSS 实作，未完成真实浏览器截图验收。需要工程楼在 320/375/390/768/1440px 检查溢出、错层碰撞、焦点、Tab、移动端底部导航、reduce-motion，尤其不要让纸签遮挡正文。所有原创角色、岛屿与商品图仍是待替换素材槽，不声称已完成成品绘制。
