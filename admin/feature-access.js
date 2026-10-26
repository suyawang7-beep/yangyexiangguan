/* Independent administrator-only availability forms. Uses the existing in-memory session. */
(() => {
  const labels = {
    active: "开放中",
    paused: "已暂停",
    upcoming: "尚未开始",
    ended: "本次开放已结束",
  };
  const local = (value) =>
    value
      ? new Intl.DateTimeFormat("sv-SE", {
          timeZone: "Asia/Shanghai",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
          .format(new Date(value))
          .replace(" ", "T")
      : "";
  const utc = (value) =>
    value
      ? new Date(
          value + (value.length === 16 ? ":00" : "") + "+08:00",
        ).toISOString()
      : null;
  for (const form of document.querySelectorAll("[data-feature-form]")) {
    const feature = form.dataset.featureForm,
      status = form.querySelector("[data-feature-status]");
    let revision = 0;
    function show(value) {
      form.elements.enabled.checked = value.enabled;
      form.elements.startsAt.value = local(value.startsAt);
      form.elements.endsAt.value = local(value.endsAt);
      status.textContent =
        labels[value.phase] +
        (value.source === "activity" ? " · 沿用活动时间" : " · 独立设置");
    }
    async function load() {
      const version = ++revision;
      try {
        const values = await req("feature-access");
        if (version === revision && !$("app").hidden) show(values[feature]);
      } catch (e) {
        if (version === revision && !$("app").hidden)
          status.textContent = e.message;
      }
    }
    form.onsubmit = async (event) => {
      event.preventDefault();
      const version = ++revision,
        button = form.querySelector("[type=submit]");
      button.disabled = true;
      try {
        const result = await req("feature-access", {
          feature,
          enabled: form.elements.enabled.checked,
          startsAt: utc(form.elements.startsAt.value),
          endsAt: utc(form.elements.endsAt.value),
        });
        if (version === revision && !$("app").hidden) show(result);
      } catch (e) {
        if (version === revision && !$("app").hidden)
          status.textContent = e.message;
      } finally {
        button.disabled = false;
      }
    };
    form.querySelector("[data-feature-reload]").onclick = load;
    document.addEventListener("admin-page", (event) => {
      if (event.detail === (feature === "pool" ? "cards" : "office")) load();
    });
  }
  for (const button of document.querySelectorAll("[data-admin-destination]"))
    button.onclick = () =>
      window.showAdminPage(button.dataset.adminDestination);
})();
