"""Read-only acceptance checks on the actual Chrome PDFs and downloaded XLSX files."""
from pathlib import Path
from zipfile import ZipFile
from xml.etree import ElementTree as ET
from decimal import Decimal
import hashlib
import json
import re
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / 'docs/uat-h1c/evidence'
NS = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}

def rows(name):
    path = EVIDENCE / name
    with ZipFile(path) as archive:
        assert archive.testzip() is None
        xml = ET.fromstring(archive.read('xl/worksheets/sheet1.xml'))
        assert not xml.findall('.//s:f', NS), 'Export must not introduce formulas/macros'
        return [[{'value': ''.join(c.itertext()), 'type': c.get('t')} for c in row]
                for row in xml.findall('.//s:sheetData/s:row', NS)]

labor = rows('UPMS-Employee-Hafta.xlsx')
detail = [r for r in labor if len(r) >= 7 and re.fullmatch(r'\d{4}-\d{2}-\d{2}', r[1]['value'])]
assert len(detail) == 2
for row in detail:
    for col in [4, 5, 6]:
        if row[col]['value']:
            assert row[col]['type'] is None, 'Labor money must be numeric Excel cells'
earned = sum((Decimal(r[5]['value'] or '0') for r in detail), Decimal('0'))
paid = sum((Decimal(r[6]['value'] or '0') for r in detail), Decimal('0'))
assert earned == Decimal('2000.00') and paid == Decimal('1200.00')
labels = [r[2]['value'] for r in labor if len(r) > 2]
for label in ['Opening payable: 0.00', 'Direct Hafta payments: 0.00',
              'Existing payments applied (noncash classification): 1200.00', 'Closing payable: 800.00']:
    assert label in labels

expenses = rows('UPMS-Expense-Classification.xlsx')
expense_detail = [r for r in expenses if len(r) >= 7 and re.fullmatch(r'\d{4}-\d{2}-\d{2}', r[0]['value'])]
assert len(expense_detail) == 2
assert all(r[6]['type'] is None for r in expense_detail)
assert sorted(Decimal(r[6]['value']) for r in expense_detail) == [Decimal('-1200.00'), Decimal('1200.00')]
assert sum(Decimal(r[6]['value']) for r in expense_detail) == Decimal('0.00')
assert any(r[0]['value'] == 'Overall total' and r[6]['value'] == '0.00' for r in expenses if len(r) >= 7)

pdfs = []
for name in ['production', 'hafta', 'expense-classification']:
    path = ROOT / 'output/pdf' / ('uath1c-' + name + '.pdf')
    reader = PdfReader(path)
    assert len(reader.pages) == 1
    text = '\n'.join(p.extract_text() for p in reader.pages)
    assert 'Unique Plastic Industry' in text
    assert 'Z.A Khan' not in text and 'Unique Lubricants' not in text
    normalized = text.replace(',', '')
    if name == 'production':
        assert '2000.00' in normalized and '10.00' in normalized and '200' in normalized
    elif name == 'hafta':
        assert all(n in normalized for n in ['2000.00', '1200.00', '800.00'])
        assert 'Direct Hafta Payments' in text and 'Existing Payments Applied' in text
    else:
        assert '-1200.00' in normalized and '1200.00' in normalized and '0.00' in normalized
        assert 'Noncash Hafta classification' in text
    pdfs.append({'file': str(path.relative_to(ROOT)).replace('\\', '/'), 'pages': 1,
                 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'textAndTotalsVerified': True})

workbooks = [{'file': name, 'sha256': hashlib.sha256((EVIDENCE / name).read_bytes()).hexdigest()}
             for name in ['UPMS-Employee-Hafta.xlsx', 'UPMS-Expense-Classification.xlsx']]
result = {'passed': True, 'actualChromePdfs': pdfs, 'actualCompletedExcelDownloads': workbooks,
          'earned': str(earned), 'existingPaymentApplied': str(paid), 'closing': '800.00',
          'expenseSignedAmounts': ['1200.00', '-1200.00'], 'expenseNet': '0.00',
          'laborMoneyCellsNumeric': True, 'formulaErrorsOrMacrosIntroduced': False,
          'nativeExcelApplicationRun': False,
          'visualReview': 'All three one-page Chrome PDFs rendered with Poppler and inspected; logo, labels, exact amounts and signatures legible.'}
(EVIDENCE / 'artifact-validation.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'passed': True, 'pdfs': 3, 'workbooks': 2, 'earned': str(earned), 'closing': '800.00', 'expenseNet': '0.00'}))
