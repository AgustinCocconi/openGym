# Estrategia para mantener el fork actualizado

## Objetivo

Recibir correcciones y mejoras del repositorio oficial sin rehacer las
personalizaciones ni convertir cada actualizacion en una resolucion masiva de
conflictos.

La estrategia se apoya en tres decisiones:

1. Una rama refleja a upstream sin cambios propios.
2. La rama personal contiene una serie pequena y legible de capacidades.
3. Las integraciones con upstream son finas; la logica propia vive en modulos
   aislados y probados.

## Remotos y ramas

Configuracion recomendada:

```text
upstream/main      repositorio oficial, solo lectura
origin/main        espejo fast-forward de upstream/main
origin/personal    version desplegable con modificaciones propias
feature/*          trabajo corto que termina en personal
```

Inicializacion:

```bash
git remote add upstream https://github.com/DuarteSantos8/openGym.git
git fetch upstream --tags
git switch main
git merge --ff-only upstream/main
git push origin main
git switch -c personal
git push -u origin personal
```

`main` no recibe commits personales. `personal` puede ser la rama por defecto y
la usada para construir las imagenes propias.

## Ciclo de sincronizacion

Hacerlo con frecuencia, idealmente por cada release de upstream:

```bash
git fetch upstream --tags
git switch main
git merge --ff-only upstream/main
git push origin main
git switch personal
git merge main
```

Luego:

1. Revisar `CHANGELOG.md`, `ROADMAP.md` y cambios en AI Coach, workout model,
   localizacion y persistencia.
2. Ejecutar el gate de upstream sin cambios adicionales.
3. Resolver conflictos por capacidad, no aceptando un lado completo a ciegas.
4. Ejecutar escenarios y tests propios.
5. Probar manualmente el recorrido castellano y una sesion activa.
6. Registrar el commit integrado y las decisiones en la tabla de divergencias.

No reescribir con rebase una rama `personal` ya desplegada. Los merges de
upstream dejan visible que version se incorporo y facilitan aislar regresiones.

## Limites de personalizacion

Ubicaciones objetivo, a confirmar contra la estructura del commit que se
forkee:

```text
frontend/src/lib/adaptive-training/          reglas puras y tests
frontend/src/components/adaptive-training/   UI propia reutilizable
api/coach/adaptive/                          contexto y contratos de entrenador
docs/adaptive-training/                      este paquete
```

Los archivos centrales de upstream solo deben contener hooks pequenos:

- registrar una vista o panel;
- exponer una accion del store;
- pasar un snapshot acotado al modulo adaptativo;
- registrar un tipo de propuesta validado;
- conectar claves de traduccion.

Si una funcionalidad exige modificar muchos archivos centrales, primero buscar
un punto de extension o separar una refactorizacion generica proponible a
upstream.

## Reglas para reducir conflictos

- No reformatear archivos de upstream fuera de las lineas necesarias.
- No renombrar carpetas, componentes, campos ni IDs existentes por preferencia.
- Mantener commits pequenos: infraestructura del hook, dominio, UI y traduccion
  en commits separados cuando sea razonable.
- Agregar funciones puras con tests junto a ellas, siguiendo la arquitectura de
  openGym.
- No copiar el motor TypeScript tal cual: portar comportamiento y escenarios a
  JavaScript puro para respetar el stack actual de upstream.
- Adaptarse al estado de openGym en sus bordes; no crear un segundo estado
  global ni una segunda representacion completa de rutinas y sesiones.
- Conservar feature flags para capacidades incompletas o experimentales.
- No tocar persistencia antes de que sea imprescindible. El roadmap de upstream
  anuncia una migracion de archivos JSON a base de datos para `v1.4.0`; una
  implementacion paralela ahora aumentaria el conflicto.

## Gate de integracion

En cada sync deben pasar, como minimo:

1. Tests y build que upstream defina en ese commit.
2. Tests de reglas adaptativas.
3. Paridad del contrato entre todos los adaptadores de modelo habilitados.
4. Escenarios de sesion activa, propuesta obsoleta y preservacion de series.
5. Smoke en castellano de plan, entrenamiento y AI Coach.

Antes de cambiar codigo, registrar un baseline contra `main`. Esto separa una
regresion introducida por upstream de una introducida por el fork.

## Que conviene aportar a upstream

Una mejora generica reduce para siempre el delta si upstream la acepta. Buenos
candidatos:

- hooks o contratos para propuestas sobre una sesion activa;
- busqueda por aliases localizados de ejercicios;
- validadores puros y tipos de cambio genericos;
- tests de paridad entre frontend y Coach;
- mejoras de localizacion castellana no personales.

Las preferencias estrictamente personales, el tono `es-AR` y politicas de
seleccion propias permanecen en el fork.

## Registro de divergencias

Mantener esta tabla en el fork:

| Area | Upstream base | Cambio personal | Archivos centrales tocados | Riesgo de conflicto | Ultimo sync |
| --- | --- | --- | --- | --- | --- |
| Entrenador adaptativo | pendiente | pendiente | pendiente | pendiente | pendiente |
| Sesion activa | pendiente | pendiente | pendiente | pendiente | pendiente |
| Castellano y ejercicios | pendiente | pendiente | pendiente | pendiente | pendiente |
| Dependencias | a68a88d | undici >=7.29.1, lockfiles auditados y overrides de tooling | api/frontend manifests y tres lockfiles | medio | upstream 1350409 revisado 4/10/2026, sin merge |
| Codex personal | a68a88d | cache/binding/sin tools; CLI 0.160.0/coach por SHA | api/coach, AdminCoach.jsx, Dockerfile y ops/CI | medio | 4/10/2026 |

Auditoria 4/10/2026, Linux/Node 22.23.3/npm 10.9.9: cero hallazgos en API
omit=dev,optional, API con SDK, MCP omit=dev y frontend completo/omit=dev.
Se corrigen fast-uri, hono, ip-address, qs, xmldom, brace-expansion, nanoid y
postcss; Trapezedev 7.1.10 retira transitivas obsoletas. Overrides de tooling:
sharp 0.35.5, tar 7.5.22 y uuid 11.1.1; revisar cuando sus padres adopten fixes.
Capacitor runtime conserva major 7. Fuentes:
[undici](https://github.com/nodejs/undici/security/advisories/GHSA-w293-vg96-wgc3),
[fast-uri](https://github.com/fastify/fast-uri/security/advisories/GHSA-hrr3-gc8f-f4qj),
[tar](https://github.com/isaacs/node-tar/security/advisories/GHSA-r292-9mhp-454m),
[sharp](https://github.com/lovell/sharp/security/advisories/GHSA-rgj7-g3m4-5g8c),
[uuid](https://github.com/uuidjs/uuid/security/advisories/GHSA-w5hq-g745-h8pq).

3dbc82f: CI/publicacion/deploy OCI OK; frontend 1559, API 233, MCP 59,
build/locales/assets/carga/contexto, 22 tests ops/7 Python OK. Default/coach:
arranque/aislamiento OK; Compose 2.39.4 verificado, loopback/logging OK y guard
rechaza 2.20.2. Evidencia ignorada: .production-state/dependency-review;
checkpoint OCI.

## Supuestos de upstream a revalidar

Verificados el `2026-09-16`:

- React/Vite/Zustand en frontend y logica de entrenamiento pura bajo
  `frontend/src/lib/`.
- AI Coach con proveedores Anthropic, OpenAI, Gemini, endpoints compatibles,
  Claude Agent SDK y Codex CLI.
- Propuestas actuales del Coach limitadas a rutinas y semana, validadas y
  aplicadas por el cliente con snapshot y fingerprint.
- La sesion `active` pertenece al dispositivo y se elimina del estado guardado;
  el entrenador en vivo necesitara un snapshot efimero enviado por el cliente.
- Localizacion de UI en castellano e instrucciones localizadas, pero el objetivo
  personal agrega cobertura castellana de nombres de ejercicios.
- Roadmap con cambios importantes de persistencia y MCP.

Fuentes primarias:

- https://github.com/DuarteSantos8/openGym
- https://github.com/DuarteSantos8/openGym/blob/main/CLAUDE.md
- https://github.com/DuarteSantos8/openGym/blob/main/docs/AI_COACH.md
- https://github.com/DuarteSantos8/openGym/blob/main/api/openapi.yaml
- https://github.com/DuarteSantos8/openGym/blob/main/ROADMAP.md

Estos datos no son eternos. Al crear el fork se reemplaza esta fotografia por
el commit exacto elegido y se corrigen rutas o capacidades que hayan cambiado.

