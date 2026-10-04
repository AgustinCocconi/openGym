# Escenarios golden

Los JSON de `scenarios/` preservan comportamiento sin acoplarse al framework ni
al almacenamiento. Al crear el fork deben transformarse en tests parametrizados
de las funciones puras y del validador del Coach.

## Forma

```json
{
  "scenarioVersion": "adaptive-training-scenario/v1",
  "id": "identificador-estable",
  "purpose": "por que existe",
  "given": {},
  "when": {},
  "expect": {
    "kind": "proposal",
    "operationTypes": [],
    "invariants": [],
    "forbidden": []
  },
  "legacyEvidence": []
}
```

Los escenarios no fijan el texto completo de una respuesta. Fijan operaciones,
IDs, codigos, idioma e invariantes. Las frases pueden mejorar sin romper tests.

## Invariantes comunes

```text
answer_is_read_only
articular_signal_blocks_incompatible
doms_is_not_articular_signal
candidate_id_exists
candidate_not_already_in_workout
same_pattern_preferred
completed_sets_immutable
partial_sets_preserved
load_not_carried_between_exercises
explicit_confirmation_required
stale_fingerprint_rejected
no_safe_candidate_is_honest
response_locale_is_spanish
provider_contract_is_equivalent
evidence_comes_from_context
```

## Ejecucion en tres niveles

1. **Dominio:** contexto -> candidatos, bloqueos y prioridades.
2. **Contrato:** respuesta simulada del modelo -> validacion o rechazo.
3. **Flujo:** propuesta valida -> diff -> confirmacion -> estado final.

Los tests de dominio no llaman modelos. El gate de modelo reutiliza los mismos
escenarios con fixtures pequenas y evalua estructura/invariantes, no estilo
literario.

## Escenarios conectados al recorrido actual

| Escenario canonico | Test ejecutable |
| --- | --- |
| coach-candidate-allowlist | core/candidates.test.js; paridad spawn/HTTP |
| calisthenics-live-management | core/active-workout.test.js; alta/baja/parcial |
| novice-pullup-foundation | core/skills.test.js; tres reps no aprueban cuatro |
| reported-pain-plan-removal | core/candidates.test.js; baja sin alternativa |
| codex-cached-login | ../test/codex-login.test.js; conexion explicita, binding y cache ausente |

Rutas de tests relativas a api/coach. Question, senales, dosis y confirmacion
se cubren en tests puros; API y DOM prueban adapters y flujo. Los restantes
escenarios son contrato objetivo, sin afirmar que todo el ranking esta portado.
No se ejecutaron estos casos contra modelos reales.

## Regla para agregar conocimiento

Ante un bug o una regla descubierta:

1. Reducirlo al escenario mas pequeno que falle.
2. Agregar el JSON o ampliar uno existente.
3. Implementar la correccion.
4. Actualizar `DOMAIN_RULES.md` solo si cambia una regla general.
5. Actualizar `PORTING_MAP.md` si cambia la procedencia o el estado de porte.


