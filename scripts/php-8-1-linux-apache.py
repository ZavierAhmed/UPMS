import pwd, grp, os, pathlib, subprocess, time, json, http.client, shutil, socket
base=pathlib.Path.home()/'.cache/upms-php81-local'
run=base/('apache-fixture-'+str(int(time.time())))
public=run/'public'; management=public/'dashboard';management.mkdir(parents=True)
repo=pathlib.Path.cwd()
for src,target in [('public',public),('management',management)]:shutil.copyfile(repo/'deployment/layout'/src/'.htaccess',target/'.htaccess')
(public/'index.html').write_text('PUBLIC_FIXTURE');(management/'index.html').write_text('MANAGEMENT_FIXTURE');(public/'.env').write_text('NEVER_SERVE');(management/'.env').write_text('NEVER_SERVE')
port=9795
with socket.socket() as s:s.bind(('127.0.0.1',port))
apache_root=base/'apache-native/root'
modules=apache_root/'usr/lib/apache2/modules'
(run/'mime.types').write_text('text/html html\\napplication/javascript js\\ntext/css css\\n')
conf=run/'httpd.conf'
conf.write_text(f'''ServerRoot "{run}"
Listen 127.0.0.1:{port}
ServerName unique-plastic.com
PidFile "{run}/httpd.pid"
ErrorLog "{run}/error.log"
LogLevel debug
User {pwd.getpwuid(os.getuid()).pw_name}
Group {grp.getgrgid(os.getgid()).gr_name}
'''+''.join(f'LoadModule {name}_module "{modules}/mod_{name}.so"\n' for name in ['mpm_event','authz_core','rewrite','headers','dir','mime'])+f'''
TypesConfig "{run}/mime.types"
<Directory "{run}">
Options FollowSymLinks
AllowOverride All
Require all granted
DirectoryIndex index.html
</Directory>
<VirtualHost 127.0.0.1:{port}>
ServerName unique-plastic.com
DocumentRoot "{public}"
</VirtualHost>
<VirtualHost 127.0.0.1:{port}>
ServerName app.unique-plastic.com
DocumentRoot "{management}"
</VirtualHost>
''')
env=dict(os.environ,LD_LIBRARY_PATH=str(apache_root/'usr/lib/x86_64-linux-gnu'))
process=subprocess.Popen([str(apache_root/'usr/sbin/apache2'),'-X','-f',str(conf)],env=env,stdout=subprocess.DEVNULL,stderr=(run/'stderr.log').open('w'))
def request(host,path):
 conn=http.client.HTTPConnection('127.0.0.1',port,timeout=2)
 try:conn.request('GET',path,headers={'Host':host});r=conn.getresponse();return r.status,dict(r.getheaders()),r.read().decode()
 finally:conn.close()
checks=0
try:
 for n in range(200):
  try:request('unique-plastic.com','/');break
  except OSError:time.sleep(.1)
 cases=[('unique-plastic.com','/',200,'PUBLIC_FIXTURE'),('app.unique-plastic.com','/',200,'MANAGEMENT_FIXTURE'),('app.unique-plastic.com','/management/items',200,'MANAGEMENT_FIXTURE'),('unique-plastic.com','/management/',403,None),('unique-plastic.com','/dashboard/',403,None),('unique-plastic.com','/dashboard/index.html',403,None),('unique-plastic.com','/%64ashboard/',403,None),('unique-plastic.com','/.env',403,None),('app.unique-plastic.com','/.env',403,None),('app.unique-plastic.com','/vendor/composer/installed.json',403,None),('evil.example','/',403,None),('app.unique-plastic.com.evil.example','/',403,None),('unique-plastic.com','/api/v1/management/session/csrf',403,None)]
 for host,path,expected,marker in cases:
  status,headers,body=request(host,path);assert status==expected,(host,path,status,body[:100]);assert 'NEVER_SERVE' not in body
  if marker:assert body==marker
  if host=='app.unique-plastic.com':
   lower={k.lower():v for k,v in headers.items()};assert lower['cache-control']=='no-store';assert lower['x-frame-options']=='DENY';assert "frame-ancestors 'none'" in lower['content-security-policy'];assert 'noindex' in lower['x-robots-tag']
  checks+=1
 result={'passed':True,'checks':checks,'platform':'Linux Apache','productionContacted':False,'actualGoDaddyRewritesVerified':False,'phpHandlerVerified':False}
 (repo/'tmp/php-runtime/php81-linux-apache.json').write_text(json.dumps(result,indent=2));print(json.dumps(result))
except Exception:
 print('Apache exit:', process.poll())
 print((run/'stderr.log').read_text())
 if (run/'error.log').exists(): print((run/'error.log').read_text())
 raise
finally:
 process.terminate()
 try:process.wait(5)
 except subprocess.TimeoutExpired:process.kill();process.wait()
