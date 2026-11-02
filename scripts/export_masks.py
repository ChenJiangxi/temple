from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import ezdxf
from ezdxf.addons.drawing import RenderContext,Frontend
from ezdxf.addons.drawing.matplotlib import MatplotlibBackend
from ezdxf.addons.drawing.config import Configuration,BackgroundPolicy,ColorPolicy,TextPolicy,ImagePolicy
root=Path(__file__).resolve().parents[1]
doc=ezdxf.readfile(root.parent/'temple-dwg-review/candidate-2/drawing.dxf')
fig=plt.figure();ax=fig.add_axes((0,0,1,1))
config=Configuration(background_policy=BackgroundPolicy.WHITE,color_policy=ColorPolicy.BLACK,text_policy=TextPolicy.IGNORE,image_policy=ImagePolicy.MISSING,lineweight_scaling=1.0,min_lineweight=.13)
Frontend(RenderContext(doc),MatplotlibBackend(ax),config).draw_layout(doc.modelspace(),finalize=True)
fig.set_size_inches(12.8,7.68,forward=True)
ax.set_aspect('auto');ax.set_xlim(109.1,308.9);ax.set_ylim(304.55,424.34)
fig.savefig(root/'public/assets/sutra-mask.png',dpi=150,facecolor='white')
print('sutra mask written')
