# Plan reanudable de produccion en Oracle Cloud

Punto de entrada OCI; politica en [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md),
comandos en [PRODUCTION_RUNBOOK.md](PRODUCTION_RUNBOOK.md) e IaC en
[ops/oci](../../ops/oci/README.md). El checkpoint contiene el estado unico;
las fases contienen controles y evidencia pertinente, sin bitacora de intentos.

## Checkpoint

5/10 AR: 2eb87ea/coach sano, bandas/cargas/HTTPS/modelo/30/copia PC/restore OK; WAF pendiente.
Propietario difiere resguardo de identidad: backup/clave solo en esta PC por ahora.
OCI E2/50+50 GB, cuota 1/1/0, MFA/alertas y USD 0 al 5/10 UTC OK; sin PAYG.

| Fase | Estado | Evidencia / proximo paso |
| --- | --- | --- |
| 0. Base local | COMPLETA | Artefactos operativos separados y gate Linux/Node 22 registrado. Revalidar limpieza, SHA y gate para cada candidato. |
| 1. Compatibilidad | COMPLETA | ARM64 probado en `905f44e`; imagenes publicadas para AMD64 y ARM64 en fase 4. Consumo local orientativo. |
| 2. Cuentas | COMPLETA | OCI Always Free/MFA/USD 0, alertas activas y E2 1/1/0. CF zona activa Free por API; propietario confirma Zero Trust Free/2FA. |
| 3. IaC OCI | COMPLETA | Terraform 1.16.4 / OCI 7.32.0: formato, validacion y cuatro guardrails registrados; E2, swap y storage de 50+50 GB. |
| 4. Imagenes | COMPLETA | 2eb87ea/37355654587: CI/publicacion default/coach/web; digests/revision OCI OK. |
| 5. VM y Cloudflare | COMPLETA | Tunnel Healthy/4, tres pruebas confirmadas, cierre sano y token API revocado. |
| 6. Deploy | EN CURSO | 2eb87ea: HTTPS AR/modelo/30/backup OK; WAF pendiente. |
| 7. Observacion | EN CURSO | Revisar ocho dias completos desde 12/10/2026 16:25 AR. |
| 8. Recuperacion | EN CURSO | Copia PC diaria tras 05:00 AR; simulacro 4/11. RTO pendiente; resguardo independiente diferido |
| 9. Operacion | PENDIENTE | Rutina tras observacion y recuperacion periodica. |

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
cambiar codigo. Buildx/downloader/health/config/smoke pasaron; consumo local
orientativo, sin acreditar capacidad/latencia/inactividad OCI.
E2 usa AMD64: 3dbc82f publica coach (~1.615 MiB) y web (~104 MiB).
Prueba real/privilegios/recursos en fase 6; no acredita toda carga sostenida.

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

3dbc82f7238336fe69e62f4a4d5b9bf8b3759fef, workflow 37247336190:
gate Linux/Node 22 y publicacion AMD64/ARM64 default/coach/web verdes.
OCI verifica revision y usa estos digests inmutables:

- API coach: sha256:619f97a6a12412daf83b26bfd03380ca8a18f020f57b1542db2dec8990d9ce6e.
- Web: sha256:bfb30e196cf83d083360f0fdc716dc89ff422ddf33d2a74f81707f72cc0ae217.

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

3dbc82f/coach: deploy 5/10 00:29 UTC, aceptado 00:44 UTC. Modelo activo/30 al dia.
CI Linux/Node 22: frontend 1559/API 233/MCP 59, imagenes/ops/contexto OK.
API sin puerto, web loopback, /srv persistente.

- [x] HTTPS AR 00:33 UTC; Access propietario/OTP/24 h conservado.
- [x] Propietario confirma WAF BR/Block/opengym_argentina_only, Ray a4585643af02d87c.
- [x] Un perfil/passkey; INVITE_ONLY=1, ALLOW_GUEST=0, ADMIN_UIDS coincide.
- [x] Codex 0.160.0/gpt-6.1-sol: login por dispositivo, cache 0700/0600 fuera de data/backups.
  Binding propietario, 30/dia; drop/canary sin comandos OK al 4/10 22:19 AR.
  Propietario confirma MFA ChatGPT/historial reconocido; 62 tests Linux/Node 22 OK.
- [x] UI/API/modelo real: consulta parcial, propuesta/confirmacion/undo;
  manual offline/sync/historial y undo bloqueado por nuevos datos OK.
- [x] Backup previo/copias PC; posterior 5/10 00:46 UTC, checksum/descifrado/
  restore seis archivos/2,25 s OK; plaintext retirado. RPO 0,06 h.
- [x] Ventanas SSH DELETED; claves/config retiradas.

Evidencia ignorada: .production-state/{deploy-coach,security-final}; constancias PC 5/10 00:49 UTC
en openGym-backups/transfer-*; ruta en handoff.
Resguardo independiente diferido; no acredita telefono fisico ni otros proveedores.

## Fase 7 - Observar inactividad sin fabricar carga

[Rutina activa](../../ops/PRODUCTION_ROUTINE.md#observacion-de-ocho-dias):
primera muestra 2026-10-04T19:18:55Z (16:18:55 AR); cada cinco minutos.
Revisar desde 12/10/2026 16:25 AR, sujeto a ocho dias completos sin brechas.

- [x] Metricas/health locales y cuatro alarmas OCI OK.
- [ ] Ocho dias completos sin brechas; contrastar CPU/red OCI oficiales.
- [x] Healthchecks, smoke y backups reales; sin carga sintetica.

Hasta 5/10 00:50 UTC: 68 muestras, sin brechas/errores/OOM; siete starting por
backups/deploy, loopback siempre OK. 4 reemplazos/5 cambios de arranque;
memoria maxima 38,9 %, swap 132 MiB. Conservar eventos, no rellenar muestras.
Propietario revisa alertas y decide.

[Oracle](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm)
considera siete dias con CPU P95/red <20 %; memoria <20 % solo para A1.
Revalidado 4/10/2026. En E2, RAM/swap y probes no evitan reclamacion.
CPU/red locales orientan, no sustituyen metricas OCI.
Memoria 25-70 % orienta capacidad. >70 %, OOM/reinicios: revisar margen/pruebas.
E2 es fija; otra shape requiere decision/plan/backup y autorizacion a costo cero;
sin alternativa, decidir riesgo, nunca migrar automaticamente a pago.
Salida: cobertura completa y decision de dimensionamiento sustentada.

## Fase 8 - Backups y recuperacion ante reclamacion

[Rutina activa](../../ops/PRODUCTION_ROUTINE.md#backup-diario-y-ventanas):
2eb87ea: WAF pendiente; backup diario exige accepted.
Backup 05:00 AR, retencion 14, age publico en host/identidad PC.
Backup 5/10 18:30:57 UTC; copia PC/restore aislado autorizado 18:34 UTC OK.
Checksums y restore 2,29 s/7 archivos OK; plaintext retirado.
Timer de backup pausado durante deploy y reactivado; ambos timers activos.
No acredita RTO productivo ni automatiza la transferencia diaria a PC.

Copiar/verificar a PC diariamente por Bastion temporal y
restaurar mensualmente; proximo simulacro 4/11. Resguardo independiente diferido.
Perder la PC puede impedir recuperar; coach-auth requiere reconexion.
Antes de deploy, backup y pausa del timer. Hasta cinco backups de
volumen dentro de cuota no sustituyen copia externa.

Ante reclamacion, comprobar volumen/ultimo backup sin pisar la unica copia;
revisar IaC/permisos, revocar conector/token perdido, conservar hostname/RP ID,
restaurar con mismos digests y probar smoke/passkey. Registrar causa/RPO/tiempo.
[Restauracion](PRODUCTION_RUNBOOK.md#restauracion-de-datos) y
[recreacion](../../ops/oci/DESTROY_RECREATE.md). Objetivos: RPO 24 h/RTO 60 min;
RTO pendiente de ensayo productivo.

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
