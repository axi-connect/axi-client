# Consola de plataforma — sección Calidad (`/platform/quality`)

Herramienta del super admin para medir y probar los agentes de IA de cualquier tenant. Todo el consumo de IA se cobra a plataforma (`bill_to: platform`), nunca al tenant. Plan completo: `docs/plans/quality_upgrade_plan.md`.

## Pestañas

| Pestaña | Ruta | Qué hace |
|---|---|---|
| Simulacro | `/quality/simulator` | Chat en vivo con el agente de un tenant por el pipeline real: texto, toques de botones con id real, imagen (reconocimiento), nota de voz (transcripción), ubicación. Inspector con estado y traza por turno. Tope por sesión y diario global. |
| Ejecuciones | `/quality/runs` | Corridas QA (escenarios + checks + juez), estrés (carga sintética) y probe (capacidad × dataset). |
| Escenarios | `/quality/scenarios` | Persona, objetivo, criterios v2 (25 kinds agrupados por familia), nombre del contacto simulado y fotos que envía el cliente. |
| Suites | `/quality/suites` | Conjuntos ordenados de escenarios (`adversarial_v2`, `capabilities_core`…). |
| Datasets | `/quality/datasets` | Golden sets por tenant y capacidad importados del tráfico real (PII enmascarada, fotos sin EXIF) y banco de etiquetado con atajos. |
| Capacidades | `/quality/capabilities` | Estado de las 18 capacidades del agente según las últimas ejecuciones QA y probes (90 días). |
| Depurador | `/quality/debugger` | Conversaciones reales de un tenant, reporte de diagnóstico y «Convertir en escenario». |

## Piezas del cliente

- Dominio (TypeScript puro): `src/modules/platform/domain/quality*.ts` — criterios v2, sesiones, datasets/probes, capacidades.
- Hooks: `src/modules/platform/infrastructure/api/hooks/use-quality-*.ts`, `use-tenant-lookup.ts`, `use-tenant-agents.ts`.
- Vistas: `src/modules/platform/ui/features/quality/` (`simulator/`, `runs/`, `scenarios/`, `suites/`, `datasets/`, `capabilities/`, `debugger/`, `shared/`).
- «Convertir en escenario» (`shared/ConvertToScenarioButton.tsx`) aparece en el depurador, en el detalle de un case y en una sesión terminada: pide un borrador al servidor y abre el formulario de escenario prellenado; nada se guarda hasta «Guardar».

## Contratos

`src/core/api/schema.d.ts` se **empalma**, no se regenera entero: el contrato del cliente va por delante del `main` del servidor. Se añaden solo los paths, schemas y operations que cambiaron.
