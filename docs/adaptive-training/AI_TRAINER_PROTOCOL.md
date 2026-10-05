# Protocolo del entrenador IA

## Objetivo

Extender AI Coach para disenar/revisar planes y acompanar sesiones activas:
responder preguntas, sugerir que hacer y proponer ajustes sin perder registros.

Reutilizar Coach upstream: adaptadores, consentimiento, payload permitido,
validacion estructurada, historial, fingerprint y aplicacion confirmada.

## Arquitectura objetivo

La UI separa consulta (modo inicial) y cambio; el modelo no decide si una duda
modifica ejercicios.

UI -> modo -> payload acotado -> modelo intercambiable -> validador compartido
   -> respuesta de solo lectura, o diff -> confirmar -> aplicar.

El modelo nunca recibe escritura directa. Devuelve estructuras aplicadas por
codigo cerrado; las guardas se recalculan al confirmar sobre el estado vigente.

## Proveedor y modelo intercambiables

La interfaz conceptual de un adaptador es:

```text
generateStructured(systemPrompt, messages, payload, schema, timeout, signal)
  -> rawStructuredResponse
```

Todo adaptador debe declarar capacidades, no privilegios:

- listado de modelos, si existe;
- structured output / JSON schema, si existe;
- limite de contexto conocido, si existe;
- streaming, cancelacion y timeout;
- si ejecuta un proceso local o solo HTTPS.

Structured output mejora confiabilidad, pero el validador local es obligatorio.
Si el proveedor no acepta schema, puede degradar a JSON; no puede degradar la
validacion. Como upstream, se permite como maximo una ronda de reparacion.

No fijar una lista eterna de modelos "inteligentes". La configuracion permite
elegir el modelo y un gate de escenarios comprueba si cumple el contrato. Un
modelo no apto se muestra como configurado pero no aprobado para mutaciones.

### Gate minimo de capacidad

Un modelo apto para modo entrenador debe:

1. Producir JSON valido para todos los escenarios criticos.
2. Usar solamente IDs y operaciones provistos.
3. Respetar bloqueos aunque el texto del usuario pida ignorarlos.
4. Separar una respuesta informativa de una propuesta de cambio.
5. Responder en castellano cuando `locale` sea `es` o `es-AR`.
6. Citar evidencia incluida en el contexto sin inventar historial.
7. Pedir una aclaracion cuando falte una decision material.
8. Mantener paridad semantica al cambiar de proveedor.

La aprobacion se registra por `provider + model + protocolVersion`; un cambio de
modelo vuelve a ejecutar el gate. El registro automatico sigue pendiente;
hay evidencia acotada de Codex real, sin aprobar todas las mutaciones.

## Intenciones admitidas

| Intencion | Resultado permitido |
| --- | --- |
| `answer_question` | Texto de solo lectura con evidencia disponible |
| `explain_exercise` | Tecnica documentada, dosis y consideraciones conocidas |
| `suggest_next_session` | Propuesta basada en objetivos e historia reciente |
| `propose_plan_change` | Tipos de cambio de plan que valide openGym |
| `propose_today_change` | Ajustes a la sesion preparada pero no iniciada |
| `propose_active_workout_change` | Operaciones cerradas sobre items pendientes o parciales |
| `request_clarification` | Pregunta breve, sin mutacion |
| `safety_redirect` | Limite conservador y siguientes pasos no diagnosticos |

Una conversacion puede tener varias intenciones a lo largo del tiempo, pero una
respuesta concreta distingue claramente informacion de mutacion.

## Operaciones nuevas de sesion activa

Lista inicial cerrada:

```text
replace_pending_exercise
continue_after_partial_exercise
add_active_exercise
adjust_pending_prescription
skip_pending_exercise
remove_pending_exercise
reorder_pending_exercise
```

Cada operacion debe tener:

- implementacion deterministica;
- validacion de estado y IDs;
- diff legible;
- motivo y evidencia;
- fingerprint base;
- test de aplicacion, rechazo y revertibilidad o reconciliacion.

No existe una operacion generica `patch_state`. Agregar un tipo nuevo exige
schema, validador, aplicador y escenarios.

## Contexto compacto

Enviar solo lo necesario para el pedido:

- objetivo y preferencias relevantes;
- locale y unidades;
- disponibilidad y equipamiento momentaneos;
- sintomas/DOMS declarados para esta decision;
- exposiciones agregadas de 7, 14 y 28 dias;
- ultima ejecucion de ejercicios relevantes;
- sesion actual con estado de cada item y series ya hechas;
- candidatos validados, bloqueos y codigos de razon;
- detalles e instrucciones solo de ejercicios involucrados;
- capacidades permitidas para el alcance actual.

No enviar por defecto el estado completo, credenciales, otros perfiles, todo el
catalogo ni toda la carrera de entrenamiento. La seleccion del contexto es una
allowlist igual que la del Coach actual.

### Puente para la sesion activa

Upstream elimina active al sincronizar: el servidor no puede reconstruirlo.
El cliente manda activeWorkoutSnapshot efimero, con foco, targets, registro y
fingerprint. Solo vive en ese job; la respuesta se confirma en el dispositivo
emisor y se rechaza si el estado cambia. Servidor/BYOK comparten constructor,
validador y fixtures; no se persiste una copia del entrenamiento para la IA.

## Comportamiento durante la rutina

### Cambio por equipamiento

Interpretar que equipo queda disponible, recalcular candidatos y priorizar el
mismo patron. Si se propone otro patron, explicitarlo.

### Cambio por molestia

Pedir region/tipo solo si falta. Combinar la senal con las vigentes de la
sesion, aplicar bloqueos y no diagnosticar. Si no hay alternativa compatible,
decirlo.

### Poco tiempo

Preservar primero los objetivos mas prioritarios. Reducir volumen solo mediante
una politica versionada; no inventar duraciones minimas de ejercicios.

### Dificultad o rendimiento

Puede proponer variante o dosis, pero no trasladar automaticamente la carga de
otro ejercicio. Los cambios de progresion futuros deben convivir con el motor
de progresion de openGym, no reemplazarlo desde el prompt.

### Preguntas

Una pregunta como "por que hago esto" o "como coloco los pies" produce una
respuesta de solo lectura. Si el usuario luego pide cambiarlo, se crea otra
respuesta con propuesta y confirmacion.

## Propuestas y aplicacion

Review admite pedidos sin historial con confirmacion.

Toda propuesta de mutacion contiene:

- `protocolVersion`;
- `scope`;
- `baseFingerprint`;
- operaciones de lista cerrada;
- `reasonCode`, explicacion y evidencia;
- advertencias y supuestos;
- estado de confirmacion.

El cliente:

1. valida schema, IDs y estado;
2. recalcula guardas deterministicas;
3. muestra antes/despues;
4. pide confirmacion;
5. aplica o rechaza todo el change-set segun su contrato;
6. conserva snapshot para plan/rutina o reconcilia escrituras de sesion activa;
7. registra el resultado sin reinterpretar el texto del modelo.

## Seguridad y limites

- Dolor, pinzamiento, bloqueo e inestabilidad activan el camino conservador.
- El Coach no declara que una alternativa es medicamente segura.
- No recomienda entrenar a traves de una senal bloqueada.
- No inventa tecnica ausente del catalogo como si fuera documentacion.
- No ofrece consejo farmacologico ni diagnostico.
- Si una pregunta excede entrenamiento general, explica el limite y sugiere
  evaluacion profesional cuando corresponda.

## Idioma

El system prompt base puede mantenerse estable para aprovechar cache. El
payload implementado incluye `meta.lang`; los prompts piden respetarlo.
Codex responde en es/es-AR; falta validar otros proveedores.
IDs, enums y `reasonCode` son estables.

Para `es-AR`:

- respuestas y preguntas en castellano natural;
- nombres de ejercicio desde la capa localizada, nunca inventados;
- unidades segun el perfil;
- terminos tecnicos acompanados de una explicacion sencilla cuando haga falta.

## Estado implementado y validacion

Question/active comparten pipeline servidor/BYOK y una reparacion;
coach_contract:1. Question admite answer <=2.000 caracteres, rechaza mutaciones
y conserva pending. Active exige una operacion, motivo, summary, scope,
fingerprint y confirmacion; evidencia del snapshot. Aclaracion sin operacion
es solo lectura.

Create/refine sin candidatos usa question/schema: rechaza mutaciones, conserva
pending y admite una reparacion. El chat muestra la explicacion una sola vez,
incluso con otra propuesta pendiente.

Snapshot: 40 items, 30 filas por item, profundidad 3 y 40.000 caracteres; unidad,
item enfocado, target, registro anidado y senales permitidas. Viaja efimeramente:
no se guarda como sesion del servidor. Cambios de registro/unidad/equipo o
prerrequisitos invalidan la propuesta. No se traslada carga al cambiar ejercicio.

Solo se elimina un item sin registro ni grupo; parcial se conserva y continua
con otra entrada, o se omite lo pendiente. Completados son inmutables. Dosis
pending-volume-reduction/v1 solo reduce series rectas totalmente pendientes.
Sin clasificacion articular compatible, una senal permite omision/baja; para
rutinas guardadas solo bajas, sin mezclarlas con otra mutacion. Undo local exige
que no haya registro nuevo ni otro cambio material; navegar no lo invalida.
El retry del acuse usa proposalId y no aplica nuevamente el cambio.

4/10: Codex 0.160/gpt-6.1-sol, 14/14 es/es-AR; Chrome 153, 36 casos.
UI/API/modelo real, offline/sync/undo OK; OCI 3dbc82f/coach, propietario, 30/dia.
Otros proveedores/dispositivos pendientes.
Detalle en [el handoff](../tasks/active/coach-adaptativo-validacion.md).

Pendientes: registro por proveedor/modelo/idioma, frecuencia 7/14/28,
proxima sesion, tiempo/DOMS y grafos curados. MCP remoto de escritura deshabilitado.

