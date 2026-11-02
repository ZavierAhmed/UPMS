"""Read-only verification of actual Chrome PDFs and the downloaded Excel archive."""
from pathlib import Path
import json
import warnings
import pdfplumber
import openpyxl

evidence = Path('docs/phase-3.1/evidence')
results = {}
for paper, dimensions, expected_pages in [('A4', (842, 595), 4), ('A3', (1191, 842), 2)]:
    with pdfplumber.open(f'output/pdf/UPMS-Hafta-synthetic-{paper}.pdf') as pdf:
        texts = [p.extract_text() or '' for p in pdf.pages]
        assert len(pdf.pages) == expected_pages
        assert all((round(p.width), round(p.height)) == dimensions for p in pdf.pages)
        assert all(t.strip() for t in texts), 'Unexpected blank print page'
        text = '\n'.join(texts)
        for name in ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta']:
            assert name in text
        assert text.count('BALANCE') >= 8
        assert 'UNVERIFIED' in text and 'SYNTHETIC TEST DATA' in ' '.join(text.split())
        for p in pdf.pages:
            assert all(c['x0'] >= 0 and c['x1'] <= p.width + 1 and c['top'] >= 0 and c['bottom'] <= p.height + 1 for c in p.chars)
        results[paper] = {'pages': len(pdf.pages), 'landscapeDimensionsPoints': dimensions, 'blankPages': 0, 'allEightPartiesPresent': True, 'textWithinPageBounds': True}
with pdfplumber.open('tmp/pdfs/hafta-stress.pdf') as pdf:
    text = '\n'.join(p.extract_text() or '' for p in pdf.pages)
    for i in range(1, 37):
        assert f'SYNTHETIC-LINE-{i:03d}' in text, f'Lost row {i} in print pagination'
    assert '121.60' in text
    results['tallParty'] = {'pages': len(pdf.pages), 'all36RowsPresent': True, 'closingBalancePresent': True}
with warnings.catch_warnings():
    warnings.simplefilter('ignore', UserWarning)
    wb = openpyxl.load_workbook(evidence / 'UPMS-Hafta.xlsx', data_only=False)
sheet = wb.active
rows = list(sheet.values)
assert all(c.data_type != 'f' for row in sheet for c in row)
assert sum(1 for row in rows if len(row) > 3 and row[3] == 'TOTAL · net weekly sales') == 8
assert any(row[3] == 'BALANCE' and row[6] == 'UNVERIFIED' for row in rows if len(row) > 6)
assert any(row[3] == 'Client receipts (not advances)' and str(row[6]) in ['10', '10.0'] for row in rows if len(row) > 6)
results['excel'] = {'openedWithOpenpyxl': True, 'partySections': 8, 'noFormulas': True, 'unverifiedBalancesPreserved': True, 'receiptsSeparateFromAdvances': True}
results['passed'] = True
(evidence / 'artifact-verification.json').write_text(json.dumps(results, indent=2), encoding='utf-8')
print(json.dumps(results))
