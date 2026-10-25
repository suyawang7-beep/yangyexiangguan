/* Preview-only, dependency-free adaptations of petal, path and keyframe animation ideas.
   Sakura / Motion / SVG animation / Animora are design references, not vendored packages.
   No production assets or backend configurations are touched. */
(()=>{'use strict';
const CONFIG=Object.freeze({petals:true,ribbon:true,wings:true,letter:true,bird:true,petalCount:9});
const svg=(inner,box='0 0 100 100')=>'<svg aria-hidden="true" viewBox="'+box+'" xmlns="http://www.w3.org/2000/svg">'+inner+'</svg>';
const petal=svg('<path d="M49 87C4 57 9 22 49 9c40 13 45 48 0 78Z" fill="#a5cbea" stroke="#f6fbff" stroke-width="5"/><path d="M48 17Q36 46 50 78" fill="none" stroke="#ffffffa8" stroke-width="3"/>');
const ribbon=svg('<path d="M12 7C92 14 9 58 84 78S53 147 195 152" fill="none" stroke="#f4fbff" stroke-width="12" stroke-linecap="round"/><path d="M12 7C92 14 9 58 84 78S53 147 195 152" fill="none" stroke="#94bbde" stroke-width="7" stroke-linecap="round"/>','0 0 210 175');
const wings=svg('<g fill="#f8fdff" stroke="#a6c8de" stroke-width="2"><path d="M51 87C10 71-6 42 9 12c9 22 18 29 38 32C22 12 37 1 49 6c7 23 15 35 21 45Z"/><path d="M53 87c41-16 57-45 42-75-9 22-18 29-38 32C82 12 67 1 55 6c-7 23-15 35-21 45Z"/></g>','0 0 105 95');
const letter=svg('<rect x="8" y="21" width="84" height="59" rx="7" fill="#f9fcff" stroke="#8ab0cf" stroke-width="3"/><path d="m10 25 40 31 40-31" fill="none" stroke="#91b6d5" stroke-width="3"/><path d="m10 77 28-25m52 25L63 52" fill="none" stroke="#bfd8e9" stroke-width="2"/><circle cx="50" cy="54" r="9" fill="#8eabd4"/><path d="m46 54 4 4 6-8" fill="none" stroke="white" stroke-width="2"/>');
const bird=svg('<ellipse cx="46" cy="55" rx="32" ry="30" fill="#faffff" stroke="#a9c7da" stroke-width="2"/><path d="M25 54Q6 27 19 24q19 7 22 28M65 50q10-29 23-23 4 19-17 34" fill="#f8fcff" stroke="#bbd7e7" stroke-width="2"/><circle cx="56" cy="50" r="3" fill="#445c79"/><path d="m67 55 12 4-12 5Z" fill="#edbd81"/><path d="M24 25q17-14 35 0" fill="none" stroke="#7097bf" stroke-width="7"/><path d="M40 22v-8" stroke="#7698c7" stroke-width="3"/><rect x="60" y="62" width="27" height="19" rx="3" fill="#fff" stroke="#739dbd"/><path d="m61 64 12 9 13-9" fill="none" stroke="#739dbd" stroke-width="2"/>');
function attach(){
 const hero=document.querySelector('.home-hero');if(!hero||hero.querySelector('.zz-birthday-layer'))return;
 const host=document.createElement('div');host.className='zz-birthday-layer';host.setAttribute('aria-hidden','true');
 if(CONFIG.petals){for(let i=0;i<CONFIG.petalCount;i++){const el=document.createElement('span');el.className='zz-petal';el.innerHTML=petal;el.style.setProperty('--x',(i%2===0?2+i*2:82+i)+'%');el.style.setProperty('--size',(9+i%4*3)+'px');el.style.setProperty('--duration',(13+i%5*2)+'s');el.style.setProperty('--delay',(-i*3)+'s');el.style.setProperty('--drift',((i%2?1:-1)*(20+i*7))+'px');host.append(el)}}
 for(const [key,markup] of [['ribbon',ribbon],['wings',wings],['letter',letter],['bird',bird]]){if(!CONFIG[key])continue;const el=document.createElement('span');el.className='zz-'+key;el.innerHTML=markup;host.append(el)}
 hero.append(host);
}
document.addEventListener('buzhi:render',attach);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach,{once:true});else attach();
})();