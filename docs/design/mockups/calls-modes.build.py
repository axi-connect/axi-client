#!/usr/bin/env python3
"""Mockup «Llamadas: modos Reactivo / Proactivo y marcos por etapas» (F0 del
plan `axi-server/docs/plans/calls_modes_inbound_plan.md`).

Hoy el agente de voz solo reacciona: tras el saludo y el aviso legal se queda
escuchando, y una llamada que axi origina casi siempre existe porque quiere
decir algo. Este lienzo dibuja la Entrega 1 (los modos) sin quitar nada de lo
que el módulo ya hace (inventario de paridad en el plan, §Paridad):

1. **Marcos, en un solo lugar.** Pestaña nueva «Marcos» en Llamadas: cinco
   fichas, una por tipo de llamada, cada una con su estado («Base de axi»,
   «Ajustado por ti», «Alba propone»). El editor es una lista de etapas
   —objetivo, cuándo avanza, siempre, nunca— y nada más: ni prompt, ni
   duplicar el objetivo que ya vive en la tarea, la secuencia o el
   recordatorio. Alba propone en violeta y el dueño decide.
2. **Así abriría.** El marco se prueba sin llamar: una isla de tinta con la
   apertura que el agente diría pegada al aviso de grabación.
3. **En vivo, la etapa.** El escenario conserva el aura y la frase; encima va
   la ruta del marco con la etapa actual, y la ficha «Etapa» reemplaza nada:
   se suma a Motivo y Minutos.
4. **Terminada, la ruta recorrida.** «Así fue la llamada» dice hasta dónde
   llegó y dónde se cortó; la transcripción marca los cambios de etapa.
5. **Monitoreo: dónde se caen.** Una ficha del bento con el embudo por tipo,
   en la voz del progreso: cuántas llegaron a cada etapa y qué sigue.
6. **Lanzar una llamada** desde el contacto, el inbox o Cobros: contacto,
   tipo, objetivo (prellenado por quien la lanza), agente y modo.

Uso:  python3 calls-modes.build.py
"""
import pathlib, sys
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from _axi_mockup_kit import Kit, DARK  # noqa: E402

K = Kit("calls-modes")
ic, btn, badge = K.ic, K.btn, K.badge

K.extra_css = """
/* ── Isla de tinta (Island material="ink", §9.5.1): redefine los tokens oscuros ── */
.ink{ """ + DARK + """ }
.ink{--muted-foreground:color-mix(in srgb, var(--foreground) 70%, transparent);--secondary:color-mix(in srgb, var(--foreground) 8%, transparent);--border:color-mix(in srgb, var(--foreground) 14%, transparent);--border-soft:color-mix(in srgb, var(--foreground) 8%, transparent);--input:color-mix(in srgb, var(--foreground) 16%, transparent);--accent:color-mix(in srgb, var(--axi-brand) 30%, transparent)}
.ink{position:relative;overflow:hidden;border-radius:24px;background:var(--background);color:var(--foreground);border:1px solid color-mix(in srgb, var(--foreground) 10%, transparent)}
:root:not([data-theme="dark"]) .ink{--axi-brand:#e65759;--axi-brand-2:#e02f2f}
@media (prefers-color-scheme: dark){ :root:not([data-theme="light"]) .ink{--axi-brand:#fb7185} }

/* ── Pestañas del módulo ── */
.modhead{min-width:0;display:flex;flex-wrap:wrap;align-items:center;gap:12px 24px;padding:10px 0 12px;border-bottom:1px solid var(--border)}
.modhead .brand{font-family:var(--font-heading);font-size:18px;font-weight:700;letter-spacing:-.02em}
.kicker{font-size:11.5px;letter-spacing:.08em;text-transform:uppercase;font-weight:600;color:var(--muted-foreground)}
.title{font-family:var(--font-heading);font-size:30px;line-height:1.1;letter-spacing:-.02em;margin-top:4px}
@container (max-width: 600px){.title{font-size:24px}}

/* ── Chips de modo y tipo ── */
.chip{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 10px;border-radius:999px;font-size:12px;font-weight:500;background:var(--secondary);color:var(--foreground);white-space:nowrap}
.chip .ic{color:var(--muted-foreground)}
.chip.pro .ic{color:var(--axi-violet)} .chip.re .ic{color:var(--axi-info)}

/* ── Marcos: lista de fichas ── */
.pb-grid{display:grid;gap:16px;grid-template-columns:minmax(0,1fr)}
@container (min-width: 960px){.pb-grid{grid-template-columns:340px minmax(0,1fr);align-items:start}}
.pb-list{display:flex;flex-direction:column;gap:8px}
.pb{display:grid;grid-template-columns:40px minmax(0,1fr) auto;gap:4px 12px;align-items:center;padding:12px 14px;border:1px solid var(--border);border-radius:16px;background:var(--background);text-align:left;width:100%}
.pb .pic{width:40px;height:40px;border-radius:12px;background:var(--secondary);display:grid;place-items:center;color:var(--foreground)}
.pb .t{font-weight:500;font-size:14px;display:flex;flex-wrap:wrap;gap:4px 8px;align-items:center}
.pb .d{font-size:12.5px;color:var(--muted-foreground);grid-column:2;line-height:1.4}
.pb .st{grid-column:3;grid-row:1 / span 2;align-self:center;display:flex;flex-direction:column;align-items:flex-end;gap:4px}
.pb[aria-current="true"]{border-color:color-mix(in srgb, var(--axi-brand) 55%, var(--border));background:color-mix(in srgb, var(--axi-brand) 5%, var(--background))}
.pb.quiet{opacity:.72}
.pb .ic.chev{color:var(--muted-foreground)}
@container (max-width: 600px){.pb{grid-template-columns:minmax(0,1fr) auto} .pb .pic{display:none} .pb .d{grid-column:1} .pb .st{grid-column:2}}

/* ── Marcos: editor ── */
.ed{display:flex;flex-direction:column;gap:16px}
.ed-head{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-start;gap:10px 16px}
.ed-head h2{font-family:var(--font-body);font-size:19px;font-weight:600;letter-spacing:-.01em;display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center}
.ed-head p{color:var(--muted-foreground);font-size:13px;max-width:64ch;margin-top:3px}
.ed-head .right{display:flex;gap:8px;flex-wrap:wrap}
.btn.alba{background:color-mix(in srgb, var(--axi-violet) 12%, var(--background));color:var(--axi-violet);border-color:transparent}
.btn.alba .ic{color:var(--axi-violet)}
.stages{display:flex;flex-direction:column;border:1px solid var(--border);border-radius:20px;background:var(--background);overflow:hidden}
.stage{display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:2px 14px;padding:14px 16px 14px 12px;border-bottom:1px solid var(--border-soft);align-items:start}
.stage:last-child{border-bottom:0}
.stage .n{width:28px;height:28px;border-radius:999px;background:var(--secondary);display:grid;place-items:center;font-size:12.5px;font-weight:600;font-variant-numeric:tabular-nums;color:var(--muted-foreground);margin-top:1px;justify-self:center}
.stage .name{font-weight:500;font-size:14.5px;display:flex;flex-wrap:wrap;gap:4px 8px;align-items:center}
.stage .goal{font-size:13.5px;margin-top:2px;max-width:72ch}
.stage .rows{display:grid;grid-template-columns:auto minmax(0,1fr);gap:4px 12px;font-size:12.5px;margin-top:8px;color:var(--muted-foreground);align-items:baseline}
.stage .rows dt{font-size:11px;letter-spacing:.06em;text-transform:uppercase;font-weight:600;white-space:nowrap}
.stage .rows dd{margin:0;color:var(--foreground)}
.stage .rows dd.list{display:flex;flex-wrap:wrap;gap:4px 6px}
.stage .rows dd.list span{display:inline-flex;align-items:center;padding:2px 8px;border-radius:999px;background:var(--secondary);font-size:12px;color:var(--foreground)}
.stage .rows dd.list.never span .ic{color:var(--axi-destructive)}
.stage .acts{display:flex;gap:2px;color:var(--muted-foreground)}
.stage .acts .btn{color:var(--muted-foreground)}
.stage.edited{background:color-mix(in srgb, var(--axi-brand) 4%, var(--background))}
.stage.edited .name .chip{background:color-mix(in srgb, var(--axi-brand) 12%, var(--background))}
.stages .add{display:flex;align-items:center;gap:8px;padding:12px 16px;font-size:13.5px;color:var(--muted-foreground);border-top:1px dashed var(--border)}
@container (max-width: 600px){.stage{grid-template-columns:minmax(0,1fr)} .stage .n{display:none} .stage .acts{grid-row:1;justify-self:end}}

/* «Así abriría»: isla de tinta compacta */
.opening{padding:18px 20px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px 16px;align-items:start}
.opening .lbl{font-size:11.5px;letter-spacing:.08em;text-transform:uppercase;font-weight:600;color:var(--muted-foreground);display:flex;align-items:center;gap:8px}
.opening q{display:block;font-size:16px;line-height:1.55;margin-top:6px;max-width:64ch;quotes:"«" "»"}
.opening q::before{content:open-quote} .opening q::after{content:close-quote}
.opening .legal{font-size:12.5px;color:var(--muted-foreground);margin-top:6px;max-width:70ch}
.opening .glow{position:absolute;right:-60px;top:-80px;width:260px;height:260px;border-radius:50%;background:radial-gradient(closest-side, color-mix(in srgb, var(--axi-violet) 45%, transparent), transparent 70%);pointer-events:none}
.opening .btn.glass{background:color-mix(in srgb, var(--foreground) 8%, transparent);color:var(--foreground);border-color:color-mix(in srgb, var(--foreground) 14%, transparent)}
@container (max-width: 600px){.opening{grid-template-columns:1fr}}

/* barra sticky de guardar (UnsavedChangesDock, tinta) */
.dock{position:sticky;bottom:16px;z-index:5;display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px 16px;padding:12px 16px 12px 20px;border-radius:999px;box-shadow:var(--shadow-overlay)}
.dock .msg{font-size:13.5px;display:flex;align-items:center;gap:10px}
.dock .msg .dot{width:8px;height:8px;border-radius:50%;background:var(--axi-amber)}
.dock .acts{display:flex;gap:8px}
.dock .btn.outline{background:transparent;color:var(--foreground);border-color:color-mix(in srgb, var(--foreground) 22%, transparent)}

/* ── En vivo ── */
.live{display:grid;gap:16px;grid-template-columns:minmax(0,1fr)}
@container (min-width: 1000px){.live{grid-template-columns:minmax(0,1fr) 380px}}
.stagehead{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:10px 16px}
.stagehead .back{font-size:12px;color:var(--muted-foreground);display:inline-flex;gap:4px;align-items:center}
.stagehead h1{font-family:var(--font-heading);font-size:30px;line-height:1;letter-spacing:-.02em;display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center}
.stagehead .sub{font-size:13px;color:var(--muted-foreground);margin-top:6px;display:flex;flex-wrap:wrap;gap:4px 8px;align-items:center}
.pill{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 10px;border-radius:999px;font-size:12px;font-weight:500;background:var(--secondary)}
.pill .dot{width:7px;height:7px;border-radius:50%;background:var(--axi-success)}

/* la ruta del marco */
.route{display:flex;align-items:center;gap:0;overflow-x:auto;scrollbar-width:none;padding:2px 0}
.route .s{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 10px;border-radius:999px;font-size:12.5px;white-space:nowrap;color:var(--muted-foreground);flex:none}
.route .s .ic{color:var(--axi-success)}
.route .s.now{background:color-mix(in srgb, var(--axi-violet) 14%, transparent);color:var(--foreground);font-weight:500}
.route .s.now .ic{color:var(--axi-violet)}
.route .s.next{opacity:.6} .route .s.next .ic{color:var(--muted-foreground)}
.route .s.fell{background:color-mix(in srgb, var(--axi-amber) 16%, transparent);color:var(--foreground);font-weight:500}
.route .s.fell .ic{color:var(--axi-warning)}
.route .ln{width:14px;height:1px;background:var(--border);flex:none}
.route .ln.done{background:var(--axi-success);opacity:.6}

.stage-ink{min-height:440px;padding:20px;display:flex;flex-direction:column;gap:12px}
@container (min-width: 1000px){.stage-ink{min-height:560px}}
.stage-ink .aura{position:absolute;inset:-20%;z-index:0;pointer-events:none;background:
  radial-gradient(40% 35% at 55% 60%, color-mix(in srgb, var(--axi-violet) 55%, transparent), transparent 70%),
  radial-gradient(30% 28% at 40% 45%, color-mix(in srgb, var(--axi-violet) 35%, transparent), transparent 70%),
  radial-gradient(25% 22% at 65% 40%, color-mix(in srgb, var(--axi-brand) 18%, transparent), transparent 70%);filter:blur(30px)}
@media (prefers-reduced-motion: no-preference){.stage-ink .aura{animation:aura 9s ease-in-out infinite alternate}}
@keyframes aura{from{transform:rotate(-3deg) scale(1)}to{transform:rotate(3deg) scale(1.06)}}
.stage-ink > *{position:relative;z-index:1}
.stage-ink .top{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap}
.stage-ink .glass{display:inline-flex;align-items:center;gap:8px;height:32px;padding:0 12px;border-radius:999px;font-size:12px;font-weight:500;background:color-mix(in srgb, var(--foreground) 7%, transparent);border:1px solid color-mix(in srgb, var(--foreground) 10%, transparent);backdrop-filter:blur(10px)}
.stage-ink .glass .dot{width:6px;height:6px;border-radius:50%;background:var(--axi-success)}
.stage-ink .glass.now .dot{background:var(--axi-violet)}
.stage-ink .mid{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;text-align:center;padding:24px 8px}
.stage-ink .who{font-size:13.5px;font-weight:500;color:var(--muted-foreground);display:inline-flex;align-items:center;gap:8px}
.stage-ink .who .dot{width:8px;height:8px;border-radius:50%;background:var(--axi-violet)}
.stage-ink .phrase{font-family:var(--font-heading);font-size:26px;line-height:1.25;letter-spacing:-.01em;max-width:26ch;color:var(--axi-violet)}
.stage-ink .phrase .caret{display:inline-block;width:3px;height:.9em;background:var(--axi-violet);vertical-align:-.1em;margin-left:3px}
.stage-ink .phrase .dim{opacity:.35}
@container (max-width: 600px){.stage-ink .phrase{font-size:21px}}
.stage-ink .foot{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;font-size:12.5px;color:var(--muted-foreground)}

.tiles{display:grid;gap:12px;grid-template-columns:repeat(3,minmax(0,1fr))}
@container (max-width: 600px){.tiles{grid-template-columns:1fr}}
.tile{border:1px solid var(--border);border-radius:20px;padding:14px 16px;background:var(--background);min-width:0}
.tile .lbl{font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;font-weight:600;color:var(--muted-foreground)}
.tile .v{font-weight:600;font-size:14.5px;margin-top:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tile .v.mono{font-family:var(--font-mono);font-weight:500;font-size:13.5px}
.tile .d{font-size:12px;color:var(--muted-foreground);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tile .v.stage{display:flex;gap:8px;align-items:center;white-space:normal}
.tile .v.stage .ic{color:var(--axi-violet)}

.conv{border:1px solid var(--border);border-radius:20px;background:var(--background);display:flex;flex-direction:column;min-width:0;max-height:560px}
.conv .h{padding:12px 16px;border-bottom:1px solid var(--border-soft);font-size:13px;font-weight:600;display:flex;justify-content:space-between;align-items:center}
.conv .h small{font-weight:400;color:var(--muted-foreground)}
.conv .body{padding:12px 16px;display:flex;flex-direction:column;gap:12px;overflow:auto}
.msg{display:flex;flex-direction:column;gap:2px;max-width:92%}
.msg .w{font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase}
.msg .b{font-size:13.5px;line-height:1.45;padding:8px 12px;border-radius:14px;background:var(--secondary)}
.msg.ag .w{color:var(--axi-violet)} .msg.cl{align-self:flex-end;align-items:flex-end} .msg.cl .w{color:var(--axi-brand)}
.msg.sys{align-self:center;align-items:center} .msg.sys .b{background:transparent;color:var(--muted-foreground);font-size:12.5px;padding:0}
.msg .b .st{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;color:var(--muted-foreground);margin-top:6px}
.msg .b .st .ic{color:var(--axi-violet)}
.conv .stmark{display:flex;align-items:center;gap:10px;font-size:11.5px;color:var(--muted-foreground);letter-spacing:.04em;text-transform:uppercase;font-weight:600}
.conv .stmark::before,.conv .stmark::after{content:"";flex:1;height:1px;background:var(--border-soft)}
.conv .stmark .ic{color:var(--axi-violet)}
.msg.draft .b{color:var(--muted-foreground);border:1px dashed var(--border);background:transparent}

/* ── Terminada ── */
.fin{display:grid;gap:16px;grid-template-columns:minmax(0,1fr)}
@container (min-width: 1000px){.fin{grid-template-columns:minmax(0,1fr) 360px;align-items:start}}
.sum{padding:20px 22px;display:flex;flex-direction:column;gap:12px}
.sum .glow{position:absolute;right:-70px;bottom:-90px;width:280px;height:280px;border-radius:50%;background:radial-gradient(closest-side, color-mix(in srgb, var(--axi-violet) 40%, transparent), transparent 70%);pointer-events:none}
.sum > *{position:relative}
.sum h2{font-family:var(--font-body);font-size:15px;font-weight:600;display:flex;align-items:center;gap:8px}
.sum h2 .ic{color:var(--axi-violet)}
.sum p{font-size:14px;line-height:1.55}
.sum .kv2{display:grid;grid-template-columns:auto minmax(0,1fr);gap:6px 14px;font-size:13px;margin-top:4px}
.sum .kv2 dt{color:var(--muted-foreground)} .sum .kv2 dd{margin:0;font-weight:500}
.sum .route{margin-top:2px;flex-wrap:wrap;gap:4px;overflow:visible}
.sum .route .ln{display:none}
.sum .route .s{background:color-mix(in srgb, var(--foreground) 7%, transparent);color:var(--foreground)}
.sum .route .s.next{background:transparent}
.panel{border:1px solid var(--border);border-radius:24px;background:var(--background);padding:18px 20px}
.panel h2{font-family:var(--font-body);font-size:14px;font-weight:600;margin-bottom:10px}
.wave{height:64px;display:flex;align-items:center;gap:1px;padding:0 2px;min-width:0}
.wave i{flex:1 1 0;border-radius:2px;background:var(--axi-violet);opacity:.75;min-width:1px}
.wave i.c{background:var(--axi-brand)} .wave i.q{background:var(--muted-foreground);opacity:.35}
.wave i.past{opacity:.95} .wave i.fut{opacity:.35}
.recbar{display:flex;justify-content:space-between;align-items:center;gap:10px;font-size:12.5px;color:var(--muted-foreground);margin-top:8px}
.recbar .mono{font-family:var(--font-mono)}
.tx{display:flex;flex-direction:column;gap:10px}
.tx .row{display:grid;grid-template-columns:52px minmax(0,1fr);gap:12px;align-items:start;padding:8px 10px;border-radius:12px;text-align:left}
.tx .row.on{background:var(--secondary)}
.tx .row .t{font-family:var(--font-mono);font-size:12px;color:var(--muted-foreground);padding-top:2px;font-variant-numeric:tabular-nums}
.tx .row .w{font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase}
.tx .row.ag .w{color:var(--axi-violet)} .tx .row.cl .w{color:var(--axi-brand)}
.tx .row .b{font-size:13.5px;line-height:1.45}
.tx .row .b u{text-decoration-color:var(--axi-violet);text-underline-offset:3px}
.tx .stmark{display:flex;align-items:center;gap:10px;font-size:11.5px;color:var(--muted-foreground);letter-spacing:.04em;text-transform:uppercase;font-weight:600;padding:2px 0}
.tx .stmark::before,.tx .stmark::after{content:"";flex:1;height:1px;background:var(--border-soft)}
.tx .stmark .ic{color:var(--axi-violet)} .tx .stmark.fell .ic{color:var(--axi-warning)}
.fl{display:flex;flex-direction:column}
.fl div{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid var(--border-soft);font-size:13.5px}
.fl div:last-child{border-bottom:0}
.fl .k{color:var(--muted-foreground)} .fl .v{font-weight:500;text-align:right}

/* ── Monitoreo: bento ── */
.bento{display:grid;gap:12px;align-items:start;grid-template-columns:minmax(0,1fr)}
@container (min-width: 900px){.bento{grid-template-columns:repeat(3,minmax(0,1fr))} .bento .c2{grid-column:span 2} .bento .c3{grid-column:span 3}}
.bt{border:1px solid var(--border);border-radius:24px;background:var(--background);padding:16px 18px;min-width:0;display:flex;flex-direction:column;gap:10px}
.bt .bh{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}
.bt .lbl{font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;font-weight:600;color:var(--muted-foreground)}
.bt .big{font-family:var(--font-heading);font-size:36px;line-height:1;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.bt .big small{font-family:var(--font-body);font-size:13px;color:var(--muted-foreground);letter-spacing:0;margin-left:6px;font-weight:400}
.bt .line{font-size:13px;color:var(--muted-foreground);max-width:60ch}
.bt .line b{color:var(--foreground);font-weight:500}
.funnel{display:flex;flex-direction:column;gap:6px;margin-top:2px}
.fr{display:grid;grid-template-columns:150px minmax(0,1fr) 88px;gap:12px;align-items:center;font-size:13px}
.fr .k{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.fr .bar{height:22px;border-radius:6px;background:var(--secondary);position:relative;overflow:hidden}
.fr .bar i{position:absolute;inset:0 auto 0 0;background:var(--axi-violet);opacity:.85;border-radius:6px}
.fr .bar i.goal{background:var(--axi-success)}
.fr .n{text-align:right;font-variant-numeric:tabular-nums;color:var(--muted-foreground);white-space:nowrap}
.fr .n b{color:var(--foreground);font-weight:600}
.fr.drop .k{color:var(--foreground);font-weight:500}
.fr.drop .bar i{background:var(--axi-amber)}
@container (max-width: 600px){.fr{grid-template-columns:110px minmax(0,1fr) 64px;font-size:12.5px}}
.livecard{display:grid;grid-template-columns:56px minmax(0,1fr);gap:12px;align-items:center;padding:12px 14px;border-radius:18px}
.livecard .mini{width:56px;height:56px;border-radius:16px;position:relative;overflow:hidden;background:radial-gradient(closest-side at 50% 60%, color-mix(in srgb, var(--axi-violet) 70%, transparent), transparent);filter:saturate(1.2)}
.livecard .t{font-weight:600;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.livecard .d{font-size:12.5px;color:var(--muted-foreground);display:flex;flex-wrap:wrap;gap:4px 8px;align-items:center}
.livecard .d .ic{color:var(--axi-violet)}
.nextup{padding:18px 20px;display:flex;flex-direction:column;gap:10px}
.nextup .glow{position:absolute;right:-60px;top:-60px;width:220px;height:220px;border-radius:50%;background:radial-gradient(closest-side, color-mix(in srgb, var(--axi-brand) 45%, transparent), transparent 70%)}
.nextup > *{position:relative}
.nextup h3{font-family:var(--font-body);font-size:14px;font-weight:600}
.nextup ul{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:8px}
.nextup li{display:grid;grid-template-columns:18px minmax(0,1fr);gap:10px;font-size:13.5px;line-height:1.45}
.nextup li .ic{color:var(--axi-brand);margin-top:2px}
.nextup li b{font-weight:500}
.recent{display:flex;flex-direction:column}
.recent .r{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr) minmax(0,1fr) auto;gap:12px;padding:10px 0;border-bottom:1px solid var(--border-soft);font-size:13.5px;align-items:center}
.recent .r:last-child{border-bottom:0}
.recent .r .d{font-size:12px;color:var(--muted-foreground);display:block}
.recent .r .st{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;color:var(--muted-foreground)}
.recent .r .st .ic{color:var(--axi-violet)} .recent .r .st.fell .ic{color:var(--axi-warning)} .recent .r .st.ok .ic{color:var(--axi-success)}
@container (max-width: 700px){.recent .r{grid-template-columns:minmax(0,1fr) auto auto;gap:8px} .recent .r .hide{display:none} .recent .r .st{font-size:12px}}

/* ── Lanzador ── */
.modal.launch{max-width:520px}
.modal .who{display:grid;grid-template-columns:40px minmax(0,1fr) auto;gap:12px;align-items:center;padding:10px 12px;border:1px solid var(--border);border-radius:14px}
.modal .who .av{width:40px;height:40px;border-radius:12px;background:var(--secondary);display:grid;place-items:center;font-weight:600;font-size:13px}
.modal .who .t{font-weight:500} .modal .who .d{font-size:12.5px;color:var(--muted-foreground);font-family:var(--font-mono)}
.modal .who .chg{font-size:12.5px;color:var(--muted-foreground);text-decoration:underline;text-underline-offset:3px;text-decoration-color:var(--border)}
.modal .form{grid-template-columns:1fr 1fr;gap:12px 14px}
@container (max-width: 560px){.modal .form{grid-template-columns:1fr}}
.modes{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.mode{display:flex;flex-direction:column;gap:2px;padding:10px 12px;border:1px solid var(--border);border-radius:12px;text-align:left}
.mode .t{font-size:13.5px;font-weight:500;display:flex;align-items:center;gap:6px}
.mode .d{font-size:12px;color:var(--muted-foreground);line-height:1.4}
.mode[aria-checked="true"]{border-color:color-mix(in srgb, var(--axi-brand) 55%, var(--border));background:color-mix(in srgb, var(--axi-brand) 5%, var(--background))}
.mode[aria-checked="true"] .t .ic{color:var(--axi-violet)}
.modal .cost{font-size:12.5px;color:var(--muted-foreground);display:flex;gap:8px;align-items:center}
.modal .cost .ic{color:var(--muted-foreground)}
.rail-bg{display:grid;grid-template-columns:minmax(0,1fr) 380px;min-height:640px}
.rail-bg .main{padding:20px 24px;color:var(--muted-foreground);font-size:13px}
@container (max-width: 800px){.rail-bg{grid-template-columns:1fr} .rail-bg .rail{width:auto;border-left:0;border-top:1px solid var(--border)}}

/* ── Móvil ── */
.mobile{width:min(390px,100%);min-height:844px;margin:0 auto;background:var(--background);display:flex;flex-direction:column;position:relative;border:1px solid var(--border);border-radius:34px;overflow:hidden;container-type:inline-size}
.mobile .page{padding:18px 16px 24px;gap:14px;max-width:none;min-width:0;width:100%;margin:0}
.mobile .modhead{padding-top:0}
.mobile .seg{max-width:100%}
.mobile .dock{bottom:12px}
"""

MODHEAD = lambda active: (
    f'<div class="modhead"><span class="brand">Llamadas</span>'
    + K.nav([("Monitoreo", "activity"), ("Historial", "history"), ("Marcos", "route"), ("Configuración", "settings")], active, "Secciones de llamadas", "inline")
    + "</div>"
)

def header(kicker, title, right=""):
    return f'<div class="header"><div><p class="kicker">{kicker}</p><h1 class="title">{title}</h1></div><div class="right">{right}</div></div>'

def chip(label, kind="", icon=""):
    return f'<span class="chip {kind}">{ic(icon, size=13) if icon else ""}{label}</span>'

PRO = chip("Proactivo", "pro", "megaphone")
RE = chip("Reactivo", "re", "ear")

# ──────────────────────────────────────────────────────────────────── Marcos
TYPES = [
    ("calendar-check", "Recordatorio de cita", "Confirmar, reprogramar o cancelar. 4 etapas.", "Base de axi", "", False),
    ("briefcase", "Venta y seguimiento comercial", "Calificar, proponer y cerrar o agendar. 7 etapas.", "Ajustado por ti", "ok", True),
    ("hand-coins", "Cobranza", "Saldo, compromiso de pago y link por WhatsApp. 5 etapas.", "Alba propone", "violet", False),
    ("heart-handshake", "Reactivación y postventa", "Volver a hablar con quien ya compró. 5 etapas.", "Base de axi", "", False),
    ("repeat", "Seguimiento", "Retomar una conversación pendiente. 4 etapas.", "Base de axi", "", False),
]

def pb_list():
    rows = []
    for icon, name, desc, state, tone, current in TYPES:
        rows.append(
            f'<button class="pb" aria-current="{str(current).lower()}"><span class="pic">{ic(icon, size=18)}</span>'
            f'<span class="t">{name}</span><span class="d">{desc}</span>'
            f'<span class="st">{badge(state, tone)}{ic("chevron-right", "chev", 16)}</span></button>'
        )
    rows.append(
        f'<button class="pb quiet"><span class="pic">{ic("phone-incoming", size=18)}</span>'
        f'<span class="t">Atención entrante {RE}</span><span class="d">Escucha y atiende a quien llama. Sin etapas: el cliente lleva la conversación.</span>'
        f'<span class="st">{badge("Entrega 2", "off")}</span></button>'
    )
    return f'<div class="pb-list">{"".join(rows)}</div>'

STAGES = [
    ("Apertura", "Saluda por su nombre, di quién eres y para qué llamas, en una sola frase.", "El cliente responde algo.", ["Nombre del negocio", "Una frase"], ["Leer el aviso legal dos veces"], False),
    ("Confirmar con quién hablas", "Asegúrate de que es la persona correcta o de que puede decidir.", "Confirma, o te pasa con quien decide.", ["Preguntar si es buen momento"], ["Insistir si dice que no puede hablar"], False),
    ("Motivo", "Di el motivo concreto de la llamada con lo que sabes del contacto.", "El cliente muestra interés o pregunta algo.", ["Usar el objetivo de la tarea", "Mencionar la última conversación"], [], False),
    ("Descubrimiento", "Entiende qué necesita con una o dos preguntas, no más.", "Sabes qué le sirve y cuándo lo necesita.", ["Preguntar para cuándo", "Preguntar para quién"], ["Más de dos preguntas seguidas"], True),
    ("Propuesta", "Ofrece lo que encaja, con el precio hablado y una sola opción principal.", "El cliente acepta, duda o dice que no.", ["Precio real del catálogo", "Máximo tres opciones"], ["Inventar precios", "Ofrecer descuentos"], False),
    ("Objeciones", "Escucha la duda, respóndela con datos reales y sin presionar.", "La duda quedó resuelta o el cliente pide pensarlo.", ["Repetir la duda antes de responder"], ["Insistir más de una vez"], False),
    ("Cierre", "Agenda la cita, toma el pedido o acuerda el siguiente paso con fecha.", "Hay cita, pedido o una fecha para volver a hablar.", ["Repetir fecha y hora", "Ofrecer WhatsApp para lo escrito"], ["Colgar sin un siguiente paso"], False),
]

def stage_rows(mobile=False):
    out = []
    for i, (name, goal, adv, must, never, edited) in enumerate(STAGES, 1):
        must_html = "".join(f"<span>{m}</span>" for m in must)
        never_html = "".join(f'<span>{ic("ban", size=11)}{n}</span>' for n in never) or '<span class="muted" style="background:transparent;padding:0">—</span>'
        tag = f' {chip("Ajustado", "", "pencil")}' if edited else ""
        out.append(
            f'<div class="stage {"edited" if edited else ""}"><span class="n">{i}</span><div>'
            f'<p class="name">{name}{tag}</p><p class="goal">{goal}</p>'
            f'<dl class="rows"><dt>Avanza cuando</dt><dd>{adv}</dd>'
            f'<dt>Siempre</dt><dd class="list">{must_html}</dd>'
            f'<dt>Nunca</dt><dd class="list never">{never_html}</dd></dl></div>'
            f'<div class="acts">{btn("", "pencil", "ghost icon sm", "aria-label=\'Editar etapa\'")}{btn("", "grip-vertical", "ghost icon sm", "aria-label=\'Mover\'")}</div></div>'
        )
    return (
        f'<div class="stages">{"".join(out)}'
        f'<div class="add">{ic("plus", size=15)}Añadir una etapa</div></div>'
    )

def opening_island():
    return (
        '<section class="ink opening" aria-label="Así abriría"><div class="glow"></div><div>'
        f'<p class="lbl">{ic("sparkles", size=13)}Así abriría Laura</p>'
        '<q>Hola Diana, te habla Laura de Sonría Odontología. Te llamo porque el mes pasado preguntaste por el blanqueamiento y esta semana tenemos cupos por la tarde. ¿Tienes un minuto?</q>'
        '<p class="legal">Suena pegada al saludo y al aviso de grabación, sin pausa. Se genera con los datos del contacto mientras el teléfono timbra; si no alcanza, dice una versión fija de este marco.</p>'
        f'</div>{btn("Oír otra", "refresh-cw", "sm glass")}</section>'
    )

def marcos_editor(mobile=False):
    return (
        '<div class="ed">'
        '<div class="ed-head"><div>'
        f'<h2>Venta y seguimiento comercial {PRO}</h2>'
        '<p>Es un marco de control, no un guion: el agente sabe en qué etapa está y adónde va, y habla con la voz de tu negocio. Lo usan las tareas del CRM, las secuencias y el botón «Llamar».</p>'
        f'</div><div class="right">{btn("Proponer con Alba", "sparkles", "alba sm")}{btn("Restablecer", "rotate-ccw", "outline sm")}</div></div>'
        + opening_island()
        + stage_rows(mobile)
        + f'<div class="ink dock"><span class="msg"><span class="dot"></span>Tienes cambios sin guardar en «Descubrimiento»</span>'
        f'<span class="acts">{btn("Descartar", "", "outline sm")}{btn("Guardar marco", "check", "sm")}</span></div>'
        '</div>'
    )

def view_marcos():
    return (
        '<div class="shell"><div class="page">'
        + MODHEAD("Marcos")
        + header("Llamadas · marcos", "Cómo lleva tu agente cada llamada")
        + K.notice("info", "<b>Cada tipo de llamada ya trae un marco listo.</b> Solo ajusta lo que quieras cambiar; lo que no toques sigue la base de axi y se actualiza sola.", icon="route")
        + f'<div class="pb-grid">{pb_list()}{marcos_editor()}</div>'
        + '</div></div>'
    )

def view_marcos_mobile():
    return (
        '<div class="mobile"><div class="page">'
        + MODHEAD("Marcos")
        + header("Llamadas · marcos", "Cómo lleva tu agente cada llamada")
        + f'<a href="#" class="stagehead"><span class="back">{ic("chevron-left", size=14)}Todos los marcos</span></a>'
        + marcos_editor(mobile=True)
        + '</div></div>'
    )

# ──────────────────────────────────────────────────────────────────── En vivo
ROUTE_LIVE = [("Apertura", "done"), ("Confirmar", "done"), ("Motivo", "done"), ("Descubrimiento", "now"), ("Propuesta", "next"), ("Objeciones", "next"), ("Cierre", "next")]

def route(items, fell=None):
    out = []
    for i, (name, st) in enumerate(items):
        icon = {"done": "check", "now": "circle-dot", "next": "circle", "fell": "triangle-alert"}[st]
        out.append(f'<span class="s {st}">{ic(icon, size=13)}{name}</span>')
        if i < len(items) - 1:
            out.append(f'<span class="ln {"done" if st == "done" else ""}"></span>')
    return f'<div class="route" aria-label="Ruta del marco">{"".join(out)}</div>'

def live_stage():
    return (
        '<section class="ink stage-ink" aria-label="La llamada en vivo"><div class="aura"></div>'
        f'<div class="top"><span class="glass"><span class="dot"></span><span class="mono">02:14</span></span>'
        f'<span class="glass now">{ic("route", size=13)}Descubrimiento · 4 de 7</span>'
        f'<span class="glass">{ic("bot", size=13)}Laura · agente IA</span></div>'
        '<div class="mid"><p class="who"><span class="dot"></span>Habla Laura</p>'
        '<p class="phrase">¿Y lo quieres para ti o es para <span class="dim">alguien más de la familia?</span><span class="caret"></span></p></div>'
        f'<div class="foot"><span>{PRO} Venta y seguimiento comercial</span><span>Alba escucha por si hay que escalar</span></div>'
        '</section>'
    )

CONV_LIVE = [
    ("sys", "Sistema", "Hola, te habla Laura de Sonría Odontología. Esta llamada es atendida por un asistente virtual y puede ser grabada para mejorar el servicio.", ""),
    ("stmark", "", "Apertura", ""),
    ("ag", "Laura", "Diana, te llamo porque el mes pasado preguntaste por el blanqueamiento y esta semana abrimos cupos por la tarde. ¿Tienes un minuto?", ""),
    ("cl", "Diana", "Sí, dime.", ""),
    ("stmark", "", "Motivo", ""),
    ("ag", "Laura", "Perfecto. La valoración es gratis y dura veinte minutos; ahí te dicen si el blanqueamiento te conviene o si hay que hacer una limpieza antes.", ""),
    ("cl", "Diana", "Ah ok, ¿y cuánto vale el blanqueamiento?", ""),
    ("stmark", "", "Descubrimiento", ""),
    ("ag", "Laura", "Te lo digo ya mismo. Antes una pregunta corta:", ""),
    ("draft", "Laura", "¿Y lo quieres para ti o es para alguien más de la familia…", ""),
]

def conversation(items, title="Conversación", sub="en vivo"):
    out = []
    for kind, who, text, extra in items:
        if kind == "stmark":
            out.append(f'<p class="stmark">{ic("route", size=12)}Etapa · {text}</p>')
        else:
            out.append(f'<div class="msg {kind}"><span class="w">{who}</span><span class="b">{text}</span></div>')
    return f'<aside class="conv" aria-label="{title}"><div class="h">{title}<small>{sub}</small></div><div class="body">{"".join(out)}</div></aside>'

def view_live():
    return (
        '<div class="shell"><div class="page">'
        + MODHEAD("Monitoreo")
        + '<header class="stagehead"><div>'
        f'<span class="back">{ic("chevron-left", size=14)}Monitoreo</span>'
        f'<h1>Diana Salazar <span class="pill"><span class="dot"></span>En conversación</span></h1>'
        f'<p class="sub"><span class="mono">+57 300 123 4567</span> · tarea del CRM · saliente · {PRO}</p>'
        f'</div>{btn("Ver contacto", "", "outline")}</header>'
        + route(ROUTE_LIVE)
        + '<div class="live"><div class="stack">'
        + live_stage()
        + '<div class="tiles">'
        '<div class="tile"><p class="lbl">Motivo</p><p class="v">Retomar el blanqueamiento</p><p class="d">tarea del CRM · primer intento</p></div>'
        f'<div class="tile"><p class="lbl">Etapa</p><p class="v stage">{ic("route", size=15)}Descubrimiento</p><p class="d">van 3 de 7 · faltan propuesta y cierre</p></div>'
        '<div class="tile"><p class="lbl">Minutos</p><p class="v tnum">02:14 en esta llamada</p><p class="d">se mide por minuto hablado</p></div>'
        '</div></div>'
        + conversation(CONV_LIVE)
        + '</div></div></div>'
    )

# ──────────────────────────────────────────────────────────────────── Terminada
ROUTE_FIN = [("Apertura", "done"), ("Confirmar", "done"), ("Motivo", "done"), ("Descubrimiento", "done"), ("Propuesta", "done"), ("Objeciones", "fell"), ("Cierre", "next")]

def wave():
    import random
    random.seed(7)
    bars = []
    for i in range(96):
        h = random.randint(18, 100)
        cls = "c" if 30 <= i < 44 or 62 <= i < 70 else ("q" if 44 <= i < 48 else "")
        cls += " past" if i < 58 else " fut"
        bars.append(f'<i class="{cls}" style="height:{h}%"></i>')
    return f'<div class="wave" aria-hidden="true">{"".join(bars)}</div>'

TX = [
    ("stmark", "", "Propuesta", ""),
    ("ag", "Laura", "01:48", "El blanqueamiento completo vale <u>trescientos ochenta mil pesos</u> e incluye la valoración y el kit para la casa."),
    ("cl", "Diana", "01:57", "Uy, está caro. Yo pensaba que era como doscientos."),
    ("stmark fell", "", "Objeciones · aquí se cortó", ""),
    ("ag", "Laura", "02:01", "Te entiendo. Si te sirve, lo puedes dividir en dos pagos, y la valoración de todas formas es gratis."),
    ("cl", "Diana", "02:09", "Déjame pensarlo y te aviso, ¿vale?"),
    ("ag", "Laura", "02:12", "Claro que sí. Te escribo por WhatsApp con la información para que la tengas a la mano. Que estés muy bien."),
]

def transcript():
    out = []
    for row in TX:
        if row[0].startswith("stmark"):
            out.append(f'<p class="stmark {row[0].replace("stmark","").strip()}">{ic("triangle-alert" if "fell" in row[0] else "route", size=12)}Etapa · {row[2]}</p>')
        else:
            kind, who, t, text = row
            on = " on" if t == "02:01" else ""
            out.append(f'<button class="row {kind}{on}"><span class="t">{t}</span><span><span class="w">{who}</span><p class="b">{text}</p></span></button>')
    return f'<div class="tx">{"".join(out)}</div>'

def view_finished():
    summary = (
        '<section class="ink sum" aria-label="Así fue la llamada"><div class="glow"></div>'
        f'<h2>{ic("sparkles", size=15)}Así fue la llamada</h2>'
        '<p>Diana retomó el interés por el blanqueamiento y llegó a oír el precio. Le pareció caro y pidió pensarlo; Laura ofreció dos pagos y quedó en escribirle por WhatsApp.</p>'
        + route(ROUTE_FIN)
        + '<dl class="kv2"><dt>Llegó a</dt><dd>Propuesta · 5 de 7</dd><dt>Se cortó en</dt><dd>Objeción de precio</dd><dt>Qué sigue</dt><dd>Enviar la información y volver a llamar el jueves</dd></dl>'
        '</section>'
    )
    return (
        '<div class="shell"><div class="page">'
        + MODHEAD("Historial")
        + '<header class="stagehead"><div>'
        f'<span class="back">{ic("chevron-left", size=14)}Historial</span>'
        f'<h1>Diana Salazar <span class="pill"><span class="dot" style="background:var(--axi-warning)"></span>Pidió pensarlo</span></h1>'
        f'<p class="sub"><span class="mono">+57 300 123 4567</span> · tarea del CRM · saliente · {PRO} · hoy, 10:42</p>'
        f'</div>{btn("Ver contacto", "", "outline")}</header>'
        '<div class="fin"><div class="stack">'
        '<section class="panel" aria-label="Grabación"><h2>Grabación</h2>'
        + wave()
        + f'<div class="recbar"><span class="mono">02:01 / 02:19</span><span>{ic("play", size=14)} violeta Laura · coral Diana</span></div></section>'
        '<section class="panel" aria-label="Conversación"><h2>Conversación</h2>' + transcript() + '</section>'
        '</div><div class="stack">'
        + summary
        + '<section class="panel" aria-label="Datos de la llamada"><h2>Datos de la llamada</h2><div class="fl">'
        '<div><span class="k">Modo</span><span class="v">Proactivo</span></div>'
        '<div><span class="k">Marco</span><span class="v">Venta y seguimiento</span></div>'
        '<div><span class="k">Agente</span><span class="v">Laura</span></div>'
        '<div><span class="k">Duración</span><span class="v mono">02:19</span></div>'
        '<div><span class="k">Contestó</span><span class="v">Una persona</span></div>'
        '<div><span class="k">Grabación</span><span class="v">Sí · 02:19</span></div>'
        '<div><span class="k">Costo estimado</span><span class="v mono">$ 0,07</span></div>'
        '</div></section>'
        '</div></div></div></div>'
    )

# ──────────────────────────────────────────────────────────────────── Monitoreo
FUNNEL = [("Apertura", 42, ""), ("Confirmar", 40, ""), ("Motivo", 36, ""), ("Descubrimiento", 27, ""), ("Propuesta", 19, ""), ("Objeciones", 14, "drop"), ("Cierre", 9, "goal")]

def funnel():
    rows = []
    top = FUNNEL[0][1]
    for name, n, kind in FUNNEL:
        pct = round(n / top * 100)
        rows.append(
            f'<div class="fr {kind}"><span class="k">{name}</span><span class="bar"><i class="{kind}" style="width:{pct}%"></i></span>'
            f'<span class="n"><b>{n}</b> · {pct} %</span></div>'
        )
    return f'<div class="funnel">{"".join(rows)}</div>'

def view_monitor():
    return (
        '<div class="shell"><div class="page">'
        + MODHEAD("Monitoreo")
        + header("Llamadas · en vivo", "Lo que tu agente logra al teléfono", btn("Llamar", "phone-outgoing", ""))
        + '<div class="bento">'
        '<div class="bt c2"><div class="bh"><span class="lbl">Al teléfono ahora</span><span class="small muted">2 llamadas</span></div>'
        f'<div class="ink livecard"><span class="mini"></span><div><p class="t">Diana Salazar</p><p class="d">{ic("route", size=12)}Descubrimiento · 4 de 7 <span class="mono">02:14</span> · Laura</p></div></div>'
        f'<div class="ink livecard"><span class="mini" style="background:radial-gradient(closest-side at 50% 60%, color-mix(in srgb, var(--axi-brand) 65%, transparent), transparent)"></span><div><p class="t">Carlos Pineda</p><p class="d">{ic("calendar-check", size=12)}Recordatorio · Confirmar <span class="mono">00:41</span> · Laura</p></div></div>'
        '</div>'
        '<section class="ink nextup" aria-label="Lo próximo"><div class="glow"></div><h3>Lo próximo</h3><ul>'
        f'<li>{ic("phone-incoming", size=14)}<span><b>3 pidieron que los llames</b>: Diana, Marta y Julián.</span></li>'
        f'<li>{ic("triangle-alert", size=14)}<span><b>8 llamadas de venta</b> se quedaron en la objeción de precio esta semana. Revisa la etapa «Objeciones» del marco.</span></li>'
        f'<li>{ic("clock", size=14)}<span>Quedan <b>142 minutos</b> del ciclo; a este ritmo alcanzan hasta el cierre.</span></li>'
        '</ul></section>'
        '<div class="bt c2"><div class="bh"><span class="lbl">Dónde se caen las llamadas</span>'
        + '<div class="seg inline sm" role="radiogroup" aria-label="Tipo de llamada"><button role="radio" aria-checked="true">Venta</button><button role="radio" aria-checked="false">Recordatorio</button><button role="radio" aria-checked="false">Cobranza</button></div>'
        + '</div><p class="line"><b>9 de 42 cerraron</b> esta semana · 8 se quedaron en la objeción de precio · lo que sigue es ajustar esa etapa.</p>'
        + funnel()
        + '</div>'
        '<div class="bt"><span class="lbl">Este ciclo</span><p class="big">58<small>llamadas</small></p><p class="line"><b>41 salen</b> · 17 entran · 23 llegaron a su objetivo</p>'
        '<p class="line" style="margin-top:6px"><b>Proactivas 34</b> · reactivas 24</p></div>'
        '<div class="bt c3"><div class="bh"><span class="lbl">Lo último que terminó</span><a href="#" class="small">Ver historial</a></div><div class="recent">'
        f'<div class="r"><span><b>Diana Salazar</b><span class="d">hace 12 min · Laura</span></span><span class="hide">Venta · proactiva</span><span class="st fell">{ic("triangle-alert", size=13)}Se cortó en objeciones</span><span class="mono small">02:19</span></div>'
        f'<div class="r"><span><b>Marta Ruiz</b><span class="d">hace 40 min · Laura</span></span><span class="hide">Recordatorio · proactiva</span><span class="st ok">{ic("check", size=13)}Confirmó la cita</span><span class="mono small">00:58</span></div>'
        f'<div class="r"><span><b>+57 310 555 0199</b><span class="d">hace 1 h · Laura</span></span><span class="hide">Atención · reactiva</span><span class="st">{ic("route", size=13)}Preguntó por horarios</span><span class="mono small">01:12</span></div>'
        f'<div class="r"><span><b>Julián Ocampo</b><span class="d">hace 2 h · Laura</span></span><span class="hide">Cobranza · proactiva</span><span class="st ok">{ic("handshake", size=13)}Prometió pagar el 3</span><span class="mono small">03:04</span></div>'
        '</div></div>'
        '</div></div></div>'
    )

# ──────────────────────────────────────────────────────────────────── Lanzador
def view_launch():
    modal = (
        '<div class="modal launch" role="dialog" aria-labelledby="lt">'
        '<div><h2 id="lt">Llamar a Diana</h2><p>Laura llamará ahora mismo por el mismo camino que cualquier llamada: aviso legal, conversación y transcript. Consume minutos del plan.</p></div>'
        f'<div class="who"><span class="av">DS</span><div><p class="t">Diana Salazar</p><p class="d">+57 300 123 4567</p></div><a href="#" class="chg">Cambiar</a></div>'
        '<div class="form">'
        + K.field("Tipo de llamada", K.select("Cobranza", icon="hand-coins", fid="l-type"), fid="l-type")
        + K.field("Agente", K.select("Laura", icon="bot", fid="l-agent"), fid="l-agent")
        + K.field("Objetivo", K.input("Cuota de $ 3.480.000 vencida hace 6 días · acordar fecha de pago", fid="l-obj"), hint="Lo puso Cobros. El marco de cobranza hace el resto.", full=True, fid="l-obj")
        + '<div class="field full"><span class="lbl">Modo</span><div class="modes" role="radiogroup">'
        f'<button class="mode" role="radio" aria-checked="true"><span class="t">{ic("megaphone", size=14)}Proactivo</span><span class="d">Dice el motivo apenas contesten y lleva la llamada por el marco.</span></button>'
        f'<button class="mode" role="radio" aria-checked="false"><span class="t">{ic("ear", size=14)}Reactivo</span><span class="d">Saluda y escucha. El cliente lleva la conversación.</span></button>'
        '</div></div></div>'
        f'<div class="modal-foot"><span class="cost" style="margin-right:auto">{ic("clock", size=14)}Quedan 142 minutos del ciclo</span>{btn("Cancelar", "", "outline")}{btn("Llamar", "phone-outgoing")}</div>'
        '</div>'
    )
    return (
        '<div class="shell"><div class="rail-bg"><div class="main">'
        + K.crumb("Cobros", "Cartera", "Diana Salazar")
        + '<p style="margin-top:12px">La Cartera de Cobros queda detrás del diálogo. El mismo lanzador se abre desde la ficha del contacto y desde el rail del inbox: solo cambia lo que viene prellenado.</p>'
        '</div><aside class="rail"><div class="rail-head"><b>Diana Salazar</b>' + btn("", "x", "ghost icon sm", "aria-label='Cerrar'") + '</div>'
        '<div class="rail-body"><div class="rsec"><h3>Cobro</h3><div class="rline"><span class="k">Cuota 2 de 3</span><span class="v">$ 3.480.000</span></div><div class="rline"><span class="k">Venció</span><span class="v">hace 6 días</span></div></div>'
        f'<div class="rsec"><h3>Acciones</h3>{btn("Escribir", "message-circle", "outline sm")} {btn("Llamar para cobrar", "phone-outgoing", "sm")}</div>'
        '<div class="rsec"><h3>Llamadas</h3><div class="rline"><span class="k">Hoy 10:42</span><span class="v">Se cortó en objeciones</span></div></div>'
        '</div></aside></div>'
        f'<div class="overlay">{modal}</div></div>'
    )

VIEWS = [
    ("marcos", "Marcos", view_marcos(), "Llamadas → Marcos: cinco tipos con marco listo; el editor es una lista de etapas y «Así abriría». Un solo lugar para toda la plataforma."),
    ("marcos-movil", "Marcos · móvil", view_marcos_mobile(), "El editor en 390 px: fichas apiladas, etapas sin número, barra de guardar en tinta pegada abajo."),
    ("en-vivo", "En vivo", view_live(), "La llamada en vivo con la ruta del marco arriba, la etapa en el escenario, la ficha «Etapa» y las marcas de etapa en la conversación."),
    ("terminada", "Terminada", view_finished(), "La llamada terminada: «Así fue la llamada» dice hasta dónde llegó y dónde se cortó; la transcripción marca las etapas."),
    ("monitoreo", "Monitoreo", view_monitor(), "El bento del Monitoreo gana «Dónde se caen las llamadas» (embudo por tipo) y la etapa en cada tarjeta en curso. «Lo próximo» propone ajustar el marco."),
    ("lanzar", "Lanzar", view_launch(), "Lanzar una llamada desde Cobros, el contacto o el inbox: tipo, agente, objetivo prellenado y modo. Un solo diálogo para todos."),
]

K.build_html(
    "Llamadas · modos y marcos",
    "Mockup F0",
    "Modos Reactivo / Proactivo, marcos por etapas, en vivo, terminada, embudo y lanzador",
    VIEWS,
)
