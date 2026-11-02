"""Convert numeric estimated depth to a bas-relief mesh height field in metres.
This is geometry processing, not image luminance displacement or painted shading.
"""
from pathlib import Path
import json
import numpy as np
from scipy.ndimage import gaussian_filter, zoom
ROOT=Path(__file__).resolve().parents[1]
depth=np.load(ROOT/'reference/sculpture-model/depth-raw.npy')
h,w=depth.shape
# Remove the background's inferred perspective using uncarved side strips.
y,x=np.mgrid[:h,:w]
wall=np.concatenate([depth[:,int(w*.055):int(w*.11)],depth[:,int(w*.89):int(w*.945)]],axis=1)
from scipy.ndimage import gaussian_filter1d
baseline=gaussian_filter1d(np.median(wall,axis=1),18)
d=depth-baseline[:,None]
# Mild symmetry removes directional estimation bias without changing the pose.
d=.75*d+.25*d[:,::-1]
d=np.maximum(d-.035,0)
# The estimator mistakes the shadow under the chin for a very thin neck.
# Join the jaw to the sternum with a bounded smooth interpolation, within the neck only.
y0,y1=int(h*.272),int(h*.405)
for row in range(y0,y1):
    t=(row-y0)/(y1-y0)
    neck_half=w*(.053+.025*t)
    across=np.clip(1-((np.arange(w)-w*.5)/neck_half)**2,0,1)**2
    along=np.sin(np.pi*t)**2
    joined=d[y0]*(1-t)+d[y1]*t
    d[row]+=np.maximum(joined-d[row],0)*across*along
scale=np.percentile(d,99.8)
d=np.clip(d/scale,0,1)
# Compress depth while retaining shoulder volume; no separate face/body primitives.
d=gaussian_filter(d,.7)**.72*.36
crop_width=round(h*4.1/4.4)
left=(w-crop_width)//2
d=d[:,left:left+crop_width]
rows,cols=553,515
d=zoom(d,((rows-1)/(d.shape[0]-1),(cols-1)/(d.shape[1]-1)),order=3,grid_mode=False)
# Resampling may differ by one sample; use explicit coordinates for exact grid dimensions.
from scipy.ndimage import map_coordinates
sy,sx=np.mgrid[0:d.shape[0]-1:complex(rows),0:d.shape[1]-1:complex(cols)]
d=map_coordinates(d,[sy,sx],order=1)
edge=np.minimum.reduce([np.broadcast_to(np.arange(cols),(rows,cols)),np.broadcast_to(np.arange(cols)[::-1],(rows,cols)),np.broadcast_to(np.arange(rows)[:,None],(rows,cols)),np.broadcast_to(np.arange(rows)[::-1,None],(rows,cols))])
fade=np.clip(edge/7,0,1);fade=fade*fade*(3-2*fade)
d=np.maximum(d,0)*fade
out=ROOT/'public/assets/jade-relief-v7.bin'
with out.open('wb') as f:
    f.write(np.array([cols,rows],dtype='<u4').tobytes())
    f.write(d.astype('<f4').tobytes())
meta={'source':'jade-relief-master.png','model':'depth-anything/Depth-Anything-V2-Small-hf','columns':cols,'rows':rows,'width_m':4.1,'height_m':4.4,'maximum_projection_m':round(float(d.max()),4),'backing_depth_m':.18,'method':'single continuous inferred depth surface; neutral jade material; no photographic color or luminance displacement','limitation':'Interpretive sculpture, not a measured scan or the original statue.'}
(ROOT/'reference/sculpture-model/geometry.json').write_text(json.dumps(meta,indent=2)+'\n')
print(json.dumps(meta))
