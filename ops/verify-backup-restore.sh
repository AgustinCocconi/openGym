#!/usr/bin/env sh

set -eu
PRODUCTION_SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)
. "$PRODUCTION_SCRIPT_DIR/production-common.sh"

[ "$#" -eq 2 ] || production_die 'uso: verify-backup-restore.sh <archivo.tar.gz> <directorio-aislado-vacio>'
production_require_command python3
production_require_command sha256sum
archive=$1
destination=$2
[ -f "$archive" ] && [ ! -L "$archive" ] || production_die 'backup ausente/no regular'
base=$(basename -- "$archive")
[ -f "$archive.sha256" ] || production_die 'falta checksum'
(cd -- "$(dirname -- "$archive")" && sha256sum -c "$base.sha256" >/dev/null) ||
  production_die 'checksum incorrecto'
# Validate every entry before extraction; never replace data in a checkout.
python3 - "$archive" "$destination" "$PRODUCTION_REPO_ROOT" <<'PY'
import pathlib
import sys
import tarfile

archive, target, repo = map(pathlib.Path, sys.argv[1:])
target = target.resolve()
repo = repo.resolve()
if target == repo or repo in target.parents:
    sys.exit("El directorio aislado debe estar fuera del checkout.")
if target.exists() and (not target.is_dir() or any(target.iterdir())):
    sys.exit("El directorio aislado debe estar vacio.")
with tarfile.open(archive, "r:gz") as backup:
    entries = backup.getmembers()
    if not entries:
        sys.exit("Backup vacio.")
    for entry in entries:
        parts = entry.name.split("/")
        if (parts[0] != "data" or ".." in parts or "\\" in entry.name
                or ":" in entry.name or not (entry.isfile() or entry.isdir())):
            sys.exit("Backup con rutas, enlaces o tipos no permitidos.")
    target.mkdir(mode=0o700, parents=True, exist_ok=True)
    backup.extractall(target, members=entries)
print("RESTORE_VERIFIED=" + str(target / "data"))
PY
