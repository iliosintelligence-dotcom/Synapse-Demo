import os, sys
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')
PACK = os.path.join(HERE, 'pack')
os.makedirs(PACK, exist_ok=True)
names = sorted(f[:-4] for f in os.listdir(OUT) if f.endswith('.png'))

# one crop box for every state, so Zyn sits in the same place in all of them
x0 = y0 = 10**9; x1 = y1 = -1
for n in names:
    im = Image.open(os.path.join(OUT, n + '.png')).convert('RGBA')
    bb = im.getchannel('A').point(lambda v: 255 if v > 10 else 0).getbbox()
    if bb:
        x0 = min(x0, bb[0]); y0 = min(y0, bb[1]); x1 = max(x1, bb[2]); y1 = max(y1, bb[3])
W = Image.open(os.path.join(OUT, names[0] + '.png')).size[0]
side = int(max(x1 - x0, y1 - y0) * 1.04)
cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
box = (cx - side // 2, cy - side // 2, cx - side // 2 + side, cy - side // 2 + side)
box = (max(0, box[0]), max(0, box[1]), min(W, box[2]), min(W, box[3]))
print('crop box', box, 'of', W)

for n in names:
    im = Image.open(os.path.join(OUT, n + '.png')).convert('RGBA').crop(box)
    im = im.resize((560, 560), Image.LANCZOS)
    im.save(os.path.join(PACK, 'zyn-' + n + '.webp'), 'WEBP', quality=92, method=6)

# the hero, cropped by the same box scaled to its size
hp = os.path.join(HERE, 'hero', 'happy_hero.png')
if os.path.exists(hp):
    h = Image.open(hp).convert('RGBA'); k = h.size[0] / W
    hb = tuple(int(v * k) for v in box)
    h = h.crop(hb).resize((1100, 1100), Image.LANCZOS)
    h.save(os.path.join(PACK, 'zyn-hero.webp'), 'WEBP', quality=92, method=6)
tot = sum(os.path.getsize(os.path.join(PACK, f)) for f in os.listdir(PACK))
print(len(os.listdir(PACK)), 'files,', round(tot / 1e6, 2), 'MB')
