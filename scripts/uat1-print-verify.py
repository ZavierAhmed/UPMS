"""Validate real Chrome PDFs and downloaded Excel values; synthetic isolated evidence only."""
from pathlib import Path
from decimal import Decimal
import json, re, warnings, subprocess
import pdfplumber
import openpyxl

root = Path('docs/uat-1/evidence')
browser = json.loads((root/'browser-after.json').read_text())
oracle = json.loads((root/'print-oracles.json').read_text())
checks = []
texts = {}
for artifact in browser['pdfs']:
    with pdfplumber.open(artifact['path']) as pdf:
        pages = [p.extract_text() or '' for p in pdf.pages]
        assert all(len(t.strip()) > 80 for t in pages), (artifact['name'], 'blank / banner-only page')
        assert all(round(p.width) in [842, 1191] and round(p.height) in [595, 842] for p in pdf.pages), artifact['name']
        assert all(-1 <= c['x0'] <= c['x1'] <= p.width+1 and -1 <= c['top'] <= c['bottom'] <= p.height+1 for p in pdf.pages for c in p.chars), (artifact['name'], 'clipped text')
        text = '\n'.join(pages)
        assert 'Unique Plastic Industry' in text or 'HAFTA' in text, artifact['name']
        assert 'Sign out' not in text and 'Export Excel' not in text and 'Back to Dashboard' not in text, artifact['name']
        texts[artifact['name']] = text
        checks.append({'surface': artifact['name'], 'pages':len(pages),'blankPages':0,'clippedCharacters':0,'controlsExcluded':True})
        if artifact['name'] == 'company-transactions':
            assert 'Transaction totals' in pages[-1] and re.search(r'(DC-|RF-|VP-|CR-|UAT1-|Entry \d)', pages[-1]), 'Orphan company totals'
            assert 'Client receivables' not in text and 'Vendor payables' not in text
            assert 'B4-PAID' in text and 'UPI-2026-001' in text
        if artifact['name'] in ['expense-category','expense-employee']:
            assert '-5.43' in text and '0.20' in text
        if artifact['name'] == 'custom-challan':
            assert oracle['custom']['customNumber'] in text and oracle['custom']['officialNumber'] in text
        if artifact['name'] == 'purchase':
            assert '12.51' in text and '4.17' in text and 'B4-PAID' in text
            assert 'Not posted' not in text
        if artifact['name'] in ['customer-ledger','vendor-ledger']:
            source=oracle['client' if artifact['name']=='customer-ledger' else 'vendor']
            assert source['closing'].lstrip('-') in text and 'Opening' in text
        if len(pages)>1:
            # Every continued tabular page repeats its actual table headings.
            for continuation in pages[1:]:
                assert any(label in continuation.upper() for label in ['DATE','DESCRIPTION','DAY','REFERENCE','CODE']), (artifact['name'],'missing repeated heading')

exports=[]
def data_rows(name):
    path=root/('after-'+name+'.xlsx')
    with warnings.catch_warnings():
        warnings.simplefilter('ignore',UserWarning)
        book=openpyxl.load_workbook(path,data_only=False)
    assert all(c.data_type!='f' for row in book.active for c in row)
    rows=list(book.active.values)
    exports.append({'surface':name,'formulaCells':0,'rows':len(rows)})
    return rows,[r for r in rows if r[0] and re.fullmatch(r'\d{4}-\d{2}-\d{2}',str(r[0]))]

for name in ['expense-category','expense-employee']:
    rows,data=data_rows(name)
    assert len(data)==oracle['report']['count']==4
    assert sum((Decimal(str(r[6])) for r in data),Decimal(0))==Decimal(oracle['report']['overall'])==Decimal('0.20')
    assert any(Decimal(str(r[6]))==Decimal('-5.43') for r in data)
rows,data=data_rows('company-transactions')
assert len(data)==len(oracle['register']['records'])
for record in oracle['register']['records']:
    match=[r for r in data if str(r[1]).startswith(record['reference'])]
    assert len(match)==1 and Decimal(str(match[0][5]))==Decimal(record['amount'])
assert any('UPI-2026-001' in str(r[1]) for r in data)
for name,key in [('customer-ledger','client'),('vendor-ledger','vendor')]:
    rows,data=data_rows(name)
    source=oracle[key]
    assert len(data)==len(source['records'])
    for r,expected in zip(data,source['records']):
        assert [Decimal(str(r[i])) for i in [3,4,5]]==[Decimal(expected[k]) for k in ['debit','credit','balance']]
rows,data=data_rows('money-statement')
assert len(data)==len(oracle['statement']['records'])
for r,expected in zip(data,oracle['statement']['records']):
    assert Decimal(str(r[4]))==Decimal(expected['delta']) and Decimal(str(r[5]))==Decimal(expected['balance'])
rows,data=data_rows('stock-movements')
assert sum((int(r[6]) for r in data),0)==118
rows,_=data_rows('stock')
stock=[r for r in rows if str(r[0]).startswith('ITM-')]
assert sum(int(r[2]) for r in stock)==118
rows,_=data_rows('client-hafta')
for b in oracle.get('hafta',{}).get('blocks',[]):
    assert any(str(r[0])==b['partyName'] and str(r[3])=='BALANCE' and Decimal(str(r[6]))==Decimal(b['balance']) for r in rows)
if (root/'after-purchase-register.xlsx').exists():
    rows,data=data_rows('purchase-register')
    assert sum(Decimal(str(r[4])) for r in data)==Decimal('33.46')
result={'passed':True,'pdfs':checks,'excel':exports,'syntheticOnly':True,'productionContacted':False}
(root/'print-verification.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'passed':True,'pdfs':len(checks),'workbooks':len(exports)}))
