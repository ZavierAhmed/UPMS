from pathlib import Path
from pypdf import PdfReader
from openpyxl import load_workbook
import json

directory=Path('tmp/phase-4.3/browser')
report={'passed':True,'pdfs':[],'workbooks':[],'dataScope':'Empty hosted staging reports'}
for path in sorted(directory.glob('*.pdf')):
    reader=PdfReader(path)
    has_text=bool(''.join(page.extract_text() or '' for page in reader.pages).strip())
    report['pdfs'].append({'name':path.name,'pages':len(reader.pages),'hasText':has_text})
    report['passed'] &= has_text and len(reader.pages)>0
for path in sorted(directory.glob('*.xlsx')):
    workbook=load_workbook(path,read_only=True,data_only=False)
    sheets=[]
    for sheet in workbook.worksheets:
        rows=list(sheet.iter_rows(values_only=True))
        cells=sum(value is not None for row in rows for value in row)
        sheets.append({'title':sheet.title,'rows':len(rows),'columns':max(map(len,rows),default=0),'nonemptyCells':cells})
        report['passed'] &= cells>0
    report['workbooks'].append({'name':path.name,'sheets':sheets,'opened':True})
    report['passed'] &= bool(sheets)
    workbook.close()
report['passed'] &= len(report['pdfs'])==3 and len(report['workbooks'])==3
(directory/'artifact-validation.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
if not report['passed']:
    raise SystemExit(1)
