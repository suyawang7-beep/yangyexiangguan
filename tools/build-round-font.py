"""Repackage the pinned OFL font with a distinct name for the web derivative.

Usage: python tools/build-round-font.py SOURCE_TTF OUTPUT_WOFF2
Requires fonttools[woff]. Not needed to run or deploy the website.
"""
import sys
from pathlib import Path
from fontTools.ttLib import TTFont

source, destination = map(Path, sys.argv[1:3])
font = TTFont(source)
names = {1: "Buzhi Rounded", 2: "Regular", 3: "BuzhiRounded-Regular-20261017",
         4: "Buzhi Rounded Regular", 6: "BuzhiRounded-Regular",
         16: "Buzhi Rounded", 17: "Regular"}
for record in font["name"].names:
    if record.nameID in names:
        record.string = names[record.nameID].encode(record.getEncoding())
font.flavor = "woff2"
destination.parent.mkdir(parents=True, exist_ok=True)
font.save(destination)
check = TTFont(destination)
cmap = check.getBestCmap()
sample = "不吱岛菜菜吱吱生日庆典通行证岛民事务所回忆收藏室肥啾邮局"
missing = sorted(set(sample) - {chr(code) for code in cmap})
if missing:
    raise ValueError("Missing required Chinese glyphs: " + "".join(missing))
print(f"Generated {destination.name}: {destination.stat().st_size} bytes, {len(cmap)} mapped characters; required island labels covered")
