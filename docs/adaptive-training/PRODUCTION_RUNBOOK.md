# Runbook de la instancia productiva personal

Este runbook opera una unica instancia de openGym construida desde la rama
`personal`. Todavia no hay un host ni un dominio elegidos: completar esos dos
datos antes de ejecutar el primer despliegue.

La politica y las razones de cada control estan en
`PRODUCTION_DEPLOYMENT.md`. La configuracion general de openGym sigue en
`../SELF_HOSTING.md` y `../SELF_HOSTING_HTTPS.md`.

## Datos que deben definirse

| Dato | Valor pendiente |
| --- | --- |
| Host Linux | `PENDIENTE` |
| Dominio HTTPS definitivo | `PENDIENTE` |
| Checkout | `/srv/opengym` (recomendado) |
| Backups locales | `/var/backups/opengym` (recomendado) |
| Copia cifrada fuera del host | `PENDIENTE` |
| Target de API | `default`, salvo que Codex CLI o Claude Agent SDK deban vivir en el contenedor |
| Retencion local | 14 backups por defecto |

No registrar passkeys con un hostname provisional. `RP_ID` queda ligado al
dominio y cambiarlo obliga a volver a registrar las credenciales.

## Requisitos del host

- Linux con Docker Engine y el plugin `docker compose`.
- `git`, `curl`, `tar` y `sha256sum`.
- Disco persistente para el checkout, `data/`, `media/` y `coach-auth/`.
- Un reverse proxy o Tunnel que termine TLS y apunte al `WEB_PORT` de openGym.
- Acceso de salida para descargar bases de imagen, dependencias y media.

El usuario operativo debe poder usar Docker y escribir en el checkout y en el
directorio de backups. Los backups se crean con permisos privados y deben vivir
fuera del checkout.

El backup usa un contenedor efimero `alpine:3.22`, sin red ni filesystem
escribible, para poder leer tambien los archivos `0600` creados por la API. El
archivo resultante pertenece al usuario operativo porque Docker transmite el
tar por stdout; puede fijarse otra imagen compatible con
`BACKUP_HELPER_IMAGE`.

## Instalacion inicial

1. Clonar el fork en el host y configurar el upstream:

   ```bash
   git clone https://github.com/AgustinCocconi/openGym.git /srv/opengym
   cd /srv/opengym
   git remote add upstream https://github.com/DuarteSantos8/openGym.git
   git switch personal
   git pull --ff-only origin personal
   ```

2. Copiar `.env.example` a `.env`. Usar el dominio definitivo y desactivar
   invitados desde el comienzo:

   ```env
   RP_ID=gym.example.com
   ORIGIN=https://gym.example.com
   WEB_PORT=8080
   RP_NAME=openGym
   INVITE_ONLY=0
   ALLOW_GUEST=0
   ```

   `RP_ID` es solo el hostname. `ORIGIN` incluye `https://` y no lleva slash
   final. Mantener `.env` fuera de Git.

3. Configurar DNS/TLS y comprobar que el proxy envia el dominio a
   `http://127.0.0.1:8080` (o al `WEB_PORT` elegido). Si Cloudflare es el proxy
   real, revisar `CF_CONNECTING_IP` segun `SELF_HOSTING.md`.

4. Ejecutar el primer despliegue en modo bootstrap. Este es el unico momento en
   que se admite `INVITE_ONLY=0`:

   ```bash
   cd /srv/opengym
   commit=$(git rev-parse HEAD)
   PRODUCTION_URL=https://gym.example.com \
   BACKUP_DIR=/var/backups/opengym \
   BOOTSTRAP_OWNER=1 \
   bash ops/deploy-production.sh "$commit"
   ```

5. Abrir inmediatamente la URL y registrar el perfil propietario. Obtener su
   `id` desde `data/db.json`, configurar y recrear la API:

   ```env
   ADMIN_UIDS=id-del-propietario
   INVITE_ONLY=1
   ALLOW_GUEST=0
   ```

   ```bash
   commit=$(git rev-parse HEAD)
   OPENGYM_IMAGE_TAG="$commit" API_TARGET=default \
     docker compose -f docker-compose.yml -f ops/compose.production.yml \
     up -d --no-build api web
   PRODUCTION_URL=https://gym.example.com EXPECT_LOCKED=1 CHECK_CONTAINER_CONFIG=1 \
     bash ops/smoke-production.sh
   ```

6. Confirmar un login con passkey, una escritura y una lectura de prueba desde
   la interfaz. Los scripts de smoke son deliberadamente de solo lectura.

## Actualizacion ordinaria

El commit debe estar integrado y probado en `origin/personal`. En el host:

```bash
cd /srv/opengym
git fetch origin personal
git switch personal
git merge --ff-only origin/personal
commit=$(git rev-parse HEAD)
PRODUCTION_URL=https://gym.example.com \
BACKUP_DIR=/var/backups/opengym \
BACKUP_RETENTION_COUNT=14 \
API_TARGET=default \
bash ops/deploy-production.sh "$commit"
```

El script rechaza una rama distinta, un SHA abreviado, cambios locales, un
commit diferente de `origin/personal`, HTTP, un `RP_ID`/`ORIGIN` inconsistente o
una instancia sin cerrar. Luego:

1. ejecuta tests y build con Node 22 en contenedores aislados;
2. construye y etiqueta las imagenes con el SHA completo;
3. crea y verifica un backup consistente;
4. reemplaza los contenedores sin tocar los directorios persistentes;
5. ejecuta el smoke y registra el resultado en `.production-state/`.

Si el mismo commit ya paso el workflow **Tests** de GitHub, se puede omitir la
repeticion local solo de forma explicita:

```bash
SKIP_LOCAL_GATE=1 CONFIRMED_CI_COMMIT="$commit" \
PRODUCTION_URL=https://gym.example.com \
BACKUP_DIR=/var/backups/opengym \
bash ops/deploy-production.sh "$commit"
```

La construccion de imagenes y el smoke nunca se omiten.

## Backup periodico

Ejecutar, ademas del backup automatico previo a cada despliegue:

```bash
cd /srv/opengym
BACKUP_DIR=/var/backups/opengym BACKUP_RETENTION_COUNT=14 \
  bash ops/backup-production.sh
```

Copiar cada `.tar.gz`, `.sha256` y `.meta` a almacenamiento cifrado fuera del
host. Verificar despues de la transferencia desde el directorio destino:

```bash
sha256sum --check opengym-data-YYYYMMDDTHHMMSSZ-COMMIT.tar.gz.sha256
```

`coach-auth/` no entra en el archivo. Si se pierde, reconectar el proveedor.

## Smoke y diagnostico

El smoke remoto no escribe datos:

```bash
PRODUCTION_URL=https://gym.example.com bash ops/smoke-production.sh
docker compose ps
docker compose logs --tail=200 api web
```

Desde el checkout productivo puede agregarse `CHECK_CONTAINER_CONFIG=1` para
comparar `RP_ID` y `ORIGIN` efectivos con `.env`. No pegar `.env`, `data/`,
backups ni logs con credenciales en tickets o prompts.

## Rollback de codigo o imagen

No restaurar datos como primera reaccion. Leer
`.production-state/current.env`: `rollback_tag` identifica las imagenes que se
ejecutaban antes del ultimo despliegue exitoso.

```bash
rollback_tag=rollback-YYYYMMDDTHHMMSSZ
api_target=default
OPENGYM_IMAGE_TAG="$rollback_tag" API_TARGET="$api_target" \
  docker compose -f docker-compose.yml -f ops/compose.production.yml \
  up -d --no-build
PRODUCTION_URL=https://gym.example.com EXPECT_LOCKED=1 CHECK_CONTAINER_CONFIG=1 \
  bash ops/smoke-production.sh
```

El script de despliegue intenta este rollback automaticamente cuando falla el
smoke y existia un stack completo. Conservar las imagenes de rollback hasta
comprobar la nueva version; no ejecutar `docker image prune` durante esa ventana.

## Restauracion de datos

Restaurar solo si el rollback de codigo no puede leer el formato actual. Probar
primero el archivo y su checksum en un directorio aislado. En produccion:

```bash
cd /srv/opengym
archive=/var/backups/opengym/opengym-data-YYYYMMDDTHHMMSSZ-COMMIT.tar.gz
(cd "$(dirname "$archive")" && sha256sum --check "$(basename "$archive").sha256")
listing=$(mktemp)
tar -tzf "$archive" > "$listing" || { rm -f "$listing"; exit 1; }
if grep -Ev '^data(/|$)' "$listing"; then
  rm -f "$listing"
  echo 'El archivo contiene rutas inesperadas; abortar.' >&2
  exit 1
fi
rm -f "$listing"
docker compose stop api
mv data "data.before-restore-$(date -u +%Y%m%dT%H%M%SZ)"
tar -xzf "$archive" -C /srv/opengym
docker compose start api
PRODUCTION_URL=https://gym.example.com EXPECT_LOCKED=1 CHECK_CONTAINER_CONFIG=1 \
  bash ops/smoke-production.sh
```

La copia `data.before-restore-*` permite volver atras sin borrar el estado que
se reemplazo. Retirarla manualmente solo despues de validar la restauracion y su
respaldo externo.

## Registro minimo por cambio

Conservar, sin secretos:

- fecha UTC y commit desplegado;
- resultado del workflow **Tests** o del gate local;
- target `default`/`coach` e IDs de imagen;
- ruta y SHA-256 del backup previo;
- resultado del smoke;
- rollback realizado, si lo hubo.

`deploy-production.sh` escribe ese nucleo en
`.production-state/deployments.tsv`; el directorio esta ignorado por Git.
