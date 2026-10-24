/* Touch-friendly presentation only. All business writes remain in existing clients. */
(() => {
 'use strict';
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),mobile=matchMedia('(max-width: 620px)');
 const visibility=()=>{document.documentElement.dataset.seaHidden=String(document.hidden)};
 document.addEventListener('visibilitychange',visibility);visibility();
 const motion=()=>!reduced.matches&&(document.querySelector('.world')?.dataset.motion||document.body.dataset.motion)!=='off';
 const make=(tag,className,text)=>{const node=document.createElement(tag);node.className=className;if(text!==undefined)node.textContent=text;return node};
 function guide(){
  const root=document.querySelector('#voyage'),panel=root?.querySelector('.guide-info');if(!panel||panel.dataset.touchReady)return;
  panel.dataset.touchReady='true';panel.dataset.sheet='peek';panel.id='guide-place-sheet';panel.setAttribute('aria-atomic','false');
  const handle=make('button','guide-sheet-handle','地点介绍 · 上拉展开'),close=make('button','guide-sheet-close','收起');handle.type=close.type='button';handle.setAttribute('aria-controls',panel.id);close.setAttribute('aria-label','收起地点介绍');
  const strip=make('nav','guide-place-strip');strip.setAttribute('aria-label','左右滑动选择导览地点');
  const entries=[...root.querySelector('#voyage-stops').content.querySelectorAll('[data-guide-entry]')];
  let active=Number(root.dataset.stop||0),programmatic=false,scrollTimer,releaseTimer;
  function sheet(value){panel.dataset.sheet=value;handle.setAttribute('aria-expanded',String(value==='expanded'));handle.textContent=value==='expanded'?'地点介绍 · 下拉收起':'地点介绍 · 上拉展开'}
  const choose=index=>{
   const current=Number(root.dataset.stop||0),difference=index-current;
   const button=root.querySelector(difference>0?'#voyage-next':'#voyage-prev');
   for(let n=0;n<Math.abs(difference);n++)button.click();
   if(mobile.matches)sheet('peek');
  };
  entries.forEach((entry,index)=>{const button=make('button','guide-place-card',entry.dataset.location);button.type='button';button.dataset.guidePlace=index;button.onclick=()=>choose(index);strip.append(button)});
  panel.prepend(handle,close,strip);handle.onclick=()=>sheet(panel.dataset.sheet==='expanded'?'peek':'expanded');close.onclick=()=>sheet('collapsed');sheet('peek');
  panel.addEventListener('keydown',event=>{if(event.key==='Escape'&&mobile.matches){sheet('collapsed');handle.focus()}if((event.key==='ArrowLeft'||event.key==='ArrowRight')&&event.target.closest('.guide-place-strip')){event.preventDefault();const index=Math.max(0,Math.min(entries.length-1,active+(event.key==='ArrowRight'?1:-1)));choose(index);strip.children[index].focus({preventScroll:true})}});
  function sync(){
   active=Number(root.dataset.stop||0);const buttons=[...strip.children];buttons.forEach((button,index)=>button.setAttribute('aria-pressed',String(index===active)));
   const button=buttons[active];if(!button)return;programmatic=true;clearTimeout(releaseTimer);
   strip.scrollTo({left:Math.max(0,button.offsetLeft-(strip.clientWidth-button.offsetWidth)/2),behavior:motion()?'smooth':'instant'});
   releaseTimer=setTimeout(()=>{programmatic=false},motion()?450:0);
  }
  strip.addEventListener('scroll',()=>{clearTimeout(scrollTimer);if(programmatic)return;scrollTimer=setTimeout(()=>{if(programmatic)return;const bounds=strip.getBoundingClientRect(),center=bounds.left+bounds.width/2;let nearest=0,distance=Infinity;[...strip.children].forEach((button,index)=>{const box=button.getBoundingClientRect(),delta=Math.abs(box.left+box.width/2-center);if(delta<distance){distance=delta;nearest=index}});if(nearest!==active)choose(nearest)},130)},{passive:true});
  strip.addEventListener('pointerdown',()=>{programmatic=false;clearTimeout(releaseTimer)},{passive:true});
  let drag=null;
  handle.addEventListener('pointerdown',event=>{if(!mobile.matches||!event.isPrimary||event.button>0)return;drag={id:event.pointerId,y:event.clientY};handle.setPointerCapture(event.pointerId)});
  handle.addEventListener('pointerup',event=>{if(!drag||drag.id!==event.pointerId)return;const distance=event.clientY-drag.y;drag=null;if(Math.abs(distance)>25){sheet(distance<0?'expanded':'collapsed');suppressClick=true;setTimeout(()=>{suppressClick=false},0)}});
  let suppressClick=false;handle.addEventListener('click',event=>{if(suppressClick){event.stopImmediatePropagation();event.preventDefault()}},true);
  handle.addEventListener('pointercancel',()=>{drag=null});
  root.addEventListener('buzhi:guide-place',()=>{sync();if(mobile.matches)sheet('peek')});
  const onMedia=()=>{sheet('peek');sync()};
  const observer=new IntersectionObserver(([entry])=>{if(!root.isConnected){observer.disconnect();mobile.removeEventListener('change',onMedia);clearTimeout(scrollTimer);clearTimeout(releaseTimer);return}panel.classList.toggle('guide-sheet-in-view',entry.isIntersecting)},{threshold:0});observer.observe(root);
  mobile.addEventListener('change',onMedia);sync();
 }
 function tabs(){
  const bar=document.querySelector('.filter-bar .filter-tabs');if(!bar)return;
  if(!bar.classList.contains('sea-tabs')){
   bar.classList.add('sea-tabs');const indicator=make('span','sea-tab-indicator');indicator.setAttribute('aria-hidden','true');bar.prepend(indicator);
   const update=()=>{const chosen=bar.querySelector('button[aria-pressed="true"]');if(chosen){indicator.style.width=chosen.offsetWidth+'px';indicator.style.height=chosen.offsetHeight+'px';indicator.style.transform='translate('+chosen.offsetLeft+'px,'+chosen.offsetTop+'px)'}};
   bar.addEventListener('click',()=>requestAnimationFrame(update));const observer=new ResizeObserver(()=>{if(!bar.isConnected){observer.disconnect();return}update()});observer.observe(bar);requestAnimationFrame(update);
  }
 }
 function mail(){
  const list=document.querySelector('#island-mail-list');if(!list||list.dataset.stackReady)return;list.dataset.stackReady='true';list.classList.add('sea-mail-stack');
  const toggle=make('button','resident-btn sea-mail-toggle');toggle.type='button';toggle.id='mail-stack-toggle';toggle.setAttribute('aria-controls',list.id);list.after(toggle);let expanded=false;const compact=matchMedia('(max-width:680px)');
  function update(){const letters=[...list.querySelectorAll(':scope > article')];list.dataset.expanded=String(expanded);letters.forEach((letter,index)=>{letter.hidden=!expanded&&index>=(compact.matches?1:3);letter.classList.add('sea-envelope')});toggle.hidden=letters.length<=(compact.matches?1:3);toggle.setAttribute('aria-expanded',String(expanded));toggle.textContent=expanded?'收起来信':'展开全部来信（'+letters.length+'封）'}
  toggle.onclick=()=>{expanded=!expanded;update()};document.querySelector('#island-mail-more')?.addEventListener('click',()=>{expanded=true;update()});new MutationObserver(update).observe(list,{childList:true});compact.addEventListener('change',update);update();
 }
 function decorate(){guide();tabs();mail();document.querySelectorAll('body[data-page="guide"] .guide-map-heading h1,body[data-page="collection"] .page-heading h1,#island-mail-panel h2').forEach(n=>n.classList.add('sea-underlined'))}
 document.addEventListener('buzhi:gift-claimed',()=>{
  document.querySelector('.sea-success-stamp')?.remove();const stamp=make('div','sea-success-stamp','已签收 · 小岛来信');stamp.setAttribute('role','status');document.body.append(stamp);setTimeout(()=>stamp.remove(),2400);
 });
 document.addEventListener('buzhi:render',decorate);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',decorate,{once:true});else decorate();
})();
