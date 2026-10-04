# Coach y actualizacion productiva

## Objetivo y alcance

Pedido del propietario: desplegar personal actualizado y confirmar el modelo.
Imagen coach, conexion Codex y despliegue OCI por SHA. Procedimiento en
PRODUCTION_RUNBOOK/PROTECTED_OPERATIONS; checkpoint OCI canonico.

## Criterios de aceptacion

- Gate Linux/Node 22/publicacion del SHA; imagen coach reproducible.
- Codex/gpt-6.1-sol conectado y limitado al perfil propietario.
- HTTP/navegador con API/modelo reales; registro manual sin conexion.
- Backup/copia PC, deploy/aceptacion protegida, timers y cierre SSH.
- Handoffs vigentes, commits pequenos y repo limpio.

## Estado actual

Inicio personal 1d42f26 limpio; push/deploy autorizados por este pedido.
App anterior e8771b1/default, ops 9fdb243. Gate anterior completo;
Codex 0.160.0/gpt-6.1-sol 14 casos y Chrome 36 con HTTP interceptado.
Login Codex en cache no habilita credentialFor/isConnected; corregir conexion
explicita sin copiar tokens a data y con binding personal.

## Verificacion y siguiente paso

Preparar correccion/publicacion coach y probar HTTP real antes de activar OCI.
Mantener Access/WAF, datos y backup diario. Observacion hasta 12/10 16:25 AR,
simulacro 4/11; RTO pendiente y resguardo independiente diferido.
