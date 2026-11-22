"""Renders the hero panel once, offline: the portrait printed in screentone over the ink background (panel-tone.png)
and the same panel in full colour (panel-colour.png), which the lens reveals. Same maths as the old in-browser
version (lib/screentone.ts at the time): 45-degree dot grid, ink dots from luminance, red dots where the skin is warm.
Run from the repo root after changing me-hero.png or panel-bg.webp:  python3 tools/make-panel.py"""
import math
import os

import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = os.path.join(ROOT, 'src', 'assets')

W, H = 1040, 1387            # 3:4 panel at 2x of its largest size (520 CSS px)
CELL = 12.0                  # dot spacing in output pixels (about 5 CSS px on a typical 420 px panel)
SS = 2                       # supersampling, so the dots come out anti-aliased
PAPER = (243, 242, 238)
INK = (14, 14, 16)
RED = (224, 38, 47)


def cover(img, w, h):
    k = max(w / img.width, h / img.height)
    r = img.resize((round(img.width * k), round(img.height * k)), Image.LANCZOS)
    x, y = (r.width - w) // 2, (r.height - h) // 2
    return r.crop((x, y, x + w, y + h))


def place(img, w, h):
    """lib/portrait.ts placeInPanel: head in the top third, waist off the bottom edge"""
    ph = h * 1.184
    pw = ph * img.width / img.height
    return img.resize((round(pw), round(ph)), Image.LANCZOS), round((w - pw) / 2), round(h * 0.2796)


bg = cover(Image.open(os.path.join(A, 'panel-bg.webp')).convert('RGB'), W, H)
me, mx, my = place(Image.open(os.path.join(A, 'me-hero.png')).convert('RGBA'), W, H)

colour = bg.copy()
colour.paste(me, (mx, my), me)

fig = Image.new('RGB', (W, H), PAPER)
fig.paste(me, (mx, my), me)
px = np.asarray(fig).astype(np.float32)

dots = Image.new('RGB', (W * SS, H * SS), PAPER)
d = ImageDraw.Draw(dots)
ca = sa = math.cos(math.pi / 4)
cx, cy, reach = W / 2, H / 2, math.hypot(W, H) / 2 + CELL
ink, red = [], []
u = -reach
while u <= reach:
    v = -reach
    while v <= reach:
        x, y = cx + u * ca - v * sa, cy + u * sa + v * ca
        v += CELL
        if x < -CELL or y < -CELL or x > W + CELL or y > H + CELL:
            continue
        r_, g_, b_ = px[min(H - 1, max(0, int(y))), min(W - 1, max(0, int(x)))]
        lum = (0.299 * r_ + 0.587 * g_ + 0.114 * b_) / 255
        warm = (r_ - b_) / 255
        if warm > 0.3 and lum > 0.35:
            rr = CELL * 0.58 * math.sqrt(min(1, (warm - 0.3) / 0.5))
            if rr > 0.4:
                red.append((x, y, rr))
        lv = lum ** 0.6
        rad = 0 if lv > 0.93 else CELL * 0.72 * math.sqrt(1 - lv)
        if rad > 0.35:
            ink.append((x, y, rad))
    u += CELL
for group, col in ((red, RED), (ink, INK)):
    for x, y, r in group:
        d.ellipse(((x - r) * SS, (y - r) * SS, (x + r) * SS, (y + r) * SS), fill=col)
dots = dots.resize((W, H), Image.LANCZOS)

# only the portrait is printed; the background stays crisp ink
alpha = Image.new('L', (W, H), 0)
alpha.paste(me.getchannel('A'), (mx, my))
tone = bg.copy()
tone.paste(dots, (0, 0), alpha)

tone.save(os.path.join(A, 'panel-tone.png'))
colour.save(os.path.join(A, 'panel-colour.png'))
print('panel-tone.png and panel-colour.png written', W, H, len(ink), 'ink dots')
