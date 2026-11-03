"""Render every UAT-1 PDF page and make labeled visual-review sheets."""
from pathlib import Path
import subprocess,json,hashlib
from PIL import Image,ImageOps,ImageDraw
poppler=Path(r'C:\Users\zasah\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\poppler\Library\bin\pdftoppm.exe')
out=Path('tmp/pdfs/uat1a-final');out.mkdir(parents=True,exist_ok=True)
items=[]
for pdf in sorted(Path('output/pdf/uat-1a').glob('*.pdf')):
    prefix=out/pdf.stem
    for stale in out.glob(pdf.stem+'-*.png'):
        if stale.stem[len(pdf.stem)+1:].isdigit(): stale.unlink()
    subprocess.run([str(poppler),'-scale-to','1100','-png',str(pdf),str(prefix)],check=True,capture_output=True)
    pages=sorted(p for p in out.glob(pdf.stem+'-*.png') if p.stem[len(pdf.stem)+1:].isdigit())
    for p in pages: items.append((pdf,p))
sheets=[]
for i in range(0,len(items),4):
    sheet=Image.new('RGB',(2200,1660),'#d9d9d9');draw=ImageDraw.Draw(sheet)
    for n,(pdf,p) in enumerate(items[i:i+4]):
        im=Image.open(p).convert('RGB');im.thumbnail((1080,780))
        x=(n%2)*1100+10;y=(n//2)*830+35
        sheet.paste(im,(x,y));draw.text((x,y-25),p.name,fill='black')
    target=out/('review-'+str(i//4+1)+'.png');sheet.save(target);sheets.append(str(target))
Path('docs/uat-1a/evidence/visual-review.json').write_text(json.dumps({'renderedPages':len(items),'sheets':sheets,'reviewed':False,'pdfSha256':{str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(Path('output/pdf/uat-1a').glob('*.pdf'))}},indent=2)+'\n')
print(json.dumps({'pages':len(items),'sheets':sheets}))
