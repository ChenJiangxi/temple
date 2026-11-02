from pathlib import Path
import json, math
import ezdxf
from ezdxf import disassemble
from ezdxf.path import make_path
from PIL import Image,ImageDraw,ImageChops
root=Path(__file__).resolve().parents[1]
es=disassemble.recursive_decompose(ezdxf.readfile(root.parent/'temple-dwg-review/candidate-2/drawing.dxf').modelspace())
x0,y0,w,h=109.011,304.447,200,120
width,height=4096,2458
mask=Image.new('1',(width,height),0);paths=[]
for e in es:
 if e.dxftype() not in ['SPLINE','POLYLINE']:continue
 p=make_path(e)
 if not p.is_closed:continue
 pts=list(p.flattening(.006))
 if not pts or min(v.x for v in pts)<x0 or max(v.x for v in pts)>x0+w or min(v.y for v in pts)<y0 or max(v.y for v in pts)>y0+h:continue
 coords=[((v.x-x0)*width/w,(y0+h-v.y)*height/h) for v in pts]
 xa=max(0,math.floor(min(v[0] for v in coords))-1);ya=max(0,math.floor(min(v[1] for v in coords))-1)
 xb=min(width,math.ceil(max(v[0] for v in coords))+2);yb=min(height,math.ceil(max(v[1] for v in coords))+2)
 tile=Image.new('1',(xb-xa,yb-ya),0);ImageDraw.Draw(tile).polygon([(x-xa,y-ya) for x,y in coords],fill=1)
 mask.paste(ImageChops.logical_xor(mask.crop((xa,ya,xb,yb)),tile),(xa,ya))
 paths.append('M'+'L'.join(f'{x:.3f},{y:.3f}' for x,y in coords)+'Z')
# White blocks light; black glyph apertures transmit it. Match Three.js alpha map.
ImageChops.invert(mask.convert('L')).save(root/'public/assets/sutra-mask.png')
(root/'reference/cad/sutra-original.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}"><rect width="100%" height="100%" fill="white"/><path fill="black" fill-rule="evenodd" d="'+''.join(paths)+'"/></svg>')
(root/'reference/cad/sutra-extraction.json').write_text(json.dumps({'source':'candidate-2/drawing.dxf','closed_outlines':len(paths),'bounds':[x0,y0,w,h],'method':'original SPLINE/POLYLINE even-odd fill, duplicate HATCH excluded'},indent=2))
print('original closed glyph contours',len(paths))
