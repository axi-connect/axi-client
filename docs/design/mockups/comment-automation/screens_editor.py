"""Editor de «Comenta y recibe» y sus estados — pantallas 2 y 4 del plan comment-automation (2026-11-06).

Molde: `hsm-template-page.build.py` (pasos plegables a la izquierda, vista previa pegajosa a la derecha,
«Antes de activar» siempre a la vista e isla de tinta con tramos abajo, DS §9.7).

Vistas que exporta (`VIEWS`):
- editor   → los seis pasos abiertos; el teléfono de Instagram en la etapa «Mensaje».
- entrega  → pasos 1–4 plegados con su resumen; el teléfono de Facebook en la etapa «Entrega».
- estados  → vacío con glifo de cristal, conexión, permisos, Meta revisando, cola, modo prueba y error tipado.
- editor-movil → el editor a 390 px (clave distinta de la «movil» de screens_list): una columna, vista previa plegable arriba, la isla deja de ser píldora.
"""
from __future__ import annotations

from _shared import K, ic, btn, badge, POSTS, ACCOUNT, PEOPLE, net, pill, phone, health  # noqa: F401

# ----------------------------------------------------------------------------- CSS (molde hsm-template-page + propio)
K.extra_css += """
/* ═══ Editor «Comenta y recibe» (screens_editor.py) ═══ */
.ink :focus-visible{outline-color:color-mix(in srgb, var(--foreground) 50%, transparent)}

/* ── Página (molde hsm-template-page; .page lo define _shared) ── */
.back{display:inline-flex;gap:6px;align-items:center;color:var(--muted-foreground);font-size:13px;text-decoration:none;width:fit-content;min-height:24px}
.ed-head .kicker,.st-head .kicker{font-size:11.5px;letter-spacing:.1em;text-transform:uppercase;font-weight:600;color:var(--muted-foreground)}
.title{font-family:var(--font-heading);font-size:clamp(28px,4cqi,40px);line-height:1.05;letter-spacing:-.025em;min-width:0}
.title-lead{color:var(--muted-foreground);font-size:14px;max-width:62ch;margin-top:6px;text-wrap:pretty}
.namerow{display:flex;align-items:center;gap:6px;margin-top:4px;min-width:0}
.namerow .btn{color:var(--muted-foreground)}
.saved{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;margin-top:10px;font-size:12.5px;color:var(--muted-foreground)}
.layout{display:grid;gap:20px;align-items:start;grid-template-columns:minmax(0,1fr)}
.layout > *{min-width:0}
@container (min-width: 980px){.layout{grid-template-columns:minmax(0,1fr) minmax(0,26rem)} .aside{position:sticky;top:56px}}
/* con el aside pegajoso, el chat desplaza dentro del teléfono para que «Antes de activar» siga a la vista */
@container (min-width: 980px){.aside .pp-body{max-height:max(240px, calc(100vh - 640px));overflow-y:auto;scrollbar-width:thin;overscroll-behavior:contain} .aside .pp-body > *{flex-shrink:0}}
.col{display:flex;flex-direction:column;gap:14px}

/* ── Paso (FormStep) ── */
.step{border:1px solid var(--border);border-radius:24px;background:var(--background);min-width:0}
.step-head{display:flex;align-items:center;gap:12px;width:100%;min-height:56px;padding:12px 20px;text-align:left;min-width:0}
.mark{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;font-size:12px;font-weight:600;flex:none;background:var(--secondary)}
.mark.done{background:var(--foreground);color:var(--background)}
.step-title{font-size:15.5px;font-weight:600;white-space:nowrap;flex:none}
/* resumen: sin «…», corte con difuminado */
/* el difuminado cae sobre un relleno vacío: solo se ve cuando el texto de verdad no cabe */
.step-sum{margin-left:auto;margin-right:-14px;padding-right:20px;font-size:12.5px;color:var(--muted-foreground);min-width:0;overflow:hidden;white-space:nowrap;
  -webkit-mask-image:linear-gradient(to left,transparent,#000 20px);mask-image:linear-gradient(to left,transparent,#000 20px)}
.step-head > .ic{flex:none}
.step-body{padding:2px 20px 20px;display:flex;flex-direction:column;gap:18px}
.step.closed .step-body{display:none}
.step:not(.closed) .step-head > .ic:last-child{transform:rotate(180deg)}
.blk{display:flex;flex-direction:column;gap:8px;min-width:0}
.blk-h{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:500;min-width:0}
.blk-h .count{margin-left:auto;font-size:12px;color:var(--muted-foreground);font-variant-numeric:tabular-nums;white-space:nowrap}
.hint{font-size:12px;color:var(--muted-foreground);line-height:1.45;text-wrap:pretty}
.hint .ic{vertical-align:-2px;margin-right:4px}
.rule{height:1px;background:var(--border-soft)}
.adder{display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 14px;border-radius:999px;border:1px dashed color-mix(in srgb, var(--foreground) 20%, transparent);font-size:12.5px;font-weight:500;color:var(--muted-foreground);width:fit-content;white-space:nowrap}
.ta{border:1px solid var(--input);border-radius:12px;padding:10px 12px;font-size:14px;line-height:1.55;min-height:88px;background:var(--background);text-wrap:pretty}

/* ── 1. ¿Dónde? ── */
.chans{display:grid;gap:8px;grid-template-columns:minmax(0,1fr)}
@container (min-width: 560px){.chans{grid-template-columns:repeat(2,minmax(0,1fr))}}
.chan{display:grid;grid-template-columns:28px minmax(0,1fr) 22px;gap:2px 10px;align-items:center;padding:12px 14px;border:1px solid var(--border);border-radius:16px;text-align:left;min-width:0}
.chan[aria-checked="true"]{border-color:var(--foreground);box-shadow:0 0 0 1px var(--foreground)}
.chan .net{width:28px;height:28px;border-radius:8px;display:grid;place-items:center;color:#fff;grid-row:span 2}
.chan b{font-size:14px;font-weight:600;min-width:0}
.chan small{grid-column:2;display:flex;align-items:center;gap:6px;font-size:12px;color:var(--muted-foreground)}
.chan small i{width:7px;height:7px;border-radius:50%;background:var(--axi-success);flex:none}
.tick{width:22px;height:22px;border-radius:6px;border:1.5px solid var(--border);display:grid;place-items:center;flex:none;grid-row:span 2;grid-column:3}
[aria-checked="true"] > .tick{background:var(--foreground);border-color:var(--foreground);color:var(--background)}
.posts{display:grid;gap:10px;grid-template-columns:repeat(auto-fill,minmax(128px,1fr))}
.post{position:relative;display:flex;flex-direction:column;gap:6px;padding:6px 6px 10px;border:1px solid var(--border);border-radius:16px;text-align:left;min-width:0}
.post[aria-checked="true"]{border-color:var(--foreground);box-shadow:0 0 0 1px var(--foreground)}
.post img{display:block;width:100%;aspect-ratio:4/5;object-fit:cover;border-radius:11px}
.post .tick{position:absolute;top:12px;right:12px;background:color-mix(in srgb, var(--background) 72%, transparent);border-color:color-mix(in srgb, var(--foreground) 35%, transparent);box-shadow:var(--shadow-float);border-radius:50%}
.post[aria-checked="true"] .tick{background:var(--foreground);color:var(--background)}
.post b{font-size:12.5px;font-weight:600;padding:0 4px;min-width:0;overflow:hidden;white-space:nowrap;
  -webkit-mask-image:linear-gradient(to right,#000 82%,transparent);mask-image:linear-gradient(to right,#000 82%,transparent)}
.post .pmeta{display:flex;align-items:center;gap:6px;padding:0 4px;font-size:11.5px;color:var(--muted-foreground);min-width:0;flex-wrap:wrap}
.post .netmini .net{width:16px;height:16px;border-radius:5px}

/* ── 2. ¿Qué escriben? ── */
.kws{display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:8px;border:1px solid var(--input);border-radius:12px;min-width:0}
.kwchip{display:inline-flex;align-items:center;gap:4px;height:30px;padding:0 4px 0 10px;border-radius:9px;background:var(--secondary);font-family:var(--font-mono);font-size:12.5px;white-space:nowrap}
.kwchip .x{width:22px;height:22px;border-radius:6px;display:grid;place-items:center;color:var(--muted-foreground)}
.kws .kwadd{flex:1 1 9rem;min-width:0;height:30px;display:flex;align-items:center;padding:0 6px;font-size:13px;color:var(--muted-foreground)}
.trow{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 14px;align-items:start;padding:14px 16px;border:1px solid var(--border);border-radius:16px;min-width:0}
.trow .tt{display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px;font-size:14px;font-weight:500}
.trow .td{grid-column:1;font-size:13px;color:var(--muted-foreground);max-width:64ch;text-wrap:pretty}
.trow .sw{margin-top:2px}
.trow .tx{grid-column:1/-1;display:flex;gap:8px;align-items:flex-start;font-size:12.5px;margin-top:8px;padding-top:10px;border-top:1px solid var(--border-soft)}
.trow .tx .ic{margin-top:2px;color:var(--muted-foreground)}
.trow.ai{border-color:color-mix(in srgb, var(--axi-violet) 22%, var(--border));background:color-mix(in srgb, var(--axi-violet) 4%, var(--background))}
.trow.off .tt{color:var(--foreground)}

/* ── 3. Respuesta pública ── */
.variants{display:flex;flex-direction:column;gap:8px;list-style:none;margin:0;padding:0}
.variant{display:grid;grid-template-columns:24px minmax(0,1fr) auto;gap:10px;align-items:start;padding:10px 8px 10px 12px;border:1px solid var(--border);border-radius:14px;font-size:13.5px;line-height:1.5;min-width:0}
.variant .n{width:22px;height:22px;border-radius:50%;background:var(--secondary);display:grid;place-items:center;font-size:11.5px;font-weight:600;margin-top:1px}
.variant p{min-width:0;text-wrap:pretty}
.variant .acts{display:flex;gap:2px}
.variant .acts .btn{color:var(--muted-foreground)}
.at{font-family:var(--font-mono);font-size:12.5px;background:var(--secondary);border:1px solid var(--border);border-radius:6px;padding:0 4px;white-space:nowrap}
.btn.ai-soft{background:color-mix(in srgb, var(--axi-violet) 10%, var(--background));color:var(--foreground);border-color:color-mix(in srgb, var(--axi-violet) 22%, var(--border))}
.btn.ai-soft .ic{color:var(--axi-violet)}
.row-acts{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.cap{display:flex;flex-wrap:wrap;align-items:center;gap:8px;font-size:13.5px}
.cap .num{display:inline-flex;align-items:center;justify-content:center;min-width:56px;height:36px;padding:0 10px;border:1px solid var(--input);border-radius:var(--radius-sm);font-variant-numeric:tabular-nums;font-weight:500}

/* ── 4. Mensaje privado ── */
.btnlabel{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center}
.btnlabel .count{font-size:12px;color:var(--muted-foreground);font-variant-numeric:tabular-nums}

/* ── 5. La entrega ── */
.dblocks{display:flex;flex-direction:column;gap:8px;list-style:none;margin:0;padding:0}
.dblock{display:grid;grid-template-columns:20px 36px minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px 8px 10px 6px;border:1px solid var(--border);border-radius:16px;background:var(--background);min-width:0}
.dblock .grip{color:var(--muted-foreground);cursor:grab;display:grid;place-items:center;height:36px}
.dblock .bt{width:36px;height:36px;border-radius:11px;background:var(--secondary);display:grid;place-items:center}
.dblock .bc{display:flex;flex-direction:column;gap:2px;min-width:0}
.dblock .bc b{font-size:13px;font-weight:600}
.dblock .bc span{font-size:12.5px;color:var(--muted-foreground);min-width:0}
.dblock .bc .clip{text-wrap:pretty}
@container (max-width: 480px){.dblock{grid-template-columns:20px minmax(0,1fr) auto;padding-left:4px}.dblock .bt{display:none}}
.dblock .bc .one{white-space:nowrap;overflow:hidden;-webkit-mask-image:linear-gradient(to right,#000 85%,transparent);mask-image:linear-gradient(to right,#000 85%,transparent)}
.dblock .thumbs{display:flex;gap:4px;margin-top:4px}
.dblock .thumbs img{width:34px;height:42px;border-radius:7px;object-fit:cover}
.dblock .acts{display:flex;gap:2px}
.dblock .acts .btn{color:var(--muted-foreground)}
.dblock .linkbtn{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 9px;margin-top:4px;border-radius:999px;border:1px solid var(--border);font-size:12px;font-weight:500;width:fit-content;max-width:100%;white-space:nowrap}
.addwrap{position:relative;display:flex;flex-direction:column;gap:8px}
.addwrap.open{padding-bottom:318px}
.menu{position:absolute;left:0;top:42px;z-index:6;width:min(300px,100%);padding:6px;border-radius:16px;border:1px solid var(--border);
  background:color-mix(in srgb, var(--background) 88%, transparent);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);box-shadow:var(--shadow-overlay);list-style:none;margin:0}
.menu li{display:grid;grid-template-columns:20px minmax(0,1fr) auto;gap:10px;align-items:center;min-height:38px;padding:0 10px;border-radius:10px;font-size:13.5px}
.menu li:first-child{background:var(--secondary)}
.menu li .ic{color:var(--muted-foreground)}
.menu li[aria-disabled="true"]{color:var(--muted-foreground)}
.menu .sep{height:1px;min-height:0;padding:0;margin:4px 6px;background:var(--border-soft)}
.soon{font-size:10.5px;font-weight:500;padding:1px 7px;border-radius:999px;border:1px solid var(--border);color:var(--muted-foreground);white-space:nowrap}

/* ── 6. Después ── */
.ed-form{display:grid;gap:14px;grid-template-columns:minmax(0,1fr)}
@container (min-width: 620px){.ed-form{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}}
.tags{display:flex;flex-wrap:wrap;gap:6px;align-items:center;min-height:36px}
.tagchip{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 6px 0 10px;border-radius:999px;border:1px solid var(--border);font-size:12.5px;font-weight:500;white-space:nowrap}
.tagchip > .ic:first-child{color:var(--muted-foreground)}
.tagchip .x{width:20px;height:20px;border-radius:50%;display:grid;place-items:center;color:var(--muted-foreground)}
.knows{display:grid;grid-template-columns:20px minmax(0,1fr);gap:10px;padding:12px 14px;border-radius:14px;background:var(--secondary);font-size:13px}
.knows .ic{margin-top:2px}
.knows b{font-weight:600}

/* ── Columna derecha ── */
.aside{display:flex;flex-direction:column;gap:14px}
.aside h3{font-family:var(--font-body);font-size:13.5px;font-weight:600;letter-spacing:0}
.prev-tools{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.before{border:1px solid var(--border);border-radius:24px;padding:16px 18px;display:flex;flex-direction:column;gap:12px}
.before h3{font-family:var(--font-body);font-size:13.5px;font-weight:600;letter-spacing:0}
.chk{display:grid;grid-template-columns:20px minmax(0,1fr);gap:4px 10px;font-size:13px}
.chk .ic{margin-top:1px}
.chk.ok .ic{color:var(--axi-success)} .chk.pend .ic{color:var(--muted-foreground)}
.chk .act{grid-column:2;width:fit-content;margin-top:4px}

/* ── Teléfono: piezas propias (colores del canal solo aquí) ── */
.phone-prev{--p-at:#00376b}
.phone-prev.fb{--p-at:#0866ff}
:root[data-theme="dark"] .phone-prev{--p-at:#e0f1ff}
:root[data-theme="dark"] .phone-prev.fb{--p-at:#4599ff}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]) .phone-prev{--p-at:#e0f1ff} :root:not([data-theme="light"]) .phone-prev.fb{--p-at:#4599ff}}
.pp-at{color:var(--p-at);font-weight:500}
.pp-split{display:flex;align-items:center;gap:8px;margin:8px 0 2px}
.pp-split::before,.pp-split::after{content:"";flex:1;height:1px;background:var(--p-line)}
.pp-comment > span:nth-child(2){min-width:0;overflow-wrap:anywhere}
.pp-me.tap{display:inline-flex;align-items:center;gap:6px}
.pp-trio{display:grid;grid-template-columns:2fr 1fr;grid-template-rows:1fr 1fr;gap:2px;width:72%}
.pp-trio img{aspect-ratio:auto;height:100%;min-height:0}
.pp-trio img:first-child{grid-row:span 2;aspect-ratio:4/5}
.pp-video{position:relative;align-self:flex-start;width:62%;aspect-ratio:9/16;max-height:200px;border-radius:18px;overflow:hidden;background:linear-gradient(160deg,#6b4a3a,#2b211c);display:grid;place-items:center;color:#fff}
.pp-video .play{width:40px;height:40px;border-radius:50%;background:rgb(0 0 0/.45);display:grid;place-items:center}
.pp-video .dur{position:absolute;left:8px;bottom:8px;font-size:11px;background:rgb(0 0 0/.45);padding:1px 6px;border-radius:6px}
.pp-file .fi{color:#e5534b}
.pp-file b{font-weight:600;font-size:13px}
.pp-file > span{min-width:0}

/* ── Isla de acción (tinta, una fila, tramos; molde v5) ── */
.dock{position:sticky;bottom:12px;z-index:10;border-radius:24px;display:flex;align-items:center;box-shadow:var(--shadow-overlay);
  align-self:center;width:fit-content;max-width:100%;padding:8px 8px 8px 20px;gap:10px 18px;flex-wrap:nowrap}
@container (min-width: 640px){.dock{border-radius:999px}}
.tramos{display:flex;gap:4px;margin:0;padding:0;list-style:none;flex:none}
.tramos button{display:flex;align-items:center;height:24px;width:34px}
.tramos i{display:block;width:100%;height:6px;border-radius:999px;background:color-mix(in srgb, currentColor 20%, transparent)}
.tramos .ok i{background:currentColor}
.dock .sep{width:1px;height:28px;align-self:center;background:var(--border);flex:none}
.dock .state-text{display:flex;flex-direction:column;gap:1px;min-width:0;max-width:22rem}
.dock .state-t{display:flex;gap:8px;align-items:baseline;font-size:13px;line-height:1.3;font-weight:600;white-space:nowrap}
.dock .state-t .n{font-weight:400;opacity:.7;font-variant-numeric:tabular-nums}
.dock .detail{font-size:12px;line-height:1.3;color:var(--muted-foreground);white-space:nowrap;overflow:hidden;padding-right:16px;
  -webkit-mask-image:linear-gradient(to left,transparent,#000 16px);mask-image:linear-gradient(to left,transparent,#000 16px)}
.dock .acts{display:flex;gap:8px;margin-left:6px;flex:none}
/* angosta: tramos a todo el ancho arriba, estado debajo, acciones a la derecha (la isla deja de ser píldora) */
@container (max-width: 640px){.dock{width:100%;flex-wrap:wrap;padding:12px 14px;gap:10px 12px}.dock .sep{display:none}
  .dock .tramos{flex:1 1 100%}.dock .tramos li{flex:1 1 0;min-width:0}.dock .tramos button{width:100%}
  .dock .state-text{flex:1 1 100%;max-width:none}.dock .acts{margin-left:0;width:100%;justify-content:flex-end}
  .dock .detail{white-space:normal;padding-right:0;-webkit-mask-image:none;mask-image:none}}

/* ── Móvil 390 ── */
.phone{width:390px;max-width:100%;margin:0 auto;border:1px solid var(--border);border-radius:28px;overflow:hidden;container-type:inline-size;background:var(--background)}
.phone .page{padding:16px 16px 24px}
.fold{border-radius:20px;background:var(--secondary)}
.fold summary{list-style:none;display:flex;justify-content:space-between;align-items:center;min-height:44px;padding:0 16px;font-size:13.5px;font-weight:600;cursor:pointer}
.fold summary::-webkit-details-marker{display:none}
.fold[open] summary .ic{transform:rotate(180deg)}
.fold .fold-in{display:flex;flex-direction:column;gap:12px;padding:0 12px 14px}
@container (max-width: 640px){.step-head{padding:12px 16px;gap:10px}.step-body{padding:2px 16px 18px}}

/* ── Estados ── */
.states{display:grid;gap:16px;grid-template-columns:minmax(0,1fr)}
@container (min-width: 900px){.states{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}}
.state-card{border:1px solid var(--border);border-radius:24px;padding:16px 18px;display:flex;flex-direction:column;gap:12px;container-type:inline-size;min-width:0}
.state-card.wide{grid-column:1/-1}
.state-card h4{font-family:var(--font-body);font-size:12px;letter-spacing:.08em;text-transform:uppercase;font-weight:600;color:var(--muted-foreground)}
.state-card .lead2{font-size:13.5px;text-wrap:pretty}
.st-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
/* Glifo de cristal (aproxima GlassGlyph «conversation»): translucidez pintada, SIN backdrop-filter */
.gglyph{position:relative;width:96px;height:96px;border-radius:50%;display:grid;place-items:center;margin-bottom:6px;
  color:color-mix(in srgb, var(--foreground) 62%, transparent);
  background:
    radial-gradient(circle at 30% 24%, rgb(255 255 255/.85), transparent 30%),
    radial-gradient(circle at 72% 82%, color-mix(in srgb, var(--axi-brand) 16%, transparent), transparent 58%),
    linear-gradient(160deg, color-mix(in srgb, var(--foreground) 3%, var(--background)), color-mix(in srgb, var(--foreground) 10%, var(--background)));
  box-shadow:inset 0 0 0 1.5px color-mix(in srgb, var(--foreground) 22%, transparent), inset 0 -8px 16px color-mix(in srgb, var(--foreground) 6%, transparent),
    0 14px 28px -14px color-mix(in srgb, var(--axi-brand) 40%, transparent)}
:root[data-theme="dark"] .gglyph{background:
    radial-gradient(circle at 30% 24%, rgb(255 255 255/.32), transparent 30%),
    radial-gradient(circle at 72% 82%, color-mix(in srgb, var(--axi-brand) 20%, transparent), transparent 58%),
    linear-gradient(160deg, rgb(255 255 255/.05), rgb(255 255 255/.12))}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]) .gglyph{background:
    radial-gradient(circle at 30% 24%, rgb(255 255 255/.32), transparent 30%),
    radial-gradient(circle at 72% 82%, color-mix(in srgb, var(--axi-brand) 20%, transparent), transparent 58%),
    linear-gradient(160deg, rgb(255 255 255/.05), rgb(255 255 255/.12))}}
.gglyph .dotc{position:absolute;top:26px;right:24px;width:12px;height:12px;border-radius:50%;background:var(--axi-brand);box-shadow:0 0 0 3px color-mix(in srgb, var(--axi-brand) 18%, transparent)}
.qline{display:flex;flex-direction:column;gap:6px}
.qtrack{height:8px;border-radius:999px;background:var(--secondary);overflow:hidden;display:flex}
.qtrack i{display:block;height:100%;background:color-mix(in srgb, var(--foreground) 78%, transparent)}
.qmeta{display:flex;justify-content:space-between;flex-wrap:wrap;gap:4px 12px;font-size:12px;color:var(--muted-foreground)}
.qmeta b{color:var(--foreground);font-weight:600;font-variant-numeric:tabular-nums}
.erow{display:grid;grid-template-columns:28px minmax(0,1fr);gap:4px 10px;align-items:start;padding:12px;border:1px solid var(--border);border-radius:16px;font-size:13px}
.erow .av{width:28px;height:28px;border-radius:50%;background:var(--secondary);display:grid;place-items:center;font-size:11px;font-weight:600}
.erow .et{display:flex;flex-wrap:wrap;gap:6px 8px;align-items:center}
.erow small{grid-column:2;color:var(--muted-foreground);font-size:12px}
.testers{display:flex;flex-wrap:wrap;gap:6px}
/* el icono de un botón dentro de un aviso no hereda el color del aviso */
.notice .btn .ic{color:currentColor;margin-top:0}
"""


# ----------------------------------------------------------------------------- textos
OPENING = "Hola, te escribe Norte Studio. Tengo lista la Colección Cápsula: fotos, precios y el lookbook. Toca el botón y te lo envío."
DELIVERY_TEXT = "Aquí está la Colección Cápsula: 12 prendas en algodón y lino, de la S a la XL. Envío a toda Colombia en 48 horas."
VARIANTS = [
    "listo, te escribí por mensaje. Si no lo ves, revisa tus solicitudes.",
    "te mandé los detalles por privado. Míralo en tus mensajes.",
    "ya va por mensaje. Si no aparece, búscalo en solicitudes.",
]
KEYWORDS = ["INFO", "PRECIO", "LO QUIERO"]
TRAMOS = [("Dónde", "ok"), ("Qué escriben", "ok"), ("Respuesta", "ok"), ("Mensaje", "ok"), ("Entrega", "ok"), ("Prueba", "pend")]


# ----------------------------------------------------------------------------- piezas
def step(n, title, summary, body, mark="done", closed=False):
    m = ic("check", size=13) if mark == "done" else str(n)
    return f"""
<section class="step {'closed' if closed else ''}" aria-label="{title}">
  <button class="step-head" aria-expanded="{str(not closed).lower()}">
    <span class="mark {mark}" aria-hidden="true">{m}</span>
    <span class="step-title">{title}</span>
    <span class="step-sum">{summary}</span>
    {ic('chevron-down', 'muted', 16)}
  </button>
  <div class="step-body">{body}</div>
</section>"""


def seg(options, active, label):
    items = "".join(
        f'<button role="radio" aria-checked="{str(lbl == active).lower()}">{ic(icon, size=14) if icon else ""}{lbl}</button>'
        for lbl, icon in options
    )
    return f'<div class="seg inline sm" role="radiogroup" aria-label="{label}">{items}</div>'


def tick(on=True):
    return f'<span class="tick" aria-hidden="true">{ic("check", size=13) if on else ""}</span>'


# 1. ¿Dónde? -------------------------------------------------------------------
def chan(kind, name, on=True):
    cls = "ig" if kind == "instagram" else "fb"
    return (
        f'<button class="chan" role="checkbox" aria-checked="{str(on).lower()}">'
        f'<span class="net {cls}">{ic(kind, size=15)}</span><b>{name}</b>{tick(on)}'
        f'<small><i></i>Comentarios activos</small></button>'
    )


def post_card(key, on=False, both=False):
    p = POSTS[key]
    nets = (net("instagram", 10) + net("facebook", 10)) if both else net(p["channel"], 10)
    return (
        f'<button class="post" role="checkbox" aria-checked="{str(on).lower()}">'
        f'<img src="{p["thumb"]}" alt="">{tick(on)}'
        f'<b>{p["title"]}</b><span class="pmeta"><span class="netmini">{nets}</span>{p["when"]}</span></button>'
    )


def where_body():
    posts = (post_card("capsula", on=True, both=True) + post_card("tenis") + post_card("vestidos") + post_card("gorras"))
    return f"""
<div class="blk">
  <div class="blk-h">Canales</div>
  <div class="chans" role="group" aria-label="Canales">{chan("instagram", ACCOUNT["ig"])}{chan("facebook", ACCOUNT["fb"])}</div>
</div>
<div class="blk">
  <div class="blk-h">Publicaciones<span class="count">1 elegida</span></div>
  {seg([("Las que elijas", ""), ("Todas las publicaciones", "")], "Las que elijas", "Qué publicaciones")}
  <div class="posts" role="group" aria-label="Publicaciones recientes">{posts}</div>
  <p class="hint">{ic('clock', size=13)}Responde comentarios de hasta 7 días: es la regla de Meta.</p>
</div>"""


# 2. ¿Qué escriben? -------------------------------------------------------------
def words_body():
    chips = "".join(
        f'<span class="kwchip">{w}<button class="x" aria-label="Quitar {w}">{ic("x", size=13)}</button></span>' for w in KEYWORDS
    )
    return f"""
<div class="blk">
  <div class="blk-h">Palabras clave<span class="count">{len(KEYWORDS)}</span></div>
  <div class="kws">{chips}<span class="kwadd">{ic('plus', size=14)}&nbsp;Añadir palabra</span></div>
  <p class="hint">Sin importar tildes ni mayúsculas: «info», «Info» e «ÍNFO» cuentan igual.</p>
</div>
<div class="trow ai">
  <span class="tt">Axi entiende la intención {badge('IA', 'ai', 'sparkles')}</span>
  {K.switch(True, label="Axi entiende la intención")}
  <p class="td">Reconoce «¿precio?», «me interesa» o «cuánto vale» aunque no escriban la palabra exacta. Cuenta en tus usos de IA, con tope por publicación.</p>
  <p class="tx">{ic('shield-check', size=15)}<span>Una queja no recibe la promoción: te avisamos para que respondas tú.</span></p>
</div>"""


# 3. Respuesta pública ----------------------------------------------------------
def reply_body():
    rows = "".join(
        f'<li class="variant"><span class="n">{i + 1}</span><p><span class="at">@usuario</span> {v}</p>'
        f'<span class="acts"><button class="btn ghost icon sm" aria-label="Editar la variante {i + 1}">{ic("pencil", size=15)}</button>'
        f'<button class="btn ghost icon sm" aria-label="Quitar la variante {i + 1}">{ic("trash-2", size=15)}</button></span></li>'
        for i, v in enumerate(VARIANTS)
    )
    return f"""
<div class="trow">
  <span class="tt">Responder en el comentario</span>
  {K.switch(True, label="Responder en el comentario")}
  <p class="td">Es lo que ve todo el que mira la publicación: muestra que contestas y sube el alcance.</p>
</div>
<div class="blk">
  <div class="blk-h">Variantes<span class="count">3 · rotan en orden</span></div>
  <ol class="variants">{rows}</ol>
  <div class="row-acts">
    <button class="adder">{ic('plus', size=14)}Añadir variante</button>
    {btn('Escribir más con Axi', 'sparkles', 'ai-soft sm')}
  </div>
  <p class="hint"><span class="at">@usuario</span> se cambia por la cuenta de quien comentó.</p>
</div>
<div class="blk">
  <div class="blk-h">Tope</div>
  <p class="cap">Máximo <span class="num" role="spinbutton" aria-valuenow="60" aria-label="Respuestas por hora">60</span> respuestas por hora en esta publicación</p>
  <p class="hint">Meta castiga las respuestas idénticas en serie. Por encima del tope no se responde en público, pero el mensaje privado sí sale.</p>
</div>"""


# 4. Mensaje privado ------------------------------------------------------------
def dm_body():
    return f"""
<div class="blk">
  <div class="blk-h">Primer mensaje<span class="count">{len(OPENING)} / 1000</span></div>
  <div class="ta">{OPENING}</div>
</div>
<div class="blk">
  <div class="blk-h">Botón</div>
  <div class="btnlabel">{K.input('Envíamelo')}<span class="count">9 / 20</span></div>
</div>
{K.notice('info', 'Meta deja enviar <b>un solo mensaje</b> antes de que la persona responda. El botón abre la conversación para entregar todo lo demás.')}
<div class="trow off">
  <span class="tt">Pedir que sigan la cuenta antes de entregar</span>
  {K.switch(False, label="Pedir que sigan la cuenta antes de entregar")}
  <p class="td">Al tocar «Envíamelo» revisamos si te sigue. Si no, le pedimos que te siga y toque otra vez. Es un paso más: úsalo si buscas seguidores.</p>
</div>"""


# 5. La entrega -----------------------------------------------------------------
def dblock(icon, title, inner, label):
    return (
        f'<li class="dblock"><span class="grip" aria-label="Mover {label}" role="button">{ic("grip-vertical", size=16)}</span>'
        f'<span class="bt">{ic(icon, size=17)}</span><div class="bc"><b>{title}</b>{inner}</div>'
        f'<span class="acts"><button class="btn ghost icon sm" aria-label="Editar {label}">{ic("pencil", size=15)}</button>'
        f'<button class="btn ghost icon sm" aria-label="Quitar {label}">{ic("trash-2", size=15)}</button></span></li>'
    )


def add_menu(open_=False):
    items = [("type", "Texto", ""), ("image", "Imagen", ""), ("video", "Video", ""), ("file-text", "PDF", ""), ("link", "Enlace", ""),
             None, ("shopping-bag", "Productos del catálogo", "Pronto"), ("ticket-percent", "Cupón", "Pronto")]
    lis = "".join(
        '<li class="sep" role="separator"></li>' if it is None else
        f'<li role="menuitem" aria-disabled="{str(bool(it[2])).lower()}">{ic(it[0], size=16)}<span>{it[1]}</span>'
        f'{"<span class=soon>" + it[2] + "</span>" if it[2] else "<span></span>"}</li>'
        for it in items
    )
    menu = f'<ul class="menu" role="menu" aria-label="Tipo de bloque">{lis}</ul>' if open_ else ""
    return (f'<div class="addwrap {"open" if open_ else ""}"><button class="adder" aria-haspopup="menu" aria-expanded="{str(open_).lower()}">'
            f'{ic("plus", size=14)}Añadir bloque</button>{menu}</div>')


def delivery_body(menu_open=False):
    thumbs = "".join(f'<img src="{POSTS[k]["thumb"]}" alt="">' for k in ("capsula", "vestidos", "gorras"))
    blocks = (
        dblock("type", "Texto", f'<span class="clip">{DELIVERY_TEXT}</span>', "el texto")
        + dblock("image", "Imagen · 3 fotos", f'<span class="thumbs">{thumbs}</span>', "las imágenes")
        + dblock("video", "Video", '<span class="one">capsula-detras-de-camaras.mp4 · 0:24 · 9,8 MB</span>', "el video")
        + dblock("file-text", "PDF", '<span class="one">Lookbook Cápsula.pdf · 3,1 MB</span>', "el PDF")
        + dblock("link", "Enlace con botón", f'<span class="one">nortestudio.co/capsula</span><span class="linkbtn">{ic("external-link", size=12)}Ver la colección</span>', "el enlace")
    )
    return f"""
<div class="blk">
  <div class="blk-h">Llega en este orden<span class="count">5 bloques</span></div>
  <ol class="dblocks">{blocks}</ol>
  {add_menu(menu_open)}
  <p class="hint">Solo la recibe quien tocó «Envíamelo»: con eso se abre la conversación por 24 horas. Hasta 10 imágenes; video y PDF de hasta 25 MB.</p>
</div>"""


# 6. Después --------------------------------------------------------------------
def after_body():
    tags = "".join(
        f'<span class="tagchip">{ic("tag", size=13)}{t}<button class="x" aria-label="Quitar {t}">{ic("x", size=12)}</button></span>'
        for t in ("cápsula", "vino-de-reel")
    )
    return f"""
<div class="trow">
  <span class="tt">El agente sigue la conversación</span>
  {K.switch(True, label="El agente sigue la conversación")}
  <p class="td">Responde dudas, muestra tallas y stock, toma el pedido y cobra. Si piden hablar con alguien, te pasa la conversación.</p>
</div>
<div class="ed-form">
  {K.field('Agente', K.select('Alba · ventas', icon='bot'))}
  <div class="field"><span class="lbl">Etiquetas en el CRM</span><div class="tags">{tags}<button class="adder" style="height:28px">{ic('plus', size=13)}Añadir</button></div></div>
</div>
<p class="knows">{ic('brain', size=17)}<span><b>Sabe de qué publicación vino y qué le entregaste.</b> No vuelve a mandar el lookbook ni pregunta qué le interesa: empieza desde ahí.</span></p>"""


def steps(closed_upto=0, menu_open=False):
    summaries = [
        ("¿Dónde?", "Instagram y Facebook · Colección Cápsula", where_body()),
        ("¿Qué escriben?", "INFO, PRECIO, LO QUIERO · entiende la intención", words_body()),
        ("Respuesta pública", "3 variantes · máximo 60 por hora", reply_body()),
        ("Mensaje privado", "Botón «Envíamelo» · sin pedir que te sigan", dm_body()),
        ("La entrega", "Texto, 3 fotos, video, PDF y enlace", delivery_body(menu_open)),
        ("Después", "Alba sigue · 2 etiquetas", after_body()),
    ]
    return "".join(step(i + 1, t, s, b, closed=(i < closed_upto)) for i, (t, s, b) in enumerate(summaries))


# Vista previa --------------------------------------------------------------------
def prev_tools(network, stage):
    return (
        '<div class="prev-tools">'
        + seg([("Instagram", "instagram"), ("Facebook", "facebook")], network, "Red de la vista previa")
        + seg([("Comentario", ""), ("Mensaje", ""), ("Entrega", "")], stage, "Etapa de la vista previa")
        + "</div>"
    )


def preview_mensaje():
    user = PEOPLE[0][0]
    body = f"""
<p class="pp-sec">Comentarios</p>
<div class="pp-comment"><span class="av">{PEOPLE[0][1]}</span><span><b>{user}</b>INFO</span><small>2 min · Responder</small></div>
<div class="pp-comment reply"><span class="av biz"></span><span><b>{ACCOUNT['ig'].lstrip('@')}</b><span class="pp-at">@{user}</span> {VARIANTS[0]}</span><small>1 min · Responder</small></div>
<p class="pp-sec pp-split">Mensajes · Solicitudes</p>
<div class="pp-card"><div class="txt">{OPENING}</div><button>Envíamelo</button></div>"""
    return phone("instagram", body, sub="Reel · Colección Cápsula")


def preview_entrega():
    trio = "".join(f'<img src="{POSTS[k]["thumb"]}" alt="">' for k in ("capsula", "vestidos", "gorras"))
    body = f"""
<div class="pp-me tap">Envíamelo</div>
<div class="pp-in">{DELIVERY_TEXT}</div>
<div class="pp-media pp-trio">{trio}</div>
<div class="pp-video"><span class="play">{ic('play', size=18)}</span><span class="dur">0:24</span></div>
<div class="pp-file"><span class="fi">{ic('file-text', size=18)}</span><span><b>Lookbook Cápsula.pdf</b><small>PDF · 3,1 MB</small></span></div>
<div class="pp-card"><img src="{POSTS['capsula']['thumb']}" alt=""><div class="txt">Colección Cápsula · 12 prendas</div><button>Ver la colección</button></div>
<p class="pp-note">Desde aquí sigue Alba, tu agente</p>"""
    return phone("facebook", body, sub="Messenger")


def before(items):
    rows = []
    for kind, text, act in items:
        icon = "circle-check" if kind == "ok" else "circle-dashed"
        a = btn(act, "flask-conical", "outline xs act") if act else ""
        rows.append(f'<div class="chk {kind}">{ic(icon, size=17)}<span>{text}</span>{a}</div>')
    return f'<div class="before"><h3>Antes de activar</h3>{"".join(rows)}</div>'


BEFORE = [
    ("ok", "Instagram y Facebook con permiso para leer y responder comentarios.", ""),
    ("ok", "1 publicación: Colección Cápsula, en Instagram y en Facebook.", ""),
    ("pend", "Prueba la automatización con tu cuenta antes de activarla.", "Probar con mi cuenta"),
]


def dock():
    tr = "".join(
        f'<li><button class="{st}" aria-label="{lbl}: {"listo" if st == "ok" else "por resolver"}"><i></i></button></li>'
        for lbl, st in TRAMOS
    )
    done = sum(1 for _, st in TRAMOS if st == "ok")
    return f"""
<footer class="dock ink">
  <ul class="tramos" aria-label="Qué falta">{tr}</ul>
  <span class="sep" aria-hidden="true"></span>
  <div class="state-text">
    <span class="state-t">Casi lista<span class="n">{done}/{len(TRAMOS)}</span></span>
    <span class="detail" id="falta">Falta probarla con tu cuenta</span>
  </div>
  <div class="acts">{btn('Guardar borrador', '', 'glass sm')}<button class="btn contrast sm" aria-disabled="true" aria-describedby="falta" style="opacity:.6">Activar</button></div>
</footer>"""


def head():
    return f"""
<a class="back" href="#">{ic('arrow-left', size=15)}Redes</a>
<header class="ed-head">
  <p class="kicker">Comenta y recibe</p>
  <div class="namerow"><h1 class="title">Colección Cápsula</h1><button class="btn ghost icon sm" aria-label="Cambiar el nombre">{ic('pencil', size=16)}</button></div>
  <p class="title-lead">Cuando comenten la palabra, respondes en público, escribes por privado y entregas lo prometido. Después sigue tu agente.</p>
  <p class="saved">{pill('Borrador', 'off')}Guardado · 10:42 a. m.</p>
</header>"""


def editor_page(left, right):
    return f"""
<div class="shell"><div class="page">
  {head()}
  <div class="layout">
    <div class="col">{left}</div>
    <aside class="aside" aria-label="Vista previa">{right}</aside>
  </div>
  {dock()}
</div></div>"""


# ----------------------------------------------------------------------------- vistas
def view_editor():
    right = '<h3>Así lo ve quien comenta</h3>' + prev_tools("Instagram", "Mensaje") + preview_mensaje() + before(BEFORE)
    return editor_page(steps(), right)


def view_entrega():
    right = '<h3>Así lo ve quien comenta</h3>' + prev_tools("Facebook", "Entrega") + preview_entrega() + before(BEFORE)
    return editor_page(steps(closed_upto=4, menu_open=True), right)


def view_estados():
    def card(h, inner, wide=False):
        return f'<div class="state-card {"wide" if wide else ""}"><h4>{h}</h4>{inner}</div>'

    empty = f"""
<div class="empty">
  <div class="gglyph" aria-hidden="true">{ic('messages-square', size=40)}<span class="dotc"></span></div>
  <h3>Todavía no respondes comentarios</h3>
  <p>Crea tu primera automatización: elige un reel, la palabra que deben escribir y lo que les envías.</p>
  <div class="acts">{btn('Nueva automatización', 'plus')}</div>
</div>"""
    no_ig = health(ig="off", fb="ok") + K.notice(
        "warn", "<b>Conecta Instagram para responder comentarios.</b> Facebook ya responde; Instagram necesita su conexión.",
        acts=btn("Conectar Instagram", "instagram", "sm"))
    reconnect = health(ig="reconnect", fb="ok") + K.notice(
        "err", "<b>Tu Instagram está conectado, pero sin permiso para leer comentarios.</b> Reconéctalo: toma un minuto.",
        icon="plug", acts=btn("Reconectar Instagram", "refresh-cw", "sm"))
    pending = health(ig="pending", fb="pending") + K.notice(
        "info", "<b>Meta está revisando el permiso de comentarios.</b> Mientras tanto puedes crear y probar con tu cuenta.",
        icon="hourglass", acts=btn("Probar con mi cuenta", "flask-conical", "outline sm"))
    queue = f"""
<div class="st-row">{pill('En cola · ~1 h 50 min', 'queue')}<span class="small muted">Tenis Norte 01 · video</span></div>
<p class="lead2">Llegaron 2.140 comentarios en una hora. Meta deja responder 750 por hora: vamos en orden y ninguno pasa de 7 días.</p>
<div class="qline" role="img" aria-label="750 respondidos de 2.140">
  <div class="qtrack"><i style="width:35%"></i></div>
  <div class="qmeta"><span><b>750</b> respondidos</span><span><b>1.390</b> esperan turno · el último sale hacia las 9:40 p. m.</span></div>
</div>"""
    testers = "".join(f'<span class="tagchip">{ic("at-sign", size=13)}{t}</span>' for t in ("norte.studio.equipo",))
    test = f"""
<div class="st-row">{pill('Modo prueba', 'test')}</div>
<p class="lead2">Solo responde a las cuentas de tu equipo: <b>@norte.studio.equipo</b>. Comenta «INFO» desde esa cuenta y mira todo el recorrido.</p>
<div class="st-row"><span class="testers">{testers}</span><button class="adder" style="height:28px">{ic('plus', size=13)}Añadir cuenta</button></div>
<div class="st-row">{btn('Activar para todos', '', 'sm')}{btn('Seguir probando', '', 'outline sm')}</div>"""
    err = f"""
<div class="erow"><span class="av">J</span><div class="et"><b>@juanpa_88</b>{pill('No se envió', 'err')}</div>
  <small>No se envió a @juanpa_88: el comentario se borró antes de responder.</small></div>
<p class="hint">Cada comentario que no recibe respuesta queda en la actividad con su motivo. No hay que hacer nada.</p>"""
    states = (
        card("Vacío · cuenta nueva", empty, wide=True)
        + card("Sin Instagram conectado", no_ig)
        + card("Reconectar · faltan permisos nuevos", reconnect)
        + card("Pendiente de Meta", pending)
        + card("En cola · video viral", queue)
        + card("Modo prueba", test)
        + card("Error tipado", err)
    )
    return f"""
<div class="shell"><div class="page">
  <header class="st-head"><p class="kicker">Comenta y recibe</p><h1 class="title">Estados</h1>
  <p class="title-lead">Lo que ve el dueño cuando falta algo, cuando Meta decide el ritmo o cuando un comentario no recibe respuesta. Siempre dice qué pasó y qué hacer.</p></header>
  <div class="states">{states}</div>
</div></div>"""


def view_movil():
    left = (
        step(1, "¿Dónde?", "Instagram y Facebook · Colección Cápsula", where_body(), closed=True)
        + step(2, "¿Qué escriben?", "INFO, PRECIO, LO QUIERO", words_body())
        + step(3, "Respuesta pública", "3 variantes · máximo 60 por hora", reply_body(), closed=True)
        + step(4, "Mensaje privado", "Botón «Envíamelo»", dm_body(), closed=True)
        + step(5, "La entrega", "Texto, 3 fotos, video, PDF y enlace", delivery_body())
        + step(6, "Después", "Alba sigue · 2 etiquetas", after_body(), closed=True)
    )
    inner = f"""
<div class="page">
  {head()}
  <details class="fold" open><summary>Así lo ve quien comenta {ic('chevron-down', size=16)}</summary>
    <div class="fold-in">{prev_tools("Instagram", "Mensaje")}{preview_mensaje()}</div></details>
  {before(BEFORE)}
  {left}
  {dock()}
</div>"""
    return f'<div class="shell" style="padding:20px 16px 48px"><div class="phone">{inner}</div></div>'


VIEWS = [
    ("editor", "Editor", view_editor(),
     "Nueva automatización en página: el dueño decide dónde escucha, qué palabra dispara, qué responde en público, el único mensaje privado que Meta permite y lo que entrega. A la derecha lo ve como quien comenta."),
    ("entrega", "Editor · Entrega", view_entrega(),
     "La entrega se arma por bloques en el orden en que llegan; la vista previa cambia a Facebook. El dueño decide qué recibe la persona y si Alba sigue con contexto."),
    ("estados", "Estados", view_estados(),
     "Vacío, conexión, permisos, Meta revisando, cola de un video viral, modo prueba y un error con su motivo: el dueño siempre sabe qué pasó y qué hacer."),
    ("editor-movil", "Editor · 390", view_movil(),
     "El editor en el celular: una columna, la vista previa plegable arriba y la isla de tinta que deja de ser píldora."),
]
