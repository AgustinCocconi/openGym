# Login movil y renovacion de Access

## Objetivo y alcance

Recuperar el login web desde el celular sin retirar Access/WAF ni perder datos locales.
Personal inicio limpio en 5a706f8; produccion conserva 3dbc82f.

## Criterios de aceptacion

- Login tras renovar Access funciona en el telefono del propietario.
- El gesto explicito de passkey renueva una redireccion del proxy por navegacion.
- Sesion propia 401, offline y registros activos conservan sus contratos.
- Tests/frontend/build/contexto y navegador real pertinentes; handoff/commit limpio.

## Contexto y zona afectada

frontend/src/lib/api.js, api.test.js; Login/Settings usan passkeyLogin.
[Operacion protegida](../../../ops/PROTECTED_OPERATIONS.md).
Upstream 1350409 revalidado 5/10 sin merge; no maneja Access en el login.

## Estado actual

Propietario: navegador web en celular, Wi-Fi, failed to fetch al pulsar passkey.
Propietario confirma: renovar Cloudflare desde /api/config restauro el login en el celular.
Chrome real, origen productivo/cookies ausentes: helper previo falla por redirect/CORS.
X-Requested-With entrega 401 HTML; candidato usa redirect manual en login solamente,
renueva mediante reload y aborta antes de abrir el autenticador.

## Verificacion

Evidencia ignorada: .production-state/mobile-login. Reproduccion real 5/10 00:17 AR;
shell simulado, API/Access reales. Candidato abre Access por navegacion antes de
la passkey en Chrome 153/390. Frontend 1563/116 archivos, build Windows Node 24 OK;
telefono confirma recuperacion manual, no el candidato aun sin publicar.

## Bloqueos y siguiente paso

Candidato verificado; recuperacion manual del telefono confirmada. Mantener SHA productivo
hasta gate y autorizacion aplicable; un nuevo SHA requiere aceptacion protegida.
