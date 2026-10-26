# 视觉适配 V4.2：最新工程事务所及首页

核对分支：`integration/buzhi2-safe-ui-20261027`。基准 blob：`foundation.js=3b15e13c0cfdc208e912c3cb1f2e733ee5449520`，`foundation.css=298e382da6257120c0d0ba0516af5e95a52f3bbe`。

本次确认工程事务所已改为 **吱吱值班**：`.office-world`、`.office-counter`、`.office-scene`、四个 `.office-station`，而不是旧版单一公告面板。四项分别为 **委托公告板**、**办结档案**、**海风点歌簿**、**肥啾临时委托**。保留 `#office-song-form`、`#office-song-feedback`、`name=bird-excuse`、`#office-bird-response` 和只演示不提交的安全提示。

V4.2 CSS 采用办公桌浅海湾舞台、手写便条、办结抽屉、点歌小纸条、肥啾选择纸签五种独立材质；首页继续沿用 V4.1 的吱吱生日书桌+双岛主抖音名片。

集成：在工程预览 `foundation.css` 后按顺序加 `engineering-organic-v3.css`、`engineering-art-v4-1.css`、`engineering-office-v4-2.css`。全部在设计分支 `docs/design/previews/buzhi2`；尚未接入工程分支，不能将 GitHub 源码页当成已渲染预览。待工程确认 DOM 版本后再挑选合并并运行浏览器检查 320/375/390/768/1440px。尚未安装正式角色立绘和场景分层插画；CSS 装饰不能冒充最终美术。

严禁更改 main、线上服务、账号金币、真实任务、卡片和交易数据。
