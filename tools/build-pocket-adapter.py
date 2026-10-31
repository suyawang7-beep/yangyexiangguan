"""Build the approved mobile presentation from the checked-in interactive preview."""
from pathlib import Path
import re,json
p=Path('docs/design/previews/collection-pocket.html').read_text(encoding='utf8')
css=p.split('<style>')[1].split('</style>')[0].replace(':root',':host').replace('body{',':host{').replace('min-height:100svh','min-height:0')
css=css.replace("url('assets/","url('/assets/")
html=p.split('<body>')[1].split('<script>')[0]
html=re.sub(r'<header class="topbar">.*?</header>','',html,flags=re.S)
html=re.sub(r'<nav class="bottom".*?</nav>','',html,flags=re.S)
html=re.sub(r'<p class="preview-note">.*?</p>','',html,flags=re.S)
html=html.replace('3 <small>种</small> / 4 <small>张</small>','…').replace('示例珍藏','我的珍藏').replace('全部回忆 · 14 张素材','正在读取收藏…').replace('查看14张回忆','查看回忆').replace('记录为本地示例，不是实际抽卡流水','抽卡与融卡记录，来自你的岛民账户').replace('故事文案与持有数量为排版示例，未关联真实账户。','')
css+='\n.phone{padding:0;gap:8px}.pockets{min-height:278px}.pocket img{height:104px}.pocket{min-height:132px}.binder{padding-top:9px}.intro h1{font-size:25px}.phone .bottom{margin-top:0} .phone .pocket-name{overflow-wrap:anywhere} .detail-story{white-space:pre-wrap} .sheet-close,.pager button,.tabs button{min-height:44px} :host{display:block;background:transparent} @media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}'
js=p.split('<script>')[1].split('</script>')[0]
js=js[js.index(" const $="):js.rindex('})();')]
js=js.replace('document.getElementById(id)','root.getElementById(id)').replace('document.querySelectorAll','root.querySelectorAll')
js=js.replace('image.src=card.image;',"image.src=card.image;image.onerror=()=>{image.onerror=null;image.src='assets/island.svg'};")
js=js.replace("card.name.toLowerCase().includes(values.search.toLowerCase().trim())","(card.name+' '+(card.characters||'')).toLowerCase().includes(values.search.toLowerCase().trim())")
js=js.replace("$('detail').showModal()","root.querySelector('.detail-story').textContent=card.story||'这段回忆的故事正在整理中。';$('detail').showModal()")
js=js.replace("' 张素材'","' 张回忆'").replace("'示例开信足迹 · 4 次相遇'","'我的开信足迹'")
start=js.index(" for(const [i,id]of")
js=js[:start]+'''
 for(const entry of data.history){const card=cards.find(c=>c.id===entry.cardId);if(!card)continue;const button=make('button','history-entry');button.type='button';const copy=make('span','',card.name);copy.append(make('small','',new Date(entry.at).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'})+' · '+(entry.fusion?'海风融卡':entry.first?'第一次遇见':'开信回忆')));button.append(copy,make('span','rarity',entry.rarity||card.rarity));button.onclick=()=>showDetail(card,button);$('history-list').append(button)}
 if(!data.history.length)$('history-list').append(make('p','','还没有相遇记录，去邮局收一份期待吧。'));
 const ready=data.catalogReady,profile=data.profileReady;
 const owned=cards.filter(c=>c.quantity>0).length,total=cards.reduce((sum,c)=>sum+c.quantity,0);
 root.querySelector('.intro-stats strong').textContent=ready&&profile?owned+' 种 / '+total+' 张':'…';
 root.querySelector('.intro-stats>small').textContent=!ready?data.error?'目录暂时不可用，请刷新重试':'正在读取目录':!profile?data.signedIn?'账户正在读取，请稍候或刷新重试':'登录通行证后查看珍藏':'已收藏 '+owned+' / '+cards.length+' 种';
 root.querySelector('.tiny-progress span').style.width=(ready&&profile&&cards.length?100*owned/cards.length:0)+'%';
 render();
 if(!ready){$('pockets').replaceChildren(make('p','empty',data.error?'暂时无法读取卡片，请刷新重试。':'正在读取回忆卡片…'));$('viewer-content').replaceChildren(make('p','empty','正在读取回忆卡片…'));}
 if(saved){filters=saved.filters;page=saved.page;index=saved.index;chooseTab(saved.active);}
 host.save=()=>({filters,page,index,active});
'''
js=js.replace("quantity?'珍藏", "quantity?'珍藏")
out="""/* Mobile presentation only. Business state is supplied by app.js; no API writes. */
(() => {'use strict';
 const sheet=CSS;
 const template=HTML;
 const media=matchMedia('(max-width: 680px)');let latest=null,saved=null;
 function mount(data){if(!media.matches)return;const main=document.querySelector('#main');if(!main)return;const old=main.querySelector('buzhi-pocket');if(old?.save)saved=old.save();old?.remove();const host=document.createElement('buzhi-pocket');const root=host.attachShadow({mode:'open'});root.innerHTML='<style>'+sheet+'</style>'+template;main.prepend(host);const cards=data.cards;
JS
 }
 document.addEventListener('buzhi:collection-data',e=>{latest=e.detail;mount(latest)});
 media.addEventListener('change',()=>{if(media.matches&&latest)mount(latest);else document.querySelector('buzhi-pocket')?.remove()});
})();
""".replace('CSS;',json.dumps(css,ensure_ascii=False)+';').replace('HTML;',json.dumps(html,ensure_ascii=False)+';').replace('JS\n',js)
Path('ui-preview/collection-pocket.js').write_text(out,encoding='utf8')
Path('ui-preview/collection-pocket.css').write_text('''buzhi-pocket{display:none}@media(max-width:680px){body[data-page="collection"] #main>buzhi-pocket{display:block}body[data-page="collection"] #main:has(>buzhi-pocket)>:not(buzhi-pocket):not(#sea-fusion){display:none!important}body[data-page="collection"] #main{padding-top:12px}body[data-page="collection"] .sea-fusion{margin-top:12px}body[data-page="collection"] .site-footer{display:none}}''',encoding='utf8')
app=Path('ui-preview/app.js');s=app.read_text(encoding='utf8');needle="    document.dispatchEvent(new CustomEvent('buzhi:render'));"
s='\n'.join(line for line in s.split('\n') if "if(PAGE==='collection')document.dispatchEvent(new CustomEvent('buzhi:collection-data'" not in line)
assert needle in s
s=s.replace(needle,needle+"\n    if(PAGE==='collection')document.dispatchEvent(new CustomEvent('buzhi:collection-data',{detail:{catalogReady:!LIVE||liveCatalogReady,error:liveCatalogFailed,profileReady:!LIVE||!liveToken||!!latestLiveProfile,signedIn:!!liveToken,cards:(!LIVE||liveCatalogReady?CARDS.filter(c=>!LIVE||liveCatalog.some(item=>item.previewId===c.id)):[]).map(c=>({...c,image:LIVE?assetUrl('cards/'+liveCatalog.find(item=>item.previewId===c.id).id+'.webp'):'assets/island.svg',quantity:Number(state.collection[c.id]?.quantity)||0})),history:state.history}}));")
app.write_text(s,encoding='utf8')
page=Path('ui-preview/collection.html');s=page.read_text(encoding='utf8');s=re.sub(r'<link rel="stylesheet" href="collection-pocket.css[^>]+><script src="collection-pocket.js[^<]+</script>','',s);s=s.replace('<script src="app.js?', '<link rel="stylesheet" href="collection-pocket.css?v=20261026-pocket1"><script src="collection-pocket.js?v=20261026-pocket1" defer></script><script src="app.js?').replace('20261025-fusionmotion','20261026-pocket1');page.write_text(s,encoding='utf8')
