"""Original geometric installer identity. Rebuild with Pillow, no downloaded artwork."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
ROOT=Path(__file__).resolve().parents[1]/'src-tauri/icons'
S=4
BG='#101421';INK='#f4f4f8';MUTED='#a8afc1';ACCENT='#a78bfa'
def font(n,bold=False):return ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans'+('-Bold' if bold else '')+'.ttf',n*S)
def canvas(w,h):
 im=Image.new('RGB',(w*S,h*S),BG)
 return im,ImageDraw.Draw(im)
def text(d,xy,label,n,color=INK,bold=False):d.text(tuple(int(v*S)for v in xy),label,font=font(n,bold),fill=color)
def emblem(d,x,y,size):
 # Three receding vaults form a cave; an open doorway, rather than a borrowed character.
 for i,color in enumerate(['#504471','#79619f',ACCENT]):
  inset=i*size*.14
  box=[int(v*S)for v in (x+inset,y+inset,x+size-inset,y+size)]
  d.rounded_rectangle(box,radius=int((size/2-inset)*S),outline=color,width=max(1,int(size*.035*S)))
 d.rectangle([int(v*S)for v in (x,y+size*.7,x+size,y+size+2)],fill=BG)
 d.line([int(v*S)for v in (x+size*.1,y+size*.87,x+size*.9,y+size*.87)],fill=ACCENT,width=max(1,int(size*.035*S)))
im,d=canvas(164,314);emblem(d,22,30,58)
text(d,(20,112),'BatCaverna',18,bold=True);text(d,(21,139),'CLT',12,ACCENT,True)
d.line((21*S,179*S,143*S,179*S),fill='#333748',width=S)
text(d,(21,196),'Sua coleção.',10);text(d,(21,214),'Sua comunidade.',10)
text(d,(21,268),'PARA WINDOWS',8,MUTED,True)
im.resize((164,314),Image.Resampling.LANCZOS).save(ROOT/'installer-sidebar.bmp')
im,d=canvas(150,57);emblem(d,10,10,36);text(d,(56,11),'BatCaverna',11,bold=True);text(d,(57,30),'CLT · Windows',8,MUTED)
im.resize((150,57),Image.Resampling.LANCZOS).save(ROOT/'installer-header.bmp')
im,d=canvas(256,256);emblem(d,38,32,180);im=im.resize((256,256),Image.Resampling.LANCZOS)
im.save(ROOT/'icon.png');im.save(ROOT/'icon.ico',sizes=[(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)])
