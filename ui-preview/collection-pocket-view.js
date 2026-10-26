/* Formal pocket view: edit this source directly. No prototype generation step.
 * Interface: mount(host, collectionSnapshot, savedState?) -> { captureState() }.
 * Owns rendering and interaction; knows nothing about app.js, media queries or API calls.
 */
(() => {
  "use strict";
  const sheet = `
@font-face{font-family:Round;src:url('/assets/fonts/buzhi-rounded.woff2');font-display:swap}@font-face{font-family:Hand;src:url('/assets/fonts/buzhi-hand.woff2');font-display:swap}
:host{font-family:Round,'Microsoft YaHei',sans-serif;color:#31566a;background:#e5f2f5;font-synthesis:none;--sea:#4e7d8f;--muted:#708996;--paper:#fffef8;--line:#c9dbe1;--ease:cubic-bezier(.23,1,.32,1)}*{box-sizing:border-box}:host{margin:0;background:radial-gradient(ellipse at 80% 7%,#ffffffb8,transparent 60%),linear-gradient(155deg,#e9f5f7,#dfeef4 75%,#eaf2ef);min-height:0}button,input,select{font:inherit;color:inherit}button,a{-webkit-tap-highlight-color:transparent;touch-action:manipulation}button{cursor:pointer}button:disabled{opacity:.4;cursor:default}a{text-decoration:none;color:inherit}button:focus-visible,a:focus-visible,input:focus-visible,summary:focus-visible{outline:3px solid #4f8096;outline-offset:3px}[hidden]{display:none!important}h1,h2,h3,p,figure{margin:0}img{display:block;max-width:100%}.phone{max-width:440px;min-height:0;margin:auto;padding:12px 16px max(8px,env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:10px}.topbar{display:flex;align-items:center;justify-content:space-between;min-height:38px}.brand{display:flex;align-items:center;gap:7px;font-size:16px}.brand img{width:27px;height:27px}.prototype-label{font-size:10px;color:#78929e;border:1px solid #bfd4df;padding:4px 8px;border-radius:20px}.intro{padding:5px 3px 4px;display:flex;justify-content:space-between;gap:10px;align-items:center}.intro h1{font:29px/1.35 Hand,sans-serif;letter-spacing:.04em}.intro p{font-size:11px;margin-top:5px;color:#6b8693}.intro-stats{flex-shrink:0;text-align:right}.intro-stats strong{font-size:23px;font-weight:400;display:block;line-height:1.2}.intro-stats small{font-size:10px;color:#7a929c}.tiny-progress{width:54px;height:3px;background:#d0e1e6;margin:8px 0 0 auto;border-radius:10px;overflow:hidden}.tiny-progress span{display:block;width:21.43%;height:100%;background:#87aba6}
.tabs{display:flex;gap:4px;padding:4px;background:#f8fcfdc9;border:1px solid #fff;border-radius:16px}.tabs button{flex:1;min-height:40px;border:0;border-radius:12px;background:transparent;font-size:13px;color:#6c8795}.tabs button[aria-selected=true]{background:#4e7d8f;color:#fff;box-shadow:0 3px 9px #4e7d8f1a}.toolbar{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:34px;padding:0 3px}.toolbar p{color:#728b98;font-size:11px}.filter-button{display:flex;align-items:center;gap:8px;border:0;background:transparent;min-height:44px;padding:3px 7px;font-size:12px}.filter-button span{display:grid;place-items:center;min-width:17px;height:17px;border-radius:50%;background:#e0ebe4;font-size:10px}.panel{min-width:0}.binder{position:relative;padding:14px 15px 7px 20px;background:linear-gradient(100deg,#edf0e9 0,#fffef7 7%,#fffef9 91%,#eef1ed);border:1px solid white;border-radius:9px 21px 21px 9px;box-shadow:0 9px 22px #315b7010,inset 7px 0 0 #d2e1df,inset 9px 0 0 #ffffff;touch-action:pan-y;overflow:hidden}.binder-heading{display:flex;align-items:center;justify-content:space-between;min-height:22px;font-size:10px;color:#85988c;letter-spacing:.04em;margin:0 1px 10px}.binder-heading .page-mark{font-family:Hand,sans-serif;font-size:15px;color:#839d9d}.pockets{display:grid;grid-template-columns:1fr 1fr;gap:11px 10px;min-height:326px}.pocket{display:flex;flex-direction:column;align-items:center;justify-content:flex-start;min-width:0;background:linear-gradient(143deg,#ffffffbd,#e5eef03b);border:1px solid #d3e0e3;border-top-color:white;border-radius:10px;padding:9px 5px 7px;box-shadow:inset 0 1px 0 #fff,0 2px 0 #cfddd74a;position:relative;isolation:isolate;min-height:157px}.pocket:after{content:'';position:absolute;inset:0;border-radius:10px;pointer-events:none;background:linear-gradient(116deg,transparent 27%,#ffffff80 28%,#ffffff1a 38%,transparent 39%);z-index:2}.pocket img{height:125px;width:100%;object-fit:contain;filter:drop-shadow(0 4px 4px #34545f1c);border-radius:4px}.pocket.locked img{filter:saturate(.55) opacity(.76)}.pocket-name{display:block;font-size:11px;margin:7px 0 3px;line-height:1.2}.pocket-meta{display:flex;gap:7px;align-items:center;font-size:9px;color:#7e9197;line-height:1.3}.pocket-meta .rarity{font-size:8px;border:1px solid #d7d3b4;background:#fffdf3;color:#8e7b4e;border-radius:4px;padding:1px 4px}.pocket.ghost{border-style:dashed;background:#f1f5ee75;box-shadow:none;justify-content:center;color:#9aaca9;font-size:11px;min-height:157px}.pager{display:flex;align-items:center;justify-content:center;gap:21px;margin-top:7px;min-height:43px}.pager button{min-width:44px;min-height:40px;border:0;border-radius:10px;background:#eff4f2;color:#5c7f87;font-size:18px}.pager output{min-width:70px;text-align:center;font-size:11px;color:#758e94;font-variant-numeric:tabular-nums}.page-hint{font-size:10px;color:#8aa0a9;text-align:center;padding:5px 0 0;line-height:1.4}.panel-content{animation:page-in .2s var(--ease) both}@keyframes page-in{from{opacity:.4;transform:translateX(7px)}to{opacity:1;transform:translateX(0)}}
.viewer{border:1px solid white;background:radial-gradient(ellipse at 50% 38%,#ffffffc9,#f1f8f88f 68%);border-radius:23px;padding:17px 17px 10px;touch-action:pan-y;overflow:hidden;min-height:410px}.viewer-label{font-size:11px;color:#77929c;text-align:center}.card-stage{height:282px;position:relative;display:flex;align-items:center;justify-content:center;margin-top:5px}.big-card{position:relative;width:171px;padding:7px 7px 10px;background:#fffdf8;border:1px solid #e0dfd4;box-shadow:0 12px 23px #3a667b20;border-radius:6px;z-index:2;transform:rotate(-3deg)}.big-card img{height:240px;width:100%;object-fit:contain;background:#e9f0ee}.peek{position:absolute;top:35px;width:138px;height:205px;object-fit:contain;border:5px solid #fffef8;border-radius:5px;box-shadow:0 6px 18px #486d7d15;opacity:.6}.peek.previous{left:7px;transform:rotate(-13deg)}.peek.next{right:7px;transform:rotate(13deg)}.viewer-info{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:7px}.viewer-info strong{display:block;font-size:14px;font-weight:400}.viewer-info small{font-size:10px;color:#7c929b}.btn{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:9px 14px;border:1px solid #bdd0d9;border-radius:11px;background:#fffdf7;font-size:12px}.btn.primary{background:var(--sea);border-color:var(--sea);color:white}.viewer .pager{margin-top:8px}.history{border-radius:20px;background:#fffdf7;border:1px solid white;padding:20px;min-height:350px}.history h2{font:25px Hand,sans-serif;margin-bottom:6px}.history>p{font-size:11px;color:#81949a;margin-bottom:17px}.history-entry{width:100%;display:flex;align-items:center;gap:13px;text-align:left;border:0;border-top:1px solid #e0e7dc;background:transparent;padding:12px 0;color:inherit;min-height:67px}.history-entry img{width:34px;height:47px;object-fit:contain;border:2px solid white;border-radius:3px}.history-entry>span{flex:1;font-size:13px}.history-entry small{display:block;font-size:10px;color:#8a9b98;margin-top:4px}.history-entry .rarity{flex:0 0 auto;font-size:10px;color:#8a7a55}
.bottom{display:flex;justify-content:space-around;align-items:center;gap:10px;margin-top:auto;padding-top:14px;border-top:1px solid #c2d8e0;font-size:11px;color:#72909d;min-height:48px}.bottom a{display:flex;align-items:center;min-height:36px;padding:0 9px}.bottom .current{color:#426f83}.preview-note{font-size:9px;color:#93a5ad;text-align:center;line-height:1.4}.empty{grid-column:1/-1;min-height:326px;display:grid;place-content:center;text-align:center;gap:13px;color:#718d98;font-size:13px;padding:20px}.empty button{justify-self:center}.viewer>.empty{min-height:345px}
dialog{color:#31566a;border:1px solid white;border-radius:24px 24px 0 0;background:#f7fbfb;padding:0;margin:auto auto 0;width:min(100%,440px);max-height:88dvh;box-shadow:0 -12px 60px #30536730;overflow:auto}dialog::backdrop{background:#294a5c70;backdrop-filter:blur(3px)}.sheet-header{display:flex;align-items:center;justify-content:space-between;padding:15px 20px 8px;gap:15px}.sheet-header h2{font:26px Hand,sans-serif}.sheet-close{width:44px;height:44px;background:#e9f1f4;border:0;border-radius:50%;font-size:21px;color:#6e8b98}.sheet-:host{padding:3px 20px 20px}label.field{display:grid;gap:9px;font-size:13px;margin:10px 0 20px}input[type=search]{font:16px Round,sans-serif;width:100%;height:46px;border:1px solid #bed2db;border-radius:12px;padding:9px 12px;background:#fff}fieldset{border:0;padding:0;margin:0 0 20px;min-width:0}legend{font-size:13px;margin-bottom:10px}.choices{display:flex;gap:8px;flex-wrap:wrap}.choices label{position:relative;flex:1;min-width:60px}.choices input{position:absolute;opacity:0;width:1px;height:1px}.choices span{display:flex;align-items:center;justify-content:center;border:1px solid #bed2db;border-radius:12px;min-height:44px;font-size:12px;background:#fff}.choices input:checked+span{background:#4e7d8f;color:white;border-color:#4e7d8f}.choices input:focus-visible+span{outline:3px solid #507f94;outline-offset:3px}.choices.rarity-options{display:grid;grid-template-columns:repeat(3,1fr)}.sheet-actions{display:flex;gap:9px}.sheet-actions button{flex:1}.detail-art{height:min(43dvh,340px);width:100%;object-fit:contain;margin-bottom:14px}.detail-meta{display:flex;justify-content:space-between;gap:12px;font-size:12px;color:#678592}.detail-story{margin:14px 0;font-size:13px;line-height:1.9;color:#6a8490}.detail-foot{font-size:10px;color:#94a4a9}
@media(max-height:740px){.phone{padding-top:6px;gap:6px}.topbar{min-height:34px}.brand{font-size:14px}.brand img{width:23px;height:23px}.intro{padding:1px 2px}.intro h1{font-size:25px}.intro p{font-size:10px;margin-top:3px}.intro-stats strong{font-size:20px}.tabs{padding:3px}.tabs button{min-height:36px}.toolbar{min-height:28px}.filter-button{min-height:36px}.binder{padding:9px 12px 3px 17px}.binder-heading{min-height:18px;margin-bottom:6px}.pockets{min-height:278px;gap:8px}.pocket{min-height:132px;padding:6px 4px}.pocket img{height:104px}.pocket-name{margin-top:5px;font-size:10px}.pocket-meta{font-size:8px}.pocket.ghost{min-height:132px}.pager{margin-top:4px;min-height:40px}.pager button{min-height:36px}.bottom{padding-top:7px;min-height:40px}.page-hint{font-size:9px;padding-top:3px}.preview-note{font-size:8px}.viewer{min-height:350px;padding:12px 15px 7px}.card-stage{height:235px}.big-card{width:145px}.big-card img{height:199px}.peek{height:177px;width:118px;top:28px}.viewer-info{margin-top:2px}}
@media(max-width:340px){.phone{padding-left:12px;padding-right:12px}.intro h1{font-size:25px}.intro p{font-size:10px}.intro-stats strong{font-size:20px}.pocket-name{font-size:10px}.pocket-meta{gap:4px}.viewer-info .btn{padding:8px 10px}.peek.previous{left:0}.peek.next{right:0}}
@media(prefers-reduced-motion:reduce){.panel-content{animation:none}}

.phone{padding:0;gap:8px}.pockets{min-height:278px}.pocket img{height:104px}.pocket{min-height:132px}.binder{padding-top:9px}.intro h1{font-size:25px}.phone .bottom{margin-top:0} .phone .pocket-name{overflow-wrap:anywhere} .detail-story{white-space:pre-wrap} .sheet-close,.pager button,.tabs button{min-height:44px} :host{display:block;background:transparent} @media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}`;
  const template = `
<main class="phone">
 
 <section class="intro" aria-labelledby="page-title"><div><h1 id="page-title">回忆收藏室</h1><p>一张一张，收好每次相遇。</p></div><div class="intro-stats"><strong>…</strong><small>我的珍藏</small><div class="tiny-progress" aria-hidden="true"><span></span></div></div></section>
 <nav class="tabs" role="tablist" aria-label="收藏浏览方式"><button type="button" role="tab" id="tab-album" data-tab="album" aria-selected="true" aria-controls="panel-album">口袋卡册</button><button type="button" role="tab" id="tab-viewer" data-tab="viewer" aria-selected="false" aria-controls="panel-viewer" tabindex="-1">慢慢欣赏</button><button type="button" role="tab" id="tab-history" data-tab="history" aria-selected="false" aria-controls="panel-history" tabindex="-1">相遇记录</button></nav>
 <div class="toolbar"><p id="filter-summary" role="status" aria-live="polite">正在读取收藏…</p><button type="button" class="filter-button" id="open-filters" aria-haspopup="dialog">筛选 <span id="filter-count">0</span> ⌄</button></div>
 <section id="panel-album" class="panel" role="tabpanel" aria-labelledby="tab-album"><div class="binder" id="binder" aria-label="左右滑动翻阅卡册"><div class="binder-heading"><span>我的海岛回忆</span><span class="page-mark">慢慢翻，也慢慢收藏</span></div><div id="pockets" class="pockets panel-content"></div><div class="pager"><button type="button" id="page-prev" aria-label="上一页">‹</button><output id="page-number" aria-live="polite"></output><button type="button" id="page-next" aria-label="下一页">›</button></div></div><p class="page-hint">左右轻滑翻页 · 点开卡片读故事</p></section>
 <section id="panel-viewer" class="panel" role="tabpanel" aria-labelledby="tab-viewer" hidden><div class="viewer" id="viewer"><p class="viewer-label">让一段回忆，多停留片刻</p><div id="viewer-content"></div><div class="pager"><button type="button" id="card-prev" aria-label="上一张">‹</button><output id="card-number" aria-live="polite"></output><button type="button" id="card-next" aria-label="下一张">›</button></div></div><p class="page-hint">左右轻滑切换 · 故事在卡片背后</p></section>
 <section id="panel-history" class="panel" role="tabpanel" aria-labelledby="tab-history" hidden><div class="history"><h2>每一次相遇，都有迹可循</h2><p>这里保存你的开信足迹。</p><div id="history-list"></div></div><p class="page-hint">抽卡与融卡记录，来自你的岛民账户</p></section>
 
 
</main>
<dialog id="filters" aria-labelledby="filter-title"><div class="sheet-header"><h2 id="filter-title">找到想看的回忆</h2><button type="button" class="sheet-close" data-close="filters" aria-label="关闭筛选">×</button></div><form id="filter-form" class="sheet-body"><label class="field">卡名<input type="search" name="search" placeholder="输入卡名或编号" autocomplete="off"></label><fieldset><legend>相遇状态</legend><div class="choices"><label><input type="radio" name="ownership" value="all" checked><span>全部</span></label><label><input type="radio" name="ownership" value="owned"><span>已珍藏</span></label><label><input type="radio" name="ownership" value="missing"><span>待相遇</span></label></div></fieldset><fieldset><legend>稀有度</legend><div class="choices rarity-options"><label><input type="radio" name="rarity" value="all" checked><span>全部等级</span></label><label><input type="radio" name="rarity" value="UR"><span>UR</span></label><label><input type="radio" name="rarity" value="SSR"><span>SSR</span></label><label><input type="radio" name="rarity" value="SR"><span>SR</span></label><label><input type="radio" name="rarity" value="R"><span>R</span></label><label><input type="radio" name="rarity" value="N"><span>N</span></label></div></fieldset><div class="sheet-actions"><button type="button" class="btn" id="reset-filters">重置</button><button type="submit" class="btn primary" id="apply-filters">查看回忆</button></div></form></dialog>
<dialog id="detail" aria-labelledby="detail-title"><div class="sheet-header"><h2 id="detail-title"></h2><button type="button" class="sheet-close" data-close="detail" aria-label="关闭故事">×</button></div><div class="sheet-body"><img id="detail-art" class="detail-art" alt=""><div class="detail-meta"><span id="detail-rarity"></span><span id="detail-owned"></span></div><p class="detail-story">把这一刻收进卡册，海风会替你记住。<br>愿每次翻开，都能遇见一点小小的欢喜。</p><p class="detail-foot"></p></div></dialog>
`;

  function mount(host, data, saved = null) {
    const root = host.attachShadow({ mode: "open" });
    root.innerHTML = "<style>" + sheet + "</style>" + template;
    const cards = data.cards;
    const $ = (id) => root.getElementById(id),
      make = (tag, cls, text) => {
        const node = document.createElement(tag);
        if (cls) node.className = cls;
        if (text !== undefined) node.textContent = text;
        return node;
      };
    let active = "album",
      page = 0,
      index = 0,
      filters = { ownership: "all", rarity: "all", search: "" },
      detailTrigger = null;
    const filtered = (values) =>
      cards.filter(
        (card) =>
          (values.ownership === "all" ||
            (values.ownership === "owned"
              ? card.quantity > 0
              : !card.quantity)) &&
          (values.rarity === "all" || values.rarity === card.rarity) &&
          (card.name + " " + (card.characters || ""))
            .toLowerCase()
            .includes(values.search.toLowerCase().trim()),
      );
    function showDetail(card, trigger) {
      detailTrigger = trigger;
      $("detail-title").textContent = card.name;
      $("detail-art").src = card.image;
      $("detail-art").alt = card.name;
      $("detail-rarity").textContent = card.rarity + " · 不吱岛";
      $("detail-owned").textContent = card.quantity
        ? "已珍藏 " + card.quantity + " 张"
        : "还在等待与你相遇";
      root.querySelector(".detail-story").textContent =
        card.story || "这段回忆的故事正在整理中。";
      $("detail").showModal();
    }
    function empty(container) {
      const node = make("div", "empty");
      node.append(make("p", "", "这次还没找到想看的回忆。"));
      const clear = make("button", "btn", "清空筛选，再看看");
      clear.type = "button";
      clear.onclick = () => {
        filters = { ownership: "all", rarity: "all", search: "" };
        page = index = 0;
        render();
      };
      node.append(clear);
      container.append(node);
    }
    function render() {
      const list = filtered(filters),
        pages = Math.ceil(list.length / 4);
      page = Math.max(0, Math.min(page, Math.max(0, pages - 1)));
      index = Math.max(0, Math.min(index, Math.max(0, list.length - 1)));
      const amount =
        (filters.ownership !== "all") +
        (filters.rarity !== "all") +
        !!filters.search.trim();
      $("filter-count").textContent = amount;
      $("filter-summary").textContent =
        (filters.ownership === "owned"
          ? "已珍藏"
          : filters.ownership === "missing"
            ? "待相遇"
            : "全部回忆") +
        " · " +
        list.length +
        " 张回忆" +
        (filters.rarity === "all" ? "" : " · " + filters.rarity);
      const pockets = $("pockets");
      pockets.replaceChildren();
      if (!list.length) empty(pockets);
      else {
        for (const card of list.slice(page * 4, page * 4 + 4)) {
          const button = make(
            "button",
            "pocket" + (card.quantity ? "" : " locked"),
          );
          button.type = "button";
          button.dataset.card = card.id;
          button.setAttribute(
            "aria-label",
            card.name +
              "，" +
              card.rarity +
              "，" +
              (card.quantity ? "已珍藏" + card.quantity + "张" : "待相遇"),
          );
          const image = make("img");
          image.src = card.image;
          image.onerror = () => {
            image.onerror = null;
            image.src = "assets/island.svg";
          };
          image.alt = card.name;
          image.width = 100;
          image.height = 140;
          image.draggable = false;
          const name = make("span", "pocket-name", card.name),
            meta = make("span", "pocket-meta");
          meta.append(
            make("span", "rarity", card.rarity),
            make(
              "span",
              "",
              card.quantity ? "珍藏 ×" + card.quantity : "待相遇",
            ),
          );
          button.append(image, name, meta);
          button.onclick = () => showDetail(card, button);
          pockets.append(button);
        }
        while (pockets.children.length < 4) {
          const ghost = make("div", "pocket ghost", "这一页，留一点空白");
          ghost.setAttribute("aria-hidden", "true");
          pockets.append(ghost);
        }
      }
      $("page-number").textContent = pages
        ? page + 1 + " / " + pages + " 页"
        : "0 / 0 页";
      $("page-prev").disabled = !pages || page === 0;
      $("page-next").disabled = !pages || page === pages - 1;
      const viewer = $("viewer-content");
      viewer.replaceChildren();
      if (!list.length) empty(viewer);
      else {
        const card = list[index],
          stage = make("div", "card-stage");
        if (list.length > 1) {
          for (const [offset, cls] of [
            [-1, "previous"],
            [1, "next"],
          ]) {
            const peek = make("img", "peek " + cls);
            peek.src = list[(index + offset + list.length) % list.length].image;
            peek.alt = "";
            peek.draggable = false;
            stage.append(peek);
          }
        }
        const button = make("button", "big-card");
        button.type = "button";
        button.setAttribute("aria-label", "查看 " + card.name + " 的故事");
        const image = make("img");
        image.src = card.image;
        image.onerror = () => {
          image.onerror = null;
          image.src = "assets/island.svg";
        };
        image.alt = card.name;
        image.draggable = false;
        button.append(image);
        button.onclick = () => showDetail(card, button);
        stage.append(button);
        const info = make("div", "viewer-info"),
          copy = make("div");
        copy.append(
          make("strong", "", card.name),
          make(
            "small",
            "",
            card.rarity +
              " · " +
              (card.quantity ? "珍藏 " + card.quantity + " 张" : "等待相遇"),
          ),
        );
        const story = make("button", "btn", "读读这段故事");
        story.type = "button";
        story.onclick = () => showDetail(card, story);
        info.append(copy, story);
        viewer.append(stage, info);
      }
      $("card-number").textContent = list.length
        ? index + 1 + " / " + list.length + " 张"
        : "0 / 0 张";
      $("card-prev").disabled = list.length < 2;
      $("card-next").disabled = list.length < 2;
    }
    function chooseTab(tab, focus = false) {
      active = tab;
      root.querySelectorAll("[data-tab]").forEach((button) => {
        const on = button.dataset.tab === tab;
        button.setAttribute("aria-selected", String(on));
        button.tabIndex = on ? 0 : -1;
        $("panel-" + button.dataset.tab).hidden = !on;
        if (on && focus) button.focus();
      });
      $("open-filters").hidden = tab === "history";
      $("filter-summary").textContent =
        tab === "history" ? "我的开信足迹" : $("filter-summary").textContent;
      if (tab !== "history") render();
    }
    const tabNames = ["album", "viewer", "history"];
    root.querySelectorAll("[data-tab]").forEach((button) => {
      button.onclick = () => chooseTab(button.dataset.tab);
      button.onkeydown = (event) => {
        const at = tabNames.indexOf(active);
        let target;
        if (event.key === "ArrowRight") target = tabNames[(at + 1) % 3];
        if (event.key === "ArrowLeft") target = tabNames[(at + 2) % 3];
        if (event.key === "Home") target = "album";
        if (event.key === "End") target = "history";
        if (target) {
          event.preventDefault();
          chooseTab(target, true);
        }
      };
    });
    function next(direction) {
      if (active === "album") {
        const max = Math.ceil(filtered(filters).length / 4) - 1;
        page = Math.max(0, Math.min(max, page + direction));
      } else if (active === "viewer") {
        const n = filtered(filters).length;
        if (n) index = (index + direction + n) % n;
      }
      render();
    }
    $("page-prev").onclick = () => next(-1);
    $("page-next").onclick = () => next(1);
    $("card-prev").onclick = () => next(-1);
    $("card-next").onclick = () => next(1);
    for (const root of [$("binder"), $("viewer")]) {
      let drag = null,
        suppress = false;
      root.addEventListener("pointerdown", (event) => {
        if (event.isPrimary && event.button === 0) {
          suppress = false;
          drag = { x: event.clientX, y: event.clientY, id: event.pointerId };
        }
      });
      root.addEventListener("pointermove", (event) => {
        if (!drag || event.pointerId !== drag.id) return;
        const dx = event.clientX - drag.x,
          dy = event.clientY - drag.y;
        if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.4) {
          root.setPointerCapture(event.pointerId);
          suppress = true;
        }
      });
      root.addEventListener("pointerup", (event) => {
        if (!drag) return;
        const dx = event.clientX - drag.x,
          dy = event.clientY - drag.y;
        drag = null;
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4)
          next(dx < 0 ? 1 : -1);
      });
      root.addEventListener("pointercancel", () => {
        drag = null;
        suppress = false;
      });
      root.addEventListener(
        "click",
        (event) => {
          if (suppress) {
            suppress = false;
            event.preventDefault();
            event.stopImmediatePropagation();
          }
        },
        true,
      );
    }
    const form = $("filter-form"),
      formValues = () => {
        const fields = new FormData(form);
        return {
          ownership: fields.get("ownership"),
          rarity: fields.get("rarity"),
          search: fields.get("search"),
        };
      };
    const previewFilters = () => {
      $("apply-filters").textContent =
        "查看 " + filtered(formValues()).length + " 张回忆";
    };
    $("open-filters").onclick = () => {
      form.elements.ownership.value = filters.ownership;
      form.elements.rarity.value = filters.rarity;
      form.elements.search.value = filters.search;
      previewFilters();
      $("filters").showModal();
    };
    form.oninput = previewFilters;
    $("reset-filters").onclick = () => {
      form.reset();
      previewFilters();
    };
    form.onsubmit = (event) => {
      event.preventDefault();
      filters = formValues();
      page = index = 0;
      render();
      $("filters").close();
    };
    root
      .querySelectorAll("[data-close]")
      .forEach(
        (button) => (button.onclick = () => $(button.dataset.close).close()),
      );
    $("detail").addEventListener("close", () => {
      if (detailTrigger?.isConnected)
        detailTrigger.focus({ preventScroll: true });
    });

    for (const entry of data.history) {
      const card = cards.find((c) => c.id === entry.cardId);
      if (!card) continue;
      const button = make("button", "history-entry");
      button.type = "button";
      const copy = make("span", "", card.name);
      copy.append(
        make(
          "small",
          "",
          new Date(entry.at).toLocaleString("zh-CN", {
            timeZone: "Asia/Shanghai",
          }) +
            " · " +
            (entry.fusion
              ? "海风融卡"
              : entry.first
                ? "第一次遇见"
                : "开信回忆"),
        ),
      );
      button.append(copy, make("span", "rarity", entry.rarity || card.rarity));
      button.onclick = () => showDetail(card, button);
      $("history-list").append(button);
    }
    if (!data.history.length)
      $("history-list").append(
        make("p", "", "还没有相遇记录，去邮局收一份期待吧。"),
      );
    const ready = data.catalogReady,
      profile = data.profileReady;
    const owned = cards.filter((c) => c.quantity > 0).length,
      total = cards.reduce((sum, c) => sum + c.quantity, 0);
    root.querySelector(".intro-stats strong").textContent =
      ready && profile ? owned + " 种 / " + total + " 张" : "…";
    root.querySelector(".intro-stats>small").textContent = !ready
      ? data.error
        ? "目录暂时不可用，请刷新重试"
        : "正在读取目录"
      : !profile
        ? data.signedIn
          ? "账户正在读取，请稍候或刷新重试"
          : "登录通行证后查看珍藏"
        : "已收藏 " + owned + " / " + cards.length + " 种";
    root.querySelector(".tiny-progress span").style.width =
      (ready && profile && cards.length ? (100 * owned) / cards.length : 0) +
      "%";
    render();
    if (!ready) {
      $("pockets").replaceChildren(
        make(
          "p",
          "empty",
          data.error ? "暂时无法读取卡片，请刷新重试。" : "正在读取回忆卡片…",
        ),
      );
      $("viewer-content").replaceChildren(
        make("p", "empty", "正在读取回忆卡片…"),
      );
    }
    if (saved) {
      filters = saved.filters;
      page = saved.page;
      index = saved.index;
      chooseTab(saved.active);
    }
    return { captureState: () => ({ filters, page, index, active }) };
  }

  window.BuzhiPocketView = Object.freeze({ mount });
})();
