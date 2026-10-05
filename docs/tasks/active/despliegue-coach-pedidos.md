# Despliegue de pedidos de cambio sin historial

## Objetivo y alcance

Desplegar la correccion del Coach autorizada el 5/10/2026 AR. Preservar datos,
gpt-6.1-sol, cuotas 30/30 y Access/WAF; sin cambios de infraestructura/autenticacion.

## Criterios de aceptacion

SHA publicado con CI verde; backup consistente, copia PC y restore aislado;
API_TARGET=coach, API/web saludables y prompts exactos; HTTPS AR y WAF confirmado;
timers activos y accesos propios cerrados. Retirar tarea tras aceptacion formal.

## Contexto y zona afectada

[Checkpoint](../../adaptive-training/OCI_DEPLOYMENT_PLAN.md),
[runbook](../../adaptive-training/PRODUCTION_RUNBOOK.md),
[operaciones protegidas](../../../ops/PROTECTED_OPERATIONS.md).
Escenario coach-request-without-history; evidencia en PORTING_MAP. Reemplaza el
handoff de controles a4e766f: su WAF pendiente queda consolidado en esta tarea.

## Estado actual y verificacion

Produccion 240605f75414865a473241e52618542827195ec9/coach, CI/publicacion
37346299201 verde. API/web healthy y hashes common/review iguales al candidato.
HTTPS AR 17:24 UTC, registro cerrado/un perfil; modelo real gpt-6.1-sol/Codex
0.160.0 OK, privilegios reducidos, binding propietario y cuotas 30/30 preservados.
Windows: API 243 pass/1 skip, frontend relevante 277 pass; build/assets/core/
contexto OK. Modelo real: pedido/seguimiento 2/2 es-AR, IDs validos/evidencia cero.
OCI E2/100 GB/USD 0 reportado al 5/10, sin recursos nuevos; timers activos.

Backup previo 17:21:22 UTC de a4e766f, archivo 240605f75414; SHA256
9f0ee163b30a06fc62b4fdc3994a92c2e2a884030d4c58619f5549f77931fd26.
Cifrado age en /srv/opengym-encrypted. Propietario autoriza especificamente copia
a esta PC y restore; transfer-611e7794c40b466d86a07406e7b62939, 7 archivos/3.15 s,
checksums y limpieza plaintext verificados. Evidencia privada ignorada en
.production-state/deploy-requests y openGym-backups/transfer-611e7794c40b466d86a07406e7b62939.
Acceso propio Managed SSH DELETED; claves/config retiradas. Navegador propio
y puerto de depuracion 9234 cerrados; pruebas finales/contexto OK.

## Bloqueo y siguiente paso

Estado remoto pending-external. WAF 5/10 17:15:10 UTC (14:15 AR), BR/403,
Ray a45e11210d29864b-GRU: falta confirmacion del propietario de evento
Block/opengym_argentina_only, solicitada por pregunta asincronica. No inferir
regla desde 403. Backup diario no puede ejecutarse hasta accepted; copia manual
consistente ya verificada. Tras confirmacion, abrir nueva ventana propia
Bastion/navegador: el helper actual conserva lease DELETED. Refrescar HTTPS,
ejecutar accept-production.sh para SHA exacto y revisar backup/timers.
Constancia remota .production-state/https-240605f.receipt; renovar si hace falta.
