# Despliegue de controles y respuestas del Entrenador

## Objetivo y alcance

Publicar en producción las correcciones de controles, espaciados, traducción de equipamiento y creación bloqueada del Entrenador. El propietario autorizó el despliegue el 5/10/2026 AR. Conservar Coach conectado, cuotas 30/30, datos y protección Access/WAF.

## Aceptación observable

CI Node 22 y publicación correctas para el SHA exacto; respaldo previo verificado; API Coach y web de ese SHA saludables; smoke HTTPS desde AR; aceptación protegida según el runbook; timers y acceso temporal cerrados.

## Referencias y zona

[Checkpoint OCI](../../adaptive-training/OCI_DEPLOYMENT_PLAN.md), [runbook](../../../ops/PRODUCTION_RUNBOOK.md), [operaciones protegidas](../../../ops/PROTECTED_OPERATIONS.md). Cambios de UI/locale y pipeline Coach ya verificados localmente. No crear recursos OCI ni modificar permisos de Cloudflare.

## Estado y verificación

Rama personal con tres commits previos locales; producción 3dbc82f. Frontend Windows Node 24: 1566 tests/116 archivos; API 237 pass y un skip de plataforma; build, locales, assets, core y contexto OK. Navegador real: 12 combinaciones de locale, ancho y tema. Evidencia privada ignorada en .production-state/coach-inputs.

## Siguiente acción

Publicar candidato reproducible, esperar CI y desplegar por Bastion con respaldo; comprobar aceptación protegida y actualizar checkpoint antes de cerrar la tarea.
