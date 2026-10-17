import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html)});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url='http://127.0.0.1:'+server.address().port+'/';
const browser=await chromium.launch({headless:true});
let passed=0;
try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  page.on('dialog',d=>d.accept());
  await page.goto(url);
  await page.getByRole('button',{name:/生日通行证/}).first().click();
  await page.locator('#nickname').fill('验收岛民');
  await page.locator('#bzAvatarPicker [data-avatar="2"]').click();
  await page.locator('#makePassport').click();
  const id=await page.locator('#bzIdText').textContent();
  assert.match(id,/^BZI-/);passed++;
  await page.locator('#closeModal').click();
  await page.goto(url+'#/office');
  await page.locator('[data-task="letter"]').click();
  await page.locator('#bzDialogCode').fill('ISLAND-DEMO');
  await page.locator('#bzDialogOK').click();
  await page.locator('[data-task="memory"]').click();
  await page.locator('#bzDialogCode').fill('ISLAND-DEMO');
  await page.locator('#bzDialogOK').click();
  await page.goto(url+'#/post-office');
  let coins=await page.locator('.bz-account-chip b').textContent();
  assert.match(coins,/75/);passed++;
  await page.locator('#bzDraw').click();
  await page.locator('#bzDialogOK').click();
  coins=await page.locator('.bz-account-chip b').textContent();
  assert.match(coins,/25/);passed++;
  await page.goto(url+'#/collection');
  assert.match(await page.locator('.bz-collection').textContent(),/拥有 ×1/);passed++;
  await page.reload();
  assert.match(await page.locator('.bz-collection').textContent(),/拥有 ×1/);
  await page.locator('[data-bz-passport]').first().click();
  assert.equal(await page.locator('#bzIdText').textContent(),id);passed++;
  await page.locator('#closeModal').click();
  await page.goto(url+'#/post-office');
  await page.locator('#bzDraw').click();
  assert.match(await page.locator('#bzDialogText').textContent(),/50 金币/);passed++;
  console.log('PASS '+passed+'/6 main-flow browser assertions');
}catch(e){console.error('FAILED after '+passed+' checks:',e);process.exitCode=1}
finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
