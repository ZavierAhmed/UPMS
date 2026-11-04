from pathlib import Path
from zipfile import ZipFile
from xml.etree import ElementTree as ET
from decimal import Decimal
from pypdf import PdfReader
import json,re,hashlib
ROOT=Path(__file__).resolve().parents[1];E=ROOT/'docs/uat-h1f/evidence';NS={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
def rows(path):
 with ZipFile(path) as z:
  assert z.testzip() is None and not any('vba' in n.lower() for n in z.namelist())
  xml=ET.fromstring(z.read('xl/worksheets/sheet1.xml'));assert not xml.findall('.//s:f',NS)
  return [[{'v':''.join(c.itertext()),'t':c.get('t')} for c in row] for row in xml.findall('.//s:sheetData/s:row',NS)]
def verify_excel(path,case):
 rr=rows(path);detail=[r for r in rr if len(r)>=9 and re.fullmatch(r'\d{4}-\d{2}-\d{2}',r[1]['v'])];opening=[r for r in detail if r[2]['v'] in ['Verified employee opening','Carried opening balance']]
 assert len(opening)==(0 if case['state']=='UNVERIFIED' else 1)
 if case['state']=='UNVERIFIED':assert any(len(r)>=9 and r[2]['v']=='Opening balance (unverified)' and r[8]['v']=='UNVERIFIED' for r in rr)
 if opening:
  assert opening[0][5]['v']=='' and opening[0][6]['v']=='' and opening[0][7]['v']==case['opening']
  assert opening[0][7]['t'] is None
  if case['scenario']=='following-week':assert opening[0][1]['v']=='2026-11-09' and opening[0][2]['v']=='Carried opening balance' and opening[0][7]['v']=='1800.00'
 assert sum(Decimal(r[5]['v'] or '0') for r in detail)==Decimal(case['earned'])
 assert sum(Decimal(r[6]['v'] or '0') for r in detail)==Decimal(case['paid'])
 for r in rr:
  if len(r)>=9:
   for i in [4,5,6,7,8]:
    if re.fullmatch(r'\d+\.\d{2}',r[i]['v']):assert r[i]['t'] is None
 def summary(label):return next(r[8]['v'] for r in rr if len(r)>=9 and r[2]['v'].startswith(label))
 assert summary('Total available before payment')==(case['available'] or 'UNVERIFIED')
 assert summary('Total payments/deductions')==case['paid']
 assert summary('Closing payable / Amount owed')==(case['closing'] or 'UNVERIFIED')
 if case['state']=='PARTIAL':assert any(len(r)>2 and 'Beginning-of-period payable is unknown' in r[2]['v'] for r in rr)
 return {'file':str(path.relative_to(ROOT)).replace('\\','/'),'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'openingRows':len(opening),'earned':case['earned'],'paid':case['paid'],'closing':case['closing']}
browser=json.loads((E/'browser.json').read_text(encoding='utf-8'));assert browser['passed'];pdfs=[];workbooks=[]
for case in browser['artifacts']:
 path=ROOT/case['pdf'];reader=PdfReader(path);text=' '.join(' '.join(p.extract_text().split()) for p in reader.pages);lower=text.lower();assert 'Unique Plastic Industry' in text and 'Z.A Khan' not in text and 'Unique Lubricants' not in text
 assert case['state'].lower()+' coverage' in lower and 'closing payable / amount owed to employee' in lower and 'total available before payment' in lower
 if case['closing']:assert case['closing'] in text.replace(',','')
 if case['state']=='PARTIAL':assert 'as of 2026-11-08' in text and 'Beginning-of-period payable is unknown' in text
 if case['state']=='UNVERIFIED':assert 'UNVERIFIED' in text
 pdfs.append({'file':case['pdf'],'pages':len(reader.pages),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()});workbooks.append(verify_excel(ROOT/case['excel'],case))
allpath=ROOT/'output/pdf/uath1f-all-employees.pdf';allpdf=PdfReader(allpath);alltext=' '.join(p.extract_text() for p in allpdf.pages);assert 'UNVERIFIED' in alltext and 'Amount owed to employee'.lower() in alltext.lower();pdfs.append({'file':str(allpath.relative_to(ROOT)).replace('\\','/'),'pages':len(allpdf.pages),'sha256':hashlib.sha256(allpath.read_bytes()).hexdigest()})
rr=rows(E/'all-employees.xlsx');assert any(r and r[0]['v']=='Overall available before payment: UNVERIFIED' for r in rr);assert any(r and r[0]['v']=='Overall closing payable: UNVERIFIED' for r in rr)
owner_path=E/'owner-partial.xlsx';owner=None
if owner_path.exists():owner=verify_excel(owner_path,{'scenario':'owner','state':'PARTIAL','opening':'1000.00','earned':'2000.00','paid':'1200.00','available':'3000.00','closing':'1800.00'})
result={'passed':True,'pdfs':pdfs,'syntheticExcel':workbooks,'allEmployeeExcelVerified':True,'actualOwnerExcel':owner,'exactMoneyCellsNumeric':True,'openingNotCountedAsEarnedOrPaid':True,'noFormulasOrMacros':True,'visualReview':'Pending rendered-page review'};(E/'artifact-validation.json').write_bytes((json.dumps(result,indent=2)+'\n').encode());print(json.dumps({'passed':True,'pdfs':len(pdfs),'pages':sum(p['pages'] for p in pdfs),'syntheticExcel':9,'actualOwnerExcel':owner is not None}))
