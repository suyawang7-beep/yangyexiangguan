/* Ambient scene only; no card or account interactions. */
(()=>{'use strict';const scene=document.querySelector('.atelier-world');if(!scene)return;
const sky=document.createElement('div');sky.className='living-sky';sky.setAttribute('aria-hidden','true');
for(let i=0;i<3;i++){const bird=document.createElement('span');bird.className='ocean-gull';bird.style.setProperty('--flight-delay',(-i*9)+'s');bird.style.setProperty('--flight-y',(9+i*3)+'%');bird.style.setProperty('--bird-scale',String(1-i*.18));bird.innerHTML='<svg viewBox="0 0 48 24" fill="none"><path class="gull-wing gull-left" d="M24 15Q14 4 3 8"/><path class="gull-wing gull-right" d="M24 15Q34 4 45 8"/></svg>';sky.append(bird)}scene.append(sky);
})();

