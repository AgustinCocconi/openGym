# Plan reanudable de produccion en Oracle Cloud

Punto de entrada OCI; politica en [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md),
comandos en [PRODUCTION_RUNBOOK.md](PRODUCTION_RUNBOOK.md) e IaC en
[ops/oci](../../ops/oci/README.md). El checkpoint contiene el estado unico;
las fases contienen controles y evidencia pertinente, sin bitacora de intentos.

## Checkpoint

Corte documental: 2026-10-02. Evidencia heredada de las validaciones registradas,
no una nueva consulta a OCI, GHCR o Cloudflare. Actualizar estado, fecha y proximo
paso al operar; solo una fase puede estar `EN CURSO`.

| Fase | Estado | Evidencia / proximo paso |
| --- | --- | --- |
| 0. Base local | COMPLETA | Artefactos operativos separados y gate Linux/Node 22 registrado. Revalidar limpieza, SHA y gate para cada candidato. |
| 1. Compatibilidad | COMPLETA | ARM64 probado en `905f44e`; imagenes publicadas para AMD64 y ARM64 en fase 4. Consumo local orientativo. |
| 2. Cuentas | REVALIDAR | OCI/Cloudflare y MFA confirmados. Falta evidencia de cuotas del compartment adaptadas a E2; ver fase 2. |
| 3. IaC OCI | COMPLETA | Terraform 1.16.4 / OCI 7.32.0: formato, validacion y cuatro guardrails registrados; E2, swap y storage de 50+50 GB. |
| 4. Imagenes | COMPLETA | `52fb8e6`, workflow `36660062726`: gate y publicacion multiarch verdes; digests abajo. |
| 5. VM y Cloudflare | EN CURSO | E2 `RUNNING`, volumen `ATTACHED` y host verificado por Managed SSH; ultimo plan sin deriva. Faltan Tunnel, Access, WAF y pruebas HTTPS. |
| 6. Primer deploy | BLOQUEADO | Gate incompleto; smoke incompatible con Access sin autenticacion y autorizacion de deploy pendiente. |
| 7. Observacion | PENDIENTE | Ocho dias despues del deploy; memoria no determina reclamacion de E2. |
| 8. Recuperacion | PENDIENTE | Destino externo y simulacros exigidos antes del deploy; operacion periodica despues. |
| 9. Operacion | PENDIENTE | Despues de aceptacion productiva. |

## Como retomar desde cualquier chat

Leer instrucciones e indice una vez; luego checkpoint, decisiones vigentes y
la fase afectada. Consultar sus referencias por seccion. Antes de actuar,
revisar todos los controles aplicables y el gate; no hace falta cargar el plan
completo para una correccion localizada.

Revisar rama, HEAD, referencias y diff sin descartar cambios locales. Retomar
la fase 5 y sus prerrequisitos, salvo prioridad expresa del usuario. Clasificar
cambios nuevos y probar el SHA candidato antes de cualquier deploy; consultar
`PORTING_MAP.md` para distinguir nucleo puro de integracion terminada.

Nunca pegar tokens, claves, `.env`, cookies, `data/`, backups ni credenciales en
Git, logs o chat. Los OCID no son secretos, pero no es necesario publicarlos.

## Responsabilidades y autorizaciones

- Agente: documentacion, codigo, IaC, CI, pruebas locales y diagnostico de solo
  lectura dentro del alcance pedido.
- Propietario: cuentas, MFA, facturacion, dominio, DNS y custodia de secretos;
  recibe indicaciones concretas sin compartir credenciales.
- Conjunto: decisiones irreversibles, primer despliegue, passkey propietaria,
  restauracion y aceptacion productiva.

La creacion E2 y la correccion Bastion ya fueron autorizadas y registradas.
Eso no autoriza el primer despliegue ni un futuro reemplazo, destruccion,
recurso pago o upgrade de cuenta. Revisar un plan nuevo antes de cada `apply`
y obtener autorizacion para la accion concreta. Esta limpieza no ejecuta ninguna.

## Decisiones vigentes

| Tema | Decision y motivo |
| --- | --- |
| Alcance | Una produccion personal desde `personal`; desarrollo local y sin staging remoto. `main` conserva upstream; verificar su base en `PORTING_MAP.md`. |
| Cuenta | OCI `Free Trial` y luego solo Always Free; sin upgrade a Pay As You Go ni recursos pagos, por decision del propietario del 2026-09-29. |
| Compute | E2.1.Micro AMD64, 1 GB RAM + 1 GiB swap local. Fallback autorizado el 2026-10-02 ante falta de capacidad A1; reevaluar con metricas y pruebas, nunca cambiar shape automaticamente. |
| Persistencia | Boot 50 GB + datos 50 GB en `/srv`; checkout `/srv/opengym`, backups `/srv/opengym-backups`. Separar datos de compute reemplazable. |
| Red | IP efimera solo para egreso; sin puertos publicos de aplicacion/SSH. Bastion privado y Tunnel HTTPS evitan NAT Gateway y load balancer. |
| Hostname | `gym.mientrenadorpersonal.com.ar`, definitivo antes de passkeys; Access limita el bootstrap al propietario y WAF a Argentina. |
| Imagenes | API `default` y web multiarch de CI por SHA/digest. El host no compila; `personal` es solo alias movil. |
| Recuperacion | Deploy manual, datos respaldados y VM reemplazable; automatizar solo tras validar rollback/restauracion. Sin actividad sintetica. |

Cambiar una decision exige motivo, fecha, impacto y autorizacion aplicable en
esta fuente. Conservar solo decisiones vigentes; la historia confirmada esta
en Git. No elevar una validacion antigua a permiso para otra accion.

## Hechos externos que siempre se revalidan

Antes de provisionar o cambiar facturacion, consultar condiciones oficiales y
la consola de la tenancy. Cuota tecnica y capacidad fisica no prueban gratuidad.
La consulta documental del 2026-10-02 confirma E2.1.Micro elegible, hasta dos
instancias y 200 GB combinados de volumenes; el proyecto conserva solo una VM
y 100 GB. La memoria interviene en reclamacion de A1, no de E2: ver fase 7.
[OCI Always Free](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm).

Revalidar solo fuentes aplicables a la accion:

- [Home region](https://docs.oracle.com/en-us/iaas/Content/Identity/regions/managingregions.htm),
  [fin del trial](https://docs.oracle.com/en-us/iaas/Content/GSG/Tasks/signingup_topic-What_Happens_When_the_Promotion_Expires.htm),
  [presupuestos](https://docs.oracle.com/en-us/iaas/Content/Billing/Concepts/budgetsoverview.htm).
- [Cuotas Compute](https://docs.oracle.com/en-us/iaas/Content/Quotas/Concepts/resourcequotas_topic-Compute_Quotas.htm)
  y [volumenes](https://docs.oracle.com/en-us/iaas/Content/Quotas/Concepts/resourcequotas_topic-Block_Volume_Quotas.htm).
- [Named Tunnel](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/get-started/create-remote-tunnel/),
  [egreso](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/configure-tunnels/tunnel-with-firewall/),
  [WAF geografico](https://developers.cloudflare.com/waf/custom-rules/use-cases/allow-traffic-from-specific-countries/).
- [GitHub Actions](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
  y [Packages](https://docs.github.com/en/billing/concepts/product-billing/github-packages)
  antes de cambiar publicacion, visibilidad o consumo.

## Gate absoluto antes de desplegar

La VM base ya existe; este gate condiciona el primer despliegue de openGym.
La creacion o reemplazo de infraestructura tiene ademas su plan/autorizacion
en [ops/oci](../../ops/oci/README.md#validation-and-reviewed-plan). No ejecutar
`ops/deploy-production.sh` hasta acreditar todos estos controles para el
candidato seleccionado; un check historico de otro SHA no los satisface.

- Rama `personal` limpia con los artefactos elegidos integrados, SHA completo
  coincidente con `origin/personal`, gate y publicacion verdes para ese SHA.
- Cuenta, home region, shape, elegibilidad y costos visibles revalidados;
  presupuesto/alertas y cuotas del compartment cubren la E2 y el storage.
- Host endurecido, datos persistentes y backups fuera del checkout, sin ingress publico;
  Tunnel, Access propietario y WAF configurados con hostname definitivo.
- HTTPS probado desde Argentina y bloqueo desde otro pais; antes de instalar
  la app probar la ruta con un servicio de prueba aislado, sin passkeys/datos.
- Smoke/deploy compatibles con Access y WAF, incluida la ubicacion del host:
  no retirar protecciones para que pase un `curl`. Ver bloqueo del runbook.
- Destino externo cifrado elegido, checksum, rollback y restauracion aislada
  ensayados con datos de prueba; no necesitan una produccion ya abierta.
- Autorizacion explicita y separada del propietario para el primer despliegue.

## Fase 0 - Consolidar la base local

Fase operativa original terminada; no certifica otro SHA candidato. Los
scripts de preflight, gate, backup, smoke, deploy y rollback viven en `ops/`.
La politica y el runbook se alinean con E2; el nucleo `recency` tiene un commit
separado y no implica integracion adaptativa.

Evidencia registrada el 2026-09-17: frontend, MCP, build, locales, generados y
carga directa pasaron localmente con Node 24. La API tuvo diferencias POSIX
en Windows; el gate Linux/Node 22 paso los 181 tests de API y el resto de
suites. Compose y los cinco scripts pasaron render/sintaxis. Para un nuevo
candidato repetir el gate pertinente; no reutilizar esos resultados.

## Fase 1 - Validar compatibilidad ARM64 y consumo

Evidencia sobre `905f44e8695886ef4c006ce4208e737708d58bf3`, 2026-09-17:
archivo del commit aislado sin `recency*`; Node 22 ARM64 paso 1.468 tests de
frontend, 58 MCP y 181 API, build y chequeos. Bajo QEMU dos tests necesitaron
30 s de timeout sin cambios de codigo. Buildx construyo `api:default`,
`api:coach` y web; downloader, health/config y smoke del stack pasaron.

Imagenes sin comprimir: ~166 MiB `default`, ~1.022 MiB `coach`, ~78 MiB web.
Consumo local de API+web ~251-262 MiB bajo QEMU/Docker Desktop: no acredita
capacidad real, latencia ni politica de inactividad OCI. E2 usa las imagenes
AMD64 publicadas en fase 4; observarla antes de afirmar suficiencia.
`coach` sigue fuera del workflow productivo y requiere pruebas/publicacion
separadas; mantener `default` para el primer deploy.

## Fase 2 - Preparar cuentas y elecciones del propietario

Confirmaciones registradas el 2026-09-29: OCI con MFA probado, home region
`sa-vinhedo-1`, compartment `opengym-personal`, presupuesto y alertas real/
prevista. Facturacion: conservar trial y Always Free sin PAYG. Cloudflare Free,
zona `mientrenadorpersonal.com.ar` activa, hostname definitivo, 2FA propio,
recuperacion guardada y nuevo login probado. Access fue decidido, no instalado.

**Pendiente tras cambiar de A1 a E2:** la evidencia original de quota policy
solo limita A1 a 1 OCPU/2 GB, storage a 100 GB y backups a cinco. La consulta
E2 registro cuota disponible 2, pero no prueba un limite del compartment a la
unica VM acordada. Revalidar policy efectiva, alertas y costos antes del deploy.
La documentacion de [Compute Quotas](https://docs.oracle.com/en-us/iaas/Content/Quotas/Concepts/resourcequotas_topic-Compute_Quotas.htm)
publica `compute` / `vm-standard-e2-1-micro-count`; usar los nombres/ambitos
generados por consola, no las sentencias A1 heredadas.

El propietario configura cualquier ajuste aprobado en OCI. Una cuota no bloquea
todos los servicios pagos y un presupuesto solo alerta. No recrear cuentas,
cambiar home region ni abrir el flujo PAYG por esta limpieza. Devolver solo
confirmacion de modalidad, limites efectivos y alertas; sin identificadores,
capturas de facturacion ni secretos. Salida: guardrails efectivos para E2.

## Fase 3 - Codificar la infraestructura OCI

Implementacion y comandos en [ops/oci/README.md](../../ops/oci/README.md).
Estado registrado el 2026-10-02: Terraform 1.16.4 / `oracle/oci` 7.32.0,
formato, validacion y cuatro guardrails verdes. Configuracion: Ubuntu 24.04
AMD64, E2 fija, boot/datos 50+50 GB, montaje UUID `/srv`, swap local 1 GiB,
Docker/Compose/Git/cloudflared, sin tokens ni inicio del Tunnel.

Security list sin ingress; solo egreso TCP/22 a la subnet para Bastion. NSG
admite SSH del `/32` de su endpoint privado y egreso necesario para DNS,
actualizaciones, imagenes y Tunnel. UFW replica la restriccion; web se enlaza
a loopback. Sin NAT Gateway, load balancer ni secretos en outputs.

VM y volumen usan `prevent_destroy`; `user_data` se ignora despues del primer
boot para evitar reemplazos accidentales. Cambiar plantilla no corrige hosts
existentes: aplicar una remediacion aprobada y verificarla. Reemplazo/destruccion
segun [DESTROY_RECREATE.md](../../ops/oci/DESTROY_RECREATE.md), con backup y
revision explicita del cambio de guardrail. Salida: plan revisado sin sorpresas.

## Fase 4 - Publicar imagenes propias por commit

Evidencia del 2026-09-29: SHA
`52fb8e678afcacb5e33d6dd5f51ac40299baba86`, workflow `36660062726`, gate y
publicacion `linux/amd64,linux/arm64` verdes. Paquetes del fork publicos y
manifests consultados sin autenticacion; alias e indices inmutables coincidieron:

- API `default`: `sha256:3510bf43666315c0bbfb66866238d3dbe9fea1b39e6d07bef14d50053007637b`.
- Web: `sha256:0be53325812c7b3ec12bc68d721e21dcd3a12469441d87ed29378639d524fc2c`.

`.github/workflows/personal-publish.yml` llama a `test.yml` antes de publicar.
El deploy verifica revision y registra digests. Esa evidencia corresponde solo
a ese SHA; seleccionar y validar de nuevo las imagenes si el candidato cambia.
No hacer push/publicacion por este plan sin pedido autorizado.

## Fase 5 - Crear y endurecer la VM

Evidencia registrada el 2026-10-02: tras fallos de capacidad A1, el propietario
autorizo E2 Always Free. El plan tenia solo E2+attachment (dos altas, sin cambios
ni bajas); apply completo, VM `RUNNING`, volumen `ATTACHED` y sin deriva.
El diagnostico Bastion se resolvio con egreso estatal TCP/22 hacia la subnet,
sin abrir ingress publico; Managed SSH verifico cloud-init completo, `/srv`
ext4/marcador/servicio, swap 1 GiB, Docker, Compose, cloudflared, UFW, SSH y
agente OCI. Sesiones/consola/claves temporales eliminadas; ultimo plan vacio.

Pendiente, responsable conjunto:

- [ ] Revalidar costo/guardrails E2 de fase 2.
- [ ] Crear named Tunnel; propietario instala el token en el host, fuera de
  Terraform, cloud-init, estado, Git y chat. No usar Quick Tunnel.
- [ ] Configurar Access solo para el propietario y resolver el bloqueo de
  [smoke protegido](PRODUCTION_RUNBOOK.md#precondiciones-del-bootstrap).
- [ ] Publicar ruta al loopback `http://127.0.0.1:8080`; activar WAF `Block`:
  `(http.host eq "gym.mientrenadorpersonal.com.ar" and ip.src.country ne "AR")`.
- [ ] Probar HTTPS desde el celular en Argentina y bloqueo desde otra salida,
  usando servicio aislado previo al deploy; retirar el servicio de prueba.

Geolocalizacion no reemplaza passkeys ni cierre del registro. Salida: host y
entrada protegidos, sin datos productivos, listos para revalidar el gate.

## Fase 6 - Primer despliegue controlado

Responsable conjunto; requiere gate completo y autorizacion separada.
Seguir [instalacion](PRODUCTION_RUNBOOK.md#instalacion-inicial):

- [ ] Crear `.env` privado: `RP_ID=gym.mientrenadorpersonal.com.ar`,
  `ORIGIN=https://gym.mientrenadorpersonal.com.ar`, sin invitados.
- [ ] Descargar SHA/digests y desplegar bootstrap con Access propietario y WAF
  activos; health y smoke deben atravesar esa proteccion correctamente.
- [ ] Registrar perfil/passkey en celular; configurar `ADMIN_UIDS`,
  `INVITE_ONLY=1`, `ALLOW_GUEST=0`, recrear y comprobar cierre del alta.
- [ ] Login, lectura y escritura manual de prueba; smoke permanece de solo lectura.
- [ ] Registrar SHA, digests y smoke; primer backup consistente/checksum y copia
  cifrada externa comprobada.
- [ ] Decidir si Access permanece tras cerrar el registro; WAF y autenticacion
  openGym permanecen. Actualizar runbook si cambia el acceso de sondas.

Salida: instancia cerrada y recuperable. El deploy no implementa entrenamiento
adaptativo ni permite dar por probada la rama local entera.

## Fase 7 - Observar inactividad sin fabricar carga

Responsable: agente configura metricas; propietario recibe alertas y decide.

- [ ] Metricar CPU, red, memoria, swap, OOM/restarts; alarmas de disponibilidad
  y ausencia de metricas. Observar ocho dias completos despues del deploy.
- [ ] Mantener healthchecks, smoke, backups y mantenimiento reales; no loops
  de CPU, trafico ficticio ni reserva de memoria para simular actividad.

[Oracle](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm)
considera inactividad durante siete dias con CPU P95 y red debajo de 20 %;
el criterio adicional de memoria debajo de 20 % se aplica solo a A1.
Para E2, mas RAM usada o swap no evita reclamacion. Revalidar la politica
antes de configurar alertas; probes pequenos tampoco garantizan actividad.

Umbrales internos de capacidad: 25-70 % de memoria orienta observacion, no
elegibilidad. Ante >70 %, OOM o reinicios, revisar margen y pruebas; E2 es
shape fija, no tiene ajuste de RAM. Otra shape necesita nueva decision, plan,
backup y autorizacion dentro del costo cero. Si no hay alternativa segura,
aceptar riesgo de reclamacion o pedir una decision nueva; no migrar a pago
automaticamente. Salida: metricas y decision sustentada de dimensionamiento.

## Fase 8 - Backups y recuperacion ante reclamacion

Responsable conjunto. Elegir destino externo y ensayar checksum, rollback y
restauracion aislada con datos de prueba antes del gate del primer deploy.
Despues, backup consistente diario y antes de cada deploy, rotacion local
explicita, copia cifrada fuera del host (preferentemente fuera de OCI), checksum
tras transferir y restauracion mensual. Backups de volumen dentro de cuota,
hasta cinco; no sustituyen la copia externa. `coach-auth/` requiere reconexion.

Si OCI reclama compute: comprobar volumen/ultimo backup, sin restaurar sobre
la unica copia; revisar recreacion IaC y autorizaciones, revocar el conector/token
perdido, conservar hostname, montar/restaurar datos, descargar mismos digests,
smoke y passkey existente. No cambiar RP ID para resolver la incidencia.
Registrar causa, RPO real y tiempo de recuperacion.

Comandos en [restauracion](PRODUCTION_RUNBOOK.md#restauracion-de-datos) y
[recreacion](../../ops/oci/DESTROY_RECREATE.md). Objetivos a confirmar con
simulacro: RPO 24 h y RTO 60 min. Salida: perder compute no implica perder datos.

## Fase 9 - Operacion normal

- SHA de `personal` probado; mantener deploy manual hasta dos actualizaciones
  y un rollback correcto, ademas de restauracion validada.
- Revisar salud/backups/alertas semanalmente el primer mes, luego mensualmente.
- Revalidar trimestralmente condiciones de Free Tier, cuotas e inactividad.
- Actualizar Linux, Docker y cloudflared con ventana y backup.
- No cambiar hostname/RP ID sin plan de reinscripcion de passkeys.

## Definicion de terminado

SHA/digests reproducibles, HTTPS Argentina y bloqueo exterior probados, origen
cerrado, passkey y registro cerrado, almacenamiento persistente respaldado,
alertas/backup/rollback/restauracion ensayados, ocho dias de metricas y
recreacion sin secretos en Git. Checkpoint y runbook deben reflejar la evidencia.
