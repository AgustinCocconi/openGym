# Despliegue de pedidos de cambio sin historial

## Objetivo y alcance

Desplegar en produccion la correccion de pedidos explicitos del Coach.
Propietario autoriza despliegue el 5/10/2026 AR. Conservar datos, Coach conectado,
gpt-6.1-sol, cuotas 30/30 y Access/WAF. No cambiar infraestructura ni autenticacion.

## Criterios de aceptacion

- SHA exacto en origin/personal, CI Linux Node 22 y publicacion verdes.
- Backup consistente previo, copia cifrada PC y restauracion aislada verificados.
- API_TARGET=coach, API/web saludables y prompt del SHA candidato.
- HTTPS desde AR protegido; aceptacion segun runbook y confirmacion WAF.
- Timers activos, acceso temporal cerrado y tarea retirada al completar.

## Contexto y zona afectada

[Checkpoint](../../adaptive-training/OCI_DEPLOYMENT_PLAN.md),
[runbook](../../adaptive-training/PRODUCTION_RUNBOOK.md),
[operaciones protegidas](../../../ops/PROTECTED_OPERATIONS.md).
Prompts common/review, schema y seis tests compartidos. Escenario
coach-request-without-history; evidencia en PORTING_MAP. Tarea anterior
[controles](despliegue-controles-coach.md) conserva WAF pendiente de a4e766f.

## Estado actual

Inicio personal/2443115; origin/personal a4e766f. Delta propio revisado: ocho
archivos. Preflight OCI: VM RUNNING/E2, cero sesiones Managed SSH activas.
Sesion de navegador de depuracion cerrada; pendiente reabrir para smoke protegido.
Preparando commit y publicacion, sin cambios productivos todavia.

## Verificacion

Windows Node 24.15.0: API 243 pass/1 skip, frontend relevante 277 pass.
Build/assets/core/contexto y seis tests de contexto OK. Codex 0.160/gpt-6.1-sol
real: pedido y seguimiento 2/2 es-AR, IDs validos y evidencia cero sin mutacion.
CI Linux Node 22 del nuevo SHA pendiente; checks anteriores no acreditan candidato.

## Bloqueos y siguiente paso

Commit/push del delta autorizado, observar CI/publicacion, preparar ventana
Bastion aislada y preflight remoto. Revalidar backup/HTTPS antes del cambio.
No aceptar WAF desde un 403: requerir confirmacion del evento por el propietario.
