<?php
declare(strict_types=1);
// Trusted CLI fixture factory for read-only UI tests. Never an HTTP route.
require __DIR__.'/../../vendor/autoload.php';
$c=json_decode(stream_get_contents(STDIN),true,32,JSON_THROW_ON_ERROR);
$root=realpath(dirname(__DIR__,3).'/tmp/php-runtime');$env=realpath($c['envPath']??'');$b=$c['binding']??[];
if(PHP_SAPI!=='cli'||!$env||!str_starts_with($env,$root.DIRECTORY_SEPARATOR)||$env!==realpath(($b['directory']??'').'/test.env')||!preg_match('/^upms_test_php_money_[0-9]+$/D',$b['schema']??''))throw new RuntimeException('ISOLATED_FIXTURE_REQUIRED');
foreach(['owner-uat-binding.json','uath1-owner-binding.json','uat2-owner-binding.json','uat2a-manual-binding.json','uat3-manual-binding.json'] as $name){if(is_file($root.'/'.$name)&&json_decode(file_get_contents($root.'/'.$name),true,32,JSON_THROW_ON_ERROR)['schema']===$b['schema'])throw new RuntimeException('OWNER_SESSION_CREATION_REJECTED');}
$app=require __DIR__.'/../../bootstrap/app.php';$app->useEnvironmentPath(dirname($env));$app->loadEnvironmentFrom(basename($env));$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$config=config('upms');
if(($config['production_profile']??'')!==''||$config['host']!=='127.0.0.1'||(string)$config['port']!=='3330'||$config['database']!==$b['schema']||$config['username']!==$b['runtime'])throw new RuntimeException('ISOLATED_PROFILE_REQUIRED');
$db=$app->make(App\Upms\Database::class);$actual=$db->one('SELECT DATABASE() AS db,CURRENT_USER() AS account');
if($actual['db']!==$b['schema']||explode('@',$actual['account'])[0]!==$b['runtime'])throw new RuntimeException('ISOLATED_RUNTIME_REQUIRED');
$identity=$app->make(App\Upms\Identity::class);$row=$db->one("SELECT id FROM users WHERE login_key='php-admin' AND enabled=1");$user=$identity->user((string)$row['id']);
if(!in_array('administrator',$user['roles'],true))throw new RuntimeException('SYNTHETIC_ADMIN_REQUIRED');
$created=$db->transaction(fn()=>$identity->create($user));
echo json_encode($created,JSON_THROW_ON_ERROR);
