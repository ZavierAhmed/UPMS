# PHP-8.1 hosting evidence

Evidence supplied by the owner on 29 October 2026; not independently observed on GoDaddy by this agent:

| Owner result | Acceptance limit |
| --- | --- |
| Linux cPanel; SSH works | Exact plan/quota, second schema allowance and SFTP remain unverified |
| PHP CLI8.3.36; pdo_mysql, sodium, openssl, fileinfo, mbstring, curl, zip, intl, bcmath available | Web SAPI/extensions/configuration may differ |
| proc_open / child execution PASS | Actual web-to-reviewed-CLI worker path still requires private staging evidence |
| Private scratch exclusive create/flock/rename/readback PASS;0700 | Does not by itself prove cross-worker journal semantics or safe final storage/root layout |
| MariaDB10.11.19;20 InnoDB tables with utf8mb4 collations;old upms_remote_initialization present | Full object list, exact authenticated server/account identity and privileges are not supplied |
| Server/database default latin1 | New clean initialization explicitly sets database and every table/text column to utf8mb4; runtime refuses a non-utf8mb4 production database |
| Public root /public_html with valid HTTPS | Owner-home absolute prefix and final entry layout still need verification |
| Management root /public_html/dashboard;self-signed certificate | Nested path needs host fencing. Public management activation remains blocked; no global TLS bypass |
| phpMyAdmin Ssl_cipher empty | Does not establish socket transport; could also be plaintext TCP |
| CLI memory128MB | Local128MB tests pass; actual web limit and aggregate hosting process quota remain unknown |

The agent performed local tests only. A private WSL Linux fixture uses PHP8.3.6 from signed Ubuntu security packages and MariaDB10.11.14, while the guarded Windows financial engine uses10.11.19. This proves tested local behavior, not identical GoDaddy runtime or verified account compatibility. No system packages/services were replaced; Linux tools were extracted privately.

## Remaining checks only

Follow `deployment/manual/PHP-8-1-README.md`. It consolidates the remaining identity/socket metadata and a fail-closed, metadata-only connection test, approved SMTP TLS probe, exact web/PHP/root/module evidence, least-privilege account review, quota and backup/restore evidence. Do not repeat the already supplied20-table/extension/scratch checks as individual SQL requests.

Mode A requires trusted CA/hostname verification, exact schema/account/server pins and nonempty TLS cipher. Mode B requires an explicitly reviewed Linux socket, owner UID, non-writable trusted parent path chain, matching local/server hostname, unchanged socket identity, PDO reporting UNIX socket and matching server-advertised socket path. Its DSN contains no host or port. Empty TLS cipher is accepted only after those socket proofs. Neither mode permits plaintext remote TCP or an automatic fallback.

If GoDaddy cannot provide either transport, connectivity remains BLOCKED; request a supported protected transport from the provider or review another hosting architecture separately. Do not weaken validation to accommodate the account.

Official references consulted: [PHP PDO MySQL DSN](https://www.php.net/manual/en/ref.pdo-mysql.connection.php), [MariaDB implicit DDL commits](https://mariadb.com/docs/server/reference/sql-statements/transactions/sql-statements-that-cause-an-implicit-commit). These explain the implementation; they do not attest to this GoDaddy account.

The supported PHP mysqlnd implementation requests CLIENT_SSL when a CA is configured and closes a server that lacks SSL before authentication; see the official PHP8.3 mysqlnd connection/auth/command sources, especially https://github.com/php/php-src/blob/PHP-8.3/ext/mysqlnd/mysqlnd_commands.c . Actual provider client-library/SSL capability remains part of the unverified Mode A evidence; no credentialed TCP probe was attempted here.
