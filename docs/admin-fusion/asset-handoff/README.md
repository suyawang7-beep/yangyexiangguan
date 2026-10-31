# 吱吱生日专题 · 素材点位与视觉消费补丁

交接对象：后台融合工程 codex/admin-fusion-20261031。Work仅提供素材点位、视觉读取代码与源文件依据；API、模型、鉴权、上传、审核、发布、部署由工程主线独占。本包不修改生产，不覆盖真实adapter。

## 文件

- asset-slots.json：39个实际/预留/未交付点位。每项含页面、素材编号、用途、建议比例/尺寸、默认文件、模式、替换支持、交付状态、锚点、格式与4MiB大小建议；未实现的点位明确标注。
- source-archives.json：三份已交付前台ZIP的绝对路径、SHA256与完整性核对；ZIP内所有HTML/CSS/JS与冻结源码一致。
- consumer/bzi-asset-consumer.js / .css：纯视觉消费器，不发API请求，不修改登录/账户/评分/库存/播放。
- patches/visual-consumption.patch：5个HTML入口增加消费者加载，气象局weather.js增加1处PNG绘图素材读取钩子。已在原文件副本git apply --check通过。
- manifest.example.json / manifest.schema.json：供工程适配器输出配置；示例全关闭，未声称这些服务端素材槽已经注册。
- technical-test-report.png / technical-consumer-check.jpg：仅消费器技术验证图，使用自绘DEMO测试图，不是新的官方角色或视觉验收候选。

## 哪些前台源码确实存在

1. BZI-Radio-Work：index.html、collection.html、ticket.html；app/immersive/motion/pavilion/art-finish脚本及对应样式、material-polish.css；assets/sea-illustration-v1.webp。收藏室和留声票子页属于电台，不是本期暂停的独立北山雀投递局。A/B当前共用一张海景，B面用CSS灯光；正式OC/封套/标签均待授权。
2. BZI-Weather-Work：index.html、weather.css、weather.js、assets/cloud-observatory.webp。六种天气的插画原为sceneSVG代码，报告是Canvas；报告原先内嵌同一背景。
3. BZI-Fusion-Work：index.html、fusion.css、integration-finish.css、fusion.js、fusion-model.js、assets/atelier.webp；当前背景来源atelier-coastal-original.png。业务仍是Mock，不能直接覆盖工程接入逻辑。
4. 专题首页VIS-10：不是Work交付。外部首页工作树中存在archipelago-v4-reference.png及VIS-10截图，但本包没有首页源码消费补丁。不能把参考图当可直接替换的3D场景；需首页负责人给出对象/贴图点位。
5. 商店：Work未交付。外部首页树有ui-preview/buzhi2/shop.html，但未作为本包确认版审查或改写；商品ID、图槽与消费由商店负责人确认。
6. 花庭、独立投递局：暂停，未交付。公共品牌/羽翼/花鸟大多为文字、系统字体和代码纹样，没有可冒充官方的独立位图。

## 安装边界

先把三份源ZIP解压到独立接收目录，校验source-archives.json中的hash，使用git apply --check测试patch。不要直接在已接真实API的文件上强行套补丁。若文件路径或DOM已调整，按asset-slots.json锚点手工适配，不覆盖工程模型或adapter。

将consumer两个文件放每个被接入页面目录根部，再应用HTML加载补丁；加载顺序在原页面脚本之后。默认不提供manifest时，不发新请求、不改原画面。

工程负责从其真实已发布素材配置生成如下对象，再注入window.BZI_ASSET_MANIFEST（必须早于消费者脚本），或发布bzi:assets:update CustomEvent，detail为同样对象。也可调用BziAssetConsumer.apply(manifest)。消费者自己不fetch接口，不新增/假设任何后台路由、数据库字段或审批能力。

条目为 `{path, version, enabled, authorized, bytes?, alt?}`。路径仅允许同源assets/或/assets/下PNG/JPG/WebP，不允许外部URL、dataURL、SVG、路径穿越、音频。version追加为v查询参数，应由工程提供真实内容hash。只有enabled和authorized都为true且图片实际加载成功才替换；关闭、缺图、格式/路径不符或授权未确认时保留默认占位。授权位是工程审核结果，不是客户端自己宣称授权的安全依据。大小上限由工程上传服务真实执行，消费者只检查声明值。

新逻辑槽不等于已有ASSET_NAMES：旧服务器白名单、文件保存、数据库/配置关联、manifest哈希和发布时序必须由工程注册并验证。不得因为本JSON存在点位就显示“已上线”。

## 动态与导出

- 电台监听data-side变化，封套/中心标签/立绘分别读A/B配置，B未配置不会沿用A的角色图。播放逻辑不变；没有添加音频。留声票当前为代码绘制装饰，未承诺跟随页面封套替换。
- 气象局海景同时同步#report-backdrop，独立weather.report.background优先。weather.icon.*同步球内与报告插画；weather.js仅新增managedReportArt读取，题目/得分/天气映射未动。生成报告前仍由原逻辑等待decode。
- 融卡只监听DOM卡面重绘，以data-card/data-card-id或.card-id首段取ID。DEMO-ID不是正式卡号；工程输出正式ID与素材映射。不会改变材料、稀有度、库存、次数、抽取或结果揭晓时点。
- 首页、商店、公共标识等未确认消费点位不会被消费者处理；不会冒充已接入。

实际验证见verification.json。未执行后台上传/授权/发布/缓存CDN测试，未改生产或冻结源文件。
