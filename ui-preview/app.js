/* Buzhi Island: a local, clearly labelled visual preview. No production API. */
(() => {
  'use strict';

  const LIVE = window.__BUZHI_PRODUCTION__ === true;
  const PAGE = document.body.dataset.page || 'home';
  const KEY = 'buzhi-ui-preview-v3';
  const EVENT = { name: '菜菜生日会', birthday: '2026年10月20日', period: '10月18日 — 10月25日' };
  const AVATARS = [
    ['海风蓝', '#a8d8f0'], ['浪花白', '#f5fbff'], ['贝壳粉', '#f9c8e5'],
    ['星光黄', '#f8e5b3'], ['小岛绿', '#c3e4d4'],
  ];
  const PATHS = {
    home: ['index.html', '庆典码头', 'home'], passport: ['passport.html', '生日通行证', 'ticket'],
    office: ['office.html', '岛民事务所', 'flag'], checkin: ['checkin.html', '每日签到', 'sun'],
    draw: ['draw.html', '肥啾邮局', 'mail'], collection: ['collection.html', '回忆收藏室', 'cards'],
    mailbox: ['mailbox.html', '岛主信箱', 'heart'],
    guide: ['guide.html', '登岛导览', 'anchor'],
    islanders: ['islanders.html', '岛民画廊', 'bird'],
    effects: ['effects.html', '特效体验', 'sparkles'],
  };
  const SHAPES = {
    home: '<path d="m3 10 9-7 9 7v10H3z"/><path d="M9 20v-7h6v7"/>',
    ticket: '<path d="M3 6h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4z"/><path d="M8 7v2m0 3v2m0 3v1m5-7h4m-4 3h3"/>',
    flag: '<path d="M5 21V3m0 1c5-3 9 4 15 0v11c-6 4-10-3-15 0"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 1v2m0 18v2M1 12h2m18 0h2M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',
    mail: '<rect x="2" y="5" width="20" height="15" rx="3"/><path d="m3 7 9 7 9-7"/>',
    cards: '<rect x="6" y="3" width="14" height="18" rx="2"/><path d="M3 5v13m8-9 2-3 2 3 3 2-3 2-2 3-2-3-3-2z"/>',
    heart: '<path d="M12 21 3.5 12.5C-3 5 7-1 12 6c5-7 15-1 8.5 6.5z"/>',
    arrow: '<path d="M5 19 19 5M5 5h14v14"/>',
    down: '<path d="M12 3v18m-7-7 7 7 7-7"/>',
    wave: '<path d="M2 8c4-5 6 5 10 0s6 5 10 0M2 16c4-5 6 5 10 0s6 5 10 0"/>',
    coin: '<circle cx="12" cy="12" r="9"/><path d="m12 6 2 4 4 2-4 2-2 4-2-4-4-2 4-2z"/>',
    star: '<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/>',
    shell: '<path d="M3 16C-2 2 10-1 12 8c2-9 14-6 9 8l-6 5H9zM7 7l3 10m7-10-3 10M12 9v8"/>',
    moon: '<path d="M20 14A9 9 0 0 1 10 3a9 9 0 1 0 10 11z"/>',
    flower: '<path d="M12 9c-7-12-14 1-4 3-12 6 1 15 4 4 6 12 15-1 4-4 12-6-1-15-4-3z"/><circle cx="12" cy="12" r="2"/>',
    cake: '<path d="M3 12h18v9H3zM3 15c3 4 3-3 6 0s3-3 6 0 3-3 6 0M6 12V8h12v4M12 8V4m0 0c-3-4 3-4 0 0"/>',
    anchor: '<path d="M12 7v14M6 10h12M3 14c0 9 18 9 18 0M3 14l-2 2m20-2 2 2"/><circle cx="12" cy="4" r="3"/>',
    leaf: '<path d="M21 3C1 1 1 16 8 18s15-6 13-15zM3 22 17 8"/>',
    music: '<path d="M9 17V5l12-3v12M9 8l12-3"/><ellipse cx="5" cy="18" rx="4" ry="3"/><ellipse cx="17" cy="15" rx="4" ry="3"/>',
    bird: '<path d="M4 18c-5-10 4-17 11-11l5-1-1 5c6 10-10 13-15 7zM5 14q4-5 8 0M16 10h.1M9 21v2m5-2v2"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v2"/>',
    check: '<path d="m4 12 5 5L20 6"/>',
    copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M5 16H3V3h13v2"/>',
    close: '<path d="m5 5 14 14M5 19 19 5"/>',
    sparkles: '<path d="m9 3 2 5 5 2-5 2-2 5-2-5-5-2 5-2zm10 10 1 3 3 1-3 1-1 3-1-3-3-1 3-1z"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 2v6m10-6v6M3 11h18m-13 4h2m4 0h2"/>',
  };
  const icon = (name) => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${SHAPES[name] || SHAPES.star}</svg>`;
  const esc = (text) => String(text).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const uid = () => {
    if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
    const bytes = new Uint32Array(4);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (n) => n.toString(16).padStart(8, '0')).join('-');
  };
  const dateKey = (date = new Date()) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  const timeText = (value) => new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value));

  const CARDS = [
    ['UR', '岛屿与永恒', 'star', '菜菜、吱吱', '海风有一天会停，岛上的故事却还会继续。'],
    ['SSR', '许愿的瞬间', 'cake', '菜菜', '闭上眼睛之前，把这一刻偷偷收进口袋。'],
    ['SSR', '与你共赴星海', 'moon', '菜菜、吱吱', '不需要远航，我们已经在彼此的星海里。'],
    ['SR', '海风来信', 'mail', '菜菜', '信封里有一朵浪花，还有一句迟迟没说出口的谢谢。'],
    ['SR', '今日晴朗', 'sun', '吱吱', '今天小岛的天气，是适合为你庆生的晴。'],
    ['SR', '雪啾旧梦', 'bird', '菜菜、吱吱', '从雪啾国到不吱岛，那些青春的故事还在发光。'],
    ['SR', '岛上的花', 'flower', '菜菜', '每一朵花都记得，曾经陪它等春天的人。'],
    ['R', '贝壳耳语', 'shell', '小岛日常', '靠近一点，听见海浪也在说生日快乐。'],
    ['R', '停靠的心愿', 'anchor', '小岛日常', '你停靠的地方，也会成为别人的归处。'],
    ['R', '漂流的旋律', 'music', '菜菜、吱吱', '偶像时代的旋律，换成了小岛晚风的节拍。'],
    ['R', '一片新绿', 'leaf', '岛民', '每一次登岛，都让这里更像一个家。'],
    ['N', '浪花一朵', 'wave', '小岛日常', '普通的一天，也有值得收藏的小小快乐。'],
    ['N', '小岛邮戳', 'mail', '小岛日常', '盖上今天的邮戳，寄给未来的我们。'],
    ['N', '口袋星光', 'sparkles', '岛民', '不是所有星光都在天上，有一些在你口袋里。'],
    ['N', '来客留名', 'flag', '岛民', '不必大声宣布，我们记得你来过。'],
    ['N', '晚安小啾', 'bird', '小岛日常', '把今天的故事合上，明天继续相见。'],
  ].map(([rarity, name, motif, characters, story], index) => ({ id: `BZ-${String(index + 1).padStart(2, '0')}`, rarity, name, motif, characters, story }));
  // Keep the original 16 card IDs intact. Add 16 released cards for the 32-card pool.
  CARDS.push(...[
    ...Array.from({length:1},(_,i)=>['UR','星海回忆 '+(17+i),'star']),
    ...Array.from({length:2},(_,i)=>['SSR','星海回忆 '+(18+i),'star']),
    ...Array.from({length:2},(_,i)=>['SR','星海回忆 '+(20+i),'star']),
    ...Array.from({length:5},(_,i)=>['R','星海回忆 '+(22+i),'star']),
    ...Array.from({length:6},(_,i)=>['N','星海回忆 '+(27+i),'star'])
  ].map(([rarity,name,motif],i)=>({id:'BZ-'+String(i+17).padStart(2,'0'),rarity,name,motif,characters:'不吱岛',story:'新的生日回忆，等待与你相遇。'})));
  let TASKS = [
    { id: 'arrival', title: '向不吱岛报到', text: '领好通行证，留下你今天赴约的足迹。', reward: 0, motif: 'flag' },
    { id: 'wish', title: '给菜菜写一句生日祝福', text: '每天可完成一次，北京时间次日00:00重置；每日须使用新的任务完成代码。', reward: 25, motif: 'heart' },
    { id: 'live', title: '赴一场生日直播的约', text: '每位岛民仅能完成并领取一次，参与生日直播后使用完成代码。', reward: 25, motif: 'calendar' },
    { id: 'song', title: '点亮小岛的庆生歌', text: '参与直播互动后，向岛主领取完成代码。', reward: 25, motif: 'music' },
    { id: 'memory', title: '分享一段相遇的故事', text: '哪一段小小瞬间，让你决定留下来？', reward: 25, motif: 'mail' },
    { id: 'islander', title: '和岛民打一个招呼', text: '让今天的小岛，多一点温柔的声音。', reward: 25, motif: 'bird' },
    { id: 'party', title: '收藏一份庆典合照', text: '留住这次相聚，完成后领取任务代码。', reward: 25, motif: 'cards' },
  ];
  const blank = () => ({ version: 3, passport: null, balance: 0, tasks: [], bonuses: [], checkins: [], collection: {}, history: [], ledger: [], demoIslander: false });
  let state = blank();
  let storageError = '';
  if (!LIVE) try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.version === 3 && Number.isFinite(parsed.balance) && parsed.balance >= 0 && Array.isArray(parsed.tasks) && Array.isArray(parsed.checkins) && Array.isArray(parsed.history) && Array.isArray(parsed.ledger) && Array.isArray(parsed.bonuses) && parsed.collection && typeof parsed.collection === 'object' && !Array.isArray(parsed.collection) && (!parsed.passport || (typeof parsed.passport.nickname === 'string' && typeof parsed.passport.id === 'string' && Number.isInteger(parsed.passport.avatar) && parsed.passport.avatar >= 0 && parsed.passport.avatar < AVATARS.length))) {
        state = parsed;
      } else storageError = '浏览器中的演示记录格式不完整。可以重置演示后重新体验。';
    }
  } catch { storageError = '浏览器未能读取演示记录。请允许此页面保存本地数据后再试。'; }

  function commit(next) {
    if(LIVE)throw Error('正式数据只能通过服务器保存');
    if (storageError) throw new Error('演示记录暂时无法保存，请先处理页面上的提示。');
    try { localStorage.setItem(KEY, JSON.stringify(next)); }
    catch { storageError = '浏览器空间不足或禁止保存，刚才的操作没有扣币、领奖或修改记录。'; showStorageError(); throw new Error(storageError); }
    state = next;
    updateWallet();
  }
  const clone = () => JSON.parse(JSON.stringify(state));
  function credit(next, amount, label) {
    next.balance += amount;
    if (amount) next.ledger.unshift({ amount, label, at: Date.now() });
  }
  function action(callback) {
    try { callback(); }
    catch (error) { toast(error.message || '暂时没有完成，请再试一次。'); }
  }
  function showStorageError() {
    const host = document.querySelector('#storage-alert');
    if (!host || !storageError) return;
    host.hidden = false;
    host.innerHTML = `${esc(storageError)} <button type="button" id="reset-demo">重置演示记录</button>`;
    host.querySelector('button').onclick = () => {
      if (!confirm('只会清除这套 UI 预览的演示通行证、金币与卡片，重新开始。确定吗？')) return;
      try { localStorage.removeItem(KEY); location.reload(); } catch { toast('浏览器仍不允许保存，请调整浏览器设置后刷新。'); }
    };
  }
  let toastTimer;
  function toast(message) {
    const el = document.querySelector('#toast');
    el.textContent = message;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 4400);
  }
  function updateWallet() {
    document.querySelectorAll('[data-balance]').forEach((el) => { el.textContent = state.balance; });
  }
  const link = (key, label = PATHS[key][1], className = 'btn') => `<a class="${className}" href="${PATHS[key][0]}">${label}${icon('arrow')}</a>`;
  const heading = (number, english, title, text) => `<div class="page-heading"><div><div class="eyebrow">${english}</div><h1>${title}</h1><p>${text}</p></div><span class="page-number" aria-hidden="true">${number}</span></div>`;
  function needPassport(title = '先领取一张生日通行证') {
    return `<section class="glass empty-state">${icon('ticket')}<h2>${title}</h2><p>用一个昵称和一枚庆典头像，记下这次登岛的身份。<br>首次领取，送你恰好够抽一次卡的 50 金币。</p><div class="actions">${link('passport', '去领取通行证', 'btn primary')}${link('home', '先回码头', 'btn')}</div></section>`;
  }
  function cardPicture(card) {
    const item=LIVE&&liveCatalog.find(c=>c.previewId===card.id),name=item&&'cards/'+item.id+'.webp';
    if(!name||!managedAssets[name])return icon(card.motif);
    const image=document.createElement('img');image.dataset.officialCard='true';image.alt=card.name;image.src=assetUrl(name);image.style.cssText='display:block;width:100%;height:100%;object-fit:contain;border-radius:inherit';applyAssetLayout(image,name);return image.outerHTML;
  }
  function cardMarkup(card, { owned = true, quantity = 0, interactive = false } = {}) {
    const tag = interactive ? 'button' : 'div';
    return `<${tag} ${interactive ? `type="button" data-card="${card.id}" aria-label="${esc(card.name)}，${card.rarity}，${owned ? `已拥有${quantity}张` : '未获得'}"` : ''} class="memory-card ${owned ? '' : 'locked'}" data-rarity="${card.rarity}">
      ${quantity ? `<span class="quantity">× ${quantity}</span>` : ''}<div class="card-inner"><div class="card-topline"><span class="card-number">${card.id} / 2026</span><span class="rarity">${card.rarity}</span></div><div class="card-picture">${cardPicture(card)}</div><div class="card-nameplate"><span class="card-crest" aria-hidden="true">✧</span><div class="card-title">${esc(card.name)}</div><p class="card-subtitle">BUZHI · CELESTIAL ARCHIVE</p></div><div class="card-bottomline"><span>${owned ? 'BIRTHDAY COLLECTION' : '等待相遇'}</span><span>10.20 ✦</span></div></div></${tag}>`;
  }
  function ledgerMarkup() {
    return state.ledger.length ? `<ul class="ledger">${state.ledger.slice(0, 6).map((entry) => `<li><span>${esc(entry.label)}</span><b class="${entry.amount < 0 ? 'negative' : ''}">${entry.amount > 0 ? '+' : ''}${entry.amount}</b></li>`).join('')}</ul>` : '<p class="small muted">还没有收支，庆典的故事等你开启。</p>';
  }

  const LIVE_TASKS=[
    {id:'arrival',title:'首次报到',text:'领取通行证即自动完成',reward:0,motif:'flag'},
    {id:'letter',title:'生日来信',text:'写给菜菜的话，不少于15字；每天可写一次并领取25金币',reward:25,motif:'heart'},
    {id:'memory',title:'岛屿回忆',text:'写下一段相遇与回忆，不少于15字；完成后领取25金币',reward:25,motif:'mail'},
    {id:'quiz',title:'默契小测',text:'完成小测后领取代码',reward:25,motif:'star'},
    {id:'creative',title:'创作展投稿',text:'完成投稿后领取代码',reward:25,motif:'cards'},
    {id:'support',title:'直播应援',text:'每位岛民只能领取一次，完成应援后领取代码',reward:25,motif:'music'},
    {id:'commission',title:'临时委托',text:'接受岛主发布的活动委托',reward:25,motif:'bird'}
  ];
  let liveToken = LIVE ? sessionStorage.getItem('buzhi-online-token')||'' : '';
  let liveCatalog=[];
  let liveOcProfiles=[];
  let managedAssets={};
  let managedVersions={};
  const assetUrl=name=>'/assets/'+name+'?v='+(managedVersions[name]||assetVersion);
  let managedLayouts={};
  function applyAssetLayout(el,name,isBackground=false){if(!el)return;const v=managedLayouts[name];if(!v)return;if(isBackground){el.style.backgroundPosition=v.x+'% '+v.y+'%';el.style.backgroundSize=v.fit==='cover'?'cover':v.scale+'% auto';return}el.style.opacity=String(v.opacity/100);el.style.zIndex=String(v.layer);el.style.position=el.style.position||'relative';el.style.objectFit=v.fit;el.style.objectPosition=v.x+'% '+v.y+'%';el.style.transform='scale('+(v.scale/100)+')';el.style.transformOrigin=v.x+'% '+v.y+'%'}
  function refreshManagedArtwork(){
    if(!LIVE)return;
    const backgrounds={
      home: ['decor/home-background.webp','.home-hero'],
      office:['decor/office-background.webp','.office-layout'],
      checkin:['decor/checkin-background.webp','.checkin-layout'],
      draw:['decor/post-office-background.webp','.postal-experience'],
      collection:['decor/collection-background.webp','.collection-summary'],
      mailbox:['decor/mailbox-background.webp','.mailbox-layout']
    };
    const selected=backgrounds[PAGE];
    if(selected&&managedAssets[selected[0]]){
      const host=document.querySelector(selected[1]);
      if(host){const photo='url("/assets/'+selected[0]+'?v='+(managedVersions[selected[0]]||assetVersion)+'")';if(PAGE==='home'){host.style.backgroundImage='linear-gradient(130deg,#eaf8ffdb,#cceefa9c 55%,#e8e6ffb8)';host.style.setProperty('--home-sea-photo',photo);host.style.setProperty('--home-sea-position',(managedLayouts[selected[0]]?.x??50)+'% '+(managedLayouts[selected[0]]?.y??50)+'%')}else{host.style.removeProperty('background-image');host.style.setProperty('--liquid-room-photo',photo);const layout=managedLayouts[selected[0]];host.style.setProperty('--liquid-room-position',(layout?.x??50)+'% '+(layout?.y??50)+'%');host.style.setProperty('--liquid-room-size',layout?.fit==='cover'?'cover':(layout?.scale??100)+'% auto')}host.style.backgroundSize='cover';host.style.backgroundPosition='center'}
    }
    const hero=document.querySelector('.hero-art img, .mini-art');
    if(hero&&managedAssets['decor/home-poster.webp']){hero.src=assetUrl('decor/home-poster.webp');applyAssetLayout(hero,'decor/home-poster.webp')}
    const map=document.querySelector('#map-camera image');
    // Guide map uses the approved full-archipelago artwork, not the admin decorative override.
    document.querySelectorAll('.memory-card').forEach(card=>{
      const label=card.querySelector('.card-number')?.textContent?.match(/BZ-\d{2}/)?.[0];
      const match=liveCatalog.find(item=>item.previewId===label);
      if(!match||!managedAssets['cards/'+match.id+'.webp'])return;
      const slot=card.querySelector('.card-picture');if(!slot)return;
      let img=slot.querySelector('img[data-official-card]');
      if(!img){img=document.createElement('img');img.dataset.officialCard='true';img.alt='官方回忆卡面';img.style.cssText='display:block;width:100%;height:100%;object-fit:contain;border-radius:inherit';slot.replaceChildren(img)}
      const target=assetUrl('cards/'+match.id+'.webp');
      if(!img.src.endsWith(target))img.src=target;applyAssetLayout(img,'cards/'+match.id+'.webp');
    });
    document.querySelectorAll('#oc-track .oc-slide').forEach((slide,i)=>{
      const file=i===0?'characters/caicai.webp':i===1?'characters/zhizhi.webp':liveOcProfiles[i-2]?.image?.replace('/assets/','');
      if(file&&managedAssets[file]){const img=slide.querySelector('.oc-art img');if(img){img.src=assetUrl(file);applyAssetLayout(img,file)}}
    });
  }
  let assetVersion=Date.now();
  async function loadManagedArtwork(){
    if(!LIVE)return;
    try{const data=await liveApi('assets-manifest');managedAssets=data.assets||{};managedVersions=data.versions||{};managedLayouts=data.layouts||{};assetVersion=Date.now();refreshManagedArtwork()}catch(e){console.warn('素材清单暂不可用',e)}
  }

  async function liveApi(path,body){
    const resp=await fetch('/api/'+path,{method:body===undefined?'GET':'POST',headers:{...(liveToken?{'Authorization':'Bearer '+liveToken}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});
    let result;try{result=await resp.json()}catch{throw Error('账户服务器暂时不可用')}
    if(!resp.ok)throw Error(result.error||'操作未完成');
    return result;
  }
  function takeProfile(profile){
    state=blank();
    state.passport={id:profile.id,nickname:profile.nickname,avatar:0};
    state.balance=profile.coins;
    state.ledger=(profile.ledger||[]).map(t=>({amount:t.amount,label:t.reason,at:Date.parse(t.created_at)}));
    state.tasks=profile.tasks.map(t=>t==='report'?'arrival':t.startsWith('letter:')?'letter':t);
    state.bonuses=profile.bonuses;
    state.checkins=profile.checkins;
    state.demoIslander=true;
    for(const [index,item] of profile.draws.entries()){
      const card=liveCatalog.find(c=>c.id===item.card_id);
      if(!card)continue;
      const id=card.previewId;
      const entry=state.collection[id]||{quantity:0,firstAt:Date.parse(item.created_at)};
      entry.quantity++;state.collection[id]=entry;
      state.history.push({id:'server-'+index,cardId:id,at:Date.parse(item.created_at),first:index===profile.draws.length-1});
    }
    renderPage();
  }
  async function liveInit(){
    TASKS=LIVE_TASKS;
    await loadManagedArtwork();
    try{const [catalog,oc]=await Promise.all([liveApi('catalog'),liveApi('oc')]);liveCatalog=catalog.cards;for(const item of liveCatalog){let card=CARDS.find(c=>c.id===item.previewId);if(!card){card={id:item.previewId,rarity:item.rarity,name:item.name,motif:'star',characters:item.characters||'不吱岛',story:item.story||'新的星海回忆，等待与你相遇。'};CARDS.push(card)}card.name=item.name;card.story=item.story??card.story;card.characters=item.characters??card.characters};liveOcProfiles=oc}catch(e){toast(e.message)}
    if(liveToken){try{takeProfile(await liveApi('me'))}catch{liveToken='';sessionStorage.removeItem('buzhi-online-token');state=blank();renderPage()}}
    else renderPage();
  }
  function activeAsset(name,fallback){
    if(!LIVE)return fallback;
    return managedAssets[name]?assetUrl(name):fallback;
  }
  function renderShell() {
    document.title = `${PATHS[PAGE][1]} · 不吱岛生日庆典`;
    const navItem = (key, mobile = false) => `<a href="${PATHS[key][0]}" ${PAGE === key ? 'aria-current="page"' : ''}>${mobile ? icon(PATHS[key][2]) : ''}${mobile ? ({ home: '首页', office: '任务', draw: '抽卡', collection: '收藏', checkin: '签到' }[key]) : PATHS[key][1]}</a>`;
    document.querySelector('#app').innerHTML = `<div class="world" data-motion="on"><div class="ocean" aria-hidden="true"></div><div class="ambient" aria-hidden="true"></div><i class="bubble b1" aria-hidden="true"></i><i class="bubble b2" aria-hidden="true"></i><i class="bubble b3" aria-hidden="true"></i>
      <a class="skip-link" href="#main">跳到页面内容</a><header class="site-header"><a class="brand" href="index.html" aria-label="不吱岛，返回首页"><span class="brand-mark"><img src="assets/island-mark.svg" alt="" aria-hidden="true" width="44" height="44"></span><span><strong>不吱岛</strong><small>BUZHI ISLAND</small></span></a><nav class="desktop-nav" aria-label="主要导航">${['home', 'office', 'draw', 'collection', 'islanders', 'guide', 'mailbox', 'checkin'].map((key) => navItem(key)).join('')}</nav><div class="header-actions"><a href="resident.html" style="font-size:13px;padding:9px 13px;border:1px solid #b4d8ef;border-radius:30px;background:#ffffff99;color:#497ba0;text-decoration:none">🏝️ 个人中心</a><span class="wallet" aria-label="当前金币">${icon('coin')}<strong data-balance aria-live="polite">${state.balance}</strong></span><button class="motion-toggle" type="button" id="motion-toggle" aria-pressed="true" aria-label="切换页面动效">${icon('wave')}<span>动效 · 开</span></button></div></header>
      <div class="container"><div class="demo-line"><span><i class="status-dot"></i>${LIVE ? '庆典正式活动 · 账户数据安全保存' : '本地演示 · 数据仅保存在此浏览器'}</span><span>${EVENT.name} / 2026.10.18 — 10.25</span></div><div class="storage-alert" id="storage-alert" role="alert" hidden></div><main id="main" tabindex="-1"></main><footer class="site-footer"><div><strong>不吱岛 · 菜菜 ＆ 吱吱</strong><br>从雪啾国出发，在这里与你相遇。</div><div>${LIVE ? '生日回忆 · 与你相遇' : '插画与卡面为示意 · 庆典账户数据由服务器保存'}</div></footer></div><nav class="mobile-nav" aria-label="手机主要导航">${['home', 'office', 'draw', 'collection', 'checkin'].map((key) => navItem(key, true)).join('')}</nav><div class="toast" id="toast" role="status" hidden></div><dialog class="detail-dialog" id="card-detail" aria-labelledby="card-detail-title"></dialog></div>`;
    if(!LIVE)showStorageError();
    setupMotion();
  }

  function renderHome() {
    let primary = link('passport', '领取生日通行证', 'btn primary');
    if (state.passport) primary = state.history.length ? link('collection', '查看我的回忆', 'btn primary') : link('draw', '去抽第一张卡', 'btn primary');
    return `<section class="home-hero"><div class="hero-letters" aria-hidden="true">A LITTLE WISH.</div><div class="hero-copy"><div class="eyebrow">✧ 菜菜生日特别企划 · 2026 ✧</div><h1>雾岛吱&菜Gina🐟<span>の诞生日！</span></h1><p class="subtitle">完成庆典任务领取金币，<br>收集与菜菜的生日回忆吧！</p><div class="hero-date"><strong>10.20</strong><i></i><small>菜菜岛主 · 正式生日<br>庆典开放 10.18 — 10.25</small></div><div class="actions">${primary}${link('office', '去岛上逛逛', 'btn')}<a class="btn" href="resident.html">🏝️ 我的岛屿生活</a></div><p class="hero-footnote">${state.passport ? `欢迎回来，${esc(state.passport.nickname)}。你的 ${state.balance} 枚金币在这里等你。` : '无需登录即可浏览 · 每一位赴约的人，都值得被记住。'}</p></div><div class="hero-art"><img src="${activeAsset('decor/home-poster.webp','assets/island.svg')}" alt="菜菜与吱吱的生日庆典主视觉" width="720" height="760"><div class="floating-note glass shine">来自不吱岛的一封邀请<strong>今天，也要一起快乐呀。</strong>TO OUR DEAREST ISLANDERS ♡</div><div class="birthday-seal">生日快乐，菜菜岛主！<strong>Make a little wish ✦</strong></div>${LIVE ? "" : `<span class="art-caption">双人主视觉示意 · 待替换正式立绘</span>`}</div></section>
      <aside class="news-strip glass"><strong>✦ 岛上来信</strong><p>海风已经把邀请送达。10月18—25日，来不吱岛收藏一段生日回忆吧。</p><a href="mailbox.html">查看岛主信箱 ${icon('arrow')}</a></aside>`;
  }

  function renderPassport() {
    const title = heading('01', 'Your invitation to the island', '生日通行证', '起一个岛上昵称，选一枚庆典头像，把这次赴约变成专属于你的回忆。');
    if (state.passport) {
      const [label, color] = AVATARS[state.passport.avatar];
      return title + `<div class="passport-grid has-pass"><div class="ticket-station"><section class="ticket souvenir-ticket" aria-label="你的生日纪念通行证"><div class="ticket-readable"><h2>${esc(state.passport.nickname)}</h2><dl><dt>参与身份</dt><dd>${LIVE ? '访客 · 未核验' : '演示访客 · 未核验'}</dd><dt>庆典头像</dt><dd>${label}</dd><dt>庆典</dt><dd>${EVENT.name}</dd><dt>正式生日</dt><dd>${EVENT.birthday}</dd><dt>活动期间</dt><dd>${EVENT.period}</dd></dl></div><figure class="ticket-figure"><img id="ticket-image" alt="${esc(state.passport.nickname)}的不吱岛生日通行证，${EVENT.birthday}，参与编号 ${esc(state.passport.id)}，${LIVE ? '访客 · 未核验' : '演示访客 · 未核验'}" width="2400" height="1200" hidden><p id="ticket-render-status" role="status">正在印制你的纪念票根…</p><figcaption><span>一张票根，收藏这次小岛重逢。</span><span>OCEAN POST · KEEP THIS MOMENT</span></figcaption></figure><div class="ticket-tools"><div class="ticket-id"><label for="public-id">唯一参与者编号</label><div class="copy-row"><input id="public-id" readonly value="${esc(state.passport.id)}" aria-describedby="id-help"><button type="button" id="copy-id">${icon('copy')}</button></div><p id="id-help">编号可以私信给岛主核对身份，但不能当作登录密码。</p></div><button class="btn primary" type="button" id="save-pass" disabled>${icon('down')} 保存纪念通行证</button></div><dialog class="detail-dialog" id="ticket-save-dialog" aria-labelledby="ticket-save-title"><button type="button" class="dialog-close" data-ticket-close aria-label="关闭保存图片">${icon('close')}</button><h2 id="ticket-save-title">把这次赴约，存进相册</h2><p>手机可以长按图片保存，也可点击下方下载。图片只作纪念，不能用来登录。</p><img alt="可长按保存的不吱岛生日纪念通行证" width="2400" height="1200"><div class="actions"><a class="btn primary" id="download-pass" download>下载高清图片 ${icon('down')}</a></div><p class="small muted">只包含可公开的通行证信息，不含恢复密钥或平台 UID。图片记录的是保存时的身份，不作为核验凭证。</p></dialog></section><div class="actions ticket-actions">${link('draw', state.history.length ? '去肥啾邮局' : '去抽第一张卡', 'btn')}${link('office', '看看庆典任务', 'btn text')}</div></div><aside><section class="glass panel"><h2>赴约成功，欢迎上岛</h2><p class="small muted">通行证、金币与卡片由服务器保存，请妥善保留恢复密钥。</p><div class="draw-cost"><span>我的庆典金币</span><span><strong data-balance>${state.balance}</strong> 枚</span></div><p class="small muted">领通行证不代表已通过直播粉丝团核验，纪念图片也不能代替登录。</p></section><div class="info-note"></div></aside></div>`;
    }
    return title + `<div class="passport-grid"><form class="glass panel" id="passport-form" novalidate><h2>你的登岛信息</h2><div id="form-error" class="form-error" role="alert" tabindex="-1" hidden></div><div class="form-field"><label for="nickname">岛上昵称</label><input id="nickname" name="nickname" placeholder="今天想在岛上叫什么？" autocomplete="nickname" aria-describedby="nickname-hint"><p id="nickname-hint" class="hint">1—20个字符，昵称可以重复，身份由唯一编号区分。</p></div><fieldset><legend>选一枚免费庆典头像</legend><div class="avatar-options">${AVATARS.map(([name, color], index) => `<label class="avatar-option"><input type="radio" name="avatar" value="${index}" ${index === 0 ? 'checked' : ''}><span class="avatar" style="--avatar:${color}">啾</span><span>${name}</span></label>`).join('')}</div></fieldset><div class="privacy-note">这里是外观与流程预览，只需昵称和头像。请勿输入真实平台 UID 或其他私密资料。正式核验入口由主网站接入。</div><button type="submit" class="btn primary full" id="claim-pass">领取我的生日通行证 ${icon('arrow')}</button><p class="small muted">首次登岛赠送 50 金币，恰好够抽一次生日回忆卡。</p></form><aside class="glass pass-preview"><div class="eyebrow">A little promise</div><img class="mini-art" src="${activeAsset('decor/home-poster.webp','assets/island.svg')}" alt="不吱岛庆生示意插画"><h3>在不吱岛，留一个位置</h3><p>菜菜的生日，也是一次重逢的理由。<br>不管你从哪里来，海风都会记得。</p><span class="pill pink">10.18 — 10.25 · 菜菜生日会</span><div class="preview-stamp">Your story starts here.</div></aside></div>`;
  }

  function renderOffice() {
    const title = heading('02', 'Little tasks, little happiness', '岛民事务所', '庆典由每一位岛民一起完成。做一点小事，领取金币，也留下一份参与的证明。');
    if (!state.passport) return title + needPassport();
    return title + `<div class="office-layout"><div>${!state.demoIslander ? `<div class="info-note" style="margin:0 0 20px"><strong>岛主发放一次性任务完成代码</strong><br>${LIVE ? '已登录不等于已核验岛民。请完成对应活动后，填写岛主私信发放的代码，奖励以服务器记录为准。' : `若想体验任务界面，可开启本地演示；这不会取得任何正式岛民资格。<br><button class="btn text" id="demo-islander" type="button">试用岛民任务演示 ${icon('arrow')}</button>`}</div>` : ''}<div class="info-note" style="margin-bottom:14px">🎨 创作展投稿已迁往 <a href="resident.html"><strong>岛民个人中心 · 创作工坊 ↗</strong></a>。历史完成记录及已领金币不受影响；新作品暂进入待审流程。</div><div class="task-list">${TASKS.filter(task => task.id !== 'arrival' && task.id !== 'creative').map((task) => {
      const completed = state.tasks.includes(task.id);
      const locked = task.id !== 'arrival' && !state.demoIslander;
      return `<article class="glass task-card ${completed ? 'completed' : ''}"><span class="task-icon">${icon(task.motif)}</span><div><h3>${task.title}</h3><p>${task.text}</p><span class="task-reward">${task.reward ? `+${task.reward} 金币` : '免费报到 · 计入不同任务'}</span></div><div class="task-action">${completed ? '<span class="pill success">✓ 已完成</span>' : `<button type="button" class="btn ${locked ? '' : 'reward'}" data-task="${task.id}" ${locked ? 'disabled' : ''}>${locked ? '待岛民核验' : task.id === 'arrival' ? '立即报到' : ['letter','memory'].includes(task.id) ? '写下心意' : '输入完成代码'}</button>`}</div></article>`;
    }).join('')}</div></div><aside class="office-sidebar"><section class="glass sidebar-card"><h3>把参与连成星光</h3><p class="small muted">不同任务完成到指定数量，额外奖励一次金币。</p><div class="progress-track" data-completed="${state.tasks.length}"><span style="width:${Math.min(state.tasks.length / 9 * 100, 100)}%"></span></div>${[3, 6, 9].map((n) => `<div class="milestone"><strong>${n}</strong><p>个不同任务<br>额外 +25 金币${n === 9 ? ' · 待新增任务' : ''}</p>${state.bonuses.includes(n) ? '<span class="done">已入账</span>' : icon('star')}</div>`).join('')}</section><section class="glass sidebar-card"><h3>金币小账本</h3>${ledgerMarkup()}</section></aside></div><dialog class="detail-dialog" id="task-dialog" aria-labelledby="task-dialog-title"><button class="dialog-close" type="button" data-close-dialog aria-label="关闭">${icon('close')}</button><h2 id="task-dialog-title">提交完成代码</h2><form id="task-code-form"><p id="task-dialog-tip" class="small muted">请填写岛主私信发放的一次性完成代码。</p><div id="task-writing-wrap" hidden><label for="task-writing">写下你的心意（不少于15字）</label><textarea id="task-writing" maxlength="2000" rows="6" placeholder="在这里写下想说的话…"></textarea><p id="task-writing-count" class="small muted">0 / 15 字</p></div><div class="form-field" id="task-code-wrap"><label for="task-code">完成代码</label><input id="task-code" name="code" autocomplete="off" placeholder="输入完成代码" required aria-describedby="task-code-message"></div><p id="task-code-message" class="small" role="status"></p><button type="submit" class="btn primary full">确认完成并领取</button></form></dialog>`;
  }

  function streakCount() {
    if (!state.checkins.length) return 0;
    let count = 0;
    const today = dateKey();
    let cursor = new Date(`${today}T12:00:00+08:00`);
    if (!state.checkins.includes(today)) cursor = new Date(cursor.valueOf() - 86400000);
    while (state.checkins.includes(dateKey(cursor))) { count += 1; cursor = new Date(cursor.valueOf() - 86400000); }
    return count;
  }
  function renderCheckin() {
    const title = heading('03', 'A small hello, every day', '每日签到', '海风每天都来，你也可以。用一个小小的签到，记录在岛上的每一天。');
    if (!state.passport) return title + needPassport();
    const today = dateKey();
    const checked = state.checkins.includes(today);
    const streak = streakCount();
    return title + `<div class="checkin-layout"><section class="glass panel"><div class="checkin-head"><div><h2>${checked ? '今天的脚印，已经留下啦' : '今天，也来岛上坐坐'}</h2><p>${esc(state.passport.nickname)} · ${today.replaceAll('-', '.')} · 按北京时间记录</p></div><div class="sun-emblem">${icon('sun')}</div></div><div class="days">${Array.from({ length: 7 }, (_, index) => `<div class="day ${index < Math.min(streak, 7) ? 'done' : ''} ${index === Math.min(streak, 6) && !checked ? 'current' : ''}"><span>第 ${index + 1} 天</span><strong>${index === 6 ? '✦' : '+10'}</strong>${icon(index < streak ? 'check' : index === 6 ? 'cards' : 'coin')}</div>`).join('')}</div><div class="checkin-summary"><p>已经连续陪伴小岛 <strong>${streak}</strong> 天<br>每天一次 · 签到 +10 金币</p><button class="btn ${checked ? '' : 'primary'}" id="checkin-button" ${checked ? 'disabled' : ''}>${checked ? '✓ 今天已签到' : '留下今天的脚印'} ${icon(checked ? 'check' : 'sun')}</button></div></section><aside class="glass sidebar-card"><h3>第七天的小惊喜</h3><div class="hidden-card-teaser">${icon(streak >= 7 ? 'sparkles' : 'lock')}</div><p class="small muted">${streak >= 7 ? '隐藏纪念已点亮！七日纪念已解锁，额外卡面尚未开放。' : '连续签到7天，点亮隐藏纪念标记。额外卡面尚未开放，不计入当前公开卡池。'}</p><p class="small muted">错过一天会重新计算连续天数，已经获得的金币不会消失。</p></aside></div><div class="info-note">${LIVE ? '签到日期与金币奖励由服务器记录。' : '签到次数与金币仅用于本地预览。活动正式开放后，日期与奖励将由服务器统一确认。'}</div>`;
  }

  function drawBack() {
    return `<div class="memory-card card-back"><img class="card-back-art" src="assets/memory-card-back.svg?v=20261018-arcana1" alt="" aria-hidden="true" width="300" height="425" draggable="false"><div class="card-back-label"><span class="card-back-kicker">CELESTIAL ARCHIVE</span><h2>不吱岛</h2><p>星海秘藏 · 生日回忆</p></div><span class="card-back-edition">BUZHI ISLAND · 2026</span></div>`;
  }
  function renderDraw() {
    const first = state.history.length === 0;
    return `<section class="postal-experience" aria-labelledby="postal-title">
      <header class="postal-masthead"><span class="postal-location">${icon('mail')} 肥啾邮局 <span>／生日抽卡</span></span><span class="postal-edition">庆典限定 · 10.18—10.25</span></header>
      <div class="postal-intro"><h1 id="postal-title">把这一刻，<em>寄给你。</em></h1><p>海风送来一封信，里面藏着我们相遇的某个瞬间。</p></div>
      <div class="postal-scene">
        <p class="postal-margin-note" aria-hidden="true">来自不吱岛<br><span>留给未来的你</span><i></i>每一次相遇，都值得被收藏。</p>
        <section class="draw-stage" id="draw-stage" aria-label="开卡舞台"><div class="draw-result-label" id="draw-result-label" role="status">一封生日回忆，正在等你拆开</div><div id="stage-card">${drawBack()}</div><span class="stage-caption">${LIVE ? '生日回忆 · 小岛珍藏' : '示意卡面 · 正式角色卡面待接入'}</span></section>
        <div class="postal-postmark" aria-hidden="true"><span>不吱岛 · 生日来信</span><strong>10.20</strong><span>愿相遇，常留心间</span></div>
      </div>
      <section class="glass draw-info" aria-label="抽取生日回忆">
        <div class="draw-cost"><span>每次单抽 <strong>50</strong> 金币</span><i aria-hidden="true"></i><span>我的金币 <strong data-balance>${state.balance}</strong> 枚</span></div>
        ${state.passport ? `<button type="button" class="btn primary full" id="draw-button" ${state.balance < 50 ? 'disabled' : ''}>${first ? '拆开第一份生日回忆' : '抽取一张生日回忆'} ${icon('sparkles')}</button>` : link('passport', '先领取生日通行证', 'btn primary full')}
        <p class="draw-status" id="draw-status" role="status">${state.passport ? state.balance < 50 ? '金币不足50枚，可以去签到或岛民事务所看看。' : '重复卡会保留，并计入持有数量。' : '领取通行证即可获得够抽一次卡的50金币。'}</p>
        <div class="postal-next"><a href="office.html">去岛民事务所 ${icon('arrow')}</a><a href="collection.html">查看收藏 ${icon('cards')}</a></div>
        <div class="postal-pool-note"><span class="pill pink" id="draw-pool-label">${first ? '首次赴约 · SR / SSR 保障' : '生日回忆卡池 · 32 张'}</span></div>
        <p class="draw-description" id="draw-pool-description">${first ? '首次抽卡从公开的4张SSR与6张SR中抽取，每张概率为1/10。把第一份相遇，留得特别一点。' : 'UR、SSR、SR、R、N，当前公开32张卡片，剩余18张待开放。正常卡池每张概率均为1/32。'}</p>
        <details><summary>公开概率与首抽说明</summary><p class="small muted">首抽从公开SSR与SR卡片中等概率抽取，保证SR及以上；之后正常卡池32张，各1/32。</p><ul class="probability-list"><li><span>UR · 2 张</span><strong>6.25%</strong></li><li><span>SSR · 4 张</span><strong>12.5%</strong></li><li><span>SR · 6 张</span><strong>18.75%</strong></li><li><span>R · 9 张</span><strong>28.125%</strong></li><li><span>N · 11 张</span><strong>34.375%</strong></li></ul><p class="small muted">金币为活动积分，不可充值、提现或兑换现金。</p></details>
      </section>
    </section><section class="postal-collection" aria-labelledby="postal-collection-title"><div class="section-heading"><div><span class="postal-shelf-label">把相遇，慢慢收集</span><h2 id="postal-collection-title">信封里的小小宇宙</h2></div><small>${LIVE ? '看看有哪些回忆' : '以下为部分示意卡面'}</small></div><div class="pool-preview">${CARDS.slice(0, 8).map((card) => cardMarkup(card)).join('')}</div></section>`;
  }

  const filters = { ownership: 'all', rarity: 'all', search: '' };
  function renderCollection() {
    const title = heading('05', 'Keep the moments that matter', '回忆收藏室', '不是每一个瞬间都会重来，但我们可以把它好好收起来。');
    const owned = Object.values(state.collection).filter((entry) => entry.quantity > 0).length;
    const total = Object.values(state.collection).reduce((n, entry) => n + (Number(entry.quantity) || 0), 0);
    return title + `<section class="glass collection-summary"><div><strong>${owned}<span> / ${CARDS.length}</span></strong><span>种生日回忆</span></div><div><strong>${total}</strong><span>张珍藏卡片</span></div><a class="summary-action" href="draw.html">去邮局，再寄一份期待 ↗</a></section><div class="filter-bar"><div class="filter-tabs" aria-label="拥有状态">${[['all', '全部回忆'], ['owned', '已拥有'], ['missing', '待相遇']].map(([id, label]) => `<button type="button" data-filter="${id}" aria-pressed="${filters.ownership === id}">${label}</button>`).join('')}</div><div class="filter-controls"><input id="card-search" type="search" placeholder="寻找一张回忆…" aria-label="搜索卡名或角色"><select id="rarity-filter" aria-label="筛选稀有度"><option value="all">全部稀有度</option>${['UR', 'SSR', 'SR', 'R', 'N'].map((r) => `<option>${r}</option>`).join('')}</select></div></div><div class="collection-grid" id="collection-grid"></div><p class="collection-note">未获得的卡片以淡色展示。点击卡片可以阅读故事，查看角色与持有数量。</p><div class="section-heading"><div><div class="eyebrow">Your postmarks</div><h2>最近的开信记录</h2></div><small>每一次相遇，都有迹可循</small></div><div class="glass history-list">${state.history.length ? state.history.slice(0, 8).map((entry) => {
      const card = CARDS.find((item) => item.id === entry.cardId);
      return card ? `<div class="history-row"><span class="rarity">${card.rarity}</span><p>${esc(card.name)}</p><span class="muted">${entry.first ? '初次赴约' : '生日回忆'}</span><time>${timeText(entry.at)}</time></div>` : '';
    }).join('') : '<p class="small muted">还没有开信记录。去肥啾邮局，拆开你的第一份生日回忆吧。</p>'}</div>`;
  }

  function fillCollection() {
    const grid = document.querySelector('#collection-grid');
    const cards = CARDS.filter((card) => {
      const quantity = state.collection[card.id]?.quantity || 0;
      return (filters.ownership === 'all' || (filters.ownership === 'owned' ? quantity > 0 : quantity === 0))
        && (filters.rarity === 'all' || filters.rarity === card.rarity)
        && (!filters.search || `${card.name} ${card.characters}`.toLowerCase().includes(filters.search.toLowerCase()));
    });
    grid.innerHTML = cards.length ? cards.map((card) => cardMarkup(card, { owned: Boolean(state.collection[card.id]), quantity: state.collection[card.id]?.quantity || 0, interactive: true })).join('') : `<div class="glass collection-empty">${filters.ownership === 'owned' && !state.history.length ? '你的收藏室还在等第一张卡。去肥啾邮局寄出一份期待吧。' : '暂时没有找到这份回忆，换个条件试试看。'}</div>`;
  }

  async function refreshLiveNotices(){
    if(!LIVE||!['home','mailbox'].includes(PAGE))return;
    try{
      const notices=await liveApi('announcements');
      if(PAGE==='mailbox'){const host=document.querySelector('.mailbox-layout .letters');if(!host)return;host.replaceChildren();if(!notices.length){const box=document.createElement('article');box.className='glass letter';box.textContent='岛主尚未发布新公告。';host.append(box)}for(const n of notices){const article=document.createElement('article');article.className='glass letter';const h=document.createElement('h2');h.textContent=n.title;const time=document.createElement('time');time.textContent=(n.updated_at||'').slice(0,10);const body=document.createElement('p');body.style.whiteSpace='pre-wrap';body.textContent=n.body;article.append(h,time,body);host.append(article)}}
      if(PAGE==='home'){const strip=document.querySelector('.news-strip p');if(strip)strip.textContent=notices[0]?.title||'岛主尚未发布新公告。';}
    }catch(e){console.warn('公告更新失败',e)}
  }
  function renderMailbox() {
    return heading('06', 'Letters from the island', '岛主信箱', '不吱岛的近况、庆典的小消息，还有那些想认真说给你听的话。') + `<div class="mailbox-layout"><aside class="glass mailbox-side">${icon('mail')}<h2>风替我们寄信</h2><p>来自菜菜与吱吱的庆典来信。<br>${LIVE ? '最新公告以岛主发布的来信为准。' : '目前是公告样例，正式公告由主网站接入。'}</p></aside><div class="letters"><article class="glass letter"><span class="pill pink">置顶 · 生日邀请</span><h2>把生日，过成一次小岛重逢</h2><time>2026.10.17 / BUZHI ISLAND</time><p>亲爱的岛民：<br>你收到这封信的时候，不吱岛的生日庆典就已经开始啦。</p><p>10月20日是菜菜的生日。吱吱已经把派对的小灯挂好了，海风也把每一张邀请送到了你身边。这一次，想邀请你来做一点小任务、拆一封回忆，然后把我们相遇的瞬间好好收藏。</p><p>活动期间是10月18日至25日，首尾两天都算。无论什么时候登岛，都希望你带走一点快乐。</p><p class="signature">等你赴约的，菜菜 ＆ 吱吱 ♡</p></article><article class="glass letter"><span class="pill">庆典小贴士</span><h2>一张通行证，一份属于你的回忆</h2><time>2026.10.17 / ISLAND GUIDE</time><p>浏览不需要登录。参与前先领取生日通行证，昵称可以重复，但参与者编号不会相同。首次登岛的50金币，恰好够拆开一张生日回忆卡。</p><p>正式岛民任务与实体卡申请需要核验。实体卡将由多张虚拟卡组合兑换，具体规则后续公布，当前预览不开放申请。</p><div class="actions">${link('passport', '领取我的通行证', 'btn')}${link('draw', '前往肥啾邮局', 'btn text')}</div></article></div></div>`;
  }

  function setupMotion() {
    const world = document.querySelector('.world');
    const button = document.querySelector('#motion-toggle');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let saved = true;
    try { saved = localStorage.getItem('buzhi-ui-motion') !== 'off'; } catch { /* Keep the switch usable. */ }
    function apply() {
      const enabled = saved && !reduced.matches;
      world.dataset.motion = enabled ? 'on' : 'off';
      if (!enabled) world.querySelectorAll('.home-sea-ripple').forEach((wave) => wave.remove());
      button.setAttribute('aria-pressed', String(enabled));
      button.querySelector('span').textContent = reduced.matches ? '随系统关闭' : `动效 · ${enabled ? '开' : '关'}`;
      button.disabled = reduced.matches;
    }
    button.onclick = () => { saved = !saved; try { localStorage.setItem('buzhi-ui-motion', saved ? 'on' : 'off'); } catch { /* Cosmetic preference only. */ } apply(); };
    reduced.addEventListener('change', apply);
    apply();
    const motionObserver = new MutationObserver(() => document.dispatchEvent(new CustomEvent('buzhi:motion')));
    motionObserver.observe(world, { attributes: true, attributeFilter: ['data-motion'] });
    let pointerFrame;
    document.addEventListener('pointermove', (event) => {
      if (world.dataset.motion !== 'on' || event.pointerType !== 'mouse' || innerWidth < 900 || pointerFrame) return;
      const art = document.querySelector('.hero-art img');
      if (!art) return;
      pointerFrame = requestAnimationFrame(() => {
        art.style.setProperty('--px', `${(event.clientX / innerWidth - .5) * 14}px`);
        art.style.setProperty('--py', `${(event.clientY / innerHeight - .5) * 10}px`);
        pointerFrame = null;
      });
    });
    document.addEventListener('pointerdown', (event) => {
      if (world.dataset.motion !== 'on' || event.target.closest('input,select,dialog')) return;
      if (PAGE === 'home') {
        const wave = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        wave.classList.add('home-sea-ripple'); wave.setAttribute('aria-hidden', 'true');
        wave.setAttribute('viewBox', `0 0 ${innerWidth} ${innerHeight}`);
        wave.style.setProperty('--wave-reach', `${Math.hypot(innerWidth, innerHeight) * .95}px`);
        for (let i = 0; i < 3; i++) {
          const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          circle.setAttribute('cx', event.clientX); circle.setAttribute('cy', event.clientY); circle.setAttribute('r', '2');
          wave.append(circle);
        }
        world.querySelectorAll('.home-sea-ripple').forEach((old, index, waves) => { if (index < waves.length - 2) old.remove(); });
        wave.lastElementChild.addEventListener('animationend', () => wave.remove(), { once: true });
        world.append(wave); setTimeout(() => wave.remove(), 10000);
        return;
      }
      const ripple = document.createElement('span');
      ripple.className = 'ripple'; ripple.style.left = `${event.clientX}px`; ripple.style.top = `${event.clientY}px`;
      document.body.append(ripple); setTimeout(() => ripple.remove(), 850);
    });
  }

  function bindPassport() {
    const ticket = document.querySelector('.souvenir-ticket');
    if (ticket && state.passport && window.BuzhiTicket) {
      const [avatarLabel, avatarColor] = AVATARS[state.passport.avatar];
      // Pass only public fields; the renderer must never receive a live profile or recovery key.
      window.BuzhiTicket.mount(ticket, { nickname: state.passport.nickname, id: state.passport.id, avatarLabel, avatarColor, birthday: EVENT.birthday, eventName: EVENT.name, period: EVENT.period, demo: !LIVE });
    }
    if(LIVE){bindLivePassport();return}
    document.querySelector('#copy-id')?.setAttribute('aria-label', '复制参与者编号');
    document.querySelector('#copy-id')?.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(state.passport.id); toast('参与者编号已复制，可以私信给岛主。'); }
      catch { const field = document.querySelector('#public-id'); field.focus(); field.select(); toast('请手动复制已选中的参与者编号。'); }
    });
    const form = document.querySelector('#passport-form');
    form?.addEventListener('submit', (event) => {
      event.preventDefault();
      const nickname = form.elements.nickname.value.trim();
      const avatar = Number(form.elements.avatar.value);
      const error = document.querySelector('#form-error');
      if (Array.from(nickname).length < 1 || Array.from(nickname).length > 24 || !Number.isInteger(avatar) || avatar < 0 || avatar >= AVATARS.length) {
        error.hidden = false; error.textContent = '请填写1—24个字符的昵称，并选择一枚庆典头像。';
        form.elements.nickname.setAttribute('aria-invalid', 'true');
        form.elements.nickname.setAttribute('aria-describedby', 'form-error'); error.focus(); return;
      }
      action(() => {
        if (state.passport) return;
        const next = clone();
        next.passport = { nickname, avatar, id: `BDAY-${uid().replaceAll('-', '').slice(0, 8).toUpperCase()}` };
        credit(next, 50, '首次登岛奖励');
        commit(next); renderPage(); toast('通行证已领取，50枚新手金币已放进口袋。');
        document.querySelector('#main').focus();
      });
    });
  }

  function bindOffice() {
    if(LIVE){bindLiveOffice();return}
    document.querySelector('#demo-islander')?.addEventListener('click', () => action(() => {
      const next = clone(); next.demoIslander = true; commit(next); renderPage(); toast('已开启本地任务演示，不代表正式岛民核验。');
    }));
    const dialog = document.querySelector('#task-dialog');
    let selectedTask = null;
    function completeTask(task) {
      if (state.tasks.includes(task.id)) { toast('这个任务已经领过奖励啦。'); return; }
      if (task.id !== 'arrival' && !state.demoIslander) { toast('请先开启岛民任务演示。'); return; }
      const next = clone(); next.tasks.push(task.id); credit(next, task.reward, task.title);
      for (const n of [3, 6]) if (next.tasks.length >= n && !next.bonuses.includes(n)) { next.bonuses.push(n); credit(next, 25, `${n}任务阶段奖励`); }
      commit(next); dialog?.close(); renderPage(); toast(task.reward ? `任务完成，${task.reward}枚金币已入账！` : '报到成功，小岛记住你来过啦。');
    }
    document.querySelectorAll('[data-task]').forEach((button) => button.addEventListener('click', () => {
      const task = TASKS.find((item) => item.id === button.dataset.task);
      if (task.id === 'arrival') return action(() => completeTask(task));
      selectedTask = task;
      document.querySelector('#task-dialog-title').textContent = task.title;
      document.querySelector('#task-code-message').textContent = '';
      document.querySelector('#task-code').value = '';
      dialog.showModal();
    }));
    dialog?.querySelector('[data-close-dialog]').addEventListener('click', () => dialog.close());
    document.querySelector('#task-code-form')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const code = document.querySelector('#task-code');
      if (code.value.trim().toUpperCase() !== 'ISLAND25') {
        document.querySelector('#task-code-message').textContent = '代码不正确。本地演示请使用 ISLAND25。'; code.setAttribute('aria-invalid', 'true'); code.focus(); return;
      }
      if (selectedTask) action(() => completeTask(selectedTask));
    });
  }

  function bindCheckin() {
    if(LIVE){bindLiveCheckin();return}
    document.querySelector('#checkin-button')?.addEventListener('click', () => action(() => {
      if (!state.passport) return;
      const today = dateKey();
      if (state.checkins.includes(today)) { toast('今天已经签到过啦，明天再来。'); return; }
      const next = clone(); next.checkins.push(today); credit(next, 10, '每日签到');
      commit(next); renderPage(); toast('签到成功，10枚金币已入账。明天也等你！');
    }));
  }

  let drawing = false;
  function bindDraw() {
    if(LIVE){bindLiveDraw();return}
    document.querySelector('#draw-button')?.addEventListener('click', () => action(() => {
      if (drawing || !state.passport || state.balance < 50) return;
      const eligible = state.history.length === 0 ? CARDS.filter((card) => ['SR', 'SSR'].includes(card.rarity)) : CARDS;
      const random = new Uint32Array(1); crypto.getRandomValues(random);
      const card = eligible[Math.floor(random[0] / 4294967296 * eligible.length)];
      const next = clone();
      const first = next.history.length === 0;
      const at = Date.now();
      const entry = next.collection[card.id] || { quantity: 0, firstAt: at };
      entry.quantity += 1; next.collection[card.id] = entry;
      credit(next, -50, `抽卡 · ${card.name}`);
      next.history.unshift({ id: uid(), cardId: card.id, at, first });
      commit(next);
      drawing = true;
      const button = document.querySelector('#draw-button');
      const stage = document.querySelector('#draw-stage');
      button.disabled = true; button.textContent = '肥啾正在为你送信…';
      stage.setAttribute('aria-busy', 'true');
      stage.classList.remove('is-revealed'); stage.classList.add('is-drawing');
      document.querySelector('#stage-card').innerHTML = drawBack();
      document.querySelector('#draw-status').textContent = '金币已扣除，回忆已保存。即使刷新也可以在收藏室找到。';
      let revealTimer;
      let revealed = false;
      const finishWhenMotionStops = () => {
        if (document.querySelector('.world').dataset.motion === 'off' || document.hidden) reveal();
      };
      const reveal = () => {
        if (revealed) return;
        revealed = true;
        clearTimeout(revealTimer);
        document.removeEventListener('buzhi:motion', finishWhenMotionStops);
        document.removeEventListener('visibilitychange', finishWhenMotionStops);
        drawing = false;
        stage.setAttribute('aria-busy', 'false');
        stage.classList.remove('is-drawing'); stage.classList.add('is-revealed');
        document.querySelector('#stage-card').innerHTML = cardMarkup(card);
        document.querySelector('#draw-result-label').textContent = `${card.rarity} · ${card.name}`;
        document.querySelector('#draw-status').textContent = `${first ? '首次赴约礼物！' : '回忆已送达。'}${card.name}，现在拥有 ${entry.quantity} 张。`;
        button.disabled = state.balance < 50; button.textContent = state.balance >= 50 ? '再寄出一份期待 ↗' : '金币暂时不足50枚';
        toast(`${card.rarity}「${card.name}」已收入收藏。`);
        if (first) {
          document.querySelector('#draw-pool-label').textContent = '首抽已完成 · 后续为32张正常池';
          document.querySelector('#draw-pool-description').textContent = '接下来正常卡池包含UR、SSR、SR、R、N，32张卡片每张概率均为1/32。';
        }
      };
      const noMotion = document.querySelector('.world').dataset.motion === 'off' || document.hidden || stage.dataset.deliveryReady !== 'true';
      document.addEventListener('buzhi:motion', finishWhenMotionStops);
      document.addEventListener('visibilitychange', finishWhenMotionStops);
      revealTimer = setTimeout(reveal, noMotion ? 0 : 3000);
    }));
  }

  function showRecoveryOnce(id, recoveryKey) {
    const dialog = document.createElement('dialog');
    dialog.id = 'recovery-once'; dialog.className = 'detail-dialog recovery-dialog';
    dialog.setAttribute('aria-labelledby', 'recovery-heading');
    dialog.innerHTML = `<h2 id="recovery-heading">请保存你的登岛凭证</h2><p>恢复密钥只显示一次，请保存在自己的安全位置。换设备或重新登录时，需要同时提供编号与密钥。不要公开分享密钥。</p><div class="form-field"><label for="recovery-participant">参与者编号（可公开）</label><input id="recovery-participant" readonly autocomplete="off"></div><div class="form-field"><label for="recovery-secret">恢复密钥（请保密）</label><input id="recovery-secret" readonly autocomplete="off" spellcheck="false"></div><div class="actions"><button type="button" class="btn" id="recovery-copy">复制编号与密钥</button><button type="button" class="btn primary" id="recovery-saved">我已安全保存</button></div><p class="small muted">编号本身不是登录密码。此窗口关闭后不会再次展示密钥。</p>`;
    document.querySelector('.world').append(dialog);
    dialog.querySelector('#recovery-participant').value = id;
    dialog.querySelector('#recovery-secret').value = recoveryKey;
    dialog.querySelector('#recovery-copy').onclick = async () => {
      try {
        await navigator.clipboard.writeText(`不吱岛参与者编号：${dialog.querySelector('#recovery-participant').value}\n恢复密钥（请保密）：${dialog.querySelector('#recovery-secret').value}`);
        toast('已复制，请保存到自己的安全位置，不要公开分享');
      } catch { toast('暂时无法自动复制，请手动选中编号和密钥保存'); }
    };
    dialog.querySelector('#recovery-saved').onclick = () => dialog.close();
    dialog.addEventListener('cancel', event => { event.preventDefault(); toast('请先保存凭证，再点击“我已安全保存”'); });
    dialog.addEventListener('close', () => { dialog.replaceChildren(); dialog.remove(); document.querySelector('#copy-id')?.focus(); }, { once: true });
    dialog.showModal();
  }

  function bindLivePassport(){
    document.querySelector('#copy-id')?.addEventListener('click',()=>navigator.clipboard.writeText(state.passport.id).then(()=>toast('编号已复制，请妥善保存恢复密钥')));
    const form=document.querySelector('#passport-form');
    form?.addEventListener('submit',async e=>{e.preventDefault();const nickname=form.elements.nickname.value.trim();if(!nickname||[...nickname].length>20){toast('昵称请填写 1–20 个字符');return}
      try{const password=form.elements.password?.value||'';if(password.length<10){toast('密码至少10个字符');return}const result=await liveApi('register',{nickname,password});liveToken=result.token;sessionStorage.setItem('buzhi-online-token',liveToken);takeProfile(result.profile);showRecoveryOnce(result.id,result.recoveryKey)}catch(err){toast(err.message)}
    });
  }

  function installPassportTabs() {
    const registration = document.querySelector('#passport-form');
    if (state.passport || !registration) return;
    const entry = document.createElement('div'); entry.className = 'passport-entry';
    registration.before(entry);
    const tabs = document.createElement('div'); tabs.className = 'passport-entry-tabs';
    tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', '选择登岛方式');
    tabs.innerHTML = `<button type="button" id="passport-new-tab" role="tab" aria-controls="passport-new-panel">${icon('ticket')} 新岛民登记</button><button type="button" id="passport-returning-tab" role="tab" aria-controls="returning-islander-panel">${icon('anchor')} 欢迎老岛民</button>`;
    const login = document.createElement('section');
    login.id = 'returning-islander-panel'; login.className = 'glass panel';
    login.setAttribute('role', 'tabpanel'); login.setAttribute('aria-labelledby', 'passport-returning-tab');
    login.innerHTML = '<h2>找回你的生日通行证</h2><p class="small muted">使用岛民编号与自己设置的密码登录；旧岛民也可先用原恢复密钥登录并设置新密码。</p><form id="live-login" class="returning-islander-form"><div class="form-field"><label for="returning-id">岛民参与者编号</label><input id="returning-id" name="id" required autocomplete="username" placeholder="BZI-..." spellcheck="false"></div><div class="form-field"><label for="returning-key">登录密码／原恢复密钥</label><input id="returning-key" name="key" required type="password" autocomplete="off" placeholder="输入密码，旧岛民也可使用原密钥"><button type="button" class="btn text" id="toggle-returning-key" aria-pressed="false">显示</button></div><button class="btn primary full" type="submit">登录不吱岛 →</button><p class="small muted">旧恢复密钥仍可用于账户迁移，请勿向他人透露。</p></form>';
    if (LIVE) {
      const recovery = document.createElement('div');
      recovery.className = 'glass panel';
      recovery.style.marginTop = '16px';
      recovery.innerHTML = '<h3>忘记密码或恢复密钥？</h3><p class="small muted">使用岛民编号和已认证抖音号申请找回。岛主核验身份后，会通过私密渠道提供一次性重置凭证。</p><form id="identity-recovery-form"><div class="form-field"><label>岛民编号<input name="userId" required placeholder="BZI-..." maxlength="110"></label></div><div class="form-field"><label>已认证抖音号<input name="douyinId" required maxlength="64" autocomplete="off"></label></div><button class="btn" type="submit">提交找回申请</button></form><details style="margin-top:16px"><summary>已经收到岛主发放的重置凭证？</summary><form id="identity-reset-form"><div class="form-field"><label>找回申请编号<input name="requestId" required placeholder="REC-..."></label></div><div class="form-field"><label>一次性重置凭证<input name="token" required autocomplete="off"></label></div><div class="form-field"><label>设置新密码（至少10字符）<input type="password" name="password" required minlength="10" maxlength="128" autocomplete="new-password"></label></div><button class="btn primary" type="submit">设置新密码</button></form></details><p class="small muted" id="identity-recovery-status" role="status"></p>';
      login.append(recovery);
      const status = recovery.querySelector('#identity-recovery-status');
      recovery.querySelector('#identity-recovery-form').onsubmit = async event => {event.preventDefault();const form=event.currentTarget;try{const out=await liveApi('recovery/request',{userId:form.elements.userId.value.trim(),douyinId:form.elements.douyinId.value.trim()});status.textContent=out.message}catch(err){status.textContent=err.message}};
      recovery.querySelector('#identity-reset-form').onsubmit = async event => {event.preventDefault();const form=event.currentTarget;try{const out=await liveApi('recovery/reset',{requestId:form.elements.requestId.value.trim(),token:form.elements.token.value.trim(),password:form.elements.password.value});status.textContent=out.message;form.reset()}catch(err){status.textContent=err.message}};
    }
    const newPanel = document.createElement('section'); newPanel.id = 'passport-new-panel';
    newPanel.setAttribute('role', 'tabpanel'); newPanel.setAttribute('aria-labelledby', 'passport-new-tab');
    registration.setAttribute('aria-labelledby', 'passport-new-tab');
    if(LIVE){const passwordLabel=document.createElement('label');passwordLabel.className='form-field';passwordLabel.innerHTML='<span>设置登录密码（至少10个字符）</span><input name="password" type="password" required minlength="10" maxlength="128" autocomplete="new-password" placeholder="自己设置一个安全密码">';registration.querySelector('button[type="submit"]')?.before(passwordLabel)}
    newPanel.append(registration); entry.append(tabs, newPanel, login);
    const switches = Array.from(tabs.querySelectorAll('[role="tab"]'));
    const keyField = login.querySelector('#returning-key');
    const keyToggle = login.querySelector('#toggle-returning-key');
    const heading = document.querySelector('.ticket-office-head h1');
    const subtitle = document.querySelector('.ticket-office-head p');
    const originalTitle = heading.textContent, originalSubtitle = subtitle.textContent;
    function select(index, focus = false) {
      switches.forEach((button, i) => { button.setAttribute('aria-selected', String(i === index)); button.tabIndex = i === index ? 0 : -1; });
      newPanel.hidden = index !== 0; login.hidden = index !== 1;
      document.querySelector('.ticket-gift').hidden = index !== 0;
      heading.textContent = index === 0 ? originalTitle : '欢迎回岛，老岛民';
      subtitle.textContent = index === 0 ? originalSubtitle : '使用编号和密码，回到熟悉的小岛。';
      keyField.type = 'password'; keyToggle.textContent = '显示密钥'; keyToggle.setAttribute('aria-pressed', 'false');
      if (focus) switches[index].focus();
    }
    switches.forEach((button, i) => button.addEventListener('click', () => select(i)));
    tabs.addEventListener('keydown', event => {
      const current = switches.indexOf(event.target);
      if (current < 0) return;
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : ['ArrowLeft', 'ArrowRight'].includes(event.key) ? 1 - current : null;
      if (next !== null) { event.preventDefault(); select(next, true); }
    });
    keyToggle.onclick = () => { const visible = keyField.type === 'password'; keyField.type = visible ? 'text' : 'password'; keyToggle.textContent = visible ? '隐藏密钥' : '显示密钥'; keyToggle.setAttribute('aria-pressed', String(visible)); };
    if (!LIVE) {
      const note = document.createElement('p'); note.className = 'small passport-preview-note';
      note.textContent = '这里只是设计预览，请勿输入真实密钥。找回账户需在正式网站操作；本地演示记录不能跨设备恢复。';
      login.querySelector('h2').after(note);
      login.querySelectorAll('input').forEach(input => { input.readOnly = true; input.autocomplete = 'off'; });
      login.querySelectorAll('button').forEach(button => { button.disabled = true; });
    }
    login.querySelector('form').onsubmit = async event => {
      event.preventDefault(); if (!LIVE) return;
      const form = event.currentTarget;
      try { const data = await liveApi('login', { id: form.elements.id.value.trim(), password: form.elements.key.value, recoveryKey: form.elements.key.value.trim() }); liveToken = data.token; sessionStorage.setItem('buzhi-online-token', liveToken); takeProfile(data.profile); }
      catch (err) { toast(err.message); }
    };
    select(0);
  }
  function bindLiveOffice(){
    const dialog=document.querySelector('#task-dialog');if(!dialog)return;let task=null;
    const writing=dialog.querySelector('#task-writing'),count=dialog.querySelector('#task-writing-count'),tip=dialog.querySelector('#task-dialog-tip');
    const updateCount=()=>{const length=Array.from(writing.value.trim().replace(/\s/g,'')).length;count.textContent=length+' / 15 字';count.style.color=length>=15?'#16876a':''};
    writing.addEventListener('input',updateCount);
    document.querySelectorAll('[data-task]').forEach(button=>{button.onclick=()=>{task=TASKS.find(t=>t.id===button.dataset.task);if(!task||task.id==='arrival')return;const isWriting=task.id==='letter'||task.id==='memory';dialog.querySelector('#task-dialog-title').textContent=task.title;dialog.querySelector('#task-writing-wrap').hidden=!isWriting;dialog.querySelector('#task-code-wrap').hidden=isWriting;dialog.querySelector('#task-code').required=!isWriting;dialog.querySelector('#task-code').value='';writing.value='';updateCount();tip.textContent=isWriting?'至少填写15个非空白字符，提交后自动获得25金币。':'请填写岛主私信发放的一次性完成代码。';dialog.showModal()}});
    dialog.querySelector('[data-close-dialog]')?.addEventListener('click',()=>dialog.close());
    dialog.querySelector('#task-code-form')?.addEventListener('submit',async e=>{e.preventDefault();if(!task)return;const writingTask=task.id==='letter'||task.id==='memory';const content=writing.value.trim();if(writingTask&&Array.from(content.replace(/\s/g,'')).length<15){toast('内容不少于15个字哦');return}const submit=e.submitter;if(submit)submit.disabled=true;try{const profile=await liveApi(writingTask?'task-writing':'redeem',writingTask?{taskId:task.id,content}:{taskId:task.id,code:dialog.querySelector('#task-code').value.trim()});dialog.close();takeProfile(profile);toast('任务完成，25金币已到账！')}catch(err){toast(err.message);if(submit)submit.disabled=false}});
  }
  function bindLiveCheckin(){
    document.querySelector('#checkin-button')?.addEventListener('click',async()=>{try{takeProfile(await liveApi('checkin',{}));toast('今日签到成功，10 金币已保存')}catch(err){toast(err.message)}});
  }
  function bindLiveDraw(){
    document.querySelector('#draw-button')?.addEventListener('click',async()=>{
      if(drawing||!state.passport||state.balance<50)return;drawing=true;
      const button=document.querySelector('#draw-button');button.disabled=true;
      try{const result=await liveApi('draw',{});const cardInfo=liveCatalog.find(c=>c.id===result.card.id);if(!cardInfo)throw Error('卡片目录缺少映射，请联系岛主');
        const card=CARDS.find(c=>c.id===cardInfo.previewId);
        const first=state.history.length===0;takeProfile(result.profile);drawing=true;
        const stage=document.querySelector('#draw-stage');
        stage.classList.remove('is-revealed');stage.classList.add('is-drawing');stage.setAttribute('aria-busy','true');
        document.querySelector('#stage-card').innerHTML=drawBack();
        document.querySelector('#draw-status').textContent='服务器已扣币并保存收藏，肥啾正在送达…';
        const show=()=>{if(!drawing)return;drawing=false;stage.classList.remove('is-drawing');stage.classList.add('is-revealed');stage.setAttribute('aria-busy','false');document.querySelector('#stage-card').innerHTML=cardMarkup(card);document.querySelector('#draw-result-label').textContent=card.rarity+' · '+card.name;document.querySelector('#draw-status').textContent='已存入收藏 · '+card.name;button.disabled=state.balance<50;button.textContent='再寄出一份期待 ↗';};
        setTimeout(show,document.querySelector('.world').dataset.motion==='off'||document.hidden?0:3000);
        document.addEventListener('buzhi:motion',()=>{if(drawing&&document.querySelector('.world').dataset.motion==='off')show()},{once:true});
        document.addEventListener('visibilitychange',()=>{if(document.hidden)show()},{once:true});
      }catch(err){drawing=false;button.disabled=false;toast(err.message)}
    });
  }
  function bindCollection() {
    fillCollection();
    document.querySelectorAll('[data-filter]').forEach((button) => button.addEventListener('click', () => {
      filters.ownership = button.dataset.filter;
      document.querySelectorAll('[data-filter]').forEach((tab) => tab.setAttribute('aria-pressed', String(tab === button)));
      fillCollection();
    }));
    document.querySelector('#card-search').addEventListener('input', (event) => { filters.search = event.target.value.trim(); fillCollection(); });
    document.querySelector('#rarity-filter').addEventListener('change', (event) => { filters.rarity = event.target.value; fillCollection(); });
    const dialog = document.querySelector('#card-detail');
    let trigger;
    document.querySelector('#main').addEventListener('click', (event) => {
      const button = event.target.closest('[data-card]'); if (!button) return;
      const card = CARDS.find((item) => item.id === button.dataset.card); if (!card) return;
      trigger = button;
      const owned = state.collection[card.id];
      dialog.innerHTML = `<button type="button" class="dialog-close" aria-label="关闭卡片详情">${icon('close')}</button>${cardMarkup(card)}<h2 id="card-detail-title">${esc(card.name)}</h2><div class="card-meta"><span class="pill">${card.rarity}</span><span class="pill">${owned ? `已拥有 ${owned.quantity} 张` : '等待相遇'}</span></div><p>${esc(card.story)}</p><p class="small muted">角色：${esc(card.characters)}${owned ? `<br>首次获得：${timeText(owned.firstAt)}` : ''}</p><p class="dialog-oc">${LIVE ? '更多角色故事即将开放；实体卡兑换目前暂未开放。' : '角色资料与个人 OC 页面将在后续接入。当前是示意卡面，不开放实体兑换。'}</p>`;
      dialog.querySelector('button').onclick = () => dialog.close(); dialog.showModal();
    });
    dialog.addEventListener('close', () => trigger?.focus());
  }

  // Presentation-only rearrangements. Keep the existing forms, controls and IDs
  // so account/reward behavior remains independent of each room's composition.
  function applyPageLayout() {
    const main = document.querySelector('#main');
    const modeLabel = document.querySelector('.demo-line > span:first-child');
    if (LIVE && modeLabel) modeLabel.innerHTML = '<i class="status-dot"></i>正式账户 · 数据由服务器保存';
    const footerNote = document.querySelector('.site-footer > div:last-child')?.lastChild;
    if (footerNote?.nodeType === Node.TEXT_NODE) footerNote.textContent = LIVE ? '生日回忆 · 与你相遇' : 'UI 演示预览 · 数据仅保存在当前浏览器';
    const replaceOpening = (markup) => { const old = main.querySelector('.page-heading'); if (old) old.outerHTML = markup; };
    if (PAGE === 'passport') {
      replaceOpening(`<header class="ticket-office-head"><span class="room-emblem">${icon('ticket')}</span><div><span class="room-label">不吱岛 · 登岛登记处</span><h1>把名字留在小岛</h1><p>领一张生日通行证，留一份属于你的回忆。</p></div><span class="ticket-gift">${icon('coin')} 首次登岛 +50</span></header>`);
      const privacy = main.querySelector('#passport-form .privacy-note');
      if (privacy) privacy.textContent = LIVE ? '请勿填写平台 UID 等私密资料。注册不代表岛民核验；头像可从庆典提供的款式中选择。' : '仅供演示，请勿填写平台 UID 等私密资料。正式核验由主网站接入。';
      const hint = main.querySelector('#nickname-hint'); if (hint) hint.textContent = `1—${LIVE ? 20 : 24}个字符，昵称可重复，身份由唯一编号区分。`;
      const savedNote = main.querySelector('.passport-grid > aside .panel > .small');
      if (savedNote) savedNote.textContent = LIVE ? '通行证、金币与卡片由服务器保存。请安全保留恢复密钥，以便重新登录。' : '通行证、金币与卡片只保存在当前浏览器。刷新后可以继续，换设备不能自动恢复。';
      const recoveryNote = main.querySelector('.passport-grid > aside > .info-note');
      if (recoveryNote) recoveryNote.innerHTML = LIVE ? '<strong>妥善保留恢复密钥</strong><br>恢复密钥只在注册时显示一次。重新登录需要参与者编号和恢复密钥；公开编号本身不是密码。' : '<strong>请使用同一浏览器继续体验</strong><br>本地预览没有正式账户或恢复密钥，换设备不能恢复。正式版不会公开完整平台 UID。';
      main.querySelector('#copy-id')?.setAttribute('aria-label', '复制参与者编号');
      const formTitle = main.querySelector('#passport-form h2');
      if (formTitle) formTitle.textContent = '领取你的生日通行证';
    } else if (PAGE === 'office') {
      replaceOpening(`<header class="notice-board-head"><div class="office-sign"><span class="room-label">庆典筹备公告栏 · ISLAND OFFICE</span><h1>岛民事务所</h1><p>做一点小事，把快乐和金币一起装进口袋。</p></div><div class="board-wallet">${icon('coin')}<span>我的庆典金币<strong data-balance>${state.balance}</strong></span></div></header>`);
      const notice = main.querySelector('.office-layout > div > .info-note');
      if (notice) {
        const details = document.createElement('details'); details.className = 'office-verification';
        details.innerHTML = '<summary>访客与核验岛民有什么不同？</summary>';
        details.append(...notice.childNodes); notice.replaceWith(details);
      }
      const codeHelp = main.querySelector('#task-code-form > .small');
      if (codeHelp && !LIVE) codeHelp.innerHTML = '本地演示可输入 <strong>ISLAND25</strong> 体验；正式代码由岛主私信发放。';
    } else if (PAGE === 'checkin') {
      replaceOpening(`<header class="calendar-page-head"><div><span class="room-label">每天留一个小脚印</span><h1>小岛签到日历</h1></div><span class="calendar-date">${icon('sun')}<strong>${dateKey().slice(5).replace('-', ' / ')}</strong><small>北京时间</small></span></header>`);
      const days = main.querySelector('.days'), action = main.querySelector('.checkin-summary');
      if (days && action) days.before(action);
      const seventh = main.querySelector('.sidebar-card h3'); if (seventh) seventh.textContent = '七日纪念角';
      const notice = main.querySelector('main > .info-note'); if (LIVE && notice) notice.textContent = '签到与金币由服务器按北京时间记录，页面以正式账户返回的状态为准。';
    } else if (PAGE === 'collection') {
      replaceOpening(`<header class="album-cover"><div><span class="room-label">一册属于你的生日回忆</span><h1>${icon('cards')} 回忆收藏室</h1><p>把相遇的瞬间，慢慢收藏。</p></div></header>`);
      const summary = main.querySelector('.collection-summary'); if (summary) main.querySelector('.album-cover').append(summary);
    } else if (PAGE === 'islanders') {
      replaceOpening(`<header class="cast-room-head"><div class="cast-heading-copy"><span class="room-label">住在不吱岛的人们 · ISLAND PORTRAITS</span><h1><span>岛民</span><span>画廊</span></h1></div><p>每一位岛民，<br>都有自己的故事。</p><span class="pill pink">${LIVE ? '更多岛民故事陆续开放' : '角色示意 · 正式 OC 待接入'}</span></header>`);
      const modeBar = main.querySelector('.oc-mode-bar'); if (modeBar && modeBar.querySelectorAll('button').length === 1) modeBar.hidden = true;
      const story = document.createElement('details'); story.className = 'oc-world-intro island-origin';
      story.innerHTML = '<summary>从雪啾国到不吱岛，读读我们的故事</summary><p>菜菜与吱吱曾是雪啾国的青春偶像。后来，她们把所有积蓄换成了一座岛。<br>这里没有完美剧本，只有一点八卦、很多陪伴，和一个留给你的位置。</p>';
      main.querySelector('.oc-gallery').after(story);
    } else if (PAGE === 'mailbox') {
      replaceOpening(`<header class="letter-room-head"><span class="letter-room-mark">${icon('mail')}</span><div><span class="room-label">给亲爱的岛民</span><h1>岛主来信</h1><p>岛上的近况，和想认真说给你听的话。</p></div><span class="mail-seal" aria-hidden="true">不吱岛<br>寄给你 ♡</span></header>`);
      const letters = main.querySelectorAll('.letter'); letters.forEach((letter, i) => { letter.id = `island-letter-${i + 1}`; });
      const side = main.querySelector('.mailbox-side');
      side.innerHTML = `${icon('mail')}<h2>今天，拆一封信</h2><p>来自菜菜与吱吱</p><nav aria-label="信件目录"><a href="#island-letter-1">生日邀请 ${icon('arrow')}</a><a href="#island-letter-2">庆典小贴士 ${icon('arrow')}</a></nav>`;
      if (LIVE) {
        main.querySelector('.letters').id = 'live-notices';
        side.innerHTML = `${icon('mail')}<h2>来自岛主的消息</h2><p>公告由服务器更新</p><nav aria-label="信件目录"><a href="#live-notices">查看最新来信 ${icon('arrow')}</a></nav>`;
      }
    } else if (PAGE === 'effects') {
      replaceOpening(`<header class="playground-head"><span aria-hidden="true">✦</span><div><span class="room-label">设计审阅专用 · 非正式领奖页面</span><h1>小岛光影游乐场</h1><p>水波、星光和一只送来回忆的肥啾。</p></div></header>`);
      const intro = main.querySelector('.effects-intro');
      intro.outerHTML = '<aside class="playground-note">电脑移动鼠标、手机轻触即可体验；右上角可以统一关闭动效。</aside>';
    }
  }

  function decoratePageHeading() {
    const title = document.querySelector('main h1');
    if (!title) return;
    const host = title.closest('header, .postal-intro, .home-hero');
    if (!host) return;
    host.dataset.sceneHeading = PAGE;
    const pairs = { home:['jellyfish','orbit'], passport:['bottle','orbit'], office:['postcard','orbit'], checkin:['cloud','orbit'], draw:['shell','orbit'], collection:['shell','orbit'], islanders:['jellyfish','shell'], mailbox:['postcard','cloud'], guide:['bottle','cloud'], effects:['orbit','jellyfish'] };
    const decoration = document.createElement('div'); decoration.className = 'heading-stickers';
    decoration.setAttribute('aria-hidden', 'true');
    decoration.innerHTML = (pairs[PAGE] || pairs.home).map(name => `<svg class="island-sticker sticker-${name}" viewBox="0 0 160 160" fill="none" focusable="false"><use href="assets/island-stickers.svg#${name}"></use></svg>`).join('');
    host.append(decoration);
    const scenes = {
      home:['sunset','wave','starfish','tape'], passport:['bottle','shell','wave','tape'],
      office:['lantern','starfish','sprig','tape'], checkin:['sunset','cloud','sprig','starfish'],
      draw:['moon-sea','lantern','wave','tape'], collection:['moon-sea','shell','starfish','tape'],
      islanders:['jellyfish','shell','wave','sprig'], mailbox:['bottle','cloud','tape','wave'],
      guide:['sunset','wave','starfish','tape'], effects:['spiral-sea','jellyfish','starfish','cloud']
    };
    const scene = document.createElement('div');scene.className='scene-decor';scene.dataset.scene=PAGE;
    scene.setAttribute('aria-hidden','true');
    scene.innerHTML=(scenes[PAGE]||scenes.home).map(name=>`<svg class="island-sticker sticker-${name}" viewBox="0 0 160 160" fill="none" focusable="false"><use href="assets/island-stickers.svg?v=20261018-sea2#${name}"></use></svg>`).join('');
    const anchor = document.querySelector(({home:'.news-strip',draw:'.postal-collection',collection:'.collection-note',islanders:'.oc-gallery'})[PAGE]||'main');
    if (anchor && (PAGE === 'home' || PAGE === 'draw')) anchor.before(scene);
    else if (anchor && (PAGE === 'collection' || PAGE === 'islanders')) anchor.after(scene);
    else document.querySelector('main').append(scene);
  }

  function renderPage() {
    const renderers = { home: renderHome, passport: renderPassport, office: renderOffice, checkin: renderCheckin, draw: renderDraw, collection: renderCollection, mailbox: renderMailbox, guide: renderGuide, islanders: renderIslanders, effects: renderEffects };
    const main = document.querySelector('#main');
    main.innerHTML = renderers[PAGE]();
    applyPageLayout();
    decoratePageHeading();
    const binders = { passport: bindPassport, office: bindOffice, checkin: bindCheckin, draw: bindDraw, collection: bindCollection };
    binders[PAGE]?.();
    if (PAGE === 'passport') installPassportTabs();
    updateWallet();
    document.dispatchEvent(new CustomEvent('buzhi:render'));
    if(LIVE)document.querySelectorAll('img[src^="/assets/decor/"]').forEach(img=>{img.onerror=()=>{img.onerror=null;img.src=img.src.includes('island-map')?'assets/buzhi-archipelago-soft-palette-draft.png':'assets/island.svg'}});
    if(LIVE){refreshLiveNotices();refreshManagedArtwork()};
  }

  function renderGuide() {
    const stops = [
      ['全岛总览', '一片群岛，一起慢慢逛', '山间的风越过海湾，石桥与栈道连接着有人居住的小岛。主要庆典地点都在主岛；左右滑动地图，也看看远处的海岸。', 'passport', '领取生日通行证', 0, 0, 'island'],
      ['庆典码头', '海风把你，带到这里', '灯塔为来客引路，客船与渔船在开放的港湾停靠。沿宽阔码头走进庆典广场，菜菜与吱吱为你留好了位置。', 'passport', '去领取通行证', 580, 755, 'anchor'],
      ['岛民事务所', '把小小心意，装进口袋', '完成庆典任务，收下属于你的金币。让参与庆典的每一步，都变成下一份相遇的期待。', 'office', '去看看庆典任务', 855, 510, 'flag'],
      ['肥啾邮局', '让肥啾，替你寄出期待', '一只肥啾，一封来信。花 50 金币拆开生日回忆卡，把今天的心愿寄给未来的自己。', 'draw', '去抽生日回忆卡', 500, 568, 'mail'],
      ['回忆收藏室', '相遇的瞬间，都有位置', '在这里翻翻已经收好的回忆。那些抽中的卡、喜欢的故事，会陪你一起留在小岛。', 'collection', '打开我的收藏室', 855, 638, 'cards'],
      ['生日庆典', '今天的主角，正在等你', '小小的双人石雕在花坛里，生日横幅与气球迎着海风。10 月 20 日，带上通行证来主岛广场一起赴约吧。', 'passport', '带上通行证赴约', 675, 612, 'cake'],
    ];
    const residentialIslands = [
      ['🌊','潮汐岛','海滩、贝壳与海边市集','tide'],
      ['🌙','星汐岛','星光码头、观星台与夜空','star'],
      ['🪼','雾屿','雾中灯塔与安静的图书馆','mist'],
      ['🌸','花汐岛','花田、温室与创作聚会','bloom']
    ];
    return `<section class="guide-explorer" id="voyage" aria-label="不吱岛登岛地图">
      <header class="guide-map-heading"><div><span class="room-label">不吱岛 · 群岛散步指南</span><h1>一起逛逛不吱岛</h1><p>不急着抵达，先让海风带路。小屏左右滑动，看看整片群岛。</p></div><button class="map-overview" id="voyage-overview" type="button" aria-pressed="true">${icon('home')} 全岛地图</button></header>
      <div class="voyage-map" tabindex="0" role="region" aria-label="群岛地图，可左右滚动"><div class="guide-map-stage">
        <svg class="guide-map-art" viewBox="0 0 1584 993" role="img" aria-label="不吱岛群岛全景：山峦、海滩、住宅、灯塔与主岛庆典广场"><g id="map-camera"><image href="${'assets/buzhi-archipelago-soft-palette-draft.png'}" width="1584" height="993"/>
          <g class="guide-water-motion" aria-hidden="true" fill="none" stroke="#e3ffff" stroke-width="2" stroke-linecap="round" stroke-dasharray="12 26 3 30"><path d="M70 820q55 20 110 0m-25 32q50 18 100 0M960 880q60 22 125 0m-140 32q55 17 100 0M1160 365q75 16 150-4M1470 610q45 20 90 0"/></g>
          <g class="guide-cloud-motion" aria-hidden="true" fill="#fff" opacity=".16"><ellipse cx="965" cy="210" rx="125" ry="18"/><ellipse cx="1060" cy="232" rx="100" ry="12"/><ellipse cx="60" cy="937" rx="150" ry="32"/></g>
        </g></svg>
        <div class="map-pins" role="group" aria-label="主岛地点">${stops.slice(1).map(([name,,,,,x,y,motif],i)=>`<button class="island-map-pin" type="button" data-map-stop="${i+1}" data-map-x="${x}" data-map-y="${y}" aria-label="查看${name}" aria-pressed="false">${icon(motif)}<span>${name}</span></button>`).join('')}</div>
      </div></div>
      <div class="guide-map-toolbar"><p class="guide-map-hint">点选主岛地名 · 左右滑动浏览群岛</p><div class="voyage-buttons" aria-label="导览翻页"><button class="btn" id="voyage-prev" type="button" aria-label="上一站" disabled>← 上一站</button><button class="btn" id="voyage-next" type="button" aria-label="下一站">下一站 →</button></div></div>
      <section class="guide-info glass" aria-live="polite" aria-atomic="true" aria-labelledby="voyage-card-title"><div class="guide-info-meta"><span id="voyage-count">01 / 06</span><span id="voyage-location">全岛总览</span></div><h2 id="voyage-card-title">${stops[0][1]}</h2><p id="voyage-card-copy">${stops[0][2]}</p><a class="guide-destination" id="voyage-destination" href="passport.html">${stops[0][4]} ${icon('arrow')}</a></section>
      <template id="voyage-stops">${stops.map(([name,title,text,route,action])=>`<section data-guide-entry data-location="${esc(name)}"><h2>${esc(title)}</h2><p>${esc(text)}</p><a href="${PATHS[route][0]}">${esc(action)} ${icon('arrow')}</a></section>`).join('')}</template></section>`;
  }

  function renderIslanders() {
    const people = [
      ['菜菜', '生日主角 / 岛主', '把每一天的小小快乐，都唱成一首歌。', 'pink'],
      ['吱吱', '庆生搭档 / 共同岛主', '派对的小灯已经挂好，就等你来了。', 'blue'],
      ...(LIVE ? liveOcProfiles.map((oc,i)=>[oc.name,'岛民 OC',oc.description||'一位新的岛民已经登岛。',['green','purple','pink','blue'][i%4],(managedAssets[oc.image.replace('/assets/','')]?assetUrl(oc.image.replace('/assets/','')):null)]) : [
        ['岛民 OC · 位置 01', '个人形象待接入', '这里将展示拥有专属形象的岛民与职业设定。', 'green'],
        ['岛民 OC · 位置 02', '个人形象待接入', '属于岛民的故事，会在这里慢慢展开。', 'purple']
      ])
    ];
    return heading('08', 'Every islander has a story', LIVE ? '岛民画廊' : '岛民画廊 · 布局预览', '左右拖动、点击卡片或使用箭头，欣赏岛上的角色。' + (LIVE ? '部分岛民的资料仍在筹备，敬请期待。' : '这里暂未接入正式 OC 资料。')) + `<div class="oc-mode-bar"><div class="filter-tabs" aria-label="角色展示方式"><button type="button" data-oc-mode="slider" aria-pressed="true">横向画廊</button></div><span class="pill">${LIVE ? '岛上的相遇' : '角色图为示意'}</span></div><section class="glass oc-gallery" id="oc-gallery" data-mode="slider" aria-label="角色欣赏画廊"><div class="oc-count"><span id="oc-step">01</span><small>/ ${String(people.length).padStart(2,'0')}</small></div><div class="oc-track" id="oc-track">${people.map(([name, role, text, tone, image], index) => `<button type="button" class="oc-slide oc-${tone}" data-oc="${index}" aria-label="查看${esc(name)}"><span class="oc-art"><img src="${image||activeAsset('decor/home-poster.webp','assets/island.svg')}" alt="${esc(name)}的角色插画" draggable="false"></span><span class="oc-caption"><small>${esc(role)}</small><strong>${esc(name)}</strong><span>${esc(text)}</span></span></button>`).join('')}</div><div class="oc-slider-controls"><button class="btn" id="oc-prev" type="button" aria-label="上一个角色">←</button><span id="oc-help">拖动欣赏 · 松手后轻轻停靠</span><button class="btn" id="oc-next" type="button" aria-label="下一个角色">→</button></div></section><div class="info-note">${LIVE ? '岛民 OC 人物资料由岛主后台管理，隐藏人物不会在此展示。' : '菜菜与吱吱之外的岛民位置均为布局占位，不代表已经创建了新的 OC。个人角色故事与资料页将陆续开放。'}</div>`;
  }

  function renderEffects() {
    return heading('✦', 'A little playground of light', '不吱岛 · 特效体验', '从这里逐个打开效果。右上角可以统一关闭动效，手机以触控方式体验。') + `<div class="effects-intro glass"><span class="effect-big-star">✦</span><div><h2>海风动起来，回忆展开来。</h2><p>电脑上移动鼠标看看星光。正式角色素材还未接入，当前是可操作的多页面预览。</p></div></div><div class="effects-index">${[
      ['01', '首页水面折射', '流动的水面扭曲与细碎光纹，作为首页海面背景。', 'home', 'wave'],
      ['02', '星光鼠标与点击反馈', '电脑跟随鼠标，手机点击短暂绽放；输入时保留文字光标。', 'home', 'sparkles'],
      ['03', '展开一册生日回忆', '当前开放扇形展馆，可拖动、翻页、筛选和查看卡片；其他排列由设置控制。', 'collection', 'cards'],
      ['04', '肥啾任务进度', '完成真实演示任务后，小肥啾向3／6／9任务里程碑前进。', 'office', 'bird'],
      ['05', '沿着地图登岛', '在大地图上点选地名，或用下一站轻轻巡游。', 'guide', 'anchor'],
      ['06', '岛民画廊', '横向欣赏角色海报，阅读名字与身份，预留未来个人 OC 入口。', 'islanders', 'heart'],
      ['07', '肥啾叼卡与生日流星雨', '肥啾叼着来信轻轻浮动，抽取时带着大流星送达，揭晓后停在卡片旁庆祝。', 'draw', 'mail'],
      ['08', '签到的小小星光', '每日签到完成时短暂绽放，不持续干扰阅读。', 'checkin', 'sun'],
    ].map(([n, name, text, key, motif]) => `<a class="glass effect-entry" href="${key === 'collection' ? 'collection.html#appreciate' : PATHS[key][0]}"><span class="effect-entry-top"><span class="mono">${n}</span>${icon(motif)}</span><h2>${name}</h2><p>${text}</p><span class="effect-entry-bottom">打开体验 ${icon('arrow')}</span></a>`).join('')}</div><div class="info-note">根据你提供的参考代码重写、适配到不吱岛。缩略图网格原案例尚未拿到完整源码；当前卡片放大采用本地实现，没有声称复刻该案例。所有数据仍为本地演示。</div>`;
  }

  window.addEventListener('storage', (event) => {
    if (event.key === KEY) location.reload();
  });
  if(LIVE)TASKS=LIVE_TASKS;
  renderShell();
  if(LIVE)liveInit();else renderPage();
  const effectsScript = document.createElement('script');
  effectsScript.src = new URL('effects.js?v=20261020-pencil1', document.currentScript.src).href;
  document.body.append(effectsScript);
  const pencilScript=document.createElement('script');
  pencilScript.src=new URL('pencil-case.js?v=20261020-pencil1',document.currentScript.src).href;
  document.body.append(pencilScript);
})();

