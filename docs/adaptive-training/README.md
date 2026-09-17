# Paquete de conocimiento para el fork de openGym

Este directorio condensa las decisiones y comportamientos valiosos de
`training-app-be` y `training-app-fe` para incorporarlos a un fork mantenible de
[openGym](https://github.com/DuarteSantos8/openGym). No es una especificacion de
la aplicacion anterior ni una invitacion a portar ambos repositorios completos.

El objetivo es que una persona o agente pueda implementar una capacidad en el
fork leyendo entre dos y cuatro documentos pequenos, sin recorrer nuevamente
las dos codebases de origen.

## Estado de esta fotografia

- Fecha de corte: `2026-09-16`.
- Backend de referencia: `f4a4f410a4a53708867003976664c92005f43319`, mas
  cambios locales sin confirmar fijados por hash en `LEGACY_SOURCES.md`.
- Frontend de referencia: `ce825be3088234fcc70abb185d8ecbf1ef4635e1`, mas
  cambios locales sin confirmar fijados por hash en `LEGACY_SOURCES.md`.
- Upstream observado: openGym `main`, frontend `1.3.7`, consultado el
  `2026-09-16`.
- Este paquete define el objetivo del fork. Cuando contradiga detalles internos
  de la aplicacion anterior, prevalece este paquete; cuando contradiga una
  invariante vigente de upstream, se debe resolver y documentar la decision.

## Lectura por tarea

| Si la tarea es... | Leer primero | Leer despues solo si hace falta |
| --- | --- | --- |
| Entender el producto | `PRODUCT_CONTRACT.md` | `DOMAIN_RULES.md` |
| Sincronizar upstream | `UPSTREAM_STRATEGY.md` | `PORTING_MAP.md` |
| Cambiar seleccion o ranking | `DOMAIN_RULES.md` | escenario relacionado y `LEGACY_SOURCES.md` |
| Trabajar en el entrenador IA | `AI_TRAINER_PROTOCOL.md` | `DATA_CONTRACTS.md` y escenarios |
| Cambiar una rutina o sesion activa | `AI_TRAINER_PROTOCOL.md` | `DOMAIN_RULES.md` y escenarios `active-workout-*` |
| Traducir interfaz o ejercicios | `LOCALIZATION_ES.md` | `DATA_CONTRACTS.md` |
| Planificar o retomar el despliegue OCI | `OCI_DEPLOYMENT_PLAN.md` | `PRODUCTION_DEPLOYMENT.md` y `PRODUCTION_RUNBOOK.md` |
| Desplegar u operar produccion | `PRODUCTION_DEPLOYMENT.md` | `OCI_DEPLOYMENT_PLAN.md`, `PRODUCTION_RUNBOOK.md`, `UPSTREAM_STRATEGY.md` y la guia vigente de self-hosting de openGym |
| Portar una capacidad anterior | `PORTING_MAP.md` | una unica ruta de `LEGACY_SOURCES.md` |

`FORK_AGENTS.template.md` contiene el router corto que debe integrarse con las
instrucciones que ya tenga openGym cuando se cree el fork. No debe reemplazar a
ciegas `CLAUDE.md`, `CONTRIBUTING.md` ni otro archivo de upstream.

## Fuentes de verdad

En orden de autoridad:

1. Tests y contratos ejecutables del fork.
2. Este paquete y sus escenarios.
3. Codigo de dominio puro portado al fork.
4. Archivos concretos de la aplicacion anterior listados en
   `LEGACY_SOURCES.md`.
5. El resto de las codebases anteriores, solo como material historico.

Si se descubre una regla no condensada, primero se agrega o corrige un escenario
y luego se implementa. No se convierte el descubrimiento en una lectura general
de los repositorios viejos.

## Presupuesto de contexto

- Router permanente: menos de `1.000` tokens.
- Contrato o capsula tematica: entre `500` y `2.000` tokens.
- Escenarios relevantes para una tarea: entre uno y tres archivos.
- Codigo anterior: como maximo las rutas exactas indicadas por el mapa de porte.

No crear un unico `CONTEXT.md` acumulativo. Cuando un documento supere una sola
responsabilidad, dividirlo y actualizar esta tabla de ruteo.

## Principio de implementacion

openGym aporta la aplicacion, el registro, las rutinas, el historial, el
catalogo, el Coach y la sincronizacion. Nuestra extension aporta una capa de
entrenamiento adaptativo:

```text
pedido en castellano
        |
        v
interpretacion del entrenador IA
        |
        v
contexto compacto + reglas deterministicas
        |
        v
propuesta explicada y validada
        |
        v
confirmar / aplicar / revertir
```

La IA interpreta, conversa y explica. Las reglas de seguridad, los IDs validos,
la preservacion del trabajo registrado y la aplicacion de cambios permanecen en
codigo determinista.

## Proximo paso cuando exista el fork

1. Copiar este directorio a `docs/adaptive-training/`.
2. Integrar el contenido de `FORK_AGENTS.template.md` en las instrucciones del
   fork sin borrar las de upstream.
3. Registrar el commit exacto de upstream en `PORTING_MAP.md`.
4. Convertir primero los escenarios a tests JS junto a funciones puras.
5. Implementar una sola vertical: sustitucion explicada durante una sesion
   activa, conservando series ya realizadas.

