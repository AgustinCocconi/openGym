# Contrato de producto

## Vision

Construir sobre openGym una herramienta personal de entrenamiento que permita
armar, ejecutar y modificar rutinas con poca friccion. Un entrenador IA debe
entender pedidos en lenguaje natural, usar el historial y los objetivos, actuar
con criterio parecido al de un personal trainer durante la rutina y explicar
sus propuestas en castellano.

La aplicacion no busca reemplazar a un profesional ni diagnosticar lesiones.
Ante senales articulares o situaciones inciertas debe ser conservadora, dejar
de proponer movimientos incompatibles y hacer visible el limite de su consejo.

## Resultado buscado

La persona puede:

1. Crear una rutina desde objetivos, disponibilidad, equipamiento, experiencia
   e historial reciente.
2. Preguntar por que se propone algo, como se ejecuta o que conviene hacer a
   continuacion.
3. Pedir durante el entrenamiento cambios como:
   - "la barra esta ocupada";
   - "me molesta el hombro";
   - "hoy tengo treinta minutos";
   - "esto me resulta demasiado facil";
   - "quiero variar sin dejar de trabajar lo mismo".
4. Recibir alternativas validas con una explicacion factual.
5. Confirmar, rechazar o refinar la propuesta y revertir los cambios aplicados.
6. Seguir usando las funciones manuales si la IA no esta configurada o falla.

## Division de responsabilidades

### openGym

- Interfaz, PWA y aplicaciones moviles.
- Rutinas, plan semanal, sesion activa e historial.
- Registro de series, progresiones, temporizadores y estadisticas.
- Catalogo de ejercicios, importacion, exportacion y sincronizacion.
- Autenticacion, almacenamiento y despliegue self-hosted.
- AI Coach existente, seleccion de proveedor, consentimiento, validacion y
  propuestas reversibles sobre planes.

### Extension personal

- Contexto adaptativo compacto basado en frecuencia, recencia, objetivos,
  disponibilidad, equipamiento y senales reportadas.
- Cambios guiados dentro de la sesion activa, no solo sobre rutinas futuras.
- Reglas conservadoras y deterministicas para candidatos y bloqueos.
- Conversacion util durante el entrenamiento: preguntas, explicaciones,
  alternativas y sugerencias de proxima sesion.
- Localizacion castellana de nombres, explicaciones y experiencia critica.

## Principios no negociables

1. **Upstream primero.** No duplicar una capacidad que openGym ya mantiene.
2. **Delta pequeno.** La personalizacion se concentra en modulos propios y
   puntos de integracion finos.
3. **Proveedor intercambiable.** El producto depende de un contrato de
   capacidades, no de OpenAI, Anthropic, Gemini u otro proveedor concreto.
4. **Reglas verificables.** La IA no puede saltarse bloqueos, inventar IDs ni
   borrar trabajo registrado.
5. **Control del atleta.** Las mutaciones requieren propuesta, explicacion y
   confirmacion; las de plan o rutina deben poder revertirse.
6. **Castellano real.** Interfaz, ejercicios, instrucciones y respuestas del
   entrenador deben ser comprensibles sin alternar innecesariamente con ingles.
7. **Contexto acotado.** No enviar todo el historial o catalogo cuando bastan
   agregados y candidatos relevantes.
8. **Funciona sin IA.** Registro, cambios manuales y reglas basicas permanecen
   disponibles sin un modelo.
9. **Historia durable.** Lo completado representa lo que ocurrio; una propuesta
   posterior no lo reescribe.
10. **No diagnostico.** El sistema organiza entrenamiento y aplica guardas; no
    interpreta clinicamente una lesion.

## Modos del entrenador

| Modo | Puede leer | Puede proponer | Puede aplicar sin confirmar |
| --- | --- | --- | --- |
| Consulta | Contexto relevante | Recomendacion textual | Nada |
| Planificacion | Objetivos, historial, plan | Rutinas y semana | Nada |
| Sesion de hoy | Plan y estado previo | Orden, dosis y alternativas | Nada |
| Sesion activa | Ejercicio actual, series y contexto | Cambiar, agregar, reducir o saltear | Nada |
| Revision | Sesion terminada e historia comparable | Aprendizajes para la proxima vez | Nada |

## Criterios de exito iniciales

- Sustituir un ejercicio durante una sesion en menos de cuatro decisiones,
  preservando cualquier serie ya hecha.
- Explicar cada alternativa con datos reales: movimiento, equipo, dificultad,
  recencia y restricciones aplicables.
- Proponer una proxima sesion usando lo trabajado en ventanas de 7, 14 y 28
  dias, no solo el nombre de la ultima rutina.
- Cambiar de proveedor o modelo sin modificar las reglas de negocio ni los
  contratos de aplicacion.
- Ejecutar en castellano los recorridos de crear plan, iniciar rutina,
  consultar, cambiar ejercicio y cerrar sesion.

## Fuera del primer alcance

- Reemplazar la persistencia de openGym por D1 o portar el backend anterior.
- Rehacer la UI en Angular.
- Diagnosticar dolor, rehabilitar lesiones o prescribir tratamiento.
- Permitir que el modelo escriba directamente en el log sin validacion.
- Traducir modificando IDs canonicos o duplicando el catalogo completo.
- Implementar MCP remoto antes de validar la experiencia dentro de la app.


