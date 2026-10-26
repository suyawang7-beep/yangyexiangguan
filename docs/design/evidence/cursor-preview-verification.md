# 生日预设定向检查

日期：2026-10-27。目标：本机 `docs/design/previews/zhizhi-birthday.html`，非生产站。

## 前后对照

同一浏览器、375×812 视口，页面文档可用宽度360px（滚动条占用15px）。

| 指标 | 修改前 | 修改后 | 结论 |
| --- | --- | --- | --- |
| `.intro` 计算字号 | 11px | 14px | 达到本轮至少14px的目标 |
| 次级导览链接高度 | 36px | 44px | 达到本轮至少44px的目标 |
| 文档 scrollWidth | 360px | 360px | 未因修正产生横向溢出 |

- [修改前截图](cursor-review-mobile-before.png)
- [修改后截图](cursor-review-mobile-after.png)
- 浏览器曾加载旧 CSS；给预设样式增加版本参数后重新测得14px、44px，以刷新后的结果为准。
- 另测320×740视口：clientWidth=305、scrollWidth=305，介绍字号14px、次级操作高度44px。

## 交互检查

实际点击回忆标签，显示 `memories-panel`；按 ArrowRight 切换为 `visit-panel`；按 Home 返回 `invitation-letter`。标签并非装饰占位。

## 范围限制

这是字号、按钮高度、横向溢出和标签交互的定向验证，不代表对比度、真机、动画性能或整体视觉验收。人物仍是明确标注的占位图。没有生产连接、数据库修改或部署。

采用 Cursor Team Kit 的证据对照与定向测试思路，使用现有 Codex 浏览器工具完成；未安装或运行其插件/MCP。
