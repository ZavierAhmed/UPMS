from pathlib import Path
from pypdf import PdfReader
import subprocess,json,hashlib,zipfile,xml.etree.ElementTree as ET
root=Path.cwd();out=root/'tmp/pdfs/uat2a-review';out.mkdir(parents=True,exist_ok=True)
poppler=Path.home()/'.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/Library/bin/pdftoppm.exe'
accept=json.loads((root/'docs/uat-2a/evidence/browser/acceptance.json').read_text());ref=accept['registeredReference'];files=[]
for name in ['cheque-acknowledgment','cheque-register']:
 path=root/'output/pdf'/('uat2a-'+name+'.pdf');reader=PdfReader(path);text='\n'.join(page.extract_text() or '' for page in reader.pages)
 assert 'Unique Plastic Industry' in text and ref in text.replace('\n',''),name
 assert 'synthetic-upload.png' not in text and 'CHROMEUAT2A0001' not in text and 'Actor ' not in text,name
 if name=='cheque-acknowledgment':assert '42.25' in text and 'subject to bank clearance' in text
 subprocess.run([str(poppler),'-png','-scale-to','1400',str(path),str(out/name)],check=True,capture_output=True)
 files.append({'path':path.relative_to(root).as_posix(),'pages':len(reader.pages),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
path=root/'docs/uat-2a/evidence/browser/Incoming-Cheque-Register.xlsx'
with zipfile.ZipFile(path) as z:
 assert z.testzip() is None
 assert not any('vba' in name.lower() or 'externallink' in name.lower() for name in z.namelist())
 xml=z.read('xl/worksheets/sheet1.xml');sheet=ET.fromstring(xml);ns={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
 assert not sheet.findall('.//s:f',ns)
 assert ref.encode() in xml and b'42.25' in xml and b'CHROMEUAT2A0001' not in xml
files.append({'path':path.relative_to(root).as_posix(),'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'referenceAndAmountMatch':True,'noFormulasOrMacros':True})
(root/'docs/uat-2a/evidence/artifacts.json').write_text(json.dumps({'passed':True,'realChromePdfs':2,'excelExports':1,'files':files,'visualInspection':'PENDING'},indent=2)+'\n')
print(json.dumps({'passed':True,'pdfPages':[f.get('pages') for f in files if 'pages'in f],'excelMatches':True}))
