"""Deterministic A4 sheets from scripts/product-pdf-data.mjs output.
Requires ReportLab + Pillow. Does not read source brochures or owner records.
"""
import json, hashlib, re
from pathlib import Path
from html import escape
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader

ROOT=Path(__file__).resolve().parent.parent
data=json.loads((ROOT/'tmp/uat3a/pdf-input/catalog.json').read_text(encoding='utf8'))
out=ROOT/'upms.client/public/downloads/products/v1'
out.mkdir(parents=True,exist_ok=True)
delivery=ROOT/'output/pdf'; delivery.mkdir(parents=True,exist_ok=True)
W,H=A4; graphite=HexColor('#242a2f'); orange=HexColor('#df6a0e'); muted=HexColor('#50585b')
style=ParagraphStyle('copy',fontName='Helvetica',fontSize=10,leading=15,textColor=graphite)
small=ParagraphStyle('small',parent=style,fontSize=8.5,leading=12,textColor=muted)
def clean(text): return re.sub('[\u2010-\u2015]','-',text).replace('\u2019',"'")
def paragraph(c,text,x,top,width,sty=style):
 p=Paragraph(escape(clean(text)),sty); _,height=p.wrap(width,1000);p.drawOn(c,x,top-height);return top-height
manifest={'version':1,'documents':{}}
for p in data['products']:
 name=f"unique-plastic-{p['id']}-product-information.pdf"; path=out/name
 c=canvas.Canvas(str(path),pagesize=A4,invariant=1,pageCompression=1)
 c.setTitle(p['title']+' | Unique Plastic Industry');c.setAuthor('Unique Plastic Industry');c.setSubject('Product information - approved catalog, version 1')
 c.setFillColor(graphite);c.rect(0,H-16,W,16,fill=1,stroke=0)
 c.drawImage(data['logo'],40,H-112,width=94,height=72,preserveAspectRatio=True,anchor='c',mask='auto')
 c.setFillColor(graphite);c.setFont('Helvetica-Bold',15);c.drawString(150,H-64,data['company']['name'])
 c.setFillColor(orange);c.setFont('Helvetica-Bold',9);c.drawString(150,H-85,'PRODUCT INFORMATION  /  V1')
 c.setStrokeColor(orange);c.setLineWidth(2);c.line(40,H-120,W-40,H-120)
 c.setFillColor(graphite);c.setFont('Helvetica-Bold',29);c.drawString(40,H-163,p['title'])
 c.setFillColor(HexColor('#faf7f1'));c.roundRect(40,H-376,W-80,190,8,fill=1,stroke=0)
 c.drawImage(ImageReader(p['pdfImage']),55,H-365,width=W-110,height=168,preserveAspectRatio=True,anchor='c',mask='auto')
 caption=p['catalogImage']['caption'] if p['catalogImage'] and p['catalogImage'].get('imageKind') else ('Illustration only - not a product photograph.' if p['illustration'] else 'Product photograph from the approved company catalog.')
 paragraph(c,caption,40,H-392,W-80,small)
 y=paragraph(c,p['description'],40,H-424,W-80)-15
 c.setFillColor(orange);c.setFont('Helvetica-Bold',10);c.drawString(40,y,'CATALOG CAPACITIES' if p['capacities'] else 'SIZING & SPECIFICATIONS');y-=17
 if p['capacities']:
  c.setFillColor(graphite);c.setFont('Helvetica-Bold',13);c.drawString(40,y,'  /  '.join(p['capacities']));y-=19
 y=paragraph(c,p['capacityNote'],40,y,W-80)-15
 c.setFillColor(orange);c.setFont('Helvetica-Bold',10);c.drawString(40,y,'APPLICATIONS TO DISCUSS');y-=16
 y=paragraph(c,' / '.join(p['uses']),40,y,W-80)-15
 c.setFillColor(orange);c.setFont('Helvetica-Bold',10);c.drawString(40,y,'YOUR INQUIRY');y-=16
 y=paragraph(c,'Please share: '+ '; '.join(p['discussion'])+'.',40,y,W-80)
 if y<167: raise ValueError(f'Content overlaps contact panel: {p["id"]} {y}')
 c.setFillColor(graphite);c.roundRect(40,46,W-80,112,6,fill=1,stroke=0)
 c.setFillColor(HexColor('#ffffff'));c.setFont('Helvetica-Bold',10);c.drawString(54,138,'LET\'S DISCUSS YOUR PACKAGING')
 c.setFont('Helvetica',9)
 company=data['company']
 lines=[('Primary: '+company['phones'][0]['label']+'   |   Secondary: '+company['phones'][1]['label'],None),('WhatsApp: '+company['whatsappLabel'],'https://wa.me/'+company['whatsappNumber']),('Email: '+company['email'],'mailto:'+company['email']), (company['address'],None)]
 for i,(text,url) in enumerate(lines):
  yy=118-i*17;c.drawString(54,yy,text)
  if url:c.linkURL(url,(54,yy-3,W-54,yy+10),relative=0)
 c.setFillColor(muted);c.setFont('Helvetica',7.5);c.drawString(40,28,'Confirm current availability, specifications and suitability directly with our team.');c.drawRightString(W-40,28,'1 / 1')
 c.showPage();c.save();blob=path.read_bytes();(delivery/name).write_bytes(blob)
 manifest['documents'][p['id']]={'title':p['title'],'url':'/downloads/products/v1/'+name,'filename':name,'mime':'application/pdf','bytes':len(blob),'sha256':hashlib.sha256(blob).hexdigest(),'imageKind':p['catalogImage'].get('imageKind','approved catalog photograph') if p['catalogImage'] else 'illustration','imageSource':p['image'],'catalogSource':p['source']}
encoded=json.dumps(manifest,indent=2,ensure_ascii=False)+'\n'
for target in ['upms.client/public/product-documents.json','upms.client/src/data/productDocuments.json']:(ROOT/target).write_text(encoded,encoding='utf8')
print('Generated five deterministic A4 product PDFs and synchronized manifest.')
