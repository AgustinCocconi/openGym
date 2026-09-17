#!/usr/bin/env sh

set -eu

PRODUCTION_SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)
. "$PRODUCTION_SCRIPT_DIR/production-common.sh"

production_require_command curl

production_url=${1:-${PRODUCTION_URL:-}}
[ -n "$production_url" ] || production_die 'indicar la URL HTTPS como argumento o PRODUCTION_URL'
case "$production_url" in
  https://*) ;;
  *) production_die 'la URL productiva debe comenzar con https://' ;;
esac
case "$production_url" in
  */) production_die 'PRODUCTION_URL no debe terminar en /' ;;
esac

tmp_dir=$(mktemp -d)
cleanup() {
  rm -f -- "$tmp_dir/index.html" "$tmp_dir/health.json" "$tmp_dir/config.json"
  rmdir -- "$tmp_dir"
}
trap cleanup EXIT INT TERM

attempts=${SMOKE_ATTEMPTS:-30}
interval=${SMOKE_INTERVAL_SECONDS:-2}
case "$attempts" in
  ''|*[!0-9]*|0) production_die 'SMOKE_ATTEMPTS debe ser un entero mayor que cero' ;;
esac
case "$interval" in
  ''|*[!0-9]*|0) production_die 'SMOKE_INTERVAL_SECONDS debe ser un entero mayor que cero' ;;
esac

fetch_with_retry() {
  url=$1
  output=$2
  attempt=1
  while [ "$attempt" -le "$attempts" ]; do
    if curl --fail --silent --location --proto '=https' --proto-redir '=https' --max-time 20 "$url" > "$output"; then
      return 0
    fi
    attempt=$((attempt + 1))
    [ "$attempt" -le "$attempts" ] && sleep "$interval"
  done
  curl --fail --silent --show-error --location --proto '=https' --proto-redir '=https' --max-time 20 "$url" > "$output"
}

production_info "Comprobando frontend en $production_url"
fetch_with_retry "$production_url/" "$tmp_dir/index.html"
if ! grep -Fq 'id="root"' "$tmp_dir/index.html" &&
   ! grep -Fq "id='root'" "$tmp_dir/index.html"; then
  production_die 'el frontend no contiene el nodo raiz esperado'
fi

production_info 'Comprobando /api/health'
fetch_with_retry "$production_url/api/health" "$tmp_dir/health.json"
grep -Eq '"ok"[[:space:]]*:[[:space:]]*true' "$tmp_dir/health.json" ||
  production_die '/api/health no informo ok=true'

production_info 'Comprobando /api/config'
fetch_with_retry "$production_url/api/config" "$tmp_dir/config.json"
grep -Eq '"invite_only"[[:space:]]*:' "$tmp_dir/config.json" ||
  production_die '/api/config no devolvio el contrato esperado'

if production_is_true "${EXPECT_LOCKED:-1}"; then
  grep -Eq '"invite_only"[[:space:]]*:[[:space:]]*true' "$tmp_dir/config.json" ||
    production_die 'la instancia no tiene INVITE_ONLY activo'
  grep -Eq '"allow_guest"[[:space:]]*:[[:space:]]*false' "$tmp_dir/config.json" ||
    production_die 'la instancia todavia permite invitados'
fi

if production_is_true "${CHECK_CONTAINER_CONFIG:-0}"; then
  [ -f "$PRODUCTION_REPO_ROOT/.env" ] || production_die 'falta .env para validar el contenedor'
  expected_rp=$(production_env_value RP_ID)
  expected_origin=$(production_env_value ORIGIN)
  actual_rp=$(production_compose exec -T api printenv RP_ID | tr -d '\r')
  actual_origin=$(production_compose exec -T api printenv ORIGIN | tr -d '\r')
  [ "$actual_rp" = "$expected_rp" ] || production_die 'RP_ID efectivo no coincide con .env'
  [ "$actual_origin" = "$expected_origin" ] || production_die 'ORIGIN efectivo no coincide con .env'
  [ "$actual_origin" = "$production_url" ] || production_die 'ORIGIN efectivo no coincide con PRODUCTION_URL'
fi

production_info 'Smoke productivo completo (solo lectura).'
