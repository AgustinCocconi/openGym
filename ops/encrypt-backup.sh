#!/usr/bin/env sh

set -eu
PRODUCTION_SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)
. "$PRODUCTION_SCRIPT_DIR/production-common.sh"

[ "$#" -eq 3 ] || production_die 'uso: encrypt-backup.sh <archivo.tar.gz> <destinatario-age> <directorio-externo>'
archive=$1
recipient=$2
destination=$3
production_require_command age
production_require_command sha256sum
[ -f "$archive" ] && [ ! -L "$archive" ] || production_die 'backup ausente/no regular'
[ -f "$archive.sha256" ] || production_die 'falta checksum del backup'
base=$(basename -- "$archive")
case "$base" in
  opengym-data-*.tar.gz) ;;
  *) production_die 'nombre de backup inesperado' ;;
esac
printf '%s' "$recipient" | grep -Eq '^age1[0-9a-z]+$' ||
  production_die 'se requiere un destinatario publico age (la identidad privada queda fuera de OCI)'
(cd -- "$(dirname -- "$archive")" && sha256sum -c "$base.sha256" >/dev/null) ||
  production_die 'checksum original incorrecto'

umask 077
mkdir -p -- "$destination"
destination=$(CDPATH= cd -- "$destination" && pwd -P)
case "$destination/" in
  "$PRODUCTION_REPO_ROOT/"*) production_die 'la copia cifrada debe quedar fuera del checkout' ;;
esac
encrypted="$destination/$base.age"
for file in "$encrypted" "$encrypted.partial" "$encrypted.sha256" "$encrypted.meta"; do
  [ ! -e "$file" ] && [ ! -L "$file" ] || production_die 'destino existente; no sobrescribir'
done
trap 'rm -f -- "$encrypted.partial"' EXIT INT TERM
age --encrypt --recipient "$recipient" --output "$encrypted.partial" "$archive"
mv -- "$encrypted.partial" "$encrypted"
digest=$(sha256sum "$encrypted" | awk '{ print $1 }')
printf '%s  %s\n' "$digest" "$base.age" > "$encrypted.sha256"
(cd -- "$destination" && sha256sum -c "$base.age.sha256" >/dev/null)
source_digest=$(sha256sum "$archive" | awk '{ print $1 }')
printf 'original_archive=%s\noriginal_sha256=%s\nciphertext_sha256=%s\n' \
  "$base" "$source_digest" "$digest" > "$encrypted.meta"
trap - EXIT INT TERM
production_info 'Copia cifrada verificada; transferir age/sha256/meta y comprobar checksum en destino.'
printf 'ENCRYPTED_ARCHIVE=%s\n' "$encrypted"
