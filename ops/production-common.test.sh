#!/usr/bin/env sh

set -eu

PRODUCTION_SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)
. "$PRODUCTION_SCRIPT_DIR/production-common.sh"

# No real Docker operation runs: the mock reports whether it was reached.
docker() {
  if [ "$*" = 'compose version --short' ]; then
    [ "$mock_version" != failed ] || return 1
    printf '%s\n' "$mock_version"
  else
    printf 'COMPOSE_CALLED\n'
  fi
}

for mock_version in v2.20.2-desktop.1 2.24.3 2.24.4 v2.39.4 5.6.0 unknown failed; do
  status=0
  output=$(production_compose_release config --quiet 2>&1) || status=$?
  case "$mock_version" in
    2.24.4|v2.39.4|5.6.0)
      [ "$status" -eq 0 ]
      printf '%s' "$output" | grep -q COMPOSE_CALLED
      ;;
    *)
      [ "$status" -ne 0 ]
      if printf '%s' "$output" | grep -q COMPOSE_CALLED; then
        production_die "Compose incompatible llego a ejecutar una operacion: $mock_version"
      fi
      ;;
  esac
  printf 'Compatibilidad Compose %s: OK\n' "$mock_version"
done
