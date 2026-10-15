import sys, glob, os
from PIL import Image, ImageDraw
files = sys.argv[2:]; out = sys.argv[1]
W = 560; cols = 3; tiles = []
for f in files:
    im = Image.open(f).convert('RGB'); r = W / im.width; im = im.resize((W, max(1, int(im.height * r))))
    if im.height > 520: im = im.crop((0, 0, W, 520))
    t = Image.new('RGB', (W, im.height + 22), 'white'); t.paste(im, (0, 22)); ImageDraw.Draw(t).text((4, 4), os.path.basename(f), fill='black'); tiles.append(t)
rows = [tiles[i:i+cols] for i in range(0, len(tiles), cols)]
H = sum(max(t.height for t in r) + 8 for r in rows)
sheet = Image.new('RGB', (cols * (W + 8), H), (128, 128, 128)); y = 0
for r in rows:
    x = 0
    for t in r: sheet.paste(t, (x, y)); x += W + 8
    y += max(t.height for t in r) + 8
sheet.save(out); print(out, sheet.size)
