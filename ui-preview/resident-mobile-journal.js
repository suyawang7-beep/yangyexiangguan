/* Approved mobile presentation; no API writes or invented OC ownership. */
(() => {
 'use strict';
 const center=document.querySelector('#center');if(!center||!document.querySelector('#journal-identity'))return;
 const mobile=matchMedia('(max-width:680px)'),identity=document.querySelector('#journal-identity');
 const welcome=document.createElement('div');welcome.className='journal-mobile-welcome';welcome.innerHTML='<h2>海风替你<br>留了一页</h2><img src="assets/island.svg" alt="小岛插画；尚未绑定个人OC">';identity.prepend(welcome);
 const folds=[];
 function fold(section,title,id){const details=document.createElement('details');details.className='journal-mobile-fold';details.id=id;const summary=document.createElement('summary');summary.textContent=title;details.append(summary);section.before(details);details.append(section);folds.push(details)}
 fold(document.querySelector('#journal-items'),'小岛纪念架','journal-items-fold');
 fold(document.querySelector('.journal-journey'),'我的登岛足迹','journal-journey-fold');
 fold(document.querySelector('.journal-secondary'),'我的书桌与设置','journal-desk-fold');
 function letters(){document.querySelectorAll('#island-mail-list>article').forEach(article=>{if(article.querySelector('.journal-letter-body'))return;const paragraphs=[...article.querySelectorAll(':scope>p')];if(paragraphs.length<3)return;const details=document.createElement('details');details.className='journal-letter-body';const summary=document.createElement('summary');summary.textContent='展开信件正文';details.append(summary,paragraphs[1],paragraphs[2]);article.insertBefore(details,article.querySelector('button,.resident-chip'));details.open=!mobile.matches})}
 const list=document.querySelector('#island-mail-list');new MutationObserver(letters).observe(list,{childList:true});letters();
 function sync(){for(const details of folds){details.open=!mobile.matches;if(mobile.matches)details.name='journal-mobile-section';else details.removeAttribute('name')}document.querySelectorAll('.journal-letter-body').forEach(details=>{details.open=!mobile.matches});}
 // Keep the desktop panels visible, and collapse the secondary phone sections.
 mobile.addEventListener('change',sync);sync();
 for(const details of folds)details.addEventListener('toggle',()=>{if(mobile.matches&&details.open)for(const other of folds)if(other!==details)other.open=false});
})();
