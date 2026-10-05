# Propuestas del Coach con bandas marcadas como obsoletas

## Objetivo y alcance

Corregir el rechazo de propuestas de cambio sin historial tras el despliegue
240605f. Preservar fingerprint, confirmacion explicita, candidatos, datos y undo.
Zona: api/coach/core/payload.js, paridad y confirmacion frontend; escenario
coach-request-without-history. Estado operativo separado en
[despliegue-coach-pedidos](despliegue-coach-pedidos.md).

## Aceptacion observable

Plan sin ediciones: propuestas servidor/HTTP/BYOK confirmables, baja de 0991 y
altas aplicadas solo al confirmar; undo restaura plan. Edicion real invalida
propuesta y no muta datos. Banderas explicitas y ejercicios personalizados
conservan semantica. Tests pertinentes, build/assets/core y contexto pasan.

## Estado y evidencia

personal/ca5c0f3, arbol limpio al inicio. API isBw reconoce solo body weight;
frontend reconoce body weight/band/resistance band. Escenario con 0991 sin flag
produce interpretaciones distintas. Tests actuales omiten bandas y terminan
antes de mostrar/aplicar la respuesta. Base a68a88d/gate Linux intacto registrado
en PORTING_MAP; upstream 1350409 revisado por area, sin integracion.

## Siguiente paso

Regresion ejecutada en rojo: 14 fallos reproducen el hash incompatible. Regla
corregida: 326 tests frontend/6 archivos pasan, incluido servidor→confirmar/undo
CLI/HTTP, custom band/resistance band y flags explicitos. API Windows Node
24.15.0: 243 pass/1 skip. Build/assets/core/contexto OK. Preparar commit/CI y
desplegar dentro de la autorizacion vigente. Propuestas anteriores requieren
revision nueva: no reinterpretar ni reescribir sus fingerprints.
