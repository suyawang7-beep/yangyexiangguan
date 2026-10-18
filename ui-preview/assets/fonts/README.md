# Rounded celebration font

`buzhi-rounded.woff2` is a web-format derivative of **ChillRoundF v3.0** by ChillType.

- Source: https://github.com/Warren2060/ChillRound
- Pinned source revision: `46dda1602729b58de96e3fdee9f918d7aaa64727`
- Source file: `ChillRoundF v3.0.ttf`
- License: SIL Open Font License 1.1; see `OFL.txt` alongside this file.
- Changes: WOFF2 packaging and internal family/name records renamed to **Buzhi Rounded**, respecting the upstream Reserved Font Names. Glyph outlines and character coverage are unchanged. This derivative is distributed under the same OFL, not sold independently, and is not endorsed by the upstream author.
- Reproduction: `python tools/build-round-font.py SOURCE_TTF ui-preview/assets/fonts/buzhi-rounded.woff2` with FontTools and Brotli support.

The font is served from this site, not a third-party font CDN. It uses `font-display: swap`; readable system sans-serif fallbacks remain available. The title/body pairing is the user-approved rounded, cute celebration direction. This does not replace official character artwork.

## Distinct heading subsets (sticker1)

Body text continues to use Buzhi Rounded. Two self-hosted, renamed OFL heading subsets provide different room personalities:

| Web family | Source file and pinned revision | License | Size |
| --- | --- | --- | --- |
| Buzhi Notice | `notofonts/noto-cjk`, `Sans/OTF/SimplifiedChinese/NotoSansCJKsc-Black.otf`, revision `f8d157532fbfaeda587e826d4cd5b21a49186f7c` | `noto-OFL.txt` | 28,912 bytes |
| Buzhi Hand | `lxgw/LxgwWenKai`, `fonts/TTF/LXGWWenKai-Regular.ttf`, revision `4becfb4d5cf0c92cfdb60a6e9b504bda43315325` | `wenkai-OFL.txt` | 21,804 bytes |

Sources: https://github.com/notofonts/noto-cjk and https://github.com/lxgw/LxgwWenKai . Original copyright and license records are retained; family/name records are renamed, outlines are unchanged, and glyph coverage is subsetted to `tools/heading-characters.txt`. The web derivatives remain OFL and are not sold independently or presented as endorsed by the original authors.

Source SHA-256:

- Noto OTF: `2267c4a0312d267dff8c0d1609948f7d949a3da8be3e126f5e2690cb9cc883b4`
- WenKai TTF: `2d73eea94ad808999d90c0000c239a84a33b09d4bc6ab6c5b8bbf1eda8a7fc8b`

Reproduce with FontTools and Brotli 1.1.0:

```sh
python tools/build-heading-font.py SOURCE_NOTO_OTF ui-preview/assets/fonts/buzhi-notice.woff2 'Buzhi Notice'
python tools/build-heading-font.py SOURCE_WENKAI_TTF ui-preview/assets/fonts/buzhi-hand.woff2 'Buzhi Hand'
```

These scripts are build helpers, not runtime requirements. Add new title characters to the tracked list and regenerate when changing headings; unlisted glyphs fall back to the normal UI font. No external font requests are needed.
