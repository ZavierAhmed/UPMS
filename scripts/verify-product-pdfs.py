"""Validate PDF text, paper, hyperlinks, image presence and deterministic regeneration."""
from pathlib import Path
import json,hashlib,subprocess,sys
from pypdf import PdfReader
root=Path(__file__).resolve().parent.parent
manifest=json.loads((root/'upms.client/public/product-documents.json').read_text(encoding='utf8'))
catalog=json.loads((root/'tmp/uat3a/pdf-input/catalog.json').read_text(encoding='utf8'))
company=catalog['company'];results=[];before={}
sheets={**manifest['documents'],**manifest.get('retainedDocuments',{})}
for p in catalog['products']:
 doc=sheets[p['id']];path=root/('upms.client/public'+doc['url']);raw=path.read_bytes();before[p['id']]=hashlib.sha256(raw).hexdigest()
 reader=PdfReader(path);assert len(reader.pages)==1
 page=reader.pages[0];assert abs(float(page.mediabox.width)-595.2756)<.1 and abs(float(page.mediabox.height)-841.8898)<.1
 text=page.extract_text();assert len(text)>700
 for required in [company['name'],p['title'],company['email'],company['address'],*[phone['label'] for phone in company['phones']],*p['capacities']]:assert required in text,(p['id'],required)
 assert 'Z.A Khan' not in text and 'Unique Lubricants' not in text
 assert len(page.images)>=2
 urls=[str(a.get_object().get('/A',{}).get('/URI','')) for a in page.get('/Annots',[])];assert 'https://wa.me/923142113472' in urls
 assert before[p['id']]==doc['sha256'] and len(raw)==doc['bytes']
 assert (root/'output/pdf'/doc['filename']).read_bytes()==raw
 results.append({'id':p['id'],'pages':1,'paper':'A4','selectableTextCharacters':len(text),'contactAndCapacityChecks':True,'images':len(page.images),'links':urls,'sha256':doc['sha256'],'bytes':len(raw)})
subprocess.run([sys.executable,str(root/'scripts/generate-product-pdfs.py')],cwd=root,check=True)
for id,doc in sheets.items():assert hashlib.sha256((root/('upms.client/public'+doc['url'])).read_bytes()).hexdigest()==before[id]
report={'passed':True,'deterministicRegeneration':True,'manifestCopiesMatch':(root/'upms.client/public/product-documents.json').read_bytes()==(root/'upms.client/src/data/productDocuments.json').read_bytes(),'documents':results}
(root/'docs/uat-3a/evidence/pdf-validation.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8')
print('All five PDF text, A4, contact, image, link, checksum and reproducibility checks passed.')
