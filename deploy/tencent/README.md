# 腾讯云生产信箱发布方案（待用户确认，尚未部署）

固定目标：`buzhi-production.service`，代码 `/opt/buzhi-production/current`，数据库 `/var/lib/buzhi-production/island.sqlite`，上传素材 `/var/lib/buzhi-production/assets`。旧迁移分支中的 `/opt/buzhi/app`、`/var/lib/buzhi` 与 `buzhi.service` 不适用。

## 本次发布内容

Node.js 24 + 原生 SQLite。包含后台 `/admin/island-mail`、寄送幂等保护、认证和归属隔离、领取事务、物品表 `island_items`、完整分页历史。首次启动自动建表，并从历史已领取的物品邮件补齐物品；只补物品，不补发金币。重复启动不重复入库。首页文件没有修改。

2026-10-23 已用 `git ls-remote` 核实 GitHub main 为 `b5d73f659e2735e3ede51e3a2c927222f28aa399`。本地修复分支为 `codex/resident-inbox-fixes`。发布包 manifest 记录基线、分支、每个运行时文件 SHA-256 及包校验和；未提交状态会明确标记，不能把基线误称为修复版本。正式发布前再次核对 GitHub，以免覆盖期间新增代码。

## 确认前允许的只读核对

用户已确认目标为 `ubuntu@43.132.221.214:22`，私钥位于本机 `C:\Users\A\.ssh\buzhi_codex`。用户通过腾讯云 Lighthouse 官方终端核验的 ED25519 指纹为 `SHA256:lXHf+qbOD3sYYDpx+pJB/2rdIdLzjgohOETgt7hu0vQ`；实际 SSH 握手返回相同指纹，已强制 ED25519 和 StrictHostKeyChecking。服务器接受公钥，但本机私钥已加密且当前没有 ssh-agent，尚未完成认证登录，不能把下面的路径和状态当作已实测。环境文件由用户指定为 `/etc/buzhi-production.env`。

解锁密钥后可用本目录 `inspect-production.sh` 通过 SSH 标准输入执行只读核对；Windows 自带 ssh-keyscan 的默认 KEX 协商在本机报 unsupported KEX，实际 SSH 指定 `KexAlgorithms=curve25519-sha256` 可以成功校验主机身份。只读检查包括：

```bash
node --version
command -v node python3 tar sha256sum
systemctl show buzhi-production.service -p ActiveState -p User -p Group -p WorkingDirectory -p ExecStart -p EnvironmentFiles
readlink -f /opt/buzhi-production/current
stat /var/lib/buzhi-production/island.sqlite /var/lib/buzhi-production/assets
df -h /var/lib/buzhi-production /opt/buzhi-production /var/backups
```

不要输出 Environment / 私密配置正文。需要从已有受保护配置核实 DB_PATH、ASSET_DIR、HOST、PORT、ADMIN_TOKEN（只核对是否存在，不打印值）。检查反向代理和健康检查端口。只读检查不创建账号、不寄送、不领取、不调用带审计写入的后台导出/备份 API。

## 备份方案

执行部署、停止或重启生产服务、首次启动新代码迁移数据库之前，必须先向用户提供修复版本、测试结果、备份目标、停机影响和回滚方式，并取得明确确认。

批准后的发布窗口：

1. 开启反向代理维护页或排空流量，确认无另一实例写同一数据库；停止服务。不要仅复制活跃 SQLite 主文件，WAL 中可能有尚未合并数据。
2. 停服后运行本目录 `backup-production.sh --approved-production`。脚本只接受已停止服务，使用 Python SQLite backup API 生成一致性快照，执行 integrity_check / foreign_key_check，并打包素材和当前代码。
3. 备份写入 `/var/backups/buzhi-production/<UTC时间>-<PID>/`，权限仅运维可读；校验 SHA256SUMS。私密配置单独从真实 EnvironmentFiles 路径离线备份，不能放进仓库或聊天。
4. 将备份加密转存到异机或对象存储，再校验 SHA-256。备份包含用户私密信息，应限制访问。
5. 在独立临时目录恢复备份副本，验证 SQLite 完整性、外键，以及 users / ledger / island_mail / island_items 数量（旧数据库可能还没有后两表）。只在副本启动新代码并核对物品补齐及金币总额保持原值；禁止用生产数据演练寄送、领取或注册。

## 发布与验证（仅批准后）

1. 在新目录 `/opt/buzhi-production/releases/<修复版本>/` 解压本地准备的运行时代码包。包不包含 `.git`、测试、私密配置、用户数据库或上传素材；保留仓库内静态素材。校验 package SHA-256 与 manifest 文件清单。
2. 核对服务确实使用上述持久化路径，不重写 ADMIN_TOKEN；记录 current 原路径。若 current 是符号链接，使用同文件系统临时链接加 `mv -T` 原子切换。若它是实体目录，先另定目录切换步骤，禁止直接覆盖。
3. **新代码一启动就会建表及回填物品，属于生产数据库变更。** 只有用户明确批准后才切换 current 并启动 `buzhi-production.service`。不替换现有 systemd 单元文件或部署旧迁移分支。
4. 核对 `systemctl is-active`、本机实际端口 `/health`、公开页面、`/resident.html`、`/admin/island-mail`、静态脚本 MIME 和服务日志。不得使用真实岛民发信、领取或扣币验收；完整写入流程已经在隔离数据库验证。
5. 只读统计生产邮件、物品、金币流水，确认迁移没有增加金币；恢复流量并观察错误率。

## 回滚

服务启动失败或检查异常时保持维护窗口，停止新服务，切回记录的旧代码版本。此次迁移仅新增表及物品记录，旧代码可继续使用原邮件表；优先仅回滚代码并保留已完成的业务记录。

若确需恢复数据库，必须再次说明会丢失快照之后的数据并取得明确确认；保持所有写入端停止，把当前数据库及 `-wal` / `-shm` 整体隔离留证，然后从已校验备份恢复主库、素材及原属主权限，再启动旧代码。禁止在活跃数据库上覆盖主文件、删除 WAL，或用旧快照覆盖用户新领取记录。

## 当前停止点

本次仅在本地开发、测试和准备发布材料；SSH 握手已验证主机指纹，但没有认证登录或执行远端命令，没有连接或修改生产数据库，没有停止、重启或部署生产服务。主机运行配置和异机备份条件的现场验证尚待本机密钥解锁。
