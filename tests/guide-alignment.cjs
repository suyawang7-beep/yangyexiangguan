/* Regressions for approved-map landmark coordinates and registered ambient motion. */
const {chromium}=require('playwright');
const {createServer}=require('node:http');
const {readFile,mkdir,writeFile}=require('node:fs/promises');
const {resolve,extname,sep}=require('node:path');
const assert=require('node:assert/strict');
const root=resolve(__dirname,'../ui-preview');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{
  const file=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
  if(!file.startsWith(root+sep))return res.writeHead(403).end();
  try{const body=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream'}).end(body);}catch{res.writeHead(404).end();}
});
// Measured on the approved 1584x993 image: apron, office entrance, post office,
// collection entrance and statue pedestal. These are not derived from DOM coordinates.
const landmarks={1:[582,690],2:[861,552],3:[510,592],4:[865,660],5:[673,568]};
let browser,checks=0;const errors=[],records=[];
const check=(value,label)=>{assert.ok(value,label);checks++;};
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  const context=await browser.newContext({reducedMotion:'reduce'});
  await context.route('**/*',r=>r.request().url().startsWith(base+'/')?r.continue():r.abort());
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const evidence=process.env.GUIDE_EVIDENCE_DIR;if(evidence)await mkdir(evidence,{recursive:true});
  for(const width of [1440,1024,768,390,320]){
    await page.setViewportSize({width,height:1000});await page.goto(base+'/guide.html');
    await page.waitForSelector('[data-guide-ready="true"]');await page.evaluate(()=>document.fonts.ready);
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width}: horizontal scroll stays inside map`);
    for(const [stop,xy] of Object.entries(landmarks)){
      const pin=page.locator(`[data-map-stop="${stop}"]`);
      check(await pin.evaluate((el,xy)=>Math.hypot(Number(el.dataset.mapX)-xy[0],Number(el.dataset.mapY)-xy[1])<1,xy),`${width}/${stop}: anchor matches the actual landmark, not a roof or boat`);
      await pin.click();
      check(await page.locator('.guide-focus').count()===1,'selected ground anchor has one focus marker');
      check(await page.locator('.guide-focus').getAttribute('data-stop')===stop,'focus follows the selected stop');
      check(await page.locator('.guide-focus').getAttribute('transform')===`translate(${xy[0]} ${xy[1]})`,'focus is anchored to the landmark rather than the label');
      check(await page.locator('#voyage').getAttribute('data-stop')===stop,`${width}/${stop}: real pointer click selects the right location`);
      const result=await page.evaluate(stop=>{
        const pin=document.querySelector(`[data-map-stop="${stop}"]`),camera=document.querySelector('#map-camera'),map=document.querySelector('.voyage-map'),svg=document.querySelector('.guide-map-art');
        const xy=new DOMPoint(+pin.dataset.mapX,+pin.dataset.mapY).matrixTransform(camera.getScreenCTM());
        const line=document.querySelector(`[data-guide-leader="${stop}"]`),dot=document.querySelector(`[data-guide-anchor="${stop}"]`);
        const viewport=map.getBoundingClientRect(),box=pin.getBoundingClientRect();
        const siblings=[...document.querySelectorAll('[data-map-stop]')].filter(el=>el!==pin).map(el=>el.getBoundingClientRect());
        const endpoint=line&&new DOMPoint(+line.getAttribute('x2'),+line.getAttribute('y2')).matrixTransform(line.getScreenCTM());
        const anchor=dot&&new DOMPoint(+dot.getAttribute('cx'),+dot.getAttribute('cy')).matrixTransform(dot.getScreenCTM());
        const label=new DOMPoint(+pin.dataset.labelX,+pin.dataset.labelY).matrixTransform(svg.getScreenCTM());
        const targetLeft=map.scrollLeft+xy.x-viewport.left-map.clientLeft;
        const expectedLeft=Math.max(0,Math.min(map.scrollWidth-map.clientWidth,targetLeft-map.clientWidth/2));
        return {lineError:endpoint?Math.hypot(endpoint.x-xy.x,endpoint.y-xy.y):Infinity,dotError:anchor?Math.hypot(anchor.x-xy.x,anchor.y-xy.y):Infinity,labelError:Math.hypot(box.x+box.width/2-label.x,box.y+box.height/2-label.y),visible:box.left>=viewport.left&&box.right<=viewport.right,scrollLeft:map.scrollLeft,expectedLeft,overlap:siblings.some(b=>box.left<b.right&&box.right>b.left&&box.top<b.bottom&&box.bottom>b.top),targetY:xy.y-viewport.top};
      },stop);
      check(result.lineError<1&&result.dotError<1,`${width}/${stop}: leader and anchor dot end exactly at the landmark`);
      check(result.labelError<1,`${width}/${stop}: label shares the same viewBox mapping as the artwork`);
      check(result.visible&&!result.overlap,`${width}/${stop}: selected label is visible and does not overlap another label`);
      check(Math.abs(result.scrollLeft-result.expectedLeft)<=1.5,`${width}/${stop}: pan centers the actual landmark subject to map edges`);
      records.push({width,stop,...result});
      if(evidence&&[1,5].includes(Number(stop)))await page.locator('.voyage-map').screenshot({path:resolve(evidence,`guide-${width}-stop-${stop}.png`)});
    }
    const scroll=page.locator('.voyage-map');
    await scroll.evaluate(el=>{el.scrollLeft=el.scrollWidth;});
    await page.locator('#voyage-overview').click();
    check(await page.locator('#voyage-count').textContent()==='01 / 06',`${width}: overview restores first card`);
    check(await page.locator('[data-map-stop][aria-pressed="true"]').count()===0,`${width}: overview clears selected location`);
    check(await page.locator('.guide-focus').getAttribute('visibility')==='hidden','overview removes the location marker');
    if(evidence)await scroll.screenshot({path:resolve(evidence,`guide-${width}-overview.png`)});
  }
  check(await page.locator('.guide-water-motion').count()>=2,'Harbor and outer channels have separate mapped water effects');
  check(await page.locator('.guide-water-motion,.guide-cloud-motion').evaluateAll(els=>els.every(el=>el.hasAttribute('clip-path'))),'All local motion is clipped to its registered water or mountain area');
  check(await page.locator('.guide-cloud-motion ellipse').count()===0,'Mountain mist is not an unrelated floating ellipse over the map');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.waitForFunction(()=>document.querySelector('.world').dataset.motion==='on');
  await page.locator('.voyage-map').scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>[...document.querySelectorAll('.guide-water-motion,.guide-cloud-motion')].some(el=>el.getAnimations({subtree:true}).some(a=>a.playState==='running')));
  const camera=await page.locator('#map-camera').getAttribute('transform');
  await page.locator('[data-map-stop="2"]').click({timeout:2500});
  await page.locator('[data-map-stop="3"]').click({timeout:2500});
  await page.locator('[data-map-stop="5"]').click({timeout:2500});
  check(await page.locator('#voyage').getAttribute('data-stop')==='5','Moving ambience does not make location buttons unstable or unclickable');
  check(await page.locator('#map-camera').getAttribute('transform')===camera,'Locating a stop does not slide/scale the whole artwork under its labels');
  await page.setViewportSize({width:768,height:1000});
  await page.waitForTimeout(100);
  check(await page.locator('[data-map-stop="5"]').getAttribute('aria-pressed')==='true','Resize keeps active location selected');
  check(await page.evaluate(()=>{
    const el=document.querySelector('[data-map-stop="5"]'),map=document.querySelector('.voyage-map'),bounds=map.getBoundingClientRect();
    const target=new DOMPoint(+el.dataset.mapX,+el.dataset.mapY).matrixTransform(document.querySelector('#map-camera').getScreenCTM());
    return Math.abs(target.x-bounds.left-map.clientLeft-map.clientWidth/2)<1.5;
  }),'Resize re-centers the actual selected ground anchor');
  await page.locator('#motion-toggle').click();
  check(await page.locator('.guide-water-motion,.guide-cloud-motion').evaluateAll(els=>els.every(el=>el.getAnimations({subtree:true}).every(a=>a.playState!=='running'))),'Global switch stops all rematched map motion');
  check(await page.locator('#voyage-next').isDisabled(),'Last stop remains bounded');
  await page.locator('#voyage-overview').click();await page.locator('#voyage-next').click();
  check(await page.locator('#voyage').getAttribute('data-stop')==='1','Static mode still supports next/overview navigation');
  await page.locator('#motion-toggle').click();
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
  check(await page.locator('.guide-water-motion,.guide-cloud-motion').evaluateAll(els=>els.every(el=>el.getAnimations({subtree:true}).every(a=>a.playState!=='running'))),'Hidden page pauses rematched local motion');
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.querySelector('.world').dataset.motion==='off');
  check(await page.locator('.guide-water-motion,.guide-cloud-motion').evaluateAll(els=>els.every(el=>el.getAnimations({subtree:true}).every(a=>a.playState!=='running'))),'Reduced motion leaves local map effects static');
  check(errors.length===0,`No page errors: ${errors.join('; ')}`);
  const configured=await browser.newContext({viewport:{width:390,height:1000}});
  await configured.route('**/api/visual-settings',r=>r.fulfill({json:{effectGuide:false}}));
  const staticGuide=await configured.newPage();await staticGuide.goto(base+'/guide.html');await staticGuide.waitForSelector('[data-guide-ready="true"]');
  check(await staticGuide.locator('.guide-water-motion,.guide-cloud-motion').evaluateAll(els=>els.every(el=>el.getAnimations({subtree:true}).length<=1&&el.getAnimations({subtree:true}).every(a=>a.playState!=='running'))),'Admin effectGuide=false stops all registered map effects');
  await staticGuide.locator('[data-map-stop="5"]').click();
  check(await staticGuide.locator('#voyage').getAttribute('data-stop')==='5','Admin-disabled ambience does not disable navigation');
  check(await staticGuide.locator('.guide-focus-ring').evaluate(el=>el.getAnimations().length===0),'disabled motion uses a static accurate marker');
  await configured.close();
  if(evidence)await writeFile(resolve(evidence,'alignment.json'),JSON.stringify(records,null,2));
  console.log(`PASS ${checks} guide landmark, pan, label and motion assertions`);
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();await new Promise(r=>server.close(r));});

