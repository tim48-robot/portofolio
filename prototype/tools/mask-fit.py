import numpy as np
from PIL import Image, ImageFilter
from scipy.ndimage import map_coordinates
P='/home/justin/portofolio/prototype/'; O='/home/justin/portofolio/prototype/'
me=np.array(Image.open(P+'me.png').convert('RGBA')).astype(float)/255
mk=np.array(Image.open(P+'mask.png').convert('RGBA')).astype(float)
H,W=me.shape[:2]
# --- warp the mask: keep width, squash the part below the eyes so its chin meets his chin
EYE_Y, CHIN_Y, CX, WIDTH = 254, 418, 551, 318
s = WIDTH/598; top_h = .505*900*s; low_h = CHIN_Y-EYE_Y
top = EYE_Y-top_h
ys=np.arange(H); xs=np.arange(W)
X,Y=np.meshgrid(xs,ys)
v=np.where(Y<EYE_Y, (Y-top)/top_h*.505, .505+(Y-EYE_Y)/low_h*(.987-.505))   # mask chin tip ~ row 888/900
u=(X-CX)/WIDTH+.5
sx=u*597; sy=v*899
warp=np.stack([map_coordinates(mk[...,c],[sy,sx],order=1,cval=0) for c in range(4)],-1)/255
warp[(u<0)|(u>1)|(v<0)|(v>1)]=0
from scipy.ndimage import binary_erosion
sil=binary_erosion(me[...,3]>.5,iterations=4)
warp[...,3]*=sil
Image.fromarray((warp*255).astype(np.uint8)).save(O+'layer-mask.png')
# --- hair layer: everything that isn't skin, above the eyes
r,g,b,a=[me[...,i] for i in range(4)]; lum=.3*r+.59*g+.11*b
warm=(r-b)/(lum+.04)
skin=np.clip((warm-.15)/.15,0,1)*np.clip((lum-.1)/.08,0,1)
hair=(1-skin)*a
band=np.clip((236-Y)/14,0,1)                          # full above the brows
brow=np.clip((.14-lum)/.05,0,1)*np.clip((262-Y)/10,0,1) # only true black strands across brows and eyes
hair=hair*band
hair=np.array(Image.fromarray((hair*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(.6))).astype(float)/255
hl=me.copy(); hl[...,3]=hair
Image.fromarray((hl*255).astype(np.uint8)).save(O+'layer-hair.png')
# --- composite: photo, then mask (with a soft shadow from the hair), then hair
def over(dst,src):
  sa=src[...,3:4]; out=dst.copy(); out[...,:3]=src[...,:3]*sa+dst[...,:3]*(1-sa); out[...,3:4]=sa+dst[...,3:4]*(1-sa); return out
bg=np.zeros_like(me); bg[...,0]=.09; bg[...,1]=.06; bg[...,2]=.17; bg[...,3]=1
c=over(bg,me); c=over(c,warp)
sh=np.array(Image.fromarray((hair*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(5))).astype(float)/255
sh=np.roll(sh,6,0)*warp[...,3]*.55
c[...,:3]*=(1-sh[...,None]); c=over(c,hl)
img=Image.fromarray((c*255).astype(np.uint8)).crop((360,0,740,480))
before=Image.fromarray((over(bg,me)*255).astype(np.uint8)).crop((360,0,740,480))
old=over(bg,me); km=np.array(Image.open(P+'mask.png').resize((298,450))).astype(float)/255
pad=np.zeros_like(me); pad[25:475,400:698]=km; old=over(old,pad)
o3=Image.fromarray((old*255).astype(np.uint8)).crop((360,0,740,480))
sheet=Image.new('RGB',(380*3,480)); sheet.paste(before,(0,0)); sheet.paste(o3,(380,0)); sheet.paste(img,(760,0)); sheet.save('/tmp/claude-1000/-home-justin-portofolio/06cc1143-74a5-4610-8eb0-ad573d57511d/scratchpad/compare2.png')
