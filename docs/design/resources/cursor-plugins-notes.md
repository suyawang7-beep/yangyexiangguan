# Cursor plugins：用于不吱岛的开发与验证方法

检查日期：2026-10-27。来源：[cursor/plugins](https://github.com/cursor/plugins)。这是插件规格、官方工作流与服务集成的集合，不是一套页面主题或动画素材。已阅读根 README 和以下选取模块，未声称学习整个插件市场。

## 后续安装结果

用户随后明确要求安装。已通过 Codex 系统 `skill-installer` 将以下4个独立 Skill 安装至本机 `C:/Users/A/.codex/skills/`，不是安装 Cursor 插件运行时：

- `verify-this`：基线与修改后证据对照。
- `run-smoke-tests`：改动相关的冒烟检查。
- `deslop`：最小范围整理代码，保留既有行为。
- `make-pr-easy-to-review`：整理 PR 说明与审阅入口；安装本身不授权重写历史或推送。

固定来源提交 `10d7b8a647caedfca8143ca8335d9e063c027227`。各目录保留 MIT 许可、来源和哈希；完整记录见 [cursor-skills-installation.json](cursor-skills-installation.json)。下次对话可用；本机已安装状态不代表其他电脑或云端也已安装。以下原检查记录中的“未安装插件”指 Cursor 插件/MCP，不否认这次独立 Skill 安装。

## 已选取内容

| 模块 | 对不吱岛的价值 | 兼容与边界 |
| --- | --- | --- |
| [cursor-team-kit](https://github.com/cursor/plugins/tree/main/cursor-team-kit) | 小范围测试、核对证据、清晰 PR 和 CI 排查 | 借鉴方法；仓库未提供 package.json 时不照抄 npm 命令 |
| [verify-this](https://github.com/cursor/plugins/blob/main/cursor-team-kit/skills/verify-this/SKILL.md) | 先定义可以证伪的结论，再保存同环境前后证据 | 无基线或环境不一致时标为未能确认，不报告伪造分数或提升比例 |
| [run-smoke-tests](https://github.com/cursor/plugins/blob/main/cursor-team-kit/skills/run-smoke-tests/SKILL.md) | 只运行改动相关流程，按日志定位失败 | 使用本项目现有定向命令；不反复重跑已通过整套回归 |
| [dyl-stack / build-figma](https://github.com/cursor/plugins/blob/main/dyl-stack/skills/build-figma/SKILL.md) | 先量布局、映射已有组件，最后用真实页面复核 | 当前没有 Figma 节点输入或已连接 Figma MCP；只借鉴方法，不声称可直接运行该流程 |
| [agent-compatibility](https://github.com/cursor/plugins/tree/main/agent-compatibility) | 检查启动步骤、验证方式和文档是否符合项目实际 | 未安装其 CLI、未运行扫描，不报告兼容评分 |
| [Playwright integration](https://github.com/cursor/plugins/tree/main/third_party/playwright) | 浏览器快照、实际点击和屏幕尺寸检查 | 当前优先用已有 Codex 浏览器工具，不安装另一套 MCP 或绕过浏览器限制 |

## 在网站工作中的具体流程

1. 从现有页面和代码确认问题，写成可以测量的条件，例如“375px 下正文至少14px、次级操作高度至少44px”。
2. 保存同一页面、同一视口的基线截图与数值；不把旧截图冒充当前。
3. 做局部改动，复用原布局与组件；美化不触碰奖励、权限或数据规则。
4. 用同一视口重新检查，实际操作标签、折叠、返回等路径；运行相关定向测试。
5. 分别报告已证明的结果、没有证明的部分和设计偏好；截图与测试通过不等于生产部署授权。

## 本轮实际应用

目标仅为本地 `zhizhi-birthday.html` 预设。手机基线检测到介绍正文为11px、次级导览操作高度36px，随后分别调整为14px与至少44px。实测结果见[检查记录](../evidence/cursor-preview-verification.md)。这只是两项可读性/触控修正，不代表生日设计已验收。

## 不启用的部分

- 不把 `.cursor-plugin` 当作网页运行依赖，当前也没有全局安装这些插件。
- 不运行自动合并、改写提交历史、无限代理循环或自动部署流程。
- 不自动采集聊天、更新 AGENTS.md 或全局记忆。
- 不连接第三方业务服务，不创建账号、上传项目数据或添加语音功能。
- 本文网页参考链接跟随上游 main；实际安装的4个 Skill 已按上方提交固定版本。

本轮在仓库中保存的是原创适配笔记，未整库复制第三方插件。与前面的 Huashu/StyleKit/GSAP 分工：它们帮助设计与实现，这组方法帮助核对“是否真的做对”。
