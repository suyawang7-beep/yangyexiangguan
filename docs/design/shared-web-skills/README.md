# 共享网页开发 Skills

这些是从 Cursor Team Kit 选取的4个独立 Skill，不是 Cursor 插件运行时，也不是网站依赖。

| Skill | 用途 |
| --- | --- |
| [verify-this](../../../.agents/skills/verify-this/SKILL.md) | 用同条件的前后证据核对可验证结论 |
| [run-smoke-tests](../../../.agents/skills/run-smoke-tests/SKILL.md) | 改动相关的定向冒烟测试 |
| [deslop](../../../.agents/skills/deslop/SKILL.md) | 最小范围整理冗余代码，保留原有行为 |
| [make-pr-easy-to-review](../../../.agents/skills/make-pr-easy-to-review/SKILL.md) | 整理PR说明和审阅入口 |

## 给其他对话的用法

先读取本页，再按当前任务读取对应的 `SKILL.md`。同机Codex或支持仓库Skill发现的工具可使用 `.agents/skills/`；ChatGPT网页版需自行打开这些GitHub文件，或由用户把文件提供给它，不会自动获得本机安装。

示例指令：请先读取本仓库 `docs/design/shared-web-skills/README.md`，本次网页修改使用其中适合的Skill；使用项目已有命令，不照抄不存在的npm脚本。

## 操作范围

安装或读取Skill不等于授权合并、部署、重写历史、发送消息或修改生产数据。这些动作仍按用户当前授权执行。敏感截图、令牌、用户数据不得作为示例上传。

上游提交固定为 `10d7b8a647caedfca8143ca8335d9e063c027227`，每个目录保留原MIT许可；哈希见 [SOURCE.json](SOURCE.json)。没有安装脚本、自动更新、MCP连接或第三方运行库。正文保持上游字节不变，本文是本项目适配说明。
