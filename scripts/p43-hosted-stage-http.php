<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'||gethostname()!=='sg2plzcpnl508885.prod.sin2.secureserver.net'){exit(1);}
ini_set('zend.exception_ignore_args','1');umask(0077);
$root='/home/tsn6az96j3v7/upms-releases/p43/management-570362622816';$dir='/home/tsn6az96j3v7/upms-private/p43/stage43';
$name='p43-acceptance-'.bin2hex(random_bytes(12)).'.php';$file='/home/tsn6az96j3v7/public_html/dashboard/'.$name;$token=bin2hex(random_bytes(24));
$checks=[];
function check43(bool $condition,string $label):void{global $checks;if(!$condition){throw new RuntimeException($label);} $checks[]=$label;}
try{
 foreach(['bootstrap/cache','storage/framework/views','storage/framework/sessions','storage/framework/cache','storage/logs'] as $d){if(!is_dir($root.'/private/backend/'.$d)){mkdir($root.'/private/backend/'.$d,0700,true);}}
 if(!file_exists($dir.'/runtime.env')){
  file_put_contents($dir.'/runtime.env',"APP_ENV=production\nAPP_DEBUG=false\nAPP_KEY=base64:".base64_encode(random_bytes(32))."\nUPMS_PRODUCTION_PROFILE=$dir/runtime.json\nUPMS_ORIGIN=https://app.unique-plastic.com\nUPMS_ENABLED=true\nUPMS_ENFORCE_HOST_BOUNDARY=true\nINQUIRY_MODE=Disabled\nUPMS_MONEY_ACCOUNTS_ENABLED=true\nUPMS_EXPENSE_MASTERS_ENABLED=true\nUPMS_EMPLOYEE_HAFTA_ENABLED=true\nUPMS_LABOR_CLASSIFICATION_ENABLED=true\nUPMS_CHEQUE_MANAGEMENT_ENABLED=true\nUPMS_CHEQUE_EXTRAS_ENABLED=true\nUPMS_FINANCIAL_REFUNDS_ENABLED=true\n");chmod($dir.'/runtime.env',0600);
 }
 // An authenticated temporary front controller, on the real TLS vhost. It never changes TLS or Host metadata.
 $gateway='<?php if(!hash_equals('.var_export(hash('sha256',$token),true).',hash("sha256",$_SERVER["HTTP_X_UPMS_ACCEPTANCE"]??""))){http_response_code(404);exit;}'
  .'$route=$_SERVER["HTTP_X_UPMS_STAGE_ROUTE"]??"";if(!preg_match("~^/api/v1/management/[a-zA-Z0-9/_?=&.-]+$~D",$route)){http_response_code(404);exit;}'
  .'unset($_SERVER["HTTP_X_UPMS_ACCEPTANCE"],$_SERVER["HTTP_X_UPMS_STAGE_ROUTE"]);$_SERVER["REQUEST_URI"]=$route;'
  .'require '.var_export($root.'/private/backend/vendor/autoload.php',true).';$app=require '.var_export($root.'/private/backend/bootstrap/app.php',true).';'
  .'$app->useEnvironmentPath('.var_export($dir,true).');$app->loadEnvironmentFrom("runtime.env");$app->handleRequest(Illuminate\\Http\\Request::capture());';
 // PHP namespace separators in source must be single backslashes.
 $gateway=str_replace('Illuminate\\\\Http\\\\Request','Illuminate\\Http\\Request',$gateway);
 if(file_exists($file)||file_put_contents($file,$gateway)!==strlen($gateway)){throw new RuntimeException('STAGE_GATEWAY_WRITE_FAILED');}chmod($file,0644);
 $request=function(array &$session,string $method,string $path,?array $data=null,array $extra=[])use($name,$token):array{
  $headers=['Accept: application/json','X-Upms-Acceptance: '.$token,'X-Upms-Stage-Route: /api/v1/management'.$path];
  if(isset($session['cookie'])){$headers[]='Cookie: '.$session['cookie'];}
  if($method!=='GET'){$headers[]='Content-Type: application/json';$headers[]='Origin: https://app.unique-plastic.com';$headers[]='X-CSRF-Token: '.($session['csrf']??'');}
  array_push($headers,...$extra);$received=[];
  $c=curl_init('https://app.unique-plastic.com/'.$name);
  curl_setopt_array($c,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>30,CURLOPT_RESOLVE=>['app.unique-plastic.com:443:184.168.100.110'],CURLOPT_CUSTOMREQUEST=>$method,CURLOPT_HTTPHEADER=>$headers,
   CURLOPT_HEADERFUNCTION=>function($c,$line)use(&$received){$received[]=$line;return strlen($line);}]);
  if($data!==null){curl_setopt($c,CURLOPT_POSTFIELDS,json_encode((object)$data,JSON_THROW_ON_ERROR));}
  $body=curl_exec($c);$status=curl_getinfo($c,CURLINFO_RESPONSE_CODE);$error=curl_errno($c);curl_close($c);
  if($error){throw new RuntimeException('STAGE_TLS_TRANSPORT_FAILED');}
  foreach($received as $h){if(stripos($h,'Set-Cookie:')===0){
   check43(stripos($h,'Secure')!==false&&stripos($h,'HttpOnly')!==false&&stripos($h,'SameSite=Strict')!==false,'SECURE_COOKIE_ATTRIBUTES');
   $session['cookie']=explode(';',trim(substr($h,11)))[0];
  }}
  $j=is_string($body)?json_decode($body,true):null;if(isset($j['csrfToken'])){$session['csrf']=$j['csrfToken'];}
  return [$status,$j];
 };
 $passwords=json_decode(file_get_contents($dir.'/synthetic-enrollment.json'),true);$sessions=[];
 foreach(['admin','haris'] as $user){
  $s=[];check43($request($s,'GET','/session/csrf')[0]===200,'CSRF_BOOTSTRAP_'.$user);
  [$status,$login]=$request($s,'POST','/session/login',['username'=>$user,'password'=>$passwords[$user]]);
  check43($status===200&&($login['user']['passwordChangeRequired']??false),'FIRST_LOGIN_'.$user);
  check43($request($s,'GET','/simple-v1/state')[0]===403,'ROTATION_ENFORCED_'.$user);
  $next=bin2hex(random_bytes(24));file_put_contents($dir.'/'.$user.'.rotation-intent',$next);chmod($dir.'/'.$user.'.rotation-intent',0600);
  check43($request($s,'POST','/profile/password',['currentPassword'=>$passwords[$user],'newPassword'=>$next])[0]===204,'PASSWORD_ROTATED_'.$user);
  $passwords[$user]=$next;file_put_contents($dir.'/synthetic-enrollment.json',json_encode($passwords));chmod($dir.'/synthetic-enrollment.json',0600);
  check43($request($s,'GET','/session/current')[0]===401,'OLD_SESSION_REVOKED_'.$user);
  $request($s,'GET','/session/csrf');check43($request($s,'POST','/session/login',['username'=>$user,'password'=>$next])[0]===200,'REAUTHENTICATED_'.$user);
  check43($request($s,'GET','/simple-v1/state')[0]===200,'READ_ONLY_DASHBOARD_'.$user);$sessions[$user]=$s;
 }
 foreach($sessions as $u=>&$s){check43($request($s,'GET','/session/current')[0]===200,'OVERLAPPING_SESSION_'.$u);}unset($s);
 $s=&$sessions['admin'];
 foreach(['/simple-v1/items','/simple-v1/documents','/simple-v1/register','/simple-v1/money','/simple-v1/employee-hafta','/simple-v1/cheques'] as $path){check43($request($s,'GET',$path)[0]===200,'READ_VIEW_'.str_replace('/','_',$path));}
 $bad=$s;$bad['csrf']='wrong';check43($request($bad,'POST','/session/logout',[])[0]===403,'CSRF_NEGATIVE');
 check43($request($s,'POST','/session/logout',[],['Origin: https://evil.invalid'])[0]===403,'ORIGIN_NEGATIVE');
 foreach($sessions as $u=>&$session){$old=$session;check43($request($session,'POST','/session/logout',[])[0]===204,'LOGOUT_'.$u);check43($request($old,'GET','/session/current')[0]===401,'LOGOUT_REPLAY_REJECTED_'.$u);}unset($session);
 $report=['passed'=>true,'hostedRuntime'=>true,'tlsVerified'=>true,'frontController'=>'temporary header-authenticated isolated staging route on existing HTTPS vhost','schema'=>'upms_stage_43','checks'=>array_values(array_unique($checks)),'financialTransactionsCreated'=>0,'postingActivated'=>false,'reactBrowserAcceptance'=>false];
 file_put_contents($dir.'/http-check.json',json_encode($report,JSON_PRETTY_PRINT));chmod($dir.'/http-check.json',0600);echo json_encode($report,JSON_PRETTY_PRINT).PHP_EOL;
}catch(Throwable $e){echo json_encode(['passed'=>false,'error'=>preg_match('/^[A-Z][A-Z0-9_]+$/D',$e->getMessage())?$e->getMessage():'HOSTED_HTTP_CHECK_FAILED','completedChecks'=>array_values(array_unique($checks)),'postingActivated'=>false]).PHP_EOL;exit(1);
}finally{if(is_file($file)&&!unlink($file)){throw new RuntimeException('STAGE_GATEWAY_REMOVAL_FAILED');}}
