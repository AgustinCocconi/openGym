# OCI fase 6: prerrequisitos del primer despliegue

## Objetivo y autorizaciones

Continuacion autorizada tras fases 2/5. Preparar smoke Access/WAF, gate y
recuperacion aislada. Checkpoint OCI es el estado canonico; procedimiento en
ops/PROTECTED_OPERATIONS.md. Commits/push/GHCR autorizados el 3/10 al retomar:
tres unidades operativas y nueve commits previos. No deploy, ventana OCI,
cambio CF ni dato real autorizados.

## Estado y alcance

Base personal 552599bfcaefc8c1c85e1f532e86c1d4796427a8; remoto antes del push
57ad20bf5a53f025facca27d62115e4700f53b63 confirmado. Nueve commits previos
de recency/OCI/agentes y auditoria (training, coach, sync/mobile). Preservados
cambios anteriores en test.yml, Compose, production-common.sh/test, plan/runbook,
context-budget.json y capsulas OCI. Tres unidades operativas; sin cambios de app.
Upstream main e88062e confirmado remoto, sin ops propios equivalentes.

Preparados smoke loopback/publico con cookie en archivo privado, constancia
HTTPS AR sin secretos y accept-production con SHA/labels/registro cerrado y
WAF confirmado por operador. Deploy queda pending-external hasta aceptar.
Cifrado age/export, restore aislado que rechaza checksum/traversal/links,
wrapper Windows de entrada oculta/ACL/cleanup y diez probes reales HTTP/TLS.
Workflow incorpora syntax/probes; runbook enlaza capsula. Ningun bypass CF.

## Evidencia de verificacion

Linux/Node 22 AMD64: 1539 frontend/59 MCP/190 API, builds/locales/generados/carga
directa y fatigue OK. Primera ejecucion emulada ARM64 tuvo timeout: imagen
nativa resuelve, suite completa sin aumentar limites ni cambiar tests.
Diez probes con curl/TLS y age/restore reales OK; guard Compose siete casos OK.
Wrapper Windows: parser y ACL/rechazo/cleanup ante error sin red OK.
Docker local: backup real, imagen defectuosa rechazada, rollback y restore
ficticios conservan SHA de datos; contenedores/red/imagenes propios retirados.
Sin operacion OCI, comprobacion HTTPS de app real ni certificar capacidad E2.

Pointers TEMP: opengym-phase6-node22-gate-amd64.log,
opengym-phase6-probes.log, opengym-phase6-rehearsal-latest.json/log y opengym-phase6-publication-latest.json
(estado CI/imagenes por SHA; revalidar run y Git antes de deploy).
Rehearsal solo fixtures; adaptador Git Bash evita conversion solo en Docker.
No ejecutar helpers de ventanas CF anteriores: host cerrado/token API revocado.

Reanudacion 3/10 23:17 AR: HEAD/remoto y nueve commits sin cambios. Diez probes
Linux/Node 22.23.3 AMD64 con HTTP/TLS, age y restore reales OK, solo fixtures.
Windows/Node 24: syntax shell, parser PowerShell, siete casos Compose y seis
tests de contexto OK. Desktop Compose 2.20.2 rechazado; no acredita ni invalida
el 5.6.0 del host. Corregidos punteros obsoletos de fase/smoke.

## Alcance preparado para integracion

Alcance autorizado: commits acotados de loopback/logs (Compose/common
y test), sondas/recuperacion (deploy/smoke/accept, wrapper, encrypt/restore,
probes, test.yml, capsula/runbook) y cierre OCI/handoff (plan, capsulas OCI,
helper de token existente, presupuesto reducido y tarea). Solo esas rutas.
Publicacion: gate y GHCR default/web AMD64+ARM64 por SHA y alias personal;
sin Terraform ni deploy.

## Pendientes y siguiente paso

Pregunta de destino externo pendiente: PC/disco externo recomendado o servicio
existente. Falta identidad age real/resguardo separado, destinatario publico
y comprobacion de custodia; clave privada fuera de OCI/Git/chat.
Integrar las tres unidades autorizadas, push ordinario de personal y seguir
gate/publicacion del SHA resultante. El permiso incluye nueve commits previos.
Despues acreditar SHA limpio igual a origin/personal y CI/imagenes verdes,
revalidar costos/cuenta/host y solicitar permiso separado de primer deploy.
Fase 6 bloqueada por custodia externa y deploy. Check:context/diff OK; seguir
CI/imagenes del HEAD publicado en el pointer, sin convertirlos en permiso de deploy.
