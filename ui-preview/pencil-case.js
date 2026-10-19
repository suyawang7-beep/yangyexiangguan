/* Original Buzhi ephemera. pencil-case supplies build-time drawing, not UI code. */
(() => {
  'use strict';
  const main=document.querySelector('#main'),world=document.querySelector('.world');
  if(!main||!world)return;
  const src=new URL('assets/pencil/',document.currentScript.src);
  const asset=name=>new URL(name,src).href;
  const css=document.createElement('link');css.rel='stylesheet';
  css.href=new URL('pencil-case.css?v=20261020-pencil1',document.currentScript.src).href;document.head.append(css);
  const image=(name,className='')=>{const img=document.createElement('img');img.src=asset(name+'.png');img.alt='';img.width=img.height=256;img.className=className;img.decoding='async';img.draggable=false;return img;};
  const decorative=el=>{el.setAttribute('aria-hidden','true');return el;};
  const page=document.body.dataset.page;
  const pairs={home:['shell','letter'],passport:['bottle','shell'],office:['letter','bottle'],checkin:['shell','letter'],draw:['bottle','letter'],collection:['shell','bottle'],mailbox:['letter','bottle'],guide:['shell','bottle'],islanders:['letter','shell'],effects:['bottle','shell']};
  let reveal=null,revealObserver=null,seen=false,visible=false,playGeneration=0;
  const enabled=()=>world.dataset.motion==='on'&&!document.hidden&&world.dataset.drawNight!=='true';
  function stopDrawing(){
    playGeneration++;
    if(!reveal)return;
    reveal.querySelector('video').pause();reveal.dataset.playing='false';
  }
  async function playDrawing(){
    if(!reveal||!enabled()||!visible)return;
    const token=++playGeneration,video=reveal.querySelector('video');
    video.src ||= asset('postcard-drawing.mp4');
    video.currentTime=0;
    try{
      await video.play();
      if(!enabled()||!visible||!video.isConnected){video.pause();return;}
      if(token!==playGeneration)return;
      reveal.dataset.playing='true';
    }catch{if(token===playGeneration)stopDrawing();} // The finished picture is always the fallback.
  }
  function syncDrawing(){
    if(!reveal)return;
    const button=reveal.querySelector('button');
    button.disabled=!enabled();
    button.textContent=enabled()?'重看插画一笔笔画出 ↺':'动效已关闭 · 静态插画';
    if(!enabled())stopDrawing();
  }
  function postcard(host){
    if(!host||host.querySelector('.pencil-postcard'))return;
    const figure=document.createElement('figure');figure.className='pencil-postcard';
    figure.innerHTML='<div class="pencil-postcard-title"><span>一封海风的邀请</span><small>BUZHI · 2026</small></div><div class="pencil-reveal" data-playing="false"><img width="640" height="360" alt="钢笔淡彩小画：迎接岛民的灯塔、生日邀请信和海滩贝壳"><video muted playsinline preload="none" aria-hidden="true" tabindex="-1"></video><button class="pencil-replay" type="button">重看插画一笔笔画出 ↺</button></div><figcaption><span>10.20 · 菜菜生日会</span><span>愿海风记得每一次赴约。</span></figcaption>';
    figure.querySelector('img').src=asset('postcard.png');
    host.append(figure);
    if(reveal&&!reveal.isConnected)stopDrawing();
    revealObserver?.disconnect();reveal=figure.querySelector('.pencil-reveal');seen=false;
    reveal.querySelector('video').muted=true;
    reveal.querySelector('video').addEventListener('ended',stopDrawing);
    reveal.querySelector('video').addEventListener('error',stopDrawing);
    reveal.querySelector('button').addEventListener('click',playDrawing);
    revealObserver=new IntersectionObserver(entries=>{
      visible=entries[0].isIntersecting;
      if(!visible)stopDrawing();
      else if(!seen&&enabled()){seen=true;playDrawing();}
    },{threshold:.35});
    revealObserver.observe(reveal);syncDrawing();
  }
  function stamp(host,kind,label){
    if(!host||host.querySelector(`[data-pencil-stamp="${kind}"]`))return;
    const mark=document.createElement('span');mark.className='pencil-stamp';mark.dataset.pencilStamp=kind;
    const art=image('stamp');art.dataset.pencilAmbient='stamp';decorative(art);
    const text=document.createElement('span');text.textContent=label;
    mark.append(art,text);host.append(mark);
  }
  function install(){
    if(reveal&&!reveal.isConnected){stopDrawing();revealObserver?.disconnect();reveal=null;}
    if(!main.firstElementChild)return;
    if(!main.querySelector('.pencil-stickers')){
      const layer=decorative(document.createElement('div'));layer.className='pencil-stickers';
      [...(pairs[page]||pairs.home),'party'].forEach(name=>{const img=image(name);img.dataset.pencilAmbient='float';layer.append(img);});
      // Normal-flow ephemera: no overlay over text, map labels, or CTA buttons.
      const scene=main.querySelector('.scene-decor');if(scene)scene.after(layer);else main.append(layer);
    }
    if(page==='mailbox'){
      postcard(main.querySelector('.mailbox-side'));
      main.querySelectorAll('.letter').forEach(letter=>{
        if(letter.querySelector('.pencil-letter-mark'))return;
        const mark=decorative(document.createElement('span'));mark.className='pencil-letter-mark';mark.textContent='BUZHI POST · 10.20';letter.prepend(mark);
      });
    }
    main.querySelectorAll('.collection-empty,.exhibit-empty,.empty-state').forEach(host=>{
      if(host.querySelector('.pencil-empty-art'))return;
      const art=image('empty-letter','pencil-empty-art');art.width=520;art.height=260;decorative(art);host.prepend(art);
    });
    stamp(main.querySelector('.ticket-station'),'arrival','已登岛 · 海风记得你');
    if(main.querySelector('#checkin-button')?.disabled)stamp(main.querySelector('.checkin-head'),'checkin','今日已签到');
    main.querySelectorAll('.task-card.completed .task-action').forEach(host=>stamp(host,'task','任务已完成'));
    const camera=main.querySelector('#map-camera');
    if(camera&&!camera.querySelector('.pencil-map-callouts')){
      const ns='http://www.w3.org/2000/svg',group=document.createElementNS(ns,'g');group.classList.add('pencil-map-callouts');decorative(group);
      main.querySelectorAll('[data-map-stop="2"],[data-map-stop="3"]').forEach(pin=>{
        const x=Number(pin.dataset.mapX),y=Number(pin.dataset.mapY),path=document.createElementNS(ns,'path'),ring=document.createElementNS(ns,'circle');
        path.setAttribute('d',`M${x-64} ${y+42} Q${x-38} ${y+53} ${x-9} ${y+12}`);path.setAttribute('pathLength','1');
        ring.setAttribute('cx',x-7);ring.setAttribute('cy',y+10);ring.setAttribute('r','5');group.append(path,ring);
      });camera.append(group);
    }
    world.dataset.pencilReady='true';
  }
  const footer=document.querySelector('.site-footer');
  if(footer&&!footer.querySelector('.pencil-credit')){
    const credit=document.createElement('small');credit.className='pencil-credit';
    const source=document.createElement('a');source.href='https://github.com/Qizhan7/pencil-case';source.textContent='手绘工具 pencil-case · 盏 & North';
    const license=document.createElement('a');license.href=asset('LICENSE.txt');license.textContent='非商业许可';
    credit.append(source,document.createTextNode(' · '),license);footer.append(credit);
  }
  document.addEventListener('buzhi:render',install);
  document.addEventListener('buzhi:motion',syncDrawing);
  document.addEventListener('visibilitychange',syncDrawing);
  new MutationObserver(syncDrawing).observe(world,{attributes:true,attributeFilter:['data-draw-night']});
  let queued=false;
  new MutationObserver(records=>{
    if(!records.some(r=>[...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1&&!n.matches('.glass-breath-light,.liquid-room-photo,.liquid-room-glass')))||queued)return;
    queued=true;queueMicrotask(()=>{queued=false;install();});
  }).observe(main,{childList:true,subtree:true});
  install();
})();
