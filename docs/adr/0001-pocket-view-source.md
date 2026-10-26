# ADR 0001：正式卡册使用直接维护的视图模块

日期：2026-10-26。状态：已在开发分支实施，未部署。

问题：`tools/build-pocket-adapter.py` 从设计预览中提取HTML、CSS和JavaScript，通过匹配字符串改变交互并重写正式视图、app.js和collection.html。维护者必须同时理解预览、生成器与产物；直接修改产物可能在下次生成时丢失。

决定：删除生成器。`collection-pocket-view.js` 是正式视图唯一实现，公开 `BuzhiPocketView.mount(host, snapshot, savedState?)`，返回 `captureState()`。分页、筛选、弹窗、手势和视图状态全部留在模块内部；调用方只提供现有快照。

`collection-pocket.js` 是浏览器事件适配器，负责现有 `buzhi:collection-data` 和媒体查询。它不构建卡片、拼接样式或访问业务接口。`collection.html` 依次加载视图、适配器和app.js，保留已有defer顺序。

效果：视图可以通过挂载接口在没有app.js、业务服务器或数据库时验证；真实数据接入仍由集成测试覆盖。模板和CSS文本保持原样，不额外引入运行依赖或资源请求。

范围：不修改卡片、金币、融卡规则、身份权限、信箱及生产数据。不顺便改变已有的页面重绘或尺寸切换后的状态保留行为。账户与目录加载、后端库存深化另行处理。

设计预览继续保留作为历史设计材料，独立示例数据不进入正式视图。
