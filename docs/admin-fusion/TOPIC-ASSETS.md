# 吱吱生日素材管理｜工程契约与当前边界

纳入codex/admin-fusion-20261031；复用原db、ASSET_DIR、admin(req)和auditAdmin。默认不开启；只有隔离测试设置ENABLE_TOPIC_ASSETS=1才创建三张元数据表。生产迁移尚不授权，禁止启用或部署生产。

## 当前已实现
server/topic-assets.mjs：确认点位白名单、不可变hash文件、草稿元数据、活动revision乐观锁、完整发布映射快照、历史恢复、事务内审计。文件在原ASSET_DIR/topic-versions/；SQLite无文件BLOB。写失败至多留未引用hash文件，旧发布不变；不自动删除历史。共享文件按hash去重，映射以topic+slot独立，A/B要不同slot。actor当前共享管理员身份记admin，不能伪称有多管理员实名追踪。
- GET /api/admin/topic-assets[?topic=...]：点位、历史、revision及发布信息，原Bearer鉴权。
- POST /api/admin/topic-assets/draft：topic/slot/expectedRevision/text 或 base64/license。不是发布。
- POST /api/admin/topic-assets/publish：topic/expectedRevision/versions对象（slot:versionID），完整映射原子替换；或restoreRelease回退。
- GET /api/topic-assets?topic=...：仅公开已发布映射，no-store。
- GET /assets/topic-versions/<sha256>.webp或.wav：只提供被当前发布引用的文件，immutable缓存；草稿不公开。历史文件不删除，恢复发布后重新可读。
本阶段接受最多4MB WebP（容器检查，尚待实际解码验证）、PCM WAV（容器/格式段检查）和文本；未声称支持MP3、SVG、字体/模板上传。音频必填来源/授权说明；这是声明记录，不代表工程自动判定授权合法。

## 尚未完成，不能当已接入
点位registry当前[]，由Work实际源码清单填入server/topic-asset-slots.json；不会注册猜测点位。已向Work交付聊天要求页面/编号/用途/建议比例尺寸/默认文件/A或B/可替换/定位锚点等。
当前只有后台Work包，不含已确认电台/气象局/工坊前台消费代码，不能说它们已从服务端加载。后台上传表单、私有草稿二进制预览、桌面手机场景预览、点击定位、活动名称时间开关归档、启用状态、恢复缺失提示与页面最终消费仍待完成。与旧activity/feature-access规则不能混为一个开关。
UI模块应位于活动与内容→吱吱生日专题→素材管理；先取得点位再开放表单。未接通时提示不可用，不回落Mock。写前需要客户端确认及expectedRevision，不能绕过服务端校验。
后续应扩展旧素材历史机制的操作入口并复核共享文件、活动归档与公开授权，不覆盖菜菜旧专题。

## 验证
node tests/topic-assets.mjs：隔离内存SQLite与临时目录，文案草稿/发布隔离、A/B、冲突、映射错误拒绝、不可变历史、历史恢复、审计失败回滚及路径拒绝通过。
node tests/admin-v2-readonly.mjs：既有只读鉴权/新旧入口仍通过。
尚未对真实图片音频做完整上传-发布-前台缓存闭环，未远程部署、未生产改动。不能把上述单测当作专题功能验收。下一步取得点位，补充私有预览/图片解码校验、后台表单与真实页面消费，再隔离浏览器验证。

补充：曾正式发布过的hash文件继续可读取，以支持旧页面和历史版本；从未发布的草稿仍私有。原文‘只提供当前发布引用’以此条为准。

## Work消费交付已接收（覆盖空registry状态）
BZI-Asset-Handoff.zip SHA256=1274683e81b3c01c586fca18de054cafaa760b63b3f251d4d76dafeec5524138；Radio/Weather/Fusion三份ZIP已按source-archives.json逐个校验一致。39项完整点位原清单、schema与交付README保存在asset-handoff/。消费两文件保留在admin/integration/asset-consumer/，当前未放入前台路由或应用其patch，避免宣称三页已接入。
server/topic-asset-slots.json登记18个具体、已交付consumer-patch图片位；DEMO卡ID/模板位、首页外部负责人、商店未交付、公共代码原生、音频预留全部排除。状态仍是patch-received-not-page-integrated；本地模块默认关闭。
公开manifest补充Work消费者字段schemaVersion/version/slots，图片path=不可变hash地址、version=SHA256。发布媒体要求非空来源授权说明且authorized=true；此确认是运营者声明，不是自动法律核验。恢复旧发布沿用原确认。草稿文件仍私有，曾发布文件保留公开可读以支持旧页面。
新增tests/topic-assets-images.mjs使用仓库LOCK-50.webp只读副本在临时目录验证：草稿404、未授权发布拒绝、发布后bytes一致、hash契约正确、18点位无DEMO与未交付页。未修改或覆盖原卡图。文本/A-B/回退/审计与只读后台测试也通过。尚未做真实浏览器替换/缓存闭环，未上传服务器。
下一步应用Work patch到三份隔离源码副本，接入发布manifest桥接，增私有草稿预览和后台表单，分别做电台A/B、气象报告和融卡重绘浏览器验证；融合业务仍不可直接采用Mock库存。活动配置归档与文案管理、音频位置仍待实际消费支持。
