# 不吱岛手绘素材与网页适配

日期：2026-10-20（北京时间）。用户选择上一轮清单的全部七项。

## 实现与边界

1. 十一个公开页面：两枚钢笔淡彩小物加一枚蜡笔庆典气球贴纸；正常文档流排版，不盖住按钮。
2. 岛主信箱：原创灯塔、邀请信和贝壳明信片。主题与日期用 DOM 文字，不烘焙进小字号图片。
3. 导览：事务所和邮局附近的曲线／圆圈引线，共用 `map-camera` 坐标；不替换已批准的干净群岛地图。
4. 纪念章：读取现有领证、签到、任务完成的页面状态；不写新的奖品、金币或资格记录。
5. 逐笔绘画：pencil-case 实际录制的 3.2 秒 MP4；进入可见区时最多自动播放一次，允许重播。关闭动效、系统减少动态效果、隐藏页签、离屏、加载失败均回到完成图。
6. 空状态：未领证、空收藏网格及实际显示的扇形展馆均有手绘信封／贝壳小景，保留原引导文字。
7. 蜡笔庆典角落：只在很小的气球／星星素材中保留颗粒；钢笔纸面 grain=0、fibers=0，不给地图或玻璃增加噪点。

旧矢量贴纸、液态背景、真实文字、人物、可下载纸质通行证、卡面与抽卡仪式保留。
新贴纸使用 `effects.js` 已有的可见性／动效开关／开卡黑幕生命周期。
网站运行不加载 Python、不访问外部素材服务，不增加第三方前端依赖。

## 来源与许可

使用 Qizhan7/pencil-case 提交 `9bb75d1` 的两个未修改绘图引擎：
`tools/pencil-case/penwash_lib.py`、`tools/pencil-case/crayon_lib.py`。
它们是 Python 素材绘制方法，不是网页动效库。浏览器交互是本项目适配代码。

Required Notice: pencil-case — hand-built drawing skills by 盏 & North. https://github.com/Qizhan7/pencil-case

版权 2026 Sienna Qi（戚盏），采用 **PolyForm Noncommercial 1.0.0**。
完整许可随网站发布在 `ui-preview/assets/pencil/LICENSE.txt`，页脚保留作者／工具署名与许可入口。
商业使用须事先取得权利人的书面许可；本轮不假定已经获得商业授权。

## 生成与测试

`python3 tools/build-pencil-assets.py`：需要 Pillow、numpy、ffmpeg；固定随机种子。
三件主题来自用户已批准的灯塔、生日来信与新增海滩，不复刻仓库示例构图。
输出七张 PNG 与一个 MP4，媒体文件合计约 148 KB（许可另计）。

验证命令：

```sh
node tests/pencil-assets.mjs
CHROMIUM_PATH=/usr/bin/chromium node tests/pencil-case.cjs
node tests/ambient-motion.cjs --liquid-only
CHROMIUM_PATH=/usr/bin/chromium node tests/production-layout.cjs
CHROMIUM_PATH=/usr/bin/chromium node tests/site-acceptance.cjs
```

`tests/pencil-assets.mjs` 使用临时 SQLite 服务核实 PNG、许可、视频 MIME 和 206／416 字节范围响应。
`tests/pencil-case.cjs` 检查十一页 1440／390／320 宽度、真实加载、按钮不被装饰拦截、动态来信去重、实际视频播放／停止、真实状态纪念章、手机明信片、可见空状态和离屏暂停。
`--empty-only`、`--stamp-only`、`--replay-only`、`--mobile-postcard-only` 是修复回归的独立短检查。
`UI_PREVIEW_CAPTURE_DIR` 可保存桌面／手机模拟视口截图；不宣称是真机验收。

本轮检查只操作本地演示存储或隔离测试库，不读写生产参与者记录。
正式 Railway 与 Pages 的部署版本、线上逐页证据另外核对，不能把本地通过当成已上线。
