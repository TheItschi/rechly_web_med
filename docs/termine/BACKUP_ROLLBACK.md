# Termine — Backup & Rollback (data)

Covered by the existing infrastructure in `docs/migration/BACKUP_AND_RECOVERY.md`
(daily encrypted MariaDB dumps + uploads to off-site storage, restore rehearsal).
Termine-specific notes:

- **Included automatically**: all `termine_*` tables live in the same MariaDB database and `uploads` volume (staff images, covers, logos via the shared `receipts` bucket), so existing backup jobs already cover them. Verify a backup contains the tables after the first production booking: `tar -tzf <backup> | grep -i termine` or restore to staging and count rows.
- **Independent export**: `scripts/export-cloud-backup.mjs` dumps every collection generically — extend its `TABLES` list with the 12 `termine_*` tables for a portable JSONL safety copy before any bulk operation.
- **Outbox during restore**: after a point-in-time restore, outbox rows with status `sent` may reference emails already delivered (duplicate-send guard: the cron marks `sent` only after the provider accepted; a restored `pending` row may resend — acceptable and bounded by the 8-attempt cap; customers may rarely get a duplicate confirmation after a disaster restore).
- **Manage tokens**: random 32-byte values; a restore keeps them valid (hashes in DB). No rotation needed.
- **Rollback order**: disable flag → verify no new bookings → export delta → restore/wipe. Never merge two live databases by hand; re-run the official import or the JSONL export instead.
