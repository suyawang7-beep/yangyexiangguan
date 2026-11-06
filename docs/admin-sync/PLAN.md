# Admin/frontend sync review plan — 2026-11-07

Baseline production 1deac8b; GitHub main freshly verified 59be3ef. Independent branch codex/admin-frontend-sync-review-20261107. Production read-only confirmed:60 cards,91 asset slots,10 expansion slots missing detailed help, long-term operations on, topic assets off. No deployments authorized by this review request.

Apply deslop: focused behavior-preserving simplification; systematic debugging: reproduce first. Repository huashu-design explicitly excludes backend production systems, so its prototype workflow is not used here. Installed deslop and existing repo architecture/generator conventions guide code changes.

Reproduced failures: weather preview has no current-scene presenter; 28 expansion descriptions omit fusion/new-card state; actual admin LOCK-60 batch returns 'unmatched' due duplicated50-card list.

Fix scope:
1. Encapsulate default/custom weather draft scene preview in weather service; route delegates; default PNG matches current frontend, custom drafts stay private.
2. Replace admin static asset-name catalog with real API names; fresh complete audit and batch matching; regenerate v2 from old source.
3. Derive expansion help from existing approved release catalogs, include fusion use, remove stale50/unreleased descriptions; mark unused old office background honestly.
4. Rename misleading office coins-task labels without touching rules.
5. Extract repeated four-module lifecycle/request guards, retain before/after auth-generation checks and existing error handling.

Verify new red-to-green unit/browser scenarios; original v2 component provenance/writes/readonly, weather publication/conflict/audit, feature access. Synthetic data only. Deliver report and commit; do not deploy.
