#!/usr/bin/env sh

set -eu

production_die() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

production_info() {
  printf '%s\n' "$*"
}

production_require_command() {
  command -v "$1" >/dev/null 2>&1 || production_die "falta el comando requerido: $1"
}

production_repo_root() {
  git -C "$PRODUCTION_SCRIPT_DIR/.." rev-parse --show-toplevel 2>/dev/null ||
    production_die 'ops/ debe ejecutarse desde un checkout Git de openGym'
}

production_compose() {
  docker compose -f "$PRODUCTION_REPO_ROOT/docker-compose.yml" "$@"
}

production_compose_release() {
  # Older Compose can accept !override while retaining the public port.
  production_compose_version=$(docker compose version --short) ||
    production_die 'no se pudo consultar la version de Docker Compose'
  production_compose_version=${production_compose_version#v}
  production_compose_version=${production_compose_version%%[-+]*}
  printf '%s\n' "$production_compose_version" | awk -F. '
    /^[0-9]+\.[0-9]+\.[0-9]+$/ {
      if ($1 > 2 || ($1 == 2 && ($2 > 24 || ($2 == 24 && $3 >= 4)))) ok = 1
    }
    END { exit !ok }
  ' || production_die 'el Compose productivo requiere Docker Compose >= 2.24.4 para publicar solo en loopback'
  docker compose \
    -f "$PRODUCTION_REPO_ROOT/docker-compose.yml" \
    -f "$PRODUCTION_REPO_ROOT/ops/compose.production.yml" \
    "$@"
}

production_env_value() {
  key=$1
  value=$(awk -v wanted="$key" '
    /^[[:space:]]*#/ { next }
    {
      line = $0
      sub(/^[[:space:]]*/, "", line)
      if (index(line, wanted "=") == 1) value = substr(line, length(wanted) + 2)
    }
    END { if (value != "") print value }
  ' "$PRODUCTION_REPO_ROOT/.env")
  value=$(printf '%s' "$value" | tr -d '\r')
  case "$value" in
    \"*\") value=${value#\"}; value=${value%\"} ;;
    \'*\') value=${value#\'}; value=${value%\'} ;;
  esac
  printf '%s' "$value"
}

production_is_true() {
  case "$1" in
    1|true|TRUE|yes|YES|on|ON) return 0 ;;
    *) return 1 ;;
  esac
}

production_is_false() {
  case "$1" in
    0|false|FALSE|no|NO|off|OFF) return 0 ;;
    *) return 1 ;;
  esac
}

PRODUCTION_SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)
PRODUCTION_REPO_ROOT=$(production_repo_root)
export PRODUCTION_SCRIPT_DIR PRODUCTION_REPO_ROOT
