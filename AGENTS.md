# Instrucciones del fork

Las instrucciones originales de openGym siguen vigentes. Antes de modificar codigo,
leer CLAUDE.md, CONTRIBUTING.md y cualquier instruccion mas especifica que exista
en el arbol afectado. Este archivo agrega solamente el router de la extension
adaptativa y no reemplaza esas reglas de upstream.

## Alcance

Este fork agrega un entrenador adaptativo en castellano sin reconstruir las
capacidades generales de openGym. Debe seguir pudiendo recibir actualizaciones
del repositorio oficial con un delta pequeno y reconocible.

## Que leer

Leer siempre:

1. Las instrucciones originales de openGym (`CLAUDE.md`, `CONTRIBUTING.md` o
   sus reemplazos vigentes).
2. `docs/adaptive-training/README.md`.
3. Solo la capsula indicada por la tabla de ruteo de ese archivo.

No recorrer `training-app-be` o `training-app-fe`. Consultar una implementacion
anterior unicamente cuando `PORTING_MAP.md` remita a una ruta exacta. Si aparece
una regla nueva, capturarla en un escenario antes de seguir.

## Limites de arquitectura

- Seguir el estilo de upstream: logica de entrenamiento pura, sin framework y
  con test al lado; UI en React/Zustand; backend Node liviano.
- No trasplantar Hono, D1, Angular ni la infraestructura de autenticacion de la
  aplicacion anterior.
- Mantener la logica propia en modulos identificables y usar adaptadores finos
  para conectarla con el estado de openGym.
- No renombrar IDs ni campos canonicos de upstream para traducirlos.
- No modificar masivamente archivos de upstream, reordenar imports ni
  reformatear codigo no relacionado.
- Todo cambio al plan o a una sesion activa pasa por validacion deterministica,
  muestra un diff y requiere confirmacion explicita.
- Lo ya registrado es historia: no se elimina ni reescribe silenciosamente.
- Una indisponibilidad del modelo no debe impedir registrar ni ajustar una
  sesion manualmente.

## IA

- El proveedor y el modelo son intercambiables. Ninguna regla de negocio puede
  depender de una marca o de un nombre de modelo.
- El modelo recibe contexto compacto, IDs validos y candidatos acotados; no el
  estado completo ni todo el catalogo por defecto.
- La salida del modelo es una propuesta estructurada. El validador, no el
  prompt, determina que acciones son posibles.
- Preguntas informativas son de solo lectura. Una respuesta conversacional no
  puede mutar estado por accidente.
- Responder en el idioma del perfil; para este fork, los flujos criticos deben
  estar completos en castellano y el entrenador debe soportar `es-AR`.

## Upstream

- Antes de una funcionalidad, revisar si upstream ya la incorporo.
- Preferir extension sobre reemplazo y reutilizar contratos existentes del AI
  Coach, localizacion, workout model y estado.
- Una capacidad generica que pueda aceptarse upstream debe mantenerse aislada
  para poder proponerla como PR.
- Cada sincronizacion se hace segun `UPSTREAM_STRATEGY.md` y ejecuta primero los
  tests de upstream sin modificaciones, luego los tests propios.

## Definicion de terminado

Una capacidad adaptativa termina cuando:

1. Existe al menos un escenario de comportamiento.
2. La regla deterministica tiene test unitario junto al modulo puro.
3. Los proveedores soportados producen el mismo contrato validado.
4. La UI muestra propuesta, motivo, alcance y forma de revertir.
5. El flujo critico no deja texto ingles visible en locale castellano.
6. `PORTING_MAP.md` registra su estado y cualquier divergencia nueva.


