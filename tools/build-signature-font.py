"""Build renamed, on-demand Unicode slices for handwritten passport names.

Usage: python tools/build-signature-font.py SOURCE_TTF
Requires FontTools and Brotli for builds only. Same pinned OFL source/license
as Buzhi Hand; no outlines are changed. Only the passport loads these slices.
"""
import hashlib
import sys
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont

source = Path(sys.argv[1])
expected = "2d73eea94ad808999d90c0000c239a84a33b09d4bc6ab6c5b8bbf1eda8a7fc8b"
if hashlib.sha256(source.read_bytes()).hexdigest() != expected:
    raise ValueError("Source must match the pinned LXGW WenKai SHA-256")
destination = Path(__file__).resolve().parents[1] / "ui-preview/assets/fonts/signature"
destination.mkdir(parents=True, exist_ok=True)
with TTFont(source) as font:
    cmap = font.getBestCmap()
groups = {}
for code in cmap:
    groups.setdefault(code // 1024 * 1024, []).append(code)
rules = ["/* Generated OFL WenKai slices: only the handwritten nickname requests these. */"]
total = 0
for start, codes in sorted(groups.items()):
    font = TTFont(source)
    options = subset.Options()
    options.name_IDs = ["*"]
    options.name_legacy = True
    options.name_languages = ["*"]
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=codes)
    subsetter.subset(font)
    names = {1: "Buzhi Signature", 2: "Regular", 3: f"BuzhiSignature-{start:04x}-20261018",
             4: "Buzhi Signature", 6: f"BuzhiSignature-{start:04x}",
             16: "Buzhi Signature", 17: "Regular"}
    for record in font["name"].names:
        if record.nameID in names:
            record.string = names[record.nameID].encode(record.getEncoding())
    font.flavor = "woff2"
    name = f"signature-{start:04x}.woff2"
    font.save(destination / name)
    total += (destination / name).stat().st_size
    rules.append("@font-face{font-family:'Buzhi Signature';font-style:normal;font-weight:400;"
                 f"src:url('signature/{name}') format('woff2');"
                 f"unicode-range:U+{start:X}-{start+1023:X};font-display:swap" + "}")
    font.close()
(destination.parent / "signature.css").write_text("\n".join(rules) + "\n")
print(f"Generated {len(groups)} Unicode slices, {len(cmap)} mapped characters, {total:,} bytes total; browsers fetch only slices needed by the nickname")
