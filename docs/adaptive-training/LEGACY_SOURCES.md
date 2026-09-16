# Fuentes anteriores fijadas

## Advertencia

Los dos worktrees tenian cambios sin confirmar al crear este paquete. Por eso
un commit no identifica por si solo el contenido resumido. Los SHA-256 de abajo
fijan las fuentes relevantes tal como estaban el `2026-09-16`.

Si el archivo actual no coincide con el hash, consultar su historia o el
snapshot que se cree antes de iniciar el fork. No ampliar automaticamente la
busqueda al resto del repositorio.

## Backend

- Repo: `C:\Github\training-app-be`
- Rama: `main`
- HEAD: `f4a4f410a4a53708867003976664c92005f43319`

| SHA-256 | Ruta |
| --- | --- |
| `bdd97b0b9a9812aab533b93a02c7087edf8c70104a5db34f2119c4ecdc93f317` | `PLAN.md` |
| `7f7f2312342d52013d76e5c17c5139a1a70a7fea4118d15581e44eb98546b986` | `INTERFACE_PLAN.md` |
| `4c328414509385696aebbf27e6077b47873a2959752cf433526640f73b9a8fdf` | `docs/planning-policy-v1.md` |
| `746c05a873ae0484b5f453695d6f2deaf954aca6da907498b417c56a1ed99d59` | `src/domain/planning-policy.ts` |
| `b63db53d087380c31e277ddbd7cff6c879f71432dcfac3762b04e73ef529f423` | `src/domain/models.ts` |
| `dc5ccbc549469c52e89a0a649fcf65de1eb8b44884d2614b1514f91db5e07cd9` | `src/application/planning-blockers.ts` |
| `b03fe3d7a52aa1bda45f5633531f833360daf615f81c80049ae6e723f1654e84` | `src/application/planning-candidates.ts` |
| `d341ec012cbe1f2198d653ca2789c58d824c083203e18f4980f1ebc7085cb45c` | `src/application/planning-frequency.ts` |
| `1c44c58d2e1a917e0a0fe10ea20005190085f0866aee3abcdfdbe153e26ca43d` | `src/application/planning-exposures.ts` |
| `a722d0bc8da31b5c82faa92ee93a086450c2d8a714f058e75051d7ed891030b4` | `src/application/planning-exercise-recency.ts` |
| `9c14cad4f5f33996fea19033ed3fb75b2d862b2a1ad20081d96272e91f78f723` | `src/application/planning-explanations.ts` |
| `29f285222d23f4dc87dd8452a1691f521e4e018d58f8aebb4955a1f87345055f` | `src/application/planning-time.ts` |
| `4b5edb67b88d945327babf10fa266207af51307ed17e7f5677470525b73994e4` | `src/application/planning-context-payload.ts` |
| `87631787488eebb8bbd1012d221de3aa835e1ec5999997244bf7919037519040` | `src/application/skill-progression.ts` |
| `15b0527977f4d6e25c69bffb8815cfb0fc3377b80610127fc669d50e108f18d4` | `src/mcp/domain-tools.ts` |
| `21b023bf6263f2d7f57e216757844801886cf943f85440f7e201c048e0b5b72c` | `test/fixtures/planning-scenarios.ts` |
| `ebe48370699b01a4dbe3da4f6cc1fe42a17724ce08f9a13813e87dfca90e9999` | `test/planning-scenarios.test.ts` |

## Frontend

- Repo: `C:\Github\training-app-fe`
- Rama: `main`
- HEAD: `ce825be3088234fcc70abb185d8ecbf1ef4635e1`

| SHA-256 | Ruta |
| --- | --- |
| `44e5e1d7face9f9fbbc114a5af547ffcea8a276ea6a150adfe6e69efeaccfb1b` | `src/app/features/preparation/planning-language.ts` |
| `a53bd3a5cb42df06b68e3230f7545abb978e9c5245b1fa394d294e6afa7ff977` | `src/app/features/sessions/exercise-change.ts` |
| `ef8ecba0fd696a59429c584b70ad96d7b1300e1d089e550fb582ec0366464380` | `src/app/features/sessions/exercise-change-state.ts` |
| `a81f831ff92ec77882dae912cf44f429e9d5efb4bb7974d13d639d80ba996758` | `src/app/features/sessions/exercise-change.spec.ts` |
| `9c58eb89a5d934cd818df3b1fcf6b5948748bf0c4a4678a436fc3b98fb2b3b82` | `src/app/features/sessions/exercise-change-state.spec.ts` |
| `e7ab78b9714dac827de88a7bd6a90178c88132ae81e4b5feaefdd1b907709ca1` | `src/app/features/sessions/session-adjust-state.ts` |
| `566a42c9b55f7a655e8c4ce7d014d6f239c197ed4eac0b2c371ae278c3ae38ad` | `src/app/features/sessions/session-adjust-state.spec.ts` |

## Consultas permitidas por defecto

- Politica o scoring: politica + un modulo de calculo + su test.
- Sintomas: blockers + escenario articular.
- Cambio de ejercicio: `exercise-change.ts`, su spec y las pruebas puntuales de
  `exercise-change-state.spec.ts`.
- UX: solo `INTERFACE_PLAN.md` desde la seccion "Cambiar un ejercicio y entender
  el motivo".
- MCP: `domain-tools.ts` y el test de presupuesto correspondiente.

Consultar mas archivos requiere primero registrar que contrato falta en este
paquete.


