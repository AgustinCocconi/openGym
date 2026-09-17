# Plan reanudable de produccion en Oracle Cloud

> Estado: planificacion, sin infraestructura creada ni despliegue ejecutado.
> Ultima actualizacion: 2026-09-17.

Este documento es el punto de entrada para preparar, desplegar y operar una
unica instancia personal de openGym en Oracle Cloud Infrastructure (OCI). Esta
pensado para poder continuar el trabajo desde un chat nuevo sin depender del
historial de conversaciones y para separar con claridad lo que puede ejecutar
un agente de lo que requiere intervencion del propietario.

La politica general sigue en `PRODUCTION_DEPLOYMENT.md` y los comandos
operativos generales en `PRODUCTION_RUNBOOK.md` dentro del fork. Si esos
documentos y este plan divergen sobre OCI, actualizar primero los tres y
registrar la decision aca.

## Como retomar desde cualquier chat

Usar este texto como primer pedido:

```text
Trabaja en C:\Github\openGym. Lee AGENTS.md, CLAUDE.md, CONTRIBUTING.md,
docs/adaptive-training/README.md y
docs/adaptive-training/OCI_DEPLOYMENT_PLAN.md. Revisa el estado Git sin
descartar ni sobrescribir cambios locales. Retoma solamente la primera fase
que no figure terminada, revalida sus supuestos externos y actualiza el
checkpoint del plan al finalizar. No despliegues ni crees recursos pagos sin
mi confirmacion explicita.
```

Al comenzar una sesion, el agente debe:

1. leer las instrucciones del repositorio y este plan completo;
2. ejecutar `git status --short --branch`, `git remote -v` y consultar la rama
   y el commit actuales;
3. revisar el checkpoint y el registro de decisiones al final del documento;
4. preservar todos los cambios locales que no haya creado en esa sesion;
5. trabajar solo en la primera fase no terminada, salvo que el usuario cambie
   expresamente la prioridad;
6. actualizar fecha, evidencia y proximo paso antes de cerrar.

No pegar en chats, commits ni logs tokens, claves SSH, archivos `.env`, datos
de `data/`, backups, cookies, secretos de OCI o claves de autenticacion de
Tailscale. Los OCID no son credenciales, pero tampoco hace falta publicarlos.

## Responsabilidades

- **Agente:** cambios de codigo y documentacion, scripts, IaC, CI, pruebas,
  validaciones de solo lectura y comandos reproducibles.
- **Propietario:** altas de cuentas, MFA, aceptacion de facturacion, pantallas
  web que requieren identidad, autorizacion de Tailscale, custodia de secretos
  y confirmacion de acciones con costo o destructivas.
- **Conjunto:** elecciones irreversibles, primer despliegue, registro de la
  passkey propietaria, prueba de restauracion y aceptacion productiva.

El agente debe guiar cada tarea del propietario paso a paso, indicar que datos
son seguros para devolver y verificar el resultado sin pedir credenciales.

## Decisiones vigentes

| Tema | Decision |
| --- | --- |
| Alcance | Una instancia productiva para uso personal; sin staging remoto. |
| Rama desplegable | `personal`; `main` sigue reflejando `upstream/main`. |
| Proveedor | OCI, usando solo recursos incluidos en Always Free. |
| Cuenta | Se recomienda Pay As You Go con cuotas y alertas, sin consumir recursos fuera de Always Free. |
| Compute inicial | Ampere A1 ARM64, `1 OCPU / 2 GB`; ajustar solo con mediciones. |
| Persistencia | Volumen separado para datos y backups reproducibles. |
| Acceso | Privado mediante Tailscale Serve y HTTPS `*.ts.net`. |
| Passkeys | No registrar ninguna hasta fijar y probar el hostname definitivo. |
| Imagenes | Construidas por CI desde un commit exacto de `personal`; el host no compila. |
| Despliegue | Manual para la primera version; automatizar despues de probar rollback y restauracion. |
| Inactividad | Dimensionar segun uso real y observar metricas; no generar carga artificial. |
| Recuperacion | La VM es reemplazable; los datos y la configuracion son respaldados. |

Cambiar una decision de esta tabla requiere registrar fecha, motivo e impacto
en el historial del final.

## Hechos externos que siempre se revalidan

Antes de crear recursos, consultar documentacion oficial vigente. Al
2026-09-17, OCI publica para A1 Always Free un total mensual equivalente a 2
OCPU y 12 GB de memoria, 200 GB combinados de volumenes y cinco backups de
volumen. Tambien advierte que puede reclamar compute Always Free considerado
inactivo cuando CPU P95, red y memoria permanecen simultaneamente debajo de
20 % durante siete dias.

- OCI Always Free:
  <https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm>
- Fin de la promocion y cuentas pagas:
  <https://docs.oracle.com/en-us/iaas/Content/GSG/Tasks/signingup_topic-What_Happens_When_the_Promotion_Expires.htm>
- Tailscale Serve:
  <https://tailscale.com/docs/features/tailscale-serve>
- Plan personal de Tailscale:
  <https://tailscale.com/kb/1154/free-plans-discounts>

Las cuotas y precios pueden cambiar. Una estimacion de costo cero no reemplaza
la pantalla de costos de OCI, las cuotas ni las alertas. Pasar la cuenta a Pay
As You Go no se considera una garantia documentada contra la reclamacion de
compute inactivo.

## Gate absoluto antes de desplegar

No crear la instancia productiva ni ejecutar `ops/deploy-production.sh` hasta
que todos estos puntos esten cumplidos:

- [ ] la rama `personal` contiene en commits probados todos los artefactos que
  se desean desplegar y el arbol de trabajo esta limpio;
- [ ] tests, builds e imagenes ARM64 pasan para el commit exacto;
- [ ] el propietario confirmo cuenta OCI, modalidad de facturacion, region de
  origen y limites Always Free visibles en consola;
- [ ] existen cuotas y alertas que reducen el riesgo de gasto accidental;
- [ ] el hostname final de Tailscale esta definido y probado desde el celular;
- [ ] el destino cifrado externo de backups esta definido;
- [ ] el rollback de imagen y una restauracion aislada fueron ensayados;
- [ ] el propietario autoriza explicitamente el primer despliegue.

## Fase 0 - Consolidar la base local

**Responsable principal:** agente.

- [x] Elegir OCI como proveedor objetivo y Tailscale como acceso privado.
- [x] Mantener una unica produccion desplegada desde `personal`.
- [x] Preparar scripts generales de preflight, gate, backup, smoke, despliegue
  y rollback bajo `ops/`.
- [x] Extender el workflow de tests para cubrir pushes a `personal`.
- [x] Revisar en conjunto todos los cambios locales, decidir cuales pertenecen
  al siguiente commit y preservar los restantes.
- [ ] Sincronizar este plan con `PRODUCTION_DEPLOYMENT.md` y
  `PRODUCTION_RUNBOOK.md` cuando se implemente la variante OCI.
- [x] Confirmar un commit limpio y probado antes de avanzar a infraestructura.

**Evidencia actual:** el 2026-09-17 `personal` y `origin/personal` apuntaban a
`e7bdbab4a255a1f92286ed098cf70dc82ef3d2a0`. Habia cambios locales deliberados
en CI, documentacion y `ops/`, mas archivos sin seguimiento en
`frontend/src/lib/adaptive-training/`. No descartarlos ni desplegarlos sin
clasificarlos y probarlos.

Revision de fase 0 del 2026-09-17:

- el propietario aprobo el commit operativo (CI, `.gitignore`, documentos
  productivos y `ops/`); `recency.js` y su test quedan preservados sin
  seguimiento y fuera de ese commit;
- en Windows con Node 24 pasaron los 1.480 tests de frontend, los 58 tests de
  MCP, el build de Vite, los chequeos de locales, artefactos generados y carga
  directa, y la sonda de fatiga;
- la suite de API paso 164 de 181 tests en Windows; las 17 diferencias de rutas
  y permisos POSIX quedaron cubiertas al pasar los 181 tests dentro del gate
  oficial Linux con Node 22;
- `sh -n` acepto los cinco scripts productivos, la superposicion productiva de
  Compose renderizo correctamente y el gate Linux/Node 22 completo quedo verde
  para frontend, MCP y API. El gate tambien se hizo portable a Git Bash y usa
  volumenes anonimos ejecutables, eliminados con `docker run --rm`.

**Salida:** artefactos locales revisados, tests verdes y una estrategia de
commits acordada. No implica desplegar.

## Fase 1 - Validar compatibilidad ARM64 y consumo

**Responsable principal:** agente; el propietario solo necesita mantener
Docker disponible cuando se requieran pruebas locales.

- [ ] Verificar que las imagenes `api` y `web`, el downloader de media y todas
  las dependencias funcionen en `linux/arm64`.
- [ ] Ejecutar las suites de frontend, API y MCP y el build productivo con la
  version de Node indicada por upstream.
- [ ] Construir imagenes ARM64 o multi-arquitectura con Buildx sin publicarlas
  como productivas.
- [ ] Arrancar el stack construido y ejecutar los smoke tests de solo lectura.
- [ ] Registrar tamanos de imagen y una medicion orientativa de memoria. La
  medicion local no sustituye la metrica real de OCI.
- [ ] Decidir si publicar solo `arm64` o `amd64,arm64`. Se prefiere multiarch
  si el costo de CI sigue dentro de la cuota disponible.

**Salida:** evidencia reproducible de que el commit candidato arranca en ARM64
y no requiere construir en la VM.

## Fase 2 - Preparar cuentas y elecciones del propietario

**Responsable principal:** propietario, guiado por el agente.

### OCI

- [ ] Crear o reutilizar una cuenta OCI y activar MFA.
- [ ] Elegir con cuidado la home region: los recursos Always Free de compute y
  almacenamiento deben crearse alli y la eleccion no debe hacerse sin revisar
  latencia, disponibilidad de A1 y condiciones vigentes.
- [ ] Confirmar en consola que A1, block volume, backups y transferencia
  aparecen como elegibles para Always Free en esa tenancy y region.
- [ ] Evaluar y confirmar el upgrade a Pay As You Go. No compartir la tarjeta
  ni permitir que un agente complete esa pantalla.
- [ ] Crear un presupuesto y notificaciones de costo. Un presupuesto alerta;
  no constituye por si solo un limite duro.
- [ ] Crear cuotas de compartment que impidan superar la cantidad de OCPU,
  memoria y almacenamiento decidida para este proyecto.
- [ ] Crear un compartment dedicado, por ejemplo `opengym-personal`.

El propietario solo debe devolver al chat: region elegida, nombres de
compartment/proyecto, confirmacion de MFA/PAYG y capturas sin identificadores ni
datos de facturacion si hicieran falta para diagnosticar.

### Tailscale

- [ ] Crear o reutilizar un tailnet personal con MFA en el proveedor de
  identidad.
- [ ] Habilitar MagicDNS y certificados HTTPS.
- [ ] Reservar el nombre estable del nodo, recomendado `opengym-prod`.
- [ ] Instalar Tailscale en el celular que se usara durante el entrenamiento.

No crear todavia passkeys de openGym ni compartir auth keys de Tailscale.

**Salida:** cuentas seguras, region confirmada y limites de costo visibles.

## Fase 3 - Codificar la infraestructura OCI

**Responsable principal:** agente. El propietario aprueba el plan de OCI antes
de cualquier `apply`.

Crear bajo `ops/oci/` infraestructura reproducible, preferentemente Terraform,
sin credenciales ni secretos en el repositorio:

- [ ] VCN, subnet y reglas de salida necesarias para actualizaciones,
  Tailscale y descarga de imagenes.
- [ ] Ningun puerto publico de aplicacion. Evitar SSH publico permanente; usar
  OCI Bastion, consola u otro bootstrap acotado.
- [ ] Una A1 ARM64 con `1 OCPU / 2 GB`, imagen Linux soportada y boot volume
  minimo razonable.
- [ ] Un block volume separado, montado de forma estable para `data/` y otros
  directorios persistentes. Mantener el total dentro de Always Free.
- [ ] Cloud-init o bootstrap idempotente para Docker Engine, Compose, Git,
  Tailscale y herramientas del runbook.
- [ ] Etiquetas de proyecto y entorno para identificar todos los recursos.
- [ ] Outputs no secretos: region, IP, IDs de recursos operativos y comandos de
  conexion. Nunca emitir tokens.
- [ ] Validaciones que fallen si CPU, memoria o almacenamiento exceden los
  limites acordados.
- [ ] Documento de destruccion y recreacion. Destruir sigue requiriendo
  confirmacion explicita y backup verificado.

El login interactivo de Tailscale debe quedar fuera de cloud-init y del estado
de Terraform. El agente muestra el comando; el propietario abre y autoriza la
URL resultante.

**Salida:** `terraform validate` y un `plan` revisado que solo contenga los
recursos esperados y sin secretos.

## Fase 4 - Publicar imagenes propias por commit

**Responsable principal:** agente.

- [ ] Crear un workflow separado para `personal` que ejecute primero todos los
  tests y builds.
- [ ] Publicar `api` y `web` propias en GHCR para ARM64 o multiarch.
- [ ] Etiquetar cada imagen con el SHA completo e incluir `personal` solo como
  alias movil.
- [ ] Registrar digest y commit. Produccion consume el digest o la etiqueta
  inmutable, nunca solamente `latest` o `personal`.
- [ ] No publicar secretos de build. Si el paquete es privado, el propietario
  crea y guarda el token de lectura directamente en la VM.
- [ ] Adaptar `ops/compose.production.yml` y el deploy para descargar el commit
  exacto en lugar de compilar en la A1.
- [ ] Conservar el rollback al digest anterior.

**Salida:** un commit de `personal` con tests verdes y dos imagenes ARM64
arrancables e identificadas por digest.

## Fase 5 - Crear y endurecer la VM

**Responsable:** conjunto.

- [ ] El propietario autoriza el `apply` o crea exactamente los recursos del
  plan guiado por el agente.
- [ ] Verificar en OCI que todos los recursos relevantes muestran costo
  esperado cero y pertenecen al compartment correcto.
- [ ] Montar el volumen persistente por UUID y comprobar permisos.
- [ ] Instalar y habilitar Docker, actualizaciones de seguridad y firewall.
- [ ] Instalar Tailscale; el propietario completa la autorizacion interactiva.
- [ ] Asignar el nombre estable `opengym-prod` y ejecutar Tailscale Serve hacia
  el puerto local de openGym.
- [ ] Verificar desde el celular la URL HTTPS final.
- [ ] Cerrar cualquier acceso de bootstrap que ya no sea necesario.

Registrar entonces, sin secretos:

| Dato | Valor |
| --- | --- |
| Home region OCI | `PENDIENTE` |
| Compartment | `PENDIENTE` |
| Shape efectiva | `1 OCPU / 2 GB` propuesta |
| Hostname Tailscale final | `PENDIENTE` |
| `RP_ID` | `PENDIENTE` |
| `ORIGIN` | `PENDIENTE` |
| Punto de montaje de datos | `PENDIENTE` |

**Salida:** host endurecido, accesible de forma privada y todavia sin datos
productivos.

## Fase 6 - Primer despliegue controlado

**Responsable:** conjunto. Requiere confirmacion explicita del propietario.

- [ ] Revalidar el gate absoluto y el estado limpio de `personal`.
- [ ] Crear `.env` directamente en la VM con `RP_ID` y `ORIGIN` definitivos.
  El propietario conserva los secretos y no pega el archivo en el chat.
- [ ] Descargar imagenes por SHA/digest y ejecutar el despliegue bootstrap.
- [ ] Ejecutar healthcheck y smoke antes de abrir la aplicacion.
- [ ] Registrar el perfil propietario y su primera passkey desde el celular.
- [ ] Configurar `ADMIN_UIDS`, `INVITE_ONLY=1` y `ALLOW_GUEST=0`.
- [ ] Recrear los contenedores y verificar que el alta publica quedo cerrada.
- [ ] Registrar commit, digests, configuracion no secreta y resultado del smoke.
- [ ] Crear el primer backup consistente y verificar su checksum.

**Salida:** instancia personal cerrada, login por passkey probado y backup
recuperable. No se implementan funciones adaptativas como parte del deploy.

## Fase 7 - Observar inactividad sin fabricar carga

**Responsable principal:** agente configura; propietario recibe alertas y toma
decisiones.

- [ ] Habilitar metricas de CPU, red y memoria de la A1 mediante los agentes
  soportados por OCI.
- [ ] Crear alarma de estado de instancia y ausencia de metricas.
- [ ] Crear una alerta temprana cuando la memoria permanezca por debajo de
  25 %. La condicion oficial vigente debe revalidarse antes de aplicarla.
- [ ] Mantener healthchecks de Docker y smoke HTTP periodico para detectar
  fallas. Documentar expresamente que no garantizan actividad para OCI.
- [ ] Ejecutar backup, checksum y tareas de mantenimiento reales en su horario;
  no usar loops de CPU, trafico ficticio ni memoria reservada sin uso.
- [ ] Observar como minimo ocho dias completos antes de declarar estable el
  dimensionamiento.

Regla de decision inicial:

- memoria sostenida entre 25 % y 70 %: conservar el tamano;
- debajo de 25 %: revisar metricas y evaluar una reduccion solo si pruebas de
  carga, build fuera del host y margen de seguridad lo permiten;
- encima de 70 % o con OOM/restarts: aumentar memoria dentro de la cuota
  gratuita y volver a observar;
- si ninguna dimension permanece legitimamente fuera del criterio de
  inactividad con el menor tamano seguro: aceptar el riesgo de reclamacion o
  migrar a compute pago. No simular consumo.

**Salida:** ocho dias de metricas guardadas, alertas probadas y decision de
tamano registrada.

## Fase 8 - Backups y recuperacion ante reclamacion

**Responsable:** conjunto.

- [ ] Backup consistente antes de cada deploy y backup periodico diario.
- [ ] Rotacion local explicita y hasta cinco backups de volumen dentro de la
  cuota vigente de OCI.
- [ ] Copia cifrada fuera de la VM y, preferentemente, fuera de OCI. El
  propietario debe elegir y autorizar el destino.
- [ ] Verificacion automatica de checksum despues de transferir.
- [ ] Restauracion mensual en un directorio o instancia aislada.
- [ ] IaC y bootstrap suficientes para recrear la VM desde cero.

Si OCI reclama la instancia:

1. no crear recursos a ciegas ni restaurar encima del unico volumen;
2. confirmar estado de volumenes y ultimo backup verificado;
3. recrear compute desde IaC dentro de las cuotas;
4. retirar del tailnet el nodo perdido antes de reutilizar el hostname;
5. montar los datos o restaurar una copia en un volumen nuevo;
6. descargar los mismos digests y ejecutar smoke;
7. validar la passkey existente antes de modificar datos;
8. registrar causa, RPO real y tiempo de recuperacion.

Objetivos iniciales, a confirmar despues del simulacro: RPO maximo 24 horas y
RTO maximo 60 minutos.

**Salida:** restauracion ensayada y evidencia de que perder compute no implica
perder los datos.

## Fase 9 - Operacion normal

- [ ] Desplegar siempre un SHA de `personal` con tests verdes.
- [ ] Mantener despliegue manual hasta completar al menos dos actualizaciones y
  un rollback correcto.
- [ ] Revisar semanalmente salud, backups y alertas durante el primer mes;
  luego mensualmente.
- [ ] Revalidar trimestralmente precios, cuotas, politica de inactividad y
  estado del Free Tier.
- [ ] Mantener Docker, Linux y Tailscale actualizados con ventana y backup.
- [ ] No cambiar el hostname/RP ID sin planificar la reinscripcion de passkeys.

## Informacion que falta del propietario

No hace falta resolver todo de una vez. El agente debe pedir solo el dato de la
fase activa:

- [ ] confirmacion de que acepta una cuenta OCI Pay As You Go con alertas y
  cuotas, aunque el objetivo sea costo cero;
- [ ] home region OCI elegida despues de revisar capacidad y latencia;
- [ ] confirmacion de cuenta Tailscale y nombre deseado del nodo;
- [ ] destino de la copia cifrada fuera de la VM;
- [ ] autorizacion explicita antes de crear infraestructura;
- [ ] autorizacion explicita antes del primer despliegue.

Nunca pedir contrasenas, datos de tarjeta, private keys, auth keys, cookies ni
contenido de `.env`.

## Checkpoint

Actualizar esta tabla al terminar cada sesion. `EN CURSO` debe incluir una nota
con el bloqueo o siguiente accion; solo una fase puede estar en curso.

| Fase | Estado | Evidencia / proximo paso |
| --- | --- | --- |
| 0. Base local | COMPLETA | Commit operativo separado, Compose validado y gate Linux/Node 22 verde; `recency.js` y su test permanecen fuera del commit. |
| 1. ARM64 y consumo | PENDIENTE | Comenzar despues de cerrar la fase 0. |
| 2. Cuentas | PENDIENTE | Requiere acciones del propietario. |
| 3. IaC OCI | PENDIENTE | No crear recursos aun. |
| 4. Imagenes GHCR | PENDIENTE | Depende de compatibilidad ARM64. |
| 5. VM y Tailscale | PENDIENTE | Requiere autorizacion de infraestructura. |
| 6. Primer deploy | BLOQUEADO | Falta completar el gate y autorizacion explicita. |
| 7. Observacion | PENDIENTE | Empieza despues del primer deploy. |
| 8. Recuperacion | PENDIENTE | Definir backup externo antes de produccion. |
| 9. Operacion | PENDIENTE | Solo despues de aceptacion productiva. |

## Registro de decisiones

| Fecha | Decision | Motivo |
| --- | --- | --- |
| 2026-09-16 | Una sola produccion desde `personal` | Uso personal y menor complejidad operativa. |
| 2026-09-17 | OCI Always Free como proveedor objetivo | Evitar un costo mensual fijo conservando VM y filesystem persistente. |
| 2026-09-17 | Tailscale Serve como entrada inicial | HTTPS y acceso privado sin exponer la PC personal ni requerir dominio pago. |
| 2026-09-17 | A1 `1 OCPU / 2 GB` como punto de partida | Capacidad suficiente a validar y mejor proporcion para observar uso real. |
| 2026-09-17 | No generar actividad sintetica | Los probes pequenos no evitan la politica y fabricar carga no es una base operativa aceptable. |

## Definicion de terminado

El despliegue OCI se considera terminado solamente cuando:

1. el commit productivo y sus digests son reproducibles;
2. la aplicacion funciona desde el celular por HTTPS privado;
3. el propietario puede entrar con passkey y el registro esta cerrado;
4. los datos viven en almacenamiento persistente respaldado;
5. alertas, backup, rollback y restauracion fueron probados;
6. ocho dias de metricas justifican el tamano de la VM;
7. recrear compute desde cero no requiere datos secretos guardados en Git;
8. el checkpoint, el runbook y el registro de decisiones reflejan la realidad.
