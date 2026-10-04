# Auditoria de dependencias pendientes

## Objetivo y alcance

Revisar hallazgos npm del 4/10/2026 y corregir versiones afectadas con cambios
minimos, separados de Coach y OCI. Revalidar upstream antes de elegir el delta.

## Criterios de aceptacion

- Auditar variante API default, API con SDK opcional, MCP y tooling frontend.
- Contrastar advisories y uso efectivo; actualizar manifests/lockfiles pertinentes.
- Gate Linux/Node 22, assets/contexto y compatibilidad de proveedores pasan.
- Registrar hallazgos resueltos y diferidos con motivo; retirar tarea al cerrar.

## Estado y evidencia

No se actualizaron dependencias en el cierre; solo se realizo auditoria real.
Checkout 526bbb0, npm del contenedor Node 22. Resultados npm audit:

| Alcance | Moderados | Altos | Criticos |
| --- | --- | --- | --- |
| Frontend completo | 3 | 9 | 1 |
| Frontend omit=dev | 0 | 0 | 0 |
| API omit=dev,optional (imagen default) | 0 | 1 | 0 |
| API omit=dev (incluye SDK opcional) | 3 | 2 | 0 |
| MCP omit=dev | 3 | 1 | 0 |

API default: undici directo. Con SDK opcional y MCP aparece ademas fast-uri
transitivo. El critico frontend es tar del tooling; tambien hay hallazgos en
Capacitor/assets, sharp y
otras transitivas. Estos resultados son reportes del grafo de dependencias;
revisar rutas usadas por la app y reconsultar antes de modificar versiones.
Logs locales ignorados en .production-state/final-review-evidence:
dependency-audit.jsonl y api-default-audit.json.

Fuentes primarias consultadas para orientar la revision:
[undici](https://github.com/nodejs/undici/security/advisories/GHSA-w293-vg96-wgc3)
y [fast-uri](https://github.com/fastify/fast-uri/security/advisories/GHSA-hrr3-gc8f-f4qj).
El reporte contiene otros advisories; comprobar todos los del paquete afectado.

## Siguiente accion y continuidad

Priorizar undici del runtime API default; luego fast-uri de SDK/MCP y tooling.
Reproducir auditoria por variante y revisar solucion minima compatible, sin
actualizacion masiva forzada. Ejecutar gate sobre checkout limpio del candidato.
Publicacion/deploy son pasos separados: no avanzar OCI a codigo no aceptado,
ni interrumpir backups/observacion para una actualizacion no planificada.
[Coach](coach-adaptativo-validacion.md) y
[OCI](oci-observacion-backups.md) conservan sus estados propios.