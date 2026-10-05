# Coach productivo y aislamiento de credenciales

## Objetivo y alcance

Pedido propietario: publicar personal, confirmar modelo, elevar a 30/dia y revisar
suplantacion/uso de su cuenta. OCI y capsulas son fuentes canonicas de operacion.

## Criterios de aceptacion

- Gate Linux/Node 22 del candidato, imagen coach por SHA y deploy protegido.
- Codex/gpt-6.1-sol conectado al propietario, limites 30/dia.
- Modelo sin herramientas de host; canary sintetico inaccesible y UI/API reales OK.
- Copia PC/timers/SSH cerrados, conocimiento integrado, commits y repo limpio.

## Estado actual

e66f583/coach aceptado: HTTPS AR y WAF BR confirmado, un perfil/cero invitaciones.
CLI 0.160.0/modelo real, cache 0700/0600 fuera de data, binding propietario.
Cuotas 30/30 verificadas. Coach PAUSADO hasta publicar aislamiento de herramientas.
Revision: read-only permitia leer canary dentro de coach-auth; no se pidieron tokens.
Candidato desactiva shell/exec/imagen/agentes/apps/plugins/browser/hooks/web.
Con candidato, modelo responde pero no lee canary. Gate/UI reales por repetir.
Sesiones app 90 dias; robo de sesion admin o de credencial OCI evade limites app.
Access/passkey/CSRF conservados; no equivale a auditoria exhaustiva de seguridad.

## Verificacion y siguiente paso

Publicar mitigacion con gate, desplegar/aceptar nuevo SHA y reactivar 30/dia.
App manual disponible. Backup PC/restore seis archivos/RPO 0,04 h OK.
Observacion 59 muestras sin brechas/OOM: cuatro starting por mantenimiento,
loopback OK. Revisar ocho dias desde 12/10 16:25 AR; copia diaria tras 05:00 AR,
simulacro 4/11, RTO pendiente/resguardo independiente diferido.
