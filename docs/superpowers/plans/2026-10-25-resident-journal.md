# Resident Journal Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline. Steps use checkbox tracking.

**Goal:** Implement approved B personal-center journal layout with real data and independent mobile hierarchy.

**Architecture:** Keep the existing native page, fonts, motion manager and mail decorator. Extract its inline client into resident.js, retain existing action IDs, add resident-journal.js as a read-only presentation adapter and journal-only scoped CSS. No backend/schema or dependency changes.

**Tech Stack:** HTML, CSS, native JavaScript, Playwright with disposable Node/SQLite server.

**Spec:** docs/design/2026-10-25-resident-journal.md

## Global Constraints

- Independent branch codex/resident-journal-20261025 based on 791f937; no production contact/deploy, no draw or reward rule changes.
- Preserve all existing functions and permissions; no invented read-state, avatar settings or first-certification event.
- Install requested development skills via official installer, not unreviewed npx commands; no runtime dependency.
- Run targeted tests only, per user's existing instruction against repeating full regression.

## Review Focus

- Long nicknames and narrow screens must not overflow or cover actions.
- Empty or failed catalog must not claim false collection progress.
- Latest claim balance must update identity summary without optimistic credit.
- Anonymous/unverified accounts cannot reveal private journal content.
- User names/card text must remain literal, including HTML-like input.

### Task 1: Read-only journal data and accessible layout

**Files:** ui-preview/resident.html, resident.js, resident-journal.css; tests/resident-journal.cjs.

**Interfaces:** Existing /api/me state and /api/catalog cards; existing resident, mail and inventory actions unchanged.

- [x] Add a disposable-server browser test: genuine membership, received coins/items, independent owned-card count, real date events, viewport layout and no writes during page load.
- [x] Run it and confirm failure because journal is absent.
- [x] Implement asymmetric welcome/identity, inbox/collection, items/journey and secondary controls; retain original IDs and motion hooks.
- [x] Verify real work saving, reward claim updates, item persistence, no horizontal overflow and reduced motion.

### Task 2: Verify, review and handoff

**Files:** tests/resident-production.cjs if intended UI action changes; .github/workflows/pencil-ui.yml; docs/design/2026-10-25-resident-journal-validation.md; evidence images.

- [x] Run resident-journal, resident-appearance, resident-production and mobile-experience focused checks.
- [x] Visually review desktop and mobile screenshots, including empty and error states; correct issues.
- [x] Record skill compatibility, actual results and remaining physical-phone acceptance; commit local branch and provide evidence, without production deployment.

## Execution ledger

- User's “可以，你做吧” approves the preceding recommended B scope and direct execution; no additional design approval loop.
- Ruling: use an independent branch in the current clean workspace, honoring the requested branch workflow without creating a new external worktree.
- Skills installed successfully: frontend-design, ui-ux-pro-max, animate, mobile-native, review-animations. UI UX Pro Max local Python search returns results. No npx installer executed.
- Ruling: keep the original client handlers and move existing nodes in a separate adapter rather than rewrite business flow. The adapter consumes sticky ready/balance state to support delayed script loading.
- Fixed and verified regressions: anonymous adapter guard; late-script startup event loss; mobile decorator load order for historical mail expansion.
- Read-only code review returned no other material issues. All five targeted test scripts pass; no full regression or production operation performed.
- GitHub main is 59be3ef; the 60-card branch remains draft PR #11. Keep this visual change based on 791f937 and review against that release branch, avoiding duplicate 60-card changes in the visual diff.
