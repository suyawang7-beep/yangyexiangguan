/* Visual adaptation only. Business interactions remain in foundation.js. */
(() => {
 const page=document.body.dataset.page;
 const mobile=matchMedia('(max-width:760px)');
 if(page==='workshop'){
  const rules=document.querySelector('.craft-rule-scroll');
  if(rules){
   const fold=document.createElement('details');fold.className='craft-rules-fold';fold.open=!mobile.matches;
   const summary=document.createElement('summary');summary.textContent='查看融卡规则 · 待确认';
   rules.before(fold);fold.append(summary,rules);
  }
 }
 if(page!=='office')return;
 const scene=document.querySelector('.office-scene');
 if(scene){
  const img=document.createElement('img');img.src='assets-v2/zhizhi-portrait-v1.webp';img.alt='吱吱值班人物候选，与屁宝和白色肥啾';img.width=1536;img.height=1024;img.decoding='async';
  const caption=document.createElement('small');caption.textContent='人物候选 · 复用首页插画，非最终办公立绘';
  scene.replaceChildren(img,caption);
 }
 const host=document.querySelector('.office-stations');if(!host)return;
 const panels=[...host.querySelectorAll('.office-station')];
 const labels=['委托公告板','办结档案','海风点歌簿','肥啾临时委托'];
 const prior=panels.map(p=>p.getAttribute('aria-labelledby'));
 const tabs=document.createElement('div');tabs.className='office-switch';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','事务所栏目');
 let active=0;
 const buttons=panels.map((panel,i)=>{
  panel.id='office-panel-'+i;
  const button=document.createElement('button');button.type='button';button.id='office-tab-'+i;button.setAttribute('role','tab');button.setAttribute('aria-controls',panel.id);button.textContent=labels[i];tabs.append(button);return button;
 });
 host.before(tabs);
 function render(focus=false){
  tabs.hidden=!mobile.matches;
  panels.forEach((panel,i)=>{
   buttons[i].setAttribute('aria-selected',String(i===active));buttons[i].tabIndex=i===active?0:-1;
   panel.hidden=mobile.matches&&i!==active;
   if(mobile.matches){panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',buttons[i].id);}
   else{panel.removeAttribute('role');if(prior[i])panel.setAttribute('aria-labelledby',prior[i]);}
  });
  if(focus)buttons[active].focus();
 }
 buttons.forEach((button,i)=>{
  button.addEventListener('click',()=>{active=i;render()});
  button.addEventListener('keydown',e=>{
   let next;if(e.key==='ArrowRight')next=(i+1)%buttons.length;else if(e.key==='ArrowLeft')next=(i+buttons.length-1)%buttons.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=buttons.length-1;else return;
   e.preventDefault();active=next;render(true);
  });
 });
 mobile.addEventListener('change',()=>render());render();
})();
