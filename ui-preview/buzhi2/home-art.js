/* Home-only visual layer. Routing, tabs and safety states belong to foundation.js. */
(() => {
 if(document.body.dataset.page!=='home')return;
 const scene=document.querySelector('.home-birthday-scene'), art=document.querySelector('.home-art-slot'), desk=document.querySelector('.home-birthday-desk');
 if(!scene||!art||!desk)return;
 const img=document.createElement('img');img.src='assets-v2/zhizhi-portrait-v1.webp';img.alt='吱吱生日人物候选，与屁宝和白色肥啾';img.width=1536;img.height=1024;img.decoding='async';img.fetchPriority='high';art.classList.remove('placeholder');art.replaceChildren(img);
 scene.querySelector('h1').innerHTML='<span class="hero-overline">海风寄来的邀请</span><span class="hero-name">吱吱</span><span class="hero-season">生日庆典</span>';
 scene.querySelector(':scope > p')?.classList.add('hero-wish');
 const routes=document.createElement('nav');routes.className='home-activities';routes.setAttribute('aria-label','本期活动与小岛入口');
 for(const [href,title,note]of [['workshop.html','潮汐融卡工坊','把回忆带上工作台'],['shop.html','海边周边商店','看看沿海的小小橱窗'],['office.html','岛民事务所','查看岛上委托'],['guide.html','登岛导览','沿着海风认识小岛']]){
 const a=document.createElement('a');a.href=href;const strong=document.createElement('strong');strong.textContent=title;const small=document.createElement('small');small.textContent=note;a.append(strong,small);routes.append(a);
 }desk.append(routes);
 const note=document.createElement('p');note.className='art-preview-note';note.textContent='插画人物候选 · 日期与文案待确认';scene.append(note);
})();
