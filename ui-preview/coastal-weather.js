// Presentation only: never submits or alters weather scoring, accounts or rewards.
(()=>{'use strict';const body=document.body,scene=document.querySelector('.scene'),instrument=document.querySelector('.instrument'),sky=document.querySelector('#orb-scene'),orb=document.querySelector('#orb'),reduce=matchMedia('(prefers-reduced-motion: reduce)');
const note=document.querySelector('.device-note');document.querySelector('.observatory').append(note);
const atmosphere=document.querySelector('.scene-atmosphere');if(atmosphere)scene.prepend(atmosphere);
const wrap=document.createElement('span');wrap.className='orbit-wrap';wrap.setAttribute('aria-hidden','true');wrap.innerHTML='<span class="orbit-run"><span class="orbit-bead"></span></span>';instrument.append(wrap);
const response=document.createElement('span');response.className='orb-response';response.setAttribute('aria-hidden','true');instrument.append(response);
let keyboard=false,flash=null,crossfade=null,previous=null;
document.addEventListener('keydown',()=>{keyboard=true},true);document.addEventListener('pointerdown',()=>{keyboard=false},true);
function enabled(){return !reduce.matches&&!document.hidden&&!body.classList.contains('paused')&&!keyboard}
function cancel(){flash?.cancel();crossfade?.cancel();previous?.remove();flash=crossfade=previous=null}
function visibility(){body.classList.toggle('motion-inactive',document.hidden);if(!enabled())cancel()}
document.addEventListener('visibilitychange',visibility);reduce.addEventListener('change',visibility);
function pulse(){if(!enabled())return;flash?.cancel();flash=response.animate([{opacity:0,transform:'scale(.97)'},{opacity:.5,transform:'scale(1)',offset:.4},{opacity:0,transform:'scale(1.025)'}],{duration:260,easing:'cubic-bezier(.23,1,.32,1)'});}
new MutationObserver(records=>{if(!enabled())return;const old=records.flatMap(r=>[...r.removedNodes]).find(n=>n.nodeType===1&&n.tagName.toLowerCase()==='svg');if(!old)return;crossfade?.cancel();previous?.remove();previous=document.createElement('span');previous.className='previous-sky';previous.setAttribute('aria-hidden','true');previous.append(old.cloneNode(true));orb.append(previous);const layer=previous;crossfade=layer.animate([{opacity:1},{opacity:0}],{duration:220,easing:'cubic-bezier(.23,1,.32,1)'});crossfade.finished.then(()=>layer.remove()).catch(()=>layer.remove());pulse()}).observe(sky,{childList:true});
new MutationObserver(records=>{for(const r of records){if(r.attributeName==='class')visibility();else if(r.attributeName==='data-phase')pulse()}}).observe(body,{attributes:true,attributeFilter:['class','data-phase']});
// Existing admin-published custom scenes remain usable; the historical default maps to this new visual template.
const backdrop=document.querySelector('#report-backdrop');function publishedScene(){try{const u=new URL(backdrop.src,location.href);if(u.origin===location.origin&&u.pathname.startsWith('/assets/weather-scenes/'))scene.style.backgroundImage='url("'+u.href+'")';else if(u.pathname==='/weather/assets/cloud-observatory.webp')scene.style.removeProperty('background-image')}catch{}}new MutationObserver(publishedScene).observe(backdrop,{attributes:true,attributeFilter:['src']});publishedScene();
visibility();
})();
