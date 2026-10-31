# 海岛控制台融合接手与文件边界（2026-10-31）

分支 codex/admin-fusion-20261031，独立worktree buzhi-admin-fusion-20261031/yangyexiangguan，起点经git ls-remote核实main=59be3efec4b38718a6245bf7aa39a533de08a7fe。未复制主目录未提交改动。

## 实际接入
GET /api/admin/v2/read-model 复用原Bearer管理员鉴权和overview/getCards/listUsers/adminAudit。schemaVersion=1；overview是真实统计；residents/audit明确limit=100与scope=latest，不能把长度当总数。未实现的统计显示数据暂不可用。无新管理员、数据库或迁移，无新增写API。POST被拒绝。capabilities.writes/fusion=false描述本阶段能力。
GET /admin/v2/ 仅当index.html/admin.css/admin.js/model.js/adapter.js完整交付才提供入口；当前返回503及缺失文件清单，不渲染假控制台。旧/admin保留。
GET /admin/v2/readonly-client.js 可供Work adapter调用：createReadonlyAdminClient({getToken}).load({signal})。getToken由现有登录UI提供；不存储token、不放URL、不建立第二套身份。失败抛错，UI必须展示不可用；不得转Mock。非200不回显服务端任意敏感响应。

## 缺失与阻塞
以上五个控制台候选源码在主仓库、Downloads及本聊天visualizations目录的定向搜索未找到。请主控室提供完整交付包/路径，不按截图重建。
生产SSH已尝试StrictHostKeyChecking=yes与原指定私钥，返回Permission denied(publickey,password)，未登录；请求用户安全加载agent。生产实际版本、表结构、服务、素材路径、备份和stage隔离均未现场确认，不推断为正常。
main没有/api/fuse；另一个主目录脏工作树有融卡代码，不属于已确认main，也不能当生产支持。须取得其已提交来源并核对生产，未接库存或改概率。

## 文件所有权
工程楼独占server/**、admin/integration/**、admin/v2/adapter.js、model.js及API/鉴权/部署/测试。Work交付admin/v2/admin.css、视觉资源和UI补丁；admin.js/index.html涉及事件或模型接口时只提交补丁，由工程楼审查合入。CLI/DeepSeek的3D首页与导览文件不动。任何完整Mock目录不能直接覆盖已接API目录。
Work读模型见上；本阶段不应调用写接口。下一阶段每个写操作逐项设计expectedVersion、审计、确认及冲突测试，不能仅靠前端确认声称安全。

## 本地验收
node tests/admin-v2-readonly.mjs：自动分配回环端口；独立系统临时目录DB/素材、随机端口及仅测试token；无生产路径。验证缺失/错误token=403、真实空库0用户非Mock、卡牌查询、no-store、旧后台200、新后台源码缺失503、适配器静态可读、写方法404、旧总览一致。退出后停止子进程并清理该测试目录。
未做真实UI/写入上传/融卡/生产回归，不声称后台融合完成。

## 隔离服务器计划（尚未执行）
恢复SSH后先只读读取systemd实际WorkingDirectory/ExecStart、脱敏环境路径与服务端sha，禁打印env值和用户记录；核验stage独立User/端口/DB_PATH/ASSET_DIR并检查realpath无生产目录及符号链接。只用合成测试数据与单独测试管理员，回环绑定或既有认证代理。隔离条件未确认前不上传部署。现无测试环境地址。

## 备份及发布门槛（尚未执行）
生产DB在线备份使用SQLite backup API获得一致快照（不要单拷运行中的主文件或孤立WAL）；如需原始取证包，需一致冻结机制覆盖DB/WAL/SHM。素材和当前代码单独归档、SHA256清单、配置加密备份、异机转存后核验；恢复到隔离目录检查integrity_check及关键合成业务。具体停机/快照策略须现场确认。正式数据库迁移、代码替换及服务重启均等待Go/No-Go；本阶段无此授权。

## Work包接收与SSH恢复（覆盖上文缺失状态）
已接收本机BZI-Admin-Work.zip，SHA256 c679776774687f262c7b419d70ef91fffde09f1ae6f16dd1fb50346a6277f0a2；解压31文件，五件齐全。完整原件归档.local/admin-work-received/，不提交和提供为运行文件。admin/v2保留原HTML外壳与原CSS；移除Mock登录、硬编码统计、虚构流水及模拟写操作，模型/适配器/脚本改为真实只读。原始样例数据仍只在归档，不作为运营数据。样式继续由Work负责，业务脚本归工程楼。
已在回环28402、独立临时DB/素材、合成管理员环境启动只读测试；API定向测试通过，浏览器已登录看到真实空库0统计。无真实用户或生产凭据进入浏览器。
SSH现已恢复，只读核实：VM-0-15-ubuntu；production active，健康200；current指向releases/unified-91c6dcf3b44450e76230a8033b9c91f9b3490620，进程版本标识相同。原始server/index.mjs SHA256 ce355124e1a63446bfe6ee96cb4654d04100581c19bea11dac1a89df9099cbd6，下载只读副本规范化CRLF后与本地91c6dcf提交完全相等（规范化SHA256 ab0ed70ef2b8ca9e80ffcf8e3a75f7c735c6d4e8732dff4983b23afa69097127）。不是全运行文件校验。
生产确有/api/fuse与feature-access，数据库有card_fusions和feature_access；PRAGMA user_version=0，不能据此称无迁移。生产DB/素材进程路径符合历史约定，服务用户buzhi-production，回环14179；备份目录17项，仅确认存在未验证可恢复性。只读取schema，未输出用户记录。
stage active，buzhi-stage用户，回环14178，DB=/var/lib/buzhi-stage/island.sqlite，素材=/var/lib/buzhi-stage/assets，与生产realpath不同；旧staging active以root运行，DB=/home/ubuntu/buzhi-staging/data/island.sqlite，未选用。stage是否有其他工作占用、全部符号链接与权限隔离仍需核实，未部署。
重要：生产高于GitHub main，需要先纳入已提交91c6dcf的增量以免回退现有60卡/融卡/独立活动入口，再测试本次改动。不得直接以59be3ef为最终发布包。全程未改生产、未重启。
