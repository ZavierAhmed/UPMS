"""Validate actual Chrome/Excel artifacts; render every main PDF page for visual QA."""
from pathlib import Path
from pypdf import PdfReader
from decimal import Decimal
import hashlib, json, subprocess, zipfile
import xml.etree.ElementTree as ET

root=Path(__file__).resolve().parents[1]
review=root/'tmp/pdfs/uat2-review'
review.mkdir(parents=True,exist_ok=True)
poppler=Path.home()/'.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/Library/bin/pdftoppm.exe'
files=[]
for name in ['cheque-acknowledgment','cheque-register','bank-statement','customer-ledger','cleared-customer-receipt']:
    path=root/'output/pdf'/f'uat2-{name}.pdf'
    reader=PdfReader(path)
    text='\n'.join(page.extract_text() or '' for page in reader.pages)
    assert len(reader.pages)==1, name
    assert 'Unique Plastic Industry' in text and '50000.00' in text.replace(',',''), name
    assert not any(x in text for x in ['Loading records','BROWSERACCOUNT0001','Z.A Khan','Unique Lubricants']),name
    if name=='cheque-acknowledgment':
        assert 'subject to bank clearance' in text
        assert 'Actor ' not in text and 'exceptional self approval' not in text
    if name=='cheque-register':
        assert any('/management/cheques?id=' in str(annotation.get_object().get('/A',{}).get('/URI','')) for page in reader.pages for annotation in page.get('/Annots',[]))
    if name=='bank-statement': assert 'Cheque bank clearance' in text
    if name=='cleared-customer-receipt': assert 'Linked money movement' not in text and 'UPMS-CHEQUE:' not in text
    subprocess.run([str(poppler),'-png','-scale-to','1400',str(path),str(review/name)],check=True,capture_output=True)
    files.append({'path':path.relative_to(root).as_posix(),'pages':len(reader.pages),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})

ns={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
for name in ['Incoming-Cheque-Register','Receiving-Bank-Statement','Customer-Ledger']:
    path=root/'docs/uat-2/evidence/browser'/f'{name}.xlsx'
    with zipfile.ZipFile(path) as archive:
        assert archive.testzip() is None
        assert not any('vba' in n.lower() or 'externalLink' in n for n in archive.namelist())
        xml=archive.read('xl/worksheets/sheet1.xml')
        sheet=ET.fromstring(xml)
        assert not sheet.findall('.//s:f',ns)
        assert sheet.find('.//s:pane',ns) is not None
        assert b'BROWSERACCOUNT0001' not in xml
        numeric=[Decimal(n.text) for n in sheet.findall('.//s:c/s:v',ns)]
        assert Decimal('50000.00') in numeric,name
        if name=='Incoming-Cheque-Register':
            assert b'/management/cheques?id=' in xml and b'/management/documents/' in xml
            assert b'Canonical bank batch ID' in xml
        if name=='Customer-Ledger': assert Decimal('0.00') in numeric
    files.append({'path':path.relative_to(root).as_posix(),'archiveVerified':True,'numericMoneyVerified':True,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})

(root/'docs/uat-2/evidence/artifact-checks.json').write_text(json.dumps({'passed':True,'chromePdfs':5,'excelDownloads':3,'sourceLinksVerified':True,'fullDrawerAccountExcluded':True,'renderedForVisualReview':True,'files':files},indent=2)+'\n',encoding='utf-8')
print(json.dumps({'passed':True,'pdfs':5,'xlsx':3,'renderedPages':5}))
