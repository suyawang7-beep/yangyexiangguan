(() => {
 const panel=$('quizResultsPanel');if(!panel)return;
 panel.innerHTML='<h2>⭐ 默契小测记录</h2><p class="muted">每天5题，答对至少3题领取25金币，每位岛民每天一次。保留每日最后一次答题、尝试次数与领奖状态；查看不会发放金币。</p><form id="quizAdminFilter" class="flex"><div class="field"><label for="quizAdminSearch">昵称或岛民编号</label><input id="quizAdminSearch" maxlength="100" placeholder="输入昵称或编号"></div><button type="submit">查找</button><button id="quizAdminRefresh" class="secondary" type="button">刷新</button></form><p id="quizAdminStatus" role="status" aria-live="polite"></p><div id="quizAdminList"></div><div class="flex"><button id="quizAdminPrevious" type="button" class="secondary" disabled>上一页</button><button id="quizAdminNext" type="button" class="secondary" disabled>下一页</button></div>';
 const style=document.createElement('style');style.textContent='#quizAdminList article{padding:16px;margin:14px 0;background:#fff9;border:1px solid #c2dbea;border-radius:16px;overflow-wrap:anywhere}#quizAdminList details{margin-top:12px}#quizAdminList p{white-space:pre-wrap}';document.head.append(style);
 let page=1,q='',revision=0;
 const list=$('quizAdminList'),status=$('quizAdminStatus'),previous=$('quizAdminPrevious'),next=$('quizAdminNext');
 async function load(){
  if($('app').hidden)return;const current=++revision,credential=adminToken;status.textContent='正在读取…';list.replaceChildren();previous.disabled=next.disabled=true;
  try{const out=await req('quiz-results?'+new URLSearchParams({page:String(page),q}));if(current!==revision||$('app').hidden||credential!==adminToken)return;
   if(out.total>0&&page>Math.ceil(out.total/out.pageSize)){page=Math.ceil(out.total/out.pageSize);return load()}
   for(const item of out.items){const article=document.createElement('article');article.append(node('h3',item.nickname+' · '+item.userId),node('p',item.date+'（北京时间） · 第'+(item.groupIndex+1)+'组 · '+item.score+'/5题 · 尝试'+item.attempts+'次 · '+(item.rewarded?'25金币已领取':'未领取奖励')));const detail=document.createElement('details');detail.append(node('summary','查看本次答案与解析'));for(const answer of item.feedback)detail.append(node('p',answer.prompt+'\n选择：'+answer.selectedText+'\n正确答案：'+answer.correctText+'\n'+answer.explanation));article.append(detail);list.append(article)}
   status.textContent='共 '+out.total+' 条 · 第 '+page+' 页'+(out.total?'':' · 暂无答题记录');previous.disabled=page<=1;next.disabled=page*out.pageSize>=out.total;
  }catch(e){if(current===revision&&!$('app').hidden&&credential===adminToken)status.textContent='读取失败：'+e.message}
 }
 $('quizAdminFilter').onsubmit=e=>{e.preventDefault();q=$('quizAdminSearch').value.trim();page=1;load()};$('quizAdminRefresh').onclick=()=>load();previous.onclick=()=>{if(page>1){page--;load()}};next.onclick=()=>{page++;load()};
 document.addEventListener('admin-page',e=>{if(e.detail==='quiz-results')load();else revision++});
 new MutationObserver(()=>{if(!$('app').hidden)return;revision++;list.replaceChildren();status.textContent='';q='';page=1;$('quizAdminSearch').value='';previous.disabled=next.disabled=true}).observe($('app'),{attributes:true,attributeFilter:['hidden']});
})();
