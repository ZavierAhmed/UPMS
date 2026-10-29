#!/bin/sh
# Dependency preparation only. Never runs migrations, seeders, provisioning or deployment.
set -eu
[ "$(uname -s)" = Linux ] || { echo 'Linux required' >&2; exit 1; }
[ -f backend/composer.lock ] && [ -f MANIFEST.json ] || { echo 'Run from reviewed source-kit root' >&2; exit 1; }
cd backend
php -r 'if(!in_array(PHP_MAJOR_VERSION.".".PHP_MINOR_VERSION,["8.3","8.4"],true))exit(1);'
umask 077
mkdir -p bootstrap/cache storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs
composer validate --strict
composer install --no-dev --prefer-dist --no-interaction --optimize-autoloader
composer check-platform-reqs --no-dev
composer audit --locked --no-dev
printf '%s\n' 'Linux dependencies prepared. Not release approval. Verify final artifact hashes, private storage, hosting, database pins, backups, matching staging and owner approval before activation.'
