#!/bin/bash
# Schedules scripts/backup.ts to run every night at 21:00 on this Mac (launchd).
#
#   bash scripts/backup-jadwal.sh pasang     install / update the schedule
#   bash scripts/backup-jadwal.sh coba       run the scheduled backup once now (same way launchd runs it)
#   bash scripts/backup-jadwal.sh status     show the schedule and the last log lines
#   bash scripts/backup-jadwal.sh lepas      remove the schedule (backups are kept)
#
# macOS doesn't let background jobs read the Desktop, so `pasang` copies a self-contained build of the
# backup script plus the database URL/token (from .env.local) into "$BACKUP_DIR/.program".
# Run `pasang` again after changing scripts/backup.ts or the database token.
set -euo pipefail

LABEL="id.seminar.backup"
PROJECT="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$HOME/Backup Seminar}"
PROG="$BACKUP_DIR/.program"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
JAM="${JAM:-21}"

case "${1:-}" in
  pasang)
    NODE="$(command -v node)"
    mkdir -p "$PROG"
    chmod 700 "$PROG"

    # Self-contained backup program (no node_modules needed; uses the web client for libsql:// URLs)
    "$PROJECT/node_modules/.bin/esbuild" "$PROJECT/scripts/backup.ts" --bundle --platform=node --format=cjs \
      --target=node20 --alias:@libsql/client=@libsql/client/web --outfile="$PROG/backup.cjs" --log-level=warning

    # Only the database settings (and the app URL/token for PDFs stored on the server) are copied, readable by this user only
    grep -E '^(DATABASE_URL|DATABASE_AUTH_TOKEN|APP_URL|MAINTENANCE_TOKEN)=' "$PROJECT/.env.local" > "$PROG/.env"
    chmod 600 "$PROG/.env"
    grep -q '^DATABASE_URL=libsql://' "$PROG/.env" || { echo "DATABASE_URL di .env.local harus libsql://..."; exit 1; }

    cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE</string>
    <string>--env-file=$PROG/.env</string>
    <string>$PROG/backup.cjs</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict><key>BACKUP_DIR</key><string>$BACKUP_DIR</string></dict>
  <key>StartCalendarInterval</key>
  <dict><key>Hour</key><integer>$JAM</integer><key>Minute</key><integer>0</integer></dict>
  <key>StandardOutPath</key><string>$BACKUP_DIR/backup.log</string>
  <key>StandardErrorPath</key><string>$BACKUP_DIR/backup.log</string>
</dict>
</plist>
EOF
    launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
    launchctl bootstrap "gui/$(id -u)" "$PLIST"
    echo "Jadwal terpasang: backup setiap hari pukul $JAM.00 ke \"$BACKUP_DIR\"."
    echo "Jika laptop tidur pada jam itu, backup berjalan saat laptop bangun. Coba sekarang: bash scripts/backup-jadwal.sh coba"
    ;;
  coba)
    runs() { launchctl print "gui/$(id -u)/$LABEL" 2>/dev/null | awk '/runs =/ {print $3; exit}'; }
    sebelum="$(runs)"
    launchctl kickstart -k "gui/$(id -u)/$LABEL"
    echo "Backup dijalankan. Menunggu hasil..."
    # Done when launchd counted a new run and the job is no longer running
    for _ in $(seq 1 150); do
      sleep 2
      info="$(launchctl print "gui/$(id -u)/$LABEL" 2>/dev/null)"
      if [ "$(runs)" != "$sebelum" ] && ! grep -q 'state = running' <<< "$info"; then break; fi
    done
    # Last entry only: from the last line starting with "[" (timestamp) to the end
    awk '/^\[/ {buf=""} {buf=buf $0 "\n"} END {printf "%s", buf}' "$BACKUP_DIR/backup.log"
    grep 'last exit code' <<< "$info" | sed 's/^\s*/  /'
    ;;
  status)
    if launchctl print "gui/$(id -u)/$LABEL" >/dev/null 2>&1; then
      echo "Jadwal: TERPASANG ($PLIST)"
      launchctl print "gui/$(id -u)/$LABEL" | grep -E 'last exit code|state =' | sed 's/^\s*/  /'
    else
      echo "Jadwal: tidak terpasang"
    fi
    echo "Backup data terbaru:"; ls -1t "$BACKUP_DIR/data" 2>/dev/null | head -3 | sed 's/^/  /'
    echo "Backup terakhir:"
    if [ -f "$BACKUP_DIR/backup.log" ]; then
      awk '/^\[/ {buf=""} {buf=buf $0 "\n"} END {printf "%s", buf}' "$BACKUP_DIR/backup.log" | sed 's/^/  /'
    else
      echo "  (belum ada)"
    fi
    ;;
  lepas)
    launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
    rm -f "$PLIST"
    rm -rf "$PROG"
    echo "Jadwal dilepas. File backup di \"$BACKUP_DIR\" tidak dihapus."
    ;;
  *)
    sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'
    exit 1
    ;;
esac
