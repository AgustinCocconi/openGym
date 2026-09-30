# Plan reanudable de produccion en Oracle Cloud

> Estado: fase 4 en curso; IaC y plan autenticado revisados, sin
> infraestructura creada ni despliegue ejecutado.
> Ultima actualizacion: 2026-09-29.

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
de `data/`, backups, cookies, secretos de OCI, tokens de Cloudflare Tunnel ni
API tokens. Los OCID no son credenciales, pero tampoco hace falta publicarlos.

## Responsabilidades

- **Agente:** cambios de codigo y documentacion, scripts, IaC, CI, pruebas,
  validaciones de solo lectura y comandos reproducibles.
- **Propietario:** altas de cuentas, MFA, aceptacion de facturacion, pantallas
  web que requieren identidad, dominio y DNS de Cloudflare, custodia de
  secretos y confirmacion de acciones con costo o destructivas.
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
| Cuenta | Conservar `Free Trial` y dejar que pase a `Always Free`; no hacer upgrade a Pay As You Go. |
| Compute inicial | Ampere A1 ARM64, `1 OCPU / 2 GB`; ajustar solo con mediciones. |
| Persistencia | Boot volume de 50 GB y block volume protegido de 50 GB montado en `/srv`; datos y backups reproducibles quedan fuera de la VM reemplazable. |
| Red y acceso | Subnet publica solo para egreso por una IP efimera, sin ingress TCP/UDP publico; SSH exclusivamente mediante OCI Bastion y HTTPS mediante Cloudflare Tunnel. |
| Hostname | `gym.mientrenadorpersonal.com.ar`; Cloudflare Access temporal durante el bootstrap. |
| Passkeys | No registrar ninguna hasta fijar y probar el hostname definitivo. |
| Imagenes | Construidas por CI desde un commit exacto de `personal`; el host no compila. |
| Despliegue | Manual para la primera version; automatizar despues de probar rollback y restauracion. |
| Inactividad | Dimensionar segun uso real y observar metricas; no generar carga artificial. |
| Recuperacion | La VM es reemplazable; los datos y la configuracion son respaldados. |

Cambiar una decision de esta tabla requiere registrar fecha, motivo e impacto
en el historial del final.

## Hechos externos que siempre se revalidan

Antes de crear recursos, consultar documentacion oficial vigente. Al
2026-09-29, OCI publica para A1 Always Free un total mensual equivalente a 2
OCPU y 12 GB de memoria, 200 GB combinados de volumenes y cinco backups de
volumen. Tambien advierte que puede reclamar compute Always Free considerado
inactivo cuando CPU P95, red y memoria permanecen simultaneamente debajo de
20 % durante siete dias.

- OCI Always Free:
  <https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm>
- Regiones y home region inmutable:
  <https://docs.oracle.com/en-us/iaas/Content/Identity/regions/managingregions.htm>
- Regiones comerciales vigentes:
  <https://docs.oracle.com/en-us/iaas/Content/General/Concepts/regions.htm>
- Fin de la promocion y cuentas pagas:
  <https://docs.oracle.com/en-us/iaas/Content/GSG/Tasks/signingup_topic-What_Happens_When_the_Promotion_Expires.htm>
- Activacion de 2-Step Verification en OCI:
  <https://docs.oracle.com/en-us/iaas/Content/Identity/mfa/enroll-2-step-verification-first-login.htm>
- Presupuestos de OCI:
  <https://docs.oracle.com/en-us/iaas/Content/Billing/Concepts/budgetsoverview.htm>
- Cuotas de compartments:
  <https://docs.oracle.com/en-us/iaas/Content/Quotas/Concepts/resourcequotas.htm>
- Cuotas de Compute y Block Volume:
  <https://docs.oracle.com/en-us/iaas/Content/Quotas/Concepts/resourcequotas_topic-Compute_Quotas.htm>
  y
  <https://docs.oracle.com/en-us/iaas/Content/Quotas/Concepts/resourcequotas_topic-Block_Volume_Quotas.htm>
- Aplicaciones publicadas mediante Cloudflare Tunnel:
  <https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/get-started/create-remote-tunnel/>
- Puertos de salida requeridos por Cloudflare Tunnel:
  <https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/configure-tunnels/tunnel-with-firewall/>
- Reglas WAF para permitir solo paises especificos:
  <https://developers.cloudflare.com/waf/custom-rules/use-cases/allow-traffic-from-specific-countries/>
- Limites de reglas WAF por plan:
  <https://developers.cloudflare.com/waf/custom-rules/>
- Quick Tunnels, solo para desarrollo y sin SLA:
  <https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/>
- Login social y segundo factor adicional de Cloudflare:
  <https://developers.cloudflare.com/fundamentals/user-profiles/login/>
  y
  <https://developers.cloudflare.com/fundamentals/user-profiles/2fa/>
- Facturacion de GitHub Actions:
  <https://docs.github.com/en/billing/concepts/product-billing/github-actions>
- Facturacion de GitHub Packages:
  <https://docs.github.com/en/billing/concepts/product-billing/github-packages>

Las cuotas y precios pueden cambiar. Una estimacion de costo cero no reemplaza
la pantalla de costos de OCI, las cuotas ni las alertas. Pasar la cuenta a Pay
As You Go no se considera una garantia documentada contra la reclamacion de
compute inactivo.

## Gate absoluto antes de desplegar

No crear la instancia productiva ni ejecutar `ops/deploy-production.sh` hasta
que todos estos puntos esten cumplidos:

- [ ] la rama `personal` contiene en commits probados todos los artefactos que
  se desean desplegar y el arbol de trabajo esta limpio;
- [x] tests, builds e imagenes ARM64 pasan para el commit exacto;
- [ ] el propietario confirmo cuenta OCI, modalidad de facturacion, region de
  origen y limites Always Free visibles en consola;
- [ ] existen cuotas y alertas que reducen el riesgo de gasto accidental;
- [ ] el dominio y hostname final de Cloudflare estan definidos; el acceso desde
  Argentina y el bloqueo desde otro pais fueron probados;
- [ ] el destino cifrado externo de backups esta definido;
- [ ] el rollback de imagen y una restauracion aislada fueron ensayados;
- [ ] el propietario autoriza explicitamente el primer despliegue.

## Fase 0 - Consolidar la base local

**Responsable principal:** agente.

- [x] Elegir OCI como proveedor objetivo y Cloudflare Tunnel con restriccion
  geografica como entrada HTTPS.
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

- [x] Verificar que las imagenes `api` y `web`, el downloader de media y todas
  las dependencias funcionen en `linux/arm64`.
- [x] Ejecutar las suites de frontend, API y MCP y el build productivo con la
  version de Node indicada por upstream.
- [x] Construir imagenes ARM64 o multi-arquitectura con Buildx sin publicarlas
  como productivas.
- [x] Arrancar el stack construido y ejecutar los smoke tests de solo lectura.
- [x] Registrar tamanos de imagen y una medicion orientativa de memoria. La
  medicion local no sustituye la metrica real de OCI.
- [x] Decidir si publicar solo `arm64` o `amd64,arm64`. Se prefiere multiarch
  si el costo de CI sigue dentro de la cuota disponible.

Validacion de fase 1 del 2026-09-17 sobre
`905f44e8695886ef4c006ce4208e737708d58bf3`:

- se exporto el commit con `git archive` a un directorio temporal aislado; los
  archivos locales `recency.js` y `recency.test.js` no entraron en tests ni en
  contextos de build;
- las bases `node:22-alpine`, `nginx:alpine` y `alpine/git` arrancaron como
  `aarch64`; el downloader clono el dataset real y produjo 1.324 JPG mas 1.324
  GIF;
- con Node 22 ARM64 pasaron frontend (1.468 tests), MCP (58) y API (181), el
  build Vite, locales, artefactos generados, carga directa y la sonda de
  fatiga. Dos tests de frontend superaron el timeout normal de cinco segundos
  solo bajo QEMU; repetidos sin cambiar codigo y con `--testTimeout=30000`,
  pasaron en 5,4 y 11,9 segundos;
- Buildx construyo y cargo localmente, sin push, `api:default`, `api:coach` y
  `web` para `linux/arm64`. El target opcional `coach` resolvio Claude Agent SDK
  0.3.223, Codex CLI 0.154.0, bubblewrap 0.12.0 y los permisos de
  `/coach-auth`;
- las imagenes sin comprimir midieron aproximadamente 166,3 MiB para
  `api:default`, 1.022,1 MiB para `api:coach` y 77,8 MiB para `web`. El primer
  despliegue conserva `API_TARGET=default`; elegir `coach` exigiria reevaluar
  el margen de disco y memoria de la A1;
- un proyecto Compose aislado arranco `api` y `web` como `aarch64`; las sondas
  de solo lectura confirmaron el nodo raiz, `/api/health` con `ok=true` y el
  contrato de `/api/config`;
- cinco muestras locales estabilizaron `api` entre 214,8 y 225,3 MiB y `web`
  entre 36,4 y 41,0 MiB, unos 251-262 MiB combinados. Son cifras bajo QEMU y
  Docker Desktop, no una medicion de capacidad ni de inactividad en OCI;
- el fork es publico. La documentacion oficial vigente indica que los runners
  estandar de GitHub Actions son gratuitos para repositorios publicos y que
  GHCR no cobra actualmente almacenamiento ni transferencia de imagenes de
  contenedor. Por eso la fase 4 publicara `linux/amd64,linux/arm64`, con cache y
  retencion acotadas, en lugar de limitarse a ARM64.

**Salida:** evidencia reproducible de que el commit candidato arranca en ARM64
y no requiere construir en la VM.

## Fase 2 - Preparar cuentas y elecciones del propietario

**Responsable principal:** propietario, guiado por el agente.

### OCI

- [x] Crear o reutilizar una cuenta OCI y activar MFA.
- [x] Elegir con cuidado la home region: los recursos Always Free de compute y
  almacenamiento deben crearse alli y la eleccion no debe hacerse sin revisar
  latencia, disponibilidad de A1 y condiciones vigentes.
- [x] Confirmar en consola los limites visibles de A1, Block Volume y backups
  para la tenancy y la home region.
- [x] Confirmar antes de provisionar que la seleccion concreta de A1, volumenes
  y transferencia conserva la elegibilidad Always Free vigente.
- [x] Evaluar y confirmar el upgrade a Pay As You Go. No compartir la tarjeta
  ni permitir que un agente complete esa pantalla.
- [x] Crear un presupuesto y notificaciones de costo. Un presupuesto alerta;
  no constituye por si solo un limite duro.
- [x] Crear cuotas de compartment que impidan superar la cantidad de OCPU,
  memoria y almacenamiento decidida para este proyecto.
- [x] Crear un compartment dedicado, por ejemplo `opengym-personal`.

El propietario solo debe devolver al chat: region elegida, nombres de
compartment/proyecto, confirmacion de MFA/PAYG y capturas sin identificadores ni
datos de facturacion si hicieran falta para diagnosticar.

Evidencia del propietario del 2026-09-29: cuenta OCI nueva ya creada, MFA
probado y home region `sa-vinhedo-1`. La lista oficial vigente identifica esa
region como Brazil Southeast (Vinhedo), realm comercial OC1 y un dominio de
disponibilidad. No se registraron OCID ni datos de identidad o facturacion.

La consola mostro uso cero y limites regionales A1 de 16 OCPU y 96 GB de
memoria. En `XOZR:SA-VINHEDO-1-AD-1`, `standard-a1-core-count` y
`standard-a1-memory-count` figuran `Dynamic`, ambos con uso cero. Block Volume
mostro `total-storage-gb` 30.720 GB en la AD, `backup-count` 100.000 regional y
`free-backup-count` 5, todos con uso cero. Son limites tecnicos de la tenancy,
no una ampliacion del cupo gratuito: la envolvente de costo cero sigue siendo
la publicada por OCI y la configuracion del proyecto se mantiene en 1 OCPU,
2 GB de memoria, hasta 100 GB combinados y hasta cinco backups. No se creo
compute ni almacenamiento.

El propietario confirmo tambien la creacion del compartment
`opengym-personal`, un presupuesto mensual y dos alertas, una por gasto real y
otra por gasto previsto. La consola identifica la modalidad actual como
`Free Trial` e indica que, si no se hace upgrade, al terminar el trial la cuenta
queda limitada a recursos Always Free. El propietario decidio conservar esa
transicion y no hacer upgrade a Pay As You Go. No se autorizan cargos ni
recursos fuera de Always Free.

La quota policy `opengym-personal-guardrails` quedo creada en la raiz con las
cuatro sentencias previstas. Tras su propagacion, `Limits, Quotas and Usage`
para `opengym-personal` mostro disponibilidad efectiva de 1 OCPU A1, 2 GB de
memoria A1, 100 GB de almacenamiento y cinco backups, todo con uso cero. La
misma vista confirmo 200 GB de volumen Free Tier y cinco backups gratuitos. No
se crearon recursos para verificar la policy.

#### Pasos del propietario en OCI

No crear todavia una VM, VCN, volumen, bucket, clave API ni usuario tecnico.
Completar estos bloques en orden; si una pantalla difiere, detenerse antes de
confirmar una accion con costo y devolver solo el nombre de la pantalla y las
opciones visibles, sin identificadores ni datos personales.

**A. Cuenta, home region y MFA**

1. Si ya existe una cuenta OCI, iniciar sesion en ella y anotar la home region
   que muestra la consola. No crear otra cuenta para cambiarla.
2. Si la cuenta es nueva, revisar antes de confirmar el alta las regiones
   comerciales cercanas que ofrezca el formulario. Para uso desde Argentina,
   comparar las opciones ofrecidas, por ejemplo `sa-vinhedo-1`,
   `sa-saopaulo-1` y `sa-santiago-1`; elegir por latencia observada y
   disponibilidad mostrada, no solo por distancia geografica. La home region
   no se puede cambiar despues de provisionar la tenancy.
3. Completar telefono y tarjeta directamente con Oracle si el alta lo exige.
   No compartirlos ni enviar capturas de esas pantallas.
4. Abrir el menu de perfil, `User settings`, `Security`, y activar
   `2-Step verification`. Preferir FIDO/passkey o una app TOTP; guardar el
   metodo de recuperacion fuera del repositorio.
5. Cerrar sesion e iniciar nuevamente para comprobar que el segundo factor se
   exige y funciona.

**B. Limites visibles, aislamiento y alertas**

1. En `Governance & Administration` / `Limits, Quotas and Usage`, seleccionar
   la home region y comprobar que aparecen `VM.Standard.A1.Flex`, al menos
   `1` OCPU y `2 GB` de memoria disponibles. Verificar tambien el total de
   Block Volume y backups. La consola de la tenancy es la evidencia final:
   capacidad fisica A1 puede faltar temporalmente aunque exista el limite.
2. En `Identity & Security` / `Compartments`, crear bajo la raiz el compartment
   `opengym-personal`, sin incluir datos personales en nombre o descripcion.
3. Crear un presupuesto mensual. Si la tenancy se dedicara solo a openGym,
   apuntarlo a la raiz para detectar cualquier gasto; si comparte otros
   proyectos, apuntarlo a `opengym-personal`. El minimo documentado es `1` en
   la moneda de la tenancy. Configurar al menos una alerta de gasto real al
   `1 %` y otra de gasto previsto al `100 %`, ambas al correo del propietario.
   Es una alarma evaluada periodicamente, no un freno de facturacion.
4. Desde `Limits, Quotas and Usage`, generar stubs de quota policy y limitar
   `opengym-personal` a la envolvente inicial acordada:

   ```text
   set compute-core quota standard-a1-core-count to 1 in compartment opengym-personal
   set compute-memory quota standard-a1-memory-count to 2 in compartment opengym-personal
   set block-storage quota total-storage-gb to 100 in compartment opengym-personal
   set block-storage quota backup-count to 5 in compartment opengym-personal
   ```

   Antes de guardar, usar los nombres exactos generados por la consola para la
   tenancy; los nombres y ambitos pueden cambiar. Estas cuotas controlan esos
   recursos, pero no impiden consumir cualquier otro servicio pago.

**C. Decision de facturacion**

1. Confirmar primero que el presupuesto, sus destinatarios y las cuotas estan
   activos.
2. La decision vigente es conservar `Free Trial` y dejar que la cuenta pase a
   `Always Free`, sin hacer upgrade a Pay As You Go. Esto prioriza el costo cero;
   no elimina la posible reclamacion de una A1 inactiva ni garantiza capacidad.
3. Si se elige PAYG, completar la aceptacion y verificacion de tarjeta solo en
   Oracle. Antes de confirmar, verificar que la pantalla no agregue compromiso
   ni recurso pago. No crear recursos como parte del asistente de upgrade.

Datos seguros para devolver al chat despues de estos bloques:

```text
OCI account: existente | nueva
Home region: <identificador de region>
MFA probado: si | no
Modalidad: Free Tier | Pay As You Go | sin decidir
A1 visible: <OCPU disponibles> / <GB disponibles>
Block Volume visible: <GB> / <backups>
Compartment: opengym-personal | otro nombre no sensible
Presupuesto y dos alertas: si | no
Cuotas A1/memoria/storage/backups: si | no
```

### Cloudflare

- [x] Elegir Cloudflare Tunnel como entrada HTTPS y bloquear mediante WAF las
  solicitudes cuyo pais de origen no sea Argentina.
- [x] Crear o reutilizar una cuenta Cloudflare.
- [x] Confirmar que la zona usa el plan `Free`.
- [x] Activar un segundo factor propio de Cloudflare. El login social con Google
  se mantiene.
- [x] Confirmar que los codigos de recuperacion quedaron guardados fuera del
  repositorio y probar un inicio de sesion nuevo con 2FA.
- [x] Agregar a Cloudflare el dominio definitivo
  `mientrenadorpersonal.com.ar`; la zona figura `Active`.
- [x] Definir `gym.mientrenadorpersonal.com.ar` como hostname estable de un
  solo nivel para conservar el certificado incluido y fijar `RP_ID`.
- [x] Usar Cloudflare Access limitado al correo del propietario durante el
  bootstrap, hasta crear la passkey y cerrar el registro publico.

Una aplicacion publicada por Tunnel requiere un dominio agregado a Cloudflare.
Los Quick Tunnels con hostname aleatorio `trycloudflare.com` no son aptos para
produccion: Cloudflare los limita a desarrollo, sin SLA ni garantia de uptime.
El dominio puede estar registrado fuera de Cloudflare, pero debe quedar bajo su
DNS para la configuracion recomendada. No crear todavia el tunnel ni compartir
tokens; eso se hace en la fase 5 directamente sobre la VM.

La regla WAF se limita al hostname de openGym, no a toda la zona, para no
bloquear otros servicios del dominio:

```text
(http.host eq "gym.mientrenadorpersonal.com.ar" and ip.src.country ne "AR")
```

La accion sera `Block`. La geolocalizacion puede tener falsos positivos y una
VPN con salida argentina puede atravesarla, por lo que no reemplaza las
passkeys, `INVITE_ONLY=1`, `ALLOW_GUEST=0` ni el cierre del registro.

El propietario registro `mientrenadorpersonal.com.ar` en NIC Argentina y
completo la delegacion de DNS a Cloudflare. El 2026-09-29 la zona paso a
`Active`. No se registraron datos de titularidad ni secretos de la cuenta.
Cloudflare Access se mantendra temporalmente durante el bootstrap. La politica
permitira solo el correo del propietario, que no debe copiarse al repositorio ni
al plan.

#### Pasos del propietario en Cloudflare

1. En la cuenta Cloudflare existente, activar 2FA adicional y guardar los
   codigos de recuperacion de forma segura. Si el perfil creado mediante Google
   no tiene password, usar `Forgot password` con el mismo correo para definir
   uno; esto permite configurar 2FA sin dejar de usar el login social.
2. Indicar si ya controla un dominio. Si no existe uno, detenerse: un dominio
   estable normalmente tiene costo anual y debe elegirse antes de registrar
   passkeys.
3. Agregar el dominio a Cloudflare y completar el cambio de nameservers solo
   despues de revisar si ese dominio ya presta otros servicios.
4. Usar el hostname de un solo nivel `gym.mientrenadorpersonal.com.ar`. No crear
   aun el tunnel, su token, una API key ni una ruta publica.
5. Preparar la regla WAF `Block` con la expresion anterior. Activarla durante
   la fase 5, antes de exponer openGym.

Datos seguros para devolver al chat:

```text
Cloudflare: cuenta existente mediante login social con Google
MFA propio de Cloudflare: activado
Recuperacion y prueba de login: confirmadas el 2026-09-29
Plan de la zona: Free
Dominio propio disponible: si
Dominio agregado a Cloudflare: `mientrenadorpersonal.com.ar` (`Active`)
Hostname: `gym.mientrenadorpersonal.com.ar`
Cloudflare Access temporal para bootstrap: si
```

**Salida:** cuentas seguras, region confirmada y limites de costo visibles.

## Fase 3 - Codificar la infraestructura OCI

**Responsable principal:** agente. El propietario aprueba el plan de OCI antes
de cualquier `apply`.

Crear bajo `ops/oci/` infraestructura reproducible, preferentemente Terraform,
sin credenciales ni secretos en el repositorio:

- [x] VCN, subnet y reglas de salida necesarias para actualizaciones,
  Cloudflare Tunnel y descarga de imagenes. `cloudflared` requiere salida por
  `7844` TCP/UDP y puede usar `443` para funciones auxiliares.
- [x] Ningun puerto publico de aplicacion. Evitar SSH publico permanente; usar
  OCI Bastion, consola u otro bootstrap acotado.
- [x] Una A1 ARM64 con `1 OCPU / 2 GB`, imagen Linux soportada y boot volume
  minimo razonable.
- [x] Un block volume separado, montado de forma estable para `data/` y otros
  directorios persistentes. Mantener el total dentro de Always Free.
- [x] Cloud-init o bootstrap idempotente para Docker Engine, Compose, Git,
  `cloudflared` y herramientas del runbook.
- [x] Etiquetas de proyecto y entorno para identificar todos los recursos.
- [x] Outputs no secretos: region, IP, IDs de recursos operativos y comandos de
  conexion. Nunca emitir tokens.
- [x] Validaciones que fallen si CPU, memoria o almacenamiento exceden los
  limites acordados.
- [x] Documento de destruccion y recreacion. Destruir sigue requiriendo
  confirmacion explicita y backup verificado.

El token de Cloudflare Tunnel debe quedar fuera de cloud-init, Terraform y sus
estados. El propietario lo obtiene en Cloudflare y lo instala directamente en
la VM durante la fase 5, sin pegarlo en el chat ni persistirlo en Git.

La implementacion vive en `ops/oci/`. Usa una subnet regional publica para dar
egreso a la VM mediante una unica IP publica efimera y un Internet Gateway, sin
NAT Gateway ni load balancer. La security list de la subnet no abre puertos y
el NSG solo admite SSH desde el endpoint privado del Bastion administrado. UFW
repite esa restriccion dentro del host; la aplicacion se enlazara a loopback.

La configuracion fija Ubuntu 24.04 ARM64, `1 OCPU / 2 GB`, boot volume de 50 GB
y un volumen de datos de 50 GB con `prevent_destroy`, montado por UUID en
`/srv`. El cloud-init prepara `/srv/opengym` y `/srv/opengym-backups`, Docker,
Compose, Git y `cloudflared`, pero no inicia un tunnel ni recibe secretos.

Validacion local del 2026-09-29 con Terraform 1.16.4 y `oracle/oci` 7.32.0:
`terraform fmt -check -recursive`, `terraform init -backend=false`,
`terraform validate` y `terraform test` finalizaron correctamente; las tres
pruebas de guardrails pasaron. Con el perfil OCI local se reviso luego un plan
real: contiene 19 creaciones, ninguna actualizacion, reemplazo o eliminacion,
y solamente VCN, Internet Gateway, route table, subnet, security list vacia,
NSG y sus nueve reglas, Bastion, A1, block volume protegido y attachment. No
incluye NAT Gateway, load balancer, DNS ni secretos. La imagen Ubuntu 24.04
ARM64 seleccionada quedo fijada en el `terraform.tfvars` local ignorado y el
plan revisado se guardo como `opengym.tfplan`, tambien ignorado. No se ejecuto
`apply` ni se creo infraestructura.

**Salida:** `terraform validate` y un `plan` revisado que solo contenga los
recursos esperados y sin secretos.

## Fase 4 - Publicar imagenes propias por commit

**Responsable principal:** agente.

- [x] Crear un workflow separado para `personal` que ejecute primero todos los
  tests y builds.
- [ ] Publicar `api` y `web` propias en GHCR para ARM64 o multiarch.
- [x] Etiquetar cada imagen con el SHA completo e incluir `personal` solo como
  alias movil.
- [x] Registrar digest y commit. Produccion consume el digest o la etiqueta
  inmutable, nunca solamente `latest` o `personal`.
- [x] No publicar secretos de build. Si el paquete es privado, el propietario
  crea y guarda el token de lectura directamente en la VM.
- [x] Adaptar `ops/compose.production.yml` y el deploy para descargar el commit
  exacto en lugar de compilar en la A1.
- [x] Conservar el rollback al digest anterior.

Implementacion local del 2026-09-29: `personal-publish.yml` reutiliza el gate
completo de `test.yml` y solo publica despues de que pase. Construye API
`default` y web para `linux/amd64,linux/arm64`, etiqueta por SHA completo y
alias `personal`, y registra cada digest en el resumen del job. El Compose
productivo apunta a `ghcr.io/agustincocconi` y el deploy descarga, verifica la
etiqueta OCI de revision y registra los digestos; ya no compila en la A1.

Falta integrar y subir estos cambios para ejecutar el primer workflow. GHCR
crea los paquetes como privados: despues de ese primer push, el propietario
debe cambiar `opengym-api` y `opengym-web` a publicos para que la VM pueda
descargarlos anonimamente. Hacer publico un paquete es irreversible en GitHub.

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
- [ ] Instalar `cloudflared` y ejecutar un named tunnel administrado por
  Cloudflare; el propietario instala el token directamente en la VM.
- [ ] Publicar el hostname definitivo hacia el puerto local de openGym y
  mantener cerrados los puertos publicos de la aplicacion en OCI.
- [ ] Activar la regla WAF que bloquea `ip.src.country ne "AR"`, limitada al
  hostname de openGym.
- [ ] Verificar desde el celular en Argentina la URL HTTPS final y comprobar
  desde una salida no argentina que Cloudflare bloquea la solicitud.
- [ ] Cerrar cualquier acceso de bootstrap que ya no sea necesario.

Registrar entonces, sin secretos:

| Dato | Valor |
| --- | --- |
| Home region OCI | `sa-vinhedo-1` |
| Compartment | `opengym-personal` |
| Shape efectiva | `1 OCPU / 2 GB` |
| Hostname Cloudflare final | `gym.mientrenadorpersonal.com.ar` |
| `RP_ID` | `gym.mientrenadorpersonal.com.ar` |
| `ORIGIN` | `https://gym.mientrenadorpersonal.com.ar` |
| Punto de montaje de datos | `PENDIENTE` |

**Salida:** host endurecido, con origen no accesible directamente y entrada
HTTPS de Cloudflare restringida geograficamente, todavia sin datos productivos.

## Fase 6 - Primer despliegue controlado

**Responsable:** conjunto. Requiere confirmacion explicita del propietario.

- [ ] Revalidar el gate absoluto y el estado limpio de `personal`.
- [ ] Crear `.env` directamente en la VM con `RP_ID` y `ORIGIN` definitivos.
  El propietario conserva los secretos y no pega el archivo en el chat.
- [ ] Descargar imagenes por SHA/digest y ejecutar el despliegue bootstrap.
- [ ] Ejecutar healthcheck y smoke antes de abrir la aplicacion.
- [ ] Mantener el hostname protegido por Cloudflare Access, limitado al
  propietario, durante el bootstrap; la regla geografica debe estar activa.
- [ ] Registrar el perfil propietario y su primera passkey desde el celular.
- [ ] Configurar `ADMIN_UIDS`, `INVITE_ONLY=1` y `ALLOW_GUEST=0`.
- [ ] Recrear los contenedores y verificar que el alta publica quedo cerrada.
- [ ] Decidir si Cloudflare Access permanece como segunda capa o se retira; la
  regla WAF para Argentina y la autenticacion de openGym permanecen siempre.
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
4. revocar el conector y token del tunnel perdido antes de reutilizar el
   hostname;
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
- [ ] Mantener Docker, Linux y `cloudflared` actualizados con ventana y backup.
- [ ] No cambiar el hostname/RP ID sin planificar la reinscripcion de passkeys.

## Informacion que falta del propietario

No hace falta resolver todo de una vez. El agente debe pedir solo el dato de la
fase activa:

- [x] modalidad OCI confirmada: conservar `Free Trial` y continuar luego solo
  con `Always Free`, sin upgrade a Pay As You Go;
- [x] home region OCI `sa-vinhedo-1` confirmada por el propietario;
- [x] plan `Free`, dominio activo y hostname definitivo confirmados en
  Cloudflare;
- [x] segundo factor propio de Cloudflare activado;
- [x] recuperacion de Cloudflare guardada y nuevo login con 2FA probado;
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
| 1. ARM64 y consumo | COMPLETA | SHA `905f44e`: 1.707 tests ARM64, tres targets construidos, downloader y smoke verdes; ~251-262 MiB combinados con `api:default` bajo QEMU. |
| 2. Cuentas | COMPLETA | Cuenta y MFA OCI probados; compartment, presupuesto, alertas y cuotas confirmados; zona Cloudflare Free activa, hostname fijo y 2FA con recuperacion y nuevo login verificados. |
| 3. IaC OCI | COMPLETA | Terraform 1.16.4 y proveedor OCI 7.32.0: formato, validacion, tres guardrails y plan autenticado verdes; 19 altas esperadas, cero cambios destructivos, imagen fijada y ningun `apply`. |
| 4. Imagenes GHCR | EN CURSO | Workflow, etiquetas, digestos y consumo sin build implementados localmente. Siguiente paso: integrar/pushear, comprobar el primer run y hacer publicos ambos paquetes GHCR. |
| 5. VM y Cloudflare | PENDIENTE | Requiere autorizacion de infraestructura. |
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
| 2026-09-17 | Publicar `amd64,arm64` en la fase 4 | El fork es publico, los runners estandar no consumen minutos pagos y GHCR mantiene gratuito el Container registry; multiarch conserva una salida fuera de A1 sin cambiar artefactos. |
| 2026-09-29 | Home region OCI `sa-vinhedo-1` | Region elegida al crear la tenancy; MFA fue activado y probado. |
| 2026-09-29 | Cloudflare Tunnel reemplaza a Tailscale | El propietario prefiere acceso web sin cliente, acepta comprar un dominio economico en NIC Argentina y solicita bloquear en WAF todo origen que Cloudflare no identifique como Argentina. El origen OCI permanece sin puertos publicos de aplicacion. |
| 2026-09-29 | Conservar OCI Free Trial y luego Always Free | El propietario prioriza costo cero y no autoriza un upgrade a Pay As You Go. |
| 2026-09-29 | `gym.mientrenadorpersonal.com.ar` como hostname final | La zona esta activa en Cloudflare Free; fija el origen y RP ID antes de registrar passkeys. |
| 2026-09-29 | Cloudflare Access temporal en el bootstrap | Restringir el alta inicial al correo del propietario hasta crear la passkey y cerrar el registro publico. |
| 2026-09-29 | 2FA propio de Cloudflare activado | Agregar una barrera adicional al login social antes de administrar DNS, Tunnel y Access. |
| 2026-09-29 | Subnet publica solo para egreso, sin ingress publico | Una IP efimera e Internet Gateway permiten actualizaciones y Cloudflare Tunnel sin el costo de NAT Gateway; NSG, security list vacia y UFW mantienen cerrados los puertos publicos. |
| 2026-09-29 | Boot de 50 GB y datos protegidos de 50 GB en `/srv` | Respeta la cuota de 100 GB del compartment, separa la VM reemplazable del estado persistente y permite conservar checkout y backups locales. |
| 2026-09-29 | P3 completa sin aplicar | Terraform 1.16.4 y proveedor OCI 7.32.0 validaron sintaxis y tres guardrails. El plan autenticado propone 19 altas esperadas, ninguna accion destructiva ni recurso fuera de alcance; la imagen quedo fijada localmente. Cualquier `apply` permanece pendiente de autorizacion explicita. |

## Definicion de terminado

El despliegue OCI se considera terminado solamente cuando:

1. el commit productivo y sus digests son reproducibles;
2. la aplicacion funciona desde Argentina por HTTPS de Cloudflare, el origen no
   es accesible directamente y una prueba desde otro pais queda bloqueada;
3. el propietario puede entrar con passkey y el registro esta cerrado;
4. los datos viven en almacenamiento persistente respaldado;
5. alertas, backup, rollback y restauracion fueron probados;
6. ocho dias de metricas justifican el tamano de la VM;
7. recrear compute desde cero no requiere datos secretos guardados en Git;
8. el checkpoint, el runbook y el registro de decisiones reflejan la realidad.
