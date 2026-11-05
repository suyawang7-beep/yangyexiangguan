# 工坊视觉补丁整合（未上线）

来源：BZI-Fusion-Visual-Fix.zip，SHA256 2128a8a3c10fdda482aa16a5fd0035a34d8fe22f3a829f92b4fbd684fbadd049。仅合入workshop-visual-repair.css/js，并在真实fusion.html引入。没有引入preview.html、visual-fixture.js、包内旧live控制器或旧正式卡面文件。

适配：背景URL改用现有/ui-preview/assets路径；Logo直接引用已有/assets/island-mark.svg，移除重复内嵌base64。暂停选择器覆盖::before/::after，视觉层观察body状态类变化以保持用户暂停意图，不修改live控制器。卡册内滚动、背景fixed、托盘/页脚/Logo/仪式环/光点沿用交付补丁。

验证：winged-workshop-browser.cjs 1440/390通过，测卡册边界、固定背景、Logo加载、伪元素暂停、减少动态、状态切换后保持暂停；保留真实融合响应丢失→刷新→同UUID重试仅一次结算测试。fusion-quota-integration.cjs真实合成库存、卡池关闭/融卡开放、幂等及限额通过。截图winged-repaired-1440.png与390.png为合成环境。

workshop-live.js及official-card.js/css未改，完整文件哈希记录visual-repair-unchanged.json。没有连接生产、没有部署、没有真实业务写入；正式仍df9b20b。

## 字体补充

合入Work最新CSS中的Buzhi Rounded字体声明与标题/按钮/说明/数量规则，复用原assets/fonts/buzhi-rounded.woff2（2639152字节），未重复复制字体。没有覆盖先前背景路径、Logo路径及暂停伪元素等适配。1440/390真实浏览器document.fonts.load/check通过，标题computed fontFamily含Buzhi Rounded，无横向溢出；真实隔离融合及原UUID重试回归再次通过。正式卡面及live控制器哈希仍不变。仅开发整合，未部署生产。
