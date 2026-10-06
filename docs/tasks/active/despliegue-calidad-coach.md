# Despliegue de calidad de planes del Coach

## Objetivo y autorizacion

Publicar personal y desplegar las mejoras de candidatos, calidad y volumen
muscular para que el propietario pruebe de nuevo. Autorizado en chat el
6/10/2026: si a commit, publicacion, CI/imagenes, backup y despliegue en la
instancia actual. Mantener modelo, cuotas, Access/WAF y datos; sin IaC nueva.

## Criterios de aceptacion

SHA exacto, CI/publicacion verdes, imagenes coach/web por revision/digest;
backup consistente cifrado/copia PC/restore aislado; smoke interno/HTTPS AR;
acceso temporal cerrado, timers activos y aceptacion externa acreditada.
No editar planes ni historiales; la prueba de generacion la hace el propietario.

## Contexto y estado

[Calidad](../../adaptive-training/PLAN_QUALITY.md),
[runbook](../../adaptive-training/PRODUCTION_RUNBOOK.md),
[operaciones protegidas](../../../ops/PROTECTED_OPERATIONS.md).
Preflight Docker/Linux Node 22.23.3: API 279, frontend 1628, MCP 59;
build/assets/core/locales/fatiga/contexto OK. Delta local propio en personal
sobre a6548e6; previo 2eb87ea/coach con WAF pendiente segun checkpoint.
Preservar otras tareas activas; ninguna evidencia vieja acepta un SHA nuevo.

## Siguiente paso

Commit de rutas concretas y push autorizado; esperar CI/publicacion. Luego
preflight OCI y ventana Managed SSH temporal propia, backup/deploy/smoke.
Registrar SHA y evidencia en cada frontera; cerrar accesos aunque falle.
