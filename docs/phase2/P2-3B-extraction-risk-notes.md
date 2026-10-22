# Isolated extraction decisions

P2.3B authorizes low-level recovery on expendable isolated copies, starting at level 1, for read-only extraction. No application writes, migrations, dropped tables or data/redo-file replacement are permitted. Original files and the offline safety copy remain untouched.

Normal-copy startup reproduced future-LSN corruption errors. Level 1 on a separate fresh copy logged persistent errors and could not complete the operator handshake (ETIMEDOUT). A responding TCP socket is not evidence of health or readable records.

## Level 2 decision, before execution

Try a new physical copy at level 2, disabling InnoDB background activity that may be preventing extraction startup. Additional risk: normal purge/background cleanup is disabled, so this instance cannot be treated as consistent or used operationally. Original transactions may remain unresolved; successful reads alone cannot certify completeness. Preserve per-table outcomes and compare all extracted rows against the verified logical checkpoint. No automatic escalation to 4–6 is authorized by this workflow.

Only recorded processes whose command line points into the specific private disposable instance directory may be stopped if unresponsive. Preserve their logs and data. Such termination does not concern the original XAMPP process or the healthy logical candidate. Never terminate an unrelated process by executable name.

Official version context: [MariaDB InnoDB recovery modes](https://mariadb.com/docs/server/server-usage/storage-engines/innodb/innodb-troubleshooting/innodb-recovery-modes), including the before-10.6.5 behavior relevant to 10.4.32. Recovery mode permits emergency extraction; it does not repair corruption.

## Level 3 decision, before execution

Level 2 exited without an accessible SQL endpoint; its log retained the future-LSN failures. One fresh expendable level-3 copy may be tried for extraction only. For this MariaDB version level 3 skips rollback of recovered transactions, so readable results may include incomplete/uncommitted state and cannot be treated as authoritative without reconciliation. Do not merge such rows into the healthy candidate automatically. This is the final low-level attempt in this run. Levels 4–6 will not be attempted automatically; unreadable/newer data uncertainty must be included in the owner handoff decision.

## Console-mode diagnostic and isolated privilege bypass

An empty console-mode probe reached ready-for-connections and shut down cleanly; standalone launches had not completed that lifecycle. Retrying a fresh physical copy in console mode exposed an additional fatal error: incorrect file format for mysql.roles_mapping. Thus force-recovery levels alone cannot address the observed privilege-table failure. This is separate evidence from the InnoDB future-LSN mismatch.

One new expendable copy may use skip-grant-tables on loopback port 3307, read_only=ON, force recovery 0, solely to attempt SELECT extraction past the corrupt server privilege tables. Risk: authentication/privilege enforcement is disabled within that temporary local process; it must receive no application traffic, never serve UPMS, and be stopped after extraction. No original account or table is changed. Do not redirect any application profile to this port. This bypass does not repair either the privilege tables or InnoDB and cannot certify the physical copy as healthy.
