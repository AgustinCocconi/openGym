# Indice de contexto del fork

Este es el indice unico por tarea; no agregar otro `CONTEXT_INDEX.md`.
Las reglas comunes estan en [AGENTS.md](../../AGENTS.md); arquitectura y
convenciones upstream en `CLAUDE.md` y `CONTRIBUTING.md`.
Leer solo la fila relevante y seguir referencias cuando sean necesarias.

## Estado y fuentes

El fork existe en `personal`. La base integrada y el estado de porte viven en
[PORTING_MAP.md](PORTING_MAP.md), no en una segunda fotografia del indice.
Las fuentes anteriores estan fijadas en [LEGACY_SOURCES.md](LEGACY_SOURCES.md).
Las capsulas describen el objetivo; no prueban que una capacidad este portada.
Comprobar codigo, tests y Git antes de afirmar que funciona.

## Lectura por tarea

| Si la tarea es... | Leer primero | Leer despues solo si hace falta |
| --- | --- | --- |
| Instrucciones, contexto o continuidad entre agentes | [WORKFLOW.md](../agents/WORKFLOW.md) | [auditoria](../agents/CONTEXT_AUDIT.md), `scripts/context-budget.json` |
| Entender el producto | [PRODUCT_CONTRACT.md](PRODUCT_CONTRACT.md) | `DOMAIN_RULES.md` |
| Sincronizar upstream | [UPSTREAM_STRATEGY.md](UPSTREAM_STRATEGY.md) | `PORTING_MAP.md` |
| Cambiar seleccion o ranking | [DOMAIN_RULES.md](DOMAIN_RULES.md) | escenario relacionado; fuente exacta si falta una regla |
| Entrenador IA o rutina/sesion | [AI_TRAINER_PROTOCOL.md](AI_TRAINER_PROTOCOL.md) | contrato y escenario relevante; `docs/AI_COACH.md` por seccion |
| Traducir interfaz o ejercicios | [LOCALIZATION_ES.md](LOCALIZATION_ES.md) | `DATA_CONTRACTS.md`, locale o IDs afectados |
| Retomar OCI | [Checkpoint del plan](OCI_DEPLOYMENT_PLAN.md#checkpoint) | fase pendiente, decisiones vigentes y gate; documentos operativos por seccion |
| Operar produccion | [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md) | comando del runbook, gate OCI y seccion de self-hosting |
| Portar una capacidad anterior | [PORTING_MAP.md](PORTING_MAP.md) | una unica ruta autorizada de `LEGACY_SOURCES.md` |
| UI, store o logica general de openGym | `CLAUDE.md` -> Frontend | buscar simbolo en `frontend/src/{views,components,store,lib}` |
| API, autenticacion o notificaciones | `CLAUDE.md` -> API | `docs/SELF_HOSTING.md` -> contrato relevante, `api/server.js` por ruta |
| MCP o mobile | `CLAUDE.md` -> subsistema | `mcp/README.md` o `docs/MOBILE.md` por seccion |
| Build, scripts o CI | `package.json` de la zona | workflow y script exactos; no inferir comandos desde prosa antigua |

El checkpoint OCI concentra el estado operativo; leer la fase y sus referencias
por seccion. Antes de operar, revisar todos los prerrequisitos y gates aplicables.
La evidencia historica registrada no acredita una nueva verificacion remota.

## Que actualizar

| Conocimiento que cambia | Fuente a actualizar |
| --- | --- |
| Regla comun de agentes | `AGENTS.md` (protocolo detallado: `WORKFLOW.md`) |
| Ruta de lectura o ubicacion de una responsabilidad | este indice |
| Comportamiento adaptativo | capsula y escenario correspondiente, tests junto al modulo |
| Capacidad portada, base integrada o divergencia | `PORTING_MAP.md` |
| Decision de integracion upstream | `UPSTREAM_STRATEGY.md` |
| Despliegue, operacion o estado OCI | documento operativo correspondiente; checkpoint unico en el plan |
| Trabajo incompleto | `docs/tasks/active/<nombre>.md`, enlaces a las fuentes anteriores |

Tests y codigo muestran garantias y comportamiento actuales; capsulas y
escenarios especifican el objetivo. Si divergen, explicitar la diferencia y
corregir el escenario antes de implementar, sin elevar una prueba vieja por
encima del pedido vigente. Las aplicaciones anteriores solo son referencia.

## Contexto acotado

Seleccionar normalmente de uno a tres escenarios relevantes, sin usarlo como
limite para omitir una invariante necesaria. Leer secciones de documentos largos
y buscar IDs en datos de referencia. No crear un `CONTEXT.md` acumulativo.
`npm run check:context` controla carga base, capsulas/secciones y outliers de
codigo; [el protocolo](../agents/WORKFLOW.md#presupuesto-verificable) explica la
medicion y sus limites.
