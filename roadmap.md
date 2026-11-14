# Requested work
- [x] Durable offline visit/order drafts, photos, and automatic reconnect sync with duplicate protection.
- [x] Email-based administrator password recovery while keeping secure recovery-code fallback.
- [x] Improve navigation responsiveness and photo handling.
- [x] Run 15 targeted tests and authenticated desktop/mobile checks; verify real offline submission, reconnect, atomic order items, duplicate retry, draft restoration, and all staff pages.

Verification limits: published offline shell requires deployment and a prior online visit. Sync runs while the application is open; closed-app worker sync is not implemented. Recovery email delivery and link consumption require mailbox access; no password was changed during testing. Broad review verified page loading, not every payroll/stock/location operation.