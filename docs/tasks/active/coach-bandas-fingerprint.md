# Propuestas confirmables con bandas y trabajo con cargas

## Objetivo y alcance

Corregir el rechazo de propuestas de cambio sin historial tras el despliegue
240605f y atender trabajo con cargas pedido en esta tarea. Preservar fingerprint,
confirmacion explicita, candidatos, datos y undo.
Zona: payload/library/review compartidos, paridad y confirmacion frontend; escenario
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
antes de mostrar/aplicar la respuesta. Diagnostico de solo lectura confirma
hash pending igual al legado. Perfil ya declara mancuernas/barra/maquinas;
seleccion 60 daba 19 bandas/20 bodyweight/1 dumbbell. Balance por grupo muscular
y menor representacion de equipo ahora ofrece las 14 clases declaradas; eq
canonico llega al modelo y pedido de cargas elige equipamiento cargable.
Base a68a88d/gate Linux intacto registrado
en PORTING_MAP; upstream 1350409 revisado por area, sin integracion.

## Siguiente paso

Regresion ejecutada en rojo: 14 fallos reproducen el hash incompatible. Regla
corregida: 326 tests frontend/6 archivos pasan, incluido servidor→confirmar/undo
CLI/HTTP, custom band/resistance band y flags explicitos. API Windows Node
24.15.0: 245 pass/1 skip. Build/assets/core/contexto OK. d9f78f2 tiene CI/publicacion verde; no desplegado: candidato final incorpora
peticion de cargas. Preparar commit/CI y desplegar ambas correcciones dentro de la autorizacion vigente. Modelo real
Codex 0.160.0/gpt-6.1-sol: un intento, 60 candidatos sinteticos; baja de 0991 y
2 altas con barra/maquina. Respuesta real confirma/undo: frontend 329 pass/7
archivos (incluye probe privado ignorado). Propuestas anteriores requieren
revision nueva: no reinterpretar ni reescribir sus fingerprints.
