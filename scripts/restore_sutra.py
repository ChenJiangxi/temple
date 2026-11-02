from pathlib import Path
from PIL import Image,ImageFont,ImageDraw
root=Path(__file__).resolve().parents[1]
text='观自在菩萨行深般若波罗蜜多时照见五蕴皆空度一切苦厄舍利子色不异空空不异色色即是空空即是色受想行识亦复如是舍利子是诸法空相不生不灭不垢不净不增不减是故空中无色无受想行识无眼耳鼻舌身意无色声香味触法无眼界乃至无意识界无无明亦无无明尽乃至无老死亦无老死尽无苦集灭道无智亦无得以无所得故菩提萨埵依般若波罗蜜多故心无罣碍无罣碍故无有恐怖远离颠倒梦想究竟涅槃三世诸佛依般若波罗蜜多故得阿耨多罗三藐三菩提故知般若波罗蜜多是大神咒是大明咒是无上咒是无上上咒能除一切苦真实不虚故说般若波罗蜜多咒即说咒曰揭谛揭谛波罗揭谛波罗僧揭谛菩提萨婆诃'
# Restore the photographed continuous vertical typesetting after CAD hatch conversion.
text=text.replace('无上上咒','无等等咒')
text=(text*2)[:400]
canvas=Image.new('L',(1920,1152),255);draw=ImageDraw.Draw(canvas)
font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Songti.ttc',49,index=0)
for col in range(20):
 for row in range(20):
  draw.text((1820-col*90,70+row*53),text[col*20+row],font=font,fill=0,anchor='mm',stroke_width=0)
canvas.save(root/'public/assets/sutra-mask.png')
(root/'reference/sutra-restored.txt').write_text(text)
print('Restored vertical sutra mask',canvas.size)
