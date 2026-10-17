# 不吱岛正式网站与岛主管理后台部署

当前应用是 Node.js 24 + SQLite，不是纯静态网页。公开主页是 `/`，后台页面为 `/admin`。**没有连接托管平台、添加持久化磁盘、配置密钥并完成部署前，这两个地址都不是公网网址。**

## 推荐 Railway 部署步骤

1. 将 GitHub 仓库 `suyawang7-beep/yangyexiangguan` 的 `main` 分支连接到 Railway 项目，使用仓库根目录的 `Dockerfile` 构建。
2. 给服务添加**持久化 Volume**，挂载路径必须是 `/data`。SQLite 数据库写入 `/data/island.sqlite`，不要将数据库仅放在临时容器文件系统中。
3. 配置环境变量：`HOST=0.0.0.0`、`DB_PATH=/data/island.sqlite`、`NODE_ENV=production`、`ADMIN_TOKEN=<生成至少 32 字符的高强度随机密钥>`。`PORT` 由平台提供；服务默认 `4178`，如果平台没有自动端口探测，请显式设置 `PORT=4178`。
4. 启用平台 HTTPS 公开域名，确认 `/health` 返回 `{"ok":true}`；访问 `/` 查看粉丝主页，访问 `/admin` 登录后台。
5. 发布前完成密钥轮换策略、数据库备份、访问限流、管理后台审计、登录速率限制、错误监控与移动端实测。**这些安全加固未完成之前不要对公众开放真实活动。**

## 安全提示

- `ADMIN_TOKEN` 只能放在托管平台的私密环境变量中，不能写入 GitHub、HTML 或聊天记录。
- 现有 `/admin` 是管理员登录页面，本身可以被访问；写操作由服务器的管理员密钥保护。目前没有管理员账号体系或双因素验证。
- 本地 `localStorage` 演示账户不会自动转为正式在线账户。
- 没有正式角色素材时保留现有占位图。

## 本地开发（不是公网部署）

```bash
export ADMIN_TOKEN="$(openssl rand -hex 32)"
export DB_PATH=./data/island.sqlite
node server/index.mjs
```

网页地址：`http://127.0.0.1:4178/`；后台地址：`http://127.0.0.1:4178/admin`。在部署后将 `127.0.0.1:4178` 替换为真实 HTTPS 域名。
