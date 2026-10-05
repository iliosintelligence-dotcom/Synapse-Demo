import sys, os
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')
ids = sys.argv[1:] or sorted(f[:-4] for f in os.listdir(OUT) if f.endswith('.png'))
BG = (234, 241, 255)
tiles = []
for i in ids:
    im = Image.open(os.path.join(OUT, i + '.png')).convert('RGBA')
    bg = Image.new('RGBA', im.size, BG + (255,)); bg.alpha_composite(im); tiles.append(bg.convert('RGB'))
cols = min(len(tiles), 6)
rows = (len(tiles) + cols - 1) // cols
w, h = tiles[0].size
sheet = Image.new('RGB', (cols * w, rows * h), BG)
for n, t in enumerate(tiles):
    sheet.paste(t, ((n % cols) * w, (n // cols) * h))
if sheet.width > 1800:
    r = 1800 / sheet.width; sheet = sheet.resize((1800, int(sheet.height * r)), Image.LANCZOS)
sheet.save(os.path.join(HERE, 'preview.png'))
print('preview', sheet.size)
