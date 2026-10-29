#!/bin/sh
# Private Linux staging preparation only. No migration, provisioning, upload or activation.
set -eu
[ "$(uname -s)" = Linux ] || exit 1
php -r 'if(!in_array(PHP_MAJOR_VERSION.".".PHP_MINOR_VERSION,["8.3","8.4"],true))exit(1);'
release_root=$(pwd)
[ -f SOURCE.json ] && [ ! -d private/backend/vendor ] || { echo 'Fresh reviewed source layout required' >&2; exit 1; }
cd private/backend
umask 077
mkdir -p bootstrap/cache storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs database/factories database/seeders
composer validate --strict
composer install --no-dev --prefer-dist --no-interaction --optimize-autoloader
composer check-platform-reqs --no-dev
composer audit --locked --no-dev
# Remove only generated builder cache files, never owner or live runtime state.
php -r 'foreach(glob("bootstrap/cache/*.php") as $f)unlink($f);'
cd "$release_root"
php verify-release.php "$release_root"
php check-release.php "$release_root"
printf '%s\n' 'Linux staging candidate verified. GoDaddy paths, transport, trust, backup and final activation remain separately gated.'
