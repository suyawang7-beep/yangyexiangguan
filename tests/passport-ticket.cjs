/* Only local demo identities and temporary files; never production data. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { readFile, mkdtemp } = require('node:fs/promises');
const { resolve, extname, sep, join } = require('node:path');
const { tmpdir } = require('node:os');
const root = resolve(__dirname, '..');
const types = {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server = createServer(async (req,res) => {
  const file = resolve(root, '.' + new URL(req.url,'http://localhost').pathname);
  if (!file.startsWith(root+sep)) { res.writeHead(403).end(); return; }
  try { const content=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream'}).end(content); }
  catch { res.writeHead(404).end(); }
});
let browser;
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  const context = await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',acceptDownloads:true});
  await context.route('**/*',route=>route.request().url().startsWith(base+'/')||route.request().url().startsWith('blob:')?route.continue():route.abort());
  const page = await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const signatureRequests=[];page.on('request',request=>{if(request.url().includes('/fonts/signature/'))signatureRequests.push(request.url())});
  // Observe actual text painted into the exported bitmap, not a mocked exporter.
  await page.addInitScript(()=>{
    window.paintedTicketText=[];
    window.paintedTicketFonts=[];
    const original=CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText=function(text,...args){window.paintedTicketText.push(String(text));window.paintedTicketFonts.push({text:String(text),font:this.font});return original.call(this,text,...args)};
  });
  await page.goto(base+'/ui-preview/passport.html',{waitUntil:'networkidle'});
  assert.equal(await page.getByRole('tab').count(),2,'Keep both new and returning-islander entry tabs');
  const nickname='海风<猫> & 回岛';
  await page.locator('#nickname').fill(nickname);
  await page.locator('input[name="avatar"][value="2"]').check();
  await page.locator('#claim-pass').click();
  await page.locator('#public-id').waitFor();
  assert.equal(await page.locator('#save-pass').count(),1,'Claimed passport offers a real souvenir-image save action');
  await page.locator('[data-ticket-ready="true"]').waitFor();
  const id=await page.locator('#public-id').inputValue();
  assert.equal(await page.locator('.ticket-readable h2').textContent(),nickname,'Nickname is safe text, not interpreted HTML');
  assert.deepEqual(await page.locator('#ticket-image').evaluate(img=>[img.naturalWidth,img.naturalHeight]),[2400,1200]);
  assert.match(await page.locator('#ticket-image').getAttribute('alt'),/生日通行证/);
  const words=await page.evaluate(()=>window.paintedTicketText);
  const fonts=await page.evaluate(()=>window.paintedTicketFonts);
  assert.match(fonts.find(item=>item.text===nickname).font,/Buzhi Signature/,'Only the personal name changes to the new handwritten font');
  assert.match(fonts.find(item=>item.text==='海风已经记住你的名字。').font,/Buzhi Rounded/,'Explanatory text keeps its existing readable font');
  assert.match(fonts.find(item=>item.text==='2026年10月20日').font,/Buzhi Rounded/,'Date does not become handwriting');
  assert.match(fonts.find(item=>item.text===id).font,/monospace/,'Participant ID remains unambiguous');
  assert(await page.evaluate(()=>[...document.fonts].some(f=>f.family==='Buzhi Signature'&&f.status==='loaded')),'Real handwriting font bytes load before the saved image is painted');
  assert(signatureRequests.length>0&&signatureRequests.length<=8,'Load only a few font slices needed by this nickname, not the full character library');
  const period=await page.locator('.ticket-readable dd').last().textContent();
  for(const text of [nickname,id,'生日通行证','2026年10月20日',period,'演示访客 · 未核验','贝壳粉'])assert(words.includes(text),`Bitmap actually includes ${text}`);
  assert(!words.some(t=>/恢复密钥|UID|token|recoveryKey/.test(t)),'Image never includes login secrets or platform identifiers');
  assert.equal(await page.locator('.header-actions [data-balance]').textContent(),'50');
  for(const width of [320,390,768,1440]){
    await page.setViewportSize({width,height:900});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Ticket fits ${width}px without page overflow`);
    assert(await page.locator('#save-pass').isEnabled());
    if(process.env.UI_PREVIEW_CAPTURE_DIR)await page.screenshot({path:join(process.env.UI_PREVIEW_CAPTURE_DIR,`ticket-${width}.png`),fullPage:true,animations:'disabled'});
  }
  await page.locator('#save-pass').click();
  assert(await page.locator('#ticket-save-dialog').isVisible());
  assert.equal(await page.locator('#ticket-save-dialog img').getAttribute('src'),await page.locator('#ticket-image').getAttribute('src'),'Long-press preview uses the exact exported bitmap');
  assert.match(await page.locator('#ticket-save-dialog').textContent(),/不能.*登录/);
  const download=await Promise.all([page.waitForEvent('download'),page.locator('#download-pass').click()]).then(x=>x[0]);
  assert(download.suggestedFilename().endsWith('.png'));
  const folder=await mkdtemp(join(tmpdir(),'buzhi-ticket-download-'));
  const destination=join(folder,'ticket.png');await download.saveAs(destination);
  const png=await readFile(destination);
  assert.equal(png.subarray(1,4).toString(),'PNG');
  assert.equal(png.readUInt32BE(16),2400);assert.equal(png.readUInt32BE(20),1200);
  assert(png.length>30000,'Downloaded PNG contains real artwork and text');
  await page.keyboard.press('Escape');
  assert(!(await page.locator('#ticket-save-dialog').isVisible()));
  await page.reload({waitUntil:'networkidle'});
  await page.locator('[data-ticket-ready="true"]').waitFor();
  assert.equal(await page.locator('#public-id').inputValue(),id,'Saving/reloading does not create a new identity');
  assert.equal(await page.locator('.header-actions [data-balance]').textContent(),'50','No reward for saving or reloading');
  // Exercise the supported renderer with long Unicode text, secret-shaped extra fields and unverified local task access.
  await page.evaluate(()=>{
    const state=JSON.parse(localStorage.getItem('buzhi-ui-preview-v3'));
    state.passport.nickname='海🌊岛👋'.repeat(4);state.passport.recoveryKey='DO_NOT_EXPORT_PRIVATE_KEY';state.passport.platformUid='DO_NOT_EXPORT_UID';state.demoIslander=true;
    localStorage.setItem('buzhi-ui-preview-v3',JSON.stringify(state));
  });
  await page.reload({waitUntil:'networkidle'});await page.locator('[data-ticket-ready="true"]').waitFor();
  assert.match(await page.locator('.ticket-readable').textContent(),/未核验/,'Demo task access must not imply verified identity');
  assert(!(await page.evaluate(()=>window.paintedTicketText.join('\n'))).includes('DO_NOT_EXPORT'));
  assert.deepEqual(errors,[]);
  console.log(`PASS souvenir ticket: real 2400×1200 PNG download, public data only, four viewport sizes, long nickname, save dialog, existing identity/50 coins retained. Local artifact: ${destination}`);
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{await browser?.close();server.close()});
