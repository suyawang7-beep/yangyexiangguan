# 腾讯云生产信箱发布方案（待用户确认，尚未部署）

固定目标：`buzhi-production.service`，代码 `/opt/buzhi-production/current`，数据库 `/var/lib/buzhi-production/island.sqlite`，上传素材 `/var/lib/buzhi-production/assets`。旧迁移分支中的 `/opt/buzhi/app`、`/var/lib/buzhi` 与 `buzhi.service` 不适用。

## 本次发布内容

Node.js 24 + 原生 SQLite。包含后台 `/admin/island-mail`、寄送幂等保护、认证和归属隔离、领取事务、物品表 `island_items`、完整分页历史。首次启动自动建表，并从历史已领取的物品邮件补齐物品；只补物品，不补发金币。重复启动不重复入库。首页文件没有修改。

现场生产仍为 `3231d57`，因此本次发布包也包含 main 已有但尚未上生产的五题小测及关联清理修复（`3231d57..b5d73f6`），不是只把三份信箱文件覆盖到旧版。完整31脚本回归已覆盖这些累积变化。

2026-10-23 已用 `git ls-remote` 核实 GitHub main 为 `b5d73f659e2735e3ede51e3a2c927222f28aa399`。本地修复分支为 `codex/resident-inbox-fixes`。发布包 manifest 记录基线、分支、每个运行时文件 SHA-256 及包校验和；未提交状态会明确标记，不能把基线误称为修复版本。正式发布前再次核对 GitHub，以免覆盖期间新增代码。

本地提交全部代码后运行 `node tools/prepare-release.mjs test-results/release-final`，然后 `node tests/release-artifact.mjs test-results/release-final`，验证归档清单、逐文件哈希、无私密文件及独立临时数据库启动。生成器会保留已有归档、不静默覆盖；重复打包应换新目录。此过程不会连接生产服务器。

## 确认前允许的只读核对

用户已确认目标为 `ubuntu@43.132.221.214:22`，私钥位于本机 `C:\Users\A\.ssh\buzhi_codex`。用户通过腾讯云 Lighthouse 官方终端核验的 ED25519 指纹为 `SHA256:lXHf+qbOD3sYYDpx+pJB/2rdIdLzjgohOETgt7hu0vQ`；实际 SSH 握手返回相同指纹，已强制 ED25519 和 StrictHostKeyChecking。密钥经用户在本机 ssh-agent 安全解锁后，已经完成认证登录与只读巡检。

本机使用 `node tools/inspect-production.mjs`：运行前固定比对官方确认的指纹，按原始字节传递 `inspect-production.sh`（避免 PowerShell 管道追加 CRLF）。Windows 自带 ssh-keyscan 的默认 KEX 协商在本机报 unsupported KEX，实际 SSH 指定 `KexAlgorithms=curve25519-sha256` 正常。只读检查包括：

```bash
node --version
command -v node python3 tar sha256sum
systemctl show buzhi-production.service -p ActiveState -p User -p Group -p WorkingDirectory -p ExecStart -p EnvironmentFiles
readlink -f /opt/buzhi-production/current
stat /var/lib/buzhi-production/island.sqlite /var/lib/buzhi-production/assets
df -h /var/lib/buzhi-production /opt/buzhi-production /var/backups
```

不要输出 Environment / 私密配置正文。需要从已有受保护配置核实 DB_PATH、ASSET_DIR、HOST、PORT、ADMIN_TOKEN（只核对是否存在，不打印值）。检查反向代理和健康检查端口。只读检查不创建账号、不寄送、不领取、不调用带审计写入的后台导出/备份 API。

### 现场核对结果（北京时间2026-10-23约19:04）

- 主机 `VM-0-15-ubuntu`；Node `v24.22.1`；服务 `active/running`，运行用户 `buzhi-production`。
- 生产实际监听 `127.0.0.1:14179`，Nginx `buzhi.click` 转发到该端口；本机 `/health` 返回200。
- 代码版本 `3231d57e5f001cce37333da0bf9ee8a36a22d8b2`，健康响应头与运行环境一致；server/index.mjs、resident.html、admin/index.html 的 SHA-256 均与该 Git 提交内容吻合。首页哈希也与 main 的首页一致。
- WorkingDirectory、DB_PATH、ASSET_DIR 和 `/etc/buzhi-production.env` 均符合固定目标；配置与进程环境一致；管理密钥只验证长度，不输出内容。
- 数据库 WAL 模式，quick_check=ok，foreign_key_check=0；只读计数37个账号、336条金币流水；生产目前还没有 island_mail 或 island_items 表。
- 磁盘总50GB、已用7.3GB、剩余约40GB；数据库文件348160字节、属主 buzhi-production、0600；数据/素材目录0700、环境配置root:root 0600。
- `current` 是实体目录。stage 与旧 staging 仍运行，数据库分别为 `/var/lib/buzhi-stage/island.sqlite`、`/home/ubuntu/buzhi-staging/data/island.sqlite`，均与生产隔离。
- 现有两份归档位于 `/var/backups/buzhi-production/`，每份180个条目、一个数据库、136个素材文件；归档中的 SQLite 仅在内存读取，integrity_check 均为ok。最新备份修改时间为北京时间13:59，不能替代发布窗口的新备份。异机副本与完整恢复演练尚未验证。

| 现有归档 | 大小 | 只读计算的 SHA-256 |
|---|---:|---|
| final-1792734969845.tgz | 31684449 | f80b308d4e6c456f5aa67f586b5f4fa3684e7f7e8c3c6e2a5e7acdd0e148dc27 |
| import-20261023.tgz | 31698636 | d65b722e88aebec83b98d8789f7525e35c433a144c84f72e529ad5761b4cc0c5 |

## 备份方案

执行部署、停止或重启生产服务、首次启动新代码迁移数据库之前，必须先向用户提供修复版本、测试结果、备份目标、停机影响和回滚方式，并取得明确确认。

批准后的发布窗口：

1. 开启反向代理维护页或排空流量，确认无另一实例写同一数据库；停止服务。不要仅复制活跃 SQLite 主文件，WAL 中可能有尚未合并数据。
2. 停服后以运维权限运行 `bash backup-production.sh --approved-production`。脚本只接受已停止服务，使用 Python SQLite backup API 生成一致性快照，执行 integrity_check / foreign_key_check，并打包素材和当前代码。
3. 备份写入 `/var/backups/buzhi-production/<UTC时间>-<PID>/`，权限仅运维可读；校验 SHA256SUMS。私密配置单独从真实 EnvironmentFiles 路径离线备份，不能放进仓库或聊天。
4. 将备份加密转存到异机或对象存储，再校验 SHA-256。备份包含用户私密信息，应限制访问。
5. 在独立临时目录恢复备份副本，验证 SQLite 完整性、外键，以及 users / ledger / island_mail / island_items 数量（旧数据库可能还没有后两表）。只在副本启动新代码并核对物品补齐及金币总额保持原值；禁止用生产数据演练寄送、领取或注册。

## 发布与验证（仅批准后）

1. 在新目录 `/opt/buzhi-production/releases/<修复版本>/` 解压本地准备的运行时代码包。包不包含 `.git`、测试、私密配置、用户数据库或上传素材；保留仓库内静态素材。校验 package SHA-256 与 manifest 文件清单。
2. 服务已停且新备份与离线副本校验成功后，把实体 `current` 改名保存为 `/opt/buzhi-production/releases/pre-inbox-<时间>/`，再创建 `current` 符号链接指向新发布目录。不要覆盖旧目录，保留root属主与可读权限。此次转换在停机窗口完成；后续发布可用临时链接加 `mv -T` 切换。
3. **新代码一启动就会建表及回填物品，属于生产数据库变更。** 只有用户明确批准后才切换 current 并启动 `buzhi-production.service`。不替换现有 systemd 单元文件或部署旧迁移分支；保留全部配置，仅把 `/etc/buzhi-production.env` 的 `RAILWAY_GIT_COMMIT_SHA` 更新为已校验发布包的完整修复提交，确保响应头能反映真实新版本。此配置变更同样在批准范围内后才能执行。
4. 核对 `systemctl is-active`、本机实际端口 `/health`、公开页面、`/resident.html`、`/admin/island-mail`、静态脚本 MIME 和服务日志。不得使用真实岛民发信、领取或扣币验收；完整写入流程已经在隔离数据库验证。
5. 只读统计生产邮件、物品、金币流水，确认迁移没有增加金币；恢复流量并观察错误率。

## 回滚

服务启动失败或检查异常时保持维护窗口，停止新服务，切回保存的旧代码目录，同时把版本标记 `RAILWAY_GIT_COMMIT_SHA` 恢复为记录的旧值。新增表可保留，旧代码不会使用它们；优先仅回滚代码并保留已完成的业务记录。

若确需恢复数据库，必须再次说明会丢失快照之后的数据并取得明确确认；保持所有写入端停止，把当前数据库及 `-wal` / `-shm` 整体隔离留证，然后从已校验备份恢复主库、素材及原属主权限，再启动旧代码。禁止在活跃数据库上覆盖主文件、删除 WAL，或用旧快照覆盖用户新领取记录。

## 当前停止点

代码修复、自动化测试、生产只读巡检与发布材料准备完成。未部署、修改系统配置、停止或重启生产服务，未修改生产业务数据。当前等待用户对正式发布窗口的明确确认；确认前不执行新备份写入、目录切换、配置更新或数据库迁移。
