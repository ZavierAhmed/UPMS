<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'||gethostname()!=='sg2plzcpnl508885.prod.sin2.secureserver.net'){exit(1);}
umask(0077);
$name='p43-runtime-'.bin2hex(random_bytes(12)).'.php';
$path='/home/tsn6az96j3v7/public_html/dashboard/'.$name;
$token=bin2hex(random_bytes(24));
$code='<?php if(!hash_equals('.var_export(hash('sha256',$token),true).',hash("sha256",$_SERVER["HTTP_X_UPMS_PROBE"]??""))){http_response_code(404);exit;} header("Content-Type: application/json"); header("Cache-Control: no-store");echo json_encode(["php"=>PHP_VERSION,"sapi"=>PHP_SAPI,"extensions"=>get_loaded_extensions(),"marker"=>'.var_export($name,true).']);';
if(file_exists($path)||file_put_contents($path,$code)!==strlen($code)){throw new RuntimeException('PROBE_WRITE_FAILED');}
chmod($path,0644);
try{
 $c=curl_init('https://app.unique-plastic.com/'.$name);
 curl_setopt_array($c,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>20,CURLOPT_RESOLVE=>['app.unique-plastic.com:443:184.168.100.110'],CURLOPT_HTTPHEADER=>['X-Upms-Probe: '.$token]]);
 $body=curl_exec($c);$status=curl_getinfo($c,CURLINFO_RESPONSE_CODE);$error=curl_errno($c);curl_close($c);
 $j=is_string($body)?json_decode($body,true):null;
 $passed=$status===200&&($j['marker']??'')===$name;
 echo json_encode(['passed'=>$passed,'status'=>$status,'curlError'=>$error,'runtime'=>$passed?$j:null,'providerChallenge'=>is_string($body)&&str_contains($body,'One moment, please...'),'trustedTls'=>!$error,'probeRemoved'=>true],JSON_PRETTY_PRINT).PHP_EOL;
}finally{if(!unlink($path)){throw new RuntimeException('PROBE_REMOVAL_FAILED');}}
