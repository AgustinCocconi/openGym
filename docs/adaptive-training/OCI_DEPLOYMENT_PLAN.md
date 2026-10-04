# Plan reanudable de produccion en Oracle Cloud

Punto de entrada OCI; politica en [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md),
comandos en [PRODUCTION_RUNBOOK.md](PRODUCTION_RUNBOOK.md) e IaC en
[ops/oci](../../ops/oci/README.md). El checkpoint contiene el estado unico;
las fases contienen controles y evidencia pertinente, sin bitacora de intentos.

## Checkpoint

Corte: 2026-10-04 02:49 UTC / 3/10 23:49 AR; PC preparada, CI/GHCR `7e77b34` OK.
Faltan resguardo independiente de identidad, gate remoto y permiso de deploy.
Token API CF revocado/copia DPAPI retirada; costos hasta 2/10, sin nueva ventana.

| Fase | Estado | Evidencia / proximo paso |
| --- | --- | --- |
| 0. Base local | COMPLETA | Artefactos operativos separados y gate Linux/Node 22 registrado. Revalidar limpieza, SHA y gate para cada candidato. |
| 1. Compatibilidad | COMPLETA | ARM64 probado en `905f44e`; imagenes publicadas para AMD64 y ARM64 en fase 4. Consumo local orientativo. |
| 2. Cuentas | COMPLETA | OCI Always Free/MFA/USD 0, alertas activas y E2 1/1/0. CF zona activa Free por API; propietario confirma Zero Trust Free/2FA. |
| 3. IaC OCI | COMPLETA | Terraform 1.16.4 / OCI 7.32.0: formato, validacion y cuatro guardrails registrados; E2, swap y storage de 50+50 GB. |
| 4. Imagenes | COMPLETA | `7e77b34`, workflow `37171003702`: gate/publicacion verdes y digests/plataformas/revision anonimos verificados. |
| 5. VM y Cloudflare | COMPLETA | Tunnel Healthy/4, tres pruebas confirmadas, cierre sano y token API revocado. |
| 6. Primer deploy | BLOQUEADO | PC/cifrado preparados; falta resguardo de identidad, gate remoto y permiso de deploy. |
| 7. Observacion | PENDIENTE | Ocho dias despues del deploy; memoria no determina reclamacion de E2. |
| 8. Recuperacion | PENDIENTE | Destino externo y simulacros exigidos antes del deploy; operacion periodica despues. |
| 9. Operacion | PENDIENTE | Despues de aceptacion productiva. |

## Como retomar desde cualquier chat

Leer instrucciones e indice una vez; luego checkpoint, decisiones vigentes y
la fase afectada. Consultar sus referencias por seccion. Antes de actuar,
revisar todos los controles aplicables y el gate; no hace falta cargar el plan
completo para una correccion localizada.

Revisar rama, HEAD, referencias y diff sin descartar cambios locales. Retomar
la fase pendiente del checkpoint y sus prerrequisitos. Clasificar
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

P0 operativa terminada; scripts en `ops/`, politica/runbook alineados con E2.
Gate registrado el 2026-09-17: Node 24 local y Linux/Node 22, Compose y scripts
verificados; diferencias POSIX de API en Windows corregidas por H10 de la
[auditoria](../agents/SUBSYSTEM_AUDIT.md). Para cada candidato repetir el gate;
esta evidencia no certifica otro SHA. `recency` separado no implica integracion.

## Fase 1 - Validar compatibilidad ARM64 y consumo

`905f44e8695886ef4c006ce4208e737708d58bf3`, 2026-09-17, sin recency: Node 22
ARM64 paso suites/build/checks; dos tests QEMU necesitaron timeout 30 s, sin
cambiar codigo. Buildx, downloader, health/config y smoke pasaron. Imagenes:
default ~166 MiB, coach ~1.022 MiB, web ~78 MiB; API+web ~251-262 MiB bajo
QEMU/Docker Desktop, sin acreditar capacidad/latencia/inactividad OCI.
E2 usa AMD64 de fase 4; medir antes de afirmar suficiencia. Mantener default:
coach exige pruebas/publicacion separadas y no esta en el workflow productivo.

## Fase 2 - Preparar cuentas y elecciones del propietario

OCI 3/10 20:37: home `sa-vinhedo-1`, MFA; una clave API a las 17:15.
Cost Analysis 29/9 a 3/10 UTC exclusivo: USD 0, hasta 2/10; falta consolidar.
Propietario confirma Always Free sin PAYG y ventana 60 min el 3/10.
`opengym-zero-cost`: USD 1, gasto/forecast 0, tenancy; ACTUAL 1 %/FORECAST 100 % activos.
[Budgets](https://docs.oracle.com/en-us/iaas/Content/Billing/Concepts/budgetsoverview.htm)
solo alerta, no bloquea cargos.

Cuota E2 delegada al continuar: If-Match/copia privada 20:35; E2 1/1/0.
Policy raiz conserva A1 1 OCPU/2 GB, storage 100 GB/cinco backups; sin policy hija.
[Reversion](../../ops/oci/REMEDIATION.md#cuota-e2); otros servicios pagos no cubiertos.
CF 3/10: zona activa Free/USD 0 por API; propietario confirma Zero Trust Free/2FA.
Access habilitado por propietario; token API revocado y copia DPAPI retirada.
Salida: modalidad revalidada y guardrail efectivo para una E2.

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

Evidencia del 2026-10-03: SHA
`7e77b34d8e76c1a3da0f3fa8f6d2b0e914264494`, workflow `37171003702`, gate y
publicacion `linux/amd64,linux/arm64` verdes. Consulta anonima: checksums de
indices/manifests/configs, labels de revision y alias personal coincidentes:

- API `default`: `sha256:58324b44c772b07a92b8cba0767dfd00efcf721720187171c419bcb9ec7a1221`.
- Web: `sha256:b6ff5e41ba1a296238f3528b4e1075a30f0a07c400657284d1de1283c5bb234a`.

`.github/workflows/personal-publish.yml` llama a `test.yml` antes de publicar.
El deploy verifica revision y registra digests. Esa evidencia corresponde solo
a ese SHA; seleccionar y validar de nuevo las imagenes si el candidato cambia.
No hacer push/publicacion por este plan sin pedido autorizado.

## Fase 5 - Crear y endurecer la VM

OCI/plan 3/10 17:18: E2/IMDS cerrado, 50+50 GB/10 VPU cifrados ATTACHED,
sin replicas/backups; subnet sin ingress, NSG Bastion/PMTU. Plan exit 0, sin apply.
Ventana autorizada 19:38-20:06 UTC / 16:38-17:06 AR, dentro de 60 min.
Indices frescos: cero seguridad/seis generales diferidos; dpkg/apt, sudo/OpenSSL,
units sanos, timers conservados. [Consola](../../ops/oci/RECOVERY.md) RSA/sudo,
GRUB serial 9600/menu 10 s y submenu probados; 7.0.0-1012-oracle ejecutandose,
reboot resuelto, 6.17.0-1020/initrd preservados. cloud-init done, /srv ext4/marcador,
swap 1 GiB, Docker/Compose 5.6.0, agente/UFW activos. SSH ubuntu/root: root,
password, keyboard-interactive, X11/forwarding cerrados; pubkey/agente y segunda
Managed SSH/sudo OK tras reload. RPCbind/socket inactive/disabled, sin 111/NFS
(montajes/fstab/units); nfs-common instalado, fwupd diferido por ubuntu-server.
Cierre 20:02: password/fecha ubuntu exactos (L), root intacto, sin hashes/timers
temporales; copias root 0700/0600: [rutas](../../ops/oci/RECOVERY.md#copias-para-reversion).
20:06: VM/plugin RUNNING, accesos DELETED, cero SSH/consolas/claves propios.
MQL 21:46: infra 0, CPU 0,05 %, RAM 28,02 %, streams sin brechas. Activacion
permitida 21:47: cuatro alarmas ON/OK, configuracion preservada, email ACTIVE/confirmado.

CF 21:49 AR: Tunnel Healthy/4/Free, DNS/ruta, token 0600/argv seguro y
metricas loopback; Access propietario/OTP/24 h y WAF fuera de AR (1/5) ON.
HTTPS AR, identidad rechazada y BR/Block/regla propia confirmados. Cierre
21:54 AR: VM sana/RUNNING, credenciales exactas, sin prueba/timers/accesos/claves.
Token API revocado 22:06 AR (401/1000); copia DPAPI retirada.

Salida: host/entrada protegidos, prueba retirada y accesos temporales cerrados.
Smoke/gate Linux y recuperacion corresponden a fase 6.

## Fase 6 - Primer despliegue controlado

Gate y permiso de deploy separados. Codigo/CI/GHCR en fase 4.
[Preparacion local](../../ops/PROTECTED_OPERATIONS.md): Linux/Node 22 AMD64,
1539 frontend/59 MCP/190 API; diez probes/rollback/restore ficticios OK.
PC elegida: age/ACL y cifrado/restore OK; resguardo de identidad pendiente.
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
