#!/usr/bin/env python3
"""Lienzo «Plantilla de Meta en página» — F0 del plan `hsm-media` (2026-10-03).

La tesis: la modal apila cuatro pasos numerados porque no tiene sitio. La página tiene sitio, así
que deja de ser un trámite en cuatro actos y pasa a ser lo que el operador está haciendo:
**escribir un mensaje y verlo**. A la izquierda el mensaje en el orden en que se lee; a la derecha
la burbuja, pegajosa, y lo que falta antes de enviar; abajo la isla de tinta con el progreso por
tramos (la pieza que F2 centraliza).

Tres decisiones que este lienzo somete al dueño:
1. «¿Para qué es?» va PRIMERO: la categoría no es metadato, decide el coste y la revisión. Nombre e
   idioma —esos sí metadatos— bajan a «Ficha», al final.
2. La cabecera se elige con una pastilla de cinco (Ninguna · Texto · Imagen · Video · Documento).
3. La frase que vende D1: «Va en cada envío». El medio queda guardado con la plantilla y los seis
   emisores lo mandan solos.

Uso: `python3 hsm-template-page.build.py` → `hsm-template-page.html`.
"""
import pathlib, sys
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from _axi_mockup_kit import Kit, DARK  # noqa: E402

K = Kit("hsm-template-page")
ic, btn, badge = K.ic, K.btn, K.badge

# Foto de ejemplo de la cabecera: contenido del tenant, no un color del sistema.
PHOTO = (
    "data:image/svg+xml;utf8,"
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 210'>"
    "<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>"
    "<stop offset='0' stop-color='%23d9b99b'/><stop offset='1' stop-color='%238a5a44'/></linearGradient>"
    "<radialGradient id='s' cx='.7' cy='.35' r='.6'><stop offset='0' stop-color='%23fff' stop-opacity='.55'/>"
    "<stop offset='1' stop-color='%23fff' stop-opacity='0'/></radialGradient></defs>"
    "<rect width='400' height='210' fill='url(%23g)'/><rect width='400' height='210' fill='url(%23s)'/>"
    "<rect x='150' y='34' width='96' height='150' rx='14' fill='%23f3ebe2' opacity='.92'/>"
    "<path d='M170 34 q28 34 56 0' fill='none' stroke='%238a5a44' stroke-width='5' opacity='.55'/>"
    "<rect x='262' y='70' width='70' height='114' rx='12' fill='%232d2a26' opacity='.85'/>"
    "<circle cx='92' cy='150' r='34' fill='%23f3ebe2' opacity='.35'/></svg>"
)

K.extra_css = """
/* ── Isla de tinta (Island material="ink", §9.5.1) ── */
.ink{ """ + DARK + """ }
.ink{--muted-foreground:color-mix(in srgb, var(--foreground) 70%, transparent);--secondary:color-mix(in srgb, var(--foreground) 8%, transparent);--border:color-mix(in srgb, var(--foreground) 14%, transparent);--border-soft:color-mix(in srgb, var(--foreground) 8%, transparent)}
.ink{background:var(--background);color:var(--foreground);border:1px solid color-mix(in srgb, var(--foreground) 10%, transparent)}
:root:not([data-theme="dark"]) .ink{--axi-brand:#e65759}
.ink :focus-visible{outline-color:color-mix(in srgb, var(--foreground) 50%, transparent)}
.btn.contrast{background:var(--foreground);color:var(--background);border-radius:999px}
.btn.glass{background:color-mix(in srgb, var(--foreground) 8%, transparent);color:var(--foreground);border:1px solid var(--border);border-radius:999px}

/* ── WhatsApp (globals.css .wa-preview, literal) ── */
.wa-preview{--wa-canvas:#efeae2;--wa-bubble:#ffffff;--wa-ink:#111b21;--wa-muted:#667781;--wa-link:#027eb5;--wa-mark:color-mix(in oklab, var(--axi-violet) 14%, transparent);background:var(--wa-canvas);color:var(--wa-ink)}
:root[data-theme="dark"] .wa-preview{--wa-canvas:#0b141a;--wa-bubble:#202c33;--wa-ink:#e9edef;--wa-muted:#8696a0;--wa-link:#53bdeb;--wa-mark:color-mix(in oklab, var(--axi-violet) 26%, transparent)}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]) .wa-preview{--wa-canvas:#0b141a;--wa-bubble:#202c33;--wa-ink:#e9edef;--wa-muted:#8696a0;--wa-link:#53bdeb;--wa-mark:color-mix(in oklab, var(--axi-violet) 26%, transparent)}}
.wa-preview{border-radius:24px;padding:18px;display:flex;flex-direction:column}
.wa-bubble{background:var(--wa-bubble);color:var(--wa-ink);box-shadow:0 1px .5px rgb(11 20 26/.13);max-width:300px;align-self:flex-start;border-radius:4px 14px 14px 14px;overflow:hidden;font-size:14px;line-height:1.42}
.wa-media{display:block;width:calc(100% - 8px);margin:4px 4px 0;aspect-ratio:1.91/1;border-radius:10px;object-fit:cover;background:color-mix(in srgb, var(--wa-muted) 18%, transparent)}
.wa-video{position:relative;margin:4px 4px 0;aspect-ratio:1.91/1;border-radius:10px;background:linear-gradient(135deg,#34495e,#1b2631);display:grid;place-items:center;color:#fff}
.wa-video .play{width:44px;height:44px;border-radius:50%;background:rgb(0 0 0/.45);display:grid;place-items:center}
.wa-video .dur{position:absolute;left:8px;bottom:6px;font-size:11px;background:rgb(0 0 0/.45);padding:1px 6px;border-radius:6px}
.wa-doc{margin:4px 4px 0;border-radius:10px;padding:10px;display:grid;grid-template-columns:34px 1fr;gap:10px;align-items:center;background:color-mix(in srgb, var(--wa-muted) 14%, transparent)}
.wa-doc .pdf{width:34px;height:40px;border-radius:6px;background:#e5534b;color:#fff;font-size:10px;font-weight:700;display:grid;place-items:end center;padding-bottom:5px}
.wa-doc b{display:block;font-weight:500;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wa-doc small{color:var(--wa-muted);font-size:11.5px}
.wa-text{padding:7px 10px 2px}
.wa-head{font-weight:700;padding:7px 10px 0}
.wa-mark{background:var(--wa-mark);border-radius:4px;padding:0 2px}
.wa-muted{color:var(--wa-muted)}
.wa-foot{padding:2px 10px 0;font-size:12.5px}
.wa-time{display:block;text-align:right;font-size:11px;padding:0 8px 5px}
.wa-link{color:var(--wa-link);border-top:1px solid color-mix(in oklab, var(--wa-muted) 22%, transparent);display:flex;gap:6px;align-items:center;justify-content:center;padding:9px 10px;font-size:14px;font-weight:500}

/* ── Página ── */
.back{display:inline-flex;gap:6px;align-items:center;color:var(--muted-foreground);font-size:13px;text-decoration:none;width:fit-content;min-height:24px}
.kicker{font-size:11.5px;letter-spacing:.1em;text-transform:uppercase;font-weight:600;color:var(--muted-foreground)}
.title{font-family:var(--font-heading);font-size:clamp(28px,4cqi,40px);line-height:1.05;letter-spacing:-.025em}
.title-lead{color:var(--muted-foreground);font-size:14px;max-width:62ch;margin-top:6px;text-wrap:pretty}
.layout{display:grid;gap:20px;align-items:start;grid-template-columns:minmax(0,1fr)}
.layout > *{min-width:0}
@container (min-width: 980px){.layout{grid-template-columns:minmax(0,1fr) minmax(0,26rem)} .aside{position:sticky;top:56px}}
.col{display:flex;flex-direction:column;gap:14px}

/* paso (FormStep compartido, F2): todos abiertos al llegar, el operador pliega */
.step{border:1px solid var(--border);border-radius:24px;background:var(--background)}
.step-head{display:flex;align-items:center;gap:12px;width:100%;min-height:56px;padding:12px 20px;text-align:left}
.mark{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;font-size:12px;font-weight:600;flex:none;background:var(--secondary)}
.mark.done{background:var(--foreground);color:var(--background)}
.mark.err{background:color-mix(in srgb, var(--axi-destructive) 15%, var(--background));color:var(--foreground)}
.step-title{font-size:15.5px;font-weight:600;white-space:nowrap}
.step-sum{margin-left:auto;font-size:12.5px;color:var(--muted-foreground);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.step-sum.err{color:var(--foreground)}
.step-body{padding:2px 20px 20px;display:flex;flex-direction:column;gap:18px}
.step.closed .step-body{display:none}
.blk{display:flex;flex-direction:column;gap:8px}
.blk-h{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:500}
.blk-h .count{margin-left:auto;font-size:12px;color:var(--muted-foreground);font-variant-numeric:tabular-nums}
.hint{font-size:12px;color:var(--muted-foreground);line-height:1.45;text-wrap:pretty}
.hint.err{color:var(--axi-destructive)}
.rule{height:1px;background:var(--border-soft)}

/* categoría como propósito */
.purpose{display:grid;gap:8px;grid-template-columns:1fr}
@container (min-width: 620px){.purpose{grid-template-columns:repeat(3,minmax(0,1fr))}}
.opt{display:grid;grid-template-columns:auto 1fr;gap:2px 10px;align-items:start;padding:12px 14px;border:1px solid var(--border);border-radius:16px;text-align:left;min-width:0}
.opt[aria-checked="true"]{border-color:var(--foreground);box-shadow:0 0 0 1px var(--foreground)}
.opt[aria-disabled="true"]{opacity:.55}
.opt .ic{grid-row:span 3;margin-top:2px;color:var(--muted-foreground)}
.opt[aria-checked="true"] .ic{color:var(--axi-violet)}
.opt b{font-weight:600;font-size:14px}
.opt .cost{font-family:var(--font-mono);font-size:11px;color:var(--muted-foreground)}
.opt span:last-child{font-size:12px;color:var(--muted-foreground);line-height:1.4}

/* cuerpo */
.ta{border:1px solid var(--input);border-radius:12px;padding:10px 12px;font-size:14px;line-height:1.55;min-height:112px;background:var(--background)}
.var{font-family:var(--font-mono);font-size:12.5px;background:color-mix(in srgb, var(--axi-violet) 12%, transparent);border-radius:5px;padding:0 3px}
.chip{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 12px;border-radius:999px;background:var(--secondary);font-size:12.5px;font-weight:500;width:fit-content}
.ex{display:grid;gap:8px;grid-template-columns:1fr}
@container (min-width: 620px){.ex{grid-template-columns:1fr 1fr}}
.ex-row{display:flex;gap:8px;align-items:center;min-width:0}
.ex-row .var{flex:none}
.ex-row .input{flex:1;min-width:0}

/* subidor (molde PhotoUploader) */
.drop{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;text-align:center;padding:22px 16px;border:1.5px dashed var(--border);border-radius:16px;color:var(--muted-foreground);font-size:13px;width:100%}
.drop .dz-ic{width:44px;height:44px;border-radius:14px;background:var(--secondary);display:grid;place-items:center;color:var(--foreground)}
.drop b{color:var(--foreground);font-weight:500}
.drop.err{border-color:color-mix(in srgb, var(--axi-destructive) 55%, var(--border))}
.file{display:grid;grid-template-columns:64px minmax(0,1fr) auto;gap:12px;align-items:center;padding:10px;border:1px solid var(--border);border-radius:16px}
.file .th{width:64px;height:48px;border-radius:10px;object-fit:cover;background:var(--secondary);display:grid;place-items:center;color:var(--muted-foreground)}
.file b{display:block;font-weight:500;font-size:13.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.file small{font-size:12px;color:var(--muted-foreground)}
.file .acts{display:flex;gap:4px}
.bar{height:4px;border-radius:999px;background:var(--secondary);overflow:hidden;margin-top:6px}
.bar i{display:block;height:100%;width:40%;border-radius:999px;background:var(--foreground);animation:slide 1.4s var(--ease) infinite}
@keyframes slide{0%{transform:translateX(-100%)}100%{transform:translateX(250%)}}
.sends{display:flex;gap:8px;align-items:flex-start;font-size:12.5px;padding:10px 12px;border-radius:12px;background:color-mix(in srgb, var(--axi-violet) 7%, var(--background));border:1px solid color-mix(in srgb, var(--axi-violet) 18%, var(--border))}
.sends .ic{color:var(--axi-violet);margin-top:1px}
.sends b{font-weight:500}

/* botones de la plantilla */
.tbtn{display:grid;grid-template-columns:auto minmax(0,1fr) minmax(0,1fr) auto;gap:8px;align-items:center}
.tbtn .kind{font-size:12px;color:var(--muted-foreground);display:flex;gap:6px;align-items:center;width:116px;white-space:nowrap}
.adder{display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 14px;border-radius:999px;border:1px dashed color-mix(in srgb, var(--foreground) 20%, transparent);font-size:12.5px;font-weight:500;color:var(--muted-foreground);width:fit-content}
@container (max-width: 560px){.tbtn{grid-template-columns:minmax(0,1fr) auto}.tbtn .kind{grid-column:1/-1;width:auto}}

/* ficha */
.ficha{display:grid;gap:14px;grid-template-columns:1fr}
@container (min-width: 620px){.ficha{grid-template-columns:minmax(0,1fr) 12.5rem}}
.locked{display:inline-flex;gap:5px;align-items:center;font-size:12px;color:var(--muted-foreground)}

/* columna derecha */
.aside{display:flex;flex-direction:column;gap:14px}
.aside h3{font-family:var(--font-body);font-size:13.5px;font-weight:600;letter-spacing:0;display:flex;justify-content:space-between;align-items:baseline;gap:8px}
.aside h3 small{font-weight:400;font-size:12px;color:var(--muted-foreground)}
.before{border:1px solid var(--border);border-radius:24px;padding:16px 18px;display:flex;flex-direction:column;gap:12px}
.chk{display:grid;grid-template-columns:20px minmax(0,1fr);gap:4px 10px;font-size:13px}
.chk .ic{margin-top:1px}
.chk.ok .ic{color:var(--axi-success)} .chk.pend .ic{color:var(--axi-warning)}
.chk .act{grid-column:2;width:fit-content;font-size:12.5px;font-weight:500;text-decoration:underline;text-underline-offset:3px;text-decoration-color:var(--border);min-height:24px}
.was{border:1px solid var(--border);border-radius:16px;padding:12px 14px;font-size:12.5px;color:var(--muted-foreground);white-space:pre-line}
.was b{display:block;color:var(--foreground);font-weight:600;margin-bottom:4px}

/* isla de acción (tinta, sticky, tramos §9.7) */
.dock{position:sticky;bottom:12px;z-index:10;border-radius:24px;padding:12px 14px 12px 18px;display:flex;flex-wrap:wrap;align-items:center;gap:10px 18px;box-shadow:var(--shadow-overlay)}
@container (min-width: 640px){.dock{border-radius:999px}}
.dock .state{display:flex;flex-direction:column;gap:6px;min-width:0;flex:1 1 280px}
.dock .state-t{display:flex;gap:8px;align-items:baseline;font-size:13.5px;font-weight:600}
.dock .state-t .n{font-weight:400;opacity:.7;font-variant-numeric:tabular-nums}
.tramos{display:flex;gap:4px;margin:-6px 0;padding:0;list-style:none}
.tramos button{display:flex;align-items:center;height:24px;width:56px}
.tramos i{display:block;width:100%;height:6px;border-radius:999px;background:color-mix(in srgb, currentColor 20%, transparent)}
.tramos .ok i{background:currentColor} .tramos .warn i{background:var(--axi-warning)}
.dock .detail{font-size:12.5px;color:var(--muted-foreground)}
.dock .cost{font-size:12px;color:var(--muted-foreground)}
.dock .cost b{color:var(--foreground);font-weight:600}
.dock .acts{display:flex;gap:8px;margin-left:auto}

/* móvil y estados */
.phone{width:390px;max-width:100%;margin:0 auto;border:1px solid var(--border);border-radius:28px;overflow:hidden;container-type:inline-size;background:var(--background)}
.phone .page{padding:16px 16px 24px}
.fold{border-radius:20px;background:var(--secondary)}
.fold summary{list-style:none;display:flex;justify-content:space-between;align-items:center;min-height:44px;padding:0 16px;font-size:13.5px;font-weight:600}
.fold .wa-preview{border-radius:0 0 20px 20px}
.states{display:grid;gap:16px;grid-template-columns:1fr}
@container (min-width: 900px){.states{grid-template-columns:1fr 1fr}}
.state-card{border:1px solid var(--border);border-radius:24px;padding:16px 18px;display:flex;flex-direction:column;gap:10px}
.state-card h4{font-family:var(--font-body);font-size:12px;letter-spacing:.08em;text-transform:uppercase;font-weight:600;color:var(--muted-foreground)}
.starts{display:grid;gap:8px;grid-template-columns:1fr}
@container (min-width: 620px){.starts{grid-template-columns:repeat(3,minmax(0,1fr))}}
.start{border:1px solid var(--border);border-radius:16px;padding:12px;text-align:left;display:flex;flex-direction:column;gap:4px}
.start b{font-size:13.5px;font-weight:600;display:flex;gap:6px;align-items:center}
.start b .ic{color:var(--axi-violet)}
.start span{font-size:12px;color:var(--muted-foreground);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}

/* ── v2 (feedback del dueño 2026-10-03) ── */
/* 1. La isla de acción: compacta y centrada, no del ancho de la página */
.dock{align-self:center;width:fit-content;max-width:100%;gap:12px 22px;padding:10px 10px 10px 20px}
.dock .state{flex:0 0 auto;gap:7px}
.tramos button{width:40px}
.dock .sep{width:1px;align-self:stretch;background:var(--border)}
.dock .price-line{display:flex;flex-direction:column;gap:1px;font-size:12px;color:var(--muted-foreground);white-space:nowrap}
.dock .price-line b{color:var(--foreground);font-weight:600;font-size:13px}
.dock .acts{margin-left:0}
@container (max-width: 640px){.dock{width:100%;padding:14px 16px}.dock .sep{display:none}.dock .acts{width:100%;justify-content:flex-end}}

/* 2. Nombre + versión */
.namegroup{position:relative;display:flex;align-items:stretch;border:1px solid var(--input);border-radius:var(--radius-md);background:var(--background)}
.namegroup .input{border:0;border-radius:var(--radius-md) 0 0 var(--radius-md);min-height:40px}
.namegroup.locked{background:var(--secondary)}
.vsel{display:flex;align-items:center;gap:6px;padding:0 10px 0 12px;border-left:1px solid var(--input);font-family:var(--font-mono);font-size:13px;white-space:nowrap;min-height:40px}
.vsel .ic{color:var(--muted-foreground)}
.techname{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:12px;color:var(--muted-foreground)}
.techname code{font-family:var(--font-mono);font-size:12px;color:var(--foreground);background:var(--secondary);border-radius:6px;padding:2px 6px}
.vpop{position:absolute;right:0;top:calc(100% + 6px);z-index:5;width:min(270px,100%);border-radius:16px;border:1px solid var(--border);background:color-mix(in srgb, var(--background) 86%, transparent);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);box-shadow:var(--shadow-overlay);padding:6px}
.vpop li{list-style:none;display:grid;grid-template-columns:30px 1fr auto;align-items:center;gap:8px;padding:8px 10px;border-radius:10px;font-size:13px}
.vpop li .v{font-family:var(--font-mono)}
.vpop li small{color:var(--muted-foreground);font-size:11.5px}
.vpop li[aria-disabled="true"]{opacity:.55}
.vpop li[aria-selected="true"]{background:var(--secondary)}
.vpop ul{margin:0;padding:0}

/* 3. Empieza desde */
.startbox{display:flex;flex-direction:column;gap:10px}
.start-head{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:6px 12px}
.start-head h2{font-family:var(--font-body);font-size:15px;font-weight:600;letter-spacing:0}
.start-head a{display:inline-flex;gap:6px;align-items:center;font-size:12.5px;font-weight:500;text-decoration:none;min-height:24px}
.start-row{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(196px,1fr);gap:10px;overflow-x:auto;padding:2px 2px 6px;scrollbar-width:thin}
.scard{border:1px solid var(--border);border-radius:18px;padding:12px 14px;display:flex;flex-direction:column;gap:6px;text-align:left;min-width:0;background:var(--background)}
.scard:hover{border-color:color-mix(in srgb, var(--foreground) 30%, var(--background))}
.scard .src{display:flex;gap:5px;align-items:center;font-size:10.5px;letter-spacing:.07em;text-transform:uppercase;font-weight:600;color:var(--muted-foreground)}
.scard .src.axi .ic{color:var(--axi-violet)}
.scard b{font-size:13.5px;font-weight:600}
.scard .sbody{font-size:12px;color:var(--muted-foreground);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.scard.blank{border-style:dashed;align-items:flex-start;justify-content:center}
.scard.blank .ic{color:var(--foreground)}
.scard[aria-pressed="true"]{border-color:var(--foreground);box-shadow:0 0 0 1px var(--foreground)}
.started{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;font-size:12.5px;color:var(--muted-foreground)}
.started b{color:var(--foreground);font-weight:500}
.started button{font-weight:500;color:var(--foreground);text-decoration:underline;text-underline-offset:3px;text-decoration-color:var(--border);min-height:24px}

/* biblioteca: hoja lateral (flota → cristal, DESIGN §5.1) */
.stack{position:relative}
.stack .scrim{position:absolute;inset:0;background:var(--scrim);z-index:20}
.sheet{position:absolute;top:0;right:0;bottom:0;z-index:21;width:min(640px,100%);display:flex;flex-direction:column;gap:14px;padding:22px 24px;overflow:auto;border-left:1px solid var(--border);background:color-mix(in srgb, var(--background) 90%, transparent);backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);box-shadow:var(--shadow-overlay)}
.sheet-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
.sheet-head h2{font-size:22px}
.sheet-head p{color:var(--muted-foreground);font-size:13px;margin-top:4px;max-width:52ch;text-wrap:pretty}
.chips{display:flex;flex-wrap:wrap;gap:6px}
.chips button{height:30px;padding:0 12px;border-radius:999px;border:1px solid var(--border);font-size:12.5px;font-weight:500;color:var(--muted-foreground)}
.chips button[aria-pressed="true"]{background:var(--foreground);color:var(--background);border-color:var(--foreground)}
.lgrid{display:grid;gap:10px;grid-template-columns:1fr}
@container (min-width: 520px){.lgrid{grid-template-columns:1fr 1fr}}
.lcard{border:1px solid var(--border);border-radius:18px;padding:14px;display:flex;flex-direction:column;gap:8px;background:var(--background)}
.lcard[aria-selected="true"]{border-color:var(--foreground);box-shadow:0 0 0 1px var(--foreground)}
.lcard .top{display:flex;justify-content:space-between;gap:8px;align-items:baseline}
.lcard b{font-size:13.5px;font-weight:600}
.lcard .use{font-size:11.5px;color:var(--muted-foreground)}
.lcard .mini{font-size:12.5px;line-height:1.5;padding:10px 12px;border-radius:12px;background:var(--secondary)}
.lcard .mini mark{background:color-mix(in srgb, var(--axi-violet) 14%, transparent);color:inherit;border-radius:4px;padding:0 2px}
.lcard .row{display:flex;justify-content:space-between;align-items:center;gap:8px}
.instant{display:inline-flex;gap:5px;align-items:center;font-size:11.5px;color:var(--muted-foreground)}
.instant .ic{color:var(--axi-success)}

/* 4. ¿Para qué es? — dos decisiones, no tres casillas */
.purpose{display:grid;gap:12px;grid-template-columns:1fr}
@container (min-width: 620px){.purpose{grid-template-columns:1fr 1fr}}
.pcard{position:relative;display:flex;flex-direction:column;gap:14px;padding:18px 18px 16px;border-radius:20px;border:1px solid var(--border);background:var(--background);text-align:left;min-width:0;transition:border-color .15s var(--ease), box-shadow .15s var(--ease)}
.pcard:hover{border-color:color-mix(in srgb, var(--foreground) 30%, var(--background))}
.pcard[aria-checked="true"]{border-color:var(--foreground);box-shadow:0 0 0 1px var(--foreground), var(--shadow-float)}
.pcard[aria-disabled="true"]{opacity:.5}
.pcard .phead{display:flex;align-items:center;gap:12px}
.pcard .glyph{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;background:var(--secondary);color:var(--foreground);flex:none}
.pcard[aria-checked="true"] .glyph{background:var(--foreground);color:var(--background)}
.pcard .ptitle{display:flex;flex-direction:column;min-width:0}
.pcard .ptitle b{font-size:15.5px;font-weight:600;letter-spacing:-.01em}
.pcard .ptitle span{font-size:12.5px;color:var(--muted-foreground)}
.pcard .tick{margin-left:auto;width:22px;height:22px;border-radius:50%;border:1.5px solid var(--border);display:grid;place-items:center;flex:none}
.pcard[aria-checked="true"] .tick{background:var(--foreground);border-color:var(--foreground);color:var(--background)}
.pcard .pex{font-size:13px;line-height:1.45;color:var(--foreground);padding:10px 12px;border-radius:12px;background:var(--secondary)}
.pcard .pex small{display:block;font-size:10.5px;letter-spacing:.07em;text-transform:uppercase;color:var(--muted-foreground);font-weight:600;margin-bottom:3px}
.pcard .pfoot{display:flex;flex-direction:column;gap:4px;padding-top:12px;border-top:1px solid var(--border-soft)}
.pcard .price{display:flex;align-items:baseline;gap:6px;white-space:nowrap}
.pcard .price b{font-family:var(--font-heading);font-size:24px;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.pcard .price span{font-size:12px;color:var(--muted-foreground)}
.pcard .review{font-size:12px;color:var(--muted-foreground)}
.pcard .review b{color:var(--foreground);font-weight:500}
.auth-note{display:flex;gap:8px;align-items:center;font-size:12px;color:var(--muted-foreground)}

/* «Empieza desde» v3: a todo el ancho, carrusel sin barra, con desvanecidos y flechas */
.startbox{gap:12px}
.start-tools{display:flex;align-items:center;gap:12px}
.start-nav{display:flex;gap:6px}
.start-nav button{width:32px;height:32px;border-radius:50%;border:1px solid var(--border);display:grid;place-items:center;background:var(--background);color:var(--foreground);transition:opacity .15s var(--ease)}
.start-nav button:hover{background:var(--secondary)}
.start-nav button:disabled{opacity:.35;cursor:default;background:var(--background)}
.start-row{grid-auto-columns:220px;scrollbar-width:none;-ms-overflow-style:none;scroll-snap-type:x proximity;scroll-behavior:smooth;
  --fade-l:0px;--fade-r:48px;
  -webkit-mask-image:linear-gradient(to right,transparent 0,#000 var(--fade-l),#000 calc(100% - var(--fade-r)),transparent 100%);
  mask-image:linear-gradient(to right,transparent 0,#000 var(--fade-l),#000 calc(100% - var(--fade-r)),transparent 100%)}
.start-row::-webkit-scrollbar{display:none}
.start-row[data-start="false"]{--fade-l:48px}
.start-row[data-end="true"]{--fade-r:0px}
.start-row > *{scroll-snap-align:start}
@media (prefers-reduced-motion: reduce){.start-row{scroll-behavior:auto}}
@media (prefers-reduced-motion: reduce){.bar i{animation:none;width:100%}}
"""


# ----------------------------------------------------------------------------- piezas
def step(n, title, summary, body, mark="done", closed=False, sum_err=False):
    m = ic("check", size=13) if mark == "done" else ("!" if mark == "err" else str(n))
    return f"""
<section class="step {'closed' if closed else ''}" aria-label="{title}">
  <button class="step-head" aria-expanded="{str(not closed).lower()}">
    <span class="mark {mark}" aria-hidden="true">{m}</span>
    <span class="step-title">{title}</span>
    <span class="step-sum {'err' if sum_err else ''}">{summary}</span>
    {ic('chevron-down', 'muted', 16)}
  </button>
  <div class="step-body">{body}</div>
</section>"""


def seg(options, active):
    items = "".join(
        f'<button role="radio" aria-checked="{str(label == active).lower()}">{ic(icon, size=15)}{label}</button>'
        for label, icon in options
    )
    return f'<div class="seg inline sm" role="radiogroup" aria-label="Tipo de cabecera">{items}</div>'


HEADER_KINDS = [("Ninguna", "ban"), ("Texto", "type"), ("Imagen", "image"), ("Video", "video"), ("Documento", "file-text")]


def purpose(active="Marketing", locked=False):
    opts = [
        ("Marketing", "megaphone", "Promociones y lanzamientos", "Ya llegó la colección nueva: 20 % hasta el domingo.", "0,02", "Revisión estricta", "≈ 25 × utilidad"),
        ("Utilidad", "package-check", "Algo que el cliente inició", "Tu pedido #4821 ya salió. Llega mañana entre 9 y 12.", "0,0008", "Revisión rápida", "suele aprobarse en minutos"),
    ]
    cards = []
    for label, icon, sub, example, price, review, review_sub in opts:
        checked = label == active
        dis = locked and not checked
        cards.append(f"""
<button class="pcard" role="radio" aria-checked="{str(checked).lower()}" aria-disabled="{str(dis).lower()}">
  <span class="phead">
    <span class="glyph">{ic(icon, size=18)}</span>
    <span class="ptitle"><b>{label}</b><span>{sub}</span></span>
    <span class="tick" aria-hidden="true">{ic('check', size=13) if checked else ''}</span>
  </span>
  <span class="pex"><small>Por ejemplo</small>{example}</span>
  <span class="pfoot">
    <span class="price"><b>US$ {price}</b><span>por mensaje</span></span>
    <span class="review"><b>{review}</b> · {review_sub}</span>
  </span>
</button>""")
    note = f'<p class="auth-note">{ic("key-round", size=14)}Las de autenticación —códigos de verificación— no se crean desde aquí.</p>'
    return f'<div class="purpose" role="radiogroup" aria-label="Para qué es">{"".join(cards)}</div>{note}'


BODY = 'Hola <span class="var">{{1}}</span>, ya llegó la colección de temporada a Savage. Tienes <span class="var">{{2}}</span> de descuento en tu próxima compra hasta el domingo.'
BODY_TXT = "Hola {{1}}, ya llegó la colección de temporada a Savage. Tienes {{2}} de descuento en tu próxima compra hasta el domingo."


def body_block(ex2="", ex2_err=False):
    ex2_input = K.input(ex2, "Escribe un ejemplo", "err" if ex2_err else "")
    err = '<p class="hint err">Meta exige un ejemplo por cada variable: falta el de {{2}}.</p>' if ex2_err else ""
    return f"""
<div class="blk">
  <div class="blk-h">Texto<span class="count">2 variables · {len(BODY_TXT)} / 1024</span></div>
  <div class="ta">{BODY}</div>
  <button class="chip">{ic('plus', size=14)}<span class="mono">{{{{3}}}}</span> insertar variable</button>
  <p class="hint">Las variables van en orden, nunca abren ni cierran el mensaje y no van pegadas.</p>
</div>
<div class="blk">
  <div class="blk-h">Un ejemplo por variable <span class="muted" style="font-weight:400">· Meta lo usa para revisar</span></div>
  <div class="ex">
    <div class="ex-row"><span class="var">{{{{1}}}}</span>{K.input('Ana')}</div>
    <div class="ex-row"><span class="var">{{{{2}}}}</span>{ex2_input}</div>
  </div>
  {err}
</div>"""


def file_row(kind="image", name="coleccion-temporada.jpg", meta="JPG · 412 KB", state="ready"):
    th = f'<img class="th" src="{PHOTO}" alt="">' if kind == "image" else f'<span class="th">{ic("video" if kind == "video" else "file-text", size=20)}</span>'
    if state == "uploading":
        info = f'<div><b>{name}</b><small>Subiendo a Meta para la revisión…</small><div class="bar" role="progressbar" aria-label="Subiendo"><i></i></div></div>'
        acts = f'<div class="acts">{btn("Cancelar", "", "ghost xs")}</div>'
    else:
        info = f'<div><b>{name}</b><small>{meta} · lista</small></div>'
        acts = f'<div class="acts">{btn("Reemplazar", "refresh-cw", "outline xs")}<button class="btn ghost icon sm" aria-label="Quitar">{ic("trash-2", size=15)}</button></div>'
    return f'<div class="file">{th}{info}{acts}</div>'


SENDS = f"""<p class="sends">{ic('repeat-2', size=16)}<span><b>Va en cada envío.</b> Queda guardada con la plantilla:
campañas, seguimientos, cobros y automatizaciones la mandan solas, sin que la elijas otra vez.</span></p>"""


def header_block(kind="Imagen", state="ready"):
    if kind == "Texto":
        inner = f"""{K.input('Temporada nueva en Savage')}<p class="hint">Va en negrita arriba. Hasta 60 caracteres y un solo hueco.</p>"""
    elif kind == "Ninguna":
        inner = '<p class="hint">Sin cabecera el mensaje empieza por el texto. Para promociones, una imagen suele leerse mejor.</p>'
    else:
        inner = file_row(state=state) + SENDS
    return f"""
<div class="blk">
  <div class="blk-h">Cabecera</div>
  {seg(HEADER_KINDS, kind)}
  {inner}
</div>"""


FOOTER = f"""
<div class="blk">
  <div class="blk-h">Pie<span class="count">47 / 60</span></div>
  {K.input('Responde SALIR para no recibir más promociones')}
  <p class="hint">Sin variables: Meta no las admite en el pie. Es donde suele ir la salida del cliente.</p>
</div>"""

BUTTONS = f"""
<div class="blk">
  <div class="blk-h">Botones<span class="count">2 de 10</span></div>
  <div class="tbtn"><span class="kind">{ic('external-link', size=14)}Enlace</span>{K.input('Ver la colección')}{K.input('savage.co/temporada')}<button class="btn ghost icon sm" aria-label="Quitar botón">{ic('x', size=15)}</button></div>
  <div class="tbtn"><span class="kind">{ic('copy', size=14)}Copiar código</span>{K.input('Copiar código')}{K.input('SAVAGE20')}<button class="btn ghost icon sm" aria-label="Quitar botón">{ic('x', size=15)}</button></div>
  <button class="adder">{ic('plus', size=14)}Añadir botón</button>
</div>"""


def name_group(human="Temporada colección", version="v2", locked=False, popover=False):
    pop = ""
    if popover:
        pop = f"""<div class="vpop" role="listbox" aria-label="Versión">
  <ul>
    <li aria-disabled="true"><span class="v">v1</span><small>Aprobada · en uso</small>{badge('En uso', 'ok')}</li>
    <li aria-selected="true"><span class="v">v2</span><small>Libre · la siguiente</small>{ic('check', size=14)}</li>
    <li><span class="v">v3</span><small>Libre</small><span></span></li>
  </ul>
</div>"""
    sel = (f'<span class="vsel">{version}{ic("lock", size=13)}</span>' if locked
           else f'<span class="vsel" role="combobox" aria-expanded="{str(popover).lower()}">{version}{ic("chevron-down", size=14)}</span>')
    return f"""<div class="namegroup {'locked' if locked else ''}">{K.input(human, 'Cómo la reconoces, p. ej. Temporada colección', 'readonly' if locked else '')}{sel}{pop}</div>"""


def techname(tech):
    return f'<p class="techname">En Meta: <code>{tech}</code><span>· lo formateamos por ti</span></p>'


def ficha(human="Temporada colección", tech="temporada_coleccion_v2", version="v2", locked=False):
    lock_hint = '<p class="hint">Meta no deja cambiar nombre ni versión: para otra, crea una nueva desde la lista.</p>' if locked else ""
    tech_line = techname(tech) if human else '<p class="techname">Escribe un nombre: lo pasamos al formato de Meta y le ponemos versión.</p>'
    return f"""
<div class="ficha">
  <div class="field"><label>Nombre</label>{name_group(human, version, locked)}{tech_line}{lock_hint}</div>
  <div class="field"><label>Idioma</label>{K.select('Español (Colombia)', 'readonly' if locked else '')}</div>
</div>"""


def bubble(header="image", ex2="20 %"):
    if header == "image":
        top = f'<img class="wa-media" src="{PHOTO}" alt="Imagen de la cabecera">'
    elif header == "video":
        top = f'<div class="wa-video"><span class="play">{ic("play", size=20)}</span><span class="dur">0:18</span></div>'
    elif header == "document":
        top = '<div class="wa-doc"><span class="pdf">PDF</span><span><b>catalogo-temporada.pdf</b><small>PDF · 2,4 MB</small></span></div>'
    elif header == "text":
        top = '<p class="wa-head">Temporada nueva en Savage</p>'
    else:
        top = ""
    v2 = ex2 or "{{2}}"
    return f"""
<div class="wa-preview">
  <div class="wa-bubble">
    {top}
    <p class="wa-text">Hola <mark class="wa-mark">Ana</mark>, ya llegó la colección de temporada a Savage. Tienes <mark class="wa-mark">{v2}</mark> de descuento en tu próxima compra hasta el domingo.</p>
    <p class="wa-foot wa-muted">Responde SALIR para no recibir más promociones</p>
    <span class="wa-time wa-muted">9:41</span>
    <span class="wa-link">{ic('external-link', size=15)}Ver la colección</span>
    <span class="wa-link">{ic('copy', size=15)}Copiar código</span>
  </div>
</div>"""


def before(items):
    rows = []
    for kind, text, act in items:
        icon = "circle-check" if kind == "ok" else "circle-alert"
        a = f'<button class="act">{act}</button>' if act else ""
        rows.append(f'<div class="chk {"ok" if kind == "ok" else "pend"}">{ic(icon, size=17)}<span>{text}</span>{a}</div>')
    return f'<div class="before"><h3>Antes de enviar</h3>{"".join(rows)}</div>'


def dock(title, n, tramos, detail, cta="Enviar a revisión de Meta", ready=False, category="Marketing", price="US$ 0,02"):
    tr = "".join(
        f'<li><button class="{st}" aria-label="{lbl}: {"listo" if st == "ok" else "por resolver"}"><i></i></button></li>'
        for lbl, st in tramos
    )
    dis = "" if ready else 'aria-disabled="true" style="opacity:.6"'
    return f"""
<footer class="dock ink">
  <div class="state">
    <span class="state-t">{title}<span class="n">{n}</span></span>
    <ul class="tramos" aria-label="Qué falta">{tr}</ul>
    <span class="detail">{detail}</span>
  </div>
  <span class="sep" aria-hidden="true"></span>
  <span class="price-line"><b>{category} · {price}</b>por mensaje en Colombia</span>
  <div class="acts">{btn('Cancelar', '', 'glass sm')}<button class="btn contrast sm" {dis}>{cta}</button></div>
</footer>"""


LIBRARY = [
    ("Recordatorio de pago", "Pagos", 'Hola <mark>Ana</mark>, te recordamos que tu pago de <mark>$ 180.000</mark> vence el <mark>15 de octubre</mark>.'),
    ("Pedido en camino", "Pedidos y envíos", 'Tu pedido <mark>#4821</mark> ya va en camino. Llega el <mark>jueves 9</mark>.'),
    ("Pago recibido", "Pagos", 'Recibimos tu pago de <mark>$ 180.000</mark>. Gracias por tu compra.'),
    ("¿Cómo te fue?", "Opiniones", '¿Cómo te fue con <mark>tu pedido #4821</mark>? Responde del 1 al 5.'),
    ("Cambio en tu cuenta", "Cuenta", 'Hola <mark>Ana</mark>, actualizamos el correo de tu cuenta a <mark>a***@correo.co</mark>.'),
    ("Pedido listo para recoger", "Pedidos y envíos", 'Tu pedido <mark>#4821</mark> está listo. Recógelo en <mark>Savage Centro</mark>.'),
]


def start_strip(pressed="En blanco"):
    def card(src_cls, src_icon, src, title, body, blank=False):
        p = str(title == pressed).lower()
        if blank:
            return f'<button class="scard blank" aria-pressed="{p}">{ic("plus", size=18)}<b>{title}</b><span class="sbody">{body}</span></button>'
        return f'<button class="scard" aria-pressed="{p}"><span class="src {src_cls}">{ic(src_icon, size=12)}{src}</span><b>{title}</b><span class="sbody">{body}</span></button>'
    meta_hint = "Aprobación inmediata si no cambias el texto fijo"
    cards = (
        card("", "", "", "En blanco", "Escribe la tuya desde cero", blank=True)
        + card("axi", "sparkles", "axi sugiere", "Retomar conversación", "«Hola {{1}}, te escribo por {{2}}. ¿Seguimos?»")
        + card("axi", "sparkles", "axi sugiere", "Recordar cotización", "«Hola {{1}}, tu cotización de {{2}} sigue vigente.»")
        + card("axi", "sparkles", "axi sugiere", "Confirmar interés", "«Hola {{1}}, hace unos días hablamos de {{2}}.»")
        + card("", "library-big", "Biblioteca de Meta", "Recordatorio de pago", meta_hint)
        + card("", "library-big", "Biblioteca de Meta", "Pedido en camino", meta_hint)
        + card("", "library-big", "Biblioteca de Meta", "Pago recibido", meta_hint)
        + card("", "library-big", "Biblioteca de Meta", "¿Cómo te fue?", meta_hint)
    )
    return f"""
<section class="startbox" aria-label="Empieza desde">
  <div class="start-head">
    <h2>Empieza desde</h2>
    <div class="start-tools">
      <a href="#biblioteca">{ic('library-big', size=14)}Explorar la biblioteca de Meta{ic('arrow-right', size=14)}</a>
      <div class="start-nav">
        <button type="button" data-dir="-1" aria-label="Anteriores" disabled>{ic('chevron-left', size=16)}</button>
        <button type="button" data-dir="1" aria-label="Siguientes">{ic('chevron-right', size=16)}</button>
      </div>
    </div>
  </div>
  <div class="start-row" data-start="true" data-end="false">{cards}</div>
</section>"""


# El carrusel de «Empieza desde»: flechas que pasan de tarjetas, desvanecidos
# que solo aparecen donde queda contenido, y sin barra de desplazamiento.
CAROUSEL_JS = """<script>
(function () {
  document.querySelectorAll('.startbox').forEach(function (box) {
    if (box.dataset.bound) return;
    box.dataset.bound = '1';
    var row = box.querySelector('.start-row');
    var prev = box.querySelector('[data-dir="-1"]');
    var next = box.querySelector('[data-dir="1"]');
    function sync() {
      var atStart = row.scrollLeft <= 2;
      var atEnd = row.scrollLeft + row.clientWidth >= row.scrollWidth - 2;
      row.dataset.start = String(atStart);
      row.dataset.end = String(atEnd);
      prev.disabled = atStart;
      next.disabled = atEnd;
    }
    function step(dir) {
      var card = row.firstElementChild;
      var width = card ? card.getBoundingClientRect().width + 10 : 230;
      var perPage = Math.max(1, Math.floor(row.clientWidth / width));
      row.scrollBy({ left: dir * perPage * width, behavior: 'smooth' });
    }
    prev.addEventListener('click', function () { step(-1); });
    next.addEventListener('click', function () { step(1); });
    row.addEventListener('scroll', sync, { passive: true });
    new ResizeObserver(sync).observe(row);
    document.querySelectorAll('.mk-view').forEach(function (b) { b.addEventListener('click', function () { setTimeout(sync, 50); }); });
    sync();
  });
})();
</script>"""


def started(origin="en blanco"):
    return f'<p class="started">{ic("corner-down-right", size=14)}Empezaste <b>{origin}</b><button>Cambiar</button></p>'


def page(title, lead, left, right, dock_html, kicker="Plantillas de Meta", top=""):
    return f"""
<div class="shell"><div class="page">
  <a class="back" href="#">{ic('arrow-left', size=15)}Plantillas de Meta</a>
  <header><p class="kicker">{kicker}</p><h1 class="title">{title}</h1><p class="title-lead">{lead}</p></header>
  {top}
  <div class="layout">
    <div class="col">{left}</div>
    <aside class="aside" aria-label="Así se verá">{right}</aside>
  </div>
  {dock_html}
</div></div>"""


PENDING = [("Para qué", "ok"), ("Mensaje", "warn"), ("Ficha", "ok")]


# ----------------------------------------------------------------------------- vistas
def view_imagen():
    left = (
        step(1, "¿Para qué es?", "Marketing · US$ 0,02 por mensaje", purpose())
        + step(2, "El mensaje", "Hay algo que corregir", header_block() + '<div class="rule"></div>' + body_block(ex2_err=True) + '<div class="rule"></div>' + FOOTER + '<div class="rule"></div>' + BUTTONS, mark="err", sum_err=True)
        + step(3, "Ficha", "temporada_coleccion_v2 · es_CO", ficha())
    )
    right = (
        '<h3>Así se verá <small>con tus ejemplos</small></h3>'
        + bubble(ex2="")
        + before([
            ("ok", "Imagen lista: JPG de 412 KB. Meta la usa como ejemplo al revisar.", ""),
            ("pend", "Falta el ejemplo de <span class='mono'>{{2}}</span>.", "Escribirlo"),
            ("ok", "Nombre libre: <span class='mono'>temporada_coleccion_v2</span> (la v1 sigue en uso).", ""),
        ])
    )
    return page(
        "Nueva plantilla",
        "Un mensaje fijo con huecos que se rellenan con datos del contacto. Meta lo revisa antes de que puedas usarlo; suele decidir en minutos.",
        left, right,
        dock("Casi lista", "2/3", PENDING, "Falta el ejemplo de {{2}}"),
        top=started("en blanco"),
    )


def view_vacia():
    left = (
        step(1, "¿Para qué es?", "Utilidad · US$ 0,0008 por mensaje", purpose("Utilidad"), mark="1")
        + step(2, "El mensaje", "Sin escribir", header_block("Ninguna") + '<div class="rule"></div>' + '<div class="blk"><div class="blk-h">Texto<span class="count">0 variables · 0 / 1024</span></div><div class="ta muted">Hola {{1}}, te escribo por {{2}}. ¿Seguimos?</div>' + f'<button class="chip">{ic("plus", size=14)}<span class="mono">{{{{1}}}}</span> insertar variable</button></div>' + f'<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="adder">{ic("message-square", size=14)}Añadir pie</button><button class="adder">{ic("corner-up-left", size=14)}Añadir botones</button></div>', mark="2")
        + step(3, "Ficha", "Sin nombre", ficha("", version="v1"), mark="3")
    )
    right = (
        '<h3>Así se verá</h3>'
        + '<div class="wa-preview"><div class="wa-bubble"><p class="wa-text wa-muted">Escribe el texto y aquí verás el mensaje tal como le llega al cliente.</p><span class="wa-time wa-muted">9:41</span></div></div>'
        + before([("pend", "Escribe el texto del mensaje.", "Ir al mensaje"), ("pend", "Ponle un nombre interno.", "Ir a la ficha")])
    )
    return page(
        "Nueva plantilla",
        "Un mensaje fijo con huecos que se rellenan con datos del contacto. Meta lo revisa antes de que puedas usarlo; suele decidir en minutos.",
        left, right,
        dock("Por empezar", "1/3", [("Para qué", "ok"), ("Mensaje", "pend"), ("Ficha", "pend")], "Falta el texto y el nombre", category="Utilidad", price="US$ 0,0008"),
        top=start_strip() + CAROUSEL_JS,
    )


def view_estados():
    def card(h, inner):
        return f'<div class="state-card"><h4>{h}</h4>{inner}</div>'
    empty = f'<button class="drop"><span class="dz-ic">{ic("image-up", size=20)}</span><b>Arrastra una imagen o elige un archivo</b><span>JPG o PNG, hasta 5 MB</span></button>'
    rejected = (
        f'<button class="drop err"><span class="dz-ic">{ic("image-off", size=20)}</span><b>Elige otra imagen</b><span>JPG o PNG, hasta 5 MB</span></button>'
        '<p class="hint err">«banner.webp» es WebP. En la cabecera, Meta solo acepta JPG o PNG.</p>'
    )
    too_big = '<p class="hint err">«video-lanzamiento.mov» pesa 48 MB. El video de la cabecera va en MP4 y hasta 16 MB.</p>'
    meta_err = K.notice("err", "<b>Meta no aceptó el archivo.</b> No se guardó nada. Vuelve a intentarlo; si se repite, prueba con otra imagen.", acts=btn("Reintentar", "refresh-cw", "outline xs"))
    states = (
        card("Vacío", empty)
        + card("Subiendo · barra sin porcentaje (fetch no lo da)", file_row(state="uploading"))
        + card("Lista", file_row() + SENDS)
        + card("Rechazado en el navegador, antes de subir", rejected + too_big)
        + card("Video lista", file_row("video", "lanzamiento-temporada.mp4", "MP4 · 0:18 · 9,8 MB"))
        + card("Documento listo · tope 25 MB (el nuestro, no los 100 de Meta)", file_row("document", "catalogo-temporada.pdf", "PDF · 2,4 MB"))
        + card("Meta rechazó la subida", meta_err)
        + card("Así llegan video y documento", f'<div style="display:grid;gap:10px">{bubble("video")}{bubble("document")}</div>')
    )
    return f'<div class="shell"><div class="page"><header><p class="kicker">Subidor de la cabecera</p><h1 class="title">Estados del archivo</h1><p class="title-lead">Molde: el subidor de fotos del catálogo. Se valida en el navegador antes de subir, y el error dice qué pasó y qué hacer.</p></header><div class="states">{states}</div></div></div>'


def view_rechazada():
    reason = K.notice("err", "<b>Por qué la rechazó Meta:</b> la imagen parece un anuncio de un producto que no vendes en tu catálogo (política de comercio).<br><span class='muted small'>Una rechazada se corrige sin límite de ediciones. Al guardar vuelve a «En revisión».</span>")
    left = (
        reason
        + step(1, "¿Para qué es?", "Marketing · US$ 0,02 por mensaje", purpose())
        + step(2, "El mensaje", "Imagen · 2 variables · pie · 2 botones", header_block() + '<div class="rule"></div>' + body_block("20 %") + '<div class="rule"></div>' + FOOTER + '<div class="rule"></div>' + BUTTONS)
        + step(3, "Ficha", "temporada_coleccion_v1 · es_CO · fijos", ficha(tech="temporada_coleccion_v1", version="v1", locked=True), closed=True)
    )
    right = '<h3>Así se verá <small>con tus ejemplos</small></h3>' + bubble() + before([("ok", "Imagen nueva lista para la revisión.", ""), ("ok", "Todo lo demás, en orden.", "")])
    return page(
        "Corregir «temporada_coleccion_v1»",
        "Meta la revisa otra vez. El nombre y el idioma no se pueden cambiar: son suyos desde que la creaste.",
        left, right,
        dock("Lista", "3/3", [("Para qué", "ok"), ("Mensaje", "ok"), ("Ficha", "ok")], "Se envía de nuevo a revisión", "Guardar y reenviar a revisión", True),
        kicker="Rechazada",
    )


def view_aprobada():
    left = (
        step(1, "¿Para qué es?", "Marketing · fija en una aprobada", purpose(locked=True) + '<p class="hint">Una aprobada no cambia de categoría: para otra, crea una plantilla nueva.</p>', closed=True)
        + step(2, "El mensaje", "Imagen · 2 variables · pie · 2 botones", header_block() + '<div class="rule"></div>' + body_block("20 %") + '<div class="rule"></div>' + FOOTER + '<div class="rule"></div>' + BUTTONS)
        + step(3, "Ficha", "temporada_coleccion_v1 · es_CO · fijos", ficha(tech="temporada_coleccion_v1", version="v1", locked=True), closed=True)
    )
    right = (
        '<h3>Así se verá <small>con tus ejemplos</small></h3>'
        + bubble()
        + '<div class="was"><b>Antes</b>Hola {{1}}, ya llegó la colección de temporada a Savage. Tienes {{2}} de descuento hasta el domingo.</div>'
        + K.notice("warn", "<b>Editar la reenvía a revisión.</b> Mientras Meta decide, sigue saliendo la versión aprobada. Te quedan 9 ediciones este mes.")
    )
    return page(
        "Editar «temporada_coleccion_v1»",
        "Aprobada y en uso. Puedes cambiar el mensaje y los botones; Meta la revisa de nuevo.",
        left, right,
        dock("Con cambios", "3/3", [("Para qué", "ok"), ("Mensaje", "ok"), ("Ficha", "ok")], "Cambiaste el texto", "Guardar y reenviar a revisión", True),
        kicker="Aprobada",
    )


def view_movil():
    inner = f"""
<div class="page">
  <a class="back" href="#">{ic('arrow-left', size=15)}Plantillas de Meta</a>
  <header><p class="kicker">Plantillas de Meta</p><h1 class="title">Nueva plantilla</h1></header>
  <details class="fold" open><summary>Así se verá {ic('chevron-down', size=16)}</summary>{bubble(ex2="")}</details>
  {started("en blanco")}
  {step(1, "¿Para qué es?", "Marketing", purpose(), closed=True)}
  {step(2, "El mensaje", "Hay algo que corregir", header_block() + '<div class="rule"></div>' + body_block(ex2_err=True), mark="err", sum_err=True)}
  {step(3, "Ficha", "temporada_coleccion_v2", ficha(), closed=True)}
  {dock("Casi lista", "2/3", PENDING, "Falta el ejemplo de {{2}}")}
</div>"""
    return f'<div class="shell" style="padding:20px 16px 48px"><div class="phone">{inner}</div></div>'


def view_nombre():
    def card(h, inner):
        return f'<div class="state-card"><h4>{h}</h4>{inner}</div>'
    typed = (f'<div class="field"><label>Nombre</label>{name_group("¡Promo Día de la Madre 2026!", "v1")}'
             + techname("promo_dia_de_la_madre_2026_v1") + "</div>")
    picking = (f'<div class="field" style="padding-bottom:150px"><label>Nombre</label>{name_group("Temporada colección", "v2", popover=True)}'
               + techname("temporada_coleccion_v2") + "</div>")
    reserved = (f'<div class="field"><label>Nombre</label>{name_group("Bienvenida", "v3")}'
                + techname("bienvenida_v3")
                + '<p class="hint">La v2 se borró el 28 sep: Meta reserva su nombre hasta el 28 oct. Te proponemos la v3.</p></div>')
    locked = (f'<div class="field"><label>Nombre</label>{name_group("Temporada colección", "v1", locked=True)}'
              + techname("temporada_coleccion_v1")
              + '<p class="hint">Meta no deja cambiar nombre ni versión: para otra, crea una nueva desde la lista.</p></div>')
    states = (
        card("Se escribe como se dice; Meta recibe su formato", typed)
        + card("La versión: la siguiente libre, ya elegida", picking)
        + card("Una versión borrada queda reservada 30 días", reserved)
        + card("Editando: nombre y versión fijos", locked)
    )
    return (f'<div class="shell"><div class="page"><header><p class="kicker">Ficha</p><h1 class="title">Nombre y versión</h1>'
            '<p class="title-lead">Un campo para el nombre como lo dices y un selector para la versión. Las tildes, los signos, los espacios y las mayúsculas los resolvemos al escribir.</p></header>'
            f'<div class="states">{states}</div></div></div>')


def view_biblioteca():
    chips = "".join(
        f'<button aria-pressed="{str(t == "Todas").lower()}">{t}</button>'
        for t in ["Todas", "Pagos", "Pedidos y envíos", "Cuenta", "Opiniones"]
    )
    cards = []
    for i, (title, use, body) in enumerate(LIBRARY):
        sel = i == 0
        action = (btn("Usar esta plantilla", "", "sm") if sel else "")
        cards.append(f"""<div class="lcard" aria-selected="{str(sel).lower()}">
  <div class="top"><b>{title}</b><span class="use">{use}</span></div>
  <p class="mini">{body}</p>
  <div class="row"><span class="instant">{ic('zap', size=12)}Aprobación inmediata</span>{action}</div>
</div>""")
    sheet = f"""
<aside class="sheet" aria-label="Biblioteca de Meta">
  <div class="sheet-head">
    <div><p class="kicker">Empieza desde</p><h2>Biblioteca de Meta</h2>
    <p>Plantillas de utilidad que Meta ya redactó. Si no cambias su texto fijo, se aprueban al instante; los huecos los rellenas tú.</p></div>
    <button class="btn ghost icon sm" aria-label="Cerrar">{ic('x', size=16)}</button>
  </div>
  {K.input('', 'Busca: pago, pedido, cita…', 'adorn', icon='search')}
  <div class="chips" role="group" aria-label="Caso de uso">{chips}</div>
  <div class="lgrid">{"".join(cards)}</div>
  <p class="auth-note">{ic('info', size=14)}La biblioteca no trae plantillas de marketing: para una promoción con imagen, empieza en blanco.</p>
</aside>"""
    return f'<div class="stack">{view_vacia()}<div class="scrim"></div>{sheet}</div>'


VIEWS = [
    ("imagen", "Crear con imagen", view_imagen(), "La capacidad nueva: cabecera de imagen subida, con su frase «Va en cada envío». Un pendiente para enseñar «Antes de enviar» y los tramos."),
    ("vacia", "Crear vacía", view_vacia(), "«Empieza desde»: en blanco, lo que axi sugiere o la Biblioteca de Meta, en una sola fila. Al elegir, se pliega a una línea."),
    ("biblioteca", "Biblioteca de Meta", view_biblioteca(), "La biblioteca completa en una hoja lateral: buscador, casos de uso y una vista de cada plantilla. Elegir una llena el formulario como Utilidad."),
    ("nombre", "Nombre y versión", view_nombre(), "Un campo para el nombre como lo dices, el formato de Meta resuelto al escribir, y un selector de versión que ya propone la siguiente libre."),
    ("estados", "Estados del subidor", view_estados(), "Vacío, subiendo, lista, rechazos del navegador y de Meta; video y documento en la burbuja."),
    ("rechazada", "Corregir rechazada", view_rechazada(), "El motivo de Meta arriba, la ficha plegada y fija; reenviar sin límite."),
    ("aprobada", "Editar aprobada", view_aprobada(), "Categoría y ficha fijas; «Antes» al lado de la burbuja y el aviso de que sigue saliendo la aprobada."),
    ("movil", "Móvil 390", view_movil(), "Una columna; la burbuja arriba y plegable; la isla deja de ser píldora."),
]

K.build_html("Plantilla de Meta en página", "F0 · hsm-media", "Crear y editar plantillas: el mensaje a la izquierda, la burbuja a la derecha", VIEWS)
