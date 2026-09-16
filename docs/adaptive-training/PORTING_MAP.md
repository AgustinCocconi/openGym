# Mapa de porte

## Regla de uso

Este mapa es la puerta de entrada a las aplicaciones anteriores. No explorar un
repositorio completo para una tarea. Abrir primero la capsula del paquete, luego
el escenario y solo entonces la ruta de origen que aparece en su fila.

Las rutas objetivo son intencionales, no definitivas: deben ajustarse a la
estructura del commit de openGym que se use como base sin perder el limite entre
logica pura, UI y adaptadores.

## Base del fork

- Upstream: `https://github.com/DuarteSantos8/openGym.git`.
- Commit base: `a68a88d2da04cf3334eeeca136385114a65450ff`.
- Fecha de verificacion: `2026-09-16`.
- `main`, `origin/main` y `upstream/main` coincidieron en ese commit al iniciar
  la fase P0; el trabajo propio parte de la rama `personal`.

## Portar comportamiento y tests

| Capacidad | Fuente precisa | Destino conceptual en openGym | Tratamiento |
| --- | --- | --- | --- |
| Politica versionada | BE `src/domain/planning-policy.ts` | `frontend/src/lib/adaptive-training/policy.js` | Portar valores e invariantes a JS puro |
| Exposiciones 7/14/28 | BE `src/application/planning-exposures.ts` | `frontend/src/lib/adaptive-training/exposures.js` | Reimplementar sobre workouts de openGym |
| Frecuencia y deficits | BE `src/application/planning-frequency.ts` | `frontend/src/lib/adaptive-training/frequency.js` | Portar formulas y desempates |
| Recencia/variedad | BE `src/application/planning-exercise-recency.ts` | `frontend/src/lib/adaptive-training/recency.js` | Portar bandas y tests de limites |
| Bloqueos articulares | BE `src/application/planning-blockers.ts` | `frontend/src/lib/adaptive-training/blockers.js` | Portar regla conservadora; adaptar regiones |
| Candidatos | BE `src/application/planning-candidates.ts` | `frontend/src/lib/adaptive-training/candidates.js` | Reimplementar adaptador de catalogo y conservar orden |
| Explicaciones | BE `src/application/planning-explanations.ts` | logica pura + locale de openGym | Conservar codigos; localizar mensajes |
| Fechas locales | BE `src/application/planning-time.ts` | helper puro existente o nuevo | Reutilizar upstream si ya resuelve fechas locales |
| Habilidades | BE `src/application/skill-progression.ts` | fase posterior de adaptive training | Portar grafo/evidencia, no almacenamiento |
| Escenarios | BE `test/fixtures/planning-scenarios.ts` | tests junto a `adaptive-training` | Convertir datos, no copiar harness D1 |

## Reimplementar sobre la arquitectura de openGym

| Capacidad | Fuente precisa | Motivo para no copiar |
| --- | --- | --- |
| Payload compacto | BE `src/application/planning-context-payload.ts` | El contrato es util; los modelos y el almacenamiento cambian |
| Cambio por motivo | FE `src/app/features/sessions/exercise-change.ts` | Funciones portables, pero la UI destino es React |
| Maquina de cambio | FE `src/app/features/sessions/exercise-change-state.ts` | Debe usar el workout model y store de openGym |
| Ajuste de dosis | FE `src/app/features/sessions/session-adjust-state.ts` | Reimplementar con configs/sets de upstream |
| Lenguaje de planificacion | FE `src/app/features/preparation/planning-language.ts` | Los codigos se conservan; los textos van al locale de openGym |
| Flujo UX | BE `INTERFACE_PLAN.md`, seccion desde linea 326 | Es una especificacion de decisiones, no un componente portable |
| Coach en sesion activa | `AI_TRAINER_PROTOCOL.md` | Se extiende el Coach actual, no el MCP anterior |

## Conservar como referencia para una fase posterior

| Capacidad | Fuente | Cuando consultarla |
| --- | --- | --- |
| MCP compacto | BE `src/mcp/domain-tools.ts` | Al disenar MCP write/remoto en el fork |
| Scopes OAuth y seguridad | BE `src/infrastructure/auth/mcp.ts` | Solo si upstream aun no lo resuelve al llegar a esa fase |
| Idempotencia | BE casos de uso/repositorios y tests REST | Si la persistencia de sesion activa necesita reconciliacion remota |
| Presupuestos de contexto | BE `test/mcp-budgets.test.ts` | Al exponer contexto a clientes externos |
| Procedencia de catalogo | BE modelo/migraciones de exercise sources | Al importar traducciones o contenido curado |

## No portar

- Angular, componentes y shell de `training-app-fe`.
- Hono, Cloudflare Workers, D1 y sus repositorios.
- Rutas REST que openGym ya resuelve mediante su propio estado.
- Autenticacion bearer/device propia.
- OpenAPI completo de la aplicacion anterior.
- El catalogo anterior como reemplazo del catalogo de openGym.
- Infraestructura de despliegue y ambientes de Cloudflare.

Estas piezas pueden contener aprendizajes, pero copiarlas aumentaria el delta
contra upstream sin mejorar el objetivo principal.

## Orden de implementacion

### P0: fork limpio

- Crear remotos y ramas segun `UPSTREAM_STRATEGY.md`.
- Ejecutar tests/build de upstream y registrar commit base.
- Copiar este paquete e integrar el router de agentes.
- Activar AI Coach sin modificaciones y recorrerlo en castellano.

### P1: nucleo adaptativo puro

- Convertir escenarios de frecuencia, recencia, equipo y bloqueos a Vitest.
- Crear adaptadores desde el estado de openGym hacia `adaptive-context/v1`.
- No agregar todavia mutaciones por IA.

### P2: entrenador de solo lectura

- Preguntas durante la sesion.
- Explicaciones basadas en catalogo y contexto.
- Sugerencia de proxima sesion con evidencia de 7/14/28 dias.
- Gate de paridad por proveedor/modelo.

### P3: cambio durante la sesion

- Reemplazo de item pendiente.
- Equipo, variedad, dificultad y sintomas.
- Diff, confirmacion, fingerprint y rechazo de propuesta obsoleta.
- Preservacion de series parciales y continuacion con otro ejercicio.

### P4: planificacion avanzada

- Ajustes por tiempo y recuperacion con politica nueva.
- Habilidades y prerrequisitos.
- Revisiones de bloques y objetivos.

### P5: castellano integral

- Overlay de nombres por ID y aliases de busqueda.
- Importar solo coincidencias curadas y con procedencia.
- Completar recorridos y pruebas `es`/`es-AR`.

### P6: acceso externo

- Evaluar MCP write/remoto despues de revisar lo que haya incorporado upstream.
- Reutilizar ideas de scopes, idempotencia y payload compacto solo donde falten.

## Definition of migrated

Una fila se marca portada cuando:

1. Existe una implementacion pura y probada en el fork.
2. Los escenarios correspondientes pasan.
3. No hay dependencia runtime del repositorio anterior.
4. La integracion toca el minimo razonable de archivos centrales.
5. La fila registra commit del fork y se elimina cualquier TODO ambiguo.

