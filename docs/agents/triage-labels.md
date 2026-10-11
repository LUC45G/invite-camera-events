# Triage labels

Los cinco roles canónicos se registran con estos valores en el tracker local:

| Rol de la skill | Label local | Significado |
| --- | --- | --- |
| `needs-triage` | `needs-triage` | Requiere evaluación del responsable. |
| `needs-info` | `needs-info` | Falta información para continuar. |
| `ready-for-agent` | `ready-for-agent` | Especificado y listo para un agente. |
| `ready-for-human` | `ready-for-human` | Requiere intervención humana. |
| `wontfix` | `wontfix` | No se realizará. |

Cuando una skill solicite aplicar un rol de triage, usar el label de esta
tabla en la línea `Status:` del ticket local. Editar esta tabla si cambia
el vocabulario acordado para el repo.
