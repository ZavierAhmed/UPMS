#!/bin/sh
set -eu
base="$HOME/.cache/upms-php81-local"
export LD_LIBRARY_PATH="$base/root/usr/lib/x86_64-linux-gnu"
fixture="$base/p42c-$(date +%s)-p43restore"
mkdir -m 700 "$fixture"
export P43_RECOVERY_DIR="$fixture"
env -u LD_LIBRARY_PATH python3 -c 'import os,zipfile; zipfile.ZipFile("tmp/phase-4.3/management-p43.zip").extractall(os.environ["P43_RECOVERY_DIR"]+"/release")'
"$base/root/usr/bin/mariadb-install-db" --no-defaults --basedir="$base/root/usr" --datadir="$fixture/data" --auth-root-authentication-method=normal --skip-test-db > "$fixture/bootstrap.log" 2>&1
"$base/root/usr/sbin/mariadbd" --no-defaults --basedir="$base/root/usr" --datadir="$fixture/data" --socket="$fixture/mysql.sock" --pid-file="$fixture/server.pid" --log-error="$fixture/error.log" --skip-networking --server-id=4343 --innodb-buffer-pool-size=64M --aria-pagecache-buffer-size=8M --key-buffer-size=8M --max-connections=12 &
pid=$!
trap 'kill "$pid" 2>/dev/null || true; wait "$pid" 2>/dev/null || true' EXIT
for i in $(seq 1 100); do test ! -S "$fixture/mysql.sock" || break; sleep .1; done
"$base/bin/php" scripts/p43-offline-hosted-restore.php
