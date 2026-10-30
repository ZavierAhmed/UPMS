#!/bin/sh
# Daily cron entry; issue only when the existing certificate has under 30 days left.
set -eu
umask 077
root=/home/tsn6az96j3v7/upms-php83-staging/acme84
cd "$root"
if /usr/bin/openssl x509 -in signed-chain.crt -noout -checkend 2592000 >/dev/null 2>&1; then exit 0; fi
expected=baf36cdd14a5d206875f656539324e4c3ed0988d2799e80307a7632cd1c84f9e
actual=$(/usr/bin/sha256sum acme_tiny.py)
[ "${actual%% *}" = "$expected" ] || exit 1
# Only challenge tokens need web-readable permissions; keys stay inside the private directory.
(umask 022; timeout 180 /usr/bin/python3 acme_tiny.py --account-key account.key --csr domain.csr --acme-dir /home/tsn6az96j3v7/public_html/dashboard/.well-known/acme-challenge > signed-chain.next.crt)
chmod 600 signed-chain.next.crt
/usr/bin/openssl x509 -in signed-chain.next.crt -noout -checkend 1209600 >/dev/null
cp -p signed-chain.crt signed-chain.previous.crt
mv signed-chain.next.crt signed-chain.crt
/opt/alt/php83/usr/bin/php /home/tsn6az96j3v7/upms-php83-staging/php84-tools/install-management-ssl.php
/usr/bin/curl --fail --silent --show-error --max-time 20 https://app.unique-plastic.com/ >/dev/null

