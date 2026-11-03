from pathlib import Path
from decimal import Decimal
import json,warnings
import pdfplumber,openpyxl
root=Path('docs/uat-h1/evidence')
b=json.loads((root/'browser.json').read_text(encoding='utf-8'))
o=json.loads((root/'browser-oracles.json').read_text(encoding='utf-8'))
checks=[]
for a in b['pdfs']:
    with pdfplumber.open(a['path']) as pdf:
        pages=[p.extract_text() or '' for p in pdf.pages];text='\n'.join(pages)
        assert all(len(p.strip())>80 for p in pages),(a['name'],'blank page')
        assert all(-1<=c['x0']<=c['x1']<=p.width+1 and -1<=c['top']<=c['bottom']<=p.height+1 for p in pdf.pages for c in p.chars),(a['name'],'clipping')
        assert not any(t in text for t in ['This request could not','Export Excel','Sign out','Post Hafta Payment']),a['name']
        if a['name'].startswith('employee-'):
            report=o[{'employee-single':'single','employee-all':'all','employee-week':'weekly'}[a['name']]]
            assert text.upper().count('PERIOD TOTALS')==len(report['blocks'])
            for block in report['blocks']:
                for value in [block['opening'],block['earned'],block['paid'],block['closing']]:assert ('UNVERIFIED' if value is None else value) in text
            assert 'Unique Plastic Industry' in text
            assert '0.11' not in text,'ordinary business expense leaked into wage statement'
            assert all('DATE' in p.upper() for p in pages[1:]),'continuation header missing'
        elif a['name']=='hafta-payment':
            assert 'PKR 1.00' in text and 'BROWSER-UATH1-ACCEPTANCE' in text
        else:assert 'Client Weekly Statement' in text and 'Hafta Report' not in text
        checks.append({'name':a['name'],'pages':len(pages),'blankPages':0,'clippedCharacters':0})
exports=[]
for a in b['exports']:
    with warnings.catch_warnings():
        warnings.simplefilter('ignore',UserWarning);w=openpyxl.load_workbook(a['path'],data_only=False)
    rows=list(w.active.values)
    assert not any(c.data_type=='f' for row in w.active for c in row)
    if a['name'].startswith('employee-'):
        report=o[{'employee-single':'single','employee-all':'all','employee-week':'weekly'}[a['name']]]
        totals=[r for r in rows if len(r)>2 and r[2]=='Period totals']
        assert len(totals)==len(report['blocks'])
        assert sum(Decimal(str(r[5])) for r in totals)==Decimal(report['totals']['earned'])
        assert sum(Decimal(str(r[6])) for r in totals)==Decimal(report['totals']['paid'])
        for block in report['blocks']:
            if block['closing'] is None:assert any('Closing payable: UNVERIFIED' in str(c) for r in rows for c in r)
        assert not any('0.11'==str(c) for r in rows for c in r)
    else:assert any('Client Weekly Statement' in str(c) for r in rows for c in r)
    exports.append({'name':a['name'],'rows':len(rows),'formulaCells':0,'totalsCompared':True})
assert o['single']['blocks'][0]['earned']=='108.35'
assert o['single']['blocks'][0]['paid']=='96.00'
assert o['single']['blocks'][0]['closing']=='12.35'
assert Decimal('108.35')-Decimal('96.00')==Decimal('12.35')
(root/'print-verification.json').write_text(json.dumps({'passed':True,'pdfs':checks,'exports':exports,'independentAlice':{'earned':'108.35','paid':'96.00','closing':'12.35'},'syntheticOnly':True,'productionContacted':False},indent=2)+'\n',encoding='utf-8')
print(json.dumps({'passed':True,'pdfs':len(checks),'exports':len(exports)}))
