# Validacion real del Coach adaptativo

## Objetivo y alcance

Validar el primer recorrido adaptativo con proveedores/modelos y navegador antes
de desplegarlo. Estado del porte en PORTING_MAP; no ampliar aqui el alcance a
todas las politicas pendientes.

## Criterios de aceptacion

- Gate registrado por proveedor/modelo/protocolo/idioma es y es-AR.
- Consulta conserva entrenamiento y pending; cambio muestra diff/motivo/alcance,
  confirma, preserva registros y permite undo antes de datos materiales nuevos.
- Dolor/prerrequisitos/equipo/candidatos bloquean propuestas incompatibles.
- Flujo manual completo cuando el modelo no esta disponible.
- Verificar navegador y dispositivos para plan, sesion parcial, habilidades y
  reintento del acuse sin aplicar dos veces.

## Referencias y zona afectada

[Mapa](../../adaptive-training/PORTING_MAP.md),
[protocolo](../../adaptive-training/AI_TRAINER_PROTOCOL.md),
[contratos](../../adaptive-training/DATA_CONTRACTS.md),
[castellano](../../adaptive-training/LOCALIZATION_ES.md).
Core api/coach/core; adaptadores Coach existentes; UI components/adaptive-training.
Escenarios: calisthenics-live-management, novice-pullup-foundation,
coach-candidate-allowlist y reported-pain-plan-removal. Leer solo rutas pertinentes.

## Estado actual

Core e9ad79d y UI 526bbb0 comiteados localmente. Consulta/operaciones activas,
habilidades/evidencia y es-AR implementados con consentimiento v2. Produccion
conserva app e8771b1 y operaciones 9fdb243: este Coach aun no esta desplegado.
Publicacion y CI del codigo nuevo pendientes; no avanzar checkout OCI sin
planificar deploy/aceptacion y pausa del timer de backups.

## Verificaciones

Linux/Docker Node 22, checkout limpio 526bbb0: frontend 1.559 tests, API 229,
MCP 59, build/14 locales/1.361 claves/assets/carga directa/probes de fatiga OK.
Windows Node 24.15.0: check:context y seis tests OK. Log local ignorado:
.production-state/final-review-evidence/node22-gate.log. Fixtures y DOM simulado;
no prueba modelos reales ni navegador. [Auditoria de dependencias](dependencias-auditoria.md) registrada; lockfiles
sin cambios. Resolver ese pendiente antes de proponer publicacion.

## Pendientes y siguiente accion

Preparar matriz de pruebas y proveedor disponible con el propietario; ejecutar
escenarios reales en es/es-AR y registro manual offline antes de proponer deploy.
No declarar aprobacion de modelos por las pruebas con fixtures. Traduccion total
sigue pendiente: 33 strings heredados y nombres fuera de 18 IDs curados.
Frecuencia/exposiciones 7/14/28, ranking integrado, grafos avanzados, recuperacion,
revision de bloques y acceso MCP remoto siguen en PORTING_MAP para otras tareas.
Al aprobar, actualizar capsulas y retirar esta tarea.