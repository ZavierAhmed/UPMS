<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'||gethostname()!=='sg2plzcpnl508885.prod.sin2.secureserver.net'){exit(1);}
ini_set('zend.exception_ignore_args','1');umask(0077);
$dir='/home/tsn6az96j3v7/upms-private/p43/stage43';$web='/home/tsn6az96j3v7/public_html/dashboard';
$root='/home/tsn6az96j3v7/upms-releases/p43/management-570362622816';$state=$dir.'/browser-ingress.json';
$action=getenv('P43_BROWSER_GATE');
try{
 if($action==='cleanup'){
  $c=json_decode(file_get_contents($state),true,16,JSON_THROW_ON_ERROR);
  if(!preg_match('/^p43-browser-[a-f0-9]{24}\.php$/D',$c['name'])){throw new RuntimeException('INGRESS_NAME_REJECTED');}
  if(is_file($web.'/'.$c['name'])&&!unlink($web.'/'.$c['name'])){throw new RuntimeException('INGRESS_REMOVAL_FAILED');}
  echo json_encode(['passed'=>true,'ingressRemoved'=>true]).PHP_EOL;exit;
 }
 if($action!=='prepare'){throw new RuntimeException('EXPLICIT_BROWSER_GATE_ACTION_REQUIRED');}
 if(file_exists($state)){
  $previous=json_decode(file_get_contents($state),true,16,JSON_THROW_ON_ERROR);
  if(is_file($web.'/'.basename($previous['name']))){throw new RuntimeException('EXISTING_BROWSER_INGRESS_REVIEW_REQUIRED');}
 }
 $name='p43-browser-'.bin2hex(random_bytes(12)).'.php';$token=bin2hex(random_bytes(32));$expiry=time()+3600;
 $code='<?php declare(strict_types=1);'
  .'if(time()>'.$expiry.'||!hash_equals('.var_export(hash('sha256',$token),true).',hash("sha256",$_SERVER["HTTP_X_UPMS_ACCEPTANCE"]??""))){http_response_code(404);exit;}'
  .'$root='.var_export($root,true).';$asset=$_SERVER["HTTP_X_UPMS_STAGE_ASSET"]??null;'
  .'if($asset!==null){if(!preg_match("~^management/(?:index\\.html|assets/[a-zA-Z0-9_./-]+\\.(?:js|css|svg|png|jpg|jpeg|webp|woff2))$~D",$asset)||str_contains($asset,"..")){http_response_code(404);exit;}'
  .'$m=json_decode(file_get_contents($root."/RELEASE.json"),true);$file=$root."/".$asset;'
  .'if(!is_file($file)||is_link($file)||hash_file("sha256",$file)!==($m["files"][$asset]??null)){http_response_code(503);exit;}'
  .'$types=["html"=>"text/html; charset=UTF-8","js"=>"text/javascript","css"=>"text/css","svg"=>"image/svg+xml","png"=>"image/png","jpg"=>"image/jpeg","jpeg"=>"image/jpeg","webp"=>"image/webp","woff2"=>"font/woff2"];'
  .'header("Content-Type: ".$types[pathinfo($file,PATHINFO_EXTENSION)]);header("Cache-Control: no-store");header("X-Content-Type-Options: nosniff");readfile($file);exit;}'
  .'$route=$_SERVER["HTTP_X_UPMS_STAGE_ROUTE"]??"";if(!preg_match("~^/api/v1/management/[a-zA-Z0-9/_?=&.%+-]+$~D",$route)){http_response_code(404);exit;}'
  .'unset($_SERVER["HTTP_X_UPMS_ACCEPTANCE"],$_SERVER["HTTP_X_UPMS_STAGE_ROUTE"]);$_SERVER["REQUEST_URI"]=$route;'
  .'require $root."/private/backend/vendor/autoload.php";$app=require $root."/private/backend/bootstrap/app.php";'
  .'$app->useEnvironmentPath('.var_export($dir,true).');$app->loadEnvironmentFrom("runtime.env");$app->handleRequest(Illuminate\\Http\\Request::capture());';
 $code=str_replace('Illuminate\\\\Http\\\\Request','Illuminate\\Http\\Request',$code);
 if(file_exists($web.'/'.$name)||file_put_contents($web.'/'.$name,$code)!==strlen($code)||!chmod($web.'/'.$name,0644)){throw new RuntimeException('INGRESS_WRITE_FAILED');}
 file_put_contents($state,json_encode(['name'=>$name,'token'=>$token,'expires'=>$expiry],JSON_THROW_ON_ERROR));chmod($state,0600);
 echo json_encode(['passed'=>true,'ingressInstalled'=>true,'expiresUtc'=>gmdate('c',$expiry),'productionBindingChanged'=>false]).PHP_EOL;
}catch(Throwable $e){echo json_encode(['passed'=>false,'error'=>preg_match('/^[A-Z][A-Z0-9_]+$/D',$e->getMessage())?$e->getMessage():'BROWSER_INGRESS_FAILED']).PHP_EOL;exit(1);}
