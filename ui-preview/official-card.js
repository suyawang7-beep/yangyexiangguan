(()=>{'use strict';const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(card, { owned = true, quantity = 0, interactive = false } = {}, picture) {
    const tag = interactive ? 'button' : 'div';
    return `<${tag} ${interactive ? `type="button" data-card="${card.id}" aria-label="${esc(card.name)}，${card.rarity}，${owned ? `已拥有${quantity}张` : '未获得'}"` : ''} class="memory-card ${owned ? '' : 'locked'}" data-rarity="${card.rarity}">
      ${quantity ? `<span class="quantity">× ${quantity}</span>` : ''}<div class="card-inner"><div class="card-topline"><span class="card-number">${card.id} / 2026</span><span class="rarity">${card.rarity}</span></div><div class="card-picture">${picture(card)}</div><div class="card-nameplate"><span class="card-crest" aria-hidden="true">✧</span><div class="card-title">${esc(card.name)}</div><p class="card-subtitle">BUZHI · CELESTIAL ARCHIVE</p></div><div class="card-bottomline"><span>${owned ? 'BIRTHDAY COLLECTION' : '等待相遇'}</span><span>10.20 ✦</span></div></div></${tag}>`;
  }
window.BziOfficialCard=Object.freeze({render});})();
