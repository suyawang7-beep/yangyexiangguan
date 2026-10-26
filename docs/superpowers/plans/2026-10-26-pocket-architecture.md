# 卡册模块深化 Implementation Plan

> 使用 executing-plans 逐项实施。来源：Matt Pocock 的 improve-codebase-architecture 与 codebase-design；本次只做行为保持的局部重构。

目标：正式卡册直接维护，不再从示例预览通过Python字符串替换生成。视图模块隐藏分页、筛选、弹窗、手势和状态读取；事件适配器只处理现有collection-data事件及手机尺寸切换。

文件：
- 新增 `ui-preview/collection-pocket-view.js`：可独立挂载的正式视图，包含原样式与模板。
- 修改 `ui-preview/collection-pocket.js`：只保留事件/媒体查询适配器。
- 修改 `ui-preview/collection.html`：按序加载视图与适配器。
- 删除 `tools/build-pocket-adapter.py`：消除修改预览、生成器、正式代码三处同步的问题。
- 新增 `tests/collection-pocket-view.cjs`：通过模块的挂载接口检查分页、筛选取消、故事、记录、状态及零网络写入。

步骤：
- [x] 新接口测试在旧代码上因缺少独立挂载接口失败；原有真实数据集成测试通过。
- [x] 模板4138字符、CSS11359字符逐字保留，迁移为正式视图模块；生成器删除。
- [x] 独立视图、真实API集成及资料加载测试通过，语法与diff检查通过。
- [x] 保存ADR 0001、临时目录HTML报告与独立开发分支。生产不变。

审查：独立只读审查未发现阻断问题，确认模板/CSS文本一致、状态保留语义不变、脚本加载顺序正确、静态路由和打包支持新文件。

本轮未执行的候选：账户/目录状态投影（app.js:244–299、1000）、后端库存/融卡/配额模块（server/index.mjs:164–195）。各自另行迭代，不混入本轮。

约束：不改数据库、后端、奖励、融合规则、主页；不顺便修复既有行为差异。预览示例保留为设计材料，不再作为运行代码来源。
