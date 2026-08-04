# QA — Panel de Plataforma (checklist firmable, FE7)

> **Guion de QA manual del panel super admin** (`/platform/*`). Se firma vista por vista
> antes de dar el panel por cerrado. Backend dev en `:3000` (seed `admin@axi.dev /
> AxiPlatform123!`), frontend en `:3001`. Marcar cada celda al verificarla.
>
> Deuda registrada: **smoke E2E automatizado pospuesto** (decisión jul 2026) — este
> checklist es el sustituto manual hasta que se agende Playwright + wiring de CI.

## Dimensiones (aplican a TODAS las vistas)

- **C** Carga: skeleton estructural al navegar en frío (F5), sin saltos de layout.
- **V** Vacío: estado explícito con icono + frase + acción sugerida.
- **E** Error: `ProblemAlert` con mensaje ES del diccionario (§7) + reintento; nunca `detail` en inglés.
- **T** Tema: correcto en light **y** dark.
- **K** Teclado: todo operable con Tab/Enter/Espacio; focus visible (anillo coral); focus trap en modales/drawers.
- **Cp** Copy: español, tuteo, verbos de acción; sin códigos crudos fuera de contextos `mono`.

## Checklist por vista

| Vista | C | V | E | T | K | Cp | Firma |
|---|---|---|---|---|---|---|---|
| `/platform/login` (401, 429 countdown, `next` validado) | ☐ | — | ☐ | ☐ | ☐ | ☐ | |
| ReLoginModal (T−2 banner, T−0 bloqueante, F5 con exp vencido) | — | — | ☐ | ☐ | ☐ | ☐ | |
| `/platform` Dashboard (KPIs cuadran; card en error no tumba el resto) | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | |
| `/platform/tenants` (facets, búsqueda, suspender ConfirmTyped) | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | |
| `/platform/tenants/new` (wizard, borrador sobrevive re-login, nit_taken) | ☐ | — | ☐ | ☐ | ☐ | ☐ | |
| Detalle · Resumen (breadcrumb con NOMBRE, no UUID) | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | |
| Detalle · Usuarios (read-only) | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | |
| Detalle · Plan & Límites (re-siembra, source, LimitsEditor, 409 CTA) | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | |
| Detalle · Base de datos (máquina de estados, checklist, migrate-data) | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | |
| Detalle · Auditoría (company_id fijado, sin selector) | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | |
| `/platform/plans` (código inmutable, desactivar, cost cap único) | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | |
| `/platform/pricing` (upsert, cerrar vigencia, fallback `*`) | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | |
| `/platform/audit` (filtros, JsonDiff, filas de riesgo, trace copiable) | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | |
| `/platform/analytics` (degraded banner, semáforos §4, alertas read-only) | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | |
| Sidebar (badge alertas = meta.total; countdown; logout) | — | — | — | ☐ | ☐ | ☐ | |

## Guion E2E manual por fase (FE1 → FE7)

> Prerrequisitos: backend `:3000` con seed, frontend `:3001`, y para FE4 una
> PostgreSQL de prueba accesible (ideal: una sin `unaccent` para ver el remedio).
> Para probar la expiración sin esperar 15 min, baja `expires_in` en el backend dev.

### FE1 — Auth y shell
1. ☐ Sin sesión, ir a `/platform/tenants` → redirige a `/platform/login?next=/platform/tenants`; tras login vuelve a esa ruta.
2. ☐ Credenciales malas → «Credenciales inválidas» (sin distinguir campo).
3. ☐ 6 intentos seguidos → botón deshabilitado con countdown 60 s (429).
4. ☐ F5 con sesión viva → sesión restaurada (sin re-login). Chip `mm:ss` visible en el footer del sidebar.
5. ☐ A T−2 min aparece el banner ámbar con countdown; «Renovar ahora» abre el modal sin esperar a T−0.
6. ☐ A T−0 el ReLoginModal es bloqueante (sin ✕ ni ESC); renovar conserva la ruta y el estado de la vista.
7. ☐ F5 con token vencido → modal con email pre-llenado (nunca redirect).
8. ☐ «Salir» → `/platform/login`; sessionStorage sin claves `axi.platform.*`.
9. ☐ El panel de tenant (`/dashboard`, `/workspace/inbox`) sigue intacto.

### FE2 — Tenants
1. ☐ Lista: búsqueda por nombre y por NIT, facets estado/país combinados, orden por columnas, paginación; «Limpiar filtros» regresa a la página 1.
2. ☐ Wizard: elegir país autollenan moneda y zona horaria; generador de contraseña + copiar funcionan; en el paso Plan, enterprise sale deshabilitado con tooltip.
3. ☐ «Atrás» conserva lo escrito; dejar vencer la sesión a mitad del wizard → renovar → el borrador sigue intacto.
4. ☐ NIT repetido → el wizard vuelve al paso 1 con error inline en NIT.
5. ☐ Alta exitosa → detalle con banner de credenciales del owner (copiar funciona; al descartar no vuelve a aparecer, ni con F5).
6. ☐ Renombrar inline (✎, Enter guarda / Escape cancela); suspender exige escribir el nombre exacto y el badge cambia a «Suspendido» en lista y detalle tras el re-fetch; reactivar con confirm simple.
7. ☐ Tab Usuarios: read-only (sin menús de acción), búsqueda nombre/email, orden; deep-link con F5 directo a `/users` funciona.

### FE3 — Planes y límites
1. ☐ Crear plan: el código valida el formato en vivo; código repetido → error inline sin cerrar el drawer.
2. ☐ Editar plan: código y tier con candado «Inmutable tras la creación».
3. ☐ LimitsEditor: activar cost cap fuerza periodo «Ciclo» (candado); un segundo cost cap queda deshabilitado con tooltip; duplicado (métrica, periodo) se resalta; contador n/30; previews `$/USD` y bytes.
4. ☐ Desactivar plan: el copy menciona los suscritos; solo bloquea nuevas asignaciones (reversible).
5. ☐ Asignar plan al tenant: límites `source: plan` re-sembrados (badge violeta) y los `manual` (ámbar) conservados.
6. ☐ Asignar enterprise sin DB activa → alert del 409 con CTA que navega al tab Base de datos.
7. ☐ Editar límites del tenant: aviso «Se reemplaza el set completo»; un `usage/limit_invalid` del server deja el editor abierto con el mensaje.

### FE4 — DB dedicada y migración
1. ☐ Tab sin DB → EmptyState + «Configurar conexión» → estado `pending`.
2. ☐ Validar → checklist ✔/✘ con remedios (sin `unaccent`: snippet `CREATE EXTENSION` copiable).
3. ☐ «Provisionar» solo se habilita con checklist verde; el poll de 3 s avanza `validating → migrating → active` y se DETIENE solo (verificar en Network).
4. ☐ Credenciales rotas → `error` con `last_error` legible + «Reintentar provisión».
5. ☐ Editar conexión: aviso «vuelve a pending»; contraseña vacía conserva la actual; escribir una nueva = rotación.
6. ☐ Editar/validar durante una provisión → toast «Provisión en curso».
7. ☐ Deshabilitar con plan enterprise vigente → mensaje del 409 con referencia al tab Plan.
8. ☐ Migrate-data: precondiciones ✔/✘ (la de plan con link); ConfirmTyped exige el nombre y advierte la ventana de mantenimiento; progreso por fases con filas por modelo (poll 5 s); salir de la vista y volver → sigue corriendo; un terminal `failed` muestra panel rojo con `error` + stats origen/destino.
9. ☐ Con el ReLoginModal abierto, TODO polling se detiene (Network en silencio) y se reanuda al renovar.

### FE5 — Pricing y auditoría
1. ☐ Crear tarifa (aviso de upsert visible); repetir (proveedor, modelo, fecha) → se sobreescribe.
2. ☐ Editar: proveedor/modelo/«Vigente desde» con candado + callout del versionado; poner «Vigente hasta» la cierra.
3. ☐ «Cerrar vigencia hoy» → la tarifa queda atenuada; crear la nueva vigencia → verde «Vigente».
4. ☐ Toggle «Solo vigentes»; `*` con badge violeta «fallback»; costos con hasta 6 decimales USD/MTok y margen `×n`.
5. ☐ Auditoría: el filtro de acción devuelve SOLO esa acción; «Acción personalizada…» aplica al dar Enter; el `limit` en Network nunca supera 200.
6. ☐ Expandir un `platform.tenant_updated` → diff campo → antes → después legible; `trace_id` copiable; ip y entidad visibles.
7. ☐ Las filas de riesgo (`auth.platform_login_failed`, `tenancy.*`) llevan borde rojo sutil; badges de actor violeta/gris/azul.
8. ☐ Tab Auditoría del tenant: `company_id` fijado, sin selector de tenant.

### FE6 — Analytics y dashboard
1. ☐ Los 6 KPIs cuadran: conteos por estado + Σ usuarios contra `/platform/tenants`, y «Alertas activas» = `meta.total` de triggered.
2. ☐ El badge del sidebar coincide con ese total; se oculta en 0.
3. ☐ Apagar una DB dedicada → `degraded: true` → DegradedBanner ámbar y las tablas siguen mostrando lo que llegó.
4. ☐ Una card del dashboard en error muestra su alerta inline sin tumbar las demás.
5. ☐ Triage: «Ordenado por severidad» respetado; 3 clicks en un header → asc → desc → orden del backend; semáforos según umbrales (§4); score null → «—»; periodos 1/7/30/90; «actualizado hace Xs» refresca cada 60 s.
6. ☐ Alertas: los 3 sub-tabs mapean al query param; barra valor-vs-umbral; sin botones de acción (read-only); fila → detalle del tenant.

### FE7 — Endurecimiento
1. ☐ Provocar `tenant_db/not_active` y `usage/plan_code_taken` → mensajes en ESPAÑOL del diccionario (no el detail inglés).
2. ☐ F5 en `tenants/new` y en cada tab del detalle → skeleton estructural sin saltos de layout.
3. ☐ Analytics solo con teclado: Tab entra a las filas, Enter/Espacio abre el tenant, focus visible coral.
4. ☐ Breadcrumb del detalle: nombre del tenant + «Base de datos» (nunca UUID ni `database`).
5. ☐ Recorrer todo en dark mode; verificar `prefers-reduced-motion` si aplica.

## Camino crítico (guion manual — sustituye al E2E pospuesto)

1. ☐ Login con seed → redirige a `?next` o `/platform`.
2. ☐ Crear tenant (wizard completo, plan sbs) → detalle con banner de credenciales (una sola vez).
3. ☐ Tab Base de datos → configurar conexión → **validar** (checklist verde contra la PG de prueba).
4. ☐ **Provisionar** → poll 3 s avanza `validating → migrating → active` y se detiene solo.
5. ☐ Tab Plan → asignar **enterprise** → ahora acepta (DB activa); límites re-sembrados con `source: plan`.
6. ☐ Auditoría global registra cada paso (`platform.tenant_created`, `tenant_database_*`, `tenant_plan_assigned`).
7. ☐ Durante cualquier paso: dejar vencer la sesión → ReLoginModal → renovar → el estado se preserva y el polling se reanuda.

## Errores §7 — verificación por código

| Provocación | `code` esperado | UX esperada |
|---|---|---|
| NIT repetido en el wizard | `identities/nit_taken` | Paso 1, error inline en NIT |
| Código de plan repetido | `usage/plan_code_taken` | Error inline en código, drawer abierto |
| Enterprise sin DB activa | `tenant_db/not_active` | Alert + CTA "Configurar base de datos →" |
| Disable con plan enterprise | `tenant_db/in_use` | Mensaje + referencia al tab Plan |
| PUT database durante provisión | `tenant_db/provision_in_progress` | Toast "espera a que termine" |
| Validar contra host inválido | `tenant_db/connection_failed` | ✘ Conexión con remedio |
| 6º intento de login | `429` | Botón con countdown 60 s |
| Límite inválido (server) | `usage/limit_invalid` | Editor abierto + mensaje |

## Guion manual — Calidad (F1–F5)

Prerrequisitos: seed (7 escenarios system + suite `basic_smoke`) y un tenant demo con agente activo.

1. **Escenarios**: filtrar por origen/estado y buscar en server (sin parpadeo al paginar). Ver un system (solo lectura, "Clonar" como única salida) → clonar (code snake_case; duplicado → error inline) → el clon se abre en edición. Crear escenario con criterios cruzados inválidos (`escalated`+`not_escalated`) → el editor lo dice en vivo y el submit se bloquea. Archivar → desaparece de Activos → Restaurar.
2. **Suites**: crear suite → se abre la composición → añadir/ordenar (↑↓)/quitar (1–50, sin duplicados) → guardar (PUT total). `basic_smoke` solo lectura. Escenario archivado en una suite → aviso "no se ejecuta".
3. **Ejecuciones**: `/platform/quality` cae en Ejecuciones. Wizard: tenant suspendido deshabilitado; sin agente activo → EmptyState; QA exige suite XOR escenarios; estrés muestra ocupación en vivo y bloquea >3600 s; `no_pricing` en real → CTA "usar mock". Crear estrés mock 2×2 → aterriza en el detalle → se completa solo (~20 s). Segunda ejecución sobre el mismo tenant mientras corre → `run_already_active` con CTA a la lista.
4. **Detalle/case**: tiles y métricas al finalizar (latencias con semáforo); tabla de cases con búsqueda local; case → transcript tipo chat + timings; en QA además checks ✓/✗ y juez (`invalid_criteria` en ámbar = escenario roto). Cancelar solo visible en vuelo; Purgar (ConfirmTyped con el nombre del tenant) → Purgando → Purgada; el case purgado explica la ausencia de transcript.
5. **Depurador**: aviso de auditoría visible; tenant → contactos (cap 25, badge "Simulada") → conversaciones → "Descargar reporte" SIEMPRE pasa por la advertencia PII; md descarga con el nombre del `Content-Disposition`; json también; token vencido a mitad → error legible + ReLoginModal.

| Provocación | Código esperado | UI esperada |
|---|---|---|
| PATCH a escenario system (fila sin Editar; via API) | `quality/scenario_immutable` | Toast con mensaje ES |
| Clonar con code existente | `quality/scenario_code_taken` | Error inline en `code` |
| Segunda ejecución en el mismo tenant | `quality/run_already_active` | Alerta en revisión + CTA a la lista |
| Estrés real sin pricing del modelo | `quality/spend_cap_exceeded` (`no_pricing`) | Alerta + CTA "Cambiar a modo mock" |
| Cancelar una completada (carrera) | `quality/run_not_cancelable` | Toast honesto |
| Purgar una en curso (carrera) | `quality/run_not_purgeable` | Toast honesto |

**Firmado por:** ______________ · **Fecha:** ______________ · **Commit:** ______________
