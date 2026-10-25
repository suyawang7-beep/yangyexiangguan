/* Isolated storybook homepage preview. Never modifies cards, fusion operations or assets. */
(()=>{'use strict';const page=document.body.dataset.page;if(page!=='home')return;
function mount(){const main=document.querySelector('#main');if(!main||main.querySelector('.zz-story'))return;
main.innerHTML=`<div class="zz-story">
<section class="zz-stage" aria-labelledby="zz-heading"><div class="zz-intro"><div class="zz-kicker">BUZHI ISLAND · BIRTHDAY STORY</div><h1 id="zz-heading">蓝羽来信</h1><p>当海风吹过不吱岛，一封写给吱吱的生日来信，正等待被轻轻拆开。</p><div class="zz-script">A little letter, for Zhizhi.</div><div class="zz-actions"><button class="zz-primary" type="button" data-zz-open>拆开生日来信</button><a class="zz-secondary" href="collection.html#fusion-heading">前往海风融卡坊</a></div></div>
<div class="zz-scene" aria-label="吱吱生日插画预留展示区"><div class="zz-orbit" aria-hidden="true"></div><div class="zz-feather" aria-hidden="true">❧</div><div class="zz-portrait"><strong>ZHIZHI</strong><span>正式人物立绘预留位<br>不使用旧生日海报或临时人物冒充吱吱</span></div><div class="zz-twig" aria-hidden="true"><span></span><span></span><span></span></div><div class="zz-caption">PERSONAL ARTWORK · COMING SOON</div></div><div class="zz-scroll">SCROLL TO EXPLORE ↓</div></section>
<section class="zz-letter-section" aria-labelledby="zz-letter-title"><div><div class="zz-kicker">CHAPTER 01 · A SEA-BORNE LETTER</div><h2 id="zz-letter-title">海风寄来一封信</h2><p>今天的主角是吱吱。信封里藏着岛民与两位岛主的故事。</p></div><button class="zz-envelope" type="button" data-zz-open aria-label="打开吱吱生日信">✉</button></section>
<div class="zz-chapter">CHAPTER 02 · THE ISLAND'S LITTLE SURPRISES</div>
<section class="zz-activities" aria-label="本周活动">
<article class="zz-activity"><div class="zz-activity-tag">FEATURED · BIRTHDAY WEEK</div><h2>海风融卡坊</h2><p>把珍藏的卡片带来，让海风见证新的相遇。融卡入口位于回忆收藏室；具体消耗与规则以功能页面实际提示为准。</p><a class="zz-primary" href="collection.html#fusion-heading">前往融卡坊 →</a></article>
<article class="zz-activity"><div class="zz-activity-tag">BIRTHDAY WEEK · SECOND EVENT</div><h2>周边卡片兑换商店</h2><p>吱吱本周活动的另一处重要地点。商店地址确认后，再开启正式入口。</p><span class="zz-status" aria-label="商店入口待接入">商店入口待接入</span></article>
</section><p class="zz-foot">不吱岛始终在这里 · 现有导航、收藏、岛民事务所与个人中心继续保留</p>
<dialog class="zz-dialog" id="zz-letter-dialog" aria-labelledby="zz-dialog-title"><div class="zz-paper"><div class="zz-kicker">A LITTLE LETTER</div><h2 id="zz-dialog-title">致吱吱</h2><p>海风替我们保存了今日的温柔。<br>愿蓝鸟花年年绽放，愿不吱岛有更多与你相遇的故事。</p><p>生日信正文 · 预览示意，正式文案可由两位岛主确认。</p><button class="zz-secondary" type="button" data-zz-close>收好这封信</button></div></dialog>
</div>`;
const d=main.querySelector('#zz-letter-dialog');main.querySelectorAll('[data-zz-open]').forEach(el=>el.addEventListener('click',()=>d.showModal()));main.querySelector('[data-zz-close]')?.addEventListener('click',()=>d.close());d.addEventListener('click',e=>{if(e.target===d)d.close()});
}
document.addEventListener('buzhi:render',mount);if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();