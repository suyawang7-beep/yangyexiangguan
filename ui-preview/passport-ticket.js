/* A public souvenir, never an authentication credential. No remote libraries. */
(() => {
  'use strict';
  const WIDTH = 1200, HEIGHT = 600, SCALE = 2;
  let dispose = () => {};
  const image = src => new Promise(resolve => {
    const img = new Image(); img.onload = () => resolve(img); img.onerror = () => resolve(null); img.src = src;
  });
  function text(ctx, value, x, y, size, options = {}) {
    const family = options.family || '"Buzhi Rounded", sans-serif';
    let fitted = size;
    ctx.textAlign = options.align || 'left'; ctx.fillStyle = options.color || '#355f70';
    do { ctx.font = `${options.weight || 400} ${fitted}px ${family}`; fitted--; }
    while (options.width && ctx.measureText(value).width > options.width && fitted > 9);
    ctx.fillText(value, x, y);
  }
  function line(ctx, x1, y1, x2, y2, color = '#648a9a50') {
    ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.strokeStyle=color;ctx.lineWidth=1;ctx.stroke();
  }
  function installMotion(host, preview) {
    const world=host.closest('.world');
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    const enabled=()=>world?.dataset.motion==='on'&&!reduced.matches&&!document.hidden;
    let arrival;
    // Animate the displayed paper only. The PNG blob is already complete and stays unchanged.
    if(enabled()&&preview.animate){
      arrival=preview.animate([
        {opacity:0,transform:'translateY(18px) rotate(-2deg)'},
        {opacity:1,transform:'translateY(0) rotate(-.65deg)'}
      ],{duration:800,easing:'cubic-bezier(.2,.75,.2,1)',iterations:1});
      arrival.id='ticket-arrival';
    }
    const stopWhenDisabled=()=>{if(!enabled())arrival?.cancel()};
    document.addEventListener('buzhi:motion',stopWhenDisabled);
    document.addEventListener('visibilitychange',stopWhenDisabled);
    reduced.addEventListener('change',stopWhenDisabled);
    return ()=>{
      arrival?.cancel();
      document.removeEventListener('buzhi:motion',stopWhenDisabled);
      document.removeEventListener('visibilitychange',stopWhenDisabled);
      reduced.removeEventListener('change',stopWhenDisabled);
    };
  }
  function paint(canvas, data, island) {
    canvas.width = WIDTH * SCALE; canvas.height = HEIGHT * SCALE;
    const ctx = canvas.getContext('2d'); if (!ctx) throw Error('Canvas unavailable');
    ctx.scale(SCALE, SCALE);
    ctx.save();ctx.beginPath();ctx.roundRect(22,22,1156,556,7);ctx.clip();
    const wash=ctx.createLinearGradient(20,20,1180,580);
    wash.addColorStop(0,'#f4f6ef');wash.addColorStop(.45,'#eff5f4');wash.addColorStop(1,'#e2eef1');
    ctx.fillStyle=wash;ctx.fillRect(22,22,1156,556);
    ctx.fillStyle='#d5e6e780';ctx.fillRect(22,22,278,556);
    // A fixed, subtle fiber pattern: one paint, no animation or image dependency.
    let seed=10202026;
    const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
    for(let n=0;n<17000;n++){
      ctx.fillStyle=n%3?'#3456670b':'#ffffff50';
      ctx.fillRect(22+random()*1156,22+random()*556,random()*1.3+.3,random()*1.6+.3);
    }
    for(let n=0;n<650;n++){
      const x=22+random()*1156,y=22+random()*556;
      line(ctx,x,y,x+random()*9,y+random()*3,'#718b8b0b');
    }
    for(let x=40;x<1180;x+=25)line(ctx,x,22,x,578,'#607c8707');
    for(let y=38;y<578;y+=25)line(ctx,22,y,1178,y,'#607c8707');
    ctx.strokeStyle='#7898a35c';ctx.lineWidth=1;ctx.strokeRect(38,38,1124,524);
    ctx.setLineDash([3,8]);line(ctx,300,42,300,558,'#557c8f88');ctx.setLineDash([]);

    text(ctx,'不吱岛',160,85,31,{align:'center',family:'"Buzhi Hand", sans-serif'});
    text(ctx,'ISLAND ADMISSION',160,113,13,{align:'center'});
    line(ctx,68,137,252,137);
    ctx.beginPath();ctx.arc(160,235,67,0,Math.PI*2);ctx.fillStyle=data.avatarColor;ctx.fill();
    ctx.lineWidth=5;ctx.strokeStyle='#ffffff';ctx.stroke();
    text(ctx,'啾',160,254,48,{align:'center'});
    text(ctx,data.avatarLabel,160,333,20,{align:'center'});
    text(ctx,'赴约纪念',160,398,29,{align:'center',family:'"Buzhi Hand", sans-serif'});
    text(ctx,'ADMIT ONE · KEEP FOREVER',160,426,11,{align:'center'});
    line(ctx,68,451,252,451);
    text(ctx,data.demo?'静态体验 · 纪念样票':'生日庆典 · 纪念票根',160,491,17,{align:'center'});
    const dateParts=data.birthday.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    text(ctx,`${dateParts?.[1] || ''}  /  BUZHI ISLAND`,160,527,13,{align:'center'});

    text(ctx,'BUZHI ISLAND  /  BIRTHDAY RENDEZVOUS',342,83,15);
    text(ctx,'生日通行证',342,153,51,{family:'"Buzhi Hand", sans-serif'});
    text(ctx,'海风已经记住你的名字。',344,195,22,{color:'#6a8790'});
    text(ctx,dateParts?`${dateParts[2].padStart(2,'0')}.${dateParts[3].padStart(2,'0')}`:'生日庆典',1118,159,86,{align:'right',family:'Georgia, serif',width:265});
    text(ctx,data.birthday,1115,195,18,{align:'right',width:260});
    text(ctx,data.nickname,342,274,50,{width:690,family:'"Buzhi Signature", "Buzhi Rounded", sans-serif'});
    text(ctx,data.demo?'演示访客 · 未核验':'访客 · 未核验',344,310,19,{color:'#637c91'});
    line(ctx,342,339,1120,339);
    text(ctx,'本次庆典 / CELEBRATING',344,378,14);
    text(ctx,data.eventName,344,417,30,{width:240});
    text(ctx,'庆典时间 / FESTIVAL',617,378,14);
    const dates=[...data.period.matchAll(/(\d{1,2})月(\d{1,2})日/g)].map(m=>`${m[1].padStart(2,'0')}.${m[2].padStart(2,'0')}`);
    text(ctx,dates.length===2?dates.join(' — '):data.period,617,417,32,{family:'Georgia, serif',width:320});
    text(ctx,data.period,618,449,16,{color:'#6a8790'});
    text(ctx,'参与编号 / PARTICIPANT NO.',344,489,14);
    text(ctx,data.id,344,525,26,{width:630,family:'monospace'});

    ctx.save();ctx.translate(1064,459);ctx.rotate(-.16);
    ctx.beginPath();ctx.arc(0,0,66,0,Math.PI*2);ctx.strokeStyle='#5e8b927d';ctx.lineWidth=2;ctx.stroke();
    ctx.setLineDash([2,4]);ctx.beginPath();ctx.arc(0,0,59,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
    if(island)ctx.drawImage(island,-33,-42,66,66);
    text(ctx,'赴约已留念',0,41,16,{align:'center',color:'#4e7a81'});ctx.restore();
    text(ctx,'这一程，因为有你而特别。',737,553,14,{align:'center',color:'#718b90'});
    ctx.restore();
    // Real transparent ticket notches. Neither barcode nor stamp claims identity verification.
    ctx.globalCompositeOperation='destination-out';ctx.fillStyle='#000';
    for(const x of [22,1178])for(let y=54;y<=554;y+=20){ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fill()}
    for(const y of [22,578]){ctx.beginPath();ctx.arc(300,y,13,0,Math.PI*2);ctx.fill()}
    ctx.globalCompositeOperation='source-over';
  }
  async function mount(host, supplied) {
    dispose();let cancelled=false,objectUrl='',clearMotion=()=>{};
    dispose=()=>{cancelled=true;clearMotion();if(objectUrl)URL.revokeObjectURL(objectUrl)};
    // Explicit public-data allowlist. Never traverse or serialize account/profile objects.
    const data={nickname:String(supplied.nickname),id:String(supplied.id),avatarLabel:String(supplied.avatarLabel),avatarColor:String(supplied.avatarColor),birthday:String(supplied.birthday),eventName:String(supplied.eventName),period:String(supplied.period),demo:supplied.demo===true};
    const status=host.querySelector('#ticket-render-status'),button=host.querySelector('#save-pass');
    try {
      const [,island]=await Promise.all([
        Promise.all([document.fonts.load('400 50px "Buzhi Rounded"'),document.fonts.load('400 51px "Buzhi Hand"'),document.fonts.load('400 50px "Buzhi Signature"',data.nickname)]).catch(()=>{}),
        image('assets/island-mark.svg')
      ]);
      if(cancelled||!host.isConnected)return;
      const canvas=document.createElement('canvas');paint(canvas,data,island);
      const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('PNG export unavailable')),'image/png'));
      if(cancelled||!host.isConnected)return;
      objectUrl=URL.createObjectURL(blob);
      const preview=host.querySelector('#ticket-image');preview.src=objectUrl;await preview.decode();
      if(cancelled||!host.isConnected)return;
      preview.hidden=false;status.hidden=true;button.disabled=false;host.dataset.ticketReady='true';
      clearMotion=installMotion(host,preview);
      const dialog=host.querySelector('#ticket-save-dialog');dialog.querySelector('img').src=objectUrl;
      const download=dialog.querySelector('#download-pass');download.href=objectUrl;
      download.download=`不吱岛-生日纪念通行证-${data.id.replace(/[^a-z0-9_-]/gi,'').slice(0,48)||'birthday'}.png`;
      button.addEventListener('click',()=>dialog.showModal());
      dialog.querySelector('[data-ticket-close]').addEventListener('click',()=>dialog.close());
      dialog.addEventListener('close',()=>button.focus());
    } catch {
      if(cancelled||!host.isConnected)return;
      status.textContent='纪念图片暂时没有准备好，请刷新后重试。下方编号仍可复制。';
      host.querySelector('.ticket-readable').classList.add('ticket-readable-fallback');
    }
  }
  window.addEventListener('pagehide',event=>{if(!event.persisted)dispose()});
  window.BuzhiTicket=Object.freeze({mount});
})();
