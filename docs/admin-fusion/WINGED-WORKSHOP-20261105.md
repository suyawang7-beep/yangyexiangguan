# 正确的羽翼融卡工坊接入

纠正此前把旧海风融卡组件当作2.0工坊上线的问题。本版使用 C:/Users/A/Documents/Codex/2026-10-31/ready/outputs/BZI-Fusion-Work 的原HTML、四份CSS、atelier.webp海岸神殿背景，新增真实API适配workshop-live.js；原Mock fusion.js和fusion-model.js不复制、不上线。

正式入口fusion.html；pool关闭时导航指向该入口，原draw.html跳转该入口。已有collection中的旧折叠融卡保留兼容，并非本次主入口。卡池保持关闭，不修改任何业务概率、额度、金币、真实用户库存。

真实数据：catalog提供正式ID/卡名/稀有度/原画；assets-manifest提供版本与布局；me提供真实库存/认证/配额/历史；POST fuse沿用原服务端事务和幂等。预览仅检查材料，不请求结果。仅服务端确认后揭晓并使用返回profile更新。响应丢失时按用户ID存储原材料和UUID，刷新后仅允许重试同请求，不允许更换材料新建请求；失败已明确的4xx可重新选择，未知结果不能擅自清除。跳过动画不新增请求。

1.0 cardMarkup抽为official-card.js共享，原app与工坊共同使用；工坊卡牌原画放入原memory-card结构，CSS卡规则从原styles提取；300x425卡面在外托盘等比缩放，不给原画覆膜。静态页面引入共享渲染器，背景通过现有受控预览素材路由提供，不修改生产ASSET_DIR。

测试：winged-workshop-browser.cjs 1440/390实际场景、背景200、真实合成库存、同ID两张材料、预览无结果、服务端已提交但网络丢响应→刷新→原请求重试只有一条card_fusions、历史/结果均服务端来源、无DEMO ID、无模拟按钮、无页面横向溢出；closed-pool-browser、login-admin-browser、fusion-quota-integration均通过。截图为合成环境，部分卡图为本地未上传位；生产从正式ASSET_DIR消费，不能把该截图当作正式卡图齐备的证明。

Mock源码仅用于视觉溯源，不依赖其业务模型。真实用户融卡验收不执行；所有写入测试仅隔离合成数据。上线前按既有fresh backup/offhost restore流程，旧版保留回滚。

## 正式发布

已修正上线df9b20bd56cf94e7b61253a258e45ff4e631e6be，真实地址 https://buzhi.click/fusion.html ，原draw.html在卡池关闭时跳转。实际包316文件哈希通过；实际包桌面/手机端到端测试通过，隔离腾讯云14177通过。复查发现“跳过动画取最新历史而非本次返回卡”和“延迟揭晓期间切号”两项问题，已统一finishReveal闭包并在揭晓前复核账号，复查确认解决。

新鲜备份/var/backups/buzhi-production/winged-df9b20b；异机C:/Users/A/Backups/buzhi-production/winged-df9b20b/backup.tar.gz，SHA256 7738c17557549f76901b190760e18ca129f27aeb713013cdf6d64de5dc02d1f0，38表/181素材/308旧代码文件恢复校验通过。生产启动前后表结构及所有行一致，0迁移、0真实业务测试写入、未操作任何真实岛民融合。旧版/opt/buzhi-production/releases/unified-63af4098fedd262bf56e200fa627188f79d9f998保留，可停服保存最新数据后切回代码与原服务器env，禁止覆盖用户DB或清理历史。卡池仍保持关闭。

公网1440/390匿名浏览器验证：原Work神殿/海景、正式前6张卡图加载、60张目录、无JS错误。图片保存在本机visualizations/winged-production-1440.png和390.png。真正的已认证库存/融合写操作只在合成环境测试，不将匿名预览当作真实用户业务验收。
