"""Read-only verification of actual Chrome print PDFs and downloaded workbooks."""
from pathlib import Path
from decimal import Decimal
import json
import re
import warnings
import pdfplumber
import openpyxl

root = Path('docs/phase-3.2b4/evidence')
setup = json.loads(Path('tmp/php-runtime/p32b4-latest.json').read_text())
report = json.loads((Path(setup['directory']) / 'expense-report.json').read_text())
assert report['overall'] == '0.07' and report['count'] == 3
checks = []
for kind in ['Category', 'Employee']:
    path = Path('output/pdf') / f'UPMS-P3.2B4-{kind}-Expense-Report.pdf'
    with pdfplumber.open(path) as pdf:
        texts = [p.extract_text() or '' for p in pdf.pages]
        assert all(t.strip() for t in texts)
        assert all(round(p.width) == 842 and round(p.height) == 595 for p in pdf.pages)
        assert all(-1 <= c['x0'] <= c['x1'] <= p.width + 1 and -1 <= c['top'] <= c['bottom'] <= p.height + 1 for p in pdf.pages for c in p.chars)
        text = '\n'.join(texts)
        cells = [str(cell or '') for page in pdf.pages for table in page.extract_tables() for row in table for cell in row]
        for row in report['records']:
            assert any(re.sub(r'\s+', '', row['reference']) in re.sub(r'\s+', '', cell) for cell in cells), row['reference']
        assert report['overall'] in text and 'SYNTHETIC ISOLATED PHP ACCEPTANCE' in text
        assert 'All categories' in text and 'All employees' in text
        assert 'not payroll' in text
        assert 'Sign out' not in text and 'Save expense draft' not in text and 'Export Excel' not in text
        for page in texts:
            if 'GROUP TOTAL' in page:
                assert re.search(r'Expense\s+\d+', page), 'Orphan group total'
        pages = len(pdf.pages)
    with warnings.catch_warnings():
        warnings.simplefilter('ignore', UserWarning)
        wb = openpyxl.load_workbook(root / f'UPMS-{kind}-wise-Expense-Report.xlsx', data_only=False)
    rows = list(wb.active.values)
    assert all(c.data_type != 'f' for row in wb.active for c in row)
    data = [r for r in rows if r[0] and re.fullmatch(r'\d{4}-\d{2}-\d{2}', str(r[0]))]
    assert len(data) == report['count']
    assert sum((Decimal(str(r[6])) for r in data), Decimal(0)) == Decimal(report['overall'])
    group_totals = [r for r in rows if r[0] == 'Group total']
    assert sum((Decimal(str(r[6])) for r in group_totals), Decimal(0)) == Decimal(report['overall'])
    overall = [r for r in rows if r[0] == 'Overall total']
    assert len(overall) == 1 and Decimal(str(overall[0][6])) == Decimal(report['overall'])
    checks.append({'group': kind, 'pdfPages': pages, 'blankPages': 0, 'a4Landscape': True, 'allPostedSourcesPresent': True, 'excelRows': len(data), 'exactOverall': report['overall'], 'formulaCells': 0, 'orphanGroupTotals': 0})
result = {'passed': True, 'syntheticOnly': True, 'checks': checks}
(root / 'artifact-verification.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result))
