from pathlib import Path
import json,re,warnings
from decimal import Decimal
import pdfplumber,openpyxl
root=Path('docs/uat-1a/evidence');b=json.loads((root/'browser.json').read_text());internal=b['internalNumber'];checks=[]
for artifact in b['pdfs']:
    with pdfplumber.open(artifact['path']) as pdf:
        pages=[p.extract_text() or '' for p in pdf.pages];text='\n'.join(pages)
        assert all(len(p.strip())>80 for p in pages),(artifact['name'],'blank page')
        assert all(-1<=c['x0']<=c['x1']<=p.width+1 and -1<=c['top']<=c['bottom']<=p.height+1 for p in pdf.pages for c in p.chars),(artifact['name'],'clipping')
        assert internal not in text,(artifact['name'],'internal generated number leaked')
        assert 'Unique Plastic Industry' in text
        assert 'Export Excel' not in text and 'Sign out' not in text
        if artifact['name']=='custom-challan':
            assert text.count('Delivery Challan No: CH-001')==1
            assert not any(x in text for x in ['Custom:','Official:','Custom Challan Number','Historical document:','money-account allocation','Linked money movement','reconciliation'])
            assert all(x in text for x in ['Consolidated Client','Synthetic consolidated bottle','7.13','Receiver signature','Authorized signature'])
            assert len(pages)==1
        elif artifact['name']=='automatic-challan':
            assert 'Delivery Challan No: DC-0001' in text and 'CH-001' not in text
        else: assert 'CH-001' in text
        if len(pages)>1:
            assert all('DATE' in p.upper() for p in pages[1:]),artifact['name']
        checks.append({'name':artifact['name'],'pages':len(pages),'internalIdentityExcluded':True,'clippedCharacters':0,'blankPages':0})
exports=[]
for file in b['exports']:
    with warnings.catch_warnings():
        warnings.simplefilter('ignore',UserWarning);w=openpyxl.load_workbook(file,data_only=False)
    rows=list(w.active.values);cells=[str(c) for r in rows for c in r if c is not None]
    assert any('CH-001' in c for c in cells),file
    assert not any(internal in c for c in cells),file
    assert not any(c.data_type=='f' for row in w.active for c in row),file
    name=Path(file).stem
    data=[r for r in rows if r[0] and re.fullmatch(r'\d{4}-\d{2}-\d{2}',str(r[0]))]
    if name=='sales-register': assert sum(Decimal(str(r[3])) for r in data)==Decimal('57.04')
    if name=='return-register': assert sum(Decimal(str(r[4])) for r in data)==Decimal('21.39')
    if name=='stock-movements': assert sum(int(r[6]) for r in data)==119
    if name=='customer-ledger': assert Decimal(str(data[-1][5]))==Decimal('13.27')
    exports.append({'name':name,'rows':len(rows),'customIdentityPresent':True,'internalIdentityExcluded':True,'formulaCells':0})
(root/'print-verification.json').write_text(json.dumps({'passed':True,'pdfs':checks,'exports':exports,'syntheticOnly':True,'productionContacted':False},indent=2)+'\n',encoding='utf-8')
print(json.dumps({'passed':True,'pdfs':len(checks),'exports':len(exports)}))
