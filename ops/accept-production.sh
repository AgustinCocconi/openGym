#!/usr/bin/env sh

set -eu

PRODUCTION_SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)
. "$PRODUCTION_SCRIPT_DIR/production-common.sh"

[ "$#" -eq 2 ] || production_die 'uso: accept-production.sh <commit-completo> <constancia-HTTPS>'
commit=$1
receipt=$2
printf '%s' "$commit" | grep -Eq '^[0-9a-f]{40}$' ||
  production_die 'se requiere un SHA completo'
[ -f "$receipt" ] && [ ! -L "$receipt" ] || production_die 'constancia HTTPS ausente/no regular'
state_dir="$PRODUCTION_REPO_ROOT/.production-state"
state_file="$state_dir/current.env"
[ -f "$state_file" ] && [ ! -L "$state_file" ] || production_die 'falta estado del despliegue'

# Read values without executing either operator-supplied file.
value() {
  awk -v key="$2" 'index($0, key "=") == 1 { sub(/^[^=]*=/, ""); sub(/\r$/, ""); print }' "$1"
}
[ "$(value "$state_file" commit)" = "$commit" ] || production_die 'candidato distinto del desplegado'
[ "$(git -C "$PRODUCTION_REPO_ROOT" rev-parse HEAD)" = "$commit" ] ||
  production_die 'HEAD distinto del desplegado'
[ "$(value "$state_file" acceptance_status)" = pending-external ] ||
  production_die 'el despliegue no esta pendiente de aceptacion'
[ "$(value "$receipt" commit)" = "$commit" ] || production_die 'constancia de otro candidato'
origin=$(production_env_value ORIGIN)
[ "$(value "$receipt" production_url)" = "$origin" ] || production_die 'constancia de otro origen'
[ "$(value "$receipt" country)" = AR ] &&
  [ "$(value "$receipt" https_smoke)" = passed ] &&
  [ "$(value "$receipt" expect_locked)" = 1 ] || production_die 'constancia HTTPS incompleta'
checked_epoch=$(value "$receipt" checked_epoch)
case "$checked_epoch" in
  ''|*[!0-9]*) production_die 'fecha de constancia invalida' ;;
esac
age_seconds=$(($(date -u +%s) - checked_epoch))
[ "$age_seconds" -ge 0 ] && [ "$age_seconds" -le 1800 ] ||
  production_die 'la constancia debe tener menos de 30 minutos'

# The limited Cloudflare token is revoked; the owner verifies the event in UI.
[ "${CONFIRMED_WAF_COMMIT:-}" = "$commit" ] ||
  production_die 'confirmar evento WAF exterior Block/regla propia para este candidato'
printf '%s' "${CONFIRMED_WAF_RAY:-}" | grep -Eq '^[0-9a-f]{16}$' ||
  production_die 'indicar Ray ID del evento WAF confirmado'
printf '%s' "${CONFIRMED_WAF_COUNTRY:-}" | grep -Eq '^[A-Z]{2}$' &&
  [ "$CONFIRMED_WAF_COUNTRY" != AR ] || production_die 'el evento WAF debe ser exterior a Argentina'

for service in api web; do
  container=$(production_compose ps -q "$service")
  [ -n "$container" ] || production_die "falta contenedor $service"
  revision=$(docker inspect --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}' "$container")
  [ "$revision" = "$commit" ] || production_die "revision efectiva distinta en $service"
done
web_port=$(production_env_value WEB_PORT)
web_port=${web_port:-8080}
PRODUCTION_URL="$origin" SMOKE_ORIGIN_URL="http://127.0.0.1:$web_port" \
  EXPECT_LOCKED=1 CHECK_CONTAINER_CONFIG=1 sh "$PRODUCTION_SCRIPT_DIR/smoke-production.sh"

umask 077
accepted_epoch=$(date -u +%s)
# State stays pending if any preceding check failed.
awk '!/^acceptance_status=/' "$state_file" > "$state_file.accepting"
printf 'acceptance_status=accepted\naccepted_epoch=%s\n' "$accepted_epoch" >> "$state_file.accepting"
printf '%s\t%s\t%s\t%s\t%s\n' "$accepted_epoch" "$commit" "$checked_epoch" \
  "$CONFIRMED_WAF_COUNTRY" "$CONFIRMED_WAF_RAY" >> "$state_dir/acceptances.tsv"
mv -- "$state_file.accepting" "$state_file"
production_info "Despliegue aceptado: $commit; HTTPS AR/registro cerrado y WAF exterior confirmados."
