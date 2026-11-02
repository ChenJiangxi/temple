from pathlib import Path
import ezdxf,json
from collections import Counter
from ezdxf import disassemble
root=Path(__file__).resolve().parents[1]
doc=ezdxf.readfile(root.parent/'temple-dwg-review/candidate-1/drawing.dxf')
regions={'roof':(-75500,-68500,30000,37000),'plan1':(-75200,-68800,19000,25800),'plan2':(-58800,-52400,19000,25800),'sectionA':(-75200,-68500,0,6500),'sectionB':(-66500,-60000,0,6500)}
rows={k:[] for k in regions}
for e in disassemble.recursive_decompose(doc.modelspace()):
 t=e.dxftype();points=[]
 if t=='LINE':points=[list(e.dxf.start)[:2],list(e.dxf.end)[:2]]
 elif t=='LWPOLYLINE':points=[list(p)[:2] for p in e.get_points()]
 elif t=='CIRCLE' and e.dxf.radius>100:points=[list(e.dxf.center)[:2]]
 if not points:continue
 for k,(xmin,xmax,ymin,ymax) in regions.items():
  if all(xmin<=p[0]<=xmax and ymin<=p[1]<=ymax for p in points):
   r={'type':t,'points':[[round(a,3),round(b,3)] for a,b in points]}
   if t=='CIRCLE':r['radius']=round(e.dxf.radius,3)
   rows[k].append(r)
for k,rs in rows.items():
 (root/'reference/cad'/f'{k}.json').write_text(json.dumps(rs))
 print(k,Counter(r['type'] for r in rs))
 if k in ['roof','plan2']:
  for r in rs:
   if r['type']=='CIRCLE' or (r['type']=='LINE' and abs(r['points'][1][0]-r['points'][0][0])>1000 and abs(r['points'][1][1]-r['points'][0][1])>200):print(r)
 if k=='sectionA':
  for r in rs:
   ps=r['points']
   if r['type']=='LINE' and max(abs(ps[1][0]-ps[0][0]),abs(ps[1][1]-ps[0][1]))>2000:print(r)
