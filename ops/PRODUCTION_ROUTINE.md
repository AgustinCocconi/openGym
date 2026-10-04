# Rutina de observacion y recuperacion

El [checkpoint OCI](../docs/adaptive-training/OCI_DEPLOYMENT_PLAN.md#checkpoint)
es la fuente de estado. Estos artefactos preparados no acreditan activacion.
Reutilizan backup/smoke/restauracion existentes; upstream conserva backup manual.

## Instalacion y activacion

Usar checkout `personal` limpio con estos artefactos versionados y el codigo
app identico al SHA aceptado. La rutina comprueba ambas imagenes por revision;
un delta solo en ops/docs/CI permite activar sin redesplegar la aplicacion.
Integrar/publicar requiere permiso y gate; no copiar codigo sin versionar. Usuario operativo actual: `ubuntu`.
Revalidar Docker, /srv, los cuatro avisos OCI y destinatario publico age.
Precargar helper y age fuera de la ventana de parada. Crear directorios 0700:

~~~sh
sudo install -d -m 0700 -o ubuntu -g ubuntu /srv/opengym-observation /srv/opengym-backups /srv/opengym-encrypted
sudo install -d -m 0755 /etc/opengym
# Transferir solo recipient.txt publico de la PC a /ruta/recipient.txt.
sudo install -m 0644 /ruta/recipient.txt /etc/opengym/backup-recipient.txt
sudo install -m 0644 ops/systemd/opengym-observe.service ops/systemd/opengym-observe.timer ops/systemd/opengym-backup.service ops/systemd/opengym-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl start opengym-observe.service
sudo systemctl start opengym-backup.service
~~~

Verificar ambas ejecuciones y hacer primera copia a PC antes de habilitar:

~~~sh
sudo systemctl enable --now opengym-observe.timer opengym-backup.timer
systemctl list-timers opengym-observe.timer opengym-backup.timer
~~~

Guardar fecha real de activacion/primera muestra en checkpoint. Reversion:
`sudo systemctl disable --now opengym-observe.timer opengym-backup.timer`;
esperar servicios en curso. Datos/backups permanecen.

## Observacion de ocho dias

`observe-production.py` muestrea cada cinco minutos: CPU por contadores del
kernel, red fisica, memoria disponible, swap, OOM del kernel, identidad/
arranques/reinicios/OOM de api/web y health de loopback. JSONL 0600 fuera de Git, sin
datos de usuarios ni credenciales. No publica metricas personalizadas.

~~~sh
python3 ops/observe-production.py report --since FECHA_UTC_PRIMERA_MUESTRA
~~~

La fecha admite ISO con zona; usar `checked_utc` de la primera muestra.
El informe termina en la ultima muestra; exit 2 indica cobertura incompleta.
Exige ocho dias, extremos cubiertos y ninguna brecha >6 min, error de lectura
o contador reiniciado sin cambio de boot. Los incidentes se reportan aunque
la cobertura sea completa; el propietario debe revisarlos y decidir.

Primera muestra: 4/10/2026 16:18:55 AR (2026-10-04T19:18:55Z).
Revisar desde 12/10/2026 16:25 AR; exigir ocho dias completos desde esa muestra.
No rellenar intervalos faltantes ni generar actividad para evitar reclamacion.

CPU P95 de intervalos de cinco minutos y bytes locales son orientativos, no
reproducen el criterio OCI. Revisar CPU/red oficiales, memoria/swap y
[las cuatro alarmas](oci/REMEDIATION.md#alarmas-propuestas). Un fallo de servicio queda
en systemd; este registro no envia emails nuevos. Revisar diariamente estado
del colector y avisos OCI; su ausencia no demuestra salud de la app.
Revisar/archivar registros mensualmente.

## Backup diario y ventanas

`periodic-backup.sh`: 08:00 UTC / 05:00 Argentina, recuperando una ejecucion
omitida al encender el host (`Persistent=true`). Valida destinatario con age,
helper precargado, SHA aceptado de imagenes y delta operativo; hace smoke interno, detiene brevemente API,
respalda/checksumea, reinicia, cifra y vuelve a verificar salud.
Identidad privada solo en PC. Locks impiden backups simultaneos.
Metadata registra commit operativo y deployed_commit; el ultimo estado conserva
ambas revisiones. Falla: no avanza last-backup.env; copia externa queda pending.

Retencion explicita: ultimos 14 plaintext y ultimos 14 cifrados con sha256/meta.
Se rota despues de verificar cada etapa. Un error de cifrado conserva
plaintext nuevo para reintentar. No se restauran datos productivos.

Antes de deploy/rollback/mantenimiento manual, detener timer de backup,
esperar servicio inactivo y restaurar timer al terminar. El deploy conserva
su backup previo; no solapar operaciones de Docker durante la copia.

## Copia a esta PC

Cada dia despues del backup, abrir Bastion temporal con el procedimiento
existente. Preparar alias/config SSH privado con host ya verificado.
No ampliar allowlist, conservar claves temporales ni crear acceso permanente.

~~~powershell
powershell.exe -NoProfile -File .\ops\receive-backups.ps1 -SshTarget ALIAS_TEMPORAL -SshConfig C:\RutaPrivada\ssh.conf -SshPort 22
~~~

Destino: `%LOCALAPPDATA%/openGym-backups`. Descarga age/sha256/meta en
carpeta transfer-* con ACL del usuario, verifica checksum y referencia del
metadata. Reutiliza bytes locales verificados sin sobrescribir backups.
Constancia: ruta efectiva, fecha original y antiguedad. Backup >24 h falla
objetivo RPO aunque la transferencia sea correcta. La transferencia
no autentica por si sola metadata: eso exige el simulacro.

Cerrar/eliminar sesion y claves temporales al terminar. PC apagada o
sesion caducada impide copiar: revisar RPO diario y registrar brecha.
Timer OCI solo produce copia local; no acredita respaldo externo.
Conservar tripletas en PC; revisar espacio/retencion mensualmente y retirar
solo copias propias despues de verificar una mas reciente.

## Restauracion mensual

Usar `latest_verified_path` de una constancia de transferencia:

~~~powershell
powershell.exe -NoProfile -File .\ops\rehearse-recovery.ps1 -EncryptedArchive C:\RutaPrivada\opengym-data-FECHA-SHA.tar.gz.age
~~~

Usa age nativo existente, identidad privada y Ubuntu WSL con Python 3/Git.
Verifica cifrado, descifra en carpeta nueva con ACL privada, contrasta
original_sha256 y ejecuta helper que rechaza traversal/enlaces. Retira su
plaintext temporal antes de emitir constancia .restore-*.json.
Acredita restauracion aislada, no custodia independiente ni RTO productivo.
Mantener la decision de resguardo diferido del propietario.

Primera prueba productiva tras activar y luego cada mes; revisar constancias
y registrar resultado/RPO real en checkpoint. Restaurar produccion mantiene
su permiso separado y [runbook](../docs/adaptive-training/PRODUCTION_RUNBOOK.md#restauracion-de-datos).

## Verificacion reproducible

Linux: Node 22, Python 3, age/keygen, Git, curl, OpenSSL y utilidades GNU/flock.

~~~sh
node --test ops/production-probes.test.mjs ops/periodic-backup.test.mjs
python3 -B ops/observe-production.test.py
systemd-analyze verify ops/systemd/opengym-*.service ops/systemd/opengym-*.timer
~~~

Windows: `powershell.exe -NoProfile -File ops/receive-backups.test.ps1` y
`powershell.exe -NoProfile -File ops/rehearse-recovery.test.ps1`. Transporte
ficticio; segundo usa age real/WSL y datos sinteticos. No prueban Bastion
ni custodia productiva. Ejecutar tambien `npm run check:context`.