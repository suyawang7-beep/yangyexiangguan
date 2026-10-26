/* Layout-only preview: tabs never call an API or change account data. */
(() => {
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  function select(id, focus = false) {
    const target = tabs.find(tab => tab.getAttribute('aria-controls') === id);
    if (!target) return;
    for (const tab of tabs) {
      const active = tab === target;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      document.getElementById(tab.getAttribute('aria-controls')).hidden = !active;
    }
    if (focus) target.focus();
  }
  for (const [index, tab] of tabs.entries()) {
    tab.addEventListener('click', () => select(tab.getAttribute('aria-controls')));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      select(tabs[next].getAttribute('aria-controls'), true);
    });
  }
  document.querySelectorAll('[data-open-panel]').forEach(link => {
    link.addEventListener('click', () => {
      const id = link.dataset.openPanel;
      select(id);
      document.getElementById(id).focus({ preventScroll: true });
    });
  });
  function followHash() { select(location.hash.slice(1)); }
  window.addEventListener('hashchange', followHash);
  followHash();
})();
