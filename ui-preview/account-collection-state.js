/* Account/catalog state. No DOM, storage, fetch, or business writes.
 * The browser adapter supplies the existing request and session identity.
 */
(() => {
  "use strict";

  function create({ cards, blank, getToken }) {
    let catalog = [];
    let totalSlots = 50;
    let catalogReady = false;
    let catalogFailed = false;
    let profile = null;
    let profileToken = "";
    let profileRevision = 0;
    let byId = new Map();
    let byPreviewId = new Map();

    function acceptCatalog(result) {
      catalog = result.cards;
      totalSlots = result.totalSlots;
      byId = new Map(catalog.map((card) => [card.id, card]));
      byPreviewId = new Map(catalog.map((card) => [card.previewId, card]));
      for (const item of catalog) {
        let card = cards.find((card) => card.id === item.previewId);
        if (!card) {
          card = {
            id: item.previewId,
            rarity: item.rarity,
            name: item.name,
            motif: "star",
            characters: item.characters || "不吱岛",
            story: item.story || "新的星海回忆，等待与你相遇。",
          };
          cards.push(card);
        }
        card.rarity = item.rarity;
        card.name = item.name;
        card.story = item.story ?? card.story;
        card.characters = item.characters ?? card.characters;
      }
      catalogReady = true;
    }

    function acceptProfile(value) {
      profile = value;
      profileToken = getToken();
      const state = blank();
      state.taskProgress = profile.taskProgress || null;
      state.passport = {
        id: profile.id,
        nickname: profile.nickname,
        avatar: 0,
      };
      state.balance = profile.coins;
      state.ledger = (profile.ledger || []).map((entry) => ({
        amount: entry.amount,
        label: entry.reason,
        at: Date.parse(entry.created_at),
      }));
      state.tasks = profile.tasks.map((task) =>
        task === "report"
          ? "arrival"
          : task.startsWith("letter:")
            ? "letter"
            : task.startsWith("quiz:")
              ? "quiz"
              : task,
      );
      state.quizRewarded = !!profile.quiz?.rewarded;
      state.bonuses = profile.bonuses;
      state.checkins = profile.checkins;
      state.demoIslander = true;
      for (const [index, item] of profile.draws.entries()) {
        const card = byId.get(item.card_id);
        if (!card) continue;
        const id = card.previewId;
        const entry = state.collection[id] || {
          quantity: 0,
          firstAt: Date.parse(item.created_at),
        };
        entry.quantity++;
        state.collection[id] = entry;
        state.history.push({
          id: "server-" + index,
          cardId: id,
          rarity: item.rarity,
          at: Date.parse(item.created_at),
          first: index === profile.draws.length - 1,
        });
      }
      if (profile.inventory) {
        for (const item of Object.values(state.collection)) item.quantity = 0;
        for (const [cardId, quantity] of Object.entries(profile.inventory)) {
          const card = byId.get(cardId);
          if (!card || quantity <= 0) continue;
          const key = card.previewId;
          const firstAt = state.collection[key]?.firstAt || Date.now();
          state.collection[key] = { quantity, firstAt };
        }
        for (const fusion of profile.fusions || []) {
          const card = byId.get(fusion.result);
          if (card)
            state.history.unshift({
              id: "fusion-" + fusion.at + "-" + fusion.result,
              cardId: card.previewId,
              rarity: fusion.rarity,
              at: Date.parse(fusion.at),
              fusion: true,
            });
        }
      }
      return state;
    }

    async function load(request, onUpdate, onError) {
      const tokenAtStart = getToken();
      const revisionAtStart = profileRevision;
      const isCurrent = () =>
        getToken() === tokenAtStart && profileRevision === revisionAtStart;
      const catalogTask = (async () => {
        try {
          acceptCatalog(await request("catalog"));
          onUpdate("catalog");
        } catch (error) {
          catalogFailed = true;
          onUpdate("catalog-error");
          onError(error);
        }
      })();
      const profileTask = tokenAtStart
        ? (async () => {
            try {
              const value = await request("me");
              if (isCurrent()) onUpdate("profile", value);
            } catch (error) {
              if (!isCurrent()) return;
              if (error.status === 401) {
                profile = null;
                onUpdate("expired");
              } else {
                onError(
                  new Error("暂时无法读取账户，登录状态已保留，请刷新重试。"),
                );
              }
            }
          })()
        : Promise.resolve();
      await Promise.allSettled([catalogTask, profileTask]);
    }

    function snapshot(state, imageUrl, live) {
      const visibleCards =
        !live || catalogReady
          ? cards.filter((card) => !live || byPreviewId.has(card.id))
          : [];
      return {
        catalogReady: !live || catalogReady,
        error: catalogFailed,
        profileReady: !live || !getToken() || !!profile,
        signedIn: !!getToken(),
        cards: visibleCards.map((card) => ({
          ...card,
          image: live
            ? imageUrl("cards/" + byPreviewId.get(card.id).id + ".webp")
            : "assets/island.svg",
          quantity: Number(state.collection[card.id]?.quantity) || 0,
        })),
        history: state.history,
      };
    }

    return Object.freeze({
      get catalog() {
        return catalog;
      },
      get totalSlots() {
        return totalSlots;
      },
      get catalogReady() {
        return catalogReady;
      },
      get catalogFailed() {
        return catalogFailed;
      },
      get profile() {
        return profile;
      },
      get profileCurrent() {
        return !!profile && !!getToken() && profileToken === getToken();
      },
      acceptProfile,
      load,
      snapshot,
      invalidateProfile() {
        profileRevision++;
      },
    });
  }

  window.BuzhiAccountCollection = Object.freeze({ create });
})();
