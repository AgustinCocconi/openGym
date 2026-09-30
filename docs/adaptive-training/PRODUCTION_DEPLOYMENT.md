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

- Una VM OCI Ampere A1 ARM64 en `sa-vinhedo-1`, limitada a `1 OCPU / 2 GB`.
- Boot volume de 50 GB y block volume protegido de 50 GB montado en `/srv`.
  El checkout vive en `/srv/opengym` y los backups locales en
  `/srv/opengym-backups`.
- Subnet publica solo para egreso mediante una IP efimera. No se abre ningun
  puerto TCP/UDP publico; SSH se realiza mediante OCI Bastion.
- Cloudflare Tunnel publica exclusivamente
  `gym.mientrenadorpersonal.com.ar` hacia `http://127.0.0.1:8080`. Cloudflare
  Access protege el bootstrap y una regla WAF bloquea origenes no argentinos.
- `./data` persistente y respaldado. Contiene perfiles, passkeys, historial,
  secreto de instancia y credenciales HTTPS del Coach cifradas.
- `./coach-auth` persistente si se usa Codex, pero excluido de backups: si se
  pierde, se vuelve a iniciar sesion con el proveedor.
- Para una instancia personal, crear primero el perfil propietario y luego
  cerrar el acceso con `ADMIN_UIDS`, `INVITE_ONLY=1` y `ALLOW_GUEST=0`.

El hostname es tambien el `RP_ID`; cambiarlo invalida las passkeys asociadas.
Cloudflare aporta DNS, Tunnel, Access y WAF, pero openGym no se despliega en
Workers, D1 ni KV: necesita contenedores y filesystem persistente.

## Estrategia de construccion

La VM de 2 GB no compila. El workflow `personal-publish.yml` ejecuta el gate y
publica imagenes propias multi-arquitectura en GHCR con dos etiquetas:

- una inmutable derivada del commit;
- una etiqueta movil `personal` solo como conveniencia.

Produccion siempre registra y consume la etiqueta inmutable o su digesto.
No ejecutar `docker compose pull` mientras el Compose apunte a las imagenes
oficiales de upstream: no contienen los cambios de `personal`.

El Compose y el script productivos descargan las imagenes del fork por SHA,
verifican la etiqueta OCI de revision y registran los digestos efectivos. No
compilan en la A1. Los paquetes deben marcarse publicos en GHCR despues de su
primera publicacion para permitir pulls anonimos; si permanecen privados, el
propietario debe configurar un token de lectura directamente en la VM.
La primera publicacion usa el target `default`. No hace falta el target Docker
`coach` para Anthropic, OpenAI, Gemini o un endpoint compatible mediante API
key. Antes de usar Claude Agent SDK o Codex CLI dentro del contenedor se debe
extender el workflow para publicar y validar explicitamente esa imagen.

## Secuencia de despliegue

1. Verificar arbol Git limpio, rama `personal` y commit esperado.
2. Ejecutar los tests y builds definidos por upstream mas los tests propios.
3. Detener brevemente la API para obtener un backup consistente de `./data`.
4. Crear el archivo fechado, calcular SHA-256 y guardar commit de origen.
5. Descargar las imagenes propias del commit exacto y verificar sus digestos.
6. Levantar el stack sin reemplazar `./data`, `./media` ni `./coach-auth`.
7. Verificar `/api/health`, carga del frontend y configuracion publica de
   `RP_ID`/`ORIGIN`.
8. Registrar fecha, commit, versiones de imagen y checksum del backup.

Un fallo de health check revierte codigo o imagenes al commit anterior. Los
datos se restauran solo si el cambio llego a modificar su formato y el rollback
de codigo no puede leerlos; no automatizar una restauracion destructiva.

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

- `ops/oci/`: Terraform, cloud-init, guardrails y procedimiento de
  destruccion/recreacion. Cualquier `apply` requiere autorizacion explicita.
- `ops/deploy-production.sh`: preflight, pull por SHA desde GHCR, verificacion
  de revision, backup, despliegue, health check, rollback y registro de digest.
- `ops/backup-production.sh`: archivo consistente, checksum y retencion.
- `ops/smoke-production.sh`: comprobaciones de solo lectura.
- `ops/verify-production-candidate.sh`: tests y build en Node 22 aislado.
- `ops/compose.production.yml`: imagenes GHCR inmutables por commit.
- `PRODUCTION_RUNBOOK.md`: instalacion, actualizacion, rollback y restauracion.
- `.github/workflows/test.yml`: gate vigente tambien para pushes a `personal`.

Mantener estos artefactos fuera de archivos centrales de upstream cuando sea
posible para reducir conflictos durante las sincronizaciones.

## Estado revalidado al 2026-09-29

Revalidar antes de actuar:

- `origin` apunta al fork y `upstream` al repositorio oficial.
- `main`, `origin/main` y `upstream/main` coinciden en
  `a68a88d2da04cf3334eeeca136385114a65450ff`.
- `personal` y `origin/personal` coinciden en
  `52fb8e678afcacb5e33d6dd5f51ac40299baba86`.
- El Compose productivo referencia las imagenes propias
  `ghcr.io/agustincocconi/opengym-*` por SHA completo.
- El workflow separado de `personal` paso su primer gate y publico API
  `default` y web para `linux/amd64,linux/arm64`. Ambos paquetes son publicos y
  sus manifests fueron leidos anonimamente; el workflow de upstream para
  `main` permanece sin cambios funcionales.
- Hay archivos sin seguimiento bajo
  `frontend/src/lib/adaptive-training/`; no desplegar hasta incorporarlos en un
  commit probado o excluirlos conscientemente.
- `ops/oci/` pasa formato, validacion y tres tests Terraform. El plan
  autenticado y revisado contiene 19 altas esperadas, ninguna accion
  destructiva ni recurso fuera del alcance documentado; la imagen Ubuntu ARM64
  quedo fijada solo en la configuracion local ignorada. No se ejecuto `apply`
  ni se creo infraestructura.

## Decisiones externas pendientes

Host, region y dominio ya estan definidos. Antes del primer despliegue falta:

1. Autorizar por separado la creacion de infraestructura a partir del plan OCI
   revisado; la autorizacion no incluye todavia el primer despliegue.
2. Elegir el destino cifrado de backups fuera de la VM y ensayar restauracion.
3. Autorizar por separado el primer despliegue.

El despliegue inicial sera manual. Solo se automatizara despues de verificar
backup, rollback y restauracion.
