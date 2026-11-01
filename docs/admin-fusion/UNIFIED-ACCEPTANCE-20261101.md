# 1.0 → 2.0 真正融合验收清单（2026-11-01）

本轮候选在 `codex/admin-unified-20261101`，生产基线为 `11c9eee2178072d0960a376f0f809635cdb71a17`。本轮未部署、未重启生产、未改生产schema/数据。只读核实生产active、新后台200、版本仍为11c9eee。

## 实现与身份边界

`/admin/v2/` 外壳沿用Work设计；27项原页面能力计入原生总览，26个运营入口已在同一页面内逐项点击验证。保留原 `/admin` 为明确标注的应急入口，不再作为日常操作跳转。没有iframe、运行时eval、Function构造器、旧页面运行时抓取或Mock。

`tools/build-admin-operations.mjs` 在开发时提取仓库内原表单与已验证处理器，编译成 `admin/v2/operations.html/js`，移除旧登录、退出按钮和导航。通过作用域document与注入request/token getter挂接新版。`operation-requests.js` 维护版本与原返回形状，卡牌/活动/独立开关写入经过v2/config的事务内冲突校验和确认。生成来源哈希记录于operations-provenance.json，测试禁止源码变更后漏重新生成。Work的admin.css未覆盖。

只使用一次原管理员身份，令牌仅新版内存中保留；组件不建立账号或独立令牌存储。退出会移除所有运营DOM、清空密码框和弹窗，作废会话；适配器拒绝迟到响应。浏览器确认退出后operationsRemaining=0、credentialEmpty=true、dialogs=0。

## 功能/API/状态/测试对照

“浏览器入口通过”只表示当前候选实际表单及绑定可达，不能等同每种破坏性操作都执行了一遍。以下写入验证全部使用合成数据。

| 1.0能力 | 2.0模块/入口 | 原API或受控API | 当前状态与验证 |
|---|---|---|---|
| 概览/运营状态/待办 | 管理总览 | overview、v2/read-model、v2/status | 原生真实统计、待认证/找回/作品、独立开放状态、精确金币总量；接口隔离测试+浏览器通过 |
| 卡牌资料/稀有度 | 卡牌与卡池 | v2/config→原saveCard | 原生与迁入表单均可编辑；事务内版本冲突/审计/参数测试通过 |
| OC资料/隐藏/排序/关联 | 卡牌与卡池→OC | oc、v2/config | 表单迁入；content-flow验证写入/隐藏/排序/关联，浏览器通过 |
| 卡池/事务所开关 | 活动与内容及原相应表单 | v2/config→feature-access | 北京时区独立配置，其他入口不受影响；冲突与无效参数测试通过 |
| 总活动时间 | 活动与内容→总活动时间 | v2/config→activity | 表单迁入并版本保护；适配器返回/取消测试与浏览器入口通过 |
| 融卡历史/库存规则 | 融卡管理、岛民详情 | fusion/quotas、user、原api/fuse | 查询真实最近记录，未重写概率或库存；quota集成/原融卡兼容测试通过 |
| 次数补发 | 融卡管理 | fusion/grants GET/POST | 原生真实表单、原因/二次确认/UUID/事务/审计；3/3→3/5及两次真实融卡→超额409通过 |
| 岛民列表/查找/详情/流水 | 岛民管理 | users、islanders/find、user | 全部表单迁入；币小数与用户隔离API测试、浏览器通过 |
| 金币发放/历史 | 岛民管理→金币发放 | coins/preview、grant、history | 支持0.1；浏览器50+131.4=181.4，历史精确，幂等与审计原逻辑保留 |
| 认证申请审核 | 岛民管理→认证审核 | memberships、memberships/review | 表单迁入；membership-flow当前运行通过、入口通过 |
| 原账户找回/申请审核 | 岛民管理→查找与找回/账号找回审核 | islanders/reset-key、recovery/requests、review | 原真实核验/一次性凭证表单完整迁入；读入口及绑定通过；本轮未用浏览器实际重置密码 |
| 游客筛选/预览删除 | 岛民管理→游客管理 | visitors、preview-delete、delete | 原确认/预览令牌/备份机制保留；maintenance-flow+quota-relations合成删除通过 |
| 事务所任务管理 | 活动与内容→事务所 | feature-access、task-writings、quiz-results等 | 原有能力迁入，奖励规则不变；未虚构原来不存在的任意奖励编辑API |
| 任务/临时委托兑换码 | 活动与内容→兑换码/兑换统计 | codes、code-stats、coin-code-stats | 原生成/复制/统计组件迁入；131.4兑码规则与每人一次/40次上限HTTP测试通过 |
| 公告草稿/发布/删除 | 活动与内容→公告 | announcements、announcements/delete | 原表单迁入，浏览器保存合成草稿成功，同一会话未跳转 |
| 信箱金币/物品/历史 | 活动与内容→信箱 | island-mail、island-mail/send | 原表单、幂等寄送和历史翻页迁入；小数奖励并发领取一次/持久化/权限测试通过 |
| 留言回复/隐藏 | 活动与内容→留言 | messages、reply、moderate | 表单迁入；message-board-flow当前运行通过、入口通过 |
| 小测记录 | 活动与内容→默契小测 | quiz-results | 原筛选/记录组件迁入，浏览器读取通过；未重写答题规则 |
| 文字任务记录 | 活动与内容→文字任务 | task-writings | 原筛选/分页/记录组件迁入，浏览器读取通过 |
| 居民物语/作品审核 | 岛民管理→居民物语 | residents、residents/review | 原页面和审核绑定迁入；浏览器真实空/合成数据读取通过 |
| 素材上传/布局/恢复/检查 | 素材管理 | assets、upload、layout、versions、restore、assets-manifest | 原真实上传转换与历史组件迁入；定向测试新图前台字节/禁缓存/恢复通过，浏览器入口通过 |
| 后续专题素材 | 活动与内容提示 | 原topic-assets原型 | 未完成功能仍关闭，明确显示未接入；不冒充已可发布 |
| 审计/预览清除 | 记录与安全→审计 | audit、preview-clear、clear | 原表单与确认迁入；maintenance-flow合成范围清除/备份失败保护通过 |
| 备份/下载/导出 | 记录与安全→备份 | backups、backups/download、export | 原功能迁入；WAL快照、私有下载、导出无凭据、独立完整性测试通过 |
| 维护模式/视效 | 记录与安全 | site-maintenance、visual-settings | 原真实表单迁入，维护二次确认；浏览器读入口通过，本轮未变更生产开关 |
| 测试账号清理 | 记录与安全→测试记录清理 | test-cleanup | 原限制保留且排除融卡/补发记录；新回归从失败到通过 |

## 金币精度

`server/money.mjs` 逐行转换到整数十分币后累加，输出正常十进制数，不再SUM REAL后只格式化末尾；收入/支出均校验0.1精度、安全整数边界。历史表不重写，兼容SQLite INTEGER/REAL现有存储。流水、发放历史、邮件、导出也在读取时规范化二进制噪声。精度超过0.1的真实异常不会被静默四舍五入。

生产只读兼容汇总：ledger929行、admin_coin_grants36行、island_mail34行，unsupportedPrecision均0；未输出个体记录/凭据，未写生产库。该核对是当时快照，上线前必须重新核对。

## 融卡配额

新增一张append-only的fusion_quota_grants元数据表及user/day索引。每日基础3；补发按北京时间日期归属、次日失效。原api/fuse在原库存事务内读取总额度，原请求幂等优先，超额拒绝409。profile.fusionDaily返回base/used/extra/total/limit/remaining/resetAt/resetsAt/timezone。前台取消硬编码3上限，提供刷新次数按钮；实际浏览器余额181.4、配额3/5剩余2与后台一致。

补发POST限制1–100整数/次、真实对象、原因、confirmed及UUID；同请求不同内容409、同请求并发只写一次；审计失败回滚。共享管理员身份按原系统记admin，不虚构多管理员实名。未决请求在本页内存中跨模块/重新查询保留原UUID，取消确认不建立未决记录；整页刷新后需先查补发历史再决定新操作，不声称跨浏览器持久化请求队列。

原完整账号删除按预览处理新关联表，不提供“删除融卡历史恢复次数”；补发变更使旧删除预览409。导出/备份保留融卡与补发记录，自动测试清理排除这些账号。

## 验证与证据

最终定向命令：`node --test tests/money.mjs tests/island-mail-flow.mjs tests/operations-flow.mjs tests/maintenance-flow.mjs`，22/22通过。另8个独立定向脚本admin-v2-readonly、admin-v2-writes、fusion-quota、fusion-quota-integration、quota-relations、admin-v2-components、admin-v2-operation-requests、admin-v2-pending均通过。membership-flow/content-flow/message-board-flow各通过。没有运行31项整套回归。

真实浏览器：26运营入口逐一遍历，URL始终/admin/v2、仅一个登录框、无iframe、无控制台错误；公告草稿实际保存、131.4金币实际发放、3/3→3/5实际补发。退出后的凭据/DOM/弹窗清空通过。手机请求390px视口，应用面板实际CSS视口314px，页面scrollWidth302px，无横向溢出；不是声称完成所有真实手机硬件验收。

证据：unified-quota-browser.png、unified-mobile-browser.png、unified-resident-quota-browser.png。截图全为本地合成环境，不是生产用户数据。预览服务127.0.0.1:28406，独立临时DB/素材；远程旧测试服务未替换成本候选。

## 发布门槛与回滚准备

本轮未上线。发布前需主控室Go：核实生产仍基线或重新整合后续提交；制作全新的SQLite一致快照（backup API覆盖WAL内容）、素材、旧release与root保护配置；异机转存、逐项哈希和隔离恢复通过。沿用现有部署布局，不把素材包覆盖ASSET_DIR，不导入合成库。源码发布清单只包含运行文件，凭据/DB/测试fixture不得进入包。

此次启动会建立配额表，属于本轮待批准的生产schema变更；不能直接复用上一轮“无需迁移”的发布脚本。审批前只做候选打包。批准后先在隔离复制库演练加表和回滚，切链与重启前保留旧路径，验证新旧api数据一致、health、鉴权、精度和配额。业务写入只在隔离验收，生产仅做获批的具体操作。

回滚以代码/配置换回11c9eee为主，不覆盖上线后用户数据库；保留新增配额表及记录，禁止为回滚删历史。旧程序回滚后只理解基础3次，额外次数暂不生效，须通知运营并暂停补发；旧版游客删除也不理解新表，回滚期间禁用该清理操作。需要数据恢复时单独批准且明确新数据损失，不能自动用旧DB覆盖。

## 候选包与实际升级/回滚演练（补充最终状态）

候选运行提交：9efb9170c1a93974ee26898e7ba840c768387e20；包SHA256：36c8a249842f7edd023514c1b554c04a16e96c6f064376dfd84cd90ff3c1c804；305个运行文件哈希全部通过。包保存在本机visualizations/releases/buzhi-admin-unified-9efb917，manifest.json及SHA256SUMS同目录，包含完整runtime而非旧3064594包；不包含数据库、凭据或合成fixture。

新增可复现验收：`node tests/admin-unified-release.mjs <候选包目录>`。从Git11c9eee运行代码建立全新合成旧库，完成131.4兑换，再切换候选实际启动：逐表旧行完全相等，新增配额表为空；补发2次后limit=5、同请求只入一次；再切回旧代码启动同一合成库：coins=181.4、原账号可读取、配额记录保留，旧程序恢复基础limit=3。全过程仅本机临时目录，结束清理，未使用生产备份做业务写入。

该演练已完成；上节关于上线前演练的门槛已由本次合成升级/回滚满足。正式Go前仍须新鲜生产备份、异机恢复核验、当前版本冲突核对，以及明确批准加表/切链/重启。新生产备份未在本轮执行，因为还未获准发布，不将上一轮备份当作未来发布时的新鲜备份。

最终文档提交可能晚于候选运行提交，只增加测试/记录，不意味着生产或候选包已更新到文档提交。所有对外“已上线”说法仍只适用于11c9eee。
