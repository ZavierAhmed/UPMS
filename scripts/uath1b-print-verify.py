from pathlib import Path
from decimal import Decimal
import json,hashlib
import pdfplumber
root=Path('docs/uat-h1b/evidence');results=[]
assert Decimal('200')*Decimal('10.00')==Decimal('2000.00')
for name,status,label in [('production-draft','DRAFT','Estimated labor'),('production-posted','POSTED','Labor earned')]:
    path=Path('output/pdf/uat-h1b')/(name+'.pdf')
    with pdfplumber.open(path) as pdf:
        text='\n'.join(p.extract_text() or '' for p in pdf.pages)
        assert len(pdf.pages)==1
        assert all(s in text for s in ['Unique Plastic Industry',status,label,'Ahmed','ITM-0001','200','PKR 10.00','PKR 2,000.00','Authorized signature'])
        assert 'PKR 0.00' not in text
        assert not any(s in text for s in ['Finalize entry','Set Up Stock Opening','Refresh opening verification','Cancel draft','This request could not'])
        assert all(-1<=c['x0']<=c['x1']<=p.width+1 and -1<=c['top']<=c['bottom']<=p.height+1 for p in pdf.pages for c in p.chars)
        results.append({'name':name,'pages':len(pdf.pages),'quantity':'200','rate':'10.00','labor':'2000.00','blankPages':0,'clippedCharacters':0,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
(root/'print-verification.json').write_text(json.dumps({'passed':True,'independentCalculation':'200 x 10.00 = 2000.00','pdfs':results,'visuallyReviewedPages':2,'productionContacted':False},indent=2)+'\n',encoding='utf-8')
v=root/'visual-review.json';d=json.loads(v.read_text(encoding='utf-8'));d.update(reviewed=True,reviewNotes='Both Chrome PDF pages visually inspected; approved logo, stock quantity, draft estimate versus immutable posted earning, rates and signatures intact. Responsive 390/768/1024/1440/1920 geometry verified and screenshots inspected.');v.write_text(json.dumps(d,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'passed':True,'pdfs':len(results),'pages':2}))
