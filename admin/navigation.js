/* Existing admin routes grouped for scanning; no functional entry is removed. */
(() => {
 'use strict';
 const pages=[['island-mail','岛民信箱','#islandGiftPanel'],['quiz-results','默契小测记录','#quizResultsPanel'],['task-writings','文字任务收件箱','#taskWritingsPanel'],['messages','岛民留言板','#islandMessagesPanel'],['overview','活动概览','#stats'],['activity','活动时间','#activityForm'],['site-maintenance','网站维护','#siteMaintenancePanel'],['codes','兑换码管理','#generate'],['announcements','公告管理','#noticeForm'],['visual','视效管理','#visualPanel'],['users','参与者列表','#users'],['recovery','岛民查找与找回','#islanderRecoveryPanel'],['account-recovery','账号找回审核','#recoveryReviewPanel'],['coins','金币发放','#coinGrantPanel'],['user-details','参与者详情','#userDetailPanel'],['members','岛民认证','#membershipPanel'],['visitors','游客管理','#visitorPanel'],['audit','操作记录','#adminAuditPanel'],['residents','居民物语','#residentAdminPanel'],['characters','OC 人物','#ocProfilesPanel'],['cards','回忆卡片','#cardProfilesPanel'],['assets','页面素材','#assetManagePanel'],['asset-check','素材检查','#assetAuditPanel'],['backups','备份与导出','#operationsPanel'],['test-cleanup','测试记录清理','#testCleanupPanel']];
 const groups=[
  ['活动与奖励',['overview','activity','codes','coins']],
  ['岛民与审核',['users','members','visitors','recovery','account-recovery','user-details']],
  ['内容与互动',['island-mail','quiz-results','task-writings','messages','announcements','residents','characters','cards']],
  ['站点与维护',['site-maintenance','visual','assets','asset-check','backups','test-cleanup','audit']]
 ];
 const sections=new Map(pages.map(([slug,,selector])=>[slug,document.querySelector(selector)?.closest('section')]));
 const media=matchMedia('(max-width:680px)');
 const style=document.createElement('style');
 style.textContent=`
 #adminNavigation[hidden]{display:none!important}
 #adminNavigation .admin-nav-header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px}
 #adminRouteHeading{margin:0;font-size:19px}
 #adminNavigation .admin-nav-groups{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;align-items:start}
 #adminNavigation details{min-width:0;border:1px solid #b9d6e6;border-radius:15px;background:#ffffff61;overflow:hidden}
 #adminNavigation summary{cursor:pointer;min-height:44px;padding:12px 14px;font-weight:700;font-size:14px;color:#356786;list-style-position:inside}
 #adminNavigation summary small{float:right;color:#7696ab;font-weight:400}
 #adminNavigation details[data-current=true]>summary{background:#dcebf8;color:#2c577f}
 #adminNavigation .admin-group-links{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;padding:0 10px 10px}
 #adminNavigation a{display:flex;align-items:center;min-height:44px;padding:9px 11px;border:1px solid #b6d3e3;border-radius:10px;background:#ffffffbd;text-decoration:none;color:#285777;font-size:13px;line-height:1.5;overflow-wrap:anywhere}
 #adminNavigation a[aria-current=page]{background:#537fba;color:white;border-color:#537fba}
 #adminNavigation a:focus-visible,#adminNavigation summary:focus-visible{outline:3px solid #537fba;outline-offset:2px}
 @media(max-width:680px){#adminNavigation{padding:14px}#adminNavigation .admin-nav-groups{grid-template-columns:1fr;gap:8px}#adminRouteHeading{font-size:17px}#adminRouteLogout{padding:8px 10px}}
 `;
 document.head.append(style);
 const nav=document.createElement('nav');nav.id='adminNavigation';nav.className='glass';nav.setAttribute('aria-label','后台导航');nav.hidden=true;
 const header=document.createElement('div');header.className='admin-nav-header';
 const heading=document.createElement('h2');heading.id='adminRouteHeading';header.append(heading);
 const logout=document.createElement('button');logout.type='button';logout.id='adminRouteLogout';logout.textContent='退出管理';logout.onclick=()=>$('logout').click();header.append(logout);nav.append(header);
 const grid=document.createElement('div');grid.className='admin-nav-groups';nav.append(grid);
 for(const [label,slugs] of groups){
  const details=document.createElement('details');details.dataset.adminGroup=label;details.open=!media.matches;
  const summary=document.createElement('summary');summary.textContent=label;const count=document.createElement('small');count.textContent=String(slugs.length);summary.append(count);details.append(summary);
  const links=document.createElement('div');links.className='admin-group-links';details.append(links);
  for(const slug of slugs){
   const page=pages.find(page=>page[0]===slug);if(!page||!sections.get(slug))continue;
   const a=document.createElement('a');a.href='/admin/'+slug;a.textContent=page[1];
   a.onclick=event=>{if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();history.pushState(null,'',a.href);show();window.scrollTo(0,0)};
   links.append(a);
  }
  grid.append(details);
 }
 $('app').before(nav);
 function show(){
  const original=location.pathname.split('/')[2]||'overview',slug=original==='code-statistics'?'codes':original,authenticated=!$('app').hidden;
  if(original==='code-statistics')history.replaceState(null,'','/admin/codes');
  nav.hidden=!authenticated;
  for(const [key,section] of sections)if(section)section.hidden=key!==slug;
  for(const a of nav.querySelectorAll('a')){if(a.pathname==='/admin/'+slug)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')}
  const selected=pages.find(page=>page[0]===slug);
  const group=groups.find(([,slugs])=>slugs.includes(slug));
  heading.textContent=(group?group[0]+' / ':'')+(selected?.[1]||'后台');
  document.title=(selected?.[1]||'后台')+' · 不吱岛管理台';
  for(const details of grid.querySelectorAll('details')){
   const current=details.dataset.adminGroup===group?.[0];details.dataset.current=String(current);
   if(media.matches)details.open=current;else if(current)details.open=true;
  }
  if(authenticated)document.dispatchEvent(new CustomEvent('admin-page',{detail:slug}));
 }
 const enter=$('enter').onclick;$('enter').onclick=async()=>{await enter();show()};
 const exit=$('logout').onclick;$('logout').onclick=()=>{exit();show()};
 window.addEventListener('popstate',show);
 media.addEventListener('change',()=>{if(!media.matches)for(const details of grid.querySelectorAll('details'))details.open=true;show()});
 window.showAdminPage=slug=>{history.pushState(null,'','/admin/'+slug);show();window.scrollTo(0,0)};
 show();
})();
