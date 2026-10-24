"""Rebuild the W07.2 composition from approved local W07 catalog derivatives (Pillow)."""
from pathlib import Path
from PIL import Image, ImageChops, ImageOps
import json

root=Path(__file__).resolve().parents[1]
assets=root/'upms.client/public/assets'
canvas=Image.new('RGB',(1200,900),'white')
for filename,box in [('catalog-w07-bucket-20l-front-960.webp',(20,100,660,760)),('catalog-w07-jerrycan-20l-960.webp',(690,190,1170,790))]:
    image=Image.open(assets/filename).convert('RGB')
    bounds=ImageChops.difference(image,Image.new('RGB',image.size,'white')).getbbox()
    image=image.crop(bounds)
    fitted=ImageOps.contain(image,(box[2]-box[0],box[3]-box[1]),Image.Resampling.LANCZOS)
    canvas.paste(fitted,(box[0]+(box[2]-box[0]-fitted.width)//2,box[3]-fitted.height))
variants=[]
for width in [320,640,1200]:
    filename=f'catalog-w072-capabilities-{width}.webp'
    image=canvas.resize((width,round(width*.75)),Image.Resampling.LANCZOS)
    image.save(assets/filename,'WEBP',quality=85,method=6)
    variants.append({'src':'/assets/'+filename,'width':width,'height':image.height,'bytes':(assets/filename).stat().st_size})
manifest={'id':'capabilities','alt':'Blue plastic bucket with lid beside a green jerrycan, from the Unique Plastic Industry catalog','width':1200,'height':900,'src':variants[-1]['src'],'srcSet':', '.join(f"{v['src']} {v['width']}w" for v in variants),'variants':variants,'sources':[{'id':'bucket-20l-front','pdf':'Bucket.pdf','page':1,'object':'Im0.png'},{'id':'jerrycan-20l','pdf':'Bucket.pdf','page':3,'object':'Im1.png'}]}
(root/'upms.client/src/data/capabilities.js').write_text('// Actual approved catalog photographs; layout only, no product alterations.\nexport const capabilitiesImage = '+json.dumps(manifest,indent=2)+';\n')
print(json.dumps(variants))
