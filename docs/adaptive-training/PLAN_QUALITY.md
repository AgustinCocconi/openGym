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
rutinas/registros existentes y snapshot/undo. Core puro compartido de movimientos, calidad y volumen; adaptadores finos en
library/payload/pipeline/validate y UI PlanQuality/PlanScope.

Escenario [coach-plan-quality](scenarios/coach-plan-quality.json): capturas,
abdominales solos, cobertura, calendario repetido, restricciones, preferencias,
orden, tiempo y reparacion CLI/HTTP en es/es-AR. Reglas de candidatos adaptadas
de upstream 043dd30, revisado en 1350409; base a68a88d con baseline intacto
58/58, sin merge completo. No elevar presupuestos de contexto.

## Matriz de modelo real

Probe opt-in: node scripts/verify-coach-plan-quality.mjs --model ID;
Windows admite --launcher codex.js. Conserva argvFor y aislamiento, solo casos
sinteticos, sin estado/config de instancia ni herramientas del host.
No ejecutarlo automaticamente como test/build. Guarda hashes/resultados en
.production-state/coach-plan-quality. Elegir modelo es obligatorio.
Codex CLI 0.160.0/gpt-6.1-sol tiene probes es/es-AR anteriores; no acreditan
otros modelos/dispositivos ni optimalidad. Metadata legacy implica incertidumbre.

## Verificacion local

6/10, cambios locales, Windows Node 24: API 283 pass/1 skip; frontend gate
completo y regresiones de calibracion/superseries, build/assets/Node-loadable,
14 locales/1420 claves y contexto 21135 OK. Chrome 154: es/es-AR a 390/1440,
sin overflow, diff y ayuda con teclado; evidencia sintetica visual-calibration-final2
en .production-state/coach-plan-quality. CI/produccion conservan su gate separado.
Replay historico 9/10 por 0154 fuera de recorte; no relajar allowlist.

## Uso en gimnasio

Escenario [coach-gym-calibration](scenarios/coach-gym-calibration.json):
swap de 16-24 a 6 reps elimina rango incompatible y pasa prog a off;
descarta carga/incremento/flags del movimiento anterior, conserva dosis compatible.
Diff visible antes de confirmar; snapshot/undo preserva registros.
Rangos ya guardados fuera de dosis son avisos, reparables mediante propuesta
explicita; una actualizacion no reescribe planes.

Active reserva hasta seis variantes curadas del patron enfocado, prioriza equipo
sin ampliar 60. Con equipo compatible, 1425 ofrece la prensa bilateral 0739.
Review recibe diagnostico compacto y feedback inicial: una sesion facil/corta
puede justificar calibracion o trabajo adicional solicitado, sin inventar tendencia
ni rellenar minutos. Calidad proyectada de la seleccion real, cobertura orientativa;
dependencias/rangos invalidos bloquean antes de mutar.

warmupSets 0-5: create/review, limpieza/fingerprint y buildSessionEntries existente;
calentamiento separado, sin sumarlo al volumen de trabajo.
appGuidance publico/acotado: mancuerna recomendada por unidad (dos de 12 = 12,
sin conversion), barra, asistencia, esfuerzo y registro manual. Carga desconocida
se calibra sin inventar kg; UI avisa carga pendiente y permite activar RIR
sin cambiar entrenamiento. Maquinas asistidas: preferir off/manual mientras
no exista contrato de progresion inversa. Copy es/es-AR; otros packs heredan
las nuevas claves en ingles hasta traducirlas.

Tests puros y de proveedor CLI/HTTP junto a gym-calibration/review-result;
coach-calibration y UI cubren seleccion, inicio, castellano y undo.
No certifican optimalidad ni reemplazan el probe real/dispositivos fisicos.

## Produccion

6/10: 5b544ef/coach accepted; CI/publicacion 37514731243 y revision/digests OK.
Origen/HTTPS AR, registro cerrado y prueba real codex/gpt-6.1-sol/0.160.0 OK;
binding/unprivileged/cuotas 30+30 intactos. WAF BR/Block/regla propia confirmado.
Backup consistente cifrado/copia PC/restore siete archivos/2,64 s; plaintext retirado.
Timers activos; detalle en [checkpoint OCI](OCI_DEPLOYMENT_PLAN.md#checkpoint).
La generacion con el perfil real queda a cargo del propietario; no se editaron planes.
