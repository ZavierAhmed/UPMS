#!/bin/sh
set -eu
base="$HOME/.cache/upms-php81-local"
export LD_LIBRARY_PATH="$base/root/usr/lib/x86_64-linux-gnu"
fixture="${1:-$base/p42c-$(date +%s)}"
case "$fixture" in "$base"/p42c-[0-9]*) ;; *) exit 1;; esac
if [ "$#" -eq 0 ]; then mkdir -m 700 "$fixture"; fi
export P42C_DIRECTORY="$fixture"
if [ -n "${P42C_PACKAGE:-}" ]; then
    cp -a "$P42C_PACKAGE" "$fixture/release"
    export P42C_PACKAGE="$fixture/release"
    mkdir -p "$P42C_PACKAGE/private/backend/bootstrap/cache" "$P42C_PACKAGE/private/backend/storage/framework/views" "$P42C_PACKAGE/private/backend/storage/framework/sessions" "$P42C_PACKAGE/private/backend/storage/framework/cache" "$P42C_PACKAGE/private/backend/storage/logs"
fi
printf '%s' "$fixture" > tmp/phase-4.2c/local-directory.txt
if [ "$#" -eq 0 ]; then "$base/root/usr/bin/mariadb-install-db" --no-defaults --basedir="$base/root/usr" --datadir="$fixture/data" --auth-root-authentication-method=normal --skip-test-db > "$fixture/bootstrap.log" 2>&1; fi
"$base/root/usr/sbin/mariadbd" --no-defaults --basedir="$base/root/usr" --datadir="$fixture/data" --socket="$fixture/mysql.sock" --pid-file="$fixture/server.pid" --log-error="$fixture/error.log" --skip-networking --server-id=4242 --innodb-buffer-pool-size=64M --aria-pagecache-buffer-size=8M --key-buffer-size=8M --max-connections=25 &
dbpid=$!
webpid=''
trap 'test -z "$webpid" || /bin/kill -TERM -- "-$webpid" 2>/dev/null || true; kill "$dbpid" 2>/dev/null || true; wait "$dbpid" 2>/dev/null || true' EXIT
for i in $(seq 1 100); do [ ! -S "$fixture/mysql.sock" ] || break; sleep .1; done
if [ "$#" -eq 0 ]; then "$base/bin/php" upms.php/tests/Support/p42c-workspace.php initialize; fi
if [ "$#" -gt 0 ] && [ -z "${2:-}" ]; then "$base/bin/php" upms.php/tests/Support/p42c-workspace.php refresh; fi
if [ "${2:-}" != verify-only ]; then "$base/bin/php" upms.php/tests/Support/p42c-workspace.php recover; fi
"$base/bin/php" upms.php/tests/Support/p42c-workspace.php verify
if [ "${2:-}" = recover-only ] || [ "${2:-}" = verify-only ]; then exit; fi
PHP_CLI_SERVER_WORKERS=4 setsid "$base/bin/php" -S 127.0.0.1:5291 upms.php/tests/Support/p42c-router.php > "$fixture/http.log" 2>&1 &
webpid=$!
env -u LD_LIBRARY_PATH python3 scripts/p42c-http-acceptance.py "$fixture"
