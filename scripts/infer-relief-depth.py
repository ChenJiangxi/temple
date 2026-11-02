"""Estimate sculpture geometry from the existing reference; does not edit its pixels.
The network is used only offline. Browser receives a compact numeric height field.
"""
import os
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
os.environ['HF_HOME']=str(ROOT/'reference/sculpture-model/cache')
os.environ['HF_HUB_DISABLE_XET']='1'
import numpy as np
import torch
from PIL import Image
from transformers import AutoImageProcessor, AutoModelForDepthEstimation
model_id='depth-anything/Depth-Anything-V2-Small-hf'
processor=AutoImageProcessor.from_pretrained(model_id)
model=AutoModelForDepthEstimation.from_pretrained(model_id)
device='mps' if torch.backends.mps.is_available() else 'cpu'
model=model.to(device).eval()
source=Image.open(ROOT/'reference/sculpture-model/jade-relief-master.png').convert('RGB')
inputs=processor(images=source,return_tensors='pt',size={'height':1036,'width':1036}).to(device)
print('Inference',device,tuple(inputs['pixel_values'].shape),flush=True)
with torch.inference_mode():
    prediction=model(**inputs).predicted_depth.cpu()
    prediction=torch.nn.functional.interpolate(prediction.unsqueeze(1),size=source.size[::-1],mode='bicubic',align_corners=False)[0,0].numpy()
np.save(ROOT/'reference/sculpture-model/depth-raw.npy',prediction)
print('Saved numeric depth',prediction.shape,float(prediction.min()),float(prediction.max()),flush=True)
