# Remediaciones OCI previas al primer despliegue

Fases 2/5: evidencia y permisos en el
[checkpoint](../../docs/adaptive-training/OCI_DEPLOYMENT_PLAN.md#checkpoint).
Permisos acotados en checkpoint; cada nueva accion exige su autorizacion.

Windows/Node 24.15.0: guard POSIX (7 casos), render Compose 2.24.4
(default/custom) y check:context/test:context (6 tests) OK. Sin nuevo gate
Linux/Node 22; evidencia remota solo en checkpoint.

## Autorizacion y orden

Ventana host del 3/10 completada; futuras ventanas requieren permiso separado.
Permisos separados: seguridad/reinicio/SSH/RPCbind; cuota E2 con permiso del propietario;
cuatro alarmas + topic/email propio. No ejecutar deploy/apply, cambios de cuenta,
reemplazos ni backups OCI. La plantilla cloud-init no corrige el host existente.

1. Propietario confirma Free Trial/Always Free sin PAYG, avisos y copia de policy.
2. Conservar Managed SSH/sudo; conectar consola con nueva clave temporal.
   Revalidar shell/sudo; probar menu serial durante el reinicio autorizado.
3. Respaldar, refrescar indices y aprobar seguridad efectiva (omitir si vacia).
   Excluir updates generales. Resolver reboot pendiente con permiso y controles.
4. Endurecer SSH, probar segunda sesion; luego RPCbind tras revisar NFS/dependencias.
   Fallos de acceso, montaje, agente, dpkg, UFW o units detienen la secuencia.
5. Aplicar cuota con permiso; alarmas nacen deshabilitadas, se revisan y activan
   tras recepcion probada. Compose llega mediante futuro deploy aprobado.
6. Revocar sesiones/retirar claves propias; actualizar checkpoint. Revalidar al
   abrir ventana: los timers siguen activos y pueden cambiar el host.

## Acceso y recuperacion previa

Consola/sudo, menu serial, kernel nuevo y cierre probados: evidencia en
checkpoint. Renovar clave temporal al abrir futuras ventanas segun
[RECOVERY.md](RECOVERY.md).

## Parches de seguridad

En la ventana aprobada, crear respaldo privado y refrescar indices:

```bash
opengym_maintenance_dir="/root/opengym-maintenance-$(date -u +%Y%m%dT%H%M%SZ)"
sudo install -d -m 0700 "$opengym_maintenance_dir"
sudo cp -a /etc/ssh /etc/apt "$opengym_maintenance_dir/"
dpkg-query -W | sudo tee "$opengym_maintenance_dir/packages.tsv" >/dev/null
sudo apt-get update
sudo apt-get --simulate upgrade
sudo unattended-upgrade -v --dry-run
```

Revisar lista/origenes: solo seguridad Ubuntu y dependencias aprobadas, sin
Pro/ESM ni repos nuevos. Bajas, altas inesperadas u origenes ajenos detienen.
No borrar locks ni forzar retenidos con dist-upgrade; esperar apt/dpkg legitimo
sin matar procesos ni detener timers.

Allowed-Origins no debe habilitar updates/PPAs ajenos. Si el dry-run coincide,
ejecutar `sudo unattended-upgrade -v`; luego `sudo dpkg --audit`, `sudo apt-get check`,
`sudo systemctl --failed` y otra simulacion. Comprobar sudo/OpenSSL y seguridad
con indices frescos; conservar timers. El conteo previo no acredita la lista.

Fuente: [actualizaciones Ubuntu](https://ubuntu.com/server/docs/how-to/software/automatic-updates/).

## Reinicio y recuperacion de parches

Leer `/var/run/reboot-required` y, si existe, su archivo `.pkgs`. Reiniciar
con `sudo reboot` solo dentro de la ventana que lo autorice. Abrir una nueva
sesion temporal al volver y comprobar cloud-init, /srv ext4/marcador, swap,
Docker/Compose, agente Snap OCI y plugin Bastion, UFW y units fallidas.

Salida: seguridad vigente, dpkg sano, reboot resuelto y nuevo acceso funcional.
packages.tsv no permite rollback de paquetes: conservar .deb/version anterior
si es viable y revisar reparacion ante fallo. Restaurar configuracion respaldada;
kernel anterior por consola solo si existe y fue comprobado. Reemplazo/snapshots
requieren otro plan/permiso y preservar /srv.

## SSH por Bastion

Preparar este archivo sin modificar claves ni configuracion del agente:

```text
# /etc/ssh/sshd_config.d/00-opengym-hardening.conf
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
X11Forwarding no
AllowAgentForwarding no
AllowTcpForwarding no
AllowStreamLocalForwarding no
DisableForwarding yes
PermitTunnel no
```

Respaldar cualquier archivo previo; instalar el snippet root:root, modo 0600.
Ubuntu toma el primer valor: revisar Includes y bloques Match, y verificar
`sudo sshd -t` y `sudo sshd -T -C user=ubuntu,host=localhost,addr=<IP_PRIVADA_BASTION>`;
repetir para root. Exigir root/password/keyboard-interactive/forwarding/X11
cerrados y pubkey habilitada. No cambiar AuthorizedKeysCommand ni borrar keys.

Con la primera conexion abierta, ejecutar `sudo systemctl reload ssh.service`;
probar una segunda sesion Managed SSH nueva como ubuntu y sudo antes de cerrar
la primera. El ProxyCommand termina en Bastion: no requiere forwarding en la VM.
Si falla, restaurar el snippet previo (o retirar solo el nuevo si no existia),
validar sshd y recargar desde la sesion conservada o la consola probada.

Fuente: [OpenSSH en Ubuntu](https://ubuntu.com/server/docs/how-to/security/openssh-server/).

## RPCbind y fwupd

Revisar `findmnt -t nfs,nfs4`, unidades y
`systemctl list-dependencies --reverse --all rpcbind.service rpcbind.socket`,
ademas de `apt-cache rdepends --installed rpcbind`: nfs-client.target no acredita
un montaje. Exigir /srv ext4 y ausencia de consumidores antes de deshabilitar:

```bash
sudo systemctl disable --now rpcbind.socket rpcbind.service
sudo ss -lntup
sudo systemctl --failed --no-pager
```

Salida: sin listeners TCP/UDP 111 en IPv4/IPv6, acceso/montaje/agente sanos.
Reversion: ambos estaban enabled; `sudo systemctl enable --now rpcbind.socket rpcbind.service`.
No desinstalar. fwupd diferido: ubuntu-server depende de el; medir beneficio/
activacion D-Bus. No purgar el metapaquete ni cerrar agente/parches para ganar RAM.

## Cuota E2

Con permiso del propietario: en opengym-personal-guardrails, preservar las cuatro
sentencias de A1/storage/backups y proponer estas dos al final, en este orden:

```text
zero compute quotas vm-standard-e2-1-micro-count in compartment opengym-personal
set compute quota vm-standard-e2-1-micro-count to 1 in compartment opengym-personal where request.ad = '<AD_HOME>'
```

AD_HOME: `terraform -chdir=ops/oci output -raw availability_domain`, sa-vinhedo-1.
Zero cierra otros AD/regiones; set habilita una E2 en el AD revisado. Revisar
consola/policies heredadas. No cambia VM ni garantiza costo cero de otros servicios.

Releer policy y Limits, Quotas and Usage: E2 uso/cuota/disponible = 1/1/0;
storage 100 GB/backups cinco conservados. Sin segunda VM de prueba. Reversion:
restaurar solo sentencias E2 desde copia revisada, preservando concurrencia.
Modalidad/costos por consola; presupuesto USD 1 solo alerta.

Fuentes: [Compute Quotas](https://docs.oracle.com/en-us/iaas/Content/Quotas/Concepts/resourcequotas_topic-Compute_Quotas.htm),
[precedencia](https://docs.oracle.com/en-us/iaas/Content/Quotas/Concepts/quota_policy_syntax.htm).

## Alarmas propuestas

Con aprobacion para cuatro alarmas en opengym-personal/sa-vinhedo-1, usar el
OCID actual de la E2 en IID, sin publicarlo. A = oci_computeagent;
H = oci_compute_infrastructure_health. Demora = pendingDuration.

| Nombre | Namespace | Consulta MQL | Demora / severidad |
| --- | --- | --- | --- |
| opengym-infra-down | H | `instance_status[1m]{resourceId="IID"}.max() > 0` | PT5M / CRITICAL |
| opengym-cpu-high | A | `CpuUtilization[1m]{resourceId="IID"}.mean() > 80` | PT15M / WARNING |
| opengym-memory-high | A | `MemoryUtilization[1m]{resourceId="IID"}.max() > 70` | PT10M / WARNING |
| opengym-metrics-missing | A | `CpuUtilization[1m]{resourceId="IID"}.groupBy(resourceId).absent(2h)` | PT10M / CRITICAL |

Infra mide fallos de VM RUNNING; ausencia incluye host detenido. absent(2h)
devuelve 1 ante ausencia en 1m; 2h limita su emision continua, no demora disparo
dos horas. PT10M exige persistencia. No certifican app/Access, disco, swap ni
OOM: comprobarlos por host tras deploy.

Destino: topic opengym-personal-alerts y correo activo del presupuesto, confirmado
por propietario; no duplicar. Resolucion 1m, email ONS_OPTIMIZED, agrupado.
Repeticion PT6H, mensajes por transicion y vuelta a OK; sin SMS ni sondas de
carga. Vigilar el total de la tenancy: Always Free incluye 1000 emails/mes,
500 millones de puntos ingeridos y mil millones recuperados. Revalidar antes
de crear recursos; no cambiar facturacion para habilitarlos.

Fuentes: [metricas](https://docs.oracle.com/en-us/iaas/Content/Compute/References/computemetrics.htm),
[infra](https://docs.oracle.com/en-us/iaas/Content/Compute/References/infrastructurehealthmetrics.htm),
[ausencia](https://docs.oracle.com/en-us/iaas/Content/Monitoring/Tasks/create-alarm-absence.htm),
[Always Free](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm).

## Validacion y reversion de alarmas

Ejecutar MQL y consultas sin predicado: exigir stream/resourceId y timestamps
recientes; query aceptada sin datos no acredita emision. Crear deshabilitadas,
revisar namespace/query/demora/destino/repeticion; propietario prueba recepcion
y luego activar. Exigir OK sin disparos injustificados con series reales, sin
apagar agente ni generar carga. Recepcion pendiente hasta configurarlas.

Reversion: deshabilitar/eliminar exclusivamente alarmas y suscripcion/topic
nuevos identificados en la revision, preservando recursos previos y metricas.
Registrar nombres/resultado sin emails, claves ni tokens en el checkpoint.
