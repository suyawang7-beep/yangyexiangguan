import {randomInt} from 'node:crypto';

// Approved 35-question bank. This module is server-only; answers are never sent before submission.
export const QUIZ_BANK = [
 {
  "id": "quiz-01",
  "prompt": "我们共同生活的小岛叫什么？",
  "options": [
   {
    "id": "a",
    "text": "星眠岛"
   },
   {
    "id": "b",
    "text": "不吱岛"
   },
   {
    "id": "c",
    "text": "月落岛"
   }
  ],
  "correct": "b",
  "explanation": "这里是不吱岛，菜菜、吱吱和岛民们一起留下故事的地方。"
 },
 {
  "id": "quiz-02",
  "prompt": "不吱岛的两位岛主是谁？",
  "options": [
   {
    "id": "a",
    "text": "菜菜与吱吱"
   },
   {
    "id": "b",
    "text": "菜菜与肥啾"
   },
   {
    "id": "c",
    "text": "吱吱与邮差"
   }
  ],
  "correct": "a",
  "explanation": "菜菜与吱吱共同担任不吱岛的岛主。"
 },
 {
  "id": "quiz-03",
  "prompt": "两位岛主原本来自哪里？",
  "options": [
   {
    "id": "a",
    "text": "云朵王国"
   },
   {
    "id": "b",
    "text": "月兔城"
   },
   {
    "id": "c",
    "text": "雪啾国"
   }
  ],
  "correct": "c",
  "explanation": "在已经公布的世界观里，两位岛主来自雪啾国。"
 },
 {
  "id": "quiz-04",
  "prompt": "成为岛主以前，她们是什么身份？",
  "options": [
   {
    "id": "a",
    "text": "海上探险家"
   },
   {
    "id": "b",
    "text": "青春偶像"
   },
   {
    "id": "c",
    "text": "皇家邮差"
   }
  ],
  "correct": "b",
  "explanation": "在来到不吱岛之前，她们曾是雪啾国的青春偶像。"
 },
 {
  "id": "quiz-05",
  "prompt": "世界观里，她们为什么隐退？",
  "options": [
   {
    "id": "a",
    "text": "屡次在公共场合八卦别人"
   },
   {
    "id": "b",
    "text": "忘记了所有歌词"
   },
   {
    "id": "c",
    "text": "被海浪冲走了舞台"
   }
  ],
  "correct": "a",
  "explanation": "故事设定中，她们因屡次在公共场合八卦别人而隐退。"
 },
 {
  "id": "quiz-06",
  "prompt": "两位岛主用什么买下了小岛？",
  "options": [
   {
    "id": "a",
    "text": "寻宝奖金"
   },
   {
    "id": "b",
    "text": "全部收入"
   },
   {
    "id": "c",
    "text": "一箱贝壳"
   }
  ],
  "correct": "b",
  "explanation": "两位岛主用全部收入买下小岛，为新的生活留出一个家。"
 },
 {
  "id": "quiz-07",
  "prompt": "哪个故事顺序正确？",
  "options": [
   {
    "id": "a",
    "text": "买岛→成为偶像→隐退"
   },
   {
    "id": "b",
    "text": "隐退→成为偶像→买岛"
   },
   {
    "id": "c",
    "text": "成为偶像→隐退→买岛"
   }
  ],
  "correct": "c",
  "explanation": "先是青春偶像，隐退以后买下小岛，才有了后来的不吱岛故事。"
 },
 {
  "id": "quiz-08",
  "prompt": "买下小岛后，菜菜和吱吱成了什么？",
  "options": [
   {
    "id": "a",
    "text": "岛主大人"
   },
   {
    "id": "b",
    "text": "王国邮差"
   },
   {
    "id": "c",
    "text": "海上船长"
   }
  ],
  "correct": "a",
  "explanation": "买下并命名不吱岛后，菜菜和吱吱成为了共同岛主。"
 },
 {
  "id": "quiz-09",
  "prompt": "加入我们的粉丝团，通常怎么说？",
  "options": [
   {
    "id": "a",
    "text": "入学"
   },
   {
    "id": "b",
    "text": "上岛或入岛"
   },
   {
    "id": "c",
    "text": "登月"
   }
  ],
  "correct": "b",
  "explanation": "加入粉丝团叫作上岛或入岛，欢迎成为这段故事的一部分。"
 },
 {
  "id": "quiz-10",
  "prompt": "再次来到熟悉的直播间，哪句招呼最有小岛味？",
  "options": [
   {
    "id": "a",
    "text": "开庭了"
   },
   {
    "id": "b",
    "text": "上班打卡"
   },
   {
    "id": "c",
    "text": "我回岛啦"
   }
  ],
  "correct": "c",
  "explanation": "一句“我回岛啦”，就是岛民们熟悉的相聚招呼。"
 },
 {
  "id": "quiz-11",
  "prompt": "菜菜的标志性发色是？",
  "options": [
   {
    "id": "a",
    "text": "银白色"
   },
   {
    "id": "b",
    "text": "栗棕色"
   },
   {
    "id": "c",
    "text": "樱粉色"
   }
  ],
  "correct": "a",
  "explanation": "菜菜的角色设定是银白色头发。"
 },
 {
  "id": "quiz-12",
  "prompt": "菜菜的头发长度更接近哪一种？",
  "options": [
   {
    "id": "a",
    "text": "及腰长发"
   },
   {
    "id": "b",
    "text": "及肩短发"
   },
   {
    "id": "c",
    "text": "耳上寸发"
   }
  ],
  "correct": "b",
  "explanation": "菜菜的标志性发型是及肩短发。"
 },
 {
  "id": "quiz-13",
  "prompt": "菜菜的瞳色是？",
  "options": [
   {
    "id": "a",
    "text": "琥珀金"
   },
   {
    "id": "b",
    "text": "草绿色"
   },
   {
    "id": "c",
    "text": "宝蓝色"
   }
  ],
  "correct": "c",
  "explanation": "菜菜有一双宝蓝色的眼睛。"
 },
 {
  "id": "quiz-14",
  "prompt": "菜菜的小角长在哪里？",
  "options": [
   {
    "id": "a",
    "text": "后脑勺"
   },
   {
    "id": "b",
    "text": "额间偏上"
   },
   {
    "id": "c",
    "text": "耳朵旁边"
   }
  ],
  "correct": "b",
  "explanation": "菜菜的小角位于额间偏上的位置。"
 },
 {
  "id": "quiz-15",
  "prompt": "菜菜的小角是什么感觉？",
  "options": [
   {
    "id": "a",
    "text": "小巧、角尖圆润"
   },
   {
    "id": "b",
    "text": "巨大分叉鹿角"
   },
   {
    "id": "c",
    "text": "两根细长尖角"
   }
  ],
  "correct": "a",
  "explanation": "菜菜的小角体量小，角尖圆润，是角色设定里的小标记。"
 },
 {
  "id": "quiz-16",
  "prompt": "吱吱头发的主要颜色是？",
  "options": [
   {
    "id": "a",
    "text": "纯薄荷绿"
   },
   {
    "id": "b",
    "text": "蓝灰色"
   },
   {
    "id": "c",
    "text": "银白色"
   }
  ],
  "correct": "b",
  "explanation": "吱吱的头发以蓝灰色为主，薄荷绿是局部挑染。"
 },
 {
  "id": "quiz-17",
  "prompt": "吱吱的标志性发型是？",
  "options": [
   {
    "id": "a",
    "text": "长发"
   },
   {
    "id": "b",
    "text": "及肩短发"
   },
   {
    "id": "c",
    "text": "寸发"
   }
  ],
  "correct": "a",
  "explanation": "吱吱的标志性发型是长发。"
 },
 {
  "id": "quiz-18",
  "prompt": "吱吱的薄荷绿挑染主要集中在哪里？",
  "options": [
   {
    "id": "a",
    "text": "全部发尾"
   },
   {
    "id": "b",
    "text": "后脑整片"
   },
   {
    "id": "c",
    "text": "刘海附近"
   }
  ],
  "correct": "c",
  "explanation": "薄荷绿挑染主要集中在刘海附近，不是整头绿色。"
 },
 {
  "id": "quiz-19",
  "prompt": "吱吱的眼睛以什么颜色为主？",
  "options": [
   {
    "id": "a",
    "text": "粉色"
   },
   {
    "id": "b",
    "text": "蓝色"
   },
   {
    "id": "c",
    "text": "金色"
   }
  ],
  "correct": "b",
  "explanation": "吱吱的瞳色以蓝色为主，下缘带少量粉色。"
 },
 {
  "id": "quiz-20",
  "prompt": "吱吱眼睛里的少量粉色主要在哪里？",
  "options": [
   {
    "id": "a",
    "text": "瞳色下缘"
   },
   {
    "id": "b",
    "text": "整只眼睛"
   },
   {
    "id": "c",
    "text": "只有眼白"
   }
  ],
  "correct": "a",
  "explanation": "少量粉色位于瞳色下缘，是蓝粉瞳的小细节。"
 },
 {
  "id": "quiz-21",
  "prompt": "本次生日庆典的寿星是谁？",
  "options": [
   {
    "id": "a",
    "text": "吱吱"
   },
   {
    "id": "b",
    "text": "两人都是"
   },
   {
    "id": "c",
    "text": "菜菜"
   }
  ],
  "correct": "c",
  "explanation": "这次是不吱岛·菜菜岛主生日庆典，寿星是菜菜。"
 },
 {
  "id": "quiz-22",
  "prompt": "吱吱在本次庆典中的身份是？",
  "options": [
   {
    "id": "a",
    "text": "共同岛主与庆生搭档"
   },
   {
    "id": "b",
    "text": "路过的游客"
   },
   {
    "id": "c",
    "text": "神秘反派"
   }
  ],
  "correct": "a",
  "explanation": "吱吱是共同岛主，也是陪菜菜一起庆生的搭档。"
 },
 {
  "id": "quiz-23",
  "prompt": "想给菜菜写生日祝福，应选择哪个任务？",
  "options": [
   {
    "id": "a",
    "text": "临时委托"
   },
   {
    "id": "b",
    "text": "生日来信"
   },
   {
    "id": "c",
    "text": "创作展投稿"
   }
  ],
  "correct": "b",
  "explanation": "生日来信可以直接写下想对菜菜说的话。"
 },
 {
  "id": "quiz-24",
  "prompt": "生日来信至少需要多少个非空白字符？",
  "options": [
   {
    "id": "a",
    "text": "5个"
   },
   {
    "id": "b",
    "text": "10个"
   },
   {
    "id": "c",
    "text": "15个"
   }
  ],
  "correct": "c",
  "explanation": "生日来信至少需要15个非空白字符，空格和换行不计入。"
 },
 {
  "id": "quiz-25",
  "prompt": "生日来信多久可以完成一次？",
  "options": [
   {
    "id": "a",
    "text": "每天一次"
   },
   {
    "id": "b",
    "text": "每小时一次"
   },
   {
    "id": "c",
    "text": "整个活动只能一次"
   }
  ],
  "correct": "a",
  "explanation": "生日来信每天可完成一次，按北京时间零点更新。"
 },
 {
  "id": "quiz-26",
  "prompt": "完成一篇合格的生日来信，可以获得多少金币？",
  "options": [
   {
    "id": "a",
    "text": "10"
   },
   {
    "id": "b",
    "text": "25"
   },
   {
    "id": "c",
    "text": "100"
   }
  ],
  "correct": "b",
  "explanation": "完成生日来信后，可获得25金币。"
 },
 {
  "id": "quiz-27",
  "prompt": "“岛屿回忆”最适合写什么？",
  "options": [
   {
    "id": "a",
    "text": "与菜菜、吱吱相遇和相伴的回忆"
   },
   {
    "id": "b",
    "text": "登录密码"
   },
   {
    "id": "c",
    "text": "一次性兑换码"
   }
  ],
  "correct": "a",
  "explanation": "把相遇和陪伴写进岛屿回忆，就能留住属于你们的小故事。"
 },
 {
  "id": "quiz-28",
  "prompt": "此前约定的个人OC创建资格，大致在什么阶段开放？",
  "options": [
   {
    "id": "a",
    "text": "刚打开网页"
   },
   {
    "id": "b",
    "text": "第一次抽卡"
   },
   {
    "id": "c",
    "text": "粉丝团达到约11～12级并经核验"
   }
  ],
  "correct": "c",
  "explanation": "个人OC资格按此前约定的粉丝团等级及核验开放，网页注册不自动赋予资格。"
 },
 {
  "id": "quiz-29",
  "prompt": "岛民OC的职业与设定，应主要结合谁的想法？",
  "options": [
   {
    "id": "a",
    "text": "随机抽签决定"
   },
   {
    "id": "b",
    "text": "岛民自己的想法，与岛主共同完善"
   },
   {
    "id": "c",
    "text": "统一复制菜菜"
   }
  ],
  "correct": "b",
  "explanation": "每位岛民都有自己的想法，再与岛主一起完善职业与角色设定。"
 },
 {
  "id": "quiz-30",
  "prompt": "岛民故事与菜菜、吱吱之间，最符合我们的方向的是？",
  "options": [
   {
    "id": "a",
    "text": "有相遇、有互动，一起串起小岛故事"
   },
   {
    "id": "b",
    "text": "完全没有联系"
   },
   {
    "id": "c",
    "text": "只有名字出现在名单上"
   }
  ],
  "correct": "a",
  "explanation": "岛民的故事和双岛主的相遇、互动共同串起不吱岛。"
 },
 {
  "id": "quiz-31",
  "prompt": "想抽取庆典回忆卡，应该去哪里？",
  "options": [
   {
    "id": "a",
    "text": "岛民事务所"
   },
   {
    "id": "b",
    "text": "肥啾邮局"
   },
   {
    "id": "c",
    "text": "登岛导览"
   }
  ],
  "correct": "b",
  "explanation": "肥啾邮局是抽取庆典回忆卡的地方。"
 },
 {
  "id": "quiz-32",
  "prompt": "想欣赏已经获得的卡片，应该去哪里？",
  "options": [
   {
    "id": "a",
    "text": "岛主信箱"
   },
   {
    "id": "b",
    "text": "庆典码头"
   },
   {
    "id": "c",
    "text": "回忆收藏室"
   }
  ],
  "correct": "c",
  "explanation": "回忆收藏室会保存并展示已经获得的卡片。"
 },
 {
  "id": "quiz-33",
  "prompt": "想认识岛上的各个去处，应该打开哪里？",
  "options": [
   {
    "id": "a",
    "text": "登岛地图导览"
   },
   {
    "id": "b",
    "text": "金币小账本"
   },
   {
    "id": "c",
    "text": "抽卡历史"
   }
  ],
  "correct": "a",
  "explanation": "登岛地图导览会带你认识岛上的不同去处。"
 },
 {
  "id": "quiz-34",
  "prompt": "想给岛主留一条实名或匿名留言，应该去哪里？",
  "options": [
   {
    "id": "a",
    "text": "回忆收藏室"
   },
   {
    "id": "b",
    "text": "岛主信箱的岛民留言板"
   },
   {
    "id": "c",
    "text": "签到页"
   }
  ],
  "correct": "b",
  "explanation": "岛主信箱里的岛民留言板支持实名或匿名留言。"
 },
 {
  "id": "quiz-35",
  "prompt": "想记录岛民自己的生活与创作，应该去哪里？",
  "options": [
   {
    "id": "a",
    "text": "肥啾邮局"
   },
   {
    "id": "b",
    "text": "抽卡历史"
   },
   {
    "id": "c",
    "text": "居民物语／个人中心"
   }
  ],
  "correct": "c",
  "explanation": "居民物语和个人中心承载岛民的生活记录与创作。"
 }
];
const fail=(status,message)=>Object.assign(new Error(message),{status});
const titles=['岛主的来历','小岛是怎么来的','认出菜菜','认出吱吱','菜菜的生日邀约','让相遇留在岛上','今天也一起回岛'];
export function dailyQuiz(at=Date.now()){
 const date=new Date(at+8*3600000).toISOString().slice(0,10);
 const index=((Math.floor((Date.parse(date+'T00:00:00Z')-Date.parse('2026-10-21T00:00:00Z'))/86400000)%7)+7)%7;
 return {date,groupIndex:index,title:titles[index],nextUpdateAt:new Date(Date.parse(date+'T00:00:00+08:00')+86400000).toISOString(),questions:QUIZ_BANK.slice(index*5,index*5+5)};
}
function shuffled(options){const out=options.map(o=>({...o}));for(let i=out.length-1;i>0;i--){const j=randomInt(i+1);[out[i],out[j]]=[out[j],out[i]]}return out}
export function createQuiz(db,{membership,requireActiveActivity,tx,earn,state,awardTaskStages}){
 db.exec("CREATE TABLE IF NOT EXISTS quiz_attempts(user_id TEXT NOT NULL REFERENCES users(id),day TEXT NOT NULL,group_index INTEGER NOT NULL,score INTEGER NOT NULL,answers_json TEXT NOT NULL,feedback_json TEXT NOT NULL,attempts INTEGER NOT NULL DEFAULT 1,rewarded INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,PRIMARY KEY(user_id,day))");
 function rewarded(id,date){return !!db.prepare("SELECT 1 FROM tasks WHERE user_id=? AND (task_id=? OR (task_id='quiz' AND date(redeemed_at,'+8 hours')=?))").get(id,'quiz:'+date,date)}
 function latest(id,date){const r=db.prepare('SELECT score,feedback_json,rewarded,attempts FROM quiz_attempts WHERE user_id=? AND day=?').get(id,date);return r?{score:r.score,passed:r.score>=3,rewarded:!!r.rewarded,feedback:JSON.parse(r.feedback_json),attempts:r.attempts}:null}
 function status(id){const {date,nextUpdateAt}=dailyQuiz();return{date,rewarded:rewarded(id,date),nextUpdateAt}}
 function today(id){membership.requireVerified(id);const d=dailyQuiz();return{date:d.date,groupIndex:d.groupIndex,title:d.title,timezone:'Asia/Shanghai',nextUpdateAt:d.nextUpdateAt,reward:25,passScore:3,rewarded:rewarded(id,d.date),latest:latest(id,d.date),questions:d.questions.map(q=>({id:q.id,prompt:q.prompt,options:shuffled(q.options)}))}}
 function submit(id,b){
  membership.requireVerified(id);requireActiveActivity();
  return tx(()=>{
   requireActiveActivity();
   const d=dailyQuiz();
   if(b.date!==d.date)throw fail(409,'题目已按北京时间更新，请重新打开今日小测');
   if(!Array.isArray(b.answers)||b.answers.length!==5||b.answers.some(a=>!a||typeof a.questionId!=='string'||typeof a.optionId!=='string')||new Set(b.answers.map(a=>a.questionId)).size!==5)throw fail(400,'请完整回答今日5道题');
   const supplied=new Map(b.answers.map(a=>[a.questionId,a.optionId]));
   if(d.questions.some(q=>!q.options.some(o=>o.id===supplied.get(q.id))))throw fail(400,'题目或答案无效，请重新打开今日小测');
   if(rewarded(id,d.date))return{date:d.date,...latest(id,d.date),alreadyRewarded:true,rewardGranted:0,profile:state(id)};
   const feedback=d.questions.map(q=>({questionId:q.id,prompt:q.prompt,correct:supplied.get(q.id)===q.correct,selectedText:q.options.find(o=>o.id===supplied.get(q.id)).text,correctText:q.options.find(o=>o.id===q.correct).text,explanation:q.explanation}));
   const score=feedback.filter(q=>q.correct).length,passed=score>=3,stamp=new Date().toISOString();
   db.prepare('INSERT INTO quiz_attempts(user_id,day,group_index,score,answers_json,feedback_json,attempts,rewarded,created_at,updated_at) VALUES(?,?,?,?,?,?,1,?,?,?) ON CONFLICT(user_id,day) DO UPDATE SET score=excluded.score,answers_json=excluded.answers_json,feedback_json=excluded.feedback_json,attempts=quiz_attempts.attempts+1,rewarded=excluded.rewarded,updated_at=excluded.updated_at').run(id,d.date,d.groupIndex,score,JSON.stringify(b.answers),JSON.stringify(feedback),passed?1:0,stamp,stamp);
   if(passed){db.prepare('INSERT INTO tasks VALUES(?,?,?)').run(id,'quiz:'+d.date,stamp);earn(id,25,'每日默契小测 '+d.date);awardTaskStages(id)}
   return{date:d.date,score,passed,rewarded:passed,feedback,rewardGranted:passed?25:0,profile:state(id)};
  });
 }
 function adminList(params){
  const q=(params.get('q')||'').trim(),page=Number(params.get('page')||1),pageSize=50;
  if(q.length>100||!Number.isSafeInteger(page)||page<1||page>1000000)throw fail(400,'查询条件或页码无效');
  const where="(?='' OR instr(lower(u.id),lower(?))>0 OR instr(lower(u.nickname),lower(?))>0)",args=[q,q,q];
  const total=db.prepare('SELECT count(*) n FROM quiz_attempts a JOIN users u ON u.id=a.user_id WHERE '+where).get(...args).n;
  const items=db.prepare('SELECT a.user_id AS userId,u.nickname,a.day AS date,a.group_index AS groupIndex,a.score,a.attempts,a.rewarded,a.feedback_json AS feedback,a.updated_at AS updatedAt FROM quiz_attempts a JOIN users u ON u.id=a.user_id WHERE '+where+' ORDER BY a.day DESC,a.updated_at DESC,a.user_id LIMIT ? OFFSET ?').all(...args,pageSize,(page-1)*pageSize).map(r=>({...r,rewarded:!!r.rewarded,feedback:JSON.parse(r.feedback)}));
  return{items,total,page,pageSize};
 }
 return{status,today,submit,adminList};
}
