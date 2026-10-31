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
