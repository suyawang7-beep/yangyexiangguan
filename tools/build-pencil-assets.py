#!/usr/bin/env python3
"""Original birthday ephemera using pencil-case 9bb75d1 (PolyForm NC).

The three postcard subjects are grounded in the approved island:
the harbour lighthouse welcomes visitors, the letter is the birthday invitation,
and the shell is a keepsake from the new beach. No example composition is traced.
Run: python3 tools/build-pencil-assets.py (Pillow, numpy and ffmpeg required).
"""
import math
import random
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools/pencil-case"))
import penwash_lib as P
import crayon_lib as C

OUT = ROOT / "ui-preview/assets/pencil"
INK = (68, 100, 116)
BLUE = (149, 188, 200)
SAND = (218, 195, 153)
ROSE = (207, 164, 171)
MINT = (163, 187, 169)


def canvas(w=256, h=256, paper=False):
    random.seed(1020)
    np.random.seed(1020)
    P.set_size(w, h)
    C.set_size(w, h)
    return P.paper(w, h, color=(248, 247, 239), grain=0, fibers=0) if paper else Image.new("RGBA", (w, h))


def line(img, pts, soft=False, **kw):
    args = dict(ink=INK, width=(1.2, 2.3), alpha=(155, 220), wobble=.8,
                gaps=.025, overdraw=1, smooth=False, nib=True, jitter=.2)
    if soft:
        args.update(width=(.6, 1.2), alpha=(90, 155), overdraw=0, gaps=.06)
    args.update(kw)
    return P.pen_path(img, pts, **args)


def wash(img, pts, color, alpha=(45, 80)):
    return P.wash(img, pts, color, alpha=alpha, offset=(2, 1), feather=1.8,
                  layers=2, edge=.35, texture=.15)


def ellipse(cx, cy, rx, ry):
    return P.ellipse_pts(cx, cy, rx, ry, n=32, rough=.035)


def shell(img, cx, cy, k=1):
    def xy(x, y):
        return cx+x*k, cy+y*k
    contour=[xy(x,y) for x,y in [(-20,59),(-69,15),(-72,-5),(-62,-27),(-43,-43),(-20,-49),(0,-39),(21,-49),(45,-41),(64,-23),(72,-2),(68,20),(21,59),(-20,59)]]
    img=wash(img,contour,SAND,(55,95))
    img=line(img,contour,smooth=True)
    for x,y in [(-61,-18),(-42,-39),(-20,-45),(0,-36),(22,-43),(45,-35),(62,-15)]:
        img=line(img,[xy(x,y),xy(x*.65,12),xy(x*.15,48)],soft=True,smooth=True)
    return line(img,[xy(-20,59),xy(-15,68),xy(18,67),xy(21,59)])


def letter(img, cx, cy, k=1):
    def xy(x,y):
        return cx+x*k,cy+y*k
    corners=[xy(-76,-43),xy(75,-48),xy(81,47),xy(-72,51),xy(-76,-43)]
    img=wash(img,corners,BLUE)
    img=line(img,corners)
    img=line(img,[xy(-75,-43),xy(1,8),xy(74,-46)])
    img=line(img,[xy(-71,50),xy(-20,1)],soft=True)
    img=line(img,[xy(80,46),xy(28,-3)],soft=True)
    seal=ellipse(*xy(4,12),13*k,12*k)
    img=wash(img,seal,ROSE,(70,105))
    return line(img,seal,soft=True)


def lighthouse(img,cx,cy,k=1):
    def xy(x,y):
        return cx+x*k,cy+y*k
    tower=[xy(-30,77),xy(-18,-56),xy(16,-57),xy(31,77),xy(-30,77)]
    img=wash(img,tower,(206,218,214),(45,70))
    stripe=[xy(-25,21),xy(24,20),xy(26,44),xy(-27,45)]
    img=wash(img,stripe,ROSE,(85,120))
    img=line(img,tower)
    roof=[xy(-29,-84),xy(0,-109),xy(30,-85),xy(-29,-84)]
    img=wash(img,roof,ROSE,(85,130))
    img=line(img,roof)
    lamp=[xy(-23,-83),xy(23,-83),xy(22,-59),xy(-23,-59),xy(-23,-83)]
    img=wash(img,lamp,SAND,(65,105))
    img=line(img,lamp)
    for x in [-11,10]:
        img=line(img,[xy(x,-80),xy(x,-61)],soft=True)
    img=line(img,[xy(-34,-57),xy(35,-57)])
    img=line(img,[xy(-9,77),xy(-8,52),xy(8,50),xy(10,77)],soft=True)
    for y in [-22,6]:
        img=line(img,[xy(-3,y),xy(-2,y-12),xy(4,y-12),xy(4,y)],soft=True)
    # Only a few broken shore lines: this is an object portrait, not a new map.
    for y,span in [(85,70),(97,58),(107,85)]:
        img=line(img,[xy(-span,y),xy(-span*.4,y+3),xy(span*.3,y),xy(span,y+2)],soft=True,smooth=True)
    return img


def bottle(img):
    contour=[(111,45),(111,79),(84,104),(78,191),(94,213),(166,211),(181,192),(172,106),(147,79),(145,45),(111,45)]
    img=wash(img,contour,BLUE,(40,65))
    img=line(img,contour,smooth=True)
    img=wash(img,[(106,36),(148,37),(149,56),(108,55)],SAND,(90,120))
    img=line(img,[(106,36),(148,37),(149,56),(108,55),(106,36)])
    img=letter(img,128,146,.36)
    img=line(img,[(90,183),(113,190),(154,185),(170,179)],soft=True,smooth=True)
    return img


def stamp(img):
    for rx in [105,96]:
        img=line(img,ellipse(128,128,rx,rx),width=(1,1.8),alpha=(110,180),overdraw=0)
    img=wash(img,[(68,151),(90,132),(118,140),(136,129),(183,151),(158,165),(91,166)],MINT,(45,70))
    img=line(img,[(65,153),(92,136),(112,141),(141,134),(185,152),(164,164),(91,165),(65,153)],soft=True,smooth=True)
    img=lighthouse(img,127,125,.37)
    return img


def crayon_party():
    img=canvas()
    for i,(cx,cy,color) in enumerate([(92,77,BLUE),(157,91,ROSE)]):
        pts=C.blob(cx,cy,30,40,k=20,rough=.065)
        img=C.mask_to_crayon(img,C.soft_mask(pts,feather=.8,grow=0),color,dot=(.5,1),density=.2,solid_alpha=.5)
        img=C.crayon_line(img,pts+[pts[0]],INK,width=(.65,1.1),alpha=(85,140),wobble=.5)
        img=C.crayon_line(img,[(cx,cy+40),(cx-7,cy+65),(cx+5,cy+88),(cx-5,212)],INK,width=(.65,1),alpha=(90,150),wobble=.8)
    star=[]
    for i in range(10):
        a=-math.pi/2+i*math.pi/5
        r=27 if i%2==0 else 12
        star.append((198+math.cos(a)*r,49+math.sin(a)*r))
    img=C.mask_to_crayon(img,C.soft_mask(star,feather=.7,grow=0),SAND,dot=(.5,.9),density=.18,solid_alpha=.7)
    return img


def main():
    OUT.mkdir(parents=True,exist_ok=True)
    for name,draw in [("shell",lambda i:shell(i,128,119)),("letter",lambda i:letter(i,128,127)),("bottle",bottle),("stamp",stamp)]:
        draw(canvas()).save(OUT/f"{name}.png",optimize=True)
    img=canvas(520,260)
    img=letter(img,220,125,.9)
    img=shell(img,365,159,.48)
    img.save(OUT/"empty-letter.png",optimize=True)
    crayon_party().save(OUT/"party.png",optimize=True)
    with tempfile.TemporaryDirectory(prefix="buzhi-pencil-record-") as scratch:
        raw=Path(scratch)/"drawing.mp4"
        img=canvas(640,360,paper=True)
        P.record_start(str(raw),fps=24,every=1,hold=16)
        P.record_hold(img,5)
        img=lighthouse(img,204,192,1.05)
        img=letter(img,427,246,.73)
        img=shell(img,492,116,.56)
        # Original island initial, not the example artist's signature.
        img=P.pen_text(img,"B.",(581,324),size=18,ink=INK,alpha=155)
        P.record_hold(img,12)
        frames,_=P.record_stop()
        img.save(OUT/"postcard.png",optimize=True)
        subprocess.run(["ffmpeg","-y","-loglevel","error","-i",str(raw),"-vf",f"setpts={3.2*24/frames}*PTS","-an","-r","24","-c:v","libx264","-pix_fmt","yuv420p","-crf","25","-movflags","+faststart",str(OUT/"postcard-drawing.mp4")],check=True)
    print("Built 7 original PNGs and a 3.2-second penwash drawing, no paper grain.")


if __name__=="__main__":
    main()
