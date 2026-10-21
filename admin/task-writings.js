(() => {
 const panel=$('taskWritingsPanel');if(!panel)return;
 panel.innerHTML='<h2>📬 文字任务收件箱</h2><p class="muted">查看岛民事务所提交的生日来信与岛屿故事（岛屿回忆），含历史提交。仅管理员可见，查看不会改变金币或任务进度。</p><form id="taskWritingFilter" class="flex"><div class="field"><label for="taskWritingType">内容分类</label><select id="taskWritingType"><option value="">全部内容</option value="letter">生日来信</option><option value="memory">岛屿故事</option></select></div><div class="field"><label for="taskWritingSearch">昵称或岛民编号</label><input id="taskWritingSearch" maxlength="100" placeholder="输入昵称或编号查找"></div><button type="submit">查找</button><button id="taskWritingRefresh" class="secondary" type="button">刷新</button></form><p id="taskWritingStatus" role="status" aria-live="polite"></p><div id="taskWritingList"></div><div class="flex"><button id="taskWritingPrevious" class="secondary" type="button" disabled>上一页</button><button id="taskWritingNext" class="secondary" type="button" disabled>下一页</button></div>';
 const style=document.createElement('style');style.textContent='#taskWritingList article{background:#fff9;border:1px solid #bdd5e6;border-radius:16px;padding:16px;margin:14px 0;overflow-wrap:anywhere}#taskWritingList article p{white-space:pre-wrap}#taskWritingFilter .field{min-width:0;flex-basis:220px}';document.head.append(style);
 let page=1,total=0,revision=0,activeType='',activeQuery='';
 const status=$('taskWritingStatus'),list=$('taskWritingList'),previous=$('taskWritingPrevious'),next=$('taskWritingNext');
 const date=value=>{const d=new Date(value);return Number.isNaN(d.getTime())?'时间未知':new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(d)+'（北京时间）'};
 async function load(){
  if($('app').hidden)return;const current=++revision;status.textContent='正在读取…';list.replaceChildren();previous.disabled=next.disabled=true;
  try{const out=await req('task-writings?'+new URLSearchParams({type:activeType,q:activeQuery,page:String(page)}));if(current!==revision||$('app').hidden)return;
   if(out.total>0&&page>Math.ceil(out.total/out.pageSize)){page=Math.ceil(out.total/out.pageSize);return load()}
   total=out.total;for(const item of out.items){const article=document.createElement('article');article.append(node('h3',item.type==='memory'?'岛屿故事':'生日来信'),node('div',item.nickname+' · 岛民编号 '+item.userId),node('small',date(item.createdAt)+(item.taskKey.startsWith('letter:')?' · 来信日期 '+item.taskKey.slice(7):'')),node('p',item.body));list.append(article)}
   status.textContent='共 '+total+' 条 · 第 '+page+' 页'+(total?'':' · 暂无符合条件的内容');previous.disabled=page<=1;next.disabled=page*out.pageSize>=total;
  }catch(e){if(current!==revision||$('app').hidden)return;status.textContent='读取失败：'+e.message+'，请点击刷新重试。'}
 }
 $('taskWritingFilter').onsubmit=e=>{e.preventDefault();activeType=$('taskWritingType').value;activeQuery=$('taskWritingSearch').value.trim();page=1;load()};
 $('taskWritingRefresh').onclick=()=>load();previous.onclick=()=>{if(page>1){page--;load()}};next.onclick=()=>{page++;load()};
 document.addEventListener('admin-page',e=>{if(e.detail==='task-writings')load();else revision++});
 new MutationObserver(()=>{if(!$('app').hidden)return;revision++;list.replaceChildren();status.textContent='';$('taskWritingSearch').value='';$('taskWritingType').value='';activeQuery=activeType='';page=1;total=0;previous.disabled=next.disabled=true}).observe($('app'),{attributes:true,attributeFilter:['hidden']});
})();
