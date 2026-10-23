# 不吱岛 · 腾讯云 Lighthouse 迁移准备（暂不上线）

适用：腾讯云香港 Lighthouse / Ubuntu 24.04 / 2 核 2 GB。

## 仓库实测结构（main）

- 项目是 **Node.js 24** 原生 HTTP 服务，不是 Python / Flask。
- 入口：`server/index.mjs`，默认端口 `4178`。
- 必需环境变量：`ADMIN_TOKEN`（随机且至少 32 字符）。
- 默认 SQLite 数据路径在 Docker 配置里是 `/data/island.sqlite`，上传素材在数据库目录下 `assets/`。
- 主仓库 `.gitignore` 排除数据库和运行时文件，因此克隆仓库**不包含正式岛民数据**。
- GitHub 现有 `.github/workflows/core-flow.yml` 是测试流程，**不应未经检查就自动上线**。

## 阶段 A：只读验证（无需任何生产凭证）

在新服务器运行：

```bash
node --version || true
git ls-remote https://github.com/suyawang7-beep/yangyexiangguan.git HEAD
curl -I https://github.com
```

若 Node 缺失，后续按 Node.js 24 LTS 官方安装方法安装；不要仅因服务器自带 Python 3.12 就改用 Python 部署。

## 阶段 B：独立目录与用户（仅在确认方案后实施）

最终建议：

- 代码：`/opt/buzhi/app`
- 运行用户：`buzhi`（禁止交互登录）
- 数据库：`/var/lib/buzhi/island.sqlite`
- 用户上传素材：`/var/lib/buzhi/assets`
- 私密配置：`/etc/buzhi/buzhi.env`（仅管理员可读，存放 `ADMIN_TOKEN`，不写入 GitHub）
- systemd：参考 `buzhi.service`
- 反向代理：参考 `nginx.conf`

注意：示例中的 `/usr/bin/node` 必须与实际安装位置匹配。安装前检查 `command -v node`。生产环境不要在公网开放 4178，Nginx 反代本地回环接口。

## 阶段 C：迁移前必须满足

1. 记录 Railway 当前部署 SHA，确认正在使用的完整业务版本；检查未合并 PR。
2. 在 Railway 后台通过**一致性备份**方式导出 SQLite，而不是直接复制活跃数据库文件。
3. 连同所有实际上传素材和配置一起备份；记录大小、校验和，另存离线副本。
4. 在腾讯云使用隔离的测试数据库，验证账号恢复、签到、任务、金币、抽卡、图片、管理员后台。
5. 先设置域名、HTTPS 与证书自动续期，然后才允许真实用户登录。
6. 切换期间要防止 Railway 和腾讯云双写。执行最终备份、短暂只读/维护、校验导入，再切 DNS。
7. 监控内存和网络使用量；2 GB 内存有 Swap，但 Swap 不能替代足够的 RAM。
8. 建立异机备份和**恢复演练**。仅有快照、自动打包或者重启都不代表可恢复。

## 自动部署尚未启用

本分支**不包含自动连接新服务器的凭证和可执行的 GitHub Actions 发布工作流**。只有在目标机器已配置最小权限部署密钥、分支保护和数据备份之后，再启用部署。避免在此时用 GitHub 测试失败的提交覆盖线上服务。

## 安全

- 不将 SSH 私钥、管理员 token、数据库或 .env 提交到仓库。
- 云防火墙仅允许必要端口；SSH 建议只开放可信来源或使用腾讯云安全终端。
- 初次部署时禁用公开注册或至少限制访问，直到 HTTPS 配置完成。
- 旧 Railway 服务保留，直到数据迁移校验、用户验收和回滚方案完成。
