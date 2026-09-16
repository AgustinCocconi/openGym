# Reglas de dominio portables

Este documento conserva el comportamiento que vale la pena portar. Los numeros
corresponden a `planning-context/v1`; son heuristicas de producto versionadas,
no recomendaciones clinicas universales.

## Frontera deterministica

Estas decisiones pertenecen a codigo y tests, no al modelo:

- que ejercicios existen y cuales son candidatos;
- compatibilidad de equipo y filtros explicitos;
- bloqueos por sintomas articulares seleccionados;
- calculo de frecuencia, recencia y desempates;
- prerrequisitos de habilidades;
- preservacion de series ya registradas;
- validacion de IDs, alcance, fingerprint y operaciones;
- aplicacion atomica o reconciliable de una propuesta.

La IA puede interpretar el pedido, pedir aclaraciones, elegir entre candidatos
validos y explicar. No puede ampliar por texto libre la lista de acciones
permitidas ni desactivar una guarda.

## Exposicion y frecuencia

| Regla | Comportamiento `v1` |
| --- | --- |
| Fuente | Ejercicio de sesion completado y mapeado a un ejercicio de catalogo |
| Sesion raiz | Cuenta si esta `in_progress`, `completed` o `abandoned` |
| Items excluidos | `planned`, `in_progress` y `skipped` |
| Ad hoc | No aporta exposicion hasta mapearse |
| Ejercicio inactivo | Su historia mapeada continua contando |
| Agregacion | Suma contribuciones por patron y fecha local, con tope diario `1` |
| Zona horaria | La IANA configurada en el perfil |
| Ventanas | `7`, `14` y `28` fechas locales, inicio inclusivo y `asOf` exclusivo |
| Objetivo por defecto | `2` unidades semanales por patron activo |
| Override | `0..7` unidades semanales por patron; `0` anula su deficit |

El objetivo de 7 dias se escala linealmente para 14 y 28. Para cada ventana:

```text
deficit = clamp((objetivo - exposicion) / objetivo, 0, 1)
```

El score de prioridad del patron es:

```text
deficit7 * 0.60 + deficit14 * 0.30 + deficit28 * 0.10
```

Un patron se considera postergado cuando el deficit de 7 dias supera
`0.000001`.

## Recencia y variedad de ejercicios

| Antiguedad desde la ultima ejecucion | Ajuste |
| --- | ---: |
| Menos de 3 fechas locales | `-0.30` |
| Desde 3 y menos de 7 | `-0.15` |
| Desde 7 y menos de 14 | `-0.05` |
| Desde 14 y menos de 28 | `0` |
| 28 o mas | `+0.05` |
| Nunca ejecutado | `+0.10` |

El score del candidato es la mayor prioridad de un patron compatible mas ese
ajuste. Penalizacion y bonus no se superponen.

Los valores favorecen variedad y cobertura; no afirman que un ejercicio sea
seguro solo porque haya pasado cierta cantidad de dias.

## Filtros de candidatos

### Tiempo

- `0` minutos produce cero candidatos.
- Un valor positivo no inventa una duracion minima que el catalogo no conoce.
- Adaptar cantidad de ejercicios, series o descansos a una duracion requiere
  una politica posterior y escenarios propios.

### Equipamiento

- Un override momentaneo reemplaza al equipamiento de perfil para esa consulta.
- Todos los codigos requeridos por un ejercicio deben estar disponibles.
- Un ejercicio sin requisitos es compatible.
- La comparacion actual de codigos es exacta y sensible a mayusculas.
- Un requisito ilegible se excluye conservadoramente.

### Preferencias

Dimensiones actuales:

- IDs de ejercicio;
- IDs de patron de movimiento;
- dificultad.

Se aplica OR dentro de cada dimension y AND entre dimensiones. Una dimension
vacia no filtra. Un override `null` desactiva la preferencia predeterminada del
perfil; uno explicito la reemplaza.

### Orden estable

Los desempates nunca dependen del orden accidental de almacenamiento. Patrones
y ejercicios usan prioridad, score, recencia, relacion primaria, contribucion,
slug e ID en un orden versionado. Al portar, los tests deben comprobar
determinismo sin exigir un texto humano exacto.

## Sintomas, DOMS y seguridad

Los tipos articulares son:

```text
pain | pinching | locking | instability
```

Una senal seleccionada con severidad persistible activa un bloqueo. No se
diagnostica ni se gradua el riesgo segun intensidad.

- Coincidencia exacta entre region reportada y consideracion del ejercicio.
- `full_body` coincide con cualquier region en ambos sentidos.
- No se infiere anatomia desde nombre, instrucciones o patron.
- Un candidato sin clasificacion valida se bloquea conservadoramente mientras
  exista un sintoma articular seleccionado.
- La lateralidad reportada se conserva, pero no se infiere para ejercicios.
- El historial de sintomas es contexto; no prolonga un bloqueo por si solo.
- DOMS permanece separado y nunca se transforma en sintoma articular.

La politica heredada no define todavia cuanto bajar volumen por DOMS. Eso debe
incorporarse como una politica nueva y versionada, no como una interpretacion
libre del modelo.

## Habilidades y prerrequisitos

Versiones heredadas:

```text
skill-progression/v1
skill-unlock-policy/v1
skill-test/v1
skill-attempt-evidence/v1
```

Una habilidad esta activa cuando:

- la habilidad esta vigente;
- todos sus prerrequisitos estan dominados;
- su propia prueba aun no fue aprobada.

Un `passed` desbloquea solo con evidencia estructurada completa o confirmacion
explicita del atleta. Una afirmacion del asistente no desbloquea. Un foco de
habilidad tampoco evita filtros de equipo, preferencias o bloqueos articulares.

## Invariantes al cambiar una sesion activa

1. Una alternativa debe existir en el catalogo vigente.
2. El ejercicio reemplazado no puede ofrecerse como su propia alternativa.
3. No se duplica un ejercicio ya presente salvo pedido explicito y validado.
4. El motivo se conserva como dato estructurado; la nota visible se genera
   desde ese dato y no vuelve a interpretarse como una regla.
5. Si el ejercicio no empezo, puede reemplazarse y quedar salteado.
6. Si ya hay series hechas, se guardan como ocurrieron y el nuevo ejercicio se
   agrega despues; no se borran para simular un reemplazo limpio.
7. Un ejercicio ya completado no se convierte en pendiente ni en salteado.
8. Se pueden trasladar series/repeticiones planificadas, pero no carga ni
   esfuerzo desde otro ejercicio de manera automatica.
9. Si una escritura parcial se confirma y la siguiente falla, el retry envia
   solo lo pendiente con la misma intencion idempotente.
10. Una respuesta tardia de una consulta vieja no reemplaza a la consulta
    vigente.
11. Si no existe alternativa segura, la aplicacion lo dice y permite saltear o
    terminar; no inventa una opcion.
12. Toda propuesta lleva fingerprint del estado base y se rechaza si quedo
    obsoleta.

## Explicaciones

Los codigos son estables y el texto es localizable. Codigos heredados:

```text
priority.frequency_deficit
priority.postponed_7d
candidate.pattern_priority
candidate.score
candidate.repetition_penalty
candidate.variety_bonus
blocker.selected_joint_symptom
blocker.full_body_signal
blocker.region_match
blocker.full_body_exercise
blocker.unclassified_exercise
blocker.invalid_exercise_classification
```

El fork puede agregar codigos, pero no debe convertir mensajes en claves de
negocio. Las explicaciones se construyen con campos estructurados y se muestran
sin puntajes tecnicos salvo que el usuario los pida.


