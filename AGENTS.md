# Instrucciones comunes del fork

Este fork agrega entrenamiento adaptativo en castellano a openGym con un delta
pequeno y reconocible. Este archivo es la fuente de reglas propias para todos
los agentes. Las reglas de upstream en `CLAUDE.md` y `CONTRIBUTING.md` siguen
vigentes; no convertir esos archivos en wrappers ni duplicar sus reglas aqui.

## Inicio y contexto

1. Leer una vez `CLAUDE.md`, `CONTRIBUTING.md` y
   [el indice por tarea](docs/adaptive-training/README.md). No releer contenido
   ya cargado salvo que cambie. Leer instrucciones locales del arbol afectado.
2. Revisar `git status --short --branch`, rama y diff de la zona afectada.
   Preservar cambios ajenos; revisar tareas relacionadas en `docs/tasks/active/`
   si existen. No descartar, sobrescribir ni mezclar trabajo desconocido.
3. Localizar con `rg` en rutas acotadas antes de leer. Abrir solo la capsula,
   escenarios y rangos necesarios; no explorar directorios por rutina.
4. Para trabajo con continuidad, concurrencia o cambios a estas instrucciones,
   consultar [el protocolo](docs/agents/WORKFLOW.md). Cada tarea tiene su propio
   estado persistido; el chat y la memoria del agente no son fuentes de verdad.

No recorrer `training-app-be` ni `training-app-fe`: usar solo rutas exactas
habilitadas por `PORTING_MAP.md`. Capturar reglas nuevas en escenarios.
Catalogos, locales, instrucciones de ejercicios, artefactos generados, lockfiles,
media, datos privados y changelog se consultan solo cuando la tarea los requiere.
No cargar el estado completo ni todo el catalogo al contexto de un agente.

## Arquitectura y comportamiento

- Logica de entrenamiento pura con tests al lado; UI React/Zustand y backend
  Node liviano. Modulos propios identificables, adaptadores finos, sin segundo
  estado global. No trasplantar Hono, D1, Angular ni autenticacion anterior.
- Mantener IDs y campos canonicos. No reformatear codigo ajeno a la tarea,
  reordenar imports ni hacer refactors masivos preventivos.
- Cambios al plan o sesion activa: validacion deterministica, diff y confirmacion
  explicita. Preservar siempre lo registrado y permitir registro/ajuste manual
  aunque el modelo no este disponible.
- Proveedor/modelo intercambiables. Contexto compacto, IDs validos y candidatos
  acotados; propuestas estructuradas validadas por codigo, no por el prompt.
  Preguntas informativas son de solo lectura y no pueden mutar estado.
- Idioma del perfil, recorridos criticos completos en castellano y soporte
  `es-AR`; no traducir identificadores de codigo.

## Upstream y cierre

- Antes de una funcionalidad revisar si upstream ya la incorporo. Reutilizar
  contratos de Coach, localizacion, workout model y estado. Aislar mejoras
  genericas para poder proponerlas upstream.
- Sincronizar segun `docs/adaptive-training/UPSTREAM_STRATEGY.md`: primero gate
  de upstream sin modificaciones, despues tests propios. Registrar base y
  divergencias en `PORTING_MAP.md`.
- Una capacidad adaptativa requiere escenario, test junto al modulo puro,
  contrato validado igual entre proveedores, propuesta/motivo/alcance/reversion
  visibles en UI y flujo critico sin ingles en locale castellano.
- Ejecutar verificaciones reales pertinentes y `npm run check:context`; revisar
  diff y actualizar solo conocimiento vigente. Dejar handoff si falta trabajo;
  al completar, integrar el conocimiento y eliminar la tarea activa.
- No subir presupuestos de contexto ni ampliar exclusiones para pasar el gate
  sin motivo concreto y acuerdo del usuario. No push ni publicacion sin pedido
  explicito; commits pequenos de una sola tarea cuando esten autorizados.
