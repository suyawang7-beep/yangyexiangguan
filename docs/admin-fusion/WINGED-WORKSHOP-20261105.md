# 正确的羽翼融卡工坊接入

纠正此前把旧海风融卡组件当作2.0工坊上线的问题。本版使用 C:/Users/A/Documents/Codex/2026-10-31/ready/outputs/BZI-Fusion-Work 的原HTML、四份CSS、atelier.webp海岸神殿背景，新增真实API适配workshop-live.js；原Mock fusion.js和fusion-model.js不复制、不上线。

正式入口fusion.html；pool关闭时导航指向该入口，原draw.html跳转该入口。已有collection中的旧折叠融卡保留兼容，并非本次主入口。卡池保持关闭，不修改任何业务概率、额度、金币、真实用户库存。

真实数据：catalog提供正式ID/卡名/稀有度/原画；assets-manifest提供版本与布局；me提供真实库存/认证/配额/历史；POST fuse沿用原服务端事务和幂等。预览仅检查材料，不请求结果。仅服务端确认后揭晓并使用返回profile更新。响应丢失时按用户ID存储原材料和UUID，刷新后仅允许重试同请求，不允许更换材料新建请求；失败已明确的4xx可重新选择，未知结果不能擅自清除。跳过动画不新增请求。

1.0 cardMarkup抽为official-card.js共享，原app与工坊共同使用；工坊卡牌原画放入原memory-card结构，CSS卡规则从原styles提取；300x425卡面在外托盘等比缩放，不给原画覆膜。静态页面引入共享渲染器，背景通过现有受控预览素材路由提供，不修改生产ASSET_DIR。

测试：winged-workshop-browser.cjs 1440/390实际场景、背景200、真实合成库存、同ID两张材料、预览无结果、服务端已提交但网络丢响应→刷新→原请求重试只有一条card_fusions、历史/结果均服务端来源、无DEMO ID、无模拟按钮、无页面横向溢出；closed-pool-browser、login-admin-browser、fusion-quota-integration均通过。截图为合成环境，部分卡图为本地未上传位；生产从正式ASSET_DIR消费，不能把该截图当作正式卡图齐备的证明。

Mock源码仅用于视觉溯源，不依赖其业务模型。真实用户融卡验收不执行；所有写入测试仅隔离合成数据。上线前按既有fresh backup/offhost restore流程，旧版保留回滚。
