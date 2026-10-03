# Auditoria por subsistemas

## Corte y metodo

Corte original: 2026-10-02, personal sobre 125eadd. Cierre de correcciones:
2026-10-03, Windows/Node 24.15.0. Continua
[CONTEXT_AUDIT.md](CONTEXT_AUDIT.md); lectura por simbolo/rango y regresiones.
P1: privacidad o alteracion silenciosa; P2: fallo funcional/garantia insuficiente;
P3: mejora medible. H01-H10 corregidos; limites de verificacion al final.

## Arquitectura y alcance

React/Zustand, helpers puros y Node se conservan. Sync tiene colas por perfil y
normaliza unidades; Coach valida obsolescencia y resultado del subconjunto;
MCP comparte el builder y resuelve personalizados desde el perfil. Los secretos
mobile quedan fuera del estado y de archivos de metadatos nuevos.
Se revisaron entrenamiento, store/UI, Coach/API, MCP/mobile y gates. No hubo
merge/fetch de upstream ni operaciones de produccion. Referencias locales y
divergencias en [PORTING_MAP.md](../adaptive-training/PORTING_MAP.md).

## H01 - P1: retry del perfil anterior sobre la nueva sesion

Corregido. GET/409 tardios de A mezclaban o reenviaban datos tras cambiar a B,
incluso con user=null. `store/sync-session.js` y `useStore.js` verifican
uid/propietario/generacion, abortan solicitudes y guardan continuaciones tras
esperas. Incluye revision, adopcion, boot/cierre y ediciones pendientes del
mismo perfil. Regresiones adyacentes de coordinador y store.
[Escenario](../adaptive-training/scenarios/profile-sync-isolation.json).

## H02 - P1: conversion incompleta y revert en otra unidad

Corregido en `lib/units.js`: masa de sesiones activas/terminadas, volumen,
`target`, guia `plan`, campo compatible `planned` y snapshots de rutinas.
La masa usa decimas; las cargas conservan redondeo de discos. Revert restaura
60 kg como 132.5 lb, aunque la rutina vigente ya haya cambiado a 70 kg.
La adopcion convierte la sesion local y el merge normaliza la copia anterior
antes de unir registros. Se preservan campos ausentes de sesiones legadas.
`units.test.js`, `sync-merge.test.js` y tests del store cubren ambas direcciones,
reversion y adopcion entre dispositivos.
[Escenario](../adaptive-training/scenarios/unit-conversion-sync.json).

## H03 - P1: fingerprint distinto permite eliminar ejercicio editado

Corregido en `lib/coach.js`: `markStale` deshabilita toda propuesta cuyo
fingerprint difiere; ambos helpers de aplicacion lo recalculan contra el draft
antes de snapshot o mutacion. `CoachChat` muestra el motivo y bloquea tambien
el import de un plan creado. Los defaults del fingerprint se resuelven por perfil.
`coach-guards.test.js` y `CoachChat.test.jsx` cubren edicion manual/remota,
operaciones estructurales y cambios de semana antes del import.
[Escenario](../adaptive-training/scenarios/coach-mutation-guards.json).

## H04 - P2: primera ocurrencia oculta trabajo combinado

Corregido con `lib/exercise-occurrences.js` y lectores compartidos. Se leen todas
las ocurrencias; `noProg` excluye individualmente la prescripcion, sin ocultar
trabajo de otra rutina. La progresion y apertura se acotan por `rid`; datos
legados sin procedencia siguen legibles. Cada workout aporta un punto por modo,
sin multiplicar stalls. Sin alcance, la mayor carga es la referencia y todas
las ocurrencias deben cumplir el objetivo; 1RM elige el mejor set de todas.
`repeated-exercises.test.js` cubre orden, exclusion, distintas cargas, modos y
legado; las suites existentes de historial/progresion siguen pasando.
[Escenario](../adaptive-training/scenarios/combined-exercise-context.json).

## H05 - P2: limites validos por separado crean rango invalido

Corregido con `api/coach/core/review-result.js`, usado por el validador comun y
la aplicacion del subconjunto en el cliente. Simula cambios antes de mutar y
rechaza rangos invertidos, duplicados y dependencias sobre targets eliminados.
El par 12-15 puede mover el rango original 5-10, pero seleccionar solo el piso
12 se rechaza; 9-7 tampoco se aplica. Un alta de rutina conserva ambos limites.
Tests junto al helper, `api/test/validate.test.js` y `coach-guards.test.js`
cubren pares, orden, subconjuntos y cambios dependientes. El gate sirve igual
al pipeline del servidor y al de mobile, sin validacion especifica del proveedor.
[Escenario](../adaptive-training/scenarios/coach-mutation-guards.json).

## H06 - P2: conversion en Settings no agenda sync

Corregido: Settings usa `update` para convertir, conservando revision y debounce;
imports/reset mantienen su contrato de overwrite. El test de store verifica
PUT con baseRev, resume y adopcion en un segundo dispositivo, incluida su sesion
activa. El conflicto entre kg/lb se normaliza en `sync-merge` antes de unir cargas.
[Escenario](../adaptive-training/scenarios/unit-conversion-sync.json).

## H07 - P2: secretos mobile fuera del contrato de persistencia

Corregido con `lib/device-secrets.js`, reutilizando el plugin instalado. Bearer
y clave Coach usan secure storage nativo, sin sincronizacion iCloud y con acceso
Keychain del dispositivo para nuevas escrituras. Los metadatos no contienen
bearer; se migra el archivo anterior despues de persistirlo en el store seguro.
Una falla del store impide activar una nueva conexion. En web se usa memoria,
se elimina la antigua clave localStorage y el reload la olvida.

Android excluye `opengym-remote.json` y
`WSSecureStorageSharedPreferences.xml` de backup legado, cloud y transferencia.
[Contrato Android](https://developer.android.com/identity/data/autobackup#Files).
Tests nativos simulados, web con plugin real y contrato XML verifican migracion,
desconexion, fallo y restore sin secreto. AAPT2 35 compilo ambos XML.
Falta ensayar backup/restore en dispositivos: no se acredita restauracion real
ni cambios retroactivos sobre backups creados por versiones anteriores.
[Escenario](../adaptive-training/scenarios/device-secret-isolation.json).

## H08 - P2: preview MCP diverge para personalizados

Corregido con `exerciseFor` y `resolveExerciseConfig`: custom y catalogo se
resuelven desde el perfil sin registrar otro usuario en EXIDX. Builder, defaults,
progresion y preview usan el mismo contexto. MCP conserva la diferencia entre
plan original y prescripcion al explicar overrides.
El test MCP compara UI/preview con cardio y bodyweight legados, y otro perfil
que define la misma ID de otra manera. No modifica el indice global para leer.
[Escenario](../adaptive-training/scenarios/combined-exercise-context.json).

## H09 - P2: eliminar rutina deja ID en semana combinada

Corregido reutilizando `deleteRoutine` de upstream 585f372 en Coach y editor.
Se elimina solo la ID correspondiente, se conserva el orden y se borra el dia
vacio; dias legados sin cambios conservan su forma. Se limpian reschedules y
Coach registra lo necesario para revert. Regresion de semana combinada y
reversion en `coach-guards.test.js`; tests anteriores siguen pasando.
[Escenario](../adaptive-training/scenarios/coach-mutation-guards.json).

## H10 - P2: gate API omite tests y presupone POSIX

Corregido: `api/package.json` incluye tests en raiz, `test/` y nuevos tests
adyacentes del core; el chequeo de carga importa solo modulos de runtime.
Fixture usa `fileURLToPath` y la prueba de credenciales mantiene 0600 en POSIX,
sin afirmar permisos POSIX en Windows. Los seis tests omitidos ya entran al gate.
Tambien se corrigio el fixture UTC del cap Coach para usar el dia local del
producto. La pasada final de API no omitio tests. Falta CI Linux/Node 22 para
acreditar el entorno productivo; no se relajan permisos de archivos del servidor.

## Objetivos pendientes y deuda conocida

Castellano: falta fallback es-AR -> es y recorridos completos P5. Coach exName
usa nombre canonico; el checker de paridad no demuestra cobertura de strings
fuente. PORTING_MAP mantiene recencia parcial: faltan historial/candidatos/UI y
gate real de modelos. No son capacidades completadas por estas correcciones.

Operacion: persiste la deuda de smoke/deploy: salud interna y sonda protegida
frente a WAF/Access, segun las
[precondiciones](../adaptive-training/PRODUCTION_RUNBOOK.md#precondiciones-del-bootstrap).
Ensayar antes del primer deploy; el checkpoint OCI conserva el estado operativo.

P3: build pasa, con avisos de chunks grandes e imports dinamicos ineficaces
useUI/scan-web. Medicion final: index 702,59 kB (213,07 gzip), compartido history
904,50 kB (126,70 gzip). Falta medir carga mobile; no se aumentaron limites.

## Verificaciones y limites

Pasada final de esta continuacion: Windows, Node 24.15.0.

- Frontend: 113 archivos, 1.539 tests; MCP: 59 tests; API: 190 tests, sin omisiones.
- Build frontend y React DOM de las tarjetas Coach pasan; sin navegador real/E2E.
- Assets Coach en sync; grafos core API y MCP cargan en Node.
- 14 locales/1.291 claves en paridad; no acredita castellano integral.
- Seis tests de contexto, check:context y diff --check pasan. Presupuestos de
  history/CoachChat reducidos; no se ampliaron limites ni exclusiones de contexto.
- Dos recursos XML compilados con AAPT2 35; sin APK ni dispositivos conectados.

H01-H10 corregidos y escenarios persistidos. Pendientes de entorno: CI Linux/
Node 22, backup/restore nativo y modelos reales. No se accedio a secretos ni
repositorios legacy; no hubo push, publicacion ni operaciones remotas.
