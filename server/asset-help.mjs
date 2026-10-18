// These descriptions follow the actual artwork hosts in app.js and effects.js.
// Keep page names user-facing; card and OC identities come from their own editors.
const HELP = {
  'decor/home-background.webp': {
    label: '首页庆典首屏背景', pages: ['庆典码头（首页）'], region: '首页标题、按钮与主视觉所在的首屏区域',
    description: '铺在首页首屏内容后方，并叠加浅色渐变。只影响这一块庆典首屏，不是全站或整页背景；右侧人物主视觉使用另一份素材。',
    recommendation: '建议使用横向海岛、天空或庆典场景，文字与按钮所在位置保持简洁。背景会随容器裁切，可调整焦点与缩放。'
  },
  'decor/home-poster.webp': {
    label: '庆典共享主视觉', pages: ['庆典码头（首页）', '生日通行证', '岛民画廊'], region: '首页右侧插画、未领通行证时的右侧邀请插画，以及画廊未配置独立角色图时的占位插画',
    description: '这是一份共享插画：首页与通行证邀请区会同步变化。画廊中没有独立角色图的位置也会回退使用它；已上传菜菜、吱吱或其他 OC 独立图片的位置使用各自的角色图。不会替换访客的免费头像。',
    recommendation: '建议使用双人庆典主视觉或竖向插画，主体居中并留出边缘空间。若只想修改某位岛民，请编辑该 OC 的独立图片。'
  },
  'decor/island-map.webp': {
    label: '登岛导览地图', pages: ['登岛导览'], region: '六站导览中的固定地图画面',
    description: '替换导览地图内的整张底图；滚动或切换站点时，镜头仍按现有六站路线移动。不会替换特效体验中的浮岛场景，也不会修改路线与文字。',
    recommendation: '建议按 1200 × 1000 的地图画布安排海面、码头、事务所、邮局、收藏室和庆典位置；保持地标与现有路线相符。'
  },
  'decor/office-background.webp': {
    label: '岛民事务所内容背景', pages: ['岛民事务所'], region: '任务列表与右侧进度、金币账本共同所在的内容区域',
    description: '铺在任务和侧栏的后方，带浅色渐变；不影响页面上方公告栏标题。领取通行证后才会显示该任务内容区域。',
    recommendation: '建议使用低对比的公告板、纸张或岛屿环境图，让任务文字、进度与按钮清晰可读。'
  },
  'decor/checkin-background.webp': {
    label: '每日签到内容背景', pages: ['每日签到'], region: '七日签到面板与右侧七日纪念角共同所在的区域',
    description: '铺在签到内容和纪念角后方，带浅色渐变；不会改变签到日期、金币奖励或七日纪念规则。领取通行证后才会显示该区域。',
    recommendation: '建议使用浅色天空、日历纸张或柔和海岛场景，避免密集图案遮挡签到状态与按钮。'
  },
  'decor/post-office-background.webp': {
    label: '肥啾邮局抽卡区背景', pages: ['肥啾邮局'], region: '邮局抬头、开信舞台、金币与抽卡按钮所在的大块区域',
    description: '覆盖邮局的主要抽卡体验区域，带浅色渐变；不覆盖下方“信封里的小小宇宙”卡池预览。卡面图片、信封与送信动效分别由其他内容控制。',
    recommendation: '建议使用横向邮局或海边场景，舞台中心留白，保证卡片和金币、抽卡按钮易于辨认。'
  },
  'decor/collection-background.webp': {
    label: '收藏室统计条背景', pages: ['回忆收藏室'], region: '相册封面内显示收藏种数、卡片总数和“去邮局”入口的统计条',
    description: '只替换收藏统计条的背景，带浅色渐变。它不是收藏室整页背景，也不影响下方筛选栏、网格、扇形或圆环卡片展馆及开信记录。',
    recommendation: '建议使用横向、浅色、低对比纹理或装饰，给收藏数字和入口文字留足可读空间。'
  },
  'decor/mailbox-background.webp': {
    label: '岛主来信内容背景', pages: ['岛主信箱（岛主来信）'], region: '信件列表与右侧信件导航共同所在的区域',
    description: '铺在来信列表和侧边导航后方，带浅色渐变；不替换上方信件页标题，也不会修改公告标题、正文或发布时间。',
    recommendation: '建议使用信纸、海风或浅色邮政纹理，避免高对比图案影响长段来信的阅读。'
  }
};

function characterHelp(label) {
  return {
    label: `${label}独立角色图`, pages: ['岛民画廊'], region: `画廊中${label}对应的角色插画区域`,
    description: `替换${label}在岛民画廊里的独立图片。图片跟随该 OC，不影响其他岛民、首页共享主视觉、回忆卡面或通行证的免费头像。角色名、介绍与显示顺序请在 OC 管理中编辑。`,
    recommendation: '建议使用竖向立绘或角色插画，人物居中并保留头部与脚部空间；透明背景可用于突出角色。可按画廊效果调整裁切、焦点与缩放。'
  };
}
HELP['characters/caicai.webp'] = characterHelp('菜菜');
HELP['characters/zhizhi.webp'] = characterHelp('吱吱');

const CARD_IDS = ['UR-1', 'SSR-1', 'SSR-2', 'SR-1', 'SR-2', 'SR-3', 'SR-4', 'R-1', 'R-2', 'R-3', 'R-4', 'N-1', 'N-2', 'N-3', 'N-4', 'N-5'];
for (const [index, id] of CARD_IDS.entries()) {
  HELP[`cards/${id}.webp`] = {
    label: `${id} 回忆卡插画`, pages: ['肥啾邮局', '回忆收藏室'], region: '该张回忆卡的中央插画框',
    description: `替换 ${id} 对应卡片中央的插画。抽中结果、收藏列表、卡片详情及扇形／圆环展示共用同一张图${index < 8 ? '；邮局下方的卡池预览也使用它' : '；邮局下方目前只预览前八张卡，不包含这张卡'}。卡框、编号、稀有度和卡名仍由页面绘制，不需要画进图片；上传图片不会改变抽卡概率或持有记录。`,
    recommendation: '建议只上传插画，主体居中，四周适当留白。图片默认完整放入卡内插画框，可再调整适配方式、焦点与缩放。卡名、故事和关联角色请在卡片管理中编辑。'
  };
}

export function assetHelp(name) {
  const entry = HELP[name];
  if (entry) return { ...entry, pages: [...entry.pages] };
  if (/^oc\/oc-[A-Za-z0-9_-]{8,30}\.webp$/.test(String(name))) return characterHelp('该 OC');
  return {
    label: '图片素材', pages: [], region: '未配置说明的素材位置',
    description: '此素材尚无对应页面位置说明，请核对素材名称后再编辑。',
    recommendation: '上传前确认使用位置与预览效果。'
  };
}
