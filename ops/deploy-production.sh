#!/usr/bin/env sh

set -eu

PRODUCTION_SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)
. "$PRODUCTION_SCRIPT_DIR/production-common.sh"

production_require_command curl
production_require_command docker
production_require_command git
production_require_command sha256sum
production_require_command tar

[ "$#" -eq 1 ] || production_die 'uso: deploy-production.sh <commit-completo-de-personal>'
expected_commit=$1
printf '%s' "$expected_commit" | grep -Eq '^[0-9a-f]{40}$' ||
  production_die 'el commit esperado debe ser un SHA completo de 40 caracteres'

case "$(uname -s)" in
  Linux) ;;
  *) production_die 'el despliegue productivo esta soportado solamente en un host Linux' ;;
esac

[ -f "$PRODUCTION_REPO_ROOT/.env" ] || production_die 'falta .env en la raiz del checkout'
[ -n "${PRODUCTION_URL:-}" ] || production_die 'definir PRODUCTION_URL con el origen HTTPS definitivo'
case "$PRODUCTION_URL" in
  https://*) ;;
  *) production_die 'PRODUCTION_URL debe comenzar con https://' ;;
esac
case "$PRODUCTION_URL" in
  */) production_die 'PRODUCTION_URL no debe terminar en /' ;;
esac

branch=$(git -C "$PRODUCTION_REPO_ROOT" branch --show-current)
[ "$branch" = personal ] || production_die "la rama activa debe ser personal (actual: ${branch:-detached})"
[ -z "$(git -C "$PRODUCTION_REPO_ROOT" status --porcelain=v1)" ] ||
  production_die 'el arbol Git debe estar limpio antes de desplegar'
head_commit=$(git -C "$PRODUCTION_REPO_ROOT" rev-parse HEAD)
[ "$head_commit" = "$expected_commit" ] || production_die 'HEAD no coincide con el commit esperado'

production_info 'Actualizando referencias remotas para verificar el candidato...'
git -C "$PRODUCTION_REPO_ROOT" fetch --quiet origin personal
remote_commit=$(git -C "$PRODUCTION_REPO_ROOT" rev-parse refs/remotes/origin/personal)
[ "$remote_commit" = "$expected_commit" ] ||
  production_die 'el commit esperado no coincide con origin/personal'

rp_id=$(production_env_value RP_ID)
origin=$(production_env_value ORIGIN)
admin_uids=$(production_env_value ADMIN_UIDS)
invite_only=$(production_env_value INVITE_ONLY)
allow_guest=$(production_env_value ALLOW_GUEST)
public_host=${PRODUCTION_URL#https://}
case "$public_host" in
  ''|*[!A-Za-z0-9.-]*|.*|*.|*..*) production_die 'PRODUCTION_URL debe usar un hostname HTTPS valido sin puerto ni ruta' ;;
esac
[ "$origin" = "$PRODUCTION_URL" ] || production_die 'ORIGIN de .env debe coincidir exactamente con PRODUCTION_URL'
[ "$rp_id" = "$public_host" ] || production_die 'RP_ID de .env debe ser el hostname de PRODUCTION_URL'
production_is_false "$allow_guest" || production_die 'ALLOW_GUEST debe estar desactivado en produccion'

bootstrap=${BOOTSTRAP_OWNER:-0}
if production_is_true "$bootstrap"; then
  production_is_false "$invite_only" || production_die 'el bootstrap inicial exige INVITE_ONLY desactivado'
  production_info 'Modo bootstrap explicito: registrar al propietario y cerrar el alta inmediatamente despues.'
else
  [ -n "$admin_uids" ] || production_die 'ADMIN_UIDS debe identificar al propietario (o usar BOOTSTRAP_OWNER=1 solo en el alta inicial)'
  production_is_true "$invite_only" || production_die 'INVITE_ONLY debe estar activo fuera del bootstrap inicial'
fi

api_target=${API_TARGET:-default}
case "$api_target" in
  default) ;;
  coach) production_die 'el workflow productivo aun no publica la imagen coach; usar API_TARGET=default' ;;
  *) production_die 'API_TARGET debe ser default' ;;
esac
registry_owner=${OPENGYM_REGISTRY_OWNER:-agustincocconi}
printf '%s' "$registry_owner" | grep -Eq '^[a-z0-9][a-z0-9-]*$' ||
  production_die 'OPENGYM_REGISTRY_OWNER debe ser un namespace GHCR en minusculas'
export API_TARGET="$api_target"
export OPENGYM_IMAGE_TAG="$expected_commit"
export OPENGYM_REGISTRY_OWNER="$registry_owner"

state_dir="$PRODUCTION_REPO_ROOT/.production-state"
umask 077
mkdir -p "$state_dir"
deploy_log="$state_dir/deployments.tsv"
if [ ! -e "$deploy_log" ]; then
  printf 'deployed_utc\tcommit\tapi_target\tapi_image\tweb_image\tbackup_archive\tbackup_sha256\tstatus\n' > "$deploy_log"
fi

docker info >/dev/null 2>&1 || production_die 'Docker no esta disponible'
docker compose version >/dev/null
docker compose -f "$PRODUCTION_REPO_ROOT/docker-compose.yml" config --quiet
production_compose_release config --quiet

if ! production_is_true "${SKIP_LOCAL_GATE:-0}"; then
  sh "$PRODUCTION_SCRIPT_DIR/verify-production-candidate.sh"
else
  [ "${CONFIRMED_CI_COMMIT:-}" = "$expected_commit" ] ||
    production_die 'SKIP_LOCAL_GATE exige CONFIRMED_CI_COMMIT igual al commit candidato'
  production_info 'Gate local omitido: el operador confirmo el mismo commit en CI.'
fi

build_date=$(date -u +%Y-%m-%dT%H:%M:%SZ)

api_ref="ghcr.io/$registry_owner/opengym-api:$expected_commit-$api_target"
web_ref="ghcr.io/$registry_owner/opengym-web:$expected_commit"
production_info "Descargando imagenes inmutables para $expected_commit..."
docker pull "$api_ref"
docker pull "$web_ref"

for image_ref in "$api_ref" "$web_ref"; do
  image_revision=$(docker image inspect --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}' "$image_ref")
  [ "$image_revision" = "$expected_commit" ] ||
    production_die "la imagen $image_ref no declara el commit candidato"
done

rollback_tag="rollback-$(date -u +%Y%m%dT%H%M%SZ)"
rollback_ready=1
for service in api web; do
  container_id=$(production_compose ps -q "$service")
  if [ -z "$container_id" ]; then
    rollback_ready=0
    continue
  fi
  image_id=$(docker inspect --format '{{.Image}}' "$container_id")
  if [ "$service" = api ]; then
    docker image tag "$image_id" "ghcr.io/$registry_owner/opengym-api:$rollback_tag-$api_target"
  else
    docker image tag "$image_id" "ghcr.io/$registry_owner/opengym-web:$rollback_tag"
  fi
done

backup_output=$(BACKUP_DIR="${BACKUP_DIR:-}" \
  BACKUP_RETENTION_COUNT="${BACKUP_RETENTION_COUNT:-14}" \
  sh "$PRODUCTION_SCRIPT_DIR/backup-production.sh")
printf '%s\n' "$backup_output"
backup_archive=$(printf '%s\n' "$backup_output" | sed -n 's/^BACKUP_ARCHIVE=//p' | tail -n 1)
[ -n "$backup_archive" ] || production_die 'el backup no devolvio la ruta del artefacto'
backup_sha256=$(printf '%s\n' "$backup_output" | sed -n 's/^BACKUP_SHA256=//p' | tail -n 1)
printf '%s' "$backup_sha256" | grep -Eq '^[0-9a-f]{64}$' ||
  production_die 'el backup no devolvio un checksum SHA-256 valido'

production_info 'Reemplazando los contenedores por las imagenes del candidato...'
deployment_status=0
production_compose_release up -d --no-build || deployment_status=$?

expect_locked=1
production_is_true "$bootstrap" && expect_locked=0
if [ "$deployment_status" -eq 0 ]; then
  PRODUCTION_URL="$PRODUCTION_URL" EXPECT_LOCKED="$expect_locked" CHECK_CONTAINER_CONFIG=1 \
    sh "$PRODUCTION_SCRIPT_DIR/smoke-production.sh" || deployment_status=$?
fi

if [ "$deployment_status" -ne 0 ]; then
  if [ "$rollback_ready" -eq 1 ]; then
    production_info "El despliegue o el smoke fallo; restaurando las imagenes previas ($rollback_tag)..."
    if OPENGYM_IMAGE_TAG="$rollback_tag" production_compose_release up -d --no-build; then
      PRODUCTION_URL="$PRODUCTION_URL" EXPECT_LOCKED="$expect_locked" CHECK_CONTAINER_CONFIG=1 \
        sh "$PRODUCTION_SCRIPT_DIR/smoke-production.sh" || true
    else
      production_info 'El rollback automatico tambien fallo; conservar datos y revisar los logs.'
    fi
  else
    production_info 'El despliegue fallo y no habia un stack previo completo para revertir automaticamente.'
  fi
  printf '%s\t%s\t%s\t-\t-\t%s\t%s\tfailed\n' \
    "$build_date" "$expected_commit" "$api_target" "$backup_archive" "$backup_sha256" >> "$deploy_log"
  production_die 'despliegue fallido; revisar logs antes de cualquier restauracion de datos'
fi

api_image=$(docker image inspect --format '{{index .RepoDigests 0}}' "$api_ref")
web_image=$(docker image inspect --format '{{index .RepoDigests 0}}' "$web_ref")
printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\tsuccess\n' \
  "$build_date" "$expected_commit" "$api_target" "$api_image" "$web_image" "$backup_archive" "$backup_sha256" >> "$deploy_log"
printf 'commit=%s\napi_target=%s\napi_image=%s\nweb_image=%s\nrollback_tag=%s\nbackup_archive=%s\nbackup_sha256=%s\ndeployed_utc=%s\n' \
  "$expected_commit" "$api_target" "$api_image" "$web_image" "$rollback_tag" "$backup_archive" "$backup_sha256" "$build_date" > "$state_dir/current.env"

production_info "Despliegue completo: $expected_commit"
production_info "Backup previo: $backup_archive"
