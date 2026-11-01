# Unified admin operations implementation plan

> Approved detailed user specification is binding. Execute inline and in independently isolated money/quota worktrees using TDD; no production release this round.

Baseline: production11c9eee; repository5b38af5 contains that runtime plus release evidence. Branch codex/admin-unified-20261101. Prior production service is not modified.

- [x] Money: integer tenths conversions and per-row ledger aggregation without rewriting history; normalized numeric APIs and shared decimal display,131.4 grant/redeem/mail/mixed ledger/debit tests.
- [x] Fusion: additive per-user-day grants table, original authenticated admin endpoints, request-id idempotency, Beijing day3 base+extras, inventory transaction checks and state limits; test real extra fusions and rollover.
- [x] Unified frontend: reuse original operational DOM/components as compiled ES module inside v2, never iframe/eval/runtime page fetch, remove original login and navigation. All components use injected shared authenticated request function and volatile token getter; dispose clears controls and late responses on logout. Original/admin unchanged as fallback. Native v2 navigation groups every original screen, with real forms and original APIs.
- [x] Tests: static generated provenance/route completeness first failing; API contract coverage, local real browser one-login→multiple operations (including131.4 and quota) using synthetic temp DB only. Audit auth guard endpoints. No repeated31-suite.
- [x] Integrate cherry-picks, resolve only intended index edits, regenerate shared operations from final original components, review and rerun impacted tests. Document 1.0→v2→API→status→tests mapping. Commit and push dev branch, prepare revision manifest + migration/rollback notes. Do not deploy production.

Design decision: compile and scope proven 1.0 forms/handlers at development time, retain Work shell/CSS, injected single session. Reuse avoids duplicating business rules; runtime does not fetch old /admin or evaluate strings. Navigation remains native v2, old auth controls excluded. Static generated artifacts track source hashes and generation script so no hidden copy drift.

Owner root: admin/v2, generator, served routes, integration tests/docs. money: money-related backend/frontend formatting. quota:quota backend+tests only. Readonly production confirmation is permitted if required but no modification.

Execution evidence: docs/admin-fusion/UNIFIED-ACCEPTANCE-20261101.md. Final source commit and package manifest identify candidate; no production deployment authorized/performed this round.
