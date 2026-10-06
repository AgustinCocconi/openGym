# Calidad de planes del Coach

coach-movements/v1 y coach-plan-quality/v1 compartidos por servidor/BYOK.
Clasificacion por IDs; no deduce anatomia ni seguridad desde nombres.
Etiquetas es/es-AR por overlay y generador. Accesorios 0154/0447/1748:
aperturas inversas, curl EZ y extension de triceps.

## Candidatos

Adapta filtro de estiramientos y pesos por zona de upstream 043dd30;
conserva balance de equipo y referencias existentes.
Reserva hasta dos alternativas convencionales por patron antes de llenar
las cuotas, sin ampliar los topes 60/160. Equipo y habilidades siguen filtrando
el resultado. Un estiramiento ya presente puede conservarse para su proposito.

## Cobertura y alcance

Cuenta series de trabajo de rutinas efectivamente agendadas, multiplicando
una rutina que se repite. No atribuye equivalencia fisiologica a los grupos
ni suma musculos secundarios. Un puente de gluteos no demuestra cobertura
de bisagra de cadera o flexion de rodilla.

En strength/muscle/general/fatloss, la creacion general exige trabajo de rodilla,
bisagra o isquiotibiales, empuje y tiron cuando existan candidatos clasificados
compatibles. Ausencia comprobable: rechazo y unica reparacion existente.
Metadata desconocida o falta de alternativa: incertidumbre visible.

coachProfile.planScope acepta general/focused. El intake permite elegir cuerpo
completo o enfoque especifico; perfiles nuevos inician en general, existentes
sin dato no se reinterpretan. General mantiene cobertura con likes/dislikes.
Focused, notas, restricciones, pedido libre, refinamiento y endurance vuelven
orientativa la cobertura. Texto libre puede cambiar el alcance: no inferir
especializaciones con regex ni anteponer la seleccion general a ese pedido.
El enfoque se describe en las notas; seleccionarlo sin notas no define un split.

## Orden y tiempo

Una diferencia de mas de 2:1 entre series de empuje/tiron es un aviso, no rechazo.
Orden solo advierte sobre relaciones curadas de fatiga: biceps/muneca antes de
tirones, triceps/hombros antes de empujes, femorales antes de bisagra/puente y abdominales
antes de sentadilla/zancada/bisagra. Un curl femoral antes de press de hombros
no dispara el aviso. Las prioridades del usuario pueden justificar otro orden.

SessionMin valido (10-240) viaja en requirements. Se estima 2-3 minutos por serie
recta de reps, cardio por duracion explicita y trabajo cronometrado por sec/60,
con hasta un minuto estimado de descanso por serie en el extremo alto.
No incluye entrada en calor, esperas ni transiciones. Superseries o tiempos
incompletos producen estimacion desconocida, sin inventar descuentos.
Si el extremo bajo supera sessionMin, la UI pide revisar; no rechaza el plan.
Heuristicas orientativas, no limites fisiologicos ni promesas de duracion.

## Volumen muscular

coach-muscle-volume/v1 reutiliza roles del catalogo canonico del frontend:
overlays existentes y aliases de musclesOf. El generador produce metadata
coach-muscle-metadata/v1; el core no importa UI. Primarios y secundarios viajan
en el asset; el recorte solo envia primaries y procedencia explicit/legacy.
Conserva IDs, topes 60/160 y filtros. Slice de 160: 21587 caracteres medidos.

Cuenta series de reps agendadas, separando primarySets/supportingSets sin
coeficiente de equivalencia. Dias por musculo: union de participacion registrada;
dos rutinas el mismo dia suman series y un solo dia. Rutinas sin agendar no cuentan.
Tiempo, cardio y estiramientos quedan fuera; min/speed de cardio normalizado
tambien se reconocen al estimar duracion. No modifica mapa muscular ni historial.

Legacy conserva roles conocidos pero puede omitir otros primarios,
incluso en secundarios que la zona no menciona. Datos propios,
desconocidos o no medibles no prueban ausencia: la zona solo acota incertidumbre,
nunca concede series. UI marca recuentos incompletos y excluidos en un desplegable.
No hay minimo semanal universal ni volumen efectivo inferido sin esfuerzo real.

Solo para alcance general: aviso de principal ausente en pecho, espalda alta,
cuadriceps, femorales o gluteos, con candidato compatible y sin incertidumbre;
diferencia mayor a 2:1 pecho/espalda es orientativa. No fuerza aislamientos.
Objetivo muscle: mas de diez series principales en un dia pide revisar reparto,
incluyendo rutinas combinadas. Todos son avisos, sin rechazo ni redistribucion.
Notas, restricciones y enfoque siguen teniendo autoridad.

## Evidencia y limites del volumen

[Meta-regresion de Pelland et al., 2026](https://pubmed.ncbi.nlm.nih.gov/41343037/)
distingue trabajo directo/indirecto; no convierte estos conteos del catalogo en
una medida individual de estimulo. La app mantiene ambas columnas separadas.
[IUSCA, 2021](https://journal.iusca.org/index.php/Journal/article/view/81)
plantea aproximadamente diez series por musculo/sesion como guia tentativa,
con evidencia limitada. El aviso usa ese valor para revision, no como maximo
fisiologico ni prueba de volumen inseguro.

Escenario [coach-muscle-volume](scenarios/coach-muscle-volume.json), tests al
lado de plan-muscle-volume y library-muscles: calendario, roles, incertidumbre,
alcance, proveedor/cliente y paridad con todo el catalogo canonico. En las capturas
registra pecho 4 principales, espalda 10 e isquiotibiales 0 principales/10
secundarias; metadata incompleta, sin afirmar ausencia fisiologica.

## Contrato y verificacion

Calidad derivada del plan validado; el modelo no aporta el informe. Visible con
el calendario antes de confirmar y recalculada antes de importar; conserva
rutinas/registros existentes y snapshot/undo. Modulos puros: movement-patterns,
plan-quality, plan-feasibility y plan-muscle-volume. Adaptadores pequenos en library/payload/pipeline/
validate; UI PlanQuality/PlanScope. Servidor y BYOK comparten el contrato.

Escenario [coach-plan-quality](scenarios/coach-plan-quality.json): capturas,
abdominales solos, cobertura, calendario repetido, restricciones, preferencias,
orden, tiempo y reparacion CLI/HTTP en es/es-AR. Reglas de candidatos adaptadas
de upstream 043dd30, revisado en 1350409; base a68a88d con baseline intacto
58/58, sin merge completo. No elevar presupuestos de contexto.

Intake es/es-AR guarda alcance sin generar ni alterar entrenamiento.
Chrome 154/390-1440: importacion/undo con datos sinteticos. Hash pt-BR revisado:
4cd3b1e388ebb5ecfe98b03c42534f16597b05101e7a9bc0845e2fcb61b6a438.

## Matriz de modelo real

Probe opt-in reproducible: node scripts/verify-coach-plan-quality.mjs --model ID.
En Windows, --launcher acepta la ruta del codex.js instalado. Conserva argvFor,
sin herramientas del host, plugins, reglas o config ambiental. No lee estado
de la app ni config de instancia; solo casos sinteticos del escenario.
Usa el login del runtime y guarda resultados/hashes en el directorio ignorado
.production-state/coach-plan-quality. Elegir modelo es obligatorio.
No ejecutarlo automaticamente como test ni como parte del build.

Tanda anterior, Codex CLI 0.160.0/gpt-6.1-sol: 10/10 y diez llamadas,
es/es-AR en gimnasio, maquinas, bandas, 30 minutos y solo tren superior.
Perfil corto: ocho series, 16-24 minutos; enfoque superior sin piernas.
Tras clasificar tres accesorios: replay entonces 10/10 y repeticion real
de tren superior 2/2. No mide optimalidad universal.
Evidencia: .production-state/coach-plan-quality/{2026-10-06T17-31-56-376Z,
2026-10-06T17-42-10-359Z,replay-current.json}.
CLI 0.160 temporal; global 0.146 no admite view_image. Hash del probe:
core/assets/adaptador/escenario. Sin cambiar instalacion.
Estas pruebas no acreditan CI Linux/Node 22, otros proveedores, dispositivos
fisicos o produccion. Clasificacion completa de movimientos y mayor cobertura de roles musculares
siguen pendientes; extender la matriz antes de afirmar calidad general de un modelo.

## Verificacion de volumen

Preflight 6/10, Docker/Linux Node 22.23.3: API 279, frontend 1628, MCP 59;
build/assets/carga/locales y sondas de fatiga OK. Snapshot Git + delta local,
sin datos privados; evidencia preflight-2026-10-06T18-37-54-740Z. No acredita
CI/publicacion del futuro SHA ni despliegue remoto.

6/10/2026, core del probe d9072156: API 278 pass/1 skip, frontend 1629.
Build/assets/core, 14 locales/1404 claves y contexto OK; pt-BR 673 overrides,
731 heredadas y hash anterior intactos. Chrome 154: es/es-AR a 390/1440,
18 filas, sin overflow; teclado colapsa y click despliega. Ajustes finales:
core/payload 21, volumen 10 y UI/herencia 11 OK. Evidencia sintetica
visual-muscle-final en .production-state/coach-plan-quality.

Codex CLI 0.160.0/gpt-6.1-sol: seis generaciones nuevas, seis llamadas,
gimnasio/bandas/tren superior en es/es-AR, sin reparacion y con informe muscular.
En bandas hay roles legacy y movimientos sin clasificar; se informa incertidumbre,
sin certificar un plan optimo. El enfoque de tren superior no agrega piernas.
Evidencia: 2026-10-06T18-16-06-276Z, 18-19-09-607Z y 18-21-30-804Z
en el mismo directorio ignorado.

Replay historico con candidatos actuales: 9/10, cero llamadas reales. Una respuesta
de tren superior es-AR usa 0154: su overlay canonico cambia back a shoulders y
el recorte actual no lo ofrece. Gate lo rechaza; no es una propuesta vigente.
Las dos generaciones nuevas de ese enfoque pasan. Capturas originales intactas;
replay-muscle-current.json registra la diferencia. No ampliar candidatos ni
relajar validacion para hacer pasar respuestas de un recorte anterior.
