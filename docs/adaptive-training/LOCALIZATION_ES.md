# Estrategia de castellano

## Objetivo

La experiencia personal debe poder usarse de principio a fin en castellano:
interfaz, nombres de ejercicios, instrucciones, explicaciones del entrenador,
motivos de cambio, errores y confirmaciones.

openGym ya aporta localizacion `es` para la UI e instrucciones de ejercicios.
El fork debe extender ese mecanismo, no crear un sistema paralelo.

## Identidad y presentacion

- Los IDs de ejercicios, slugs, enum, codigos de razon y campos persistidos son
  neutrales y estables.
- El nombre castellano es una etiqueta, no la identidad del ejercicio.
- El historial conserva snapshots visibles para no cambiar retroactivamente si
  se corrige una traduccion.
- La busqueda indexa nombre canonico, nombre castellano y aliases conocidos.
- Importadores pueden reconocer aliases sin renombrar el dato de origen.

Esto permite incorporar actualizaciones del catalogo sin producir conflictos
por haber reemplazado masivamente nombres canonicos.

## Locales

- `es` sigue siendo el locale general compatible con upstream.
- `es-AR` puede ajustar el tono del entrenador y algunas expresiones personales
  sin duplicar todo el catalogo de UI.
- Cuando no exista variante regional, `es-AR` cae a `es` y luego a la politica
  de fallback de upstream.
- El usuario puede cambiar el idioma; los datos estructurados no cambian.

Para este uso personal se acepta voseo natural en el entrenador. Las etiquetas
de UI deben priorizar claridad y consistencia por encima de regionalismos.

## Nombres de ejercicios

Implementar una capa por ID:

```text
exerciseId -> displayName.es -> aliases.es[] -> canonicalName
```

Reglas:

1. No traducir por string replacement ni por prompt en tiempo de ejecucion.
2. Revisar manualmente nombres ambiguos y variantes biomecanicas.
3. Mantener un alias del nombre ingles para busqueda e importacion.
4. Mostrar el ingles como dato secundario solo cuando ayude a desambiguar o
   falte una traduccion, no como nombre principal normal.
5. Los ejercicios creados por el usuario se muestran como fueron nombrados.

El catalogo castellano curado de la aplicacion anterior puede servir de overlay
para coincidencias verificadas. No debe usarse para reemplazar ni recortar los
IDs de los 1.324 ejercicios de upstream.

## Instrucciones y explicaciones

- Reutilizar la infraestructura de instrucciones localizadas de openGym.
- Diferenciar instrucciones documentadas de consejos generados.
- El entrenador puede resumir una instruccion, pero debe usar solo datos del
  ejercicio involucrado y marcar incertidumbre si falta contenido.
- Los codigos de razon se traducen mediante el catalogo de locale.
- No guardar un mensaje generado como unica representacion de un motivo.

## IA

El payload incluye:

```json
{
  "locale": "es-AR",
  "exerciseLabels": {
    "exercise-id": "Press de pecho con mancuernas"
  }
}
```

El modelo devuelve IDs y texto humano. El validador resuelve nuevamente cada ID
y la UI usa sus propias etiquetas localizadas; nunca toma como identidad el
nombre escrito por el modelo.

El gate comprueba:

- respuesta enteramente en castellano salvo nombres propios inevitables;
- uso correcto de unidades;
- ausencia de IDs o claves internas en el texto visible;
- preguntas breves y comprensibles;
- no invencion de traducciones para ejercicios fuera del contexto.

## Cobertura

Medir por separado:

- claves de UI criticas traducidas;
- nombres de ejercicios con traduccion revisada;
- instrucciones disponibles en castellano;
- aliases de busqueda;
- escenarios del entrenador aprobados en `es` y `es-AR`.

Un fallback debe ser visible en reportes de cobertura aunque la aplicacion no se
rompa. La meta para los recorridos criticos es cero texto ingles visible.

## Cobertura implementada

es-AR es seleccionable y reutiliza es para UI, nombres e instrucciones; fechas
usan su locale regional. El overlay propio revisa 18 IDs de calistenia y mantiene
los aliases ingleses. No se importa ni duplica el catalogo anterior. El generador
Coach incluye instrucciones castellanas/inglesas solo de esos IDs; contexto de
pregunta selecciona hasta ocho ejercicios y marca la fuente documental.

Equipamiento del intake/resumen y nombres revisados de propuestas usan la capa
localizada sin cambiar IDs. Errores de jobs/BYOK pasan por t; errores historicos
con texto fuente se traducen al mostrarlos.

Los tests comprueban traducciones de los controles nuevos y paridad de claves
(14 locales, 1.375 claves). Otros idiomas tienen fallback ingles explicito para
estos controles. Fuera de la seleccion curada hay nombres/instrucciones sin
traduccion; el informe general de strings conserva faltantes previos. El catalogo completo y otros modelos siguen pendientes. Chrome cubre controles,
equipamiento y errores en es/es-AR, claro/oscuro y 360/390/1280 px (12 casos).
Fixtures HTTP; no acredita telefono fisico ni castellano integral.

Correccion 5/10, Windows/Node 24: frontend 1.566 y API 237 pasan (una prueba
de symlinks omitida); build/locales/contexto/assets/carga OK. Capturas y harness
locales ignorados en .production-state/coach-inputs.

## Procedencia y licencias

- Conservar fuente, licencia y estado de revision de cada texto importado.
- No copiar medios de la aplicacion anterior como parte de la traduccion.
- No asumir que la licencia de metadatos cubre imagenes o animaciones.
- Antes de publicar un overlay de nombres o instrucciones, auditar su
  procedencia por separado del codigo AGPL del fork.


