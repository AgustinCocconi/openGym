# Preparar Cloudflare para OCI

Procedimiento de fase 5; estado y permisos solo en el
[checkpoint](../../docs/adaptive-training/OCI_DEPLOYMENT_PLAN.md#checkpoint).
Aplicar con el permiso vigente de Cloudflare; instalar credenciales y probar
el origen requiere una nueva ventana del host, separada de la delegacion API.

## Revision previa

Confirmar zona mientrenadorpersonal.com.ar activa, plan Free, 2FA y Zero Trust
Free. Inventariar DNS, tunnels, aplicaciones/policies Access y reglas WAF;
conservar configuracion previa y no reemplazar recursos desconocidos. Revisar
cupo WAF: Free admite cinco reglas custom por zona. Si falta capacidad o un
paso exige contratar, detenerlo y revisar con propietario.

Valores: named tunnel opengym-personal, hostname exclusivo
`gym.mientrenadorpersonal.com.ar`, origen `http://127.0.0.1:8080` y Access
limitado al correo del propietario confirmado en privado. Sin comodines ni
ruta a la IP publica de OCI. El token del connector se instala manualmente;
no entra en Terraform, Git, cloud-init, historial, logs ni chat.

## Limites del plan Free

Los 100.000 requests/dia y 10 ms CPU/request de la captura son de
[Workers Free](https://developers.cloudflare.com/workers/platform/limits/).
Este diseno ejecuta openGym en OCI; no usa Workers ni sus cuotas de ejecucion.
Tunnel/Access no trasladan la CPU de la aplicacion a Cloudflare.
[WAF Free](https://developers.cloudflare.com/waf/custom-rules/) admite cinco
reglas custom; contar todas antes de agregar. Access limita el bootstrap a un
propietario. Revalidar planes/cupos; no contratar ni ampliar limites.

## Delegar por API token local

En My Profile > API Tokens > Create Token, usar Custom Token temporal
opengym-oci-setup. Limitar Account Resources a la cuenta del dominio y Zone
Resources solo a mientrenadorpersonal.com.ar; vencimiento 24 h. Permisos:

| Ambito | Permiso | Acceso |
| --- | --- | --- |
| Account | Cloudflare Tunnel | Edit |
| Account | Access: Apps and Policies | Edit |
| Account | Access: Identity Providers | Edit |
| Account | Access: Organizations | Read |
| Zone | DNS | Edit |
| Zone | Zone WAF | Edit |
| Zone | Zone | Read |

Organizations Read permite revisar el equipo Zero Trust existente; Identity
Providers Edit permite preparar One-time PIN si falta. Los cambios se acotan
a los recursos propios revisados. No habilitar planes pagos ni alterar
proveedores de identidad ajenos. Propietario confirma Free/2FA vigentes.

Ejecutar en PowerShell local, con el mismo usuario de Windows que este entorno:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\Github\openGym\ops\oci\save-cloudflare-token.ps1
```

Pegar el token solo en el prompt oculto. El script guarda SecureString/DPAPI en
%LOCALAPPDATA%/openGym-oci-cloudflare/api-token.clixml, fuera del checkout,
con ACL solo del usuario. No imprime el token y preserva un archivo existente;
-VerifyOnly comprueba lectura/cifrado local, sin validar permisos Cloudflare.
DPAPI requiere el mismo usuario/equipo. Avisar token listo sin revelar su valor.
Al terminar, revocar en dashboard, verificar por API y retirar copia DPAPI.
Conservar la credencial del connector fuera de Terraform/Git.
El alcance API no abre la nueva ventana del host ni autoriza deploy.

[Crear token](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/),
[permisos](https://developers.cloudflare.com/fundamentals/api/reference/permissions/) y
[DPAPI/CLIXML](https://learn.microsoft.com/powershell/module/microsoft.powershell.utility/import-clixml).

## Aplicacion por API

Leer zona exacta y derivar su cuenta; verificar token activo/Free y guardar
antes/propuesta/IDs propios en directorio privado con ACL. Releer inmediatamente
antes de cada escritura; detener ante DNS ocupado, nombres repetidos o cambios
concurrentes. Crear el tunnel remoto sin persistir token/credentials_file del
POST; guardar solo metadata necesaria. Crear una regla en la fase custom vacia,
sin reemplazar rulesets previos. Si la fase existe, revisar su version/reglas.

Con Access habilitado por propietario, preservar IdPs y aplicaciones ajenas.
Agregar OTP si falta; aplicacion self_hosted al hostname exacto, solo ese IdP,
sesion 24 h y HttpOnly. Policy Allow solo al correo confirmado, sin Bypass ni
Everyone. Releer app/policies efectivas antes de publicar ruta/DNS. Comparar JSON con
claves ordenadas y arrays preservados; revisar defaults del servidor. Copias y
reversion privadas no deben contener el token API ni credencial del connector.

## Orden en el dashboard, despues del permiso

1. En Zero Trust > Access controls > Applications, crear una aplicacion
   Self-hosted and private con Add public hostname para el hostname exacto,
   sin restringir path. Allow solo al correo confirmado del propietario;
   configurar su proveedor de identidad o One-time PIN y revisar duracion
   de sesion. Revisar policies efectivas y evitar Bypass/Everyone.
2. En la zona, agregar una regla WAF custom, accion Block, para:
   `(http.host eq "gym.mientrenadorpersonal.com.ar" and ip.src.country ne "AR")`.
   Conservar reglas ajenas y revisar si hay excepciones que la omitan.
3. En Networking > Tunnels, crear el named tunnel. Instalar el connector
   manualmente en la VM durante la nueva ventana; revisar servicio systemd
   y conectividad saliente TCP/UDP 7844 sin abrir ingress publico.
4. Con Access/WAF revisados, agregar Routes > Add route > Published application:
   subdominio gym, dominio mientrenadorpersonal.com.ar, Service URL
   http://127.0.0.1:8080. Verificar DNS generado, asociacion al tunnel correcto
   y estado Healthy. Conservar evidencia sin tokens/IDs privados.

## Ventana del connector propuesta

Maximo 60 min desde abrir SSH; permiso separado segun REMEDIATION.md. Revalidar
Managed SSH/sudo, /srv, swap, agente/UFW, units y puerto 8080 libre; preparar
recuperacion/copia privada. Abortar si hay recursos o servicios desconocidos.
Sin reboot, upgrades, apply ni deploy de openGym; no tocar sus datos.

1. Comprobar cloudflared >=2025.4.0 y soporte --token-file. Obtener el token
   propio solo durante la ventana y transportarlo por stdin a SSH; guardar
   /etc/cloudflared/opengym-token root:root 0600, directorio 0700. Crear servicio
   propio opengym-cloudflared.service, sin secreto en argv/environment/logs:
   cloudflared tunnel --no-autoupdate run --token-file /etc/cloudflared/opengym-token.
   Usar logs info y metricas solo loopback; conservar servicio/config previa.
2. Servicio temporal opengym-tunnel-smoke.service: python3 http.server en
   127.0.0.1:8080, directorio exclusivo /run/opengym-tunnel-smoke, pagina y salud
   estaticas sin datos privados. Limitar RuntimeMaxSec al cierre de la ventana;
   registrar runtime/huella y validar listener/curl local.
3. Releer Access/WAF/IDs propios; aplicar propuesta privada: ingress hostname
   a http://127.0.0.1:8080 y catch-all http_status:404; CNAME proxied al tunnel.
   Probar Healthy/HTTPS, login OTP desde AR, rechazo de otra identidad y bloqueo
   desde OCI Brasil con evento WAF correspondiente. Propietario hace login/eventos.
4. Retirar servicio/archivos de prueba y accesos propios. Si todo pasa, conservar
   connector/ruta/DNS protegidos para futuro deploy; origen queda sin aplicacion.
   Si falla, retirar solo ruta/DNS propios, detener connector y retirar/revocar
   credencial propia; mantener Access/WAF. Releer salud del host al cerrar.

[Parametros y token-file](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/configure-tunnels/run-parameters/).

## Prueba y cierre

En ventana autorizada, usar un servicio de prueba aislado y descartable en
loopback 8080; registrar nombre/runtime/huella (o imagen/digest) y comprobar
que no se enlaza en 0.0.0.0/IPv6. No despliega openGym ni escribe sus datos.

Exigir salud interna, HTTPS con Access desde celular argentino, rechazo de
identidad no permitida y bloqueo WAF real desde otro pais. Una cabecera
CF-IPCountry inventada no simula geolocalizacion; comprobar eventos de la
regla en el dashboard. Retirar el servicio de prueba y accesos temporales.

Sin Analytics Read, usar Analytics > Events. Free muestrea logs: ausencia
no prueba bloqueo. No ampliar permisos.
[Eventos](https://developers.cloudflare.com/waf/analytics/security-events/).

Las [sondas protegidas](../PROTECTED_OPERATIONS.md) preparadas para fase 6
separan salud interna por loopback, HTTPS autenticado desde Argentina y
confirmacion del evento WAF exterior. Su evidencia local no acredita el SHA
publicado ni la app desplegada. Conservar Access/WAF; passkeys y cierre del
registro siguen siendo controles propios de openGym.

Reversion: retirar primero ruta/DNS creados para este hostname, detener el
connector nuevo y revocar su token; retirar solo Access/regla propios cuando
ya no haya ruta publicada. Restaurar cambios a recursos previos desde la copia
revisada. No borrar otros tunnels, aplicaciones, policies ni reglas.

## Fuentes oficiales

- [Tunnel por dashboard](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/get-started/create-remote-tunnel/).
- [Access para aplicacion propia](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/).
- [Reglas custom y limites](https://developers.cloudflare.com/waf/custom-rules/).
- [Restriccion por pais](https://developers.cloudflare.com/waf/custom-rules/use-cases/allow-traffic-from-specific-countries/).
