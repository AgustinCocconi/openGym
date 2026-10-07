# Despliegue de calibracion del gimnasio

## Objetivo y alcance
Publicar las mejoras de calibracion y ayuda pedidas por el propietario en la
instancia OCI existente. Sin cambios de infraestructura ni de planes guardados.

## Criterios de aceptacion
Candidato identificado por SHA completo, gate Node 22 y CI/publicacion verdes,
backup cifrado fuera del host con restauracion aislada, servicios saludables,
HTTPS protegido y aceptacion registrada; cerrar acceso temporal y restituir timers.

## Contexto y zona afectada
[Runbook](../../adaptive-training/PRODUCTION_RUNBOOK.md),
[checkpoint](../../adaptive-training/OCI_DEPLOYMENT_PLAN.md#checkpoint).
Codigo de Coach, calidad de plan y ayuda/calibracion de sesion ya verificados.

## Estado actual
Rama personal; produccion 5b544ef, HEAD previo c4773c9 (cierre documental).
Cambios locales propios listos; otras tareas activas se preservan.
Autorizacion explicita del propietario: desplegar.

## Verificacion
Implementacion: API 283 pass/1 skip, frontend 1636 pass y casos posteriores
dirigidos; build, locales, assets, Node-loadable, context y navegador es/es-AR
390/1440 verificados. Pendientes los gates del candidato y evidencia productiva.

## Bloqueos y siguiente paso
Sin bloqueos. Commit del candidato y gate aislado Linux Node 22.
