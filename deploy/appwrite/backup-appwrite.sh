#!/usr/bin/env bash
# Encrypted daily backup for self-hosted Appwrite 1.8.1 (MariaDB + uploads + config).
#
# Install on host: /opt/appwrite/backup/backup-appwrite.sh (chmod 700)
# Config file:     /opt/appwrite/backup/backup.conf (chmod 600, never in Git)
#
# Security guarantees:
# - Encrypts with an `age` public recipient key only; private key stays offline.
# - Plaintext staging directory is mode 0700 and wiped unconditionally via EXIT trap.
# - Logs contain timestamps, byte sizes, and SHA-256 checksums only — no PII or secrets.

set -euo pipefail
umask 077

CONF_FILE="${CONF_FILE:-/opt/appwrite/backup/backup.conf}"
if [[ ! -f "$CONF_FILE" ]]; then
    echo "[$(date -u +%FT%TZ)] ERROR: missing $CONF_FILE" >&2
    exit 1
fi
# shellcheck source=/dev/null
source "$CONF_FILE"

: "${AGE_RECIPIENT:?AGE_RECIPIENT must be set in backup.conf}"
APPWRITE_DIR="${APPWRITE_DIR:-/opt/appwrite}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/appwrite}"
UPLOADS_VOLUME="${UPLOADS_VOLUME:-appwrite_appwrite-uploads}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
SFTP_PORT="${SFTP_PORT:-22}"
SFTP_KEY="${SFTP_KEY:-/opt/appwrite/backup/id_ed25519_backup}"
SFTP_REMOTE_DIR="${SFTP_REMOTE_DIR:-appwrite-backups}"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

TS="$(date -u +%Y%m%dT%H%M%SZ)"
WORK_DIR="$(mktemp -d "${BACKUP_DIR}/.staging-${TS}-XXXXXX")"
cleanup() {
    rm -rf "$WORK_DIR"
}
trap cleanup EXIT

DB_USER="$(awk -F= '/^_APP_DB_USER=/{sub(/^[^=]*=/,""); print; exit}' "${APPWRITE_DIR}/.env")"
DB_PASS="$(awk -F= '/^_APP_DB_PASS=/{sub(/^[^=]*=/,""); print; exit}' "${APPWRITE_DIR}/.env")"
DB_NAME="$(awk -F= '/^_APP_DB_SCHEMA=/{sub(/^[^=]*=/,""); print; exit}' "${APPWRITE_DIR}/.env")"
DB_USER="${DB_USER:-user}"
DB_NAME="${DB_NAME:-appwrite}"

echo "[$(date -u +%FT%TZ)] Starting Appwrite backup (${TS})"

# 1. Consistent MariaDB dump (InnoDB single-transaction, no table locks)
docker exec -e "MYSQL_PWD=${DB_PASS}" appwrite-mariadb \
    mariadb-dump -u "${DB_USER}" \
    --single-transaction --quick --routines --triggers --events \
    --databases "${DB_NAME}" | gzip -9 > "${WORK_DIR}/db.sql.gz"

if ! gzip -dc "${WORK_DIR}/db.sql.gz" | tail -n 5 | grep -q "Dump completed"; then
    echo "[$(date -u +%FT%TZ)] ERROR: mariadb-dump did not finish cleanly" >&2
    exit 1
fi

# 2. Uploads volume archive
UPLOADS_MOUNT="$(docker volume inspect -f '{{ .Mountpoint }}' "${UPLOADS_VOLUME}")"
tar -C "${UPLOADS_MOUNT}" -czf "${WORK_DIR}/uploads.tar.gz" .

# 3. Compose + .env (includes _APP_OPENSSL_KEY_V1 — encrypted inside .tar.age)
tar -C "${APPWRITE_DIR}" -czf "${WORK_DIR}/config.tar.gz" docker-compose.yml .env

# 4. Non-PII checksum manifest inside archive
DB_BYTES="$(stat -c '%s' "${WORK_DIR}/db.sql.gz")"
UP_BYTES="$(stat -c '%s' "${WORK_DIR}/uploads.tar.gz")"
DB_SHA="$(sha256sum "${WORK_DIR}/db.sql.gz" | awk '{print $1}')"
UP_SHA="$(sha256sum "${WORK_DIR}/uploads.tar.gz" | awk '{print $1}')"
CFG_SHA="$(sha256sum "${WORK_DIR}/config.tar.gz" | awk '{print $1}')"

cat > "${WORK_DIR}/manifest.json" <<EOF
{
  "timestamp": "${TS}",
  "databaseBytesGz": ${DB_BYTES},
  "databaseSha256": "${DB_SHA}",
  "uploadsBytesGz": ${UP_BYTES},
  "uploadsSha256": "${UP_SHA}",
  "configSha256": "${CFG_SHA}"
}
EOF

# 5. Bundle and encrypt with age public recipient key
ARCHIVE_NAME="appwrite-backup-${TS}.tar.age"
ARCHIVE_PATH="${BACKUP_DIR}/${ARCHIVE_NAME}"
tar -C "${WORK_DIR}" -cf - db.sql.gz uploads.tar.gz config.tar.gz manifest.json \
    | age -r "${AGE_RECIPIENT}" -o "${ARCHIVE_PATH}"

sha256sum "${ARCHIVE_PATH}" > "${ARCHIVE_PATH}.sha256"
ARC_BYTES="$(stat -c '%s' "${ARCHIVE_PATH}")"
ARC_SHA="$(awk '{print $1}' "${ARCHIVE_PATH}.sha256")"

echo "[$(date -u +%FT%TZ)] Encrypted archive ready: ${ARCHIVE_NAME} (${ARC_BYTES} bytes, sha256=${ARC_SHA})"

# 6. Prune local backups older than RETENTION_DAYS
find "${BACKUP_DIR}" -maxdepth 1 -type f -name 'appwrite-backup-*.tar.age*' -mtime "+${RETENTION_DAYS}" -delete

# 7. Optional off-site copy via SFTP
if [[ -n "${SFTP_HOST:-}" && -n "${SFTP_USER:-}" ]]; then
    SFTP_BATCH="${WORK_DIR}/sftp.batch"
    cat > "${SFTP_BATCH}" <<EOF
-mkdir ${SFTP_REMOTE_DIR}
put ${ARCHIVE_PATH} ${SFTP_REMOTE_DIR}/${ARCHIVE_NAME}
put ${ARCHIVE_PATH}.sha256 ${SFTP_REMOTE_DIR}/${ARCHIVE_NAME}.sha256
EOF
    sftp -P "${SFTP_PORT}" \
        -i "${SFTP_KEY}" \
        -o BatchMode=yes \
        -o StrictHostKeyChecking=accept-new \
        -b "${SFTP_BATCH}" \
        "${SFTP_USER}@${SFTP_HOST}" >/dev/null
    echo "[$(date -u +%FT%TZ)] Off-site SFTP upload OK -> ${SFTP_USER}@${SFTP_HOST}:${SFTP_REMOTE_DIR}/${ARCHIVE_NAME}"
fi

# 8. Optional push heartbeat
if [[ -n "${HEARTBEAT_URL:-}" ]]; then
    curl -fsS -m 10 "${HEARTBEAT_URL}" >/dev/null || echo "[$(date -u +%FT%TZ)] WARN: heartbeat ping failed" >&2
fi

echo "[$(date -u +%FT%TZ)] Backup completed successfully"
