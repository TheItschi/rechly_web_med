# Self-Hosting Appwrite for Rechly

Rechly can run against **Appwrite Cloud** or a **self-hosted Appwrite 1.8.1** instance (matching `appwrite@21.5.0` and `node-appwrite@21.0.0` without SDK changes).

## 1. Version Matrix

| Component | Recommended Image / Version |
|---|---|
| Appwrite Server | `appwrite/appwrite:1.8.1` |
| Appwrite Console | `appwrite/console:7.5.7` |
| MariaDB | `mariadb:10.11` |
| Redis | `redis:7.2.4-alpine` |

Avoid `latest` tags in production; Appwrite `2.x` requires major SDK upgrades (`27.x` / `29.x`).

## 2. Reverse-Proxy Deployment (`deploy/appwrite/docker-compose.yml`)

`deploy/appwrite/docker-compose.yml` provides a trimmed Appwrite `1.8.1` stack designed to sit behind an existing Traefik reverse proxy:

1. Copy `deploy/appwrite/docker-compose.yml` to `/opt/appwrite/docker-compose.yml` and generate `/opt/appwrite/.env` (`chmod 600`):
   - Set `_APP_DOMAIN` and `_APP_DOMAIN_TARGET` to your API hostname (e.g. `appwrite.example.com`).
   - Set `_APP_OPTIONS_FORCE_HTTPS=enabled` and `_APP_CONSOLE_WHITELIST_ROOT=enabled` (restricts Console signups to the first root admin).
   - Generate a strong `_APP_OPENSSL_KEY_V1` (`openssl rand -hex 32`) and store a copy offline in a password manager — losing it prevents decrypting OAuth/SMTP secrets and password hashes.
   - Pin `_APP_DB_HOST=appwrite-mariadb` and `_APP_REDIS_HOST=appwrite-redis` so container hostnames never collide on shared proxy networks, and leave `_APP_REDIS_PASS` empty on the internal network (`utopia-php/queue` in `1.8.1` connects without Redis auth).
   - Configure `_APP_SMTP_*` (e.g. port `587` with STARTTLS/`tls`) so password recovery and verification emails work.
2. Start the stack (`docker compose up -d`), create your admin account and project in `https://<your-appwrite-domain>/console`, and apply the schema in `appwrite.config.json` (plus `scripts/migrate-einvoice.mjs` and optional `scripts/migrate-workspace.mjs`).
3. Register your web frontend domain under **Overview → Platforms → Web** (required for CORS and OAuth redirect validation).
4. If enabling Google Sign-In, add `https://<your-appwrite-domain>/v1/account/sessions/oauth2/callback/google/<project-id>` to your Google Cloud OAuth 2.0 Client's Authorized Redirect URIs.

## 3. Environment Configuration (`deploy/self-hosted.env.example`)

Configure your Next.js / Coolify environment variables using `deploy/self-hosted.env.example`. Because `NEXT_PUBLIC_APPWRITE_ENDPOINT` and `NEXT_PUBLIC_APPWRITE_PROJECT_ID` are inlined into the client bundle at build time, trigger a **full rebuild without cache** whenever they change.

## 4. Encrypted Daily Backups (`deploy/appwrite/backup-appwrite.sh`)

1. Generate an `age` keypair (`age-keygen`), store the private key offline in your password manager, and place **only** the public `age1...` recipient key in `/opt/appwrite/backup/backup.conf` (`chmod 600`, template in `deploy/appwrite/backup.conf.example`).
2. Install `deploy/appwrite/backup-appwrite.sh` (`chmod 700`) and schedule it via cron. Each run creates an `age`-encrypted `.tar.age` archive containing a single-transaction `mariadb-dump`, the `appwrite-uploads` volume, and `/opt/appwrite/{docker-compose.yml,.env}`, with optional off-site SFTP upload.

## 5. Migrating an Existing Project

- **Pre-migration export:** `scripts/export-cloud-backup.mjs` captures a read-only JSONL snapshot and SHA-256 manifest.
- **Verification:** `scripts/verify-migration.mjs` compares user sets, row counts, content hashes, and ownership across source and destination.
- **Timestamp preservation:** Official Appwrite migrations reset `$createdAt` and `$updatedAt` to migration time; `scripts/repair-timestamps.mjs` restores original millisecond UTC timestamps from the JSONL export so analytics and creation-order sorting remain unchanged.
