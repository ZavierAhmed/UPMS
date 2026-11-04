from pathlib import Path
from zipfile import ZipFile
from xml.etree import ElementTree as ET
from decimal import Decimal
from pypdf import PdfReader
import hashlib,json,re
ROOT=Path(__file__).resolve().parents[1]
E=ROOT/'docs/uat-h1e/evidence'
NS={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
def rows(path):
 with ZipFile(path) as z:
  assert z.testzip() is None
  assert not any('vba' in name.lower() for name in z.namelist())
  xml=ET.fromstring(z.read('xl/worksheets/sheet1.xml'));assert not xml.findall('.//s:f',NS)
  return [[{'value':''.join(c.itertext()),'type':c.get('t')} for c in row] for row in xml.findall('.//s:sheetData/s:row',NS)]
artifacts=[]
for name,state,closing,paid in [('full-zero','FULL','800.00','1200.00'),('partial-thousand','PARTIAL','1800.00','1200.00'),('full-thousand','FULL','1800.00','1200.00'),('no-opening','UNVERIFIED',None,'0.00'),('all-employees','UNVERIFIED',None,None)]:
 pdf=ROOT/'output/pdf'/('uath1e-'+name+'.pdf');reader=PdfReader(pdf);text=' '.join(' '.join(page.extract_text().split()) for page in reader.pages)
 assert 'Unique Plastic Industry' in text and 'Z.A Khan' not in text and 'Unique Lubricants' not in text
 assert state+' coverage' in text
 if state=='PARTIAL':assert 'Beginning-of-period payable is unknown' in text and 'as of 2026-11-08' in text
 if closing:assert closing in text.replace(',','')
 workbook=E/(name+'.xlsx');rr=rows(workbook);labels=[r[2]['value'] for r in rr if len(r)>2]
 assert any(state+' coverage' in label for label in labels)
 if name!='all-employees':
  detail=[r for r in rr if len(r)>=7 and re.fullmatch(r'\d{4}-\d{2}-\d{2}',r[1]['value'])]
  assert sum(Decimal(r[5]['value'] or '0') for r in detail)==Decimal('2000.00')
  assert sum(Decimal(r[6]['value'] or '0') for r in detail)==Decimal(paid)
  for r in detail:
   for i in [4,5,6]:
    if r[i]['value']:assert r[i]['type'] is None
  assert any(label.startswith('Closing payable: '+(closing or 'UNVERIFIED')) for label in labels)
 if name=='all-employees':assert any(r[0]['value']=='Overall closing payable: UNVERIFIED' for r in rr if r)
 artifacts.append({'pdf':str(pdf.relative_to(ROOT)).replace('\\','/'),'pages':len(reader.pages),'sha256':hashlib.sha256(pdf.read_bytes()).hexdigest(),'excel':workbook.name,'coverage':state,'textAndMoneyCellsVerified':True})
for name,state in [('owner-partial','PARTIAL'),('owner-full','FULL')]:
 rr=rows(E/(name+'.xlsx'));labels=[r[2]['value'] for r in rr if len(r)>2]
 assert any(state+' coverage' in label for label in labels)
 assert any(label.startswith('Closing payable: 1800.00') for label in labels)
 assert ('Opening payable: UNVERIFIED' if state=='PARTIAL' else 'Opening payable: 1000.00') in labels
 assert 'Existing payments applied (noncash classification): 1200.00' in labels
before=json.loads((E/'owner-before.json').read_text(encoding='utf-8'));after=json.loads((E/'owner-after.json').read_text(encoding='utf-8'))
for table in ['labor_openings','labor_earnings','labor_payments','labor_audit','labor_expense_allocations','labor_extension_receipts','labor_extension_audit','v1_commands','v1_documents','money_batches','money_movements','money_audit','v1_stock','v1_stock_journal','v1_party_journal','users','user_roles']:
 assert before['fingerprints'][table]==after['fingerprints'][table],table+' changed'
assert all(after['originalSourceUnchangedSinceH1D'].values())
result={'passed':True,'actualChromePdfs':artifacts,'syntheticExcelDownloads':5,'actualOwnerExcelDownloads':2,'exactMoneyCellsNumeric':True,'ownerBusinessAndAdministratorRowsUnchanged':True,'originalSourceAndCashStockLedgerUnchangedSinceH1D':True,'ownerOpening':{'id':'1','date':'2026-11-03','amount':'1000.00'},'visualReview':'Pending separate rendered-page review'}
(E/'artifact-validation.json').write_bytes((json.dumps(result,indent=2)+'\n').encode())
print(json.dumps({'passed':True,'pdfs':5,'pdfPages':sum(a['pages'] for a in artifacts),'workbooks':7,'ownerRecordsUnchanged':True}))
