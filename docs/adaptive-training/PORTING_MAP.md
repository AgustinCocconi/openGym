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

## Correcciones de producto sobre la base

La base integrada sigue en `a68a88d`. El 2026-10-04 se hizo fetch y se reviso
`upstream/main` en `1350409`, sin merge; sus cuatro commits nuevos son docs/web.
No contiene estas operaciones activas ni objetivos de habilidad.
La [auditoria por subsistemas](../agents/SUBSYSTEM_AUDIT.md) registra H01-H10
y su verificacion local. Son correcciones previas; no completan
las fases adaptativas pendientes.

Referencias locales reutilizadas: `585f372` para eliminar rutinas y sus punteros;
`e637a9e` para leer todas las ocurrencias; lectura por rutina de `ab0c586`.
La conversion tolera `planned` de `8049f1b` y agrega masa, volumen, guia activa,
snapshots y normalizacion entre dispositivos. Las guardas de Coach se comparten
entre servidor/mobile/cliente; el aislamiento de sync y secretos queda propio.
Los escenarios de la auditoria fijan las invariantes sin importar todo upstream.

## Gobernanza del fork

[Router](../../AGENTS.md), [indice](README.md) y
[continuidad](../agents/WORKFLOW.md) rigen las tareas. check:context usa
scripts/context-budget.json; [auditoria](../agents/CONTEXT_AUDIT.md) registra
la base. Tooling propio sin dependencias nuevas, gate context.yml desde test.yml
y enlaces puntuales en CLAUDE/CONTRIBUTING; no marca capacidades runtime portadas.

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
| Habilidades | BE `src/application/skill-progression.ts` | `api/coach/core/skills.js` | Parcial: grafo/evidencia sobre workouts canonicos |
| Escenarios | BE `test/fixtures/planning-scenarios.ts` | tests junto a `adaptive-training` | Convertir datos, no copiar harness D1 |

## Estado del nucleo adaptativo

Recencia/variedad parcial: recency.js y 12 tests de bandas, score y desempate
por ID en 9324f29940b4efe864b36862cf6ad9a4a51b858b, derivados de
[exercise-recency-ranking](scenarios/exercise-recency-ranking.json).
IDs canonicos; faltan historial/fechas, ranking de candidatos e integracion
UI/Coach. No se marca portada la capacidad completa.

## Recorrido local de calistenia y sesion activa

Core compartido bajo api/coach/core: question, active-workout, candidates,
joint-signals y skills. Se reutilizan Coach, Zustand, historial y adaptadores;
no hay dependencia runtime de los repositorios anteriores. Habilidades adapta
solo grafo/evidencia de la fuente habilitada cuyo hash consta en LEGACY_SOURCES.
Las demas politicas siguen pendientes.

Consulta es el modo inicial. Siete operaciones activas cerradas incluyen alta,
baja sin registro, sustitucion y continuacion parcial. Dosis usa solamente
pending-volume-reduction/v1 para reducir series rectas totalmente pendientes.
Snapshot acotado, allowlist/equipo/prerrequisitos, evidencia derivada,
confirmacion, undo e idempotencia del acuse comparten contrato servidor/BYOK.
El polling adapta la guarda de respuestas viejas de upstream 43a2054.

## Verificacion del recorrido

4/10/2026, 526bbb0: Linux/Docker Node 22, frontend 1.559 tests,
API 229, MCP 59, build, assets, locales, carga Node y probes de fatiga OK.
Windows/Node 24: check:context y seis tests OK.
DOM simulado y proveedores fixture; faltan modelos reales, navegador/dispositivos,
CI del nuevo codigo y deploy. Reporte general: 33 strings heredados sin traducir.

Base a68a88d intacta, Linux/Node 22.23.3: frontend 1.468, API 181, MCP 58,
build/carga MCP OK (frontend ignore-scripts). Gate Linux completo; Windows
falla por fixture-cli C:\C:\..., corregido en personal.
Main bundle crece aproximadamente 153 kB (29 kB gzip) frente al personal previo;
se mantienen los avisos de Vite heredados y los presupuestos de contexto.

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

Remotos, base y router creados. Gate limpio registrado arriba; API de base falla
en Windows; el gate de base sin modificaciones pasa en Linux/Node 22.

### P1: nucleo adaptativo puro

Recencia pura parcial y filtros del primer flujo. Faltan frecuencia/exposiciones,
adaptador de historial/fechas y adaptive-context/v1 completo.

### P2: entrenador de solo lectura

Consulta implementada con contexto activo/documental. Faltan gate real por
modelo y sugerencia de proxima sesion basada en exposiciones 7/14/28.

### P3: cambio durante la sesion

Siete operaciones implementadas con diff, confirmacion y preservacion parcial.
Sintomas sin clasificacion compatible solo permiten omision/baja.

### P4: planificacion avanzada

Objetivos/prerrequisitos manuales y reduccion de dosis sobre items pendientes simples ya existen.
Faltan grafos curados, politica de recuperacion y revisiones de bloques.

### P5: castellano integral

Controles nuevos y 18 nombres curados. Faltan cobertura integral y gate real es/es-AR.

### P6: acceso externo

Evaluar MCP write/remoto despues de validar estos flujos y revisar upstream.

## Definition of migrated

Una fila se marca portada cuando:

1. Existe una implementacion pura y probada en el fork.
2. Los escenarios correspondientes pasan.
3. No hay dependencia runtime del repositorio anterior.
4. La integracion toca el minimo razonable de archivos centrales.
5. La fila registra commit del fork y se elimina cualquier TODO ambiguo.
