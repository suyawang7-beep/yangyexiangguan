// Isolated local server/database only; never runs against production.
const {spawn}=require('node:child_process'),{mkdtempSync,rmSync,mkdirSync}=require('node:fs'),{tmpdir}=require('node:os'),{join}=require('node:path'),{pathToFileURL}=require('node:url'),{DatabaseSync}=require('node:sqlite'),{chromium}=require('playwright'),assert=require('node:assert/strict');
const folder=mkdtempSync(join(tmpdir(),'buzhi-daily-quiz-')),port=53000+Math.floor(Math.random()*600),base='http://127.0.0.1:'+port,admin='isolated-daily-quiz-admin-secret-000000000',dbPath=join(folder,'test.sqlite');
let server,db,browser,logs='';
async function api(path,body,token){const r=await fetch(base+'/api/'+path,{method:body===undefined?'GET':'POST',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});return{status:r.status,data:await r.json()}}
async function account(name,verified=true){const r=await api('register',{nickname:name,password:'Isolated-quiz-password-2026!'});assert.equal(r.status,200);if(verified)await require('./helpers/membership.cjs').verifyAccount(base,admin,r.data);return r.data}
(async()=>{try{
 server=spawn(process.execPath,['server/index.mjs'],{cwd:join(__dirname,'..'),env:{...process.env,HOST:'127.0.0.1',PORT:String(port),DB_PATH:dbPath,ADMIN_TOKEN:admin},stdio:['ignore','ignore','pipe']});server.stderr.on('data',d=>logs+=d);
 let ready=false;for(let i=0;i<100;i++){try{if((await fetch(base+'/health')).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,100))}assert(ready,logs);
 assert.equal((await api('quiz')).status,401,'Daily quiz endpoint must exist and require a signed-in account');
 const visitor=await account('小测游客',false);assert.equal((await api('quiz',undefined,visitor.token)).status,403);
 const {QUIZ_BANK,dailyQuiz}=await import(pathToFileURL(join(__dirname,'../server/quiz.mjs')).href);
 assert.equal(QUIZ_BANK.length,35);assert.equal(new Set(QUIZ_BANK.map(q=>q.id)).size,35);
 for(const q of QUIZ_BANK){assert.equal(q.options.length,3);assert(q.options.some(o=>o.id===q.correct));assert(q.explanation.length>5)}
 const before=dailyQuiz(Date.parse('2026-10-21T15:59:59.999Z')),after=dailyQuiz(Date.parse('2026-10-21T16:00:00.000Z'));assert.equal(before.date,'2026-10-21');assert.equal(after.date,'2026-10-22');assert.notDeepEqual(before.questions.map(q=>q.id),after.questions.map(q=>q.id));
 const seven=Array.from({length:7},(_,i)=>dailyQuiz(Date.parse('2026-10-21T00:00:00+08:00')+i*86400000).questions.map(q=>q.id));assert.equal(new Set(seven.flat()).size,35);assert.deepEqual(seven[0],dailyQuiz(Date.parse('2026-10-28T00:00:00+08:00')).questions.map(q=>q.id));
 const a=await account('小测验证'),deck=(await api('quiz',undefined,a.token)).data;
 assert.equal(deck.questions.length,5);assert.equal(deck.reward,25);assert.equal(deck.passScore,3);assert.equal(deck.timezone,'Asia/Shanghai');assert(!deck.rewarded);
 for(const q of deck.questions){assert.deepEqual(Object.keys(q).sort(),['id','options','prompt']);assert(!JSON.stringify(q).includes('correct'));assert.equal(new Set(q.options.map(o=>o.id)).size,3)}
 const answers=score=>deck.questions.map((q,i)=>{const item=QUIZ_BANK.find(x=>x.id===q.id);return{questionId:q.id,optionId:i<score?item.correct:item.options.find(o=>o.id!==item.correct).id}});
 db=new DatabaseSync(dbPath);
 const coin=id=>(api('me',undefined,id)).then(r=>r.data.coins);
 const initial=await coin(a.token);
 assert.equal((await api('quiz/submit',{date:'2000-01-01',answers:answers(5)},a.token)).status,409);
 for(const bad of [answers(5).slice(1),[...answers(5).slice(0,4),answers(5)[0]],answers(5).map((x,i)=>i?x:{...x,optionId:'forged'}),answers(5).map((x,i)=>i?x:{...x,questionId:'q-forged'})])assert.equal((await api('quiz/submit',{date:deck.date,answers:bad},a.token)).status,400);
 assert.equal((await api('quiz/submit',{date:deck.date,answers:answers(5)},visitor.token)).status,403);
 assert.equal(db.prepare('SELECT count(*) n FROM quiz_attempts').get().n,0);
 const failed=await api('quiz/submit',{date:deck.date,answers:answers(2),score:5,reward:1000},a.token);assert.equal(failed.status,200);assert.equal(failed.data.score,2);assert(!failed.data.passed);assert.equal(await coin(a.token),initial);assert.equal(failed.data.feedback.length,5);
 // Existing task progress/bonuses remain one distinct quiz across old and new days.
 for(const key of ['quiz:2000-01-01','quiz:2000-01-02','quiz'])db.prepare('INSERT INTO tasks VALUES(?,?,?)').run(a.id,key,'2000-01-01T00:00:00.000Z');
 const oldProgress=(await api('me',undefined,a.token)).data.taskProgress.completed;assert.equal(oldProgress,1);
 const parallel=await Promise.all(Array.from({length:4},()=>api('quiz/submit',{date:deck.date,answers:answers(3)},a.token)));assert(parallel.every(r=>r.status===200));assert.equal(parallel.filter(r=>r.data.rewardGranted===25).length,1);assert.equal(await coin(a.token),initial+25);assert.equal((await api('me',undefined,a.token)).data.taskProgress.completed,oldProgress);
 assert.equal(db.prepare('SELECT count(*) n FROM quiz_attempts WHERE user_id=?').get(a.id).n,1);assert((await api('quiz',undefined,a.token)).data.rewarded);assert.equal((await api('quiz',undefined,a.token)).data.latest.score,3);
 assert.equal((await api('redeem',{taskId:'quiz',code:'unused-legacy-code'},a.token)).status,400);
 assert.equal((await api('admin/codes',{taskId:'quiz',count:1},admin)).status,400);
 const legacy=await account('今日旧小测');db.prepare('INSERT INTO tasks VALUES(?,?,?)').run(legacy.id,'quiz',new Date().toISOString());assert((await api('quiz',undefined,legacy.token)).data.rewarded);const legacyCoins=await coin(legacy.token);assert.equal((await api('quiz/submit',{date:deck.date,answers:answers(5)},legacy.token)).data.rewardGranted,0);assert.equal(await coin(legacy.token),legacyCoins);
 assert.equal((await api('admin/quiz-results')).status,403);const records=(await api('admin/quiz-results?q='+a.id,undefined,admin)).data;assert.equal(records.total,1);assert.equal(records.items[0].score,3);assert.equal(records.items[0].attempts,2);
 const exported=await api('admin/export',undefined,admin);assert.equal(exported.status,200);assert.equal(exported.data.data.quizAttempts.length,1);
 const b=await account('关闭活动小测');await api('admin/activity',{startsAt:null,endsAt:'2000-01-01T00:00:00+08:00'},admin);assert.equal((await api('quiz/submit',{date:deck.date,answers:answers(5)},b.token)).status,403);await api('admin/activity',{startsAt:null,endsAt:null},admin);
 console.log('PASS 35 approved questions, Beijing midnight/7-day rotation, private answers, grading, retries, daily idempotent reward, legacy preservation, progress and activity gates');
 if(process.argv.includes('--api-only'))return;
 browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 for(const width of [390,1440]){
  const u=await account('弹窗小测'+width),context=await browser.newContext({viewport:{width,height:900}});await context.addInitScript(token=>sessionStorage.setItem('buzhi-online-token',token),u.token);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/office.html',{waitUntil:'networkidle'});await page.locator('[data-task=quiz]').click();await page.locator('#quiz-dialog').waitFor();await page.locator('#quiz-question').waitFor();assert.equal(await page.locator('#task-dialog').isVisible(),false);assert.equal(await page.locator('#quiz-dialog input[type=text]').count(),0);
  const correct=new Map(QUIZ_BANK.map(q=>[q.id,q.correct]));const beginCoins=await coin(u.token);
  for(let i=0;i<5;i++){const field=page.locator('#quiz-question');const id=await field.getAttribute('data-question-id');await field.locator('input[value="'+correct.get(id)+'"]').check();if(i<4)await page.locator('#quiz-next').click()}
  // Back/next retain selected answers.
  await page.locator('#quiz-previous').click();assert.equal(await page.locator('#quiz-question input:checked').count(),1);await page.locator('#quiz-next').click();
  await page.locator('#quiz-submit').click();await page.locator('#quiz-result').getByText(/5.*5/).waitFor();assert.equal(await coin(u.token),beginCoins+25);assert.equal(await page.locator('#quiz-feedback article').count(),5);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));mkdirSync('test-results',{recursive:true});await page.screenshot({path:'test-results/daily-quiz-'+width+'.png',fullPage:true});
  await page.locator('#quiz-close').click();await page.reload({waitUntil:'networkidle'});await page.locator('[data-task=quiz]').click();await page.locator('#quiz-result').waitFor();assert.equal(await coin(u.token),beginCoins+25);assert.equal(await page.locator('#quiz-submit').count(),0);assert.deepEqual(errors,[]);await context.close();
 }
 for(const width of [390,1440]){const page=await browser.newPage({viewport:{width,height:900}});await page.goto(base+'/admin/quiz-results');await page.locator('#token').fill(admin);await page.locator('#enter').click();await page.locator('#quizAdminStatus').getByText(/共 .* 条/).waitFor();await page.locator('#quizAdminSearch').fill(a.id);await page.locator('#quizAdminFilter button[type=submit]').click();await page.locator('#quizAdminStatus').getByText(/共 1 条/).waitFor();assert.match(await page.locator('#quizAdminList').textContent(),/3\/5题/);await page.locator('#adminRouteLogout').click();assert.equal(await page.locator('#quizAdminList').textContent(),'');await page.close()}
 console.log('PASS mobile/desktop instant dialog, five questions, back/next, score feedback, saved result, admin records and logout privacy');
 }finally{await browser?.close();db?.close();if(server?.exitCode===null){const done=new Promise(r=>server.once('exit',r));server.kill();await done}rmSync(folder,{recursive:true,force:true})}
})().catch(e=>{console.error(e);process.exitCode=1});
