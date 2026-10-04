#!/usr/bin/env sh

set -eu

PRODUCTION_SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)
. "$PRODUCTION_SCRIPT_DIR/production-common.sh"

production_require_command docker
production_require_command git
production_require_command sha256sum
production_require_command flock

backup_dir=${BACKUP_DIR:-"$PRODUCTION_REPO_ROOT/../opengym-backups"}
retention=${BACKUP_RETENTION_COUNT:-14}

case "$retention" in
  ''|*[!0-9]*) production_die 'BACKUP_RETENTION_COUNT debe ser un entero mayor que cero' ;;
  0) production_die 'BACKUP_RETENTION_COUNT debe ser mayor que cero' ;;
esac

umask 077
mkdir -p "$backup_dir"
backup_dir=$(CDPATH= cd -- "$backup_dir" && pwd -P)
repo_root=$(CDPATH= cd -- "$PRODUCTION_REPO_ROOT" && pwd -P)
case "$backup_dir/" in
  "$repo_root/"*) production_die 'BACKUP_DIR debe estar fuera del checkout de openGym' ;;
esac

exec 8>"$backup_dir/.backup.lock"
flock -n 8 || production_die 'ya hay un backup consistente en curso'

[ ! -L "$PRODUCTION_REPO_ROOT/data" ] || production_die 'data/ no puede ser un enlace simbolico'
mkdir -p "$PRODUCTION_REPO_ROOT/data"

timestamp=$(date -u +%Y%m%dT%H%M%SZ)
commit=$(git -C "$PRODUCTION_REPO_ROOT" rev-parse HEAD)
short_commit=$(printf '%s' "$commit" | cut -c1-12)
base="opengym-data-$timestamp-$short_commit.tar.gz"
archive="$backup_dir/$base"
partial="$archive.partial"
checksum="$archive.sha256"
metadata="$archive.meta"
helper_image=${BACKUP_HELPER_IMAGE:-alpine:3.22}
api_was_running=0
api_restarted=0

[ ! -e "$archive" ] || production_die "el backup ya existe: $archive"

cleanup() {
  status=$?
  if [ -n "${partial:-}" ] && [ -f "$partial" ]; then
    rm -f -- "$partial"
  fi
  if [ "$api_was_running" -eq 1 ] && [ "$api_restarted" -eq 0 ]; then
    production_info 'Reiniciando la API despues del intento de backup...'
    production_compose start api >/dev/null || status=1
  fi
  trap - EXIT INT TERM
  exit "$status"
}
trap cleanup EXIT INT TERM

if production_compose ps --status running --services | grep -Fxq api; then
  api_was_running=1
  production_info 'Deteniendo brevemente la API para obtener una copia consistente...'
  production_compose stop --timeout 30 api >/dev/null
fi

production_info "Creando $archive"
docker run --rm --network none --read-only \
  --mount "type=bind,src=$PRODUCTION_REPO_ROOT/data,dst=/source/data,readonly" \
  "$helper_image" tar -C /source -czf - data > "$partial"
helper_image_id=$(docker image inspect --format '{{.Id}}' "$helper_image")
mv -- "$partial" "$archive"

digest=$(sha256sum "$archive" | awk '{ print $1 }')
printf '%s  %s\n' "$digest" "$base" > "$checksum"
(CDPATH= cd -- "$backup_dir" && sha256sum --check "$base.sha256" >/dev/null)
printf 'created_utc=%s\ncommit=%s\ndeployed_commit=%s\narchive=%s\nsha256=%s\nhelper_image=%s\nhelper_image_id=%s\n' \
  "$timestamp" "$commit" "${BACKUP_DEPLOYED_COMMIT:-}" "$base" "$digest" "$helper_image" "$helper_image_id" > "$metadata"

if [ "$api_was_running" -eq 1 ]; then
  production_compose start api >/dev/null
  api_restarted=1
fi

set -- "$backup_dir"/opengym-data-*.tar.gz
if [ -e "$1" ]; then
  archive_count=$#
  while [ "$archive_count" -gt "$retention" ]; do
    expired=$1
    shift
    archive_count=$((archive_count - 1))
    case "$expired" in
      "$backup_dir"/opengym-data-*.tar.gz)
        production_info "Retirando backup vencido: $(basename -- "$expired")"
        rm -f -- "$expired" "$expired.sha256" "$expired.meta"
        ;;
      *) production_die "ruta de retencion inesperada: $expired" ;;
    esac
  done
fi

trap - EXIT INT TERM
production_info "Backup verificado: $archive"
printf 'BACKUP_ARCHIVE=%s\n' "$archive"
printf 'BACKUP_SHA256=%s\n' "$digest"
