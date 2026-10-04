# Preparar recuperacion por consola OCI

Procedimiento de fase 5 probado en ventana autorizada, incluido arranque serial.
Resultado en [checkpoint](../../docs/adaptive-training/OCI_DEPLOYMENT_PLAN.md#checkpoint),
orden de ventana en [REMEDIATION.md](REMEDIATION.md#autorizacion-y-orden).
Cada futura ventana/reinicio requiere su permiso; recuperar accesos al abrirla.

## Credencial temporal y prueba de consola

Esperar ACTIVE con limite explicito y dar tiempo a la propagacion; un timeout
de dos minutos no acredita fallo del plugin. Conservar IDs propios hasta
verificar DELETED. Con Managed SSH/sudo, verificar password/keyboard-interactive SSH
cerrados. Respaldar en root:root, directorio 0700/archivos 0600, password y fecha
de ultimo cambio originales de ubuntu sin imprimirlos. Generar clave aleatoria
temporal en memoria; instalar por stdin sobre SSH cifrado, sin texto en
argumentos, archivos, Git, chat ni logs. No cambiar root, keys, sudo ni SSH.

Antes de habilitarla, armar timer persistente habilitado con OnActiveSec=15min
y backup privado; al arrancar vuelve a contar desde su activacion. OnBootSec
puede disparar de inmediato en un host ya encendido. Restauracion bajo lock.
Actualizar bajo lock de password, preservando todos los demas campos/usuarios.
Consola RSA y huella verificadas: probar login ubuntu, ejecutar id, sudo -n true
y lectura de /srv. Exigir shell con sudo; login visible no basta. Oracle distingue
[transporte y login](https://docs.oracle.com/en-us/iaas/Content/Compute/References/serialconsole.htm).
Mantener la clave solo durante prueba/ventana aprobada; al terminar restaurar
password/fecha originales, exigir L y preservar concurrencia. Si vence el plazo
o se cierra la prueba antes de la ventana, preparar otra al necesitar consola.

## Menu de arranque por serial

Respaldar /etc/default/grub, grub.d y /boot/grub/grub.cfg en directorio privado.
No sobrescribir un snippet existente sin revisar su copia. Instalar
/etc/default/grub.d/99-opengym-console-recovery.cfg root:root 0600:

```sh
GRUB_TERMINAL="console serial"
GRUB_SERIAL_COMMAND="serial --unit=0 --speed=9600 --word=8 --parity=no --stop=1"
GRUB_TIMEOUT_STYLE=menu
GRUB_TIMEOUT=10
```

Confirmar ttyS0/baud antes de instalar; conservar default, kernels e initrd.
Con permiso, update-grub y grub-script-check /boot/grub/grub.cfg; revisar serial,
terminal_input/output console+serial, menu/timeout 10 y ambos kernels/recovery.
La [configuracion GRUB](https://www.gnu.org/software/grub/manual/grub/html_node/Simple-configuration.html)
permite terminales combinados y espera de menu. La preparacion no incluye reinicio.
El menu serial y la seleccion real del kernel se prueban solo durante un
reinicio autorizado con consola conectada; no certificarlos por validar archivos.

## Reversion y cierre

Restaurar solo password/fecha de ubuntu si coinciden con lo instalado; si cambian,
detener y preservar concurrencia. Comprobar restauracion exacta y root intacto;
retirar hash temporal y deshabilitar/retirar solo timer/service propios;
systemctl daemon-reload y comprobacion independiente. Conservar backup privado.
Restaurar el snippet previo o retirar solo el creado; regenerar/validar GRUB.
Si la generacion falla, restaurar configuracion y grub.cfg respaldados antes
de cualquier reinicio. Comprobar SSH/sudo, /srv, agente, UFW y units. Revocar
conexiones propias, retirar claves locales y dejar el resultado en checkpoint.

Para leer bytes de swap: `swapon --show=SIZE --bytes --noheadings`.

## Copias para reversion

Copias privadas del host de la ventana 3/10, root:root 0700/0600; revisar
antes de restaurar archivos o habilitar servicios, con permiso vigente:

- GRUB: /root/opengym-recovery-20261003T185800852-23509d.
- APT/SSH: /root/opengym-recovery-20261003T194307983-b7b501/maintenance.
- SSH/RPCbind: /root/opengym-maintenance-20261003T195629680.
- Tunnel/consola: /root/opengym-recovery-20261003T231955481-0f9d20.
- Tunnel/consola siguiente: /root/opengym-recovery-20261004T003048713-602f8f.
