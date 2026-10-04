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
Preservar cambios ajenos Coach/localizacion y evidencia previa de fase 6 sin commit.
Checkpoint local actualizado; no mezclar sus cambios previos al integrar esta tarea.

## Estado actual

Propietario autorizo commit/push/activacion. Ops 9fdb243 publicado y activo;
[gate/publicacion OK](https://github.com/AgustinCocconi/openGym/actions/runs/37227664601).
App/imagenes e8771b1 aceptadas; delta ops/docs/CI validado sin redesplegar app.
Host limpio, /srv persistente, modos 0700/0600 y cuatro alarmas OCI OK.
Cuota ACTIVE y costo cero para 27/9-3/10 UTC; ninguna ampliacion de recursos.

Timers activos: observacion cada cinco minutos; backup 08:00 UTC/05:00 AR.
Primera muestra y fecha de cierre en checkpoint. Tres muestras iniciales,
sin brechas/errores de captura/OOM. Backup reinicio API una vez; loopback OK,
Docker starting transitorio registrado; muestra 19:25 UTC api/web healthy.

Primera copia cifrada productiva 4/10 19:19:01 UTC, transferida 19:20 UTC:
antiguedad 0,02 h; restore real de cinco archivos en 2,02 s, plaintext retirado.
Constancias privadas: %LOCALAPPDATA%/openGym-backups/transfer-a909f6e8404244cba2f7679144ce9b55
(transfer-verification.json y .age.restore-*.json); resumen routine-9fdb243-20261004.json.
No acredita ocho dias, custodia independiente ni RTO productivo.
Copia externa diaria requiere PC/Bastion temporal; no hay SSH permanente.

## Verificacion

- Gate GitHub del SHA: frontend/API/MCP/imagen/operaciones/contexto OK.
- Linux/Docker Node 22: 19 tests operativos y 7 Python OK; age/restore reales.
- Windows: receptor y simulacro con fixtures OK; transferencia/restore OCI reales OK.
- Rotacion retiene el archivo nuevo aun con nombres posteriores; fixture sin
  colision temporal. Locks impiden parada simultanea; SHA app/delta validado.
- Shell/PowerShell/systemd verificados; npm run check:context OK sin ampliar limites.

## Siguiente paso y handoff

Sesion DELETED; claves retiradas, cero sesiones/consolas; resumen privado guardado.
Mantener copia diaria
PC tras 05:00 AR y revisar RPO/avisos/colector. Desde 12/10 16:20 AR, ejecutar
informe desde 2026-10-04T19:18:55Z, exigir ocho dias completos sin brechas,
contrastar CPU/red OCI y revisar evento del backup antes de cerrar fase 7.
Repetir simulacro el 4/11; resguardo independiente sigue diferido.
Completar fase 8 cuando continuidad/RPO y recuperacion esten acreditados;
RTO 60 min aun requiere ensayo productivo. Al completar, integrar y retirar tarea.