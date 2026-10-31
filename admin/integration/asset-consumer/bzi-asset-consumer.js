/* Visual-only consumer. Engineering supplies the manifest; no API, auth, upload,
   account, score, playback or settlement implementation is present here. */
(() => {
  'use strict';
  let manifest={schemaVersion:1,slots:{}},generation=0;
  const prepared=new Map(),originals=new WeakMap(),diagnostics=new Map();
  const page=document.querySelector('.weather-orb')?'weather':document.querySelector('.fusion-theatre')?'fusion':document.querySelector('.deck')?'radio':null;
  const staticBindings={
    'radio.cover.a':{page:'radio',side:'A',selector:'.jacket-art-slot'},
    'radio.cover.b':{page:'radio',side:'B',selector:'.jacket-art-slot'},
    'radio.label.a':{page:'radio',side:'A',selector:'.oc-label-slot'},
    'radio.label.b':{page:'radio',side:'B',selector:'.oc-label-slot'},
    'radio.oc.a':{page:'radio',side:'A',selector:'.portrait-art-slot'},
    'radio.oc.b':{page:'radio',side:'B',selector:'.portrait-art-slot'},
    'weather.oc':{page:'weather',selector:'.host-mark',inline:true}
  };
  function assetURL(entry){
    if(!entry||entry.enabled!==true||entry.authorized!==true)return null;
    if(typeof entry.path!=='string'||!/^\/?assets\/[a-zA-Z0-9_./-]+\.(png|webp|jpe?g)$/i.test(entry.path)||entry.path.split('/').includes('..'))throw Error('Unsupported asset path');
    if(entry.bytes!==undefined&&(!Number.isInteger(entry.bytes)||entry.bytes<1||entry.bytes>4194304))throw Error('Asset exceeds 4MiB or has invalid size');
    const url=new URL(entry.path,document.baseURI);
    if(!['http:','https:','file:'].includes(url.protocol)||url.origin!==location.origin)throw Error('Same-origin assets required');
    if(entry.version!==undefined){if(!/^[a-zA-Z0-9._-]{1,128}$/.test(String(entry.version)))throw Error('Invalid version');url.searchParams.set('v',String(entry.version))}
    return url.href;
  }
  function load(url){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Asset cannot be decoded'));img.src=url})}
  function remember(el){if(!originals.has(el))originals.set(el,{background:el.style.backgroundImage,src:el.getAttribute('src')})}
  function removeLayer(el){el.querySelector(':scope > .bzi-managed-art')?.remove();el.classList.remove('bzi-has-art','bzi-has-card-art','bzi-inline-art')}
  function paint(el,asset,options={}){
    if(!el)return;removeLayer(el);if(!asset)return;
    const image=asset.image.cloneNode();image.className='bzi-managed-art';image.alt=asset.alt;image.draggable=false;
    el.append(image);el.classList.add(options.card?'bzi-has-card-art':'bzi-has-art');
    if(options.inline)el.classList.add('bzi-inline-art');
  }
  function background(el,asset){if(!el)return;remember(el);el.style.backgroundImage=asset?`url("${asset.url}")`:originals.get(el).background}
  function imageSource(el,asset){if(!el)return;remember(el);const src=asset?.url||originals.get(el).src;if(src!==null)el.setAttribute('src',src)}
  function refresh(){
    if(page==='radio'){
      const side=document.body.dataset.side||'A';
      for(const selector of ['.jacket-art-slot','.oc-label-slot','.portrait-art-slot'])removeLayer(document.querySelector(selector)||document.createElement('span'));
      for(const [id,binding] of Object.entries(staticBindings))if(binding.page===page&&binding.side===side)paint(document.querySelector(binding.selector),prepared.get(id));
      background(document.querySelector('.horizon-paint'),prepared.get('radio.scene.'+side.toLowerCase()));
    }
    if(page==='weather'){
      background(document.querySelector('.world-art'),prepared.get('weather.scene'));
      paint(document.querySelector('.host-mark'),prepared.get('weather.oc'),{inline:true});
      paint(document.querySelector('#orb-scene'),prepared.get('weather.icon.'+document.body.dataset.weather));
      imageSource(document.querySelector('#report-backdrop'),prepared.get('weather.report.background')||prepared.get('weather.scene'));
    }
    if(page==='fusion'){
      background(document.querySelector('.atelier-world'),prepared.get('fusion.scene'));
      document.querySelectorAll('.card-face').forEach(face=>{
        const id=face.closest('[data-card]')?.dataset.card||face.dataset.cardId||face.querySelector('.card-id')?.textContent.split('/')[0].trim();
        paint(face,prepared.get('fusion.card.'+id),{card:true});
      });
    }
  }
  async function apply(next){
    if(next?.schemaVersion!==1||!next.slots||Array.isArray(next.slots))throw Error('Expected schemaVersion 1 asset manifest');
    const revision=++generation;manifest=next;const staged=new Map();diagnostics.clear();
    await Promise.all(Object.entries(next.slots).map(async([id,entry])=>{
      if(page&&!id.startsWith(page+'.')){diagnostics.set(id,'not-current-page');return}
      const allowed=Object.hasOwn(staticBindings,id)||/^radio\.scene\.[ab]$/.test(id)||['weather.scene','weather.report.background','fusion.scene'].includes(id)||/^weather\.icon\.(sun|cloud|rain|storm|night|thunder)$/.test(id)||/^fusion\.card\.[a-zA-Z0-9_-]{1,100}$/.test(id);
      if(!allowed){diagnostics.set(id,'unsupported-slot');return}
      try{const url=assetURL(entry);if(!url){diagnostics.set(id,'disabled-or-unconfirmed');return}const image=await load(url);staged.set(id,{url,image,alt:typeof entry.alt==='string'?entry.alt:'已授权替换素材'});diagnostics.set(id,'loaded')}catch(e){diagnostics.set(id,e.message)}
    }));
    if(revision!==generation)return;prepared.clear();staged.forEach((v,k)=>prepared.set(k,v));refresh();
  }
  const observer=new MutationObserver(()=>refresh());
  observer.observe(document.body,{attributes:true,attributeFilter:['data-side','data-weather']});
  for(const selector of ['#rack','#central-card','#result-card']){const el=document.querySelector(selector);if(el)observer.observe(el,{childList:true})}
  window.BziAssetConsumer=Object.freeze({apply,refresh,weatherReportArt:id=>Promise.resolve(prepared.get('weather.icon.'+id)?.image||null),diagnostics:()=>Object.fromEntries(diagnostics),clear:()=>apply({schemaVersion:1,slots:{}})});
  window.addEventListener('bzi:assets:update',event=>apply(event.detail).catch(()=>{}));
  if(window.BZI_ASSET_MANIFEST)apply(window.BZI_ASSET_MANIFEST).catch(()=>{});
})();
