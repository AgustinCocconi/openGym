# Validacion real del Coach adaptativo

## Objetivo y alcance

Completar la paridad del recorrido adaptativo con otros modelos y dispositivos.
Estado del porte en [PORTING_MAP](../../adaptive-training/PORTING_MAP.md);
contratos/gate en [AI_TRAINER_PROTOCOL](../../adaptive-training/AI_TRAINER_PROTOCOL.md).
Core api/coach/core, adaptadores y UI components/adaptive-training.

## Criterios de aceptacion

- Gate por proveedor/modelo/protocolo/idioma es y es-AR.
- Consulta conserva entrenamiento y pending; cambio confirma diff/motivo/alcance,
  preserva registros y permite undo antes de datos materiales nuevos.
- Dolor/prerrequisitos/equipo/candidatos bloquean propuestas incompatibles.
- Registro y finalizacion manual completos sin modelo.
- Navegador/dispositivos: plan, sesion parcial, habilidades y acuse idempotente.

## Estado y verificaciones

Dependencias resueltas en 1ee3ac4; upstream 1350409 revisado sin merge.
Gate Linux/Docker Node 22.23.3/CI 3dbc82f: frontend 1.559, API 233, MCP 59,
build/14 locales/1.361 claves/assets/carga/fatiga/contexto y seis tests OK.
Imagenes/default/SDK y ops OK; todas las variantes npm audit en cero.
La tarea de auditoria se retiro; delta documentado en UPSTREAM_STRATEGY.

Codex CLI 0.160.0/gpt-6.1-sol: 14/14 escenarios, 15 llamadas exitosas,
coach_contract:1 / active-workout/v1 / pending-volume-reduction/v1, es y es-AR.
Consulta parcial, omision, dosis, dolor, habilidad bloqueada, equipo/allowlist
y aclaracion. Reduccion de dosis es necesito una reparacion; hubo una falla
transitoria de proveedor en otra consulta, completada al retomar.
Los dos primeros probes de creacion se excluyeron: el harness no enviaba la
restriccion en intake. Repetidos correctamente mediante profile.notes, pasan.

Chrome 153.0.8010.53: nueve casos en cada combinacion es/es-AR × 1280/390,
36/36 OK. Confirma plan/propuesta reales, preserva sesion/historial/rutina,
consulta con pending, omision manual/undo, acuse con 503 y reintento sin duplicar,
tres reps insuficientes y bloqueo por dolor. Endpoints HTTP interceptados;
viewport movil no acredita dispositivo fisico ni flujo completo servidor/modelo.
Logs, harnesses, respuestas y capturas locales ignorados:
.production-state/coach-validation/{summary.json,real-model-results.jsonl,browser-results.json}.
Gate/instalaciones/Compose: .production-state/dependency-review.

## Pendientes y siguiente accion

- Repetir matriz con otro proveedor real y BYOK; registrar paridad y modelos.
- Verificar telefono/dispositivos fisicos; viewport movil no acredita ese gate.
- Registro automatico de modelos aprobados y operaciones activas restantes.

3dbc82f/coach publicado y aceptado por pedido del propietario; checkpoint OCI.
Chrome 153/390, UI → API → Codex real sin interceptar HTTP: consulta parcial
y omision con confirmacion/undo preservan rutina y registros. Manual offline
completo, reconexion/sync/historial y undo bloqueado por datos nuevos OK.
Evidencia ignorada: .production-state/deploy-coach/{http-browser-result.json,
live-active-result.json,offline-result.json}; no acredita telefono fisico.
OCI: Codex CLI 0.160.0/gpt-6.1-sol real, binding propietario y 30 solicitudes/dia OK.
Seguridad: tools de host deshabilitadas; canary local/OCI no leido, cero comandos.
Castellano integral y politicas pendientes siguen en PORTING_MAP. Al completar
la matriz, integrar evidencia en capsulas y retirar esta tarea.
