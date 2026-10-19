(() => {
  const section=document.getElementById('islandMessagesPanel');if(!section)return;
  section.innerHTML='<h2>💌 岛民留言板</h2><p class="muted">匿名留言对公众隐藏昵称，后台保留通行证账户供审核。回复保存后会展示在公开留言下。</p><button type="button" id="islandMessageRefresh">刷新留言</button><div id="islandMessageItems"></div>';
  const list=document.getElementById('islandMessageItems');
  async function load(){list.textContent='正在读取留言…';try{const messages=await req('messages');list.replaceChildren();if(!messages.length)list.textContent='暂无留言';
    for(const m of messages){const article=document.createElement('article');article.className='glass';article.style.margin='12px 0';
      const author=node('strong',m.anonymous?'匿名 · '+m.nickname:m.nickname),time=node('small','　'+m.createdAt+' · '+m.userId),body=node('p',m.body),label=node('label','岛主回复'),input=document.createElement('textarea'),button=node('button','保存回复'),status=node('p','');
      input.value=m.reply||'';input.maxLength=1000;input.rows=3;input.style.width='100%';button.type='button';
      button.onclick=async()=>{button.disabled=true;try{await req('messages/reply',{id:m.id,reply:input.value});status.textContent='已保存';}catch(e){status.textContent=e.message}finally{button.disabled=false}};
      article.append(author,time,body,label,input,button,status);list.append(article)}}
    catch(e){list.textContent=e.message}}
  document.getElementById('islandMessageRefresh').onclick=load;
  document.addEventListener('admin-page',e=>{if(e.detail==='messages')load()});
})();