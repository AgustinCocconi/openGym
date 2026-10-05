# Despliegue de controles y respuestas del Entrenador

## Objetivo y alcance

Publicar en producción las correcciones de controles, espaciados, traducción de equipamiento y creación bloqueada del Entrenador. El propietario autorizó el despliegue el 5/10/2026 AR. Conservar Coach conectado, cuotas 30/30, datos y protección Access/WAF.

## Aceptación observable

CI Node 22 y publicación correctas para el SHA exacto; respaldo previo verificado; API Coach y web de ese SHA saludables; smoke HTTPS desde AR; aceptación protegida según el runbook; timers y acceso temporal cerrados.

## Referencias y zona

[Checkpoint OCI](../../adaptive-training/OCI_DEPLOYMENT_PLAN.md), [runbook](../../adaptive-training/PRODUCTION_RUNBOOK.md), [operaciones protegidas](../../../ops/PROTECTED_OPERATIONS.md). Cambios de UI/locale y pipeline Coach ya verificados localmente. No crear recursos OCI ni modificar permisos de Cloudflare.

## Estado y verificación

Candidato a4e766f7af9375e86669a6ecaa56399631866542 integrado en origin/personal y producción; CI/publicación 37265224939 green. Estado remoto pending-external: no registrar aceptación sin confirmación del propietario. Frontend Windows Node 24: 1566 tests/116 archivos; API 237 pass y un skip de plataforma; build, locales, assets, core y contexto OK. Navegador real: 12 combinaciones de locale, ancho y tema. Evidencia privada ignorada en .production-state/coach-inputs.

## Siguiente acción

Deploy con API_TARGET=coach, respaldo previo consistente 5/10 04:58:32 UTC, cifrado/copias PC y restore aislado 1,36 s verificados. HTTPS AR a las 05:00 UTC; UI móvil real confirma controles, padding y equipamiento castellano. Coach conectado/enabled, gpt-6.1-sol, binding propietario y cuotas 30/30 preservados. Timers activos. Evidencia privada: .production-state/deploy-inputs y openGym-backups/transfer-2122c797d70d41d9a5fe3dddb6986701.

Prueba exterior 5/10 05:00:13 UTC (02:00 AR): HTTP 403, loc BR, Ray a459dc8afc64a18f-GRU. Pregunta pendiente al propietario: comprobar evento Block/opengym_argentina_only en Cloudflare. No inferir regla desde 403 ni recrear tokens. Constancia HTTPS en host .production-state/https-a4e766f.receipt; refrescar si supera 30 minutos. Ejecutar accept-production.sh solo tras esa confirmación, actualizar checkpoint y eliminar tarea. La rutina de backup exige estado accepted; próxima ejecución 08:00 UTC. API/web saludables, timers activos; Bastion DELETED y claves/config retiradas. Navegador de depuración cerrado; plaintext temporal eliminado. Para aceptar tras confirmación, abrir una nueva ventana aislada (el helper anterior conserva lease DELETED), refrescar la constancia HTTPS desde la sesión del propietario y cerrar nuevamente acceso/depuración.
