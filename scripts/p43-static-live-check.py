from concurrent.futures import ThreadPoolExecutor
from urllib.request import urlopen, Request
from urllib.error import HTTPError
from zipfile import ZipFile
from pathlib import Path
import hashlib, json

base='https://unique-plastic.com'
provider_injection=b"<script>'undefined'=== typeof _trfq || (window._trfq = []);'undefined'=== typeof _trfd && (window._trfd=[]),_trfd.push({'tccl.baseHost':'secureserver.net'},{'ap':'cpsh-oh'},{'server':'sg2plzcpnl508885'},{'dcenter':'sg2'},{'cp_id':'11060031'},{'cp_cl':'8'}) // Monitoring performance to make your website faster. If you want to opt-out, please contact web hosting support.</script><script src='https://img1.wsimg.com/traffic-assets/js/tccl.min.js'></script>"
with ZipFile('tmp/phase-4.2a/static/upms-public-static.zip') as z:
    manifest=json.loads(z.read('release-manifest.json'))
    targets={}
    for path,digest in manifest['files'].items():
        if path.startswith('_site/') or path.startswith('.'):
            continue
        targets['/'+path]=digest
    targets['/']=targets.pop('/index.html')
    for route in manifest['routes']:
        if route!='/':
            targets[route]=manifest['files']['_site/'+route.strip('/').replace('/','-')+'.html']
    homepage=z.read('index.html').decode()
def check(item):
    path,expected=item
    try:
        with urlopen(Request(base+path,headers={'User-Agent':'UPMS-Release-Acceptance/1.0'}),timeout=25) as r:
            data=r.read();status=r.status
    except HTTPError as e:
        data=e.read();status=e.code
    except Exception as e:
        return dict(path=path,passed=False,error=type(e).__name__)
    digest=hashlib.sha256(data).hexdigest()
    transformed=provider_injection in data
    normalized=data.replace(provider_injection,b'',1) if transformed else data
    normalized_digest=hashlib.sha256(normalized).hexdigest()
    return dict(path=path,status=status,passed=(status==200 and normalized_digest==expected) if expected else status in (403,404),
                sha256=digest,payloadSha256=normalized_digest,exactProviderTelemetryInjection=transformed,
                providerChallenge=b'One moment, please' in data)
with ThreadPoolExecutor(max_workers=6) as pool:
    checks=list(pool.map(check,targets.items()))
    denials=list(pool.map(check,[(p,None) for p in ['/gateway.php','/inquiry.php','/.env','/private/config.json','/vendor/autoload.php','/dashboard/','/not-a-real-upms-route']]))
contacts=dict(phone=('923152209511' in homepage.replace(' ','')),whatsapp=('923142113472' in homepage.replace(' ','')))
report=dict(passed=all(x['passed'] for x in checks+denials) and all(contacts.values()),origin=base,
            expectedArchiveSha256='6f3ef919bacb29139c21bc165ec2891978912c70746e07ca5d1de7982a394525',
            checkedFilesAndRoutes=len(checks),pdfDownloads=sum(p.endswith('.pdf') for p in targets),contacts=contacts,
            checks=checks,denials=denials)
Path('tmp/phase-4.3/static-live-acceptance.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k not in ['checks','denials']}))
print(json.dumps(dict(failures=[x for x in checks+denials if not x['passed']])))
if not report['passed']:
    raise SystemExit(1)
