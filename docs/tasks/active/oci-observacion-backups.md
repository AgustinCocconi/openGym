# Observacion OCI y backups periodicos

## Objetivo y alcance

Completar fases 7 y 8 conservando destino PC y resguardo independiente diferido.

## Criterios de aceptacion

- Ocho dias de salud/recursos/OOM/reinicios sin brechas y revision CPU/red OCI.
- Backup diario consistente/cifrado, retencion 14 y checksum fuera del host.
- Restauracion aislada mensual y RPO real registrado; RTO productivo pendiente.
- Gate aprobado antes de activar; acceso temporal cerrado al terminar.

## Contexto y zona afectada

[Checkpoint](../../adaptive-training/OCI_DEPLOYMENT_PLAN.md#checkpoint),
[rutina](../../../ops/PRODUCTION_ROUTINE.md),
[runbook](../../adaptive-training/PRODUCTION_RUNBOOK.md#backup-periodico).
Colector Python, backup shell, receptor/simulacro Windows, systemd y tests/CI.
Checkpoint y evidencia de fase 6 integrados al cierre autorizado por el propietario.

## Estado actual

Actualizacion de produccion solicitada y aceptada: 3dbc82f/coach,
[gate/publicacion OK](https://github.com/AgustinCocconi/openGym/actions/runs/37247336190).
Codex/gpt-6.1-sol conectado al propietario; permisos privados, /srv persistente.
Cuota/costo/alertas: ultima revision 4/10, sin ampliacion de recursos.

Timers activos: observacion cada cinco minutos; backup 08:00 UTC/05:00 AR.
Desde primera muestra hasta 5/10 00:50 UTC: 68 muestras, cero brechas/errores/OOM;
siete Docker starting por backups/deploy, loopback siempre OK. 4 reemplazos/5
cambios de arranque; conservar eventos para la revision de ocho dias.

Copia posterior al deploy: 5/10 00:46:11 UTC, transferida 00:49:55 UTC;
RPO 0,06 h. Restore aislado real: seis archivos/2,25 s; plaintext retirado.
Constancias privadas: %LOCALAPPDATA%/openGym-backups/transfer-5b0ae69017f4435998f7cc1ff75aed1a
(transfer-verification.json y .age.restore-*.json).
No acredita ocho dias, custodia independiente ni RTO productivo.
Copia diaria requiere PC/Bastion temporal; no hay SSH permanente.

## Verificacion

- Gate GitHub del SHA: frontend/API/MCP/imagen/operaciones/contexto OK.
- Linux/Docker Node 22: 19 tests operativos y 7 Python OK; age/restore reales.
- Windows: receptor y simulacro con fixtures OK; transferencia/restore OCI reales OK.
- Rotacion retiene el archivo nuevo aun con nombres posteriores; fixture sin
  colision temporal. Locks impiden parada simultanea; SHA app/delta validado.
- Shell/PowerShell/systemd verificados; npm run check:context OK sin ampliar limites.

## Siguiente paso y handoff

Ambas ventanas propias DELETED; claves/config retiradas; resumen privado guardado.
Retoma: continuar observacion/copias; no redesplegar por cambios documentales.
Mantener copia PC diaria tras 05:00 AR; siguiente ventana 5/10/2026. Revisar
RPO/avisos/colector. Desde 12/10/2026 16:25 AR, ejecutar
informe desde 2026-10-04T19:18:55Z, exigir ocho dias completos sin brechas,
contrastar CPU/red OCI y revisar evento del backup antes de cerrar fase 7.
Repetir simulacro el 4/11/2026; resguardo independiente sigue diferido.
Completar fase 8 cuando continuidad/RPO y recuperacion esten acreditados;
RTO 60 min aun requiere ensayo productivo. Al completar, integrar y retirar tarea.
