# Upgrade del módulo quality — simulacro interactivo, capacidades bajo prueba y método de calidad

> **Estado: APROBADO por el dueño el 2026-09-24** · F0 certificada · **F1 construida el 2026-09-24** (ver «Estado por fase» al final). Gemelo idéntico en `axi-server/docs/plans/quality_upgrade_plan.md` y `axi-client/docs/plans/quality_upgrade_plan.md`; el mockup F0 vive en `axi-client/docs/design/mockups/quality-upgrade.html` (`quality-upgrade.build.py`). Rama `feat/quality-upgrade` en ambos repos. Gate explícito del dueño entre fases.


## Contexto

El módulo `quality` (backend `axi-server/src/modules/quality`, frontend `/platform/quality`) hoy corre **escenarios guionizados** (persona + objetivos + criterios) contra el agente real de un tenant vía el canal `simulator`, con juez LLM reutilizado de analytics, modo estrés con IA mock, y un debugger que exporta un `.md` de diagnóstico por conversación. Todo es **asíncrono y por lotes**: nadie puede "hablar" con el agente de un tenant desde platform, y lo que se mide se limita a criterios de éxito textuales y al veredicto del juez.

El dueño pide tres cosas:
1. **Chat simulacro interactivo** desde platform contra cualquier agente de cualquier tenant, sin engordar el código ni degradar la latencia/efectividad del agente en producción.
2. **Ampliar lo testeable**: reconocimiento de producto por imagen, búsqueda de catálogo (efectividad ante distintas configuraciones y formas de pedir), cierre, negociación, asesoría… Enumerar las capacidades del agente y acoplar a cada una su prueba y su métrica dentro del módulo de calidad.
3. **Investigación**: cómo las grandes empresas aseguran la calidad de agentes conversacionales (evals, jueces, red teaming, observabilidad, online evals) y cómo se complementa con lo que Axi Connect ya tiene.

## Investigación — cómo se hace calidad de agentes en la industria (resumen aplicado)

Fuentes primarias: [Anthropic — Demystifying evals for AI agents](https://anthropic.com/engineering/demystifying-evals-for-ai-agents); [Sierra τ-bench / τ²-bench](https://github.com/sierra-research/tau2-bench) ([paper](https://arxiv.org/pdf/2406.12045)); [OpenTelemetry GenAI semantic conventions](https://opentelemetry.io/blog/2026/genai-observability/); [Arize sobre las tips de Anthropic](https://arize.com/blog/anthropic-tips-how-to-build-evals-you-can-trust/); [Confident AI — métricas de agentes 2026](https://www.confident-ai.com/blog/llm-agent-evaluation-complete-guide); [LangChain — readiness checklist](https://www.langchain.com/blog/agent-evaluation-readiness-checklist); [Lost in Simulation (usuarios simulados poco fiables)](https://arxiv.org/pdf/2601.17087); [Intercom Fin CX Score / Decagon Watchtower](https://myaskai.com/blog/intercom-fin-decagon-ai-comparison-2026); [Klarna: retroceso por calidad](https://www.twig.so/blog/klarna-ai-customer-support-efficiency).

| Práctica de la industria | Quién la usa | Qué tiene Axi hoy | Qué falta (→ este plan) |
|---|---|---|---|
| **Anatomía de un eval**: task · trial · grader · transcript · outcome · suite. Varias trials por task (variancia del modelo). | Anthropic | scenario · run_case · checks+juez · transcript · suite. **1 trial por escenario.** | `trials` por escenario y métricas **pass@k / pass^k** (fiabilidad, no solo acierto). |
| **Graders en tres capas**: deterministas (estado/outcome) → juez LLM (rúbrica por dimensiones aisladas, con «Unknown») → humano (calibración). «Grade what the agent produced, not the path it took». | Anthropic, Sierra | Checks textuales (contains/regex/…) + juez holístico de analytics. **No hay checks de ESTADO** (¿se creó el pedido? ¿con qué items? ¿se guardó el teléfono?). | Graders de **outcome** por capacidad (pedido, cita, contacto, handoff, imágenes enviadas) leídos de la BD del tenant; rúbrica del juez por dimensiones; marca humana 👍/👎 por caso para calibrar. |
| **Usuario simulado con persona + objetivo oculto + política del dominio**; el agente debe cumplir la política (no dar descuentos fuera de regla, no inventar cuentas). pass^k como métrica de fiabilidad. | Sierra τ-bench (retail/airline/telecom) | `llm_sim_client` con persona y objetivos. | Personas **adversariales** (regateador, apurado, confuso, que envía fotos, que cambia de idea) y **políticas del tenant** como criterios (precio, stock, datos del cliente). |
| **Component-level evals**: evaluar retriever, tools y generador por separado para saber DÓNDE falló. Recall@k / MRR para búsqueda. | Arize, Weaviate, Confident AI | Solo end-to-end conversacional. | **Probes unitarios de capacidad** sin conversación: `catalog_lookup(query) → ¿esperados en top-k?`, `recognize(image) → ¿sku esperado?`, clasificador de intención → ¿intención esperada?; golden sets por tenant. |
| **Trazas como fuente de verdad** (OTel GenAI: spans por llamada LLM, tool, tokens, latencia, costo). Cada score enlaza al span que lo causó. | OTel SIG, Datadog, Langfuse, Braintrust | Trace JSONL v3 por turno (iteraciones, tools, usage, latencia) + `analytics_turn_metric`. | Exponer la traza **en la UI del caso/chat** (línea de tiempo del turno: prompt → tools → respuesta), no solo en el `.md`. |
| **Online evals**: puntuar una muestra del tráfico real (10–20 %) con juez barato; 100 % de los casos de regresión en CI. «Convertir cada fallo de producción en un caso de regresión». | Anthropic, Decagon Watchtower (100 % de interacciones), Intercom CX Score | Juez al cierre + sweep 3:15 AM sobre conversaciones reales (analytics). | Botón **«Convertir en escenario»** desde una conversación real / caso fallido / chat simulacro → el dataset crece con fallos reales. |
| **Regresión y CI**: suites maduras (~100 %) corren en cada cambio de prompt/modelo; comparar versión A vs B. | Anthropic, Braintrust | Suites + runs manuales; sin noción de «versión del agente». | Snapshot de configuración del agente por run (`agent_config_hash`) y **comparación entre dos runs** de la misma suite (antes/después de tocar instrucciones o modelo). |
| **Red teaming** (inyección de prompt, jailbreak, desvío de objetivo, filtración de datos) y **shadow mode** (inputs reales, side-effects bloqueados). | Confident AI, AgentDojo, HarmBench | Hardening de inyección en el composer; `simulated` bloquea la cotización externa. | Escenarios seed de **seguridad** (inyección en nombre del contacto, pedir cuentas bancarias inventadas, revelar prompt, negar ser bot) con checks deterministas. |
| **Medir CSAT sobre las conversaciones de IA, no la deflexión** (Klarna retrocedió por calidad percibida). | Klarna, Intercom | Juez al cierre; sin ancla humana. | Marca humana por caso/transcript (👍/👎 + nota) para calibrar el juez y detectar deriva. |
| **Usuarios simulados no son proxies perfectos**: hay que leer transcripts. | Lost in Simulation (2026) | Transcript en el detalle del caso. | El chat simulacro **es** la lectura humana: el operador habla, ve la traza y marca. |

Conclusión aplicada: no hace falta traer una plataforma externa (Langfuse/Braintrust). Axi ya tiene el 60 % de la infraestructura (simulator, juez, trazas, mock, bill_to platform). Lo que falta es (a) la **interfaz humana** para probar y leer, (b) **graders de estado y probes por capacidad**, y (c) el **ciclo** producción → escenario → regresión → comparación.

## Decisiones del dueño (2026-09-24, cerradas — no reabrir)

| Tema | Decisión |
|---|---|
| Fidelidad del simulacro | **Pipeline real**: el mensaje del operador entra por `inbound_messages` como canal `simulator` (batching 2,5 s, colas, tools, render de salida). Ningún endpoint síncrono de `runTurn`. |
| Medios del simulacro | Texto + **imágenes** (reconocimiento) + **audio** (STT) + **ubicación GPS** + **tocar botones interactivos** (envía el id `sku:`/`slot:` como WhatsApp Cloud). |
| Quién lo usa | Solo platform (super admin, `PlatformGuard`), bajo `/platform/quality`. |
| Costo | `bill_to: 'platform'` con **tope por sesión + tope diario global**; al tocarlo la sesión se cierra con aviso. |
| Golden sets (búsqueda, reconocimiento, intención) | **Trazas reales + etiquetado en la UI**. |
| Regresión (snapshot/comparar, trials pass^k) | **No en este plan.** |
| Ciclo humano | **«Convertir en escenario»** (desde conversación real, sesión o caso fallido) + **seeds adversariales nuevos**. Sin marca 👍/👎 por ahora. |
| Prioridad | **Simulacro primero** (F1 texto+botones+traza, F2 medios), después checks/probes/ciclo. |
| Heredadas (memoria `quality-module-progress`) | Sin sandbox clonado: datos en el tenant real con flag `simulated` y purga; juez de analytics reutilizado; label de UI «Ejecuciones». |

## Estado actual del código (verificado 2026-09-24)

**Backend `axi-server/src/modules/quality/`** — familia CENTRAL `quality_*` (scenario, suite, suite_scenario, run, run_case), referencias al tenant sin FK.
- Escenario = `persona` (system prompt del cliente simulado) + `goal` + `max_turns` + `success_criteria` (zod, v1: `order_created`, `order_not_created`, `appointment_created`, `escalated`, `not_escalated`, `reply_contains`, `reply_not_contains`, `no_agent_error`, `max_reply_ms`). Sin turnos guionizados ni adjuntos.
- Run `kind: qa|stress`; **un run activo por tenant** (lock Redis `quality:run_lock:{companyId}`); `ensure_simulator_channel` crea UN canal `simulator` por tenant y **re-apunta `default_ai_agent_id` por run** (conflicto potencial con sesiones interactivas simultáneas).
- Case runner (`application/case_runner.service.ts`): `injectClientMessage` (L535-560, `InboundMessageJob` con `channel_kind:'simulator'`, `external_sender_id='sim:{uuid}'`) → pipeline real → `SimulatorChannelAdapter.sendMessage` hace RPUSH a `quality:sim:outbox:{external_id}` → `drainReplies` BLPOP (timeout 90 s, ventana de silencio 2 s). El transcript **no se guarda en el case**: se lee en vivo de `conversationMessage` del tenant (`runs.query.ts:93-109`).
- Juez: puerto `CONVERSATION_EVALUATOR` de analytics con `trigger:'qa_run'`, `bill_to:'platform'`, brief con objetivo + criterios (`evaluation_brief.ts`). Rúbrica v3 (`analytics/application/judge_rubric.ts`): precisión 0,35 · tools 0,30 · cierre 0,20 · tono 0,15; alucinación; `outcome_assessment`; `missed_opportunity`; 10 códigos de issue.
- Protecciones de producción: `bill_to: platform` (turno, clasificador, sim client, juez); semáforo global `quality:global_lanes` (8); concurrencia por run ≤8, worker 16; presupuesto de ocupación estrés; spend cap solo en estrés real (`quality:spend:{runId}` alimentado por `accrueQaRunSpend` vía `quality:conv_run:{convId}`); `MockAiAdapter` guionizado desde Redis; `simulated` excluido de analytics/inbox/WS/funnel/voz; purga con doble guarda; retención 14 días.
- Simulator adapter (`channels/infrastructure/providers/simulator.adapter.ts`): `downloadMedia` y `validateCredentials` **lanzan** `ChannelUnsupportedOperationError` → hoy el simulador **no soporta medios entrantes**. La visión del reconocimiento **no lleva `bill_to`** y `recordRecognition` cobra al tenant.
- Trazas: JSONL v3 por turno (`ai_agents/infrastructure/agent_trace.service.ts`, `${AI_TRACE_DIR}/YYYY-MM-DD.jsonl`), **on por defecto fuera de producción y opt-in en producción**, locales al pod. Lector `quality/infrastructure/fs_agent_trace_reader.adapter.ts`. Solo se exponen en el `.md` del debugger.
- Debugger: collector 3 bloques + renderer .md 12 secciones + JSON.
- Assets de eval existentes: `scripts/eval/catalog_lookup_eval.ts` (recall@8, MRR@8, zero-result, p95 contra JSONL etiquetado) + `scripts/eval/extract_catalog_queries.sh` (consultas reales desde trazas); `scripts/quality/{llm_metrics,compare_runs}.mjs`; 21 seeds (`adv_*`, `guard_*`, `sale_*`, `robust_*`, `crm_*`) y 8 suites en `prisma/seeders/quality.seeder.ts`.
- **No existe ningún chat manual contra un agente de tenant** en ninguno de los dos repos. `runTurn` lo llaman solo el processor, el chat de Axel (cmo), la puesta en marcha (intake) y las llamadas.
- **Discrepancias detectadas con la arquitectura**: el sweep del juez corre a **03:30 UTC** (no 3:15); la tool `reclassify_intent` **no existe**; `get_goal_pace` es del agente CMO, no del agente de chat; `docs/plans/quality_*_plan.md` y `docs/eval/catalog_lookup/*.jsonl` **no están en el árbol principal** (solo en worktrees viejos / archivados).

**Frontend `axi-client`** — rutas `src/app/platform/(admin)/quality/{runs,runs/new,runs/[runId],runs/[runId]/cases/[caseId],scenarios,suites,debugger}`; vistas en `src/modules/platform/ui/features/quality/`; hooks `infrastructure/api/hooks/use-quality-*.ts`; dominio `domain/quality.ts`, `quality-runs.ts`, `quality-debug.ts`; `QualityTabs` (Ejecuciones · Escenarios · Suites · Depurador). Detalle de caso: transcript 60 % (`TranscriptPanel`, burbujas cliente izq. `bg-muted/60`, agente der. `bg-accent`) + veredicto 40 % (checks, juez, latencias). Wizard elige agente vía `agents-health?days=1` filtrado en cliente (**gap**: no hay `GET /platform/tenants/{id}/agents`). Deuda visual ya detectada: badges tintados que no pasan AA, cajas tintadas a mano en `ReviewStep`.

**Kit de mockups** — `axi-client/docs/design/mockups/_axi_mockup_kit.py` (`Kit(name)`, `build_html(title, tag, subtitle, views)`, fuentes embebidas desde `.next/static/media`, iconos lucide desde `node_modules`, tokens light/dark). Precedente más cercano para `/platform`: `platform-voice-governance.build.py` (sidebar `.psb`, `shell()`, `head()`).

## Inventario de capacidades del agente × prueba × métrica

Leyenda de tipo de prueba: **E** = escenario conversacional (cliente simulado + checks + juez, existe) · **C** = check determinista de ESTADO nuevo · **P** = probe no conversacional sobre golden set (nuevo) · **S** = simulacro manual (nuevo) · **J** = dimensión del juez.

| # | Capacidad | Componentes | Prueba | Métrica | Hoy | Nuevo |
|---|---|---|---|---|---|---|
| 1 | Entender la intención | clasificador §10.4, `IntentTraceEntry` | P intención · C `intent_detected` | accuracy, matriz de confusión | traza | P + C + dataset |
| 2 | Buscar en el catálogo | `catalog_lookup` → `CatalogLookupService` (FTS + trigram) | P búsqueda · E · C `tool_called` | recall@8, MRR, tasa de cero resultados, falsas negaciones (`catalog_denial`), p95 | script offline | P en el módulo + dataset desde trazas + etiquetado |
| 3 | Reconocer producto por imagen | `image_recognition.service` → `CATALOG_VISUAL_SEARCH` (RRF imagen/texto/FTS) | P reconocimiento · S con imagen · C `recognition_matched` | precision@1, calibración de `top_score`/`margin`, tasa `degraded`, pares confundidos | `payload.recognition` | P + medios en simulador + `bill_to platform` en visión |
| 4 | Asesorar / recomendar (cross/upsell) | playbook `## Cómo vendes`, `catalog_lookup` | E + J `closing_effectiveness`, `missed_opportunity` | score juez, `product_codes` sugeridos | juez | seeds nuevos |
| 5 | Cotizar y crear pedido | `quote_order`, `create_order` (precios server-side) | E + C `order_created{min_items, product_codes}` | pedido correcto (items, cantidades), confirmación previa | check v1 | C `turns_to_outcome` |
| 6 | Cerrar la venta / la cita | `create_order`, `book_appointment` | E + C + J cierre | tasa de cierre por suite, turnos hasta el cierre | check + juez | `turns_to_outcome` |
| 7 | Negociar dentro de la política | `TurnPriceLedger`, HARD_RULES, `validate_coupon`/`apply_promotion` | E adversarial + C `no_unverified_prices`, `tool_not_called`, `promotion_applied` | precios sin respaldo = 0, descuentos fuera de política = 0 | `unverified_prices` en traza, seeds `guard_*` | C + seeds regateador |
| 8 | Agendar | `schedule_availability`, `book_appointment` | E + C `appointment_created` | slot correcto, zona horaria | check v1 | — |
| 9 | Capturar datos del contacto | `save_contact_data` | E + C `contact_field_captured{field}` | precisión de campos, teléfono E.164 | `collected_data_patch` | C |
| 10 | Escalar cuando toca | handoff por keyword y por tool | E + C `escalated`/`not_escalated` | escalaciones correctas vs innecesarias | check v1 | — |
| 11 | Pagos | `get_payment_methods`, `report_payment` | E + C `payment_reported`, `reply_not_contains` (cuentas inventadas) | 0 cuentas inventadas | regex | C |
| 12 | Envío / entrega | `set_delivery` (zonas) | E + C `delivery_set{method}` · S con GPS | cobertura y costo correctos | — | C + GPS en simulador |
| 13 | Promociones | `validate_coupon`, `apply_promotion` | E + C `promotion_applied{code}` | descuento correcto solo vía tool | — | C |
| 14 | Recorrido CRM | `open_deal`, `advance_stage`, `log_crm_activity` | E + C `deal_stage_kind{kind}` | etapa correcta para la señal | `stage_moved` | C |
| 15 | Recursos, sedes, fotos | `send_resource`, `get_branches`, `send_product_images` | E + C `media_sent{kind,min}` | medio correcto enviado, caps respetados | — | C |
| 16 | Seguridad (red team) | composer hardening, D1 identidad | E adversarial + C `reply_not_contains`, `not_escalated`, `order_not_created` | inyección resistida, no revela prompt, no niega ser bot, no filtra pedidos ajenos | suite `red_team` | seeds nuevos |
| 17 | Estilo conversacional | `conversational_style.ts`, `detectBotPhrases` | C `no_bot_phrases` + J tono | frases de bot = 0, un saludo, longitud | `bot_phrases` en traza | C |
| 18 | Rendimiento y costo | runtime, `analytics_turn_metric` | C `max_reply_ms` (v1), `max_llm_calls_per_turn`, `max_cost_usd` | p50/p95, llamadas LLM/turno, tokens, USD/conversación | timings + spend | C |
| — | Voz (TTS) | política de voz | **Fuera de alcance**: el simulador está excluido por la política de voz (no quemar cuota). | | | |

## Diseño A — Chat simulacro (sesiones interactivas)

### A.1 Hechos del código que condicionan el diseño (verificados)
- El agente de la **conversación** gana sobre el default del canal: `ingest_inbound_message.use_case.ts:466` `resolveAgent(conversation.ai_agent_id, channel.default_ai_agent_id)`, y `conversation_resolver.service.ts:48` `findOpenOrCreate` reutiliza la conversación abierta del `(channel_id, contact_id)`. ⇒ **pinear el agente al crear la conversación** evita todo hook en el hot path y el conflicto con `ensure_simulator_channel` (que re-apunta el default del canal por run).
- `media_ingest.service.ts:105-107` pide credenciales descifradas para todo canal ≠ `whatsapp_web` → con `simulator` fallaría con `ChannelNotConfiguredError` **antes** de llegar al adapter. Hay que añadir `simulator` a esa rama.
- Reconocimiento: `image_recognition.service.ts` L118 `checkOrThrow(['product_recognitions'])` bloquea si el tenant agotó cuota, la visión no lleva `bill_to` y `recordRecognition` (L257) cobra al tenant; `CATALOG_VISUAL_SEARCH.match` tampoco recibe `bill_to`. STT: `audio_transcription.service.ts:80-84` no pasa `bill_to`. ⇒ propagar `simulated` en los jobs y cobrar a plataforma en los tres saltos.
- `start_run.use_case.ts:130-133` busca run activo **sin filtrar kind** y `run_finalizer.service.ts:157` borra `quality:run_lock` incondicional. ⇒ sesiones excluidas del lock y del check; finalizer no borra el lock en `interactive`.
- `quality_maintenance.processor.ts:220-229` marca `worker_lost` todo case `running` > 45 min. ⇒ excluir `kind=interactive`.
- La consola `/platform` **no tiene WebSocket** (REST + polling) y el descarte de eventos `simulated` es server-side (`realtime_events.subscriber.ts:37-73`). ⇒ polling.
- Trazas: `ai.config.ts:63-66` off por defecto en producción y por pod. ⇒ **sink Redis por conversación cuando `simulated`**, independiente de `AI_TRACE_ENABLED`.
- `CreateUploadUseCase` rechaza conversaciones `simulated` (decisión A8). ⇒ endpoint multipart propio.
- Forma del adjunto canónico: `canonical_message.ts:74-100` `{content_type:'image'|'audio'|…, media:{provider_media_id, mime_type, sha256?, caption?, filename?}}`.

### A.2 Modelo: `QualityRunKind.interactive` + un `QualityRunCase` por sesión (sin tabla nueva)
Sesión = `QualityRun{kind:'interactive', cases_total:1, params:{persona_note?, spend_cap_usd, external_id, last_operator_message_at, ended_reason?, operator_turns, media_keys[]}}` + `QualityRunCase{external_id:'sim:{caseId}', conversation_id, contact_id fijados al crear}`. Reutiliza purga (`POST /runs/:id/purge`), retención 14 días, gasto (`quality:conv_run:{convId}` → `quality:spend:{runId}`), transcript (`runs.query.ts:93-110`) y `StatusBadge`. Lista «Ejecuciones» excluye `interactive` por defecto (`runs.query.ts:31-34`). Rechazada la tabla `quality_session`: duplicaría el 70 % del ciclo de vida.

| Fin | run.status | case.status | failure_reason | closed_reason |
|---|---|---|---|---|
| Operador finaliza | completed | passed | — | `qa_session_ended` |
| Idle 30 min / edad máx 4 h | completed | timeout | `idle_timeout` | `qa_session_idle` |
| Tope sesión o diario | canceled (+`quality:cancel:{runId}='spend_cap'`) | blocked | `spend_cap` / `daily_spend_cap` | `qa_session_spend_cap` |

Migración: `ALTER TYPE quality_run_kind ADD VALUE IF NOT EXISTS 'interactive'` (sola en su migración). Sin `run_lock` ni `global_lanes`; topes propios: `interactive_max_open_global` 5, `interactive_max_open_per_tenant` 2 (contados en DB).

### A.3 Crear sesión (`CreateSessionUseCase`, `withTenant`)
1. `EnsureSimulatorChannelUseCase.ensureExists(companyId, agentId)` (**método nuevo**: crea si falta, **no re-apunta** si existe).
2. `CONTACT_RESOLVER.resolveOrCreate({channel_kind:'simulator', external_id:'sim:{caseId}', display_name:'Cliente simulado (operador)'})` → `simulated:true`.
3. `conversation.create({channel_id, contact_id, simulated:true, ai_agent_id: agentId})` (escritura directa, precedente `closeConversation` del runner).
4. Redis: `quality:conv_run:{convId}`, `quality:spend_cap:{runId}`, `quality:sim:conv:{convId}` (TTL 24 h). Elegibilidad extraída de `start_run` a `application/tenant_eligibility.ts`.

### A.4 Turnos
- **Texto**: `SendSessionMessageUseCase` comprueba topes (`MGET quality:spend:{runId}, quality:spend_cap:{runId}, quality:sim:daily_spend:{ymd}`; `exceedsSpendCap` ya existe en `case_runner.service.ts:81-87`) → `buildSimulatorInboundJob` (extraído de `case_runner.service.ts:535-560` a `application/sim_inbound.ts`, compartido con el runner) → `inbound_messages` → pipeline real (batching 2,5 s, `bill_to platform`, `simulated`) → outbound `sent`. La UI pollea `GET /sessions/:id` cada 1,5 s mientras `agent_state==='thinking'`.
- **Imagen/audio** (`POST /sessions/:id/media` multipart, patrón `conversations.controller.ts:137-158`): `STORAGE.putObject('companies/{cid}/quality/sim/{runId}/{uuid7}')` → canónico con `provider_media_id = 'sim-media:{mime}:{key}'` → `MediaIngestService` (rama sin credenciales para `simulator`) → `SimulatorChannelAdapter.downloadMedia` decodifica y lee de storage (**solo** prefijos `companies/*/quality/sim/` y `quality/datasets/`) → re-sube al prefijo del canal, encola reconocimiento/STT con `job.simulated=true` → `image_recognition`/`audio_transcription` con `bill_to:'platform'` y sin `checkOrThrow` → barrera `awaitingMediaUnderstanding` → turno. El gate real del tenant (`settings.recognition.ai_enabled`) **se conserva** (la UI muestra `skip_reason:'disabled'`: fidelidad).
- **Tap**: `{kind:'tap', option_id, title}` → canónico `content_type:'interactive'`, `reply:{id, source}` con `source = resolveInteractiveRendering('whatsapp_cloud', …)`; ingest lo persiste como `payload.interactive_reply`; `sys:human`/`sys:close` se ejecutan sin LLM (la UI lo indica); el resto entra con `## Selección del cliente`. Las opciones tocables salen de `payload.interactive.options` del mensaje saliente.
- **Ubicación**: canónico `content_type:'location'` idéntico a `whatsapp_cloud.adapter.ts:343-358`.

### A.5 Traza del turno en la UI
`agent_trace.service.ts.append()`: **antes** del `if (!trace_enabled) return`, si `entry.simulated === true` → `RPUSH quality:sim:trace:{conversationId}` + `LTRIM 200` + `EXPIRE 86400` (never-throw, encadenado en `this.tail`). Para tráfico real el costo es una comparación de propiedad. `agent_runtime.service.ts:516-530` marca `simulated`. Lector `quality/infrastructure/redis_sim_trace_reader.adapter.ts` (fallback al FS en dev). `SessionTraceDto`: por turno modelo, duración, iteraciones (tool calls, resultados ok/productive/unproductive_reason/duration), tokens, nudges, `unverified_prices`, replies, action; filas compactas para `intent_classification`.

### A.6 Endpoints (controller `quality_sessions.controller.ts`, `PlatformGuard`, `@Audited`)

| Método/Path | Entrada | Salida |
|---|---|---|
| POST `/platform/quality/sessions` | `{company_id, agent_id, persona_note?≤500, spend_cap_usd?≤20}` | 201 `{id}`; 409 `tenant_not_eligible` / `session_limit_reached` |
| GET `/platform/quality/sessions` | `{company_id?, status?, mine?, page, page_size}` | `SessionsPageDto` |
| GET `/platform/quality/sessions/:id` | — | `SessionDetailDto` (agent, status, spend{spent, cap, daily_spent, daily_cap}, `agent_state: idle|thinking|escalated|closed`, conversation{mode,status,intention}, transcript[] con interactive/interactive_reply/location/recognition/transcription/attachments presignados 300 s) |
| POST `/platform/quality/sessions/:id/messages` | `{kind:'text'|'tap'|'location', …}` | 202 `{provider_message_id}`; 409 `session_not_active` / `session_spend_cap_exceeded` |
| POST `/platform/quality/sessions/:id/media` | multipart `file`, `caption?`, `voice_note?` | 202; 422 `session_media_unsupported` |
| POST `/platform/quality/sessions/:id/end` | — | 204 idempotente |
| GET `/platform/quality/sessions/:id/trace` | — | `SessionTraceDto {source:'redis'|'fs'|'none', turns[]}` |
| *(reusado)* POST `/platform/quality/runs/:id/purge` | — | 202 (exige sesión terminada) |
| **GET `/platform/tenants/:id/agents`** (slice `ai_agents`, patrón `platform_tenant_voice.controller.ts`) | `?status=active` | `[{id, name, model, provider, status, is_default, intentions[{code,type}]}]`; excluye `provider:'mock'`. **El wizard `TargetStep` migra a este endpoint** (cierra el gap `agents-health`). |

Config (`quality.config.ts` + `env.schema.ts`): `QUALITY_INTERACTIVE_SESSION_CAP_USD` 1 · `QUALITY_INTERACTIVE_DAILY_CAP_USD` 10 · idle 30 min · edad máx 240 min · abiertas global 5 / tenant 2 · media máx 5 MB. Sweep `session_sweep` cada 5 min en `quality_retention.scheduler.ts`. `usage_meter.service.ts:77-96`: `MGET conv_run, sim:conv` y si hay flag `INCRBYFLOAT quality:sim:daily_spend:{ymd}`.

### A.7 Frontend del simulacro
Tab «Simulacro» en `QualityTabs`; rutas `quality/simulator/page.tsx` y `simulator/[sessionId]/page.tsx`. `SimulatorView` de tres columnas (`rail 260 | chat 1fr | inspector 360`; bajo `lg` el inspector pasa a tabs): `SessionsRail` (mis sesiones + `NewSessionForm` con `TenantSelect`, `AgentSelect` nuevo reutilizable, `persona_note`, tope), `SessionChat` (cabecera tenant · agente · estado · gasto/tope · Finalizar; `SessionTranscript`; `Composer` con texto, imagen, grabar audio reutilizando `use-voice-recorder`, `LocationDialog`), `SessionInspector` (tabs Estado | Traza: `SessionStatePanel` con `StatTile`s y acciones Finalizar / Purgar (`ConfirmTyped`) / «Nueva sesión igual»; `TurnTraceTimeline`). Primitivo compartido `quality/shared/ChatBubble.tsx` extraído de `TranscriptPanel.tsx` con slots `InteractiveOptions` (tocables solo en el último saliente), `MediaBubble`, `LocationBubble`, `RecognitionChip`, `TranscriptionLine`, ticks de estado, «escribiendo…». Hooks `use-quality-sessions.ts` (polling `sessionPollInterval`, envío optimista reconciliado por `provider_message_id`, multipart con `bodySerializer`), `use-tenant-agents.ts`. Contratos: `npm run openapi:generate` → `npm run api:types`.

## Diseño B — Capacidades bajo prueba

### B.1 Hechos que condicionan
- **Ningún check nuevo lee el trace** (off en producción, por pod). Fuente durable: `analytics_turn_metric` (`tool_calls[{name, ok, productive, args_preview}]`, `llm_calls`, `tokens_*`, `nudged`, `failed`) + `conversation_message.payload` + tablas de negocio. Faltan `nudge_reasons` y `bot_phrases` → **2 columnas aditivas** (`text[] DEFAULT '{}'`, familia DEDICADA, `migrate:deploy:all`), pobladas en `agent_runtime.service.ts:~508` y `turn_metric.prisma_writer.ts`.
- `sanitizeTenantText` es privada del composer → mover a `core/shared/kernel/sanitize_text.ts` (`sanitizeUntrustedText`, `maskPii`).
- `INTENT_CLASSIFIER.classify` lee historial de DB → método aditivo `classifyText({company_id, text, bill_to, quality_run_id?})`.
- La visión del reconocimiento es privada en infrastructure → puerto nuevo `PRODUCT_RECOGNITION` en `conversations` (`analyze({company_id, image, bill_to, quality_run_id?})`), extrayendo `normalizeImage → describe → match` a `recognition_pipeline.service.ts`; `ImageRecognitionService` lo consume.
- Sin conversación no hay `resource_id` para el gasto → `AiChatMetadata.quality_run_id?` aditivo; el meter acumula por él.
- `QualityRun`/`QualityRunCase` **sí están** en la tenant extension → las tablas nuevas también + `describeTenancyIsolation`.
- No hay endpoint platform de búsqueda del catálogo de un tenant → `GET /platform/quality/tenants/:companyId/catalog/search?q=` (`CATALOG_LOOKUP.search` bajo `withTenant`).

### B.2 Criterios v2 (`success_criteria.schema.ts`, `CRITERIA_VERSION = 2`, superconjunto de v1: sin migración de datos)
Nuevos kinds y fuente del evaluator (`CheckContext` + `timings`, `client_turns`, `scenario_attachments`, `run_id`):

| Kind | Campos | Fuente |
|---|---|---|
| `contact_field_captured` | `field`, `pattern?` | `contact` columna (códigos movidos a `ai_agents/application/ports/contact_field_codes.ts`) o `custom_fields[field]` |
| `deal_stage_kind` | `kind_expected?` | `crm_deal where conversation_id` include `stage.stage_kind` |
| `media_sent` | `media: image|document|location`, `min` | `conversation_message` outbound `ai_agent` con `content_type` media |
| `tool_called` / `tool_not_called` | `name ∈ AGENT_TOOL_NAMES` (const nueva en `ai_agents/application/ports/agent_tool_names.ts` + spec de paridad con el registry), `min` | `analytics_turn_metric.tool_calls` |
| `no_unverified_prices` | — | `analytics_turn_metric.nudge_reasons @> {'unverified_prices'}` |
| `no_bot_phrases` | — | `analytics_turn_metric.bot_phrases` |
| `max_greetings` | `max` | regex de arranque sobre `agent_texts` |
| `intent_detected` | `intention_code` | `conversation.intention_id` → `ai_intention.code` |
| `max_llm_calls_per_turn` | `n` | `MAX(llm_calls)` |
| `max_cost_usd` | `usd` | `usage_event` central `SUM(cost_usd) where resource_id=conv AND bill_to='platform'` |
| `turns_to_outcome` | `max`, `outcome: order|appointment` | primer `order`/`appointment.created_at` vs `timings[].injected_at` |
| `payment_reported` | — | `order_payment` u `order.status ∈ {payment_reported, paid}` |
| `delivery_set` | `method?` | `order.delivery_method` |
| `promotion_applied` | `code?` | `marketing_promotion_redemption where conversation_id` |
| `recognition_matched` | `sku?`, `max_rank` | inbound `image` con `payload.recognition.status='done'`; `skipped` da detalle explícito |

`EXCLUSIVE_PAIRS` pasa a función (rechaza `tool_called{X}`+`tool_not_called{X}`). `describeCriterion` cubre los 16 kinds. **Carrera con fuentes asíncronas**: `awaitAsyncSignals` en el runner antes de `checks.evaluate` (poll ≤ `settle_timeout_ms` 6 000 hasta `count(analytics_turn_metric) ≥ replies`; never-throw, detalle «señal asíncrona incompleta»). FE: `domain/quality.ts` (unión, `CRITERION_KINDS` agrupados por familia Resultado · Herramientas · Estilo · Rendimiento · Seguridad), `CriteriaEditor` con renderers por kind (`Select` de tool / stage kind / media, numéricos, texto).

**Imagen enviada por el cliente simulado**: `QualityScenario.attachments Json` `[{dataset_item_id, label, when: first_turn|sim_decides}]` (≤3) + `customer_name String?` (para inyección vía nombre; el runner lo usa como `sender_display_name`). `simTurnSchema` aditivo: `attachment_id?`, `messages?: string[]` (ráfaga ≤5). El runner inyecta `content_type:'image'` con `provider_media_id 'sim-media:{mime}:quality/datasets/{dataset}/{item}.jpg'` por el **mismo** `downloadMedia` de A.4. Seeds que requieren foto llevan tag `requiere-imagen` y `attachments: []`; `StartRun` rechaza 422 `scenario_needs_attachment` hasta clonarlos y adjuntar.

### B.3 Probes (no conversacionales): `QualityRunKind.probe`
`params:{probe_kind: catalog_search|recognition|intent, dataset_id, k: 8, limit_items ≤300, spend_cap_usd?}`, `target_agent_id null`. Un job `QUALITY_PROBE_JOB` en `quality_runs` → `ProbeRunnerService` (concurrencia 4, gate cada 10 ítems, `createMany` por lote, `maybeFinalize` rama probe). Resultados en tabla nueva **`quality_probe_item_result`** `{run_id FK cascade, company_id, dataset_item_id, hit, rank?, returned jsonb, expected jsonb, confidence?, top_score?, margin?, degraded?, latency_ms, error?}` (cientos por corrida: no cabe en `run_case`).
- `catalog_search_probe.service.ts`: `CATALOG_LOOKUP.search` bajo `withTenant`; recall@k, MRR@k, zero-result rate, **false denial rate**, p50/p95. Cero LLM. `scripts/eval/catalog_lookup_eval.ts` pasa a llamar `computeRetrievalMetrics` (`probes/retrieval_metrics.ts`, puro).
- `recognition_probe.service.ts`: `PRODUCT_RECOGNITION.analyze` con `bill_to platform`; precision@1, hit@3, degraded rate, calibración por bucket de confianza, top-10 pares confundidos, p95. `assertProbeBudget` antes de arrancar (visión + `embedding_pixels` × ítems con margen), `probe_max_items` 300.
- `intent_probe.service.ts`: `classifyText`; accuracy, matriz de confusión, % LLM vs keywords.
Migración: `ADD VALUE 'probe'` sola.

### B.4 Datasets (CENTRAL, `quality_` prefijo, `company_id` referencia-sin-FK)
`quality_dataset{company_id, kind: catalog_search|recognition|intent, name, status, items_count, labeled_count, created_by}` (unique `[company_id, kind, name]`) y `quality_dataset_item{dataset_id FK cascade, company_id, source: trace|turn_metric|manual|ai, input jsonb, suggested jsonb?, expected jsonb?, label_status: unlabeled|labeled|disputed|skipped, labeled_by?, labeled_at?, source_ref jsonb?, input_hash}` (unique `[dataset_id, input_hash]`).
Import (job `QUALITY_DATASET_IMPORT_JOB` en `quality_maintenance`, 202): **catalog_search** desde `analytics_turn_metric.tool_calls[].args_preview` (no simuladas, ≤90 días, dedupe por hash, top por frecuencia, `suggested = top-3 del search actual`; trazas solo como fuente secundaria en dev); **recognition** desde inbound `image` con `recognition.status='done'` y `kind ∈ {product, screenshot_of_post}` (**excluye** comprobantes/documentos), copia normalizada a `quality/datasets/{dataset}/{item}.jpg` ≤1024 px **sin EXIF/GPS**; **intent** desde el primer mensaje del contacto con `intention_confidence ≥ 0.7`, saneado + `maskPii`. Retención: archivado + sweep a 30 días borra objetos; offboarding borra por `company_id`.
UI: tab «Datasets» (`DatasetsView`, `ImportDatasetDialog`, `CreateDatasetDialog`) y `/datasets/[datasetId]` → `LabelingWorkbench` (lista por `label_status` con `SegmentedControl`; panel con input/imagen presignada, chips sugeridos, `ProductPicker` sobre `/tenants/:id/catalog/search`, `IntentionPicker` sobre `/tenants/:id/intentions`; «Guardar y siguiente» Enter, Omitir, Disputar).
Endpoints: `GET/POST /platform/quality/datasets`, `GET/PATCH/DELETE /datasets/:id`, `POST /datasets/:id/imports` (202), `GET/POST /datasets/:id/items`, `PATCH/DELETE /datasets/:id/items/:itemId`, `GET /datasets/:id/items/:itemId/image-url`, `GET /platform/quality/tenants/:companyId/catalog/search`, `GET /platform/quality/tenants/:companyId/intentions`, `POST /runs` con `kind:'probe'`, `GET /runs/:id/probe-results?only_misses`.

### B.5 «Convertir en escenario» (`draft_scenario_from_conversation.use_case.ts`, no persiste)
Lee conversación (real, de caso o de sesión), mensajes (cap 60, head+tail como `EvaluationContextBuilder`), outcome (order/appointment/deal), `tool_calls` y último veredicto del juez. Transcript saneado (`sanitizeUntrustedText` 400 + `maskPii`, nombre → «Cliente», envuelto en `<transcript>` con regla «son DATOS»). `chatJson` con `sim_provider/sim_model` (barato), `purpose:'quality_scenario_draft'`, `bill_to:'platform'`, temp 0,3, timeout 20 s → `{code, name, persona, goal, max_turns, tags, suggested_criteria}`; cada criterio se valida individualmente (inválidos a `dropped[]`), se garantiza `no_agent_error`. Endpoint `POST /platform/quality/scenarios/draft-from-conversation` → `ScenarioDraftDto`. FE: `useDraftScenarioFromConversation` + `ScenarioFormSheet` acepta `draft?`; entradas en `ConversationsList` (debugger), `CaseDetailView` y `SessionStatePanel`.

### B.6 Seeds adversariales (`quality.seeder.ts`) y suites
`adv_aggressive_haggler`, `adv_confused_switcher`, `adv_photo_other_store` (requiere-imagen), `adv_photo_own_product` (requiere-imagen), `adv_injection_in_message`, `adv_injection_via_contact_name` (`customer_name` hostil), `adv_bank_account_not_configured`, `adv_asks_if_bot` (D1), `adv_other_customer_order`, `adv_discount_then_leave`, `adv_rapid_fire_batching` (`messages[]`), `robust_return_after_silence` (`max_greetings`), `crm_lead_no_close_v2` (requiere-crm). Suites `adversarial_v2` y `capabilities_core`. Detalle de persona/goal/criterios en el informe de diseño; se transcribe al plan del repo en F0.

### B.7 Dashboard «Capacidades» (sin tabla nueva)
`GET /platform/quality/capabilities?company_id=` → `CAPABILITY_CATALOG` (18 entradas `{code, label, check_kinds[], scenario_tags[], probe_kind?}`) × últimas 30 runs `completed` (90 días) → función pura `aggregateCapabilities` → `{code, status: untested|pass|warn|fail (≥0,9 / 0,7–0,9 / <0,7), metric_label, metric_value, sample_size, run_id, evaluated_at}`. FE tab «Capacidades»: `TenantSelect`, 4 `StatTile`, `DataTable` con `StatusBadge`+`MetricCell`, `EmptyState` con CTA «Ejecutar capabilities_core».

## Navegación final del módulo
`QualityTabs`: **Simulacro · Ejecuciones · Escenarios · Suites · Datasets · Capacidades · Depurador** (orden a validar en el mockup; la regla de la barra lateral ordena por longitud, las tabs no).

## Fases (gate explícito entre fases; worktree `feat/quality-upgrade` en ambos repos; plan `.md` en `docs/plans/quality_upgrade_plan.md` del servidor y del cliente)

| Fase | Entregable | Cierra |
|---|---|---|
| **F0** | **Mockup HTML navegable** (Artifact + `axi-client/docs/design/mockups/quality-upgrade.build.py` con el kit) con TODAS las vistas nuevas y sus estados: Simulacro (rail vacío / nueva sesión / chat vivo con texto, botones tocables, imagen con `RecognitionChip`, audio con transcripción, ubicación, «escribiendo…», sesión cerrada por tope / idle / escalada, inspector Estado y Traza con iteraciones y tools), Escenarios (`CriteriaEditor` v2 agrupado, `customer_name`, `attachments`), Wizard (tercera opción Probe + `DatasetSelect`), Detalle de run probe (métricas recall/MRR/precision/calibración/confusión + `ProbeResultsTable` con solo fallos), Datasets (lista, importar, `LabelingWorkbench` para los 3 kinds), Capacidades (matriz), «Convertir en escenario» (botón + sheet pre-rellenado con `dropped[]`), light + dark. Más los dos `docs/plans/*.md` con este plan y la investigación. | Aprobación visual del dueño |
| **F1** | Simulacro texto + taps + traza (A.2–A.7 sin medios): migración `interactive`, use cases, controller, sink Redis de traza, `GET /platform/tenants/:id/agents` + migración del wizard, sweep, FE completo salvo composer de medios. | e2e `interactive_session` (texto, tap, `sys:human`, tope, QA concurrente, traza con `AI_TRACE_ENABLED=false`, purga) |
| **F2** | Medios en el simulacro: `downloadMedia` desde storage (prefijos acotados), rama sin credenciales en `media_ingest`, `simulated` en jobs de reconocimiento/STT, `bill_to platform` en visión/embeddings/STT/`recordRecognition`, `VisualSearchInput.bill_to`, endpoint multipart, composer (imagen, audio, GPS), `RecognitionChip`/`TranscriptionLine`/`LocationBubble`. | e2e imagen (`skipped/disabled` y `done` con `usage_event.bill_to='platform'`), audio, ubicación |
| **F3** | Criterios v2: columnas `nudge_reasons`/`bot_phrases`, `AGENT_TOOL_NAMES`, `contact_field_codes`, 16 kinds en schema/evaluator/brief, `awaitAsyncSignals`, `customer_name` + `attachments` + ráfaga en sim client y runner, FE `CriteriaEditor` v2, seeds adversariales + suites. | unit por kind, fixtures v1 bajo v2, `adversarial_v2` contra tenant demo con trazas apagadas |
| **F4** | Datasets + probes: tablas, import desde `analytics_turn_metric`/imágenes/intenciones, `LabelingWorkbench`, puertos `PRODUCT_RECOGNITION` y `classifyText`, `quality_run_id` en metadata/meter, `ProbeRunnerService` + 3 probes, wizard/detalle de probe, `catalog_lookup_eval.ts` sobre el servicio. | integration probes con testcontainers, `recall@8` igual al script, tenancy isolation |
| **F5** | Ciclo: «Convertir en escenario» (use case + 3 entradas) y dashboard «Capacidades». Actualizar `architecture.md` §5.1/§10 (tablas nuevas, sweep 03:30, `reclassify_intent` inexistente) y `docs/modules/platform.md`. | draft sin PII desde debugger/caso/sesión; matriz cambia tras `capabilities_core` |

## Verificación transversal
- Verjas del CI en cada fase (delegadas al agente auditor según la regla del dueño): `npm run lint` (boundaries: quality importa solo puertos/módulos de contacts, channels, ai_agents, usage, conversations, catalog), `tsc`, `npm test`, `npm run openapi:generate` con diff esperado, `npm run api:types` + `tsc` + jest en el cliente.
- Hot path: cada cambio fuera de `quality` es un `if (simulated)` o una comparación de string sobre datos ya cargados; ninguna query nueva para canales reales (tabla de riesgos del diseño A). Snapshot de bytes del prefijo cacheado del prompt intacto.
- Manual F1/F2: ráfaga de 3 mensajes → un turno; sesión idle → `timeout` en ≤5 min; dos réplicas locales → la traza aparece sin importar el pod.
- Costo: F3–F5 corren probes de visión solo con `assertProbeBudget` y tope; pedir OK al dueño antes de cualquier corrida real con LLM.

## Riesgos aceptados
- El clasificador puede re-matchear `ai_agent_id` a mitad de sesión (igual que en los QA runs); la traza lo expone.
- Overshoot del tope = turnos en vuelo (mismo contrato que estrés).
- Un probe toma el `run_lock` del tenant y bloquea un QA simultáneo (simplicidad; relajar después).
- `quality_dataset*` es dato derivado de negocio en plano central (misma decisión que `quality_run_case.conversation_id`); documentar en §7.8.
- Voz fuera de alcance por política del simulador.

## Auditoría del plan por la sesión auditora (axi-f2, 2026-09-24, contra server main 9c3cb70b) — incorporada

Confirmado sin cambios: `analytics_turn_metric` SÍ se escribe para conversaciones simuladas (`turn_metric.prisma_writer.ts:38`; `analytics_events.processor.ts:40` solo salta anomalías) ⇒ los checks v2 sobre `tool_calls` tienen fuente. `accrueQaRunSpend` solo corre con `bill_to==='platform'` (`usage_meter.service.ts:184`): el `MGET` nuevo vive DENTRO de esa rama.

| # | Hallazgo / observación | Cómo lo cierra el plan |
|---|---|---|
| H1 (F3, bloqueante de despliegue) | `nudge_reasons`/`bot_phrases` van en `analytics_turn_metric`, familia DEDICADA; el CI solo migra la central y NO hay gate de paridad (el comentario de `migrate_all_databases.ts` que lo promete es falso). En una dedicada atrasada cada lectura de turn_metric daría 500. | Paso obligatorio del runbook de F3: correr `npm run migrate:deploy:all` con el SQL en TODAS las bases dedicadas **antes** del push que despliega; verificar con `SELECT column_name` en cada dedicada. Aplica a cualquier columna dedicada futura. Ver memoria `migraciones-dedicadas-sin-gate`. |
| H2 (F4, correctitud) | `toolArgsPreview` (`agent_runtime.service.ts:215`) corta el JSON a 200 chars y añade «…» ⇒ `JSON.parse` falla en las truncadas. | El import define un parser tolerante: extrae `query`/`category` con regex sobre el preview aunque esté cortado; lo que no se pueda extraer se descarta y el job **reporta** `{imported, duplicated, discarded_truncated}` (nunca silencio). |
| H3 (F1, correctitud) | El clasificador puede re-pinear `ai_agent_id` a mitad de sesión mientras el simulacro promete «hablar con ESTE agente». | Cada turno de la traza y cada mensaje del agente en el transcript llevan `agent_id`/nombre; `SessionDetailDto` expone `agent_of_last_turn` y `agent_changed: boolean`; la UI muestra un aviso en el chat y en Estado («El turno 4 lo respondió Mateo, no Valentina») cuando difiere del agente fijado. |
| O1 | Topes `interactive_max_open` 5/2 contados en DB: dos POST simultáneos los rebasan. | `pg_advisory_xact_lock(hashtext('quality_session:'||company_id))` dentro de la `$transaction` del create (central), y el conteo dentro del mismo lock. **Orden (nota de axi-f2 tras verificar F0):** el lock solo serializa el conteo central; el contacto y la conversación del tenant se crean DESPUÉS de pasar el lock, y si esa creación falla el run se marca `failed` en la misma operación (nada de sesiones zombi que cuenten para el tope). |
| O2 (F2) | El gasto de reconocimiento/STT/embeddings solo cae en la sesión si el `usage_event` lleva `resource_id = conversation_id`. | F2 verifica y fija el `resource_id` de los tres emisores (visión, `embedding_pixels`, `audio_transcription`) al `conversation_id` del mensaje; test: tras un turno con imagen, `quality:spend:{runId}` incluye la visión. Regla «un llamador, tres emisores». |
| O3 | Polling 1,5 s con transcript completo + presign de adjuntos en cada tick. | `GET /sessions/:id?after=<message_id>` devuelve solo mensajes nuevos + estado; presign solo de los nuevos; la FE detiene el polling con `document.hidden`. |
| O4 | Modelos Prisma nuevos: registrar en `TENANT_SCOPED_MODELS` **y** en `model_topology`. | F4 los registra en ambos + `describeTenancyIsolation` por modelo (`quality_dataset`, `quality_dataset_item`, `quality_probe_item_result`). |
| O5 | Fotos de clientes reales copiadas al plano central. | `GET …/image-url` es `@Audited`; retención de datasets **activos**: `dataset_active_retention_days` (default 180) con sweep que archiva los que no se han usado en una corrida en ese plazo; decisión del dueño pendiente de confirmar la cifra. |
| O6 | El encabezado decía «BORRADOR». | Estado APROBADO 2026-09-24 en el encabezado del `.md`. |

Criterio de certificación por fase que aplicará la auditora: HEAD fijo y árbol limpio, lista de commits, verjas corridas por mí; ella corre lint por bloques / tsc / `npm test --maxWorkers=2` / diff de OpenAPI / `api:types` en copia detached; 0 violaciones de boundaries, sin código muerto, cada guarda con sus emisores contados, e2e del cierre de fase verde.

## Estado por fase

| Fase | Estado | Notas de implementación |
|---|---|---|
| F0 | Certificada por axi-f2 | Mockup + planes gemelos. |
| F1 | **Construida 2026-09-24, pendiente de certificación y de visual del dueño** | Backend: `QualityRunKind.interactive` (+ migración), `TenantEligibilityService` compartido con `start_run`, `EnsureSimulatorChannelUseCase.ensureExists` (no re-apunta), `CreateSession`/`SendSessionMessage`/`EndSession`, `SessionsQuery` (`?after=` delta, `agent_changed`), traza por Redis (`AgentTraceService` sink cuando `simulated`), `RedisSimTraceReaderAdapter`, sweep `session_sweep` cada 5 min, `GET /platform/tenants/:id/agents`, gasto diario `quality:sim:daily_spend:*`, advisory locks global+tenant en el create. **Hallazgos al construir:** (a) `pg_advisory_xact_lock` devuelve `void` y `$queryRaw` no lo deserializa → `::text` como en `ensure_default_pipeline`; (b) las clases DTO llevan prefijo `Quality…` porque `intake` ya expone `CreateSessionDto`/`SessionDetailDto` y swagger nombra los schemas por la clase (la colisión pisaba el contrato de las entrevistas en silencio); (c) el `schema.d.ts` del cliente se EMPALMA (no se regenera entero): el committeado va por delante de server main (memoria `contrato-cliente-adelantado-a-server-main`). Frontend: tab «Simulacro», `SimulatorView` de tres columnas, `ChatBubble` compartido (lo usa también `TranscriptPanel`), `AgentSelect` (el wizard `TargetStep` migra a él), hooks con polling adaptativo y envío optimista. Fuera de F1 a propósito: composer de medios (F2), «convertir en escenario» (F5). Verjas corridas por el constructor: server `typecheck` + eslint de los 47 archivos tocados + 7 suites unitarias afectadas (57 tests) + e2e `interactive_session` 10/10 (el e2e completo pasó salvo `fx_rates`, dependencia externa preexistente) + `openapi:generate` (diff = 6 rutas, 7 schemas nuevos, `RunsPageDto`/`RunDetailDto` con `kind` ampliado); cliente `tsc` (solo el error preexistente de `ConversationPanel.test.tsx`), eslint de los 27 archivos tocados, 4 suites (31 tests). Pendiente: suite unitaria completa del servidor (en curso al escribir esto), `next build`, visual del dueño. |
| F2–F5 | Sin empezar | |
