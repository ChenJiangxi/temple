# 通高玉佛：连续浮雕几何

原来的佛像用几个独立椭圆鼓包建立大形，再贴带有固定明暗的雕像照片。鼻、嘴、眼睛、双手及衣褶并不对应实际网格，斜看出现脸部突出、身体平板的问题。

本次保留既有单尊坐佛图的构图，通过本地 Depth Anything V2 Small 推断连续深度，再展平背景、修正颈部连接并压缩为浮雕厚度，输出真实网格。浮雕与背面、侧边合为一个闭合物体；统一淡青玉材质不再使用雕像照片作为颜色贴图，也不从照片明暗直接做凹凸。

- 输入：`reference/sculpture-model/jade-relief-master.png`（2026-11-01 从 public 移出，网页不加载它），此前制作的解释性雕像素材，不是作者原佛像扫描。
- 生成数值深度：`scripts/infer-relief-depth.py`。
- 转换浮雕几何：`scripts/build-relief-geometry.py`。
- 网页只加载 `public/assets/jade-relief-v7.bin`，不用网络模型或推理服务。
- 文件格式：两个小端 uint32（列、行），随后为行优先的小端 float32 高度（米），从左上到右下。
- 宽 4.1 m、高 4.4 m，基座 .18 m，突出深度上限 .36 m。放置标高与通高关系沿用原版本。
- 不改屋面、楼板、柱位、接雨系统及太阳位置；雕塑起伏改变它自己的遮挡与接光。

模型为从单张图推断的浮雕，不是实测三维扫描，面相、衣纹与深度仍属于解释性补足。此法不恢复正面看不到的倒扣或背面细节。玉的反光采用实时近似，不是实测玉料光学参数。

依赖与来源：
- [模型官方说明、Apache 2.0 许可](https://huggingface.co/depth-anything/Depth-Anything-V2-Small-hf)
- [Depth Anything V2 官方仓库](https://github.com/DepthAnything/Depth-Anything-V2)
