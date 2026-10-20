/* Cosmetic-only adapter for the standalone resident page. No account or API access. */
(() => {
  'use strict';
  const room=document.body,button=document.querySelector('#motion-toggle');
  if(room.dataset.page!=='resident'||!button)return;
  const preference='buzhi-ui-motion',reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let saved=true;
  try{saved=localStorage.getItem(preference)!=='off';}catch{/* A cosmetic control must work without storage. */}
  const motions={
    shell:{duration:8600,frames:[{transform:'translateY(0) rotate(8deg)'},{transform:'translateY(-7px) rotate(14deg)'}]},
    wave:{duration:10200,frames:[{transform:'translate(0,0) rotate(-3deg)'},{transform:'translate(-4px,-5px) rotate(2deg)'}]},
    star:{duration:12400,frames:[{transform:'translateY(0) rotate(-12deg)'},{transform:'translateY(-6px) rotate(-2deg)'}]}
  };
  const stickers=new Map();
  room.querySelectorAll('.resident-sticker').forEach(el=>{
    const name=Object.keys(motions).find(key=>el.classList.contains(key));
    if(!name)return;
    const {duration,frames}=motions[name];
    const animation=el.animate(frames,{duration,iterations:Infinity,direction:'alternate',easing:'ease-in-out'});
    animation.pause();
    const box=el.getBoundingClientRect();
    stickers.set(el,{animation,visible:box.bottom>0&&box.top<innerHeight});
  });
  function sync(){
    const on=saved&&!reduced.matches;
    room.dataset.motion=on?'on':'off';
    room.dataset.residentVisible=String(!document.hidden);
    button.setAttribute('aria-pressed',String(on));
    button.querySelector('span').textContent=reduced.matches?'随系统关闭':`动效 · ${on?'开':'关'}`;
    button.disabled=reduced.matches;
    for(const {animation,visible} of stickers.values()){
      if(on&&!document.hidden&&visible)animation.play();else animation.pause();
    }
  }
  const observer=new IntersectionObserver(entries=>{
    for(const {target,isIntersecting} of entries)stickers.get(target).visible=isIntersecting;
    sync();
  },{threshold:.05});
  for(const el of stickers.keys())observer.observe(el);
  button.addEventListener('click',()=>{
    saved=!saved;
    try{localStorage.setItem(preference,saved?'on':'off');}catch{/* Use the in-page preference. */}
    sync();document.dispatchEvent(new CustomEvent('buzhi:motion'));
  });
  window.addEventListener('storage',event=>{
    if(event.key===preference||event.key===null){
      try{saved=localStorage.getItem(preference)!=='off';}catch{return;}
      sync();
    }
  });
  document.addEventListener('visibilitychange',sync);
  window.addEventListener('pageshow',sync);
  reduced.addEventListener('change',sync);
  sync();
})();
