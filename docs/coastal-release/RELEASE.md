# Paired coastal UI release — 2026-11-07

Branch: codex/paired-coastal-ui-20261107; baseline ea2d44e2e9eb61dda363feebb7dd5021c2b72366.

## Implemented
- Fusion: pearl/sea-blue empty architectural scene, live original card shelf/material slots/result, shallow curved console integrated with the stage. Responsive 1440/390 layouts.
- Weather: left-hand live weather globe/crescent observatory, right-hand live record desk, six weather states, measured orbit/response motion. Published custom scenes remain supported.
- Shared 1.0 font, blue/pearl colors, glass and reduced-motion/pause support.
- Existing server, inventory, fusion controller, weather questionnaire/report controller, official card renderer and navigation remain unchanged.

## Verification
- tests/paired-coastal-browser.cjs: PASS at 1440 and 390. Synthetic account/temp SQLite only. Actual fuse, lost-response retry without duplicate consumption, history, material card geometry, six moods, five answers, 720px report, pause/reduced motion, no page errors.
- tests/card-fusion.cjs: PASS (rarity exclusions, inventory, transaction, idempotency, immutable history).
- tests/weather-content.mjs: PASS (draft isolation, publication, conflict/audit rollback).
- tests/explore-navigation-browser.cjs: PASS at 1440/390 on port 28448, seven pages, keyboard/touch, active route and original bottom links. Initial stale port 28436 attempt refused connection; rerun on actual isolated service passed.
- Screenshots in this directory use synthetic inventories; missing production-uploaded illustrations in the isolated empty asset directory are placeholders, not replacement production art.

## Deployment/rollback contract
Verify baseline hashes, stage in independent DB/assets/service with production paths inaccessible. Stop production only after stage passes; SQLite backup API + assets/code/config backup (config remains server-only). Transfer archive off-host and restore/check DB/assets/code before switching immutable release link. No schema migration or business source changes. Compare full table fingerprints at startup; on failure restore code link/config and restart old code without replacing live user DB.

## Follow-up limitations
Scene wings/base are illustration layers; controls/cards/weather remain DOM. Further artistic changes require a new approved preview. Radio remains unavailable; original disabled navigation entry is retained.
