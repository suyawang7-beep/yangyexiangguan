# Original ocean-fantasy cards (arcana1; supersedes frame-only moon1)

After moon1, the user explicitly requested a western-fantasy redesign of **all reward-card fronts**, not only their borders, and approved an ocean/celestial archive direction. This version replaces the pastel front shell with an aged-paper surround, midnight arched illustration window, original celestial chart, separate nameplate and gemstone-like rarity label. N/R use restrained silver, SR lilac silver, SSR ocean/gold and UR old-gold; decorative density increases with rarity. Card names, characters, official-image mapping, quantities and draw rules are unchanged. The central preview motifs are still labelled illustrative, not newly produced official character art.

- `memory-card-celestial.svg` is an original transparent chart with an open center; no reference pixels, characters or game assets are copied.
- `card-mystery.css` now deliberately replaces the old front background and typography. The earlier moon1 restriction against changing the front's background tints is superseded by the user's approval. Official character images themselves are not recolored or regenerated.
- `memory-card-back.svg` retains the common moon/island seal with added fine compass ornaments. All pending draws still share this same design; it never encodes the unrevealed rarity.
- The frame/nameplate appears in postal previews, reveals, all 16 collection cards and enlarged details. Decorations do not intercept clicks. The souvenir PNG passport and general website glass surfaces are separate and unchanged.

The approved opening ceremony reuses the existing courier, meteor trails, reveal sweep and bounded Canvas star pool. `draw.css` / `effects.js` add a one-shot celestial orbit and flip: 30 meteors on desktop, 16 on small screens, 16 decorative star nodes (fewer visible on phones), a 3-second delivery plus a fading reveal. It follows already-saved results, never performs settlement, ends by itself and is hidden when effects are disabled or the page is hidden. Re-enabling effects does not replay the ritual. No new external animation library or continuous renderer is added.

The user subsequently requested a dark background specifically **during** drawing. A fixed, non-interactive night layer temporarily covers the ocean background while preserving visible cards, meteors, navigation and readable controls above it. The light theme returns when the finite reveal ends or effects are stopped; no other page becomes dark.

## Historical moon1 reference

The user confirmed the supplied dark-gold moon-and-paper-crane wish-tag image as the mood reference. These assets borrow only the general midnight/aged-metal palette, arched composition and celestial motifs. They are original SVG geometry, not cropped or traced game assets. No game logo, Valentine's Day wording, currency UI, character art or reference pixels are included.

- `memory-card-back.svg`: parchment-toned outside border, deep-sea indigo arch, crescent/compass, sparse stars and a small island-and-wave crest. One identical back is shown for every waiting draw, without rarity data. Buzhi text remains separate, readable HTML in `drawBack()`.
- `memory-card-frame.svg`: transparent double-line frame with small corner ornaments. Applied as a non-interactive overlay to the existing reward-card shell; it does not replace or recolor the character artwork, card name, rarity label, quantity or original card-background tints.
- `card-mystery.css`: scoped to `.memory-card` only. Does not darken the site, change public reward rules, add persistent animations, activate physical redemption or alter managed asset/API mapping.

The shared frame appears in the postal preview, revealed results, collection fan/grid and card-detail view. The existing bird carries the real card mount as before. The PNG souvenir passport is a separate component and is not redesigned by these assets.
