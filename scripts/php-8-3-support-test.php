<?php

// Linux-only tests for deployment guards; never connects to a database.
declare(strict_types=1);
if (PHP_SAPI !== 'cli' || PHP_OS_FAMILY !== 'Linux') {
    exit(1);
}
require 'deployment/staging/support.php';
$base = getenv('HOME').'/.cache/upms-php81-local/php83-guards-'.bin2hex(random_bytes(5));
mkdir($base, 0700);
mkdir($base.'/home', 0700);
$home = $base.'/home';
foreach (['public_html','diagnostics','staging'] as $part) {
    mkdir($home.'/'.$part, 0700);
}mkdir($home.'/public_html/dashboard', 0700);
$c = ['destinationReviewed' => true,'accountQuotaReviewed' => true,'runtimeEnabled' => false,'schema' => 'upms_v1','home' => $home,'publicRoot' => $home.'/public_html','managementRoot' => $home.'/public_html/dashboard','diagnosticRoot' => $home.'/diagnostics','stagingRoot' => $home.'/staging'];
$checks = 0;
function ok(bool $value): void
{
    global $checks;
    if (!$value) {
        throw new RuntimeException('STAGING_GUARD_ASSERTION_FAILED');
    }$checks++;
}
function denied(Closure $call): void
{
    try {
        $call();
    } catch (RuntimeException) {
        ok(true);
        return;
    }throw new RuntimeException('UNSAFE_STAGING_ACCEPTED');
}
ok(UpmsStaging::layout($c)['home'] === $home);
foreach ([['runtimeEnabled' => true],['destinationReviewed' => false],['accountQuotaReviewed' => false],['schema' => 'upms'],['stagingRoot' => $c['publicRoot']]] as $change) {
    denied(fn () => UpmsStaging::layout(array_replace($c, $change)));
}
chmod($c['stagingRoot'], 0755);
clearstatcache();
denied(fn () => UpmsStaging::layout($c));
chmod($c['stagingRoot'], 0700);
clearstatcache();
symlink($c['stagingRoot'], $home.'/link');
denied(fn () => UpmsStaging::layout(array_replace($c, ['stagingRoot' => $home.'/link'])));
$usage = "GRANT USAGE ON *.* TO 'fixture'@'localhost' IDENTIFIED BY PASSWORD 'SYNTHETIC_REDACTION_CANARY'";
UpmsStaging::readOnlyGrants([$usage,"GRANT SELECT ON `upms\\_v1`.* TO 'fixture'@'localhost'"], 'upms_v1');
ok(true);
foreach ([[],[$usage],['GRANT ALL PRIVILEGES ON *.* TO x'],['GRANT SELECT ON `upms_v1`.* TO x'],['GRANT SELECT ON `upms\\_v1`.* TO x WITH GRANT OPTION'],['GRANT reviewer TO x'],['GRANT SELECT ON `upms`.* TO x']] as $grants) {
    denied(fn () => UpmsStaging::readOnlyGrants($grants, 'upms_v1'));
}
$payload = $base.'/payload';
mkdir($payload, 0700);
file_put_contents($payload.'/a.txt', 'reviewed');
$manifest = ['files' => [['path' => 'a.txt','bytes' => 8,'sha256' => hash('sha256', 'reviewed')]]];
ok(UpmsStaging::digestTree($payload, $manifest) === 1);
file_put_contents($payload.'/a.txt', 'modified');
denied(fn () => UpmsStaging::digestTree($payload, $manifest));
file_put_contents($payload.'/a.txt', 'reviewed');
file_put_contents($payload.'/.env', 'SYNTHETIC');
denied(fn () => UpmsStaging::digestTree($payload, $manifest));
unlink($payload.'/.env');
symlink($base, $payload.'/link');
denied(fn () => UpmsStaging::digestTree($payload, $manifest));
unlink($payload.'/link');
$bad = $manifest;
$bad['files'][] = $bad['files'][0];
denied(fn () => UpmsStaging::digestTree($payload, $bad));
$bad = $manifest;
$bad['files'][0]['path'] = '../outside';
denied(fn () => UpmsStaging::digestTree($payload, $bad));
echo json_encode(['passed' => true,'checks' => $checks,'productionContacted' => false,'fixture' => $base], JSON_THROW_ON_ERROR).PHP_EOL;
