// These descriptions follow the actual artwork hosts in app.js and effects.js.
// Keep page names user-facing; card and OC identities come from their own editors.
const HELP = {
  'decor/home-background.webp': {
    label: '首页庆典首屏背景', pages: ['庆典码头（首页）'], region: '首页标题、按钮与主视觉所在的首屏区域',
    description: '当前正式首页采用液态玻璃海蓝背景，此上传图片已暂时停用，不会在首页显示。素材会保留以便未来切换回图片模式。右侧人物立绘由共享主视觉素材管理。',
    recommendation: '当前是预留素材位，无需上传；只有未来重新启用图片背景模式时才会生效。'
  },
  'decor/home-poster.webp': {
    label: '庆典共享主视觉', pages: ['庆典码头（首页）', '生日通行证', '岛民画廊'], region: '首页右侧插画、未领通行证时的右侧邀请插画，以及画廊未配置独立角色图时的占位插画',
    description: '这是一份共享插画：首页与通行证邀请区会同步变化。画廊中没有独立角色图的位置也会回退使用它；已上传菜菜、吱吱或其他 OC 独立图片的位置使用各自的角色图。不会替换访客的免费头像。',
    recommendation: '建议使用双人庆典主视觉或竖向插画，主体居中并留出边缘空间。若只想修改某位岛民，请编辑该 OC 的独立图片。'
  },
  'decor/island-map.webp': {
    label: '登岛导览地图', pages: ['登岛导览'], region: '六站导览中的固定地图画面',
    description: '默认展示已确认的低饱和群岛图；上传后覆盖整张地图。五个功能地点都在主岛，点选地点时轻移镜头，小屏可横向浏览。不会替换特效体验中的浮岛，也不会修改功能入口。',
    recommendation: '按 1584 × 993 画布对齐主岛地标：码头 (580,755)、事务所 (855,510)、邮局 (500,568)、收藏室 (855,638)、庆典广场 (675,612)。保留群岛、海面和开放港口，不在航道上加围墙。'
  },
  'decor/office-background.webp': {
    label: '岛民事务所内容背景', pages: ['岛民事务所'], region: '任务列表与右侧进度、金币账本共同所在的内容区域',
    description: '在任务和侧栏后方以低透明度、柔化的独立底层显示，与全站液态玻璃融合；不降低任务文字透明度，不影响上方标题。领取通行证后才显示任务内容区。',
    recommendation: '建议使用低对比的公告板、纸张或岛屿环境图，让任务文字、进度与按钮清晰可读。'
  },
  'decor/checkin-background.webp': {
    label: '每日签到内容背景', pages: ['每日签到'], region: '七日签到面板与右侧七日纪念角共同所在的区域',
    description: '在签到内容和纪念角后方以低透明度柔化底层显示，前景采用液态玻璃；不会改变签到日期、金币奖励或七日纪念规则。领取通行证后才显示该区域。',
    recommendation: '建议使用浅色天空、日历纸张或柔和海岛场景，避免密集图案遮挡签到状态与按钮。'
  },
  'decor/post-office-background.webp': {
    label: '肥啾邮局抽卡区背景', pages: ['肥啾邮局'], region: '邮局抬头、开信舞台、金币与抽卡按钮所在的大块区域',
    description: '在邮局主要体验区后方以低透明度柔化底层显示，与液态玻璃融合；不覆盖下方卡池预览。卡面和送信动效独立，抽卡时仍切换为黑幕。',
    recommendation: '建议使用横向邮局或海边场景，舞台中心留白，保证卡片和金币、抽卡按钮易于辨认。'
  },
  'decor/collection-background.webp': {
    label: '收藏室统计条背景', pages: ['回忆收藏室'], region: '相册封面内显示收藏种数、卡片总数和“去邮局”入口的统计条',
    description: '仅在收藏统计条内作为低透明度柔化底层，整页采用共享液态玻璃。不会替换卡片本体，也不改变筛选、展馆或开信记录。',
    recommendation: '建议使用横向、浅色、低对比纹理或装饰，给收藏数字和入口文字留足可读空间。'
  },
  'decor/mailbox-background.webp': {
    label: '岛主来信内容背景', pages: ['岛主信箱（岛主来信）'], region: '信件列表与右侧信件导航共同所在的区域',
    description: '在来信列表和侧边导航后方以低透明度柔化底层显示，前景统一为液态玻璃；不修改上方标题、公告正文或发布时间，也不替换留言内容。',
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

const CARD_IDS = [
  'UR-1', ...Array.from({length:2},(_,i)=>'SSR-'+(i+1)),
  ...Array.from({length:4},(_,i)=>'SR-'+(i+1)),
  ...Array.from({length:4},(_,i)=>'R-'+(i+1)),
  ...Array.from({length:5},(_,i)=>'N-'+(i+1)),
  'UR-2',...Array.from({length:2},(_,i)=>'SSR-'+(i+3)),
  ...Array.from({length:2},(_,i)=>'SR-'+(i+5)),
  ...Array.from({length:5},(_,i)=>'R-'+(i+5)),
  ...Array.from({length:6},(_,i)=>'N-'+(i+6)),
  ...Array.from({length:18},(_,i)=>'LOCK-'+String(i+33).padStart(2,'0'))
];
for(const [index,id] of CARD_IDS.entries()){
  const unreleased=index>=32;
  HELP['cards/'+id+'.webp']={
    label:(unreleased?'待开放 · ':'')+id+' 回忆卡插画',
    pages:unreleased?['后台卡片管理（暂不公开）']:['肥啾邮局','回忆收藏室'],
    region:unreleased?'第 '+(index+1)+' 号预留卡位，仅管理员可编辑':'第 '+(index+1)+' 张公开卡片的中央插画框'+(index<8?'，也出现在邮局下方前八张预览中':''),
    description:unreleased?'第 '+(index+1)+' 号卡位属于50张总容量中尚未开放的18张。现在可以预先上传与填写资料，但不会在公开卡池、抽卡结果或收藏列表展示。未来需另行开放才会显示。':'此图用于该编号卡片的抽卡结果、收藏列表与详情。卡框、编号、稀有度、卡名由网页绘制，不要烘焙进图片。上传不会改变抽卡概率、历史持有数或原账户数据。',
    recommendation:'上传主体居中、周围留白的插画，优先 WebP；通过下方位置X/Y、缩放和裁切调整显示。卡名、故事和关联人物在「卡片管理」修改。'
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
