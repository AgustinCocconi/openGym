# Despliegue de correcciones del Coach

## Objetivo y alcance

Correcciones del despliegue autorizado: pedidos sin historial, propuestas
confirmables con bandas y trabajo con cargas. Preservar datos, gpt-6.1-sol,
cuotas 30/30 y Access/WAF, sin cambios de infraestructura/autenticacion.

## Criterios de aceptacion

SHA publicado/CI verde; backup consistente, copia PC y restore aislado;
API_TARGET=coach, API/web saludables, prompts y reglas exactos; HTTPS AR y
WAF confirmado; timers activos/accesos propios cerrados. Retirar tras accepted.

## Referencias

[Checkpoint](../../adaptive-training/OCI_DEPLOYMENT_PLAN.md),
[runbook](../../adaptive-training/PRODUCTION_RUNBOOK.md),
[operaciones protegidas](../../../ops/PROTECTED_OPERATIONS.md).
Escenario coach-request-without-history, reglas/evidencia en protocolo y mapa.

## Estado y verificacion

2eb87ea4cdbd74c3b2fe972cf027963c80a4095d/coach instalado; CI/publicacion
37355654587 verde. HTTPS AR 18:32 UTC; registro cerrado/un perfil, modelo real
Codex 0.160.0/gpt-6.1-sol OK, privilegios reducidos, propietario y cuotas 30/30.
API/web healthy del SHA exacto; hashes de prompts, lectura de bandas y
candidatos cargables instalados verificados en el contenedor.
Windows Node 24.15.0: API 245 pass/1 skip; frontend 329 pass/7 archivos, incluido
probe privado de respuesta real. Build/assets/core/contexto OK. Regresion roja
reprodujo 14 fallos; corregida valida bandas, custom y flags, CLI/HTTP/BYOK,
confirmar/undo y rechazo sin mutaciones ante edicion real. Modelo sintetico real:
1 intento/60 candidatos, baja 0991 + 2 altas con barra/maquina; confirmar/undo OK.
Diagnostico solo lectura: pending usaba hash legado; perfil ya declara cargas.
60 candidatos pasan de 19 bandas/1 dumbbell a 6 bandas/4 dumbbell y cubren las
14 clases declaradas. Se incluye eq canonico; no se modifica el plan del usuario.
Propuesta anterior requiere revision nueva; no reescribir su fingerprint.

Backup previo 18:30:57 UTC de 240605f, archivo 2eb87ea4cdbd; SHA256
e39629ac46ba2fb86bd8d01a4868b83a40f1d7baf595d168464822b2633a27fb.
Age en /srv/opengym-encrypted; copia PC autorizada en openGym-backups/
transfer-9b6e80806c6f4769ad0d194e1964c173. Restore 7 archivos/2.29 s, checksums y
limpieza plaintext verificados. Timers activos; acceso propio deploy-bands
Managed SSH DELETED; claves/config retiradas. Navegador/CDP cerrado. Evidencia ignorada
en .production-state/deploy-bands; recuperacion independiente diferida.

## Pendiente y continuacion

Estado remoto pending-external. Ultima prueba exterior: 5/10 18:35:18 UTC
(15:35 AR), BR/403, Ray a45e8681ab20af8f-GRU. Falta confirmacion del propietario
de evento Block/opengym_argentina_only; pregunta anterior 14:15 AR sin respuesta.
No inferir regla desde 403. Backup diario bloqueado hasta accepted; manual
consistente verificado. Tras confirmacion, abrir ventana propia nueva, refrescar
HTTPS y ejecutar accept-production.sh para SHA exacto; comprobar backup/timers.
Constancia remota .production-state/https-2eb87ea.receipt, maximo 30 min.
