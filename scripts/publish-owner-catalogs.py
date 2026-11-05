"""Owner-authorized UAT-3A brochure downloads. Originals are never modified.
Re-encode RGB image streams as high-quality JPEG without resizing; preserve
page geometry, vector artwork, text, masks and all original page content.
"""
from pathlib import Path
from io import BytesIO
import hashlib,json
from PIL import Image
from pypdf import PdfReader,PdfWriter
from pypdf.generic import NameObject
root=Path(__file__).resolve().parent.parent
source=Path('C:/Users/zasah/Downloads/New folder')
out=root/'upms.client/public/downloads/products/v2';out.mkdir(parents=True,exist_ok=True)
overrides={};evidence=[]
for name,target,ids in [('Bucket.pdf','Bucket.pdf',['buckets']),('Company_Profile_New_HD_Bottles (1).pdf','Company_Profile_New_HD_Bottles.pdf',['cans','containers'])]:
 original=source/name;reader=PdfReader(original);writer=PdfWriter(clone_from=original)
 count=0
 for obj in writer._objects:
  if not hasattr(obj,'get') or obj.get('/Subtype')!='/Image' or obj.get('/BitsPerComponent')!=8 or obj.get('/Filter')=='/DCTDecode':continue
  color=obj.get('/ColorSpace')
  if hasattr(color,'get_object'):color=color.get_object()
  rgb=color=='/DeviceRGB' or (isinstance(color,list) and color[0]=='/ICCBased' and color[1].get_object().get('/N')==3)
  if not rgb:continue
  w,h=obj['/Width'],obj['/Height'];raw=obj.get_data()
  if len(raw)!=w*h*3:continue
  buffer=BytesIO();Image.frombytes('RGB',(w,h),raw).save(buffer,'JPEG',quality=94,subsampling=0,optimize=True)
  if len(buffer.getvalue())>=len(obj._data):continue
  obj._data=buffer.getvalue();obj.decoded_self=None;obj[NameObject('/Filter')]=NameObject('/DCTDecode')
  obj.pop('/DecodeParms',None)
  if obj.get('/Decode') is None:obj.pop('/Decode',None)
  count+=1
 writer.compress_identical_objects(remove_duplicates=True,remove_unreferenced=True)
 for p in writer.pages:p.compress_content_streams()
 path=out/target;writer.write(path)
 final=PdfReader(path)
 assert len(final.pages)==len(reader.pages)
 for before,after in zip(reader.pages,final.pages):
  assert before.extract_text()==after.extract_text()
  assert list(before.mediabox)==list(after.mediabox)
 blob=path.read_bytes();sourceHash=hashlib.sha256(original.read_bytes()).hexdigest()
 entry={'url':'/downloads/products/v2/'+target,'filename':name,'mime':'application/pdf','bytes':len(blob),'sha256':hashlib.sha256(blob).hexdigest(),'documentKind':'owner-authorized source catalog, web-optimized','sourceFile':name,'sourceSha256':sourceHash,'pages':len(final.pages),'optimization':'RGB image streams JPEG quality 94, 4:4:4; no resizing; original masks, vector artwork, text and page geometry preserved'}
 for id in ids:overrides[id]=entry
 evidence.append({**entry,'sourceBytes':original.stat().st_size,'rgbStreamsOptimized':count,'allPageTextAndGeometryPreserved':True})
 print(name,original.stat().st_size,'->',len(blob),'pages',len(final.pages))
(root/'upms.client/src/data/productCatalogOverrides.json').write_text(json.dumps(overrides,indent=2)+'\n',encoding='utf8')
(root/'docs/uat-3a/evidence/source-catalog-downloads.json').write_text(json.dumps(evidence,indent=2)+'\n',encoding='utf8')
