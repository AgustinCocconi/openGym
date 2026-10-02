# Auditoria de contexto y gobernanza

Corte: 2026-10-02, arbol local sobre `57ad20b`, Windows/Node 24. Es un diagnostico
direccionable, no carga de arranque ni bitacora. Medicion reproducible:
`npm run check:context -- --report`; limites canonicos en
`scripts/context-budget.json`. Tokens aproximados segun el protocolo.

## Estado comprobado

Proyecto existente: React/Vite/Zustand, JavaScript puro, Node HTTP y MCP separado;
Docker y Capacitor conservados. El indice enlaza ubicaciones de cada subsistema.
La base integrada esta en `PORTING_MAP.md`; la referencia local `upstream/main`
esta por delante de `main`. No se hizo fetch ni sincronizacion en esta tarea.

El arbol ya contenia cambios OCI y `adaptive-training/recency*` sin confirmar.
El baseline inicial contemplo tambien la revision confirmada de las secciones
operativas. La continuacion autorizada consolida los documentos OCI locales y
reduce sus limites; plan y presupuesto deben revisarse juntos. Conserva los
hechos operativos heredados como evidencia registrada, sin acreditar una nueva
consulta remota ni pruebas de esos cambios. No se modificaron codigo de producto,
Terraform, dependencias ni configuracion global durante la limpieza de contexto.

## Hallazgos resueltos

- `AGENTS.md` es politica comun. La plantilla duplicada ahora enlaza esa fuente;
  `CLAUDE.md` conserva upstream y referencia las reglas compartidas.
- El indice dejo de pedir crear un fork que ya existe y de duplicar SHAs de
  referencia. Conserva rutas tematicas y explica donde actualizar conocimiento.
- Las afirmaciones obsoletas sobre CI inactiva y cantidades de dependencias se
  corrigieron puntualmente, remitiendo a workflows y manifests reales.
- Existe contrato breve para tareas independientes, handoff y coordinacion;
  las tareas simples no crean documentacion permanente innecesaria.
- El chequeo distingue codigo, instrucciones, secciones y datos masivos.
  Detecta crecimiento en archivos de una sola linea, archivos nuevos y carga
  obligatoria. Tiene pruebas de regresion y esta conectado al gate GitHub.
- El plan OCI paso de 46.311 a 18.731 caracteres (~60 % menos). Checkpoint al
  inicio, lectura por fase, evidencia vinculada al SHA y decisiones vigentes;
  se retiraron instrucciones de cuenta/PAYG/A1 reemplazadas y bitacoras.
- Politica productiva y runbook remiten al checkpoint unico. El gate separa
  creacion ya autorizada, evidencia historica y primer deploy pendiente; los
  simulacros previos usan datos de prueba, sin abrir antes una produccion.
- Inactividad E2 y cuotas se contrastaron con fuentes oficiales enlazadas en
  el plan. RAM/swap no evita reclamacion E2. Las cuotas heredadas de A1 no
  prueban un limite efectivo para la unica E2 acordada.
- El procedimiento de recreacion reconoce `prevent_destroy` en la instancia
  y exige revisar el cambio temporal de ese guardrail sin quitar el del volumen.

## Medicion y criterio de limites

La carga base inicial era 21.296 caracteres, unos 5.324 tokens. Se mantiene
practicamente estable: no se promete un arranque de solo dos documentos porque
las instrucciones upstream deben seguir leyendose. El protocolo y esta auditoria
son opcionales por tarea; la mejora consiste en lectura dirigida y crecimiento
acotado, sin sumar todas las capsulas al arranque.

La distribucion final de codigo, con datos y generados separados, esta registrada
en el presupuesto. Se redondea su percentil 95 al siguiente bloque de 50 lineas
y 5.000 caracteres para los limites generales. Outliers existentes conservan
tamano individual: no exigen una extraccion masiva ni admiten crecimiento libre.

Capsulas: limite de archivo redondeado sobre la mayor existente; secciones sobre
el maximo medido de las capsulas tematicas. Instrucciones propias y tareas activas
comparten presupuesto compacto. Documentos upstream largos y operativos tienen
excepciones medidas por archivo/seccion. La carga obligatoria tiene limite propio.

El principal hotspot es `frontend/src/sheets.jsx`: 2.140 lineas y 24 apariciones
en los ultimos 100 commits consultados. `api/server.js`, las vistas Workout y
CoachChat, store, estilos y pruebas extensas tambien requieren lectura por
simbolo/rango. Catalogos y textos de ejercicios no se vuelcan completos al chat.

## Pendientes operativos localizados

La limpieza documental OCI esta terminada. El siguiente trabajo operativo
parte del [checkpoint](../adaptive-training/OCI_DEPLOYMENT_PLAN.md#checkpoint):

- Revalidar cuota efectiva del compartment para una E2, alertas y costo visible;
  la evidencia anterior de A1 no cubre esa eleccion.
- Configurar Tunnel/Access/WAF y verificar HTTPS/geografia. El
  [runbook](../adaptive-training/PRODUCTION_RUNBOOK.md#precondiciones-del-bootstrap)
  identifica un bloqueo real: curl sin Access desde una VM brasilena frente a
  WAF Argentina. Adaptar/probar sondas internas y externas protegidas antes del
  deploy, sin retirar controles para obtener verde. Esta tarea no edito scripts.
- Elegir destino externo cifrado y ensayar rollback/restauracion con datos de
  prueba; obtener autorizacion separada para el primer deploy.

El plan conserva sus fases y controles completos; ninguna casilla pendiente
se marco por esta auditoria. No se consultaron secretos ni servicios remotos
autenticados. Las verificaciones operativas heredadas permanecen identificadas.

No extraer los archivos centrales de upstream por esta auditoria. Evaluar una
extraccion pequena solo cuando una tarea concreta necesite esa responsabilidad,
con tests apropiados. Al sincronizar upstream, revisar limites y divergencias;
no actualizar el baseline automaticamente para ocultar crecimiento.

## Verificacion y limites de la auditoria

La limpieza redujo el limite de archivo OCI y elimino sus siete excepciones de
seccion; tambien elimino la excepcion de instalacion del runbook al separar
alta/cierre del registro. Todas esas secciones quedan debajo de 2.000 caracteres.
No se aumentaron limites ni exclusiones. Plan reducido y nuevo presupuesto
forman una unidad; no aplicar solo el presupuesto sobre el plan anterior.

Resultados locales de esta continuacion: seis tests del checker, gate de
contexto, 29 enlaces/anchors y `git diff --check` pasan en Windows/Node 24.
Comparacion con el presupuesto de entrada: ningun limite, excepcion o exclusion
aumento. Carga base: 21.135 caracteres (~5.284 tokens); mayor seccion OCI:
1.812 caracteres. YAML de ambos workflows ya validado en la tarea inicial;
esta continuacion no los modifica.
La limpieza documental no requirio suites de producto, build, browser ni
infraestructura; la preparacion de commits verifica codigo previo como se
indica abajo.
La ejecucion local con Node 24 no acredita la ejecucion remota Node 22.
El chequeo no prueba correccion semantica, paridad de proveedores ni ausencia
de duplicacion narrativa. Esas garantias siguen en escenarios y revision humana.

## Cierre para continuar en otro chat

El propietario autorizo confirmar todos los cambios locales en commits separados:
recencia pura en `9324f29940b4efe864b36862cf6ad9a4a51b858b`, OCI/IaC y
documentacion en `5422142721b3fee5da2493573804cee96ae99f65`, y gobernanza en
el commit que contiene esta auditoria. No se hizo push ni despliegue. El estado
Git vigente se consulta al retomar; el baseline conserva su corte original.

Verificaciones de preparacion: 1.480 tests frontend (12 de recencia), build
Vite, seis tests de contexto y presupuesto verdes. En copia temporal sin
tfvars/state privados, Terraform 1.16.4 con OCI 7.32.0 local paso formato,
validacion y cuatro tests de proveedor mock; tres bloques shell de cloud-init
pasaron `bash -n`. No acredita un nuevo plan autenticado ni validacion remota.
El build conserva avisos de chunks grandes/imports dinamicos sin efecto;
tratarlos en la nueva auditoria, sin refactor preventivo en estos commits.

La recencia sigue parcial segun `PORTING_MAP.md`; los pendientes operativos
siguen en el checkpoint OCI. Confirmar archivos no satisface el gate de deploy.
