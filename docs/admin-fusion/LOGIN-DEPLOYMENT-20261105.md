# 登录及后台精简发布

用户“上线”明确批准后，已部署5aedcba6bf0dff273a047bec41f4500a4c9052c3。线上健康200、版本头正确；公网app.js含登录方式选择与持久失败反馈，新后台按需展开代码已同步。后台 https://buzhi.click/admin/v2/ 。

实际包307个运行文件哈希通过，SHA256：`2413ae5198d0bdaa95e10c9abc850f56f072e8712e836ba03f442bf53c560e55`。实际包隔离测试通过390/1440px登录与后台展开、复制编号、精确密码与恢复模式；腾讯云专用14177隔离环境密码/恢复/禁混用、原邮件与群发回归通过。没有重新跑31项全量测试。

生产一致性备份：`/var/backups/buzhi-production/login-5aedcba`；异机包：`C:/Users/A/Backups/buzhi-production/login-5aedcba/backup.tar.gz`，SHA256：`2336936fa509575ce7eed8ae358b8f705f140dcb8db78b072278d1797fe0adb9`。异机实际恢复38表、181个素材文件、308个旧版代码文件，integrity_check=ok，foreign_key_check=0。env仅留服务器root0600，未异机导出凭据。

启动前后现有38表结构及全部行指纹一致，无新增表，无迁移，未重置真实密码、未登录真实用户、未发奖励或群发。维护仍关闭，前后端卡牌一致，未登录管理员接口403，已退休直接发放410。三个个案具体失败原因未确证，不将合成验证当作真实凭据验证。

旧版保留在`/opt/buzhi-production/releases/unified-4c760dc2fcada201a4053cf7f6009e2fd81c4987`。需回滚时先备份故障时最新数据，停止服务，原子切回旧发布目录，恢复本次服务器备份中的原env后启动并验证；不得覆盖生产DB或素材。此版本无结构变化，旧版兼容原数据。执行脚本、完整清单和回执保留于本机releases/buzhi-login-5aedcba；下次不可直接复用旧基线脚本或覆盖已有备份目录。
