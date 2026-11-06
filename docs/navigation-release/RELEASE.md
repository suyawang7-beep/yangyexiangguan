# Unified navigation — 2026-11-07

Baseline: c60f1179925930aa971a52b6a075aa3e42a024fd. Branch codex/unified-navigation-20261107.

Fusion and weather now have the same complete route navigation: home, office, hall (islanders + collection), guide, mailbox, check-in, exploration and resident center. Desktop glass dropdowns; <=1050px uses accessible menu disclosure, exploration retains existing mobile sheet. Existing rules/account badge/motion controls are moved with handlers intact into Page settings, not recreated.

Shared legacy desktop navigation groups collection under hall. Direct fusion/weather duplicates are removed only where exploration supplies those links. Other routes, including the existing draw/post-office link and five bottom items, remain. Radio is still disabled.

PASS: unified-navigation-browser at 1440/1100/820/390 on both pages; collection grouping; seven-page explore navigation 1440/390, keyboard, current route, existing bottom links; paired coastal 1440/390 including actual synthetic fuse/lost-response retry and weather questionnaire/report. No business files, server or DB change.

An initial test incorrectly expected office.html to render the older app.js desktop navigation; the live long-term office uses its own header. Corrected test targets collection for that grouping, and existing seven-page navigation test still covers office. Escape propagation from nested exploration menu fixed and verified.

Release: isolated remote stage first, exact baseline/runtime hashes, fresh consistent production backup and offhost restore verification before switch. Old code/config retained. No DB migration or user mutations.
