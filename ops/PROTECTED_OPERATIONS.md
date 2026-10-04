# Sondas protegidas y recuperacion OCI

Preparacion para fase 6. El [checkpoint](../docs/adaptive-training/OCI_DEPLOYMENT_PLAN.md#checkpoint)
conserva estado y autorizaciones. Ningun comando de esta capsula autoriza deploy,
cambios Cloudflare o restaurar datos productivos. Mantener Access propietario,
OTP/24 h y WAF fuera de Argentina. No crear bypass ni excepcion para Brasil.

## Salud del origen y estado del deploy

El deploy verifica por http://127.0.0.1:WEB_PORT desde OCI. SMOKE_ORIGIN_URL
acepta solo esa IP y puerto valido; RP_ID/ORIGIN siguen siendo el dominio HTTPS.
No envia cookies por HTTP. El smoke comprueba frontend, health, cierre del
registro y configuracion del contenedor. Un fallo interno mantiene el rollback
automatico de imagenes si habia un stack previo completo.

Si pasa, deployments.tsv/current.env quedan pending-external. Eso no acredita
HTTPS, WAF ni alta del propietario. Primero registrar la passkey y cerrar
INVITE_ONLY/ALLOW_GUEST segun runbook. Un fallo externo impide aceptar: usar el
rollback del runbook; en el primer bootstrap sin stack previo detener api/web
y conservar datos para diagnostico. Nunca restaurar datos automaticamente.

Para diagnostico en el host, con WEB_PORT=8080:

~~~sh
PRODUCTION_URL=https://gym.mientrenadorpersonal.com.ar \
SMOKE_ORIGIN_URL=http://127.0.0.1:8080 CHECK_CONTAINER_CONFIG=1 \
  sh ops/smoke-production.sh
~~~

## HTTPS argentino con Access

Despues del deploy autorizado y cierre del registro, desde Windows en Argentina,
iniciar sesion con el propietario en la app. En DevTools > Application >
Cookies del dominio gym, obtener CF_Authorization de esa aplicacion.
[Cloudflare](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/application-token/)
documenta la cookie de aplicacion; es una credencial de sesion. No usar el
token API revocado ni el del conector, ni pegar cookies en chat/argv/Git.

Elegir un directorio privado fuera del checkout y un archivo nuevo:

~~~powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\ops\smoke-protected.ps1 -Commit SHA_COMPLETO_DESPLEGADO -ReceiptPath C:\RutaPrivada\https.receipt
~~~

El wrapper pide la cookie en entrada oculta, crea un archivo temporal con ACL
solo del usuario y lo elimina al terminar. curl recibe solo su ruta. No amplia
Access. El smoke exige TLS/HTTP 200 sin seguir redirects, frontend/health/config
cerrado y cdn-cgi/trace loc=AR. La constancia contiene SHA/origen/fecha y resultados,
sin cookie, correo, IP ni datos. Transferir solo esa constancia al host.
Para otro sistema: SMOKE_ACCESS_COOKIE_FILE con cookie jar Netscape privado,
SMOKE_COMMIT y SMOKE_RECEIPT_FILE; nunca enviar la cookie al host de Brasil.

## Aceptacion del mismo candidato

Desde OCI provocar la denegacion HTTPS exterior. El propietario confirma en
Cloudflare el evento reciente: hostname gym, pais distinto de AR, accion Block
y regla opengym_argentina_only. Registrar Ray ID; un 403 solo no prueba esa regla.
Con la constancia argentina de menos de 30 minutos, ya en el host:

~~~sh
commit=$(git rev-parse HEAD)
waf_ray=RAY_ID_CONFIRMADO
CONFIRMED_WAF_COMMIT="$commit" \
CONFIRMED_WAF_RAY="$waf_ray" CONFIRMED_WAF_COUNTRY=BR \
  sh ops/accept-production.sh "$commit" /ruta/privada/https.receipt
~~~

La confirmacion WAF es del operador, no una consulta API automatica. No ampliar
permisos ni recrear token API para comprobarla. accept-production verifica SHA
de estado/HEAD/constancia y labels de ambos contenedores; revalida salud interna,
RP_ID/ORIGIN y registro cerrado. Solo entonces registra la aceptacion y cambia
current.env a accepted. Constancia vieja, otro candidato, origen o imagen,
registro abierto, health fallido o evento sin confirmar dejan estado pendiente.

## Copia cifrada y simulacro aislado

Destino elegido: esta PC; propietario difiere resguardo independiente el 4/10.
Instalar age en el equipo que cifra y
python3 para verify-backup-restore. Generar identidad privada en el equipo del
propietario, fuera de Git y OCI, con permisos privados y copia de recuperacion
separada. A OCI se entrega solo el destinatario publico.
[age](https://github.com/FiloSottile/age) documenta generacion/cifrado/descifrado.

~~~sh
umask 077
age-keygen -o /ruta/privada/identity.txt
age-keygen -y /ruta/privada/identity.txt
sh ops/encrypt-backup.sh /srv/opengym-backups/opengym-data-FECHA-SHA.tar.gz age1DESTINATARIO /srv/opengym-encrypted
~~~

Transferir .age, .age.sha256 y .age.meta fuera de OCI por Bastion/SSH; verificar
sha256sum -c desde el destino externo. Encrypt exige checksum original y no
sobrescribe. El .meta lleva checksum del original; mantenerlo con permisos privados.
En equipo de recuperacion, descifrar a un archivo nuevo, verificar su SHA-256
contra original_sha256 del .meta y crear el .tar.gz.sha256 esperado por el helper.
Ensayar sh ops/verify-backup-restore.sh <tar.gz> <directorio-aislado-vacio>.
Rechaza checksum, rutas fuera de data, traversal y enlaces antes de extraer;
no reemplaza data de un checkout. Comparar los datos ficticios restaurados.
Antes de deploy acreditar tambien custodia externa/identidad recuperable.

## Recuperacion Windows

Usar %LOCALAPPDATA%/openGym-backups para age/sha256/meta y recipient.txt;
identity.txt queda en %LOCALAPPDATA%/openGym-recovery, con ACL solo del usuario.
Age portable: %LOCALAPPDATA%/openGym-tools/age/v1.3.2/age. Version/SHA-256
del ZIP contrastados con la [release oficial](https://github.com/FiloSottile/age/releases/tag/v1.3.2).
Registrar solo destino, permisos y resultado. custody-status.json distingue
fixture de backup productivo y no confirma resguardo independiente.

Cuando el propietario retome el resguardo, copiar identity.txt al medio elegido.
Recuperarla
a una ruta privada nueva y verificar con esa copia el descifrado del fixture,
su SHA-256 y contenido restaurado. Dos carpetas de esta PC no acreditan
recuperacion ante perder el equipo.

Con rutas privadas elegidas, para descifrar una copia transferida:

~~~powershell
$age = Join-Path $env:LOCALAPPDATA 'openGym-tools\age\v1.3.2\age\age.exe'
if (Test-Path -LiteralPath $restoredArchive) { throw 'Elegir un archivo nuevo.' }
& $age --decrypt -i $recoveredIdentity -o $restoredArchive $encryptedArchive
if ($LASTEXITCODE -ne 0) { throw 'Descifrado fallido.' }
Get-FileHash -LiteralPath $restoredArchive -Algorithm SHA256
~~~

Contrastar con original_sha256 del .meta privado; verificar tambien checksum
del .age copiado. Una restauracion productiva requiere su permiso separado.
