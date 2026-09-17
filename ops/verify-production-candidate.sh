#!/usr/bin/env sh

set -eu

PRODUCTION_SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)
. "$PRODUCTION_SCRIPT_DIR/production-common.sh"

production_require_command docker
docker info >/dev/null 2>&1 || production_die 'Docker no esta disponible'

mount_repo="type=bind,src=$PRODUCTION_REPO_ROOT,dst=/source,readonly"

# Git for Windows rewrites POSIX-looking Docker arguments (for example
# /src/frontend) into host paths. Disable that conversion only for this script;
# Linux and macOS simply ignore this environment variable.
export MSYS_NO_PATHCONV=1

production_info '==> frontend: install, tests, build y comprobaciones'
docker run --rm \
  --mount "$mount_repo" \
  --mount type=volume,dst=/work \
  --workdir /work \
  node:22-alpine sh -ec '
    tar -C /source --exclude=.git --exclude=node_modules \
      --exclude="*/node_modules" --exclude=dist --exclude="*/dist" \
      --exclude=.production-state -cf - . | tar -C /work -xf -
    cd frontend
    npm ci
    npm test
    npm run build
    node scripts/check-locales.mjs
    node scripts/check-source-strings.mjs
    npm run test:fatigue-probe
  '

production_info '==> MCP: install, tests y carga directa por Node'
docker run --rm \
  --mount "$mount_repo" \
  --mount type=volume,dst=/work \
  --workdir /work \
  node:22-alpine sh -ec '
    tar -C /source --exclude=.git --exclude=node_modules \
      --exclude="*/node_modules" --exclude=dist --exclude="*/dist" \
      --exclude=.production-state -cf - . | tar -C /work -xf -
    cd mcp
    npm ci
    npm test
    npm run check:node-loadable
  '

production_info '==> API: install, tests y contratos generados'
docker run --rm \
  --mount "$mount_repo" \
  --mount type=volume,dst=/work \
  --workdir /work \
  node:22-alpine sh -ec '
    tar -C /source --exclude=.git --exclude=node_modules \
      --exclude="*/node_modules" --exclude=dist --exclude="*/dist" \
      --exclude=.production-state -cf - . | tar -C /work -xf -
    cd api
    npm ci --omit=optional
    npm test
    cd /work
    node scripts/build-coach-assets.mjs --check
    node api/scripts/check-core-loadable.mjs
  '

production_info 'Gate local de produccion completo.'
