"""Read-only verification of the actual synthetic browser print and Excel output."""
import json
import warnings
from decimal import Decimal
from pathlib import Path
import pdfplumber
import openpyxl
root = Path('docs/phase-3.2a/evidence')
with pdfplumber.open('tmp/pdfs/p32a-money-statement.pdf') as pdf:
    texts = [p.extract_text() or '' for p in pdf.pages]
    assert all(t.strip() for t in texts)
    assert all(round(p.width) == 842 and round(p.height) == 595 for p in pdf.pages)
    assert all(0 <= c['x0'] <= c['x1'] <= p.width + 1 and 0 <= c['top'] <= c['bottom'] <= p.height + 1 for p in pdf.pages for c in p.chars)
    text = '\n'.join(texts)
    for reference in ['MA-000001','MA-000005','MA-000006','MA-000007','MA-000008','MA-000009','MA-000010','MA-000012']:
        assert reference in text
    assert '43.10' in text and 'Unverified' in text and 'SYNTHETIC TEST DATA' in text
    assert 'Sign out' not in text and 'Post internal transfer' not in text
    pages = len(pdf.pages)
with warnings.catch_warnings():
    warnings.simplefilter('ignore', UserWarning)
    wb = openpyxl.load_workbook(root / 'UPMS-Money-account-HARIS_CASH.xlsx', data_only=False)
sheet = wb.active
assert all(c.data_type != 'f' for row in sheet for c in row)
rows = list(sheet.values)
data = [r for r in rows if r[0] == '2026-10-30']
assert len(data) == 8
assert sum((Decimal(str(r[4])) for r in data), Decimal('0')) == Decimal('43.10')
assert Decimal(str(data[-1][5])) == Decimal('43.10')
assert any(r[0] == 'Brought forward: Unverified' for r in rows)
result = {'passed': True, 'syntheticOnly': True, 'pdfPages': pages, 'landscape': 'A4', 'blankPages': 0, 'allEightMovementsPrinted': True, 'textWithinPageBounds': True, 'navigationAndPostingControlsAbsent': True, 'excelOpened': True, 'excelExactMovementSum': '43.10', 'excelClosing': '43.10', 'unknownBroughtForwardPreserved': True, 'formulaCells': 0}
(root / 'artifact-verification.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
print(json.dumps(result))
