/* Buzhi 2.0: feature-detected live bridge. Static Railway preview stays non-credentialed.
   All account and asset calls are same-origin; never forward secrets to another host. */
(()=>{'use strict';
const status=document.querySelector('.auth-status');
const $=s=>document.querySelector(s);
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function json(path,options={}){const response=await fetch(path,{credentials:'same-origin',cache:'no-store',...options});const type=response.headers.get('content-type')||'';if(!type.includes('application/json'))throw Error('当前地址未提供账户 API');const value=await response.json();if(!response.ok)throw Error(value.error||'请求失败');return value}
function msg(t){const el=$('#buzhi2LiveStatus');if(el)el.textContent=t}
const assets={home:[['decor/home-background.webp','body-background'],['decor/home-poster.webp','.home-island-picture img'],['characters/zhizhi.webp','.home-island-picture img']],office:[['decor/office-background.webp','body-background']],workshop:[['decor/workshop-background.webp','body-background']],shop:[['decor/shop-background.webp','body-background']],collection:[['decor/collection-background.webp','body-background']]};
async function syncAssets(){try{const manifest=await json('/api/assets-manifest');const items=assets[document.body.dataset.page]||[];for(const [name,selector] of items){if(!manifest.assets?.[name])continue;const v=encodeURIComponent(String(manifest.versions?.[name]||0));const url='/assets/'+name+'?v='+v;if(selector==='body-background'){document.body.style.backgroundImage='url("'+url+'")';document.body.style.backgroundSize='cover';document.body.style.backgroundPosition='center top';continue}const el=$(selector);if(el){el.src=url;el.dataset.assetSlot=name}}}catch{ /* Static preview intentionally has no manifest. Keep approved bundled artwork. */ }}
const box=$('#account-access');if(!box){syncAssets();return}
const intro=document.createElement('p');intro.id='buzhi2LiveStatus';intro.setAttribute('role','status');intro.textContent='正在检查本站是否支持原岛民账户…';box.append(intro);
async function init(){
 try{await json('/api/assets-manifest')}catch{msg('当前是独立静态设计预览，不提供密码登录；请使用正式站管理现有账户。');return}
 await syncAssets();
 const root=document.createElement('div');root.className='live-account-panel';box.append(root);
 let token=null;
 function renderGuest(){root.innerHTML='<form id="buzhi2LoginForm" class="fields"><label class="field">原岛民编号<input name="id" required autocomplete="username" placeholder="BZI 编号"></label><label class="field">原账户密码<input name="password" type="password" required autocomplete="current-password"></label><button class="button primary" type="submit">使用原账户登录</button></form><p class="muted">不新建账户，不改变原编号。忘记密码请沿用正式站账户找回流程。</p>';$('#buzhi2LoginForm').onsubmit=async e=>{e.preventDefault();const f=e.currentTarget;const id=f.elements.id.value.trim(),password=f.elements.password.value;try{const result=await json('/api/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id,password})});f.elements.password.value='';token=result.token;renderMember(result.profile);msg('已读取原岛民档案（仅此页面会话内有效）。')}catch(err){f.elements.password.value='';msg(err.message)}}}
 function renderMember(profile){root.replaceChildren();const heading=document.createElement('h3');heading.textContent='欢迎回岛，'+String(profile.nickname||'岛民');const info=document.createElement('p');info.textContent='岛民编号：'+String(profile.id||'—')+' · 金币：'+String(profile.coins??'未提供')+' · 身份：'+(profile.status==='islander'?'已认证岛民':'访客');const logout=document.createElement('button');logout.type='button';logout.className='button secondary';logout.textContent='退出当前页面会话';logout.onclick=async()=>{try{await json('/api/logout',{method:'POST',headers:{authorization:'Bearer '+token}})}catch{}token=null;renderGuest();msg('已退出本页账户会话。')};root.append(heading,info,logout);if(status)status.textContent='已登录 · '+String(profile.nickname||'岛民')}
 renderGuest();msg('已检测到同源账户 API。原账户登录仅在当前页面内有效，不保存密码或令牌。')
}
init();
})();
