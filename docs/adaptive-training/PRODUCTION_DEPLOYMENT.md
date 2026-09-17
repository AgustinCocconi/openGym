# Despliegue productivo personal

## Decision

Mantener una sola instancia remota de produccion para uso personal. El
desarrollo, los tests y las pruebas manuales previas se ejecutan localmente; no
se crea un ambiente remoto de desarrollo. La rama desplegable es `personal` y
`main` continua siendo un espejo sin cambios propios de `upstream/main`.

```text
feature/* -> tests -> personal -> backup -> despliegue por commit -> smoke
```

No editar codigo ni datos directamente en el servidor. Una mejora llega a
produccion solo desde un commit reproducible de `personal` que haya pasado el
gate vigente del repositorio.

## Arquitectura inicial

- Un host Linux disponible durante el uso, con Docker Compose y disco
  persistente.
- Un unico origen HTTPS estable para web y API.
- Un dominio definitivo antes de registrar passkeys: cambiar `RP_ID` invalida
  las credenciales asociadas al hostname anterior.
- `./data` persistente y respaldado. Contiene perfiles, passkeys, historial,
  secreto de instancia y credenciales HTTPS del Coach cifradas.
- `./coach-auth` persistente si se usa Codex, pero excluido de backups: si se
  pierde, se vuelve a iniciar sesion con el proveedor.
- Para una instancia personal, crear primero el perfil propietario y luego
  cerrar el acceso con `ADMIN_UIDS`, `INVITE_ONLY=1` y `ALLOW_GUEST=0`.

Cloudflare puede seguir utilizandose como DNS o Tunnel, pero openGym no se
despliega en Workers, D1 ni KV. Necesita contenedores y filesystem persistente.

## Estrategia de construccion

La primera version se construye desde el checkout de `personal` en el host. Los
scripts de `ops/` agregan un override de Compose que etiqueta las imagenes con
el commit exacto sin cambiar el Compose de upstream.

No ejecutar `docker compose pull` como mecanismo de despliegue del fork mientras
el Compose base apunte a las imagenes oficiales de upstream: esas imagenes no
contienen los cambios personales.

Cuando la frecuencia de despliegue lo justifique, GitHub Actions debe publicar
imagenes propias en GHCR con dos etiquetas:

- una inmutable derivada del commit;
- una etiqueta movil `personal` solo como conveniencia.

Produccion siempre registra y, preferentemente, consume la etiqueta inmutable.
No hace falta el target Docker `coach` para Anthropic, OpenAI, Gemini o un
endpoint compatible mediante API key. Usar ese target solo para Claude Agent
SDK o Codex CLI dentro del contenedor.

## Secuencia de despliegue

1. Verificar arbol Git limpio, rama `personal` y commit esperado.
2. Ejecutar los tests y builds definidos por upstream mas los tests propios.
3. Construir una sola vez, o reutilizar, las imagenes etiquetadas con el commit
   exacto sin reemplazar los contenedores activos.
4. Detener brevemente la API para obtener un backup consistente de `./data`,
   calcular SHA-256 y guardar el commit de origen.
5. Levantar el stack sin reemplazar `./data`, `./media` ni `./coach-auth`.
6. Verificar `/api/health`, `/api/config`, la carga del frontend y los valores
   efectivos de `RP_ID`/`ORIGIN` dentro del contenedor.
7. Registrar fecha, commit, IDs de imagen y checksum del backup.

Construir antes del backup reduce el intervalo entre la copia consistente y el
cambio de version. Un fallo de health check revierte las imagenes al conjunto
que estaba ejecutandose. Los datos se restauran solo si el cambio llego a
modificar su formato y el rollback de codigo no puede leerlos; no automatizar
una restauracion destructiva.

## Backups

- Generar un backup antes de cada despliegue y otro periodico.
- Guardar al menos una copia cifrada fuera del host.
- Aplicar una politica explicita de retencion.
- Verificar checksum despues de copiar.
- Probar periodicamente la restauracion en un directorio o instancia aislada.
- Nunca incluir el backup, `.env`, `data/` ni `coach-auth/` en Git, prompts o
  logs de CI.

Los exportadores SQL/D1 de Training App no se portan. Solo se reutiliza la
practica de producir backups verificables y ensayar la restauracion.

## Artefactos del fork

- `ops/deploy-production.sh`: preflight, gate, construccion, backup, despliegue,
  health check, rollback de imagenes y registro de version.
- `ops/backup-production.sh`: archivo consistente, checksum y retencion.
- `ops/smoke-production.sh`: comprobaciones de solo lectura.
- `ops/verify-production-candidate.sh`: tests y build en Node 22 aislado.
- `ops/compose.production.yml`: etiquetas locales e inmutables por commit.
- `PRODUCTION_RUNBOOK.md`: instalacion inicial, actualizacion, rollback y
  restauracion.
- `.github/workflows/test.yml`: gate vigente tambien para pushes a `personal`.

Mantener estos artefactos fuera de archivos centrales de upstream cuando sea
posible para reducir conflictos durante las sincronizaciones.

## Estado revalidado al 2026-09-16

Estado comprobado antes de preparar estos artefactos, preservando los cambios
locales existentes:

- `origin` apunta a `https://github.com/AgustinCocconi/openGym.git` y `upstream`
  a `https://github.com/DuarteSantos8/openGym.git`.
- `main`, `origin/main` y el `upstream/main` consultado en remoto coinciden en
  `a68a88d2da04cf3334eeeca136385114a65450ff`.
- `personal`, `origin/personal` y la rama remota consultada coinciden en
  `e7bdbab4a255a1f92286ed098cf70dc82ef3d2a0`; `personal` esta un commit por
  delante de `main` y no diverge de `origin/personal`.
- Ya habia dos archivos sin seguimiento bajo
  `frontend/src/lib/adaptive-training/`: `recency.js` y `recency.test.js`. Se
  preservaron sin cambios. El preflight no permitira desplegar mientras el
  arbol siga sucio.
- El Compose base referencia imagenes oficiales
  `ghcr.io/duartesantos8/opengym-*`; el override productivo solo usa imagenes
  construidas localmente desde el commit candidato.
- El workflow de publicacion sigue construyendo desde `main`, no desde
  `personal`. El workflow de tests ahora cubre pushes a `personal` sin publicar
  ni desplegar.

## Decisiones externas pendientes

Antes del primer despliegue hace falta elegir:

1. El host: VPS o equipo propio encendido permanentemente.
2. El dominio HTTPS definitivo.
3. Despliegue manual mediante un comando al comienzo o automatico luego de
   integrar `personal`. Se recomienda manual para la primera puesta en marcha y
   automatizar una vez verificados backup y rollback.

Hasta resolver host y dominio, estos artefactos se validan localmente pero no se
ejecuta `deploy-production.sh`.
