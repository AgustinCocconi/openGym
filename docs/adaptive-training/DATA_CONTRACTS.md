# Contratos de datos objetivo

Estos contratos son independientes del proveedor. Son una guia para schemas y
tests del fork, no representan endpoints ya existentes en openGym.

## Pedido al entrenador

```json
{
  "protocolVersion": "adaptive-trainer/v1",
  "requestId": "req-uuid",
  "locale": "es-AR",
  "scope": "active_workout",
  "intentHint": null,
  "message": "La barra esta ocupada, cambia este ejercicio",
  "baseFingerprint": "sha256:..."
}
```

Valores de `scope`:

```text
conversation | plan | today | active_workout | completed_workout
```

`intentHint` es una ayuda de UI, nunca autoridad. El backend o cliente valida el
alcance real contra el estado.

## Contexto adaptativo

```json
{
  "contextVersion": "adaptive-context/v1",
  "asOf": "2026-09-16T18:00:00.000Z",
  "locale": "es-AR",
  "units": "kg",
  "goals": [],
  "moment": {
    "availableMinutes": 35,
    "availableEquipment": ["dumbbell", "bench"],
    "signals": [],
    "doms": []
  },
  "recentWork": {
    "windowsLocalDays": [7, 14, 28],
    "patternExposures": [],
    "relevantLastExecutions": []
  },
  "activeWorkout": null,
  "candidates": [],
  "blockers": [],
  "allowedOperations": ["replace_pending_exercise"]
}
```

Las listas se acotan antes de llamar al modelo. Los objetos de candidato llevan
ID canonico, etiqueta localizada, hechos estructurados y codigos de razon.

## Respuesta del entrenador

```json
{
  "protocolVersion": "adaptive-trainer/v1",
  "kind": "proposal",
  "message": "Podemos reemplazarlo por press con mancuernas.",
  "clarification": null,
  "proposal": {
    "proposalId": "proposal-uuid",
    "scope": "active_workout",
    "baseFingerprint": "sha256:...",
    "operations": [],
    "warnings": [],
    "requiresConfirmation": true
  },
  "evidence": []
}
```

Valores de `kind`:

```text
answer | proposal | clarification | safety_redirect | unavailable
```

Solo `proposal` puede contener operaciones. Todos los demas tipos deben tener
`proposal: null`.

## Operacion de sesion activa

```json
{
  "type": "replace_pending_exercise",
  "targetSessionExerciseId": "session-item-uuid",
  "replacementExerciseId": "catalog-exercise-uuid",
  "reasonCode": "change.equipment_unavailable",
  "reason": "La alternativa usa el equipo disponible y conserva el patron.",
  "evidence": [
    { "code": "candidate.same_pattern", "value": "horizontal_push" },
    { "code": "candidate.required_equipment", "value": ["dumbbell", "bench"] }
  ],
  "carriedPrescription": {
    "sets": 3,
    "repetitionsMin": 8,
    "repetitionsMax": 10,
    "load": null,
    "effort": null
  }
}
```

El aplicador no confia en `carriedPrescription`: lo recalcula y valida. Carga y
esfuerzo quedan `null` al cambiar de ejercicio salvo una regla especifica y
probada.

## Motivos estables

Lista inicial:

```text
change.joint_symptom
change.equipment_unavailable
change.time_limited
change.want_variety
change.too_difficult
change.too_easy
change.preference
change.other
```

Los codigos no se traducen. La UI localiza etiquetas y explicaciones. El texto
libre opcional se conserva separado y nunca se reinterpreta como regla.

## Evidencia

```json
{
  "code": "history.pattern_exposure_7d",
  "value": 1,
  "unit": "exposure",
  "sourceId": "movement-pattern-id"
}
```

Cada afirmacion sobre historial o seleccion debe poder vincularse con un campo
del contexto. La evidencia no incluye razonamientos internos del modelo.

## Estado activo minimo

Cada item relevante debe distinguir:

```text
pending | in_progress | partial | completed | skipped
```

Y separar:

- prescripcion original;
- series registradas;
- ejercicio canonico y snapshot visible;
- posicion o grupo;
- linaje de reemplazo/continuacion;
- notas humanas;
- revision usada para el fingerprint.

## Versionado y obsolescencia

- Un cambio semantico de contratos incrementa `protocolVersion`.
- Un cambio de heuristicas incrementa `policyVersion`.
- El `baseFingerprint` cubre solamente el estado que la propuesta puede tocar.
- Si el fingerprint no coincide, no se aplica parcialmente: se recalcula o se
  pide confirmacion sobre una propuesta nueva.
- La respuesta del modelo nunca aporta una revision autoritativa.

## Contrato de proveedor

```json
{
  "providerId": "openai-compatible",
  "modelId": "configured-by-user",
  "supportsJsonSchema": true,
  "supportsCancellation": true,
  "spawnsProcess": false,
  "validatedFor": ["adaptive-trainer/v1"],
  "validatedAt": "2026-09-16T18:00:00.000Z"
}
```

`validatedFor` solo se llena despues de ejecutar escenarios. No se infiere por
el nombre comercial del modelo.


