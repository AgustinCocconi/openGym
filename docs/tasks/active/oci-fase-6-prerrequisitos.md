# OCI fase 6: prerrequisitos del primer despliegue

## Objetivo y autorizaciones

Continuacion autorizada tras fases 2/5. Preparar smoke Access/WAF, gate y
recuperacion aislada. Checkpoint OCI es el estado canonico; procedimiento en
ops/PROTECTED_OPERATIONS.md. Commits/push/GHCR autorizados el 3/10 al retomar:
tres unidades operativas y nueve commits previos. Primer deploy y acceso
temporal necesario autorizados 4/10. Sin cambios CF ni infraestructura nueva.

## Estado y alcance

Base publicada: 7e77b34d8e76c1a3da0f3fa8f6d2b0e914264494. Nueve commits
previos de recency/OCI/agentes/auditoria y tres unidades operativas publicados.
Cambios locales previos integrados por rutas; sin nuevos cambios de app.
Candidato actual: HEAD de personal; derivar SHA de Git y verificar reporte CI
antes del deploy. Resguardo independiente diferido expresamente por propietario.
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

Revalidacion: Node 22.23.3 AMD64/10 probes y Windows/Node 24/6 tests contexto
OK. Desktop Compose 2.20.2 rechazado; no acredita ni invalida el 5.6.0 del host.

## Gate del candidato

07e9ad7/37172532898: CI/remoto revalidados. Candidato: HEAD al integrar.
Reporte TEMP: SHA/run/digests/revision/plataformas.

## Custodia PC y siguiente paso

Destino elegido: esta PC. age v1.3.2 Windows AMD64 oficial/SHA-256 verificado,
portable en %LOCALAPPDATA%/openGym-tools/age/v1.3.2. ACL solo del usuario:
openGym-backups (cifrados/recipient.txt/informe) y openGym-recovery (identity.txt),
bajo %LOCALAPPDATA%, fuera de Git/OCI. Identidad generada sin exponerla.
Cifrado, copia/checksum, descifrado y restore nativos del fixture OK; evidencia
en openGym-backups/custody-status.json. Sin backup productivo. Helper TEMP
opengym-phase6-prepare-pc-custody.ps1 conserva existentes; no volver a ejecutarlo.
Propietario decide 4/10 conservar clave/backup solo en esta PC por ahora.
Se difiere resguardo/prueba independiente; no se marcan como realizados.
Continuar integracion documental autorizada; revalidar gate del SHA resultante.
API 4/10: E2 RUNNING, home/MFA, 50+50 GB/10 VPU ATTACHED, cuota E2 1/1/0,
presupuesto/alarmas/email activos, USD 0 hasta 3/10 UTC. Informe TEMP:
opengym-phase6-predeploy-readonly-latest.json. Sin acceso SSH aun.
Confirmacion de modalidad pendiente; despues preflight host y bootstrap
protegido. Permiso de deploy recibido; passkey/aceptacion requieren propietario.
CI/imagenes: reporte por SHA; check:context/diff a verificar al integrar.
