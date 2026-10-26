/* Event adapter for the formal pocket view. No presentation or business logic. */
(() => {
  "use strict";
  const media = matchMedia("(max-width: 680px)");
  let latest = null;
  let saved = null;
  let mounted = null;

  function mount(data) {
    if (!media.matches) return;
    const main = document.querySelector("#main");
    if (!main) return;
    const old = main.querySelector("buzhi-pocket");
    if (old && mounted) saved = mounted.captureState();
    old?.remove();
    const host = document.createElement("buzhi-pocket");
    main.prepend(host);
    mounted = window.BuzhiPocketView.mount(host, data, saved);
  }

  document.addEventListener("buzhi:collection-data", (event) => {
    latest = event.detail;
    mount(latest);
  });
  media.addEventListener("change", () => {
    if (media.matches && latest) mount(latest);
    else document.querySelector("buzhi-pocket")?.remove();
  });
})();
