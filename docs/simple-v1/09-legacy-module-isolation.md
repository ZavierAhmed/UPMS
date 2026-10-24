# Legacy mutation isolation

`UPMS_SIMPLE_V1=synthetic-v1` is accepted only with loopback3309 and exact reviewed `upms_test_simplev1_(demo_)?20261024_01…06` names. Other marker/target combinations fail configuration. Protected `upms` cannot enable V1. HTML marks this mode explicitly; the management entry renders SimpleV1 instead of legacy Management. Public portfolio sources are unchanged.

After normal sessions/origin/CSRF protection, V1 mounts only `/api/v1/management/simple-v1/*`, operator session login/current/logout and own password change. Every other management path returns LEGACY_DISABLED_IN_V1 before legacy routers. This covers business masters/settings/approvals, inventory/material/consumption, purchases, sales/GST, receipts, cheques, returns, credits, expenses and staff administration. It blocks reads and mutations, not merely sidebar links.

V1 additionally authorizes the current administrator against `v1_control.operator_id`. Restricted V1 runtime rights cover19 authentication/V1 tables, no legacy business tables, no DDL/global grants and no journal/audit/command UPDATE/DELETE. No public registration is introduced. One bootstrap administrator is created only in each fresh synthetic target. Main users/roles/accounts are untouched.

Without the V1 marker, original legacy behavior/grant verification remains intact; V1 endpoints return V1_DISABLED. Legacy classes, financial services, migrations and records are retained. The134-check legacy cross-module run proves dormant infrastructure remains testable independently.

V1 uses a distinct cookie name (upms-simple-v1-local) so switching between3110 and older3108/3000 browser tabs cannot overwrite legacy session cookies. A backend test also proves protected main rejects V1 mode.
