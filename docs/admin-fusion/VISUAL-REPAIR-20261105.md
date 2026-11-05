# 工坊视觉补丁整合（未上线）

来源：BZI-Fusion-Visual-Fix.zip，SHA256 2128a8a3c10fdda482aa16a5fd0035a34d8fe22f3a829f92b4fbd684fbadd049。仅合入workshop-visual-repair.css/js，并在真实fusion.html引入。没有引入preview.html、visual-fixture.js、包内旧live控制器或旧正式卡面文件。

适配：背景URL改用现有/ui-preview/assets路径；Logo直接引用已有/assets/island-mark.svg，移除重复内嵌base64。暂停选择器覆盖::before/::after，视觉层观察body状态类变化以保持用户暂停意图，不修改live控制器。卡册内滚动、背景fixed、托盘/页脚/Logo/仪式环/光点沿用交付补丁。

验证：winged-workshop-browser.cjs 1440/390通过，测卡册边界、固定背景、Logo加载、伪元素暂停、减少动态、状态切换后保持暂停；保留真实融合响应丢失→刷新→同UUID重试仅一次结算测试。fusion-quota-integration.cjs真实合成库存、卡池关闭/融卡开放、幂等及限额通过。截图winged-repaired-1440.png与390.png为合成环境。

workshop-live.js及official-card.js/css未改，完整文件哈希记录visual-repair-unchanged.json。没有连接生产、没有部署、没有真实业务写入；正式仍df9b20b。

## 字体补充

合入Work最新CSS中的Buzhi Rounded字体声明与标题/按钮/说明/数量规则，复用原assets/fonts/buzhi-rounded.woff2（2639152字节），未重复复制字体。没有覆盖先前背景路径、Logo路径及暂停伪元素等适配。1440/390真实浏览器document.fonts.load/check通过，标题computed fontFamily含Buzhi Rounded，无横向溢出；真实隔离融合及原UUID重试回归再次通过。正式卡面及live控制器哈希仍不变。仅开发整合，未部署生产。

## 暗化背景与羽翼装置更新

按Work本轮追加补丁，保留已有修复并追加背景brightness(.66)/saturate(.78)、奶白标题/深字面板与中央装置。新增assets/wing-ritual-device.svg，静态矢量通过原受控/assets SVG路由引用；去掉补丁中重复内嵌SVG数据，不增加fetch或业务逻辑。仅隐藏旧platform/machine-stand/device-halo/tracks，实际材料和结果节点仍由原live控制器处理。

1440/390真实浏览器确认SVG加载、旧底座display:none、背景亮度、字体加载、无横向溢出、卡册裁切、暂停伪元素与减少动态；原融合响应丢失/刷新/原UUID重试回归以及fusion-quota-integration再次通过。正式卡及live控制器哈希不变。截图已更新为本轮合成环境。未部署生产，未操作真实账号或资产。


## 最新补丁：直接融合与底座精简

已移除独立检查按钮，按钮继续受 busy、pending 与 valid() 控制；fuse() 提交前再次校验。只修改控制器按钮绑定和提示，没有整份覆盖 Work 的控制器。原 valid()、fuse() 文本逐字一致，见 direct-fusion-preservation.json。因此此前整文件哈希不再代表当前控制器；official-card.js/css 未改。

采用最新平滑承托 SVG，移除竖条及大菱形，隐藏 device-caption；加入柜体厚度、阴影、水母贴纸及前景薄雾。暂停状态保存在 documentElement，不受业务 render 重置 body class 影响，包含伪元素暂停与 reduced-motion 支持。保留本地背景、岛标和装置静态资源路径。

验证：node tests/winged-workshop-browser.cjs 在隔离 SQLite 中通过 1440/390 两个视口；一张材料禁用、两张有效材料可直接启动；服务端成功但响应丢失后刷新重试仅保留一次融合记录；动效暂停、减少动效和无横向溢出通过。node --check 两个修改脚本通过。截图为 winged-repaired-1440.png、winged-repaired-390.png。测试截图无卡面上传的合成环境不等于正式卡面缺失。

本轮未部署、未访问生产库。手机观测笺空间仍偏窄，后续视觉验收可继续调整，不属于本轮业务校验通过的保证。
