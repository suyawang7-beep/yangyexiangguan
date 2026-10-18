"""Build small, renamed OFL heading fonts without changing their outlines.

Usage: python tools/build-heading-font.py SOURCE OUTPUT 'Buzhi Hand'
Requires fonttools and Brotli only when rebuilding, not at website runtime.
Source revisions, full licenses and SHA-256 values are in assets/fonts/README.md.
"""
import sys
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont

source, destination = map(Path, sys.argv[1:3])
family = sys.argv[3]
characters = Path(__file__).with_name("heading-characters.txt").read_text().strip()
font = TTFont(source)
missing = {c for c in characters if not c.isspace() and ord(c) not in font.getBestCmap()}
if missing:
    raise ValueError("Missing heading glyphs: " + "".join(sorted(missing)))
options = subset.Options()
options.name_IDs = ["*"]
options.name_legacy = True
options.name_languages = ["*"]
subsetter = subset.Subsetter(options=options)
subsetter.populate(text=characters)
subsetter.subset(font)
postscript = family.replace(" ", "")
names = {1: family, 2: "Regular", 3: postscript + "-20261018", 4: family,
         6: postscript, 16: family, 17: "Regular"}
for record in font["name"].names:
    if record.nameID in names:
        record.string = names[record.nameID].encode(record.getEncoding())
font.flavor = "woff2"
destination.parent.mkdir(parents=True, exist_ok=True)
font.save(destination)
print(f"{destination.name}: {destination.stat().st_size} bytes; {len(font.getBestCmap())} heading characters")
