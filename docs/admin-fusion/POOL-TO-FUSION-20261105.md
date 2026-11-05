# 卡池关闭，入口替换为融卡

经用户明确指示，正式pool独立开关已设enabled=false，保留原起止时间；office配置未变。修改前先通过原后台备份API创建manual-1793871925146-d239a8ea5a6c.sqlite，再通过带版本校验和审计的原v2配置API关闭pool。没有改金币、卡牌、概率、任务或融卡额度。

已发布63af4098fedd262bf56e200fa627188f79d9f998，307运行文件校验通过。前台读取实时pool开关，关闭时首页/桌面/手机卡池入口改为融卡工坊，draw.html展示默认展开的真实融卡组件，收藏区入口同步；查询状态失败不展示抽卡按钮。保留原卡册和记录。

390/1440px实际浏览器验证首页导航与draw页面通过；后端合成数据验证关闭pool后draw403，而真实融卡、库存、次数限制及幂等仍通过。专用腾讯云14177隔离环境回归与关卡池403通过；正式站只读确认pool paused、维护关闭，未进行真实用户融卡或领取。

新鲜备份：/var/backups/buzhi-production/login-63af409。异机：C:/Users/A/Backups/buzhi-production/login-63af409/backup.tar.gz，SHA256 33862d9e90db70bc1061cbfaa7c6cd344b74266c3fc0bc90fcb20e2c0eed32d3。恢复38表、181素材、308旧代码文件通过；启动前后原表及所有行一致，没有迁移。完整回执见同名JSON。旧版/opt/buzhi-production/releases/unified-5aedcba6bf0dff273a047bec41f4500a4c9052c3保留，回滚代码无需恢复或覆盖DB；应继续保持pool关闭。

后续0eb6834仅补测试及撤销未使用旧原型的临时修改，最终运行代码与发布63af409一致。部署脚本保存在本机releases/buzhi-pool-63af409，一次性固定基线不得原样重跑。
