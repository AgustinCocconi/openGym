#!/usr/bin/env sh
# Solo destinatario publico age en el host; identidad privada en la PC.
set -eu
PRODUCTION_SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)
. "$PRODUCTION_SCRIPT_DIR/production-common.sh"

for command in age flock sha256sum docker git; do
  production_require_command "$command"
done
recipient_file=${BACKUP_RECIPIENT_FILE:-/etc/opengym/backup-recipient.txt}
[ -f "$recipient_file" ] && [ ! -L "$recipient_file" ] ||
  production_die 'falta archivo regular con destinatario publico age'
recipient=$(tr -d '\r\n' < "$recipient_file")
printf '%s' "$recipient" | grep -Eq '^age1[0-9a-z]+$' ||
  production_die 'destinatario age invalido'
# Validar con age antes de detener la API; no imprime el destinatario.
printf '' | age -r "$recipient" >/dev/null 2>&1 || production_die 'age rechazo el destinatario'
encrypted_dir=${BACKUP_ENCRYPTED_DIR:-/srv/opengym-encrypted}
retention=${BACKUP_RETENTION_COUNT:-14}
case "$retention" in
  ''|*[!0-9]*|0) production_die 'retencion debe ser un entero positivo' ;;
esac
umask 077
mkdir -p -- "$encrypted_dir"
encrypted_dir=$(CDPATH= cd -- "$encrypted_dir" && pwd -P)
case "$encrypted_dir/" in
  "$PRODUCTION_REPO_ROOT/"*) production_die 'cifrado debe quedar fuera del checkout' ;;
esac
exec 9>"$encrypted_dir/.periodic.lock"
flock -n 9 || production_die 'ya hay un backup periodico en curso'

state="$PRODUCTION_REPO_ROOT/.production-state/current.env"
[ -f "$state" ] || production_die 'falta estado del deploy aceptado'
accepted=$(awk -F= '$1 == "acceptance_status" { print $2 }' "$state")
[ "$accepted" = accepted ] || production_die 'el deploy debe estar aceptado'
deploy_commit=$(awk -F= '$1 == "commit" { print $2 }' "$state")
printf '%s' "$deploy_commit" | grep -Eq '^[0-9a-f]{40}$' ||
  production_die 'SHA aceptado invalido'
git -C "$PRODUCTION_REPO_ROOT" cat-file -e "$deploy_commit^{commit}" ||
  production_die 'SHA aceptado ausente del checkout'
[ -z "$(git -C "$PRODUCTION_REPO_ROOT" status --porcelain=v1)" ] ||
  production_die 'el checkout operativo debe estar limpio'
operations_commit=$(git -C "$PRODUCTION_REPO_ROOT" rev-parse HEAD)
changed=$(git -C "$PRODUCTION_REPO_ROOT" diff --name-only "$deploy_commit" "$operations_commit")
printf '%s\n' "$changed" | while IFS= read -r path; do
  case "$path" in
    ''|ops/*|docs/*|.github/*) ;;
    *) production_die 'la aplicacion cambio desde el SHA aceptado; requiere deploy/aceptacion' ;;
  esac
done
for service in api web; do
  container=$(production_compose ps -q "$service")
  [ -n "$container" ] || production_die "falta contenedor $service"
  revision=$(docker inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$container")
  [ "$revision" = "$deploy_commit" ] || production_die "revision de $service distinta del deploy aceptado"
done
docker image inspect "${BACKUP_HELPER_IMAGE:-alpine:3.22}" >/dev/null 2>&1 ||
  production_die 'precargar helper de backup antes de la ventana'
SMOKE_ORIGIN_URL="${SMOKE_ORIGIN_URL:-http://127.0.0.1:8080}"
PRODUCTION_URL=${PRODUCTION_URL:-https://gym.mientrenadorpersonal.com.ar}
export SMOKE_ORIGIN_URL PRODUCTION_URL
CHECK_CONTAINER_CONFIG=1 sh "$PRODUCTION_SCRIPT_DIR/smoke-production.sh"

result=$(BACKUP_DEPLOYED_COMMIT="$deploy_commit" sh "$PRODUCTION_SCRIPT_DIR/backup-production.sh")
printf '%s\n' "$result"
archive=$(printf '%s\n' "$result" | sed -n 's/^BACKUP_ARCHIVE=//p')
[ -f "$archive" ] || production_die 'el backup no devolvio un archivo'
sh "$PRODUCTION_SCRIPT_DIR/encrypt-backup.sh" "$archive" "$recipient" "$encrypted_dir"
CHECK_CONTAINER_CONFIG=1 sh "$PRODUCTION_SCRIPT_DIR/smoke-production.sh"

# Rotacion explicita del cifrado; plaintext conserva su retencion del helper.
set -- "$encrypted_dir"/opengym-data-????????T??????Z-????????????.tar.gz.age
if [ -e "$1" ]; then
  count=$#
  while [ "$count" -gt "$retention" ]; do
    expired=$1
    shift
    count=$((count - 1))
    [ -f "$expired" ] && [ ! -L "$expired" ] || production_die 'cifrado vencido no regular'
    rm -f -- "$expired" "$expired.sha256" "$expired.meta"
  done
fi
printf 'created_utc=%s\ncommit=%s\noperations_commit=%s\nexternal_copy=pending\n' \
  "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$deploy_commit" "$operations_commit" > "$encrypted_dir/last-backup.env.partial"
mv -- "$encrypted_dir/last-backup.env.partial" "$encrypted_dir/last-backup.env"
production_info 'Backup local cifrado OK; falta transferir/verificar age/sha256/meta en la PC.'