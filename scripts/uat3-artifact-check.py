import json, hashlib, re, subprocess
from pathlib import Path
from pypdf import PdfReader
from zipfile import ZipFile
import xml.etree.ElementTree as ET
root=Path.cwd(); out=root/'tmp/pdfs/uat3-review';out.mkdir(parents=True,exist_ok=True)
proof=json.loads((root/'docs/uat-3/evidence/report-values.json').read_text(encoding='utf-8-sig'))
files=proof['files']+['output/pdf/uat3-regression-'+name+'.pdf' for name in ['expense-classification','hafta','production']];results=[]
for item in files:
 p=root/item; reader=PdfReader(p);text='\n'.join(page.extract_text() or '' for page in reader.pages).replace(',','')
 assert all(len((page.extract_text() or '').strip())>40 for page in reader.pages),item+' blank page'
 assert 'Unique Plastic Industry' in text,item+' missing company'
 if 'acknowledgment' in item:
  assert float(reader.pages[0].mediabox.width)<float(reader.pages[0].mediabox.height)
  assert '50000.00' in text and 'Cheque cleared' in text
  assert not re.search(r'synthetic-bank-evidence|CHROMEUAT|UAT2AATTACH|Actor \d',text)
 if 'bank-statement' in item: assert '51000.00' in text and '50000.00' in text
 if 'customer-receipt' in item: assert '50000.00' in text
 if 'cheque-register' in item: assert len(reader.pages)>1 and '2962.80' in text and '51000.00' in text
 subprocess.run([r'C:/Users/zasah/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/Library/bin/pdftoppm.exe','-scale-to','1300','-png',str(p),str(out/p.stem)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
 results.append({'path':item,'pages':len(reader.pages),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
for name,values in [('Incoming-Cheque-Register.xlsx',['50000.00','1000.00','123.45']),('Bank-Statement.xlsx',['50000.00','1000.00','51000.00'])]:
 p=root/'docs/uat-3/evidence/browser'/name
 with ZipFile(p) as z:
  assert not any('vba' in n.lower() or 'externalLinks/' in n for n in z.namelist())
  xml='\n'.join(z.read(n).decode('utf-8') for n in z.namelist() if n.endswith('.xml'))
  assert not re.search(r'<(?:\w+:)?f(?:\s|>)',xml)
  for val in values: assert val in xml,(name,val)
 results.append({'path':str(p.relative_to(root)).replace('\\','/'),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'numericValuesMatch':True,'noFormulasMacrosExternalLinks':True})
(root/'docs/uat-3/evidence/artifacts.json').write_text(json.dumps({'passed':True,'files':results,'visualInspection':'PENDING','browserHeadersFooters':False},indent=2))
print('PDF/Excel checks and all-page rendering passed')
