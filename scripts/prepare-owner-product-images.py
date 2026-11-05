"""Optimize five selected images from the folder authorized by the owner in UAT-3A.
Originals remain outside the repository, unchanged. No recoloring or generative edits.
"""
import sys,json,hashlib
from pathlib import Path
from PIL import Image,ImageOps
root=Path(__file__).resolve().parent.parent
source=Path(sys.argv[1])
selected=[('stickers','label-yellow','4fffd507-1733-4696-bfec-cd6122bf54db.png'),('stickers','label-blue','9c876f8c-ce11-40c6-8113-ca03f6b5ab0b.png'),('stickers','label-grey','c8c4fe89-9463-4a28-9175-94f4aa358a2e.png'),('cartons','plain-carton','f3383ac2-ec9a-4830-bf4d-170946afd090.png'),('cartons','open-carton','open-empty-box.jpg.jpeg')]
galleries={'stickers':[],'cartons':[]}
for category,key,filename in selected:
 original=source/filename; image=ImageOps.exif_transpose(Image.open(original)).convert('RGB');w,h=image.size
 variants=[]
 for width in [160,320,640,min(1200,w)]:
  height=round(h*width/w);name=f'owner-uat3a-{key}-{width}.webp';path=root/'upms.client/public/assets'/name
  image.resize((width,height),Image.Resampling.LANCZOS).save(path,'WEBP',quality=83,method=6)
  variants.append({'src':'/assets/'+name,'width':width,'height':height,'bytes':path.stat().st_size})
 caption=('Owner-supplied representative label application on a container. Third-party branding is not a Unique Plastic Industry brand or lubricant product.' if category=='stickers' else 'Owner-supplied representative carton packaging image. Confirm the format and specifications for your order.')
 galleries[category].append({'id':key,'categoryId':category,'sourceFile':filename,'sourceSha256':hashlib.sha256(original.read_bytes()).hexdigest(),'approval':'Owner explicitly authorized website use of Downloads/New folder in UAT-3A.','imageKind':'owner-supplied representative packaging image','alt':('Label application on a '+{'label-yellow':'yellow','label-blue':'black','label-grey':'grey'}[key]+' bottle; representative packaging example' if category=='stickers' else ('Open unbranded corrugated carton, representative packaging example' if key=='open-carton' else 'Closed unbranded brown carton, representative packaging example')),'caption':caption,'width':variants[-1]['width'],'height':variants[-1]['height'],'originalWidth':w,'originalHeight':h,'src':variants[-1]['src'],'thumbnail':variants[0]['src'],'srcSet':', '.join(f"{v['src']} {v['width']}w" for v in variants[1:]),'variants':variants})
(root/'upms.client/src/data/ownerProductImages.json').write_text(json.dumps(galleries,indent=2)+'\n',encoding='utf8')
print('Prepared five approved representative images, 20 responsive WebP variants. Originals unchanged.')
