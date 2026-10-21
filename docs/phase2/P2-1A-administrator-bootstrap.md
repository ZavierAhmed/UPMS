# Automated local administrator setup

The 2026-10-21 owner brief supersedes the earlier manual-only bootstrap checkpoint. The owner explicitly authorized a generated temporary administrator password, supported-service bootstrap, encrypted local handoff and forced first-login rotation.

Completed: one administrator was created through `createIdentityService.bootstrap`, preserving the InnoDB guard, duplicate-administrator refusal, Argon2id hashing and atomic audit. No direct SQL user insertion was used for the owner account. Existing runtime profiles, accounts and migrations were reused. No provisioning or migration was repeated.

The generated initial credential is stored only in ignored `server/.local/p21a/initial-administrator.credential.clixml`, protected with current-user Windows DPAPI and the restricted folder ACL. No password is printed, committed, placed in a URL or passed in command arguments. The owner receives a private local Windows dialog with a masked field and an explicit show toggle. The handoff expires for reading after seven days; this never resets the account.

The supported password-change endpoint requires the current temporary password and a different new password. An immutable bootstrap audit marker requires rotation; a subsequent committed `user.password.changed` audit event clears the restriction. Until then the server permits only portal access, own profile/password and own session operations. Administration endpoints remain forbidden regardless of frontend navigation. Password change revokes all sessions atomically with its audit event. No migration change or runtime privilege expansion is needed.

The local server removes the temporary encrypted handoff within ten seconds after detecting the audited owner password change. Only the generated handoff/metadata files are removed; database records, private database profiles and owner-selected passwords are preserved. If the server is stopped, the next supported setup run also removes a completed handoff. DPAPI does not protect against compromise of the Windows user or local administrator.

Repeatable startup, from the repository root:

```powershell
.\server\tools\Complete-UPMSLocalSetup.ps1 -ShowCredentials
```

This reuses the existing restricted Runtime profile, refuses another administrator or a password reset, verifies temporary login/CSRF/profile/logout when the handoff is still applicable, and starts or reuses the recorded loopback listener. An unverified occupied port is never killed. The private dialog can also be reopened with `pwsh -NoProfile -STA -File .\server\tools\Administrator-Handoff.ps1 -Action Show` while the temporary handoff exists. Never run its private pipe-only Read action in a terminal or log.

Owner action: sign in at http://127.0.0.1:3000/management using the private dialog, then choose a new password on the mandatory change screen. The application is ready for this action; owner-selected rotation is not performed by the agent.
