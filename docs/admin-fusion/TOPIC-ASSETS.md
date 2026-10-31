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
