(() => {
  if (document.body.dataset.page !== 'mailbox') return;
  const css=document.createElement('style');css.textContent=`
  .mail-tabs{display:flex;gap:12px;flex-wrap:wrap;margin:18px 0}.mail-tabs button{border:1px solid #9fc6dd;border-radius:24px;padding:12px 22px;cursor:pointer;background:#effbffdf;color:#285777;font-weight:700}.mail-tabs button[aria-selected="true"]{background:#80bce3;color:#133c61}
  .board-area{max-width:960px;margin:auto}.board-form,.board-entry{padding:20px;margin:14px 0;border:1px solid #ffffffaa;border-radius:22px;background:#eaf7ffba;box-shadow:0 8px 28px #517b9b20;backdrop-filter:blur(16px)}
  .board-form textarea{width:100%;min-height:100px;border:1px solid #aad5e7;border-radius:12px;padding:12px;box-sizing:border-box;background:#fffdfd}.board-form button{padding:10px 22px;border-radius:22px;border:0;background:#519dd1;color:white}.board-meta{font-size:13px;color:#54738c}.board-entry p{white-space:pre-wrap;overflow-wrap:anywhere}.board-reply{border-left:3px solid #75b8df;padding-left:14px;margin-top:14px}.board-identity{display:flex;gap:16px;margin:12px 0}.board-status{min-height:1.5em}
  `;document.head.append(css);
  const make=(tag,cls,content)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(content!==undefined)el.textContent=content;return el};
  async function mount(){
    const main=document.querySelector('#main');if(!main)return;
    if(document.getElementById('islandMessageTabs'))return;
    const tabs=make('div','mail-tabs');tabs.id='islandMessageTabs';tabs.setAttribute('role','tablist');
    const letters=make('button','','岛主来信'),board=make('button','','岛民留言板');letters.type=board.type='button';
    letters.setAttribute('role','tab');board.setAttribute('role','tab');tabs.append(letters,board);
    const boardArea=make('section','board-area');boardArea.id='islandBoard';boardArea.hidden=true;
    const layout=main.querySelector('.mailbox-layout');if(!layout)return;
    layout.before(tabs,boardArea);
    const show=which=>{const on=which==='board';layout.hidden=on;boardArea.hidden=!on;letters.setAttribute('aria-selected',String(!on));board.setAttribute('aria-selected',String(on));if(on)load()};
    letters.onclick=()=>show('letters');board.onclick=()=>show('board');
    const form=make('form','board-form');const title=make('h2','','写给岛上的一封信'),note=make('p','','留下你的祝福和心情。实名会显示通行证昵称；匿名只显示“匿名岛民”。');
    const textarea=make('textarea');textarea.required=true;textarea.maxLength=500;textarea.placeholder='想对菜菜、吱吱和大家说些什么？（最多500字）';
    const identity=make('div','board-identity'),real=make('label'),anon=make('label'),realInput=make('input'),anonInput=make('input');
    realInput.type=anonInput.type='radio';realInput.name=anonInput.name='identity';realInput.value='real';anonInput.value='anon';realInput.checked=true;
    real.append(realInput,document.createTextNode(' 实名留言'));anon.append(anonInput,document.createTextNode(' 匿名留言'));identity.append(real,anon);
    const send=make('button','','投递留言');send.type='submit';const status=make('p','board-status');status.setAttribute('role','status');
    form.append(title,note,textarea,identity,send,status);const list=make('div','board-list');boardArea.append(form,list);
    form.onsubmit=async e=>{e.preventDefault();send.disabled=true;status.textContent='投递中…';try{
      const token=sessionStorage.getItem('buzhi-online-token');if(!token)throw Error('请先前往生日通行证登记或登录，再留言');
      const resp=await fetch('/api/messages',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({body:textarea.value,anonymous:anonInput.checked})});
      const result=await resp.json();if(!resp.ok)throw Error(result.error||'提交失败');textarea.value='';status.textContent='投递成功！';await load();
    }catch(error){status.textContent=error.message}finally{send.disabled=false}};
    async function load(){list.replaceChildren(make('p','','正在读取留言…'));try{const response=await fetch('/api/messages');if(!response.ok)throw Error('暂时无法加载留言');const items=await response.json();list.replaceChildren();if(!items.length)list.append(make('p','','还没有留言，来写第一封吧！'));
      for(const m of items){const item=make('article','board-entry'),meta=make('div','board-meta',m.author+' · '+new Date(m.createdAt).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'})),body=make('p','',m.body);item.append(meta,body);if(m.reply){const reply=make('div','board-reply');reply.append(make('strong','','岛主回复'),make('p','',m.reply));item.append(reply)}list.append(item)}
    }catch(e){list.replaceChildren(make('p','',e.message))}}
    show(new URLSearchParams(location.search).get('tab')==='messages'?'board':'letters');
  }
  document.addEventListener('buzhi:render',mount);if(document.readyState!=='loading')mount();else document.addEventListener('DOMContentLoaded',mount);
})();