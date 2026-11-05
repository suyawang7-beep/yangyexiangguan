# 长期运营首版工程交付

分支 codex/admin-unified-20261101。未部署，未连接或修改生产数据库。以本地融合工程为基础，生产/远端基线本轮尚未重新核验，不具备发布结论。

## 启用边界

新增 LONG_TERM_OPERATIONS=1 显式开关，默认关闭。仅在隔离服务启用后初始化新增委托、称号表并将 /office.html 指向真实 commissions.html。原后台和既有服务继续保留。没有迁移、删除或回写历史金币、账户、卡牌、OC和任务记录。发布前必须完成生产备份、隔离恢复和新旧奖励切换验收。

## 实现覆盖

|需求|模块/API|状态/验证|
|---|---|---|
|金币十分之一|既有 server/money.mjs|复用，131.4×40、扣50、0.1+0.2精度测试及兑换码回归通过|
|配额来源|fusion-quota.mjs daily/claimTask|基础3、任务/管理员来源独立、跨日、回滚、防重复；管理员仍经过邮箱|
|每日签到|POST /api/checkin|长期模式只记录签到，主动领取委托后+1，不发金币|
|默契试炼|原 /api/quiz 与 submit|五题至少3分；长期模式不发金币，领取后+1；旧模式回归通过|
|观察日记|POST /api/commissions/diary|30字至2000字、北京自然周一次、规范化内容去重，主动领取+1|
|创作奖励|GET /api/commissions、POST claim|真实作品审核；每周一次+2；同一作品不能跨周重复使用，审核后编辑需重新审核|
|探索|委托列表|明确不可领取；尚无真实互动完成验证，不用点击代替|
|特别委托|/api/admin/commissions、configure、review；/api/commissions/special、claim|名称描述、起止、奖励1或2、一次/自然周、草稿启停归档、审核版本保护、驳回重投；参与条件目前仅已认证岛民，未支持任意自定义人群|
|免审核特别委托|配置可保存|没有可信完成验证器时禁止提交发奖，不伪造已接入|
|称号|/api/titles、sync、equip；/api/admin/titles、configure、change|初始六项、真实进度、自定义规则与版本、授予撤销幂等及审计、单佩戴或不佩戴；不触碰OC职业|
|v2原生管理|admin/v2/commission-management.js、title-management.js|原控制台内存鉴权与导航，不使用iframe或跳旧后台；手机/桌面实际加载通过|
|旧生日领奖退场|旧 writing/redeem/codes 在长期模式返回410|保留历史；既有金币兑换码仍沿用原规则，本轮不变更金额|

称号进度：登岛计原签到不同天数；默契/日记/探索/特别委托按新领取记录累计；创作按目前有效审核通过的不同作品。不会凭旧模糊任务记录补算新成就。解锁由岛民点击“检查成就解锁”，未声称已在所有个人中心/画廊自动展示。撤销会抑制自动重授，重新授予需管理员操作。

## 定向测试

- node --test tests/commissions-http.mjs tests/commissions.mjs tests/resident-titles.mjs tests/fusion-task-quota.mjs tests/money.mjs：6项通过。
- node tests/quiz-flow.cjs：既有题库、旧奖励、移动/桌面交互回归通过。
- node tests/commission-coin-code.cjs：131.4兑换、重复拒绝、历史保留通过。
- node tests/fusion-quota-integration.cjs：旧材料、事务、幂等、历史通过。
- HTTP使用独立临时SQLite、合成认证账号，Playwright 390/1440实际浏览器；截图 commissions-*.png、titles-admin-*.png、commissions-admin-*.png。

没有重跑31项完整回归。新模块尚缺多进程并发领奖压力用例、后台表单完整填写提交的浏览器用例（HTTP接口已验证），以及生产同版本隔离部署与恢复演练。尚未对全部1.0功能重新逐项验收，不宣称全站最终完成。

## 下一项

1. 补齐并发领取、同日新旧模式切换、后台规则修改及重新审核边界。
2. 将称号展示接到个人中心真实信息区；完善移动端折叠信息组织（当前为功能首版）。
3. 对接电台/气象局真实完成事件，再启用探索奖励；支持更多特别委托参与条件。
4. 核对远端/生产版本，隔离部署，备份恢复和发布清单；单独等待Go/No-Go。
