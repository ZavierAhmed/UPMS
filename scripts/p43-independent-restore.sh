#!/usr/bin/env bash
set +x
set -euo pipefail
if [ "$#" -ne 3 ] || ! [ -t 0 ]; then echo 'OWNER_INTERACTIVE_ARCHIVE_CAPSULE_RELEASE_PATHS_REQUIRED' >&2; exit 1; fi
archive=$(realpath -- "$1"); capsule=$(realpath -- "$2"); release=$(realpath -- "$3")
printf '%s  %s\n' 57036262281670a5f33123332ed357f749d528ea0b82503a3dbe647226523691 "$release" | sha256sum -c - >/dev/null
printf '%s  %s\n' df1ca9b785b4f60a9eb87c93aada5af9ed9b9dae6f51862dc247f94677bc50af "$archive" | sha256sum -c - >/dev/null
base="$HOME/.cache/upms-php81-local"
test -x "$base/bin/php" && test -x "$base/root/usr/sbin/mariadbd"
fixture="$base/p42c-$(date +%s)-independent43"
mkdir -m 700 "$fixture"; export P43_RECOVERY_DIR="$fixture"
python3 - "$release" "$fixture/release" <<'PY'
from zipfile import ZipFile
from pathlib import PurePosixPath
import sys,json,hashlib
with ZipFile(sys.argv[1]) as z:
    m=json.loads(z.read('RELEASE.json'))
    if len(z.namelist())!=len(m['files'])+1: raise RuntimeError('RELEASE_COUNT_REJECTED')
    for name in z.namelist():
        if PurePosixPath(name).is_absolute() or '..' in PurePosixPath(name).parts or '\\' in name: raise RuntimeError('RELEASE_PATH_REJECTED')
        if name!='RELEASE.json' and hashlib.sha256(z.read(name)).hexdigest()!=m['files'].get(name): raise RuntimeError('RELEASE_PAYLOAD_REJECTED')
    z.extractall(sys.argv[2])
PY
export LD_LIBRARY_PATH="$base/root/usr/lib/x86_64-linux-gnu"
"$base/root/usr/bin/mariadb-install-db" --no-defaults --basedir="$base/root/usr" --datadir="$fixture/data" --auth-root-authentication-method=normal --skip-test-db > "$fixture/bootstrap.log" 2>&1
"$base/root/usr/sbin/mariadbd" --no-defaults --basedir="$base/root/usr" --datadir="$fixture/data" --socket="$fixture/mysql.sock" --pid-file="$fixture/server.pid" --log-error="$fixture/error.log" --skip-networking --server-id=4343 --innodb-buffer-pool-size=64M --aria-pagecache-buffer-size=8M --key-buffer-size=8M --max-connections=12 &
pid=$!
trap 'unset recovery_passphrase; kill "$pid" 2>/dev/null || true; wait "$pid" 2>/dev/null || true' EXIT
for i in $(seq 1 100); do test ! -S "$fixture/mysql.sock" || break; sleep .1; done
printf 'Offline capsule passphrase (not echoed): ' >/dev/tty
IFS= read -r -s recovery_passphrase </dev/tty; printf '\n' >/dev/tty
printf '%s' "$recovery_passphrase" | "$base/bin/php" scripts/p43-independent-restore.php "$archive" "$capsule"
unset recovery_passphrase
