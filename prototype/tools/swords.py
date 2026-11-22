# Cuts the two sword cursors out of their white backgrounds, points the tip to the top-left and saves small PNGs.
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
R = '/home/justin/portofolio/references/cursor/'; O = '/home/justin/portofolio/prototype/'

def unwhite(rgb):
    # "colour to alpha": the least alpha that explains each pixel as something laid over white
    a = (255 - rgb.min(-1)) / 255.0
    a = np.clip(a, 0, 1)
    fg = (rgb - (1 - a[..., None]) * 255) / np.maximum(a[..., None], 1e-3)
    return np.clip(fg, 0, 255), a

def interior(rgb, thr=238):
    # everything not connected to the border through near-white pixels
    white = rgb.min(-1) > thr
    lab, _ = ndi.label(white)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(border))
    return ~bg

def build(src, angle, out, solid):
    rgb = np.array(Image.open(R + src).convert('RGB')).astype(float)
    fg, a = unwhite(rgb)
    if solid is not None:
        core = solid(rgb)
        core = ndi.binary_erosion(core, iterations=2)
        soft = ndi.gaussian_filter(core.astype(float), 1.2)
        a = np.maximum(a, soft)
        fg = np.where(core[..., None], rgb, fg)
    im = Image.fromarray(np.dstack([fg, a * 255]).astype(np.uint8), 'RGBA')
    if angle: im = im.rotate(angle, resample=Image.BICUBIC, expand=True)
    im = im.crop(im.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox())
    im.save(out.replace('.png', '-full.png'))
    for size in (64, 96, 128):
        s = im.copy(); s.thumbnail((size, size), Image.LANCZOS); s.save(out.replace('.png', f'-{size}.png'))
    print(out, im.size)

# violet: already diagonal, tip top-left; the metal is light, so keep the inside solid
build('sword-violet-src.webp', 0, O + 'cursor-violet.png', lambda rgb: interior(rgb))
# red: horizontal with the tip on the left; turn it 45 degrees clockwise. Solid core = blade, hilt and grip only
def red_core(rgb):
    h, w = rgb.shape[:2]; Y, X = np.mgrid[:h, :w]
    band = (np.abs(Y - 443) < 22) & (X > 20) & (X < 1200)            # the blade
    hilt = (X > 1170) & (X < 1745) & (np.abs(Y - 443) < 100)
    return (band | hilt) & interior(rgb, 232)
build('sword-red-src.webp', -45, O + 'cursor-red.png', red_core)

# red, calm version: only the blade and hilt, plus a smooth red aura generated from their shape
# (the painted flame tendrils looked like legs at cursor size)
def red_calm():
    rgb = np.array(Image.open(R + 'sword-red-src.webp').convert('RGB')).astype(float)
    core = ndi.binary_erosion(red_core(rgb), iterations=2)
    PAD = 260                                                    # room for the aura to fade to nothing (no hard square edge)
    rgb = np.pad(rgb, ((PAD, PAD), (PAD, PAD), (0, 0)), constant_values=255); core = np.pad(core, PAD)
    core = ndi.binary_opening(core, iterations=2)
    ca = ndi.gaussian_filter(core.astype(float), 1.0)
    glow = ndi.gaussian_filter(core.astype(float), 55) * 4.5 + ndi.gaussian_filter(core.astype(float), 18) * 2.2
    ga = np.clip(glow, 0, 1) ** 1.3 * .8
    red = np.array([215, 38, 46], float)
    a = np.maximum(ca, ga * (1 - ca))
    col = (rgb * ca[..., None] + red * (ga * (1 - ca))[..., None]) / np.maximum(a[..., None], 1e-3)
    im = Image.fromarray(np.dstack([np.clip(col, 0, 255), a * 255]).astype(np.uint8), 'RGBA').rotate(-45, resample=Image.BICUBIC, expand=True)
    im = im.crop(im.getchannel('A').point(lambda v: 255 if v > 1 else 0).getbbox())
    out = O + 'cursor-red-calm.png'; im.save(out.replace('.png', '-full.png'))
    for size in (64, 96, 128):
        s = im.copy(); s.thumbnail((size, size), Image.LANCZOS); s.save(out.replace('.png', f'-{size}.png'))
    a2 = np.array(im)[..., 3]; h, w = a2.shape; ys, xs = np.nonzero(a2 > 140); i = np.argmin(xs + ys)
    print('red calm', im.size, 'tip', round(xs[i] / w, 3), round(ys[i] / h, 3))
red_calm()

# red v2 (user's tighter-flame version): flames and glow keyed off white, blade and silver hilt kept solid
def red_v2():
    rgb = np.array(Image.open(R + 'sword-red2-src.webp').convert('RGB')).astype(float)
    PAD = 40
    rgb = np.pad(rgb, ((PAD, PAD), (PAD, PAD), (0, 0)), constant_values=255)
    fg, a = unwhite(rgb)
    a = np.clip((a - .03) / .97, 0, 1)                           # near-white noise becomes fully transparent
    h, w = rgb.shape[:2]; Y, X = np.mgrid[:h, :w]
    lum = rgb.mean(-1); sat = rgb.max(-1) - rgb.min(-1)
    # solid core: dark blade, plus the hilt/grip area (silver parts are light and would otherwise turn see-through)
    core = interior(rgb, 236) & ((lum < 120) | ((X > 1150 + PAD) & (sat < 60)))
    core = ndi.binary_opening(ndi.binary_fill_holes(core) & interior(rgb, 236), iterations=1)
    soft = ndi.gaussian_filter(core.astype(float), 1.0)
    a = np.maximum(a, soft); fg = np.where(core[..., None], rgb, fg)
    im = Image.fromarray(np.dstack([fg, a * 255]).astype(np.uint8), 'RGBA').rotate(-45, resample=Image.BICUBIC, expand=True)
    bb = im.getchannel('A').point(lambda v: 255 if v > 14 else 0).getbbox()            # ignore faint compression noise
    im = im.crop((bb[0] - 20, bb[1] - 20, bb[2] + 20, bb[3] + 20))                     # a little room so nothing is cut
    out = O + 'cursor-red2.png'; im.save(out.replace('.png', '-full.png'))
    for size in (64, 96, 128):
        s = im.copy(); s.thumbnail((size, size), Image.LANCZOS); s.save(out.replace('.png', f'-{size}.png'))
    a2 = np.array(im)[..., 3]; hh, ww = a2.shape; ys, xs = np.nonzero(a2 > 140); i = np.argmin(xs + ys)
    print('red v2', im.size, 'tip', round(xs[i] / ww, 3), round(ys[i] / hh, 3))
red_v2()
