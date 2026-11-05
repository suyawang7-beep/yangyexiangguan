/* Ambient scene only; no card or account interactions. */
(()=>{'use strict';const scene=document.querySelector('.atelier-world');if(!scene)return;
const water=document.createElement('div');water.className='living-sea';water.setAttribute('aria-hidden','true');
water.innerHTML='<svg viewBox="0 0 800 240" preserveAspectRatio="none" fill="none"><g class="sea-current current-back" stroke="#c9e6d4" stroke-width="1.2"><path d="M80 31q38-8 76 0t76 0m105 2q23-6 46 0t46 0m130 8q35-8 70 0M12 66q40-9 80 0t80 0m85-8q24-5 48 0m139 12q35-9 70 0t70 0m70-6q23-5 46 0M71 100q30-6 60 0m85 4q40-9 80 0t80 0m140-7q30-8 60 0t60 0"/></g><g class="sea-current current-near" stroke="#c5eadb" stroke-width="2"><path d="M-50 143q50-11 100 0t100 0m80-10q32-7 64 0m95 15q50-12 100 0t100 0m60-11q36-8 72 0M15 189q45-11 90 0t90 0m120 9q36-9 72 0m72-14q50-12 100 0t100 0M90 230q45-8 90 0m124-9q30-7 60 0t60 0m120 10q35-8 70 0"/></g></svg>';
scene.append(water);
const sky=document.createElement('div');sky.className='living-sky';sky.setAttribute('aria-hidden','true');
for(let i=0;i<3;i++){const bird=document.createElement('span');bird.className='ocean-gull';bird.style.setProperty('--flight-delay',(-i*9)+'s');bird.style.setProperty('--flight-y',(9+i*3)+'%');bird.style.setProperty('--bird-scale',String(1-i*.18));bird.innerHTML='<svg viewBox="0 0 48 24" fill="none"><path class="gull-wing gull-left" d="M24 15Q14 4 3 8"/><path class="gull-wing gull-right" d="M24 15Q34 4 45 8"/></svg>';sky.append(bird)}scene.append(sky);
})();

