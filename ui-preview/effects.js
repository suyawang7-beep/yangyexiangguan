/* Adapted from user-provided motion references. Native Web APIs, no remote runtime. */
(() => {
  'use strict';
  const world = document.querySelector('.world');
  if (!world) return;
  const page = document.body.dataset.page;
  const production = window.__BUZHI_PRODUCTION__ === true;
  const effectDefaults={collectionGrid:false,collectionFan:true,collectionRing:false,ocSlider:true,ocStagger:false,ocDepth:false,effectWater:true,effectStars:true,effectIsland:true,effectProgress:true,effectGuide:true,effectDraw:true,effectCheckin:true};
  let visual={...effectDefaults};
  let effectsConfigured = false;
  const allowedMode=(name)=>visual[name]!==false;

  const enabled = () => world.dataset.motion === 'on' && !document.hidden;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const wrap = (v, n) => ((v % n) + n) % n;
  const SVG = 'http://www.w3.org/2000/svg';
  const featureStyles = document.createElement('link');
  featureStyles.rel = 'stylesheet';
  featureStyles.href = new URL('effects.css?v=20261020-milestone1', document.currentScript.src).href;
  document.head.append(featureStyles);
  const glassStyles = document.createElement('link');
  glassStyles.rel = 'stylesheet'; glassStyles.id = 'glass-surfaces';
  glassStyles.href = new URL('glass-surfaces.css?v=20261019-liquid-site1', document.currentScript.src).href;
  document.head.append(glassStyles);
  const motionSubscribers = new Set();
  const sync = () => motionSubscribers.forEach((callback) => callback());
  document.addEventListener('buzhi:motion', sync);
  document.addEventListener('visibilitychange', sync);
  const subscribe = (callback) => { motionSubscribers.add(callback); callback(); return () => motionSubscribers.delete(callback); };
  // One lifecycle for every new ambient effect: reuse on render, pause offscreen,
  // stop while hidden/reduced/off. No persistent JavaScript animation loop.
  const ambientItems = new Map();
  const liquidSurfaces = '.glass,.hero-copy,.birthday-seal,.day,.oc-slide,.info-note,.privacy-note,.map-status,.ticket,.pass-preview,.news-strip,.sidebar-card,.task-card,.collection-summary,.filter-bar,.mailbox-side,.letter,.draw-info,.checkin-summary,.floating-note,.section-heading,.site-header,.site-footer,.mobile-nav,.passport-entry-tabs,.calendar-date,.office-sign,.board-wallet,.ticket-tools,.postal-collection,.board-form,.board-entry,.passport-preview-note,.ticket-gift,.filter-tabs';
  const liquidRooms = '.home-hero,.passport-grid,.office-layout,.checkin-layout,.postal-experience,.collection-summary,.oc-gallery,.mailbox-layout,#voyage,.effects-intro,.effects-index,.board-area,.empty-state,#membershipApplication';
  let ambientMutationObserver, ambientQueued = false;
  function syncAmbient() {
    const restingForDraw = world.dataset.drawNight === 'true';
    world.dataset.ambientActive = String(enabled() && !restingForDraw);
    ambientItems.forEach((item, el) => {
      if (!el.isConnected) {
        item.animations.forEach(a => a.cancel()); ambientObserver.unobserve(el); ambientItems.delete(el); return;
      }
      const allowed = enabled() && (!item.guide || allowedMode('effectGuide')) && (!item.mode || allowedMode(item.mode));
      const running = allowed && item.visible && !restingForDraw;
      el.dataset.ambientRunning = String(running);
      item.animations.forEach(animation => {
        if (running) { if (animation.playState !== 'running' && animation.playState !== 'finished') animation.play(); }
        else { animation.pause(); if (!allowed) animation.currentTime = el.dataset.pencilAmbient==='stamp' ? animation.effect.getTiming().duration : 0; }
      });
    });
  }
  const ambientObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {const item=ambientItems.get(entry.target);if(item)item.visible=entry.isIntersecting;});
    syncAmbient();
  }, {threshold:0});
  subscribe(syncAmbient);
  new MutationObserver(syncAmbient).observe(world,{attributes:true,attributeFilter:['data-draw-night']});
  function bindAmbient(el, animations, guide = false, mode = null) {
    animations.forEach(a => a.pause());
    ambientItems.set(el,{animations,guide,mode,visible:false});ambientObserver.observe(el);
  }
  function installSiteLiquid() {
    if (world.querySelector(':scope > .site-liquid')) return;
    world.dataset.liquidSite = 'true';
    const sea=document.createElement('div');sea.className='site-liquid';sea.setAttribute('aria-hidden','true');
    sea.innerHTML='<span class="liquid-flow liquid-flow-near"></span><span class="liquid-flow liquid-flow-far"></span>';
    world.prepend(sea);
    const animations=Array.from(sea.children,(current,i)=>current.animate([
      {transform:`translate3d(${i?3:-3}%,0,0) rotate(${i?3:-3}deg) scale(1)`,opacity:i?.3:.44},
      {transform:`translate3d(${i?-3:3}%,${i?2:-2}%,0) rotate(${i?-3:3}deg) scale(1.08)`,opacity:i?.46:.65}
    ],{duration:i?24500:19000,iterations:Infinity,direction:'alternate',easing:'ease-in-out'}));
    bindAmbient(sea,animations,false,'effectWater');
  }
  function installAmbient() {
    installSiteLiquid();
    document.querySelectorAll(liquidRooms).forEach(room=>{
      room.dataset.liquidRoom='true';
      if(getComputedStyle(room).position==='static')room.classList.add('ambient-surface');
      if(!room.querySelector(':scope > .liquid-room-photo')){
        const photo=document.createElement('span');photo.className='liquid-room-photo';photo.setAttribute('aria-hidden','true');room.prepend(photo);
      }
      if(room.matches('.postal-experience')&&!room.querySelector(':scope > .liquid-room-glass')){
        const glass=document.createElement('span');glass.className='liquid-room-glass';glass.setAttribute('aria-hidden','true');room.prepend(glass);
      }
    });
    document.querySelectorAll('.island-sticker').forEach((sticker,i) => {
      if (ambientItems.has(sticker)) return;
      const art = sticker.querySelector('use'); if (!art) return;
      const floating = sticker.matches('.sticker-jellyfish,.sticker-cloud,.sticker-bottle,.sticker-lantern');
      const lift = floating ? -5 : -2.5, turn = i % 2 ? 2 : -2;
      const animation=art.animate([
        {transform:'translateY(0px) rotate(0deg)'},
        {transform:`translateY(${lift}px) rotate(${turn}deg)`},
        {transform:'translateY(0px) rotate(0deg)'}
      ],{duration:6800+i%4*1200,iterations:Infinity,easing:'ease-in-out'});
      animation.currentTime=i*830;bindAmbient(sticker,[animation]);
    });
    document.querySelectorAll('[data-pencil-ambient]').forEach((art,i)=>{
      if(ambientItems.has(art))return;
      const stamp=art.dataset.pencilAmbient==='stamp';
      const frames=stamp?[{transform:'rotate(-7deg) scale(1.08)',opacity:.4},{transform:'rotate(0deg) scale(1)',opacity:1}]:[
        {transform:'translateY(0) rotate(-2deg)'},{transform:'translateY(-4px) rotate(2deg)'},{transform:'translateY(0) rotate(-2deg)'}
      ];
      bindAmbient(art,[art.animate(frames,{duration:stamp?460:7200+i%3*1100,iterations:stamp?1:Infinity,easing:stamp?'ease-out':'ease-in-out'})]);
    });
    document.querySelectorAll(liquidSurfaces+',[data-liquid-room]').forEach((surface,i) => {
      if (surface.matches('.souvenir-ticket') || surface.closest('.memory-card,.draw-ritual,dialog')) return;
      surface.dataset.liquidSurface='true';
      if (ambientItems.has(surface)) return;
      if (getComputedStyle(surface).position === 'static') surface.classList.add('ambient-surface');
      const light=document.createElement('span');light.className='glass-breath-light';light.setAttribute('aria-hidden','true');surface.append(light);
      const animation=light.animate([
        {opacity:.18},
        {opacity:.42},
        {opacity:.18}
      ],{duration:12500+i%3*1500,iterations:Infinity,easing:'ease-in-out'});
      animation.currentTime=i*700;bindAmbient(surface,[animation]);
    });
    document.querySelectorAll('.guide-water-motion,.guide-cloud-motion').forEach(el => {
      if (ambientItems.has(el)) return;
      const water=el.classList.contains('guide-water-motion');
      const ink=el.querySelector('.guide-motion-ink')||el;
      const harbor=el.dataset.guideFeature==='harbor';
      const frames=water?[{strokeDashoffset:0,opacity:.12},{strokeDashoffset:harbor?-36:-48,opacity:.32}]:[{transform:'translateX(-3px)',opacity:.1},{transform:'translateX(3px)',opacity:.18}];
      // Keep the clip region fixed. Only ink inside the registered sea/valley moves.
      bindAmbient(el,[ink.animate(frames,{duration:water?(harbor?10500:14500):26000,iterations:Infinity,direction:'alternate',easing:'ease-in-out'})],true);
    });
    if(!ambientMutationObserver){
      ambientMutationObserver=new MutationObserver(records=>{
        const changed=records.some(record=>Array.from(record.addedNodes).some(node=>node.nodeType===1&&!node.matches('.glass-breath-light,.liquid-room-photo,.liquid-room-glass'))||Array.from(record.removedNodes).some(node=>node.nodeType===1));
        if(changed&&!ambientQueued){ambientQueued=true;queueMicrotask(()=>{ambientQueued=false;installAmbient();});}
      });
      ambientMutationObserver.observe(document.querySelector('#main'),{childList:true,subtree:true});
    }
    syncAmbient();
  }
  const bird = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M9 33C-1 13 18 2 32 14l8-2-2 9c10 17-17 24-29 12Z" fill="#f5fbff" stroke="#598eaf" stroke-width="2"/><path d="m35 24 9 3-9 3" fill="#e7bf7b"/><circle cx="29" cy="22" r="2" fill="#285777"/><path d="M12 28q8-8 14 0" fill="none" stroke="#aacde3" stroke-width="3"/><path d="m17 41-3 5m12-5 3 5" stroke="#598eaf" stroke-width="2"/></svg>';

  function shellLinks() {
    if (!production) document.querySelector('.desktop-nav')?.insertAdjacentHTML('beforeend', `<a href="effects.html" ${page === 'effects' ? 'aria-current="page"' : ''}>特效体验 ✦</a>`);
    
  }

  function initStars() {
    const canvas = document.createElement('canvas');
    canvas.className = 'starfield'; canvas.setAttribute('aria-hidden', 'true');
    document.body.append(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
    const colors = ['#8fcbef', '#c8b4ed', '#f2d3e9', '#ffffff'];
    const particles = [];
    let frame = 0, lastTime = 0, cursor = null, lastMove = null, hover = false;
    function resize() {
      const ratio = Math.min(devicePixelRatio || 1, 1.5);
      canvas.width = innerWidth * ratio; canvas.height = innerHeight * ratio;
      canvas.style.width = `${innerWidth}px`; canvas.style.height = `${innerHeight}px`;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
    function star(x, y, size, angle, color, alpha) {
      ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.rotate(angle);
      ctx.beginPath(); ctx.moveTo(0, -size); ctx.quadraticCurveTo(size * .22, -size * .22, size, 0);
      ctx.quadraticCurveTo(size * .22, size * .22, 0, size); ctx.quadraticCurveTo(-size * .22, size * .22, -size, 0);
      ctx.quadraticCurveTo(-size * .22, -size * .22, 0, -size);
      ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = size * 1.4; ctx.fill(); ctx.restore();
    }
    function emit(x, y, count = 2, spread = 1) {
      for (let i = 0; i < count; i++) {
        if (particles.length >= 95) particles.shift();
        const angle = Math.random() * Math.PI * 2;
        particles.push({ x, y, vx: Math.cos(angle) * spread * (20 + Math.random() * 55), vy: Math.sin(angle) * spread * (20 + Math.random() * 55), age: 0, life: .5 + Math.random() * .45, size: 2 + Math.random() * 4, angle, color: colors[i % colors.length] });
      }
      start();
    }
    function draw(now) {
      frame = 0;
      if (!enabled()) return;
      const dt = clamp((now - lastTime) / 1000 || .016, .001, .04); lastTime = now;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]; p.age += dt;
        if (p.age >= p.life) { particles.splice(i, 1); continue; }
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 12 * dt;
        star(p.x, p.y, p.size * (1 - p.age / p.life), p.angle + p.age, p.color, (1 - p.age / p.life) * .8);
      }
      if (cursor && finePointer.matches) {
        star(cursor.x, cursor.y, hover ? 10 : 7, Math.PI / 12, '#4385b0', 1);
        star(cursor.x - 1, cursor.y - 1, hover ? 7 : 4.5, Math.PI / 12, '#effaff', 1);
        if (hover) { ctx.beginPath(); ctx.arc(cursor.x, cursor.y, 16, 0, Math.PI * 2); ctx.strokeStyle = '#8b9dccaa'; ctx.lineWidth = 1; ctx.stroke(); }
      }
      // Cursor stays painted when idle; animate only while particles are alive.
      if (particles.length) frame = requestAnimationFrame(draw);
    }
    function start() { if (!frame && enabled()) { lastTime = performance.now(); frame = requestAnimationFrame(draw); } }
    function clear() {
      cancelAnimationFrame(frame); frame = 0; particles.length = 0; cursor = null; lastMove = null;
      ctx.clearRect(0, 0, innerWidth, innerHeight); world.classList.remove('star-cursor-on');
    }
    addEventListener('resize', resize);
    document.addEventListener('pointermove', (event) => {
      if (!enabled() || event.pointerType !== 'mouse' || !finePointer.matches) return;
      const nativeCursor = event.target.closest('input,textarea,select,[contenteditable],dialog');
      if (nativeCursor) { clear(); return; }
      hover = Boolean(event.target.closest('a,button,summary'));
      cursor = { x: event.clientX, y: event.clientY }; world.classList.add('star-cursor-on');
      const distance = lastMove ? Math.hypot(cursor.x - lastMove.x, cursor.y - lastMove.y) : 0;
      if (distance > 3) emit(cursor.x, cursor.y, Math.min(5, Math.ceil(distance / 13)), .35);
      lastMove = { ...cursor }; start();
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', clear);
    document.addEventListener('pointerdown', (event) => {
      if (enabled() && !event.target.closest('input,textarea,select,dialog')) emit(event.clientX, event.clientY, event.pointerType === 'mouse' ? 12 : 18, .8);
    }, { passive: true });
    document.addEventListener('buzhi:burst', (event) => {
      if (enabled()) emit(event.detail.x, event.detail.y, event.detail.count || 36, 1.3);
    });
    subscribe(() => { if (!enabled()) clear(); });
    finePointer.addEventListener('change', clear);
    resize();
  }

  function initIsland() {
    if (page !== 'home') return;
    const scene = document.createElement('div');
    scene.className = 'island-scene'; scene.setAttribute('aria-hidden', 'true');
    scene.innerHTML = `<div class="sea-glimmer"></div><svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" focusable="false">
      <image class="scene-land" href="assets/island-scenery.svg" width="1600" height="1000"/>
      <g class="scene-shore"><path d="M774 424c45-119 223-166 375-139 157-59 354 16 381 141 64 141-51 258-212 278-198 56-451-9-514-128-32-55-58-111-30-152Z"/></g>
      <g class="scene-shore shore-two"><path d="M774 424c45-119 223-166 375-139 157-59 354 16 381 141 64 141-51 258-212 278-198 56-451-9-514-128-32-55-58-111-30-152Z"/></g>
      <g class="scene-shore shore-three"><path d="M774 424c45-119 223-166 375-139 157-59 354 16 381 141 64 141-51 258-212 278-198 56-451-9-514-128-32-55-58-111-30-152Z"/></g>
      <g transform="translate(913 445)"><g class="scene-tree"><path d="M0 27q6-36-1-64" stroke="#a9a383" stroke-width="8" stroke-linecap="round"/><path d="M-1-37q-51-34-64 4 32-17 64-4Z" fill="#72ad9b"/><path d="M-1-37q-11-55 26-49-18 20-26 49Z" fill="#b8d8a9"/><path d="M-1-37q36-35 64-4-34-6-64 4Z" fill="#91c5a4"/><path d="M-1-37q-35 5-36 38 13-21 36-38Z" fill="#88bea1"/><path d="M-1-37q35 3 37 35-19-22-37-35Z" fill="#acd0a9"/></g></g>
      <g transform="translate(1353 487) scale(.8)"><g class="scene-tree tree-two"><path d="M0 27q6-36-1-64" stroke="#a9a383" stroke-width="8" stroke-linecap="round"/><path d="M-1-37q-51-34-64 4 32-17 64-4Z" fill="#72ad9b"/><path d="M-1-37q-11-55 26-49-18 20-26 49Z" fill="#b8d8a9"/><path d="M-1-37q36-35 64-4-34-6-64 4Z" fill="#91c5a4"/><path d="M-1-37q-35 5-36 38 13-21 36-38Z" fill="#88bea1"/><path d="M-1-37q35 3 37 35-19-22-37-35Z" fill="#acd0a9"/></g></g>
      <g transform="translate(1293 744)"><g class="scene-boat"><ellipse cy="19" rx="43" ry="8" fill="#397b9822"/><path d="m-41 0 18 23h43L39 0Z" fill="#fff4e7"/><path d="m-34 5 13 14h37L28 5Z" fill="#b6c7d6"/><path d="M-3 0v-79" stroke="#9e9da5" stroke-width="3"/><path d="M-7-72-35-10H-7Z" fill="#fff9ee"/><path d="M2-77v67h32Z" fill="#ebc1d4"/><path d="M-5-83 16-79-5-72Z" fill="#c2b3d4"/></g></g>
      <path class="scene-light" d="m1431 310-260-39 5 74Z" fill="#fffbd8"/>
      <g transform="translate(801 209)"><g class="scene-cloud"><path d="M-80 19c-24-8-17-31 3-33 5-39 52-52 75-24 20-30 60-10 59 14 45-2 56 38 20 48-51 11-113 8-157-5Z" fill="#f4ffff"/></g></g>
      <g transform="translate(1495 183) scale(.85)"><g class="scene-cloud cloud-two"><path d="M-80 19c-24-8-17-31 3-33 5-39 52-52 75-24 20-30 60-10 59 14 45-2 56 38 20 48-51 11-113 8-157-5Z" fill="#f4ffff"/></g></g>
      <g transform="translate(668 725) scale(.8)"><g class="scene-cloud cloud-three"><path d="M-80 19c-24-8-17-31 3-33 5-39 52-52 75-24 20-30 60-10 59 14 45-2 56 38 20 48-51 11-113 8-157-5Z" fill="#f4ffff"/></g></g>
      <g class="scene-bird" fill="none" stroke="#f6ffff" stroke-width="3" stroke-linecap="round"><path d="M1085 191q9-12 18 0 9-12 18 0m28 22q7-9 14 0 7-9 14 0m159-67q7-9 14 0 7-9 14 0"/></g>
    </svg>`;
    world.prepend(scene);
    const narrow = matchMedia('(max-width: 620px)');
    function frameScene() {
      scene.querySelector('svg').setAttribute('preserveAspectRatio', narrow.matches ? 'xMaxYMid slice' : 'xMidYMid slice');
    }
    narrow.addEventListener('change', frameScene); frameScene();
    subscribe(() => scene.classList.toggle('is-paused', !enabled()));
    world.dataset.island = 'ready';
  }

  function initWater() {
    if (page !== 'home') return;
    const canvas = document.createElement('canvas'); canvas.className = 'water-surface'; canvas.setAttribute('aria-hidden', 'true');
    world.prepend(canvas);
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'low-power' });
    if (!gl) { canvas.remove(); world.dataset.water = 'css-fallback'; return; }
    const vertex = 'attribute vec2 a_position; varying vec2 vUv; void main(){vUv=.5*(a_position+1.);gl_Position=vec4(a_position,0.,1.);}';
    // The reference's noise + distorted image coordinates, on an original procedural sea texture.
    const fragment = `precision mediump float;
      varying vec2 vUv; uniform sampler2D u_image; uniform float u_time; uniform float u_ratio;
      mat2 rotate2D(float a){return mat2(cos(a),sin(a),-sin(a),cos(a));}
      float noise(vec2 p){return sin(p.x*1.7+sin(p.y*1.3))*cos(p.y*1.9+sin(p.x*.8));}
      float surface(vec2 uv,float t){vec2 n=vec2(.1),N=vec2(.1);float scale=7.;mat2 m=rotate2D(.5);
        for(int j=0;j<8;j++){uv=m*uv;n=m*n;vec2 q=uv*scale+float(j)+n+(.5+.5*float(j))*(mod(float(j),2.)-1.)*t;n+=sin(q);N+=cos(q)/scale;scale*=1.2;}
        return pow(N.x+N.y+.1,2.);}
      float spreading(vec2 uv,vec2 origin,float delay){
        float age=mod(u_time+delay,10.);float front=length(uv-origin)-age*.27;
        float fade=smoothstep(0.,.65,age)*(1.-smoothstep(7.,10.,age));
        return sin(front*45.)*exp(-front*front*26.)*fade;}
      void main(){float t=u_time*.28;vec2 uv=vec2(vUv.x*u_ratio,1.-vUv.y);
        float outer=noise(uv*.65+vec2(0.,t*.15));float s=surface(uv*2.+outer*.15,t);
        float wave=spreading(uv,vec2(u_ratio*.16,.73),0.)+spreading(uv,vec2(u_ratio*.79,.4),5.);
        vec2 imageUV=vUv;imageUV+=vec2(outer*.012+s*.018+wave*.012,outer*.009+s*.011+wave*.016);
        vec3 color=texture2D(u_image,imageUV).rgb;float light=pow(clamp(s*1.2,0.,1.),1.5);
        color*=1.+wave*.06;color=mix(color,vec3(.91,1.,.98),clamp(light*.7+max(wave,0.)*.18,0.,.8));gl_FragColor=vec4(color,1.);}`;
    function compile(type, source) {
      const shader = gl.createShader(type); gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { gl.deleteShader(shader); return null; }
      return shader;
    }
    const vs = compile(gl.VERTEX_SHADER, vertex), fs = compile(gl.FRAGMENT_SHADER, fragment);
    if (!vs || !fs) { canvas.remove(); world.dataset.water = 'css-fallback'; return; }
    const program = gl.createProgram(); gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { canvas.remove(); world.dataset.water = 'css-fallback'; return; }
    gl.useProgram(program);
    const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(program, 'a_position'); gl.enableVertexAttribArray(pos); gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
    const textureCanvas = document.createElement('canvas'); textureCanvas.width = 1200; textureCanvas.height = 900;
    const context = textureCanvas.getContext('2d');
    const gradient = context.createLinearGradient(0, 0, 1200, 900); gradient.addColorStop(0, '#a6dce5'); gradient.addColorStop(.38, '#8cd4df'); gradient.addColorStop(.7, '#86c6d7'); gradient.addColorStop(1, '#75b4cd');
    context.fillStyle = gradient; context.fillRect(0, 0, 1200, 900);
    for (let i = -4; i < 18; i++) {
      context.beginPath(); context.moveTo(i * 135, -80); context.bezierCurveTo(i * 120 - 170, 300, i * 140 + 240, 550, i * 120 - 160, 980);
      context.strokeStyle = '#e7fffc55'; context.lineWidth = 2 + (i % 3); context.stroke();
    }
    const texture = gl.createTexture(); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureCanvas);
    gl.uniform1i(gl.getUniformLocation(program, 'u_image'), 0);
    const time = gl.getUniformLocation(program, 'u_time'); const ratio = gl.getUniformLocation(program, 'u_ratio');
    let frame = 0, previous = 0, clock = 0, lost = false;
    function render(now) {
      frame = 0; if (!enabled() || lost) return;
      if (now - previous >= 45) {
        clock += Math.min(now - previous, 100); previous = now;
        gl.uniform1f(time, clock / 1000); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
      frame = requestAnimationFrame(render);
    }
    function resize() {
      const scale = Math.min(devicePixelRatio || 1, innerWidth < 700 ? .8 : 1.15);
      canvas.width = Math.round(innerWidth * scale); canvas.height = Math.round(innerHeight * scale);
      gl.viewport(0, 0, canvas.width, canvas.height); gl.uniform1f(ratio, innerWidth / innerHeight);
      gl.uniform1f(time, clock / 1000); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    addEventListener('resize', resize);
    canvas.addEventListener('webglcontextlost', (event) => { event.preventDefault(); lost = true; cancelAnimationFrame(frame); frame = 0; world.classList.remove('water-ready'); world.dataset.water = 'css-fallback'; });
    resize(); world.classList.add('water-ready'); world.dataset.water = 'webgl';
    subscribe(() => { cancelAnimationFrame(frame); frame = 0; if (enabled() && !lost) { previous = performance.now(); frame = requestAnimationFrame(render); } });
  }

  function installExhibit() {
    const grid = document.querySelector('#collection-grid'); if (!grid) return;
    const controls = document.createElement('div'); controls.className = 'appreciation-toolbar';
    controls.innerHTML = `<span class="exhibit-mode-label">${'<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v15H4zM8 2v6m8-6v6" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>'} 回忆展馆</span><div class="filter-tabs" aria-label="收藏展示方式">${[['grid','collectionGrid','网格'],['fan','collectionFan','扇形展开'],['circle','collectionRing','圆环欣赏']].filter(([,key])=>allowedMode(key)).map(([mode,,label])=>'<button type="button" data-layout="'+mode+'" aria-pressed="false">'+label+'</button>').join('')}</div>`;
    grid.before(controls);
    const exhibit = document.createElement('section'); exhibit.className = 'glass collection-exhibit'; exhibit.hidden = true;
    exhibit.setAttribute('aria-label', '卡片展开欣赏');
    exhibit.innerHTML = '<div class="exhibit-sparkle" aria-hidden="true">✦</div><div class="exhibit-caption"><span id="exhibit-title">生日回忆</span><small>拖动切换 · 点击卡片查看详情</small></div><div class="exhibit-cards"></div><div class="exhibit-controls"><button class="btn" type="button" data-exhibit-prev aria-label="上一张卡">←</button><span class="mono" data-exhibit-count></span><button class="btn" type="button" data-exhibit-next aria-label="下一张卡">→</button></div>';
    controls.after(exhibit);
    const holder = exhibit.querySelector('.exhibit-cards');
    let mode = allowedMode('collectionFan')?'fan':allowedMode('collectionGrid')?'grid':'circle', selected = 0, cards = [], drag = null, dragged = false;
    function layout() {
      const n = cards.length;
      exhibit.dataset.layout = mode;
      if (!n) {
        if(!holder.querySelector('.exhibit-empty')){
          const empty=document.createElement('div');empty.className='exhibit-empty';
          empty.textContent=grid.querySelector('.collection-empty')?.textContent||'没有找到这份回忆，换个筛选条件试试。';holder.replaceChildren(empty);
        }
        exhibit.querySelector('[data-exhibit-count]').textContent = '00 / 00'; return;
      }
      selected = wrap(selected, n);
      const width = exhibit.clientWidth; const small = width < 600;
      const radius = Math.min(width * .34, small ? 135 : 210);
      cards.forEach((card, i) => {
        let delta = wrap(i - selected + n / 2, n) - n / 2;
        let x, y, angle, scale, opacity;
        if (mode === 'fan') {
          angle = clamp(delta * 12, -68, 68); const radian = angle * Math.PI / 180;
          x = Math.sin(radian) * (small ? 145 : 255); y = (1 - Math.cos(radian)) * (small ? 90 : 155) - (delta === 0 ? 18 : 0);
          scale = delta === 0 ? (small ? .91 : 1.06) : (small ? .7 : .85); opacity = Math.abs(delta) <= 4 ? 1 - Math.abs(delta) * .09 : 0;
        } else {
          const radian = delta / n * Math.PI * 2 + Math.PI / 2;
          x = Math.cos(radian) * radius; y = Math.sin(radian) * (small ? 96 : 135) - 14;
          angle = 0; scale = delta === 0 ? (small ? .78 : .94) : (small ? .46 : .62); opacity = delta === 0 ? 1 : .76;
        }
        card.style.transform = `translate(-50%,-50%) translate(${x}px,${y}px) rotate(${angle}deg) scale(${scale})`;
        card.style.opacity = opacity; card.style.visibility = opacity ? 'visible' : 'hidden';
        card.style.zIndex = String(100 - Math.round(Math.abs(delta) * 4)); card.tabIndex = opacity && (delta === 0) ? 0 : -1;
        card.classList.toggle('is-selected', delta === 0);
      });
      exhibit.querySelector('[data-exhibit-count]').textContent = `${String(selected + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}`;
      exhibit.querySelector('#exhibit-title').textContent = cards[selected].querySelector('.card-title').textContent;
    }
    function rebuild() {
      holder.replaceChildren(...Array.from(grid.querySelectorAll('.memory-card')).map((card) => card.cloneNode(true)));
      cards = Array.from(holder.querySelectorAll('.memory-card')); selected = Math.min(selected, cards.length - 1); layout();
    }
    function choose(next) {
      mode = next; grid.hidden = mode !== 'grid'; exhibit.hidden = mode === 'grid';
      controls.querySelectorAll('[data-layout]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.layout === mode)));
      if (mode !== 'grid') { rebuild(); layout(); }
    }
    controls.addEventListener('click', (event) => { const b = event.target.closest('[data-layout]'); if (b) choose(b.dataset.layout); });
    exhibit.querySelector('[data-exhibit-prev]').onclick = () => { selected -= 1; layout(); };
    exhibit.querySelector('[data-exhibit-next]').onclick = () => { selected += 1; layout(); };
    holder.addEventListener('pointerdown', (event) => { if (!event.isPrimary || event.button > 0) return; drag = { x: event.clientX, index: selected, id: event.pointerId }; dragged = false; });
    holder.addEventListener('pointermove', (event) => {
      if (!drag) return; const distance = event.clientX - drag.x;
      if (Math.abs(distance) > 9) { dragged = true; if (!holder.hasPointerCapture(event.pointerId)) holder.setPointerCapture(event.pointerId); selected = drag.index - Math.round(distance / 65); layout(); }
    });
    holder.addEventListener('pointerup', () => { drag = null; if (dragged) setTimeout(() => { dragged = false; }, 50); });
    holder.addEventListener('pointercancel', () => { drag = null; dragged = false; });
    holder.addEventListener('click', (event) => {
      if (dragged) { event.preventDefault(); event.stopImmediatePropagation(); }
    }, true);
    exhibit.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); selected += event.key === 'ArrowRight' ? 1 : -1; layout(); }
    });
    new MutationObserver(rebuild).observe(grid, { childList: true });
    new ResizeObserver(layout).observe(exhibit);
    choose(mode);
    const onHash = () => { if (location.hash === '#appreciate' && allowedMode('collectionFan')) { choose('fan'); controls.scrollIntoView({ block: 'start', behavior: enabled() ? 'smooth' : 'auto' }); } };
    addEventListener('hashchange', onHash); onHash();
  }

  const progressByAccount=new Map();
  let milestoneTimers=[],activeMilestone=null;
  function clearMilestone(){
    milestoneTimers.forEach(clearTimeout);milestoneTimers=[];
    if(activeMilestone){activeMilestone.closest('.bird-journey')?.classList.remove('has-milestone-gift');activeMilestone.remove();activeMilestone=null}
  }
  document.addEventListener('buzhi:render',clearMilestone);
  subscribe(()=>{if(!enabled())clearMilestone()});
  function revealMilestone(figure,n){
    if(!figure.isConnected||!enabled()||!allowedMode('effectProgress'))return;
    const card=document.createElement('div');card.className='milestone-surprise';card.dataset.milestoneCelebration=String(n);card.setAttribute('role','status');
    card.innerHTML=`<div class="milestone-package ${n===3?'milestone-envelope':'milestone-present'}" aria-hidden="true"><span>✦</span></div><div class="milestone-message"><small>${n} 项任务 · 小岛的惊喜</small><strong>${n===3?'肥啾送来一封星光信':'庆典礼盒送达啦'}</strong><span>阶段奖励 +25 金币已到账</span></div><div class="milestone-sparkles" aria-hidden="true">${Array.from({length:8},(_,i)=>`<i style="--sx:${12+i*11}%;--sy:${i%2?15:80}%;--sd:${i*.07}s">${n===3?'✦':'✧'}</i>`).join('')}</div>`;
    activeMilestone=card;figure.after(card);
    const r=figure.querySelector('.flight-bird').getBoundingClientRect();document.dispatchEvent(new CustomEvent('buzhi:burst',{detail:{x:r.x+r.width/2,y:r.y+r.height/2,count:innerWidth<620?12:20}}));
    milestoneTimers.push(setTimeout(()=>{card.remove();figure.classList.remove('has-milestone-gift');if(activeMilestone===card)activeMilestone=null},2100));
  }
  function installProgress() {
    const track=document.querySelector('.progress-track');if(!track)return;
    const count=Number(track.dataset.completed||0),account=track.dataset.account||'demo';
    const fresh=[...new Set((track.dataset.newBonuses||'').split(',').map(Number).filter(n=>n===3||n===6))];
    const previous=progressByAccount.has(account)?progressByAccount.get(account):count;
    progressByAccount.set(account,count);
    const figure=document.createElement('div');figure.className='bird-journey';
    figure.setAttribute('role','progressbar');figure.setAttribute('aria-label','不同正式任务完成进度');figure.setAttribute('aria-valuemin','0');figure.setAttribute('aria-valuemax','9');figure.setAttribute('aria-valuenow',String(Math.min(9,count)));figure.setAttribute('aria-valuetext',`已完成 ${count} 种不同正式任务`);
    figure.style.setProperty('--progress',`${clamp(previous/9*100,0,100)}%`);
    figure.innerHTML=`<div class="flight-cloud cloud-left"></div><div class="flight-cloud cloud-right"></div><div class="flight-line"></div><div class="flight-bird">${bird}<span class="flight-envelope">✉</span></div><div class="flight-markers"><span>出发</span><span>3</span><span>6</span><span>9 · 待开放</span></div><p>每一次参与，都让肥啾飞得更远。</p>`;
    track.replaceWith(figure);requestAnimationFrame(()=>figure.style.setProperty('--progress',`${clamp(count/9*100,0,100)}%`));
    if(enabled()&&allowedMode('effectProgress'))fresh.forEach((n,i)=>milestoneTimers.push(setTimeout(()=>revealMilestone(figure,n),1200+i*2300)));
  }
  function sessionStorageSafe(key) { try { return sessionStorage.getItem(key); } catch { return null; } }

  function installDrawEffects() {
    const stage = document.querySelector('#draw-stage'); if (!stage) return;
    if (stage.dataset.deliveryReady === 'true') return;
    const source = document.querySelector('.pool-preview');
    if (source) { source.classList.add('wave-preview'); Array.from(source.children).forEach((el, i) => el.style.setProperty('--wave-delay', `${-i * .28}s`)); }
    // The bird carries the actual card mount, not an extra reward or fake result.
    const delivery = document.createElement('div'); delivery.className = 'draw-delivery';
    const cardMount = stage.querySelector('#stage-card');
    cardMount.before(delivery); delivery.append(cardMount);
    delivery.insertAdjacentHTML('beforeend', `<div class="draw-courier" aria-hidden="true"><svg viewBox="0 0 200 160" fill="none">
      <ellipse cx="98" cy="143" rx="50" ry="7" fill="#699db8" opacity=".12"/>
      <path d="m68 132-8 14m9-4-14-1m49-6 4 13m-5-3 14-2" stroke="#a88457" stroke-width="4" stroke-linecap="round"/>
      <path d="m38 88-23 8 21 13" fill="#cce6ef" stroke="#6393aa" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M37 109C14 85 24 44 53 33c6-21 24-27 39-15 18-14 35-5 40 7 32 1 52 26 48 58-1 33-21 54-61 57-33 3-64-6-82-31Z" fill="#fffdf7" stroke="#6393aa" stroke-width="2.5"/>
      <path d="M49 97c22 12 57 18 100 2 5 25-17 36-40 36-29 0-49-10-60-38Z" fill="#e3f2f4"/>
      <g class="courier-wing"><path d="M66 74c-28-13-39 9-27 26 6 10 22 13 40-1" fill="#d4eaf1" stroke="#739eae" stroke-width="2.5" stroke-linecap="round"/><path d="m45 93 18 5" stroke="#a5c7d5" stroke-width="3" stroke-linecap="round"/></g>
      <g class="courier-eye courier-eye-open"><ellipse cx="137" cy="59" rx="5" ry="7" fill="#315b70"/><circle cx="138" cy="57" r="1.5" fill="white"/></g>
      <path class="courier-eye-sleep" d="M131 60q6 6 12 0" stroke="#315b70" stroke-width="3" stroke-linecap="round"/>
      <g class="courier-nap" stroke="#91a9bf" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m146 32 9-1-7 9 9-1m3-23 12-1-10 12 12-1"/></g>
      <ellipse cx="147" cy="78" rx="12" ry="6" fill="#efc0cf" opacity=".7"/>
      <path d="m170 82 23 15-25 5" fill="#eabf73" stroke="#a88556" stroke-width="2.3" stroke-linejoin="round"/>
      <path d="m171 94 20 3" stroke="#a88556" stroke-width="1.8"/>
      <path d="m74 28 8 6m10-11 6 8" stroke="#bed6de" stroke-width="2.5" stroke-linecap="round"/>
      <g class="courier-happiness" stroke="#a8b5d6" stroke-width="2.5" stroke-linecap="round"><path d="m163 16 3-9m12 18 8-4m-8 17 9 2"/></g>
    </svg></div>`);
    const sky = document.createElement('div'); sky.className = 'draw-meteor-sky'; sky.setAttribute('aria-hidden', 'true');
    sky.innerHTML = Array.from({ length: 30 }, (_, i) => `<i class="draw-meteor" style="--meteor-x:${42 + i * 19 % 103}%;--meteor-y:${-28 + i * 11 % 72}%;--meteor-delay:${(i * .055).toFixed(3)}s;--meteor-duration:${(1.3 + i % 4 * .15).toFixed(2)}s"></i>`).join('');
    stage.prepend(sky);
    const ritual = document.createElement('div'); ritual.className = 'draw-ritual';
    ritual.setAttribute('aria-hidden', 'true'); ritual.dataset.ritualState = 'rest';
    const nightfall = world.querySelector('.draw-nightfall') || document.createElement('div');
    nightfall.className = 'draw-nightfall'; nightfall.setAttribute('aria-hidden', 'true');
    if (!nightfall.isConnected) world.append(nightfall);
    world.dataset.drawNight = 'false';
    ritual.innerHTML = `<div class="draw-orbit"><svg viewBox="0 0 400 400" fill="none" aria-hidden="true"><g stroke="currentColor"><circle cx="200" cy="200" r="172" stroke-width="1"/><circle cx="200" cy="200" r="164" stroke-width=".6"/><circle cx="200" cy="200" r="149" stroke-dasharray="1 9" stroke-width="2"/><circle cx="200" cy="200" r="122" stroke-width=".5"/><path d="M200 14v34m0 304v34M14 200h34m304 0h34M69 69l24 24m214 214 24 24M69 331l24-24m214-214 24-24" stroke-width="1"/><path d="m200 32 6 15-6 15-6-15Zm0 306 6 15-6 15-6-15ZM32 200l15-6 15 6-15 6Zm306 0 15-6 15 6-15 6Z"/><path d="M114 309q43-12 86 0t86 0m-148 10q31-8 62 0t62 0" stroke-width=".7"/><path d="M211 77c-22-5-35 28-11 38 10 5 20 1 24-5-21 4-32-22-13-33Z" fill="currentColor" stroke="none"/></g></svg></div><div class="draw-rising-light"></div>`;
    ritual.insertAdjacentHTML('beforeend', Array.from({length:16},(_,i)=>{const a=i*Math.PI/8,r=170+(i%3)*10;return `<i class="draw-wish-star" style="--wish-x:${(Math.cos(a)*r).toFixed(1)}px;--wish-y:${(Math.sin(a)*r).toFixed(1)}px;--wish-delay:${(i%4*.1).toFixed(1)}s"></i>`}).join(''));
    stage.prepend(ritual);
    stage.dataset.deliveryReady = 'true';
    installDrawButtonBird(stage);
    const restRitual = () => { ritual.dataset.ritualState = 'rest'; world.dataset.drawNight = 'false'; };
    subscribe(() => { stage.dataset.deliveryMotion = enabled() ? 'on' : 'off'; if (!enabled()) restRitual(); });
    const sweep = document.createElement('div'); sweep.className = 'reveal-starlight'; sweep.setAttribute('aria-hidden', 'true');
    sweep.innerHTML = '<span>✦</span><i></i><b>✧</b>'; stage.append(sweep);
    let phase = 'rest';
    ritual.addEventListener('animationend', event => {
      if (event.target === ritual && event.animationName === 'ritual-dissolve') restRitual();
    });
    new MutationObserver(() => {
      const next = stage.classList.contains('is-drawing') ? 'drawing' : stage.classList.contains('is-revealed') ? 'revealing' : 'rest';
      if (next === phase) return;
      phase = next; ritual.dataset.ritualState = enabled() ? next : 'rest';
      world.dataset.drawNight = String(enabled() && next !== 'rest');
      if (next === 'revealing' && enabled()) {
        const bounds = stage.getBoundingClientRect();
        document.dispatchEvent(new CustomEvent('buzhi:burst', { detail: { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height * .45, count: 72 } }));
      }
    }).observe(stage, { attributes: true, attributeFilter: ['class'] });
  }

  function installDrawButtonBird(stage) {
    const button = document.querySelector('#draw-button');
    if (!button) { stage.dataset.birdMood = 'rest'; return; }
    // The original button keeps its handlers, label and settlement logic.
    // The decoration is a sibling so updates to button.textContent cannot erase it.
    const nest = document.createElement('div'); nest.className = 'draw-button-nest';
    button.before(nest); nest.append(button);
    const figure = document.createElement('span'); figure.className = 'draw-button-bird';
    figure.setAttribute('aria-hidden', 'true');
    figure.append(stage.querySelector('.draw-courier svg').cloneNode(true)); nest.append(figure);
    let hovering = false, pressing = false;
    function updateMood() {
      const mood = !enabled() ? 'rest' : stage.classList.contains('is-drawing') ? 'sending' : stage.classList.contains('is-revealed') ? 'celebrate' : button.disabled ? 'rest' : hovering || pressing || button.matches(':focus-visible') ? 'awake' : 'sleep';
      nest.dataset.birdMood = mood; stage.dataset.birdMood = mood;
    }
    button.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') { hovering = true; updateMood(); } });
    button.addEventListener('pointerleave', () => { hovering = false; pressing = false; updateMood(); });
    button.addEventListener('pointerdown', event => { if (event.button === 0) { pressing = true; updateMood(); } });
    for (const type of ['pointerup', 'pointercancel', 'blur']) button.addEventListener(type, () => { pressing = false; updateMood(); });
    button.addEventListener('focus', updateMood);
    new MutationObserver(updateMood).observe(button, { attributes: true, attributeFilter: ['disabled'] });
    new MutationObserver(updateMood).observe(stage, { attributes: true, attributeFilter: ['class'] });
    subscribe(updateMood);
  }

  function installGuide() {
    const voyage = document.querySelector('#voyage'); if (!voyage) return;
    if (voyage.dataset.guideReady === 'true') return;
    const camera = voyage.querySelector('#map-camera'), map = voyage.querySelector('.voyage-map');
    const stage = voyage.querySelector('.guide-map-stage');
    const entries = Array.from(voyage.querySelector('#voyage-stops').content.querySelectorAll('[data-guide-entry]'));
    const pins = Array.from(voyage.querySelectorAll('[data-map-stop]'));
    const motion = () => enabled() && allowedMode('effectGuide');
    let active = 0, unsubscribe;
    // Artwork, leader lines and ground anchors always use the same fixed viewBox.
    // Navigation pans the viewport, never the picture underneath HTML labels.
    camera.setAttribute('transform','translate(0 0)');
    function placePins() {
      const matrix = camera.getScreenCTM(); if (!matrix) return;
      const bounds = stage.getBoundingClientRect();
      const ratioX=stage.clientWidth/bounds.width,ratioY=stage.clientHeight/bounds.height;
      pins.forEach(pin => {
        const point = new DOMPoint(Number(pin.dataset.labelX), Number(pin.dataset.labelY)).matrixTransform(matrix);
        pin.style.left = `${(point.x-bounds.left)*ratioX}px`;
        pin.style.top = `${(point.y-bounds.top)*ratioY}px`;
      });
    }
    function panToActive(animate=false) {
      if(!voyage.isConnected)return;
      const chosen=pins.find(pin=>Number(pin.dataset.mapStop)===active);
      const matrix=camera.getScreenCTM();if(!matrix)return;
      const target=new DOMPoint(chosen?Number(chosen.dataset.mapX):792,chosen?Number(chosen.dataset.mapY):496.5).matrixTransform(matrix);
      const bounds=map.getBoundingClientRect();
      const left=map.scrollLeft+target.x-bounds.left-map.clientLeft-map.clientWidth/2;
      map.scrollTo({left:clamp(left,0,map.scrollWidth-map.clientWidth),behavior:animate&&motion()?'smooth':'instant'});
    }
    function select(index) {
      active = clamp(index, 0, entries.length - 1);
      const entry = entries[active], action = entry.querySelector('a');
      voyage.querySelector('#voyage-count').textContent = `${String(active + 1).padStart(2, '0')} / ${String(entries.length).padStart(2,'0')}`;
      voyage.querySelector('#voyage-location').textContent = entry.dataset.location;
      voyage.querySelector('#voyage-card-title').textContent = entry.querySelector('h2').textContent;
      voyage.querySelector('#voyage-card-copy').textContent = entry.querySelector('p').textContent;
      const destination = voyage.querySelector('#voyage-destination');
      destination.setAttribute('href', action.getAttribute('href'));
      destination.replaceChildren(...Array.from(action.childNodes, node => node.cloneNode(true)));
      voyage.querySelector('#voyage-prev').disabled = active === 0;
      voyage.querySelector('#voyage-next').disabled = active === entries.length - 1;
      voyage.querySelector('#voyage-overview').setAttribute('aria-pressed', String(active === 0));
      voyage.dataset.stop = active;
      pins.forEach(pin => pin.setAttribute('aria-pressed', String(Number(pin.dataset.mapStop) === active)));
      voyage.querySelectorAll('[data-guide-leader],[data-guide-anchor]').forEach(el=>el.dataset.active=String(Number(el.dataset.guideLeader||el.dataset.guideAnchor)===active));
      placePins();panToActive(true);
    }
    voyage.querySelector('#voyage-prev').onclick = () => select(active - 1);
    voyage.querySelector('#voyage-next').onclick = () => select(active + 1);
    voyage.querySelector('#voyage-overview').onclick = () => select(0);
    pins.forEach(pin => { pin.onclick = () => select(Number(pin.dataset.mapStop)); });
    const resize=new ResizeObserver(()=>{if(!voyage.isConnected){resize.disconnect();return;}placePins();panToActive();});
    resize.observe(stage);resize.observe(map);
    unsubscribe=subscribe(()=>{if(!voyage.isConnected){resize.disconnect();unsubscribe?.();return;}if(!motion())panToActive();});
    document.fonts.ready.then(()=>{if(voyage.isConnected){placePins();panToActive();}});
    voyage.dataset.guideReady = 'true'; select(0);
  }

  function installGallery() {
    const gallery = document.querySelector('#oc-gallery'); if (!gallery) return;
    const track = gallery.querySelector('#oc-track'); const cards = Array.from(track.children); const n = cards.length;
    if (!n) { document.querySelector('#oc-step').textContent='00'; document.querySelector('#oc-help').textContent='暂无公开人物'; gallery.querySelectorAll('button').forEach(b=>b.disabled=true); return; }
    let target = 0, position = 0, frame = 0, mode = n>4||allowedMode('ocSlider')?'slider':allowedMode('ocStagger')?'stagger':'depth', drag = null, wasDragged = false, tiltX = 0, tiltY = 0;
    const step = () => gallery.clientWidth < 600 ? gallery.clientWidth * .86 : Math.min(gallery.clientWidth * .83, 900);
    function paint() {
      const width = gallery.clientWidth, narrow = width < 600;
      gallery.dataset.mode = mode;
      const chosen = wrap(Math.round(position), n);
      cards.forEach((card, i) => {
        const delta = wrap(i - position + n / 2, n) - n / 2;
        let x = delta * step(), y = 0, z = 0, rx = 0, ry = 0, angle = 0, scale = 1, opacity = Math.abs(delta) < .5 ? 1 : .24;
        if (mode === 'stagger') {
          x = ((i % 2) - .5) * (narrow ? 150 : 270); y = (Math.floor(i / 2) - .5) * (narrow ? 185 : 195);
          angle = i % 2 ? 5 : -5; scale = narrow ? .48 : .6; opacity = 1;
        } else if (mode === 'depth') {
          x = ((i % 2) - .5) * (narrow ? 210 : 490) + tiltX * (i + 1); y = (Math.floor(i / 2) - .5) * (narrow ? 160 : 170) + tiltY * (i + 1);
          z = -i * 140; scale = narrow ? .62 : .8; ry = (i % 2 ? -8 : 8) + tiltX * .15; rx = tiltY * -.15; opacity = 1;
        }
        card.style.transform = `translate(-50%,-50%) translate3d(${x}px,${y}px,${z}px) rotateX(${rx}deg) rotateY(${ry}deg) rotate(${angle}deg) scale(${scale})`;
        card.style.opacity = opacity; card.style.zIndex = String(10 - Math.round(Math.abs(delta)));
        card.classList.toggle('active', mode !== 'slider' || i === chosen); card.tabIndex = mode !== 'slider' || i === chosen ? 0 : -1;
      });
      document.querySelector('#oc-step').textContent = String(chosen + 1).padStart(2, '0');
      document.querySelector('#oc-help').textContent = mode === 'slider' ? '拖动欣赏 · 松手后轻轻停靠' : mode === 'stagger' ? '岛民合影墙 · 角色位置示意' : '移动鼠标，看看前后层次';
    }
    function tick() {
      frame = 0; position += (target - position) * .13;
      if (!enabled() || Math.abs(target - position) < .001) position = target;
      paint(); if (position !== target) frame = requestAnimationFrame(tick);
    }
    function go(next) { target = next; if (!frame) frame = requestAnimationFrame(tick); }
    document.querySelector('#oc-prev').onclick = () => go(Math.round(target) - 1);
    document.querySelector('#oc-next').onclick = () => go(Math.round(target) + 1);
    document.querySelectorAll('[data-oc-mode]').forEach((button) => {if (n>4?button.dataset.ocMode!=='slider':!allowedMode(button.dataset.ocMode==='slider'?'ocSlider':button.dataset.ocMode==='stagger'?'ocStagger':'ocDepth'))button.remove();else button.onclick = () => {
      mode = button.dataset.ocMode; document.querySelectorAll('[data-oc-mode]').forEach((el) => el.setAttribute('aria-pressed', String(el === button))); paint();
    }});
    track.addEventListener('click', (event) => {
      if (wasDragged) return;
      const card = event.target.closest('[data-oc]'); if (!card) return;
      if (mode === 'slider') { const delta = wrap(Number(card.dataset.oc) - target + n / 2, n) - n / 2; go(target + delta); }
      else card.animate([{ filter: 'brightness(1)' }, { filter: 'brightness(1.12)' }, { filter: 'brightness(1)' }], { duration: enabled() ? 500 : 0 });
    });
    track.addEventListener('pointerdown', (event) => { if (mode !== 'slider' || event.button > 0) return; drag = { x: event.clientX, start: position, previousX: event.clientX, previousTime: performance.now(), velocity: 0 }; wasDragged = false; });
    track.addEventListener('pointermove', (event) => {
      if (!drag) return;
      const distance = event.clientX - drag.x;
      if (Math.abs(distance) > 8) { wasDragged = true; if (!track.hasPointerCapture(event.pointerId)) track.setPointerCapture(event.pointerId); }
      if (!wasDragged) return;
      cancelAnimationFrame(frame); frame = 0;
      const now = performance.now(); drag.velocity = (event.clientX - drag.previousX) / Math.max(1, now - drag.previousTime); drag.previousTime = now; drag.previousX = event.clientX;
      position = target = drag.start - distance / step(); paint();
    });
    function release() {
      if (!drag) return;
      go(Math.round(position - clamp(drag.velocity, -2, 2) * (enabled() ? .35 : 0)));
      drag = null; setTimeout(() => { wasDragged = false; }, 60);
    }
    track.addEventListener('pointerup', release); track.addEventListener('pointercancel', release);
    gallery.addEventListener('pointermove', (event) => {
      if (mode !== 'depth' || !enabled() || event.pointerType !== 'mouse') return;
      const r = gallery.getBoundingClientRect(); tiltX = (event.clientX - r.left - r.width / 2) / r.width * 12; tiltY = (event.clientY - r.top - r.height / 2) / r.height * 12; paint();
    });
    gallery.addEventListener('keydown', (event) => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); go(Math.round(target) + (event.key === 'ArrowRight' ? 1 : -1)); } });
    new ResizeObserver(paint).observe(gallery);
    subscribe(() => { if (!enabled()) { cancelAnimationFrame(frame); frame = 0; position = target; tiltX = tiltY = 0; paint(); } }); paint();
  }

  function pageSetup() {
    // Production profiles can arrive while visual settings are still loading.
    // Bind only after configuration; otherwise the same DOM gets two galleries.
    if (!effectsConfigured || !document.querySelector('#main')?.firstElementChild) return;
    const homeNote = document.querySelector('.hero-footnote');
    if (homeNote && !production) homeNote.insertAdjacentHTML('afterend', '<div class="home-extras"><a href="effects.html">打开特效体验 ✦</a></div>');
    if (page === 'home') document.querySelector('.hero-copy').insertAdjacentHTML('afterbegin', '<p class="scene-note"><i></i>海风正好，小岛等你赴约</p>');
    if (page === 'collection') installExhibit();
    if (page === 'office' && allowedMode('effectProgress')) installProgress();
    if (page === 'draw' && allowedMode('effectDraw')) installDrawEffects();
    if (page === 'guide') installGuide();
    if (page === 'islanders') {
      if (!document.querySelector('.oc-world-intro')) document.querySelector('.oc-mode-bar').insertAdjacentHTML('beforebegin', '<p class="oc-world-intro">菜菜与吱吱曾是雪啾国的青春偶像。后来，她们把所有积蓄换成了一座岛。<br>这里没有完美剧本，只有一点八卦、很多陪伴，和一个留给你的位置。</p>');
      installGallery();
    }
    installAmbient();
  }
  // Demo pages replace their own content after a successful claim; only bind the new content.
  document.addEventListener('buzhi:render', pageSetup);
  document.addEventListener('click', (event) => {
    const button = event.target.closest('#checkin-button');
    if (button && !button.disabled && enabled() && allowedMode('effectCheckin')) {
      const r = button.getBoundingClientRect();
      document.dispatchEvent(new CustomEvent('buzhi:burst', { detail: { x: r.x + r.width / 2, y: r.y + r.height / 2, count: 32 } }));
    }
  }, true);
  async function startEffects(){try{const response=await fetch('/api/visual-settings',{cache:'no-store'});if(response.ok){const data=await response.json();visual={...effectDefaults,...data}}}catch{}
    shellLinks();
    if(allowedMode('effectStars'))initStars();
    if(allowedMode('effectWater'))initWater();
    if(allowedMode('effectIsland'))initIsland();
    effectsConfigured = true;
    pageSetup();world.dataset.effectsReady='true';
  }
  startEffects();
})();


