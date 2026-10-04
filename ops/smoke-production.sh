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

# The public origin remains the passkey origin, even for a loopback probe.
fetch_base=$production_url
fetch_protocol=https
cookie_file=${SMOKE_ACCESS_COOKIE_FILE:-}
receipt_file=${SMOKE_RECEIPT_FILE:-}
if [ -n "${SMOKE_ORIGIN_URL:-}" ]; then
  printf '%s' "$SMOKE_ORIGIN_URL" | grep -Eq '^http://127\.0\.0\.1:[0-9]+$' ||
    production_die 'SMOKE_ORIGIN_URL debe ser http://127.0.0.1:<puerto>'
  port=${SMOKE_ORIGIN_URL##*:}
  [ "$port" -ge 1 ] && [ "$port" -le 65535 ] ||
    production_die 'puerto de loopback fuera de rango'
  [ -z "$cookie_file" ] && [ -z "$receipt_file" ] ||
    production_die 'el smoke interno no recibe cookies ni certifica HTTPS externo'
  fetch_base=$SMOKE_ORIGIN_URL
  fetch_protocol=http
fi
if [ -n "$cookie_file" ]; then
  [ -f "$cookie_file" ] && [ ! -L "$cookie_file" ] ||
    production_die 'SMOKE_ACCESS_COOKIE_FILE debe ser un archivo privado regular'
  # A slash prevents curl from interpreting a missing filename as cookie text.
  case "$cookie_file" in
    */*) ;;
    *) cookie_file="./$cookie_file" ;;
  esac
fi
if [ -n "$receipt_file" ]; then
  [ -n "$cookie_file" ] || production_die 'la constancia HTTPS requiere cookie Access'
  printf '%s' "${SMOKE_COMMIT:-}" | grep -Eq '^[0-9a-f]{40}$' ||
    production_die 'SMOKE_COMMIT debe ser el SHA completo del candidato'
  production_is_true "${EXPECT_LOCKED:-1}" ||
    production_die 'la constancia requiere registro cerrado'
  [ ! -e "$receipt_file" ] && [ ! -L "$receipt_file" ] ||
    production_die 'la constancia ya existe; elegir un archivo nuevo'
fi

umask 077
tmp_dir=$(mktemp -d)
cleanup() {
  rm -f -- "$tmp_dir/index.html" "$tmp_dir/health.json" "$tmp_dir/config.json" "$tmp_dir/trace.txt"
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
    set -- --silent --show-error --proto "=$fetch_protocol" --max-time 20 \
      --output "$output" --write-out '%{http_code}'
    [ -z "$cookie_file" ] || set -- "$@" --cookie "$cookie_file"
    status=0
    http_code=$(curl "$@" "$url") || status=$?
    if [ "$status" -eq 0 ]; then
      case "$http_code" in
        200) return 0 ;;
        301|302|303|307|308|401|403)
          production_die "sonda rechazada/redirigida (HTTP $http_code); revisar Access/WAF"
          ;;
      esac
    fi
    attempt=$((attempt + 1))
    [ "$attempt" -le "$attempts" ] && sleep "$interval"
  done
  production_die "sonda fallida (HTTP ${http_code:-000})"
}

production_info "Comprobando frontend en $fetch_base"
fetch_with_retry "$fetch_base/" "$tmp_dir/index.html"
if ! grep -Fq 'id="root"' "$tmp_dir/index.html" &&
   ! grep -Fq "id='root'" "$tmp_dir/index.html"; then
  production_die 'el frontend no contiene el nodo raiz esperado'
fi

production_info 'Comprobando /api/health'
fetch_with_retry "$fetch_base/api/health" "$tmp_dir/health.json"
grep -Eq '"ok"[[:space:]]*:[[:space:]]*true' "$tmp_dir/health.json" ||
  production_die '/api/health no informo ok=true'

production_info 'Comprobando /api/config'
fetch_with_retry "$fetch_base/api/config" "$tmp_dir/config.json"
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

if [ -n "$receipt_file" ]; then
  fetch_with_retry "$production_url/cdn-cgi/trace" "$tmp_dir/trace.txt"
  grep -Fxq 'loc=AR' "$tmp_dir/trace.txt" ||
    production_die 'la constancia HTTPS debe obtenerse desde Argentina'
  printf 'commit=%s\nproduction_url=%s\nchecked_epoch=%s\ncountry=AR\nhttps_smoke=passed\nexpect_locked=1\n' \
    "$SMOKE_COMMIT" "$production_url" "$(date -u +%s)" > "$receipt_file"
  production_info 'Constancia HTTPS argentina guardada sin cookies ni datos privados.'
fi
if [ "$fetch_protocol" = http ]; then
  production_info 'Smoke interno completo; falta aceptar HTTPS protegido y WAF exterior.'
else
  production_info 'Smoke HTTPS completo (solo lectura).'
fi
