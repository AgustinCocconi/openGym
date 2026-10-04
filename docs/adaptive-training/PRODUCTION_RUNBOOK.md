# Runbook de la instancia productiva personal

Este runbook opera una unica instancia de openGym publicada desde la rama
`personal`. La VM consume imagenes multi-arquitectura de GHCR por commit y no
compila en produccion.

La politica esta en `PRODUCTION_DEPLOYMENT.md`; estado y gate en
[el plan OCI](OCI_DEPLOYMENT_PLAN.md#checkpoint). La configuracion general
sigue en `../SELF_HOSTING.md` y `../SELF_HOSTING_HTTPS.md`.

## Datos que deben definirse

| Dato | Valor |
| --- | --- |
| Host Linux | OCI `VM.Standard.E2.1.Micro` AMD64, 1 GB RAM + 1 GB swap, `sa-vinhedo-1` |
| Dominio HTTPS definitivo | `gym.mientrenadorpersonal.com.ar` |
| Checkout | `/srv/opengym` |
| Backups locales | `/srv/opengym-backups` |
| Copia cifrada fuera del host | Esta PC: `%LOCALAPPDATA%/openGym-backups`; resguardo diferido por propietario |
| Target de API | `default`; el workflow productivo aun no publica `coach` |
| Retencion local | 14 backups por defecto |

No registrar passkeys con un hostname provisional. `RP_ID` queda ligado al
dominio y cambiarlo obliga a volver a registrar las credenciales.

## Requisitos del host

- Linux, Docker Engine y Compose >= 2.24.4 (loopback).
- `git`, `curl`, `tar` y `sha256sum`.
- Disco persistente para el checkout, `data/`, `media/` y `coach-auth/`.
- Cloudflare Tunnel apuntando a `http://127.0.0.1:8080`.
- Acceso de salida para descargar bases de imagen, dependencias y media.

Imagenes del fork: `ghcr.io/agustincocconi/opengym-api` y `opengym-web`.
Revalidar acceso y plataformas del SHA candidato; evidencia de publicacion
en la fase 4 del plan, sin duplicar aca su estado.

El usuario operativo debe poder usar Docker y escribir en el checkout y en el
directorio de backups. Los backups se crean con permisos privados y deben vivir
fuera del checkout.

El backup usa un contenedor efimero `alpine:3.22`, sin red ni filesystem
escribible, para poder leer tambien los archivos `0600` creados por la API. El
archivo resultante pertenece al usuario operativo porque Docker transmite el
tar por stdout; puede fijarse otra imagen compatible con
`BACKUP_HELPER_IMAGE`.

## Precondiciones del bootstrap

Estos comandos requieren gate completo y autorizacion separada. El deploy
prueba el origen por loopback y queda pending-external hasta comprobar HTTPS
argentino autenticado y WAF exterior. Procedimiento y credenciales privadas en
[sondas protegidas](../../ops/PROTECTED_OPERATIONS.md); no retirar Access/WAF.

Override preparado: `!override` publica web solo en loopback; api/web usan
logs `local`, 10 MB x 3. El adaptador exige Compose >= 2.24.4; 2.20.2 conserva
el puerto publico pese al tag. Verificar ports/logging resueltos con ambos
archivos antes del deploy aprobado. data/audit.log mantiene su rotacion propia.
Host, cuota y alarmas: [plan concreto](../../ops/oci/REMEDIATION.md).

## Instalacion inicial

1. Clonar el fork en el host y configurar el upstream:

   ```bash
   git clone https://github.com/AgustinCocconi/openGym.git /srv/opengym
   cd /srv/opengym
   git remote add upstream https://github.com/DuarteSantos8/openGym.git
   git switch personal
   git pull --ff-only origin personal
   ```

2. Confirmar que el workflow **Publish personal images** paso para el commit y
   que ambos paquetes GHCR son publicos.

3. Copiar `.env.example` a `.env`. Usar el dominio definitivo y desactivar
   invitados desde el comienzo:

   ```env
   RP_ID=gym.mientrenadorpersonal.com.ar
   ORIGIN=https://gym.mientrenadorpersonal.com.ar
   WEB_PORT=8080
   RP_NAME=openGym
   INVITE_ONLY=0
   ALLOW_GUEST=0
   ```

   `RP_ID` es solo el hostname. `ORIGIN` incluye `https://` y no lleva slash
   final. Mantener `.env` fuera de Git.

4. Configurar Cloudflare Tunnel y comprobar que envia el dominio a
   `http://127.0.0.1:8080` (o al `WEB_PORT` elegido). Si Cloudflare es el proxy
   real, revisar `CF_CONNECTING_IP` segun `SELF_HOSTING.md`.

5. Ejecutar el primer despliegue en modo bootstrap. Este es el unico momento en
   que se admite `INVITE_ONLY=0`:

   ```bash
   cd /srv/opengym
   commit=$(git rev-parse HEAD)
   SKIP_LOCAL_GATE=1 CONFIRMED_CI_COMMIT="$commit" \
   PRODUCTION_URL=https://gym.mientrenadorpersonal.com.ar \
   BACKUP_DIR=/srv/opengym-backups \
   BOOTSTRAP_OWNER=1 \
   bash ops/deploy-production.sh "$commit"
   ```

## Alta y cierre del registro

Tras el bootstrap protegido, continuar sin dejar el registro abierto:

1. Abrir inmediatamente la URL y registrar el perfil propietario. Obtener su
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
   PRODUCTION_URL=https://gym.mientrenadorpersonal.com.ar SMOKE_ORIGIN_URL=http://127.0.0.1:8080 EXPECT_LOCKED=1 CHECK_CONTAINER_CONFIG=1 \
     bash ops/smoke-production.sh
   ```

2. Confirmar un login con passkey, una escritura y una lectura de prueba desde
   la interfaz. Los scripts de smoke son deliberadamente de solo lectura.

## Actualizacion ordinaria

El commit debe estar integrado y probado en `origin/personal`. En el host:

```bash
cd /srv/opengym
git fetch origin personal
git switch personal
git merge --ff-only origin/personal
commit=$(git rev-parse HEAD)
SKIP_LOCAL_GATE=1 CONFIRMED_CI_COMMIT="$commit" \
PRODUCTION_URL=https://gym.mientrenadorpersonal.com.ar \
BACKUP_DIR=/srv/opengym-backups \
BACKUP_RETENTION_COUNT=14 \
API_TARGET=default \
bash ops/deploy-production.sh "$commit"
```

El script rechaza una rama distinta, un SHA abreviado, cambios locales, un
commit diferente de `origin/personal`, HTTP, un `RP_ID`/`ORIGIN` inconsistente o
una instancia sin cerrar. Luego:

1. exige confirmacion del mismo commit aprobado por CI;
2. descarga las imagenes etiquetadas con el SHA completo y verifica su revision;
3. crea y verifica un backup consistente;
4. reemplaza los contenedores sin tocar los directorios persistentes;
5. ejecuta smoke interno; registra digestos y pending-external en `.production-state/`.

La VM no construye ni repite el gate de CI. `CONFIRMED_CI_COMMIT` confirma el
mismo SHA aprobado por el workflow; no es prueba automatica del estado de CI.

Descarga, revision, backup y smoke no se omiten; completar la aceptacion protegida.

## Backup periodico

[Rutina operativa](../../ops/PRODUCTION_ROUTINE.md): backup diario, retencion 14,
copia cifrada a PC y simulacro mensual. Verifica imagenes aceptadas y cambios
operativos; preparacion no acredita RPO ni activacion remota.

Manual: `BACKUP_DIR=/srv/opengym-backups BACKUP_RETENTION_COUNT=14 sh ops/backup-production.sh`.
Antes de deploy/rollback, detener timer y esperar servicio inactivo.
`coach-auth/` excluido: reconectar proveedor si se pierde.

## Smoke y diagnostico

El smoke remoto no escribe datos:

```bash
PRODUCTION_URL=https://gym.mientrenadorpersonal.com.ar SMOKE_ORIGIN_URL=http://127.0.0.1:8080 bash ops/smoke-production.sh
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
PRODUCTION_URL=https://gym.mientrenadorpersonal.com.ar SMOKE_ORIGIN_URL=http://127.0.0.1:8080 EXPECT_LOCKED=1 CHECK_CONTAINER_CONFIG=1 \
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
archive=/srv/opengym-backups/opengym-data-YYYYMMDDTHHMMSSZ-COMMIT.tar.gz
(cd "$(dirname "$archive")" && sha256sum --check "$(basename "$archive").sha256")
isolated=$(mktemp -d)
bash ops/verify-backup-restore.sh "$archive" "$isolated"

docker compose stop api
mv data "data.before-restore-$(date -u +%Y%m%dT%H%M%SZ)"
mv "$isolated/data" data
rmdir "$isolated"
docker compose start api
PRODUCTION_URL=https://gym.mientrenadorpersonal.com.ar SMOKE_ORIGIN_URL=http://127.0.0.1:8080 EXPECT_LOCKED=1 CHECK_CONTAINER_CONFIG=1 \
  bash ops/smoke-production.sh
```

La copia `data.before-restore-*` permite volver atras sin borrar el estado que
se reemplazo. Retirarla manualmente solo despues de validar la restauracion y su
respaldo externo.

## Registro minimo por cambio

Conservar, sin secretos:

- fecha UTC y commit desplegado;
- resultado del workflow **Publish personal images**;
- target `default` y digestos de imagen;
- ruta y SHA-256 del backup previo;
- resultado del smoke;
- rollback realizado, si lo hubo.

`deploy-production.sh` escribe ese nucleo en
`.production-state/deployments.tsv`; el directorio esta ignorado por Git.
