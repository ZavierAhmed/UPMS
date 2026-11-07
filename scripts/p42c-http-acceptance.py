"""Real HTTPS -> local PHP HTTP server acceptance, with synthetic private credentials."""
import concurrent.futures
import datetime
import http.client
import json
import os
import mimetypes
import re
from pathlib import Path
import secrets
import ssl
import subprocess
import sys
import threading
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

directory = Path(sys.argv[1])
fixture = json.loads((directory / 'fixture.json').read_text())
php = str(Path.home() / '.cache/upms-php81-local/bin/php')

def operation(mode):
    completed = subprocess.run([php, 'upms.php/tests/Support/p42c-workspace.php', mode],
                               capture_output=True, text=True,
                               env={**os.environ, 'LD_LIBRARY_PATH': str(Path.home()/'.cache/upms-php81-local/root/usr/lib/x86_64-linux-gnu')})
    if completed.returncode:
        diagnostic=directory/('diagnostic-'+mode+'.log')
        diagnostic.write_text(completed.stderr)
        os.chmod(diagnostic,0o600)
        codes=re.findall(r'(?:RuntimeException|ApiError): ([A-Z][A-Z0-9_]+)',completed.stderr)
        raise RuntimeError(mode+' failed '+(','.join(codes) or 'private diagnostic retained'))
    return json.loads(completed.stdout)

subprocess.run(['openssl', 'req', '-x509', '-newkey', 'rsa:2048', '-nodes',
                '-keyout', str(directory/'tls.key'), '-out', str(directory/'tls.crt'),
                '-days', '2', '-subj', '/CN=app.unique-plastic.com',
                '-addext', 'subjectAltName=DNS:app.unique-plastic.com,IP:127.0.0.1'],
               check=True, capture_output=True)
os.chmod(directory/'tls.key', 0o600)

class Gateway(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def do_request(self):
        path=self.path.split('?',1)[0]
        if path == '/management' or path.startswith('/management/'):
            if re.fullmatch(r'/management/assets/[A-Za-z0-9_.-]+\.(?:js|css|svg)',path):
                target=Path('upms.client/dist')/path.lstrip('/')
            else:
                target=Path('upms.client/dist/management/index.html')
            content = target.read_bytes()
            self.send_response(200)
            self.send_header('Content-Type', mimetypes.guess_type(target)[0] or 'application/octet-stream')
            self.send_header('Content-Length', str(len(content)))
            self.end_headers()
            self.wfile.write(content)
            return
        connection = http.client.HTTPConnection('127.0.0.1', 5291, timeout=60)
        headers = {key: value for key, value in self.headers.items()
                   if key.lower() not in ('connection', 'x-p42c-tls-proof')}
        headers['X-P42C-TLS-Proof'] = fixture['tlsProof']
        data = self.rfile.read(int(self.headers.get('Content-Length', '0')))
        connection.request(self.command, self.path, data, headers)
        response = connection.getresponse()
        content = response.read()
        self.send_response(response.status)
        for key, value in response.getheaders():
            if key.lower() not in ('connection', 'transfer-encoding', 'content-length'):
                self.send_header(key, value)
        self.send_header('Content-Length', str(len(content)))
        self.end_headers()
        self.wfile.write(content)
        connection.close()

    do_GET = do_POST = do_PATCH = do_request

server = ThreadingHTTPServer(('127.0.0.1', 5292), Gateway)
tls = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
tls.load_cert_chain(directory/'tls.crt', directory/'tls.key')
server.socket = tls.wrap_socket(server.socket, server_side=True)
threading.Thread(target=server.serve_forever, daemon=True).start()
context = ssl.create_default_context(cafile=str(directory/'tls.crt'))
checks = []
base = '/api/v1/management'
origin = 'https://app.unique-plastic.com'
today = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=5))).date().isoformat()

class Client:
    def __init__(self):
        self.cookie = ''
        self.csrf = ''

    def request(self, method, path, data=None, key=None, extra=None):
        headers = {'Host': 'app.unique-plastic.com', 'Accept': 'application/json'}
        if self.cookie:
            headers['Cookie'] = self.cookie
        body = None
        if method != 'GET':
            body = json.dumps(data or {})
            headers.update({'Content-Type': 'application/json', 'Origin': origin,
                            'X-CSRF-Token': self.csrf, 'Idempotency-Key': key or str(uuid.uuid4())})
        headers.update(extra or {})
        connection = http.client.HTTPSConnection('127.0.0.1', 5292, context=context, timeout=90)
        connection.request(method, base+path, body, headers)
        response = connection.getresponse()
        payload = response.read()
        for name, value in response.getheaders():
            if name.lower() == 'set-cookie':
                assert 'secure' in value.lower() and 'httponly' in value.lower() and 'samesite=strict' in value.lower()
                self.cookie = value.split(';')[0]
        status = response.status
        connection.close()
        result = json.loads(payload) if payload else None
        if isinstance(result, dict) and 'csrfToken' in result:
            self.csrf = result['csrfToken']
        return status, result

    def ok(self, method, path, data=None, key=None):
        status, result = self.request(method, '/simple-v1'+path, data, key)
        assert status in (200, 201), (path, status, result)
        return result

    def login(self, name, password):
        preflight=self.request('GET', '/session/csrf')
        assert preflight[0] == 200, preflight
        status, result = self.request('POST', '/session/login', {'username': name, 'password': password})
        assert status == 200, (status, result)
        return result

try:
    assert operation('negative')['contractRejections']==5
    checks.append('Wrong server, wrong reference, altered evidence, absent activation approval and extra table grant rejected')
    clients = [Client(), Client()]
    for client, name in zip(clients, ['admin', 'haris']):
        login = client.login(name, fixture['passwords'][name])
        assert login['user']['passwordChangeRequired']
        assert client.request('GET', '/simple-v1/state')[0] == 403
        replacement = secrets.token_hex(24)
        assert client.request('POST', '/profile/password',
                              {'currentPassword': fixture['passwords'][name], 'newPassword': replacement})[0] == 204
        assert client.request('GET', '/session/current')[0] == 401
        login = client.login(name, replacement)
        assert not login['user'].get('passwordChangeRequired',False)
        assert 'administrator' in login['user']['roles']
        client.ok('GET', '/state')
        assert client.request('POST', '/simple-v1/parties', {'kind':'CLIENT','name':'Before approval'})[0] == 503
    checks.append('Two production-profile administrators independently rotated passwords and inspected readiness; posting rejected before approval')
    assert clients[0].request('GET', '/session/current', extra={'Host':'unique-plastic.com'})[0] == 404
    assert clients[0].request('POST', '/session/logout', extra={'Origin':'https://evil.example'})[0] == 403
    assert clients[0].request('POST', '/session/logout', extra={'X-CSRF-Token':'invalid'})[0] == 403
    checks.append('Exact Host, Origin, secure cookies and CSRF enforced over real HTTPS and PHP HTTP')
    activation = operation('activate')
    assert activation['state'] == 'CUMULATIVE_ACTIVE'
    a, b = clients
    with concurrent.futures.ThreadPoolExecutor() as pool:
        assert all(result is not None for result in pool.map(lambda c:c.ok('GET','/state'), clients))
    employee = a.ok('POST','/expense-masters/employees',{'name':'Synthetic production employee'})
    item = a.ok('POST','/items',{'description':'Synthetic production bottle','sellingPrice':'7.00'})
    a.ok('POST','/employee-hafta/openings',{'employeeId':employee['id'],'date':today,'amount':'0.00',
         'reference':'P42C-LABOR-OPEN','reason':'Verified synthetic no prior wages','approved':True})
    def draft(data):
        return a.ok('POST','/documents',{'date':today,**data})
    def document(data):
        record=draft(data)
        return a.ok('POST','/documents/'+record['id']+'/post',{'version':1})
    production=draft({'kind':'PRODUCTION','reference':'P42C-FIRST','productionEmployeeId':employee['id'],
                      'lines':[{'itemId':item['id'],'quantity':'200','rate':'0','laborRate':'10.00'}]})
    post={'version':1,'initialStockOpenings':[{'itemId':item['id'],'date':today,'confirmed':True}]}
    key=str(uuid.uuid4())
    first=a.ok('POST','/documents/'+production['id']+'/post',post,key)
    assert a.ok('POST','/documents/'+production['id']+'/post',post,key)==first
    money=a.ok('GET','/money')
    accounts={row['code']:row['id'] for row in money['accounts']}
    for code, amount in [('HARIS_CASH','5000.00'),('JUNAID_CASH','1000.00'),('UBL_OFFICIAL','0.00')]:
        a.ok('POST','/money/openings',{'date':today,'approved':True,'reason':'Verified synthetic balance',
             'accountId':accounts[code],'amount':amount,'reference':'P42C-'+code})
    client=a.ok('POST','/parties',{'kind':'CLIENT','name':'Synthetic customer'})
    vendor=a.ok('POST','/parties',{'kind':'VENDOR','name':'Synthetic supplier'})
    document({'kind':'CLIENT_OPENING','partyId':client['id'],'amount':'0.00','direction':'OWED_TO_COMPANY'})
    document({'kind':'VENDOR_OPENING','partyId':vendor['id'],'amount':'100.00','direction':'OWED_BY_COMPANY'})
    document({'kind':'PURCHASE','partyId':vendor['id'],'reference':'P42C-PURCHASE',
              'lines':[{'itemId':item['id'],'quantity':'5','rate':'4.00'}]})
    challan=document({'kind':'CHALLAN','partyId':client['id'],'customChallanNumber':'P42C-001',
                       'lines':[{'itemId':item['id'],'quantity':'10','rate':'7.00'}]})
    document({'kind':'CLIENT_PAYMENT','partyId':client['id'],'method':'CASH','moneyAccountId':accounts['HARIS_CASH'],
              'amount':'10.00','reference':'P42C-CUSTOMER-PAYMENT'})
    document({'kind':'VENDOR_PAYMENT','partyId':vendor['id'],'method':'CASH','moneyAccountId':accounts['HARIS_CASH'],
              'amount':'20.00','reference':'P42C-SUPPLIER-PAYMENT'})
    category=a.ok('POST','/expense-masters/categories',{'name':'Synthetic transport','employeeBased':False})
    document({'kind':'EXPENSE','categoryId':category['id'],'amount':'5.00','paymentStatus':'PAID','method':'CASH',
              'moneyAccountId':accounts['HARIS_CASH'],'description':'Synthetic transport expense',
              'payee':'Synthetic carrier','reference':'P42C-EXPENSE','expensePurpose':'BUSINESS_EXPENSE'})
    labor=a.ok('GET','/employee-hafta?employeeId='+employee['id']+'&from='+today+'&to='+today)
    assert labor['blocks'][0]['closing']=='2000.00'
    a.ok('POST','/employee-hafta/payments',{'employeeId':employee['id'],'date':today,'amount':'100.00',
         'moneyAccountId':accounts['HARIS_CASH'],'method':'CASH','reference':'P42C-LABOR-PAYMENT',
         'reason':'Actual synthetic earned labor settlement','approved':True})
    assert a.ok('GET','/employee-hafta?employeeId='+employee['id']+'&from='+today+'&to='+today)['blocks'][0]['closing']=='1900.00'
    checks.append('Production, first stock initialization, purchase, challan, customer and vendor payments, cash/bank openings, expense and Hafta earnings')
    bank=a.ok('POST','/cheque-banks',{'code':'P42CBANK','name':'Synthetic issuing bank','description':'Synthetic staging only'})
    instrument={'clientId':client['id'],'issuingBankId':bank['id'],'drawerName':'Synthetic drawer',
                'drawerAccount':'P42CACCOUNT01','number':'0004242','chequeDate':today,'receivedDate':today,'amount':'60.00'}
    assert a.request('POST','/simple-v1/cheques',{**instrument,'attachments':[{}]})[0]==403
    cheque=a.ok('POST','/cheques',instrument)
    action={'date':today,'reference':'P42C-STATEMENT','reason':'Synthetic bank statement reviewed','evidence':'Synthetic independent bank confirmation'}
    a.ok('POST','/cheques/'+cheque['id']+'/deposited',{**action,'bankId':accounts['UBL_OFFICIAL']})
    status,_=a.request('POST','/simple-v1/cheques/'+cheque['id']+'/cleared',{**action,'approved':True})
    assert status==403
    clear={**action,'approved':True,'selfApprovalReason':'Explicit synthetic exceptional approval recorded'}
    key=str(uuid.uuid4())
    with concurrent.futures.ThreadPoolExecutor() as pool:
        results=list(pool.map(lambda _:a.ok('POST','/cheques/'+cheque['id']+'/cleared',clear,key),range(2)))
    assert results[0]==results[1]
    bad=draft({'kind':'CHALLAN','partyId':client['id'],'lines':[{'itemId':item['id'],'quantity':'9999','rate':'7.00'}]})
    assert a.request('POST','/simple-v1/documents/'+bad['id']+'/post',{'version':1})[0]==409
    assert a.ok('GET','/reconciliation')['matched']
    assert a.ok('GET','/cheques')['reconciliation']['matched']
    checks.append('Cheque receipt/deposit/clearance, denied self-approval, concurrent idempotency and insufficient-stock rollback')
    for path in ['/register','/expense-reports?from='+today+'&to='+today,'/ledgers/'+client['id'],
                 '/ledgers/'+vendor['id'],'/documents/'+challan['id']]:
        a.ok('GET',path)
    checks.append('Financial, expense, client/vendor and challan report data')
    recovery=operation('recover')
    assert recovery['passed'] and recovery['allRowsIdentical'] and recovery['tamperRejected']
    native=operation('verify')
    assert native['guards']==133 and native['nativeMutationRejections']==6
    assert native['stock']==['195']
    assert native['balances']=={'CHEQUES':'0.00','HARIS_CASH':'4885.00','JUNAID_CASH':'1000.00','UBL_OFFICIAL':'60.00'}
    assert native['parties']==[{'kind':'CLIENT','balance':'0.00'},{'kind':'VENDOR','balance':'-100.00'}]
    assert native['clearances']==1 and native['moneyBatches']==8
    public_key=subprocess.run(['openssl','x509','-in',str(directory/'tls.crt'),'-pubkey','-noout'],capture_output=True,check=True).stdout
    der=subprocess.run(['openssl','pkey','-pubin','-outform','DER'],input=public_key,capture_output=True,check=True).stdout
    import hashlib,base64
    spki=base64.b64encode(hashlib.sha256(der).digest()).decode()
    node='/mnt/c/Users/zasah/source/repos/UPMS/tmp/production-readiness/node22/node_modules/node/bin/node.exe'
    browser=subprocess.run([node,'C:\\Users\\zasah\\source\\repos\\UPMS\\scripts\\p42c-reports.mjs'],
        input=json.dumps({'cookie':a.cookie,'spki':spki,'challan':challan['id'],'employee':employee['id'],'date':today}),
        text=True,capture_output=True)
    Path('tmp/phase-4.2c/browser.log').write_text(browser.stdout+browser.stderr)
    assert browser.returncode==0, 'Chrome report acceptance failed; see isolated browser.log'
    checks.append('Real Chrome management, PDF printing and Excel downloads')
    for c in clients:
        old=c.cookie
        assert c.request('POST','/session/logout')[0]==204
        c.cookie=old
        assert c.request('GET','/session/current')[0]==401
    checks.append('Both independent sessions revoked after logout')
    result={'passed':True,'productionConfigured':True,'realPhpHttpServer':True,'tlsVerified':True,
            'checks':checks,'tables':47,'guards':133,'recovery':recovery,'independentFinancialOracle':native,'liveHostingContacted':False}
    Path('tmp/phase-4.2c/http-acceptance.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps({'passed':True,'checks':len(checks),'tables':47,'guards':133}))
finally:
    server.shutdown()
