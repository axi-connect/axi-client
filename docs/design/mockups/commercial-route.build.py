#!/usr/bin/env python3
"""Mockup «La ruta comercial» (commercial_method_plan.md · F0) — corregido tras la auditoría (M1–M29).

Un solo HTML para discutir el método ANTES de tocar el backend: cuatro vistas de documento (Método,
Recorrido, Marca, Decisiones) y diecisiete vistas de producto (/comercial en sus estados, el detalle de
un resultado clave y de una acción —con rechazo y resultado—, /crm/settings/recorrido, el contacto 360,
Analítica, el bloque del Panel, el estado bloqueado, la meta a mitad de mes y la vista sin permiso).
Misma convención que los demás mockups: kit compartido, tokens literales de `globals.css`, iconos
`__iconNode` de lucide-react, tema claro/oscuro con el botón.

Un solo escenario numérico (Clínica Dermalux · septiembre 2026 · 26 días hábiles lun–sáb · hoy 23 sep =
día hábil 20): todas las cifras salen de `PLAN` y `SCEN`, y la cascada redondea hacia arriba en cada paso.

Uso:  python3 commercial-route.build.py [--artifact <ruta>]
      --artifact escribe además una variante sin <html>/<head>/<body> para publicarla como Artifact.
"""
import html as _html
import itertools
import math
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from _axi_mockup_kit import Kit  # noqa: E402

K = Kit("commercial-route")
ic, btn, badge = K.ic, K.btn, K.badge

# ----------------------------------------------------------------------------- CSS propio del mockup
EXTRA_CSS = r"""
/* gutter de 16 px en móvil (M3); el kit trae 24 */
.page{padding:20px 16px 72px}

/* ---- documento (vistas Método / Recorrido / Marca / Decisiones) */
.doc{max-width:76ch;margin:0 auto;padding:32px 16px 96px;display:flex;flex-direction:column;gap:20px;font-size:15px;line-height:1.62}
.doc .eyebrow{font-size:11.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--foreground);font-weight:600}
.doc h1{font-size:36px;line-height:1.1}
.doc h2{font-size:22px;margin-top:22px;padding-top:22px;border-top:1px solid var(--border-soft)}
.doc h3{font-size:16px;font-family:var(--font-body);font-weight:600;letter-spacing:0;margin-top:6px}
.doc .lead{font-size:17px;color:var(--muted-foreground);max-width:60ch}
.doc p{max-width:68ch}
.doc ul,.doc ol{margin:0;padding-left:22px;display:flex;flex-direction:column;gap:6px}
.doc li{max-width:66ch}
.doc .steps{display:flex;flex-direction:column;gap:14px}
.doc .step{display:grid;grid-template-columns:40px minmax(0,1fr);gap:14px;align-items:start}
.doc .step .n{width:40px;height:40px;border-radius:12px;background:var(--secondary);display:grid;place-items:center;font-family:var(--font-heading);font-size:17px;color:var(--axi-brand)}
.doc .step b{display:block;font-weight:600;margin-bottom:2px}
.doc .callout{border:1px solid var(--border);border-radius:16px;padding:14px 18px;background:var(--secondary);font-size:14px}
.doc .callout b{font-weight:600}
.doc .quote{border-left:2px solid var(--axi-brand);padding:2px 0 2px 16px;font-size:17px;font-family:var(--font-heading);line-height:1.4}
.doc table{font-size:13.5px}
.doc th{white-space:normal}
.doc td{font-variant-numeric:tabular-nums}
.doc td small{display:block;color:var(--muted-foreground);font-size:12px}
.doc .dd{display:grid;grid-template-columns:minmax(0,1fr);gap:0;border:1px solid var(--border);border-radius:14px;overflow:hidden}
.doc .dd div{display:grid;grid-template-columns:150px minmax(0,1fr);gap:12px;padding:10px 14px;border-top:1px solid var(--border-soft);font-size:14px}
.doc .dd div:first-child{border-top:0}
.doc .dd b{font-weight:500;color:var(--muted-foreground);font-size:13px}
@container (max-width: 600px){.doc .dd div{grid-template-columns:1fr}}
.doc .yes,.doc .no{display:flex;gap:6px;align-items:center;color:var(--foreground)}
.doc .yes .ic{color:var(--axi-success)} .doc .no .ic{color:var(--axi-destructive)}
.doc .voice{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.doc .voice > div{border:1px solid var(--border);border-radius:14px;padding:12px 14px;font-size:13.5px}
.doc .voice .h{font-size:11.5px;letter-spacing:.08em;text-transform:uppercase;font-weight:600;margin-bottom:6px}
@container (max-width: 640px){.doc .voice{grid-template-columns:1fr}}

/* ---- /comercial */
.cr{max-width:1000px}
.hero{border:1px solid var(--border);border-radius:var(--radius-xl);padding:24px 20px 20px;display:flex;flex-direction:column;gap:16px;background:var(--background)}
@container (min-width: 700px){.hero{padding:24px 28px 20px}}
.hero .big{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}
.hero .big b{font-family:var(--font-heading);font-size:46px;line-height:1;letter-spacing:-.025em;font-weight:700;font-variant-numeric:tabular-nums}
.hero .big span{color:var(--muted-foreground);font-size:15px;font-variant-numeric:tabular-nums}
.hero .from{font-size:12.5px;color:var(--muted-foreground);display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:-10px}
.hero .line{display:flex;gap:10px;align-items:center;flex-wrap:wrap;font-size:14.5px;line-height:1.45}
/* la ruta: SVG solo con trazos; las etiquetas van en HTML fuera del SVG para que no escalen (M3) */
.route-wrap{position:relative;display:flex;flex-direction:column;gap:2px}
.route{width:100%;height:auto;display:block;overflow:visible}
.route .track{stroke:color-mix(in srgb, var(--foreground) 28%, var(--background));stroke-width:8;stroke-linecap:round;fill:none}
.route .done{stroke-width:8;stroke-linecap:round;fill:none}
.route .proj{stroke:var(--muted-foreground);stroke-width:2;stroke-dasharray:3 6;stroke-linecap:round;fill:none}
.route .now{fill:var(--axi-brand);stroke:var(--background);stroke-width:3}
.route .exp{fill:var(--background);stroke:var(--foreground);stroke-width:2}
.route .tick{stroke:var(--border);stroke-width:1}
.route .flag{stroke:var(--foreground);stroke-width:1.6;fill:none}
.route-lbls{position:relative;height:18px;font-size:12px;color:var(--muted-foreground);font-variant-numeric:tabular-nums}
.route-lbls span{position:absolute;top:0;white-space:nowrap;transform:translateX(-50%)}
.route-lbls span.lbl{color:var(--foreground);font-weight:500}
.route-lbls span.start{transform:none} .route-lbls span.end{transform:translateX(-100%)}
.pace{border-left:2px solid var(--axi-brand);padding:2px 0 2px 14px;display:flex;flex-direction:column;gap:2px;width:fit-content;text-decoration:none;color:inherit;border-radius:0 8px 8px 0}
.pace:hover .nums .ic{color:var(--foreground)}
.pace .ey{font-size:11.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted-foreground);font-weight:600}
.pace .nums{font-size:15px;display:flex;gap:6px;align-items:center;flex-wrap:wrap;font-variant-numeric:tabular-nums} .pace .nums b{font-weight:600}
.pace .nums .ic{color:var(--muted-foreground);margin-left:4px}

/* ficha = lista (grouped-list): solo borde en reposo (M26) */
.gl{border:1px solid var(--border);border-radius:var(--radius-lg);background:var(--background);overflow:hidden}
.gl-h{padding:14px 18px 4px;font-size:11.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted-foreground);font-weight:600;display:flex;align-items:center;gap:8px;justify-content:space-between;flex-wrap:wrap}
.gl-h .ic{color:var(--muted-foreground)}
.gl.ai .gl-h .ic{color:var(--axi-violet)}
.gr{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:1px 16px;padding:12px 18px;align-items:center;position:relative;color:inherit;text-decoration:none}
.gr+.gr::before{content:"";position:absolute;left:18px;right:18px;top:0;border-top:1px solid var(--border-soft)}
.gr .k{font-size:12px;color:var(--muted-foreground);grid-column:1}
.gr .v{font-size:15px;font-weight:500;display:flex;gap:10px;align-items:center;flex-wrap:wrap;grid-column:1;font-variant-numeric:tabular-nums}
.gr .s{font-size:12.5px;color:var(--muted-foreground);grid-column:1;display:flex;gap:6px;align-items:center;flex-wrap:wrap;font-variant-numeric:tabular-nums}
.gr .r{grid-column:2;grid-row:1 / span 3;display:flex;align-items:center;gap:12px;flex-wrap:wrap;justify-content:flex-end}
.gr .go{opacity:0;color:var(--muted-foreground);transition:opacity .15s var(--ease)}
.gr .hov{opacity:0;transition:opacity .15s var(--ease)}
.gr:hover .go,.gr:hover .hov,.gr.link:focus-within .go,.gr.link:focus-within .hov,.gr:focus-within .hov{opacity:1}
.gr.link:hover{background:color-mix(in srgb, var(--foreground) 3%, transparent);cursor:pointer}
.gr.link:focus-visible{outline:2px solid var(--axi-brand);outline-offset:-2px;border-radius:10px}
@container (max-width: 560px){.gr{grid-template-columns:1fr} .gr .r{grid-column:1;grid-row:auto;justify-content:flex-start;padding-top:6px} .gr .go{display:none}}
.rule{width:96px;height:4px;border-radius:999px;background:var(--secondary);overflow:hidden;flex:none}
.rule i{display:block;height:100%;background:var(--axi-brand);border-radius:999px}
.rule.soft i{background:color-mix(in srgb, var(--foreground) 45%, var(--background))}
.src{display:inline-flex;align-items:center;gap:5px;color:var(--muted-foreground);font-size:12px}
.src .ic{color:var(--muted-foreground)}
.ar .t{font-size:15px;font-weight:500}
.ar .hl{color:var(--axi-violet);font-weight:500;font-size:13.5px;font-variant-numeric:tabular-nums}
.ar.settled .v,.ar.settled .s{color:var(--muted-foreground)}
.ar .exp{font-size:12px;color:var(--muted-foreground)}
.badge.ai{background:var(--secondary);color:var(--foreground)} .badge.ai .ic{color:var(--axi-violet)}

/* editor de meta */
.goal-in{display:flex;align-items:center;gap:12px;border:1px solid var(--input);border-radius:var(--radius-lg);padding:14px 18px;font-family:var(--font-heading);font-size:34px;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.goal-in small{font-family:var(--font-body);font-size:13px;color:var(--muted-foreground);letter-spacing:0;margin-left:auto}
.goal-in .caret{width:2px;height:34px;background:var(--axi-brand);animation:blink 1.1s steps(1) infinite}
@keyframes blink{50%{opacity:0}}
details.sup{border:1px solid var(--border);border-radius:var(--radius-lg);padding:0}
details.sup summary{list-style:none;cursor:pointer;padding:12px 18px;font-weight:500;display:flex;justify-content:space-between;align-items:center}
details.sup summary::-webkit-details-marker{display:none}
details.sup[open] summary{border-bottom:1px solid var(--border-soft)}

/* hoja lateral (DetailSheet) */
.sheet-wrap{position:absolute;inset:0;z-index:30;background:var(--scrim);display:flex;justify-content:flex-end}
.sheet{width:min(580px,100%);position:sticky;top:0;height:100vh;overflow-y:auto;background:color-mix(in srgb, var(--background) 90%, transparent);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-left:1px solid var(--border);box-shadow:var(--shadow-overlay);display:flex;flex-direction:column}
.sheet-h{padding:20px 16px 14px;display:flex;flex-direction:column;gap:6px;border-bottom:1px solid var(--border-soft)}
.sheet-h .ey{font-size:11.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted-foreground);font-weight:600;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.sheet-h h2{font-size:20px;font-family:var(--font-body);font-weight:600;letter-spacing:-.01em;display:flex;justify-content:space-between;gap:12px;align-items:center}
.sheet-h .big{font-family:var(--font-heading);font-size:30px;letter-spacing:-.02em;font-variant-numeric:tabular-nums;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.sheet-b{padding:18px 16px;display:flex;flex-direction:column;gap:16px}
.sheet-f{margin-top:auto;padding:14px 16px;border-top:1px solid var(--border-soft);display:flex;gap:8px;justify-content:space-between;align-items:center;flex-wrap:wrap;font-size:12.5px;color:var(--muted-foreground);position:relative}
.sheet-f .acts{display:flex;gap:8px;margin-left:auto;position:relative}
@container (min-width: 600px){.sheet-h,.sheet-b,.sheet-f{padding-left:24px;padding-right:24px}}
.trend{width:100%;height:auto;display:block}
.trend .grid{stroke:var(--border-soft);stroke-width:1}
.trend .exp{stroke:var(--muted-foreground);stroke-width:2;fill:none;stroke-dasharray:4 5}
.trend .act{stroke:var(--axi-brand);stroke-width:2.5;fill:none;stroke-linecap:round;stroke-linejoin:round}
.trend .fill{fill:var(--axi-brand);opacity:.08}
.trend text{font-family:var(--font-body);font-size:10.5px;fill:var(--muted-foreground)}
.trend .end{fill:var(--axi-brand);stroke:var(--background);stroke-width:2}
.legend{display:flex;gap:16px;font-size:12px;color:var(--muted-foreground)}
.legend i{display:inline-block;width:14px;height:0;border-top:2px solid var(--axi-brand);vertical-align:middle;margin-right:6px}
.legend i.exp{border-top:2px dashed var(--muted-foreground)}
/* menú de motivos (rechazar) */
.menu{position:absolute;right:0;bottom:calc(100% + 6px);z-index:20;width:300px;padding:4px;border-radius:12px;border:1px solid var(--border);background:color-mix(in srgb, var(--background) 82%, transparent);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);box-shadow:var(--shadow-float);display:flex;flex-direction:column;text-align:left}
.menu .mh{font-size:11.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted-foreground);font-weight:600;padding:8px 10px 4px}
.menu button{display:flex;gap:10px;align-items:center;padding:8px 10px;border-radius:8px;font-size:13px;text-align:left;color:var(--foreground)}
.menu button:hover,.menu button[aria-selected="true"]{background:var(--accent)}
.menu button .ic{color:var(--muted-foreground)}

/* recorrido (settings): radios 10 px en controles (M24) */
.kind{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 10px;border-radius:10px;border:1px solid var(--input);font-size:13px;font-weight:500;background:var(--background)}
.kind .ic{color:var(--muted-foreground)}
.cad{display:grid;grid-template-columns:1fr 1fr;gap:10px 20px;padding:4px 0 6px}
.cad .f{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;font-size:13.5px;padding:8px 0;border-bottom:1px solid var(--border-soft)}
.cad .f .k{color:var(--muted-foreground)}
.cad .f .input,.cad .f .select{width:auto;min-width:120px;min-height:32px;font-size:13.5px}
.cad .input,.cad .select{border-radius:10px}
@container (max-width: 700px){.cad{grid-template-columns:1fr}}
.moves{font-size:12.5px;color:var(--muted-foreground);display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding-top:8px}
.moves .ic{color:var(--muted-foreground)}
.tpl{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px;padding:8px 18px 14px}
.tpl button{border:1px solid var(--border);border-radius:12px;padding:10px 12px;text-align:left;display:flex;flex-direction:column;gap:2px;background:var(--background)}
.tpl button[aria-checked="true"]{border-color:var(--axi-brand);box-shadow:0 0 0 1px var(--axi-brand) inset}
.tpl button b{font-weight:500;font-size:13.5px} .tpl button span{font-size:12px;color:var(--muted-foreground)}

/* contacto 360 */
.c360{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.3fr);gap:16px;align-items:start}
@container (max-width: 860px){.c360{grid-template-columns:1fr}}
.tl{display:flex;flex-direction:column}
.tli{display:grid;grid-template-columns:28px minmax(0,1fr) auto;gap:0 12px;padding:10px 0;position:relative;align-items:start}
.tli .dc{width:28px;display:grid;place-items:center}
.tli .dc i{width:26px;height:26px;border-radius:50%;background:var(--secondary);display:grid;place-items:center;color:var(--muted-foreground)}
.tli.violet .dc i{color:var(--axi-violet)}
.tli.brand .dc i{color:var(--axi-brand)}
.tli::before{content:"";position:absolute;left:13.5px;top:38px;bottom:-10px;border-left:1px solid var(--border-soft)}
.tli:last-child::before{display:none}
.tli .tt{font-size:14px;font-weight:500;display:flex;gap:8px;align-items:center;flex-wrap:wrap} .tli .td{font-size:12.5px;color:var(--muted-foreground);margin-top:1px}
.tli .when{font-size:12px;color:var(--muted-foreground);white-space:nowrap;display:flex;flex-direction:column;align-items:flex-end;gap:4px;font-variant-numeric:tabular-nums}
.tli .act{opacity:0;transition:opacity .15s var(--ease)} .tli:hover .act,.tli:focus-within .act{opacity:1}
.person{display:flex;gap:14px;align-items:center}
.person .av{width:48px;height:48px;border-radius:50%;background:var(--secondary);display:grid;place-items:center;font-weight:600;font-size:16px}
.person h1{font-size:24px;font-family:var(--font-body);font-weight:600}
.person .sub{font-size:13px;color:var(--muted-foreground);display:flex;gap:8px;align-items:center;flex-wrap:wrap}

/* analítica */
.fun{display:flex;flex-direction:column;gap:8px}
.fun .row{display:grid;grid-template-columns:150px minmax(0,1fr) 70px;gap:12px;align-items:center;font-size:13px}
@container (max-width: 520px){.fun .row{grid-template-columns:110px minmax(0,1fr) 54px}}
.fun .bar{height:22px;border-radius:6px;background:var(--secondary);overflow:hidden}
.fun .bar i{display:block;height:100%;background:color-mix(in srgb, var(--foreground) 45%, var(--background));border-radius:6px}
.fun .bar.star i{background:var(--axi-brand)}
.fun .n{text-align:right;font-variant-numeric:tabular-nums;font-weight:500}
.kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
@container (max-width: 760px){.kpis{grid-template-columns:1fr 1fr}}
.kpi{border:1px solid var(--border);border-radius:var(--radius-lg);padding:14px 16px}
.kpi .k{font-size:12px;color:var(--muted-foreground)} .kpi .v{font-family:var(--font-heading);font-size:26px;letter-spacing:-.02em;font-variant-numeric:tabular-nums;margin-top:2px}
.kpi .d{font-size:12px;color:var(--muted-foreground);margin-top:2px;font-variant-numeric:tabular-nums}

/* panel */
.gpb{border:1px solid var(--border);border-radius:var(--radius-xl);padding:14px 20px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 24px;align-items:center;background:var(--background)}
.gpb .k{font-size:12px;color:var(--muted-foreground)}
.gpb .v{font-size:14.5px;display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;font-variant-numeric:tabular-nums}
.gpb .r{grid-column:2;grid-row:1 / span 3;text-align:right;font-size:13.5px}
.gpb .r a{font-weight:500;text-decoration:none;display:inline-flex;gap:4px;align-items:center}
.gpb .r .pct{font-family:var(--font-heading);font-size:22px;letter-spacing:-.02em;display:block;font-variant-numeric:tabular-nums}
.gpb .from{grid-column:1;font-size:12px;color:var(--muted-foreground);display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.tiles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
@container (max-width: 700px){.tiles{grid-template-columns:1fr}}
.tile{border:1px solid var(--border);border-radius:var(--radius-lg);padding:14px 16px}
.tile .k{font-size:12px;color:var(--muted-foreground)} .tile .v{font-family:var(--font-heading);font-size:24px;letter-spacing:-.02em;margin-top:2px;font-variant-numeric:tabular-nums}

/* notas del mockup dentro de la vista */
.mk-in{font-size:12.5px;color:var(--muted-foreground);border:1px dashed var(--border);border-radius:12px;padding:10px 14px;display:flex;gap:8px;align-items:flex-start}
.mk-in .ic{color:var(--muted-foreground);margin-top:2px}
.empty.page-empty{padding:72px 16px 48px}
.empty.page-empty .eic{width:64px;height:64px;border-radius:20px}
.empty.page-empty h3{font-size:22px;font-family:var(--font-heading)}
.empty.page-empty p{font-size:14.5px;max-width:52ch}
.seed{font-size:13px;color:var(--muted-foreground);display:flex;gap:8px;align-items:center;justify-content:center;flex-wrap:wrap;margin-top:10px;font-variant-numeric:tabular-nums}
.seed .ic{color:var(--muted-foreground)}
@media (prefers-reduced-motion: reduce){.goal-in .caret{animation:none}}
"""


# ----------------------------------------------------------------------------- helpers
def cop(n: int) -> str:
    """$ 18.940.000"""
    return "$ " + f"{n:,}".replace(",", ".")


def copm(n: int) -> str:
    """$ 18,9 M — siempre con un decimal (M28)."""
    return "$ " + f"{n / 1_000_000:.1f}".replace(".", ",") + " M"


def dec(x: float, nd: int = 1) -> str:
    """1,35 → coma decimal."""
    return f"{x:.{nd}f}".replace(".", ",")


def src(kind: str) -> str:
    lbl = {"history": ("según tu historia", "history"), "declared": ("lo dijiste tú", "user-round"),
           "benchmark": ("supuesto para tu tipo de negocio", "flask-conical")}[kind]
    return f'<span class="src">{ic(lbl[1], size=12)}{lbl[0]}</span>'


def gl(title: str, rows: str, icon: str = "", right: str = "", cls: str = "") -> str:
    h = f'<div class="gl-h"><span style="display:flex;gap:8px;align-items:center">{ic(icon, size=14) if icon else ""}{title}</span>{right}</div>' if title else ""
    return f'<section class="gl {cls}">{h}{rows}</section>'


def gr(k: str, v: str, s: str = "", right: str = "", link: bool = False, cls: str = "") -> str:
    """Fila de ficha. Con link=True es un <a> si no lleva botones dentro; si los lleva (Corregir, Pausar…),
    un <div role="link" tabindex="0">, porque un <button> dentro de un <a> no es HTML válido (M16)."""
    r = f'<div class="r">{right}</div>' if right else ""
    ss = f'<div class="s">{s}</div>' if s else ""
    kk = f'<div class="k">{k}</div>' if k else ""
    inner = f'{kk}<div class="v">{v}</div>{ss}{r}'
    if link and "<button" not in right:
        return f'<a href="#" class="gr link {cls}">{inner}</a>'
    if link:
        return f'<div class="gr link {cls}" role="link" tabindex="0">{inner}</div>'
    return f'<div class="gr {cls}">{inner}</div>'


def rule(pct: float, soft: bool = False) -> str:
    return f'<span class="rule {"soft" if soft else ""}" aria-hidden="true"><i style="width:{min(100, max(2, pct)):.0f}%"></i></span>'


def seg_nav(items: list[tuple[str, str]], active: str, label: str, cls: str = "") -> str:
    """Pastilla de navegación sin el <ul> del kit (M27): <nav><a>…</a></nav>."""
    links = "".join(f'<a href="#" {"aria-current=page" if t == active else ""}>{ic(i) if i else ""}{t}</a>' for t, i in items)
    return f'<nav class="seg {cls}" aria-label="{label}">{links}</nav>'


def seg_filter(items: list[str], active: str, label: str) -> str:
    """Filtro = SegmentedControl (role=radiogroup), no navegación (M27)."""
    bs = "".join(f'<button role="radio" aria-checked="{"true" if t == active else "false"}">{t}</button>' for t in items)
    return f'<div class="seg inline sm" role="radiogroup" aria-label="{label}">{bs}</div>'


_GRAD = itertools.count(1)
WEEKS = [5, 6, 6, 6, 3]  # semanas hábiles de septiembre 2026 (lun–sáb) = 26 días


def route(done: float, expected: float | None, proj: float | None, compact: bool = False, proj_label: str = "",
          flag: bool = True) -> str:
    """Línea de ruta. done/expected/proj en 0–1 (proj puede superar 1). El SVG solo lleva trazos; las
    etiquetas (S1–S5, «hoy», la proyección) son HTML posicionado en % fuera del SVG para que no escalen
    con el ancho (M3). Cada SVG lleva su propio id de gradiente (M2)."""
    gid = f"rg-{next(_GRAD)}"
    x0, x1 = 24, 976
    W = x1 - x0
    h = 24 if compact else 36
    y = h / 2
    xd = x0 + W * min(done, 1)
    pct = lambda x: f"{x / 10:.1f}%"  # noqa: E731  (viewBox de 1000 → porcentaje del ancho)
    parts = [
        f'<defs><linearGradient id="{gid}" x1="0" x2="1" y1="0" y2="0">'
        '<stop offset="0" style="stop-color:var(--axi-brand)"/><stop offset="1" style="stop-color:var(--axi-brand-2)"/></linearGradient></defs>',
        f'<line class="track" x1="{x0}" y1="{y}" x2="{x1}" y2="{y}"/>',
    ]
    top, bottom = [], []
    xe = x0 + W * expected if expected is not None else None
    if not compact:
        acc = 0
        for i, days in enumerate(WEEKS):
            cx = x0 + W * (acc + days / 2) / 26
            if xe is None or abs(cx - xe) > 45:  # «hoy» ocupa el sitio de la semana que le queda encima
                bottom.append(f'<span style="left:{pct(cx)}">S{i + 1}</span>')
            acc += days
            if i < 4:
                tx = x0 + W * acc / 26
                parts.append(f'<line class="tick" x1="{tx:.0f}" y1="{y + 8}" x2="{tx:.0f}" y2="{y + 13}"/>')
        if xe is not None:
            bottom.append(f'<span class="lbl" style="left:{pct(xe)}">hoy</span>')
    if proj is not None and proj > done:
        xp = x0 + W * min(proj, 1.04)
        parts.append(f'<line class="proj" x1="{xd:.0f}" y1="{y}" x2="{xp:.0f}" y2="{y}"/>')
        if proj_label and not compact:
            top.append(f'<span class="lbl end" style="left:{pct(x1)}">{proj_label}</span>')  # a la derecha, sin chocar con «hoy»
    if done > 0:
        parts.append(f'<line class="done" style="stroke:url(#{gid})" x1="{x0}" y1="{y}" x2="{xd:.0f}" y2="{y}"/>')
    if flag:
        parts.append(f'<path class="flag" d="M{x1 - 1} {y - 14} v14 M{x1 - 1} {y - 14} h9 l-3 3 3 3 h-9"/>')
    if xe is not None:
        parts.append(f'<circle class="exp" cx="{xe:.0f}" cy="{y}" r="6"/>')
    if done > 0:
        parts.append(f'<circle class="now" cx="{xd:.0f}" cy="{y}" r="7"/>')
    label = f'Ruta del mes: {done * 100:.0f} % recorrido' + (f', {expected * 100:.0f} % esperado a hoy' if expected is not None else "") + (
        f', proyección {proj * 100:.0f} %' if proj else "")
    svg = f'<svg class="route" viewBox="0 0 1000 {h}" role="img" aria-label="{_html.escape(label)}">{"".join(parts)}</svg>'
    if compact:
        return svg
    t = f'<div class="route-lbls" aria-hidden="true">{"".join(top)}</div>' if top else ""
    b = f'<div class="route-lbls" aria-hidden="true">{"".join(bottom)}</div>'
    return f'<div class="route-wrap">{t}{svg}{b}</div>'


# ----------------------------------------------------------------------------- el plan (Clínica Dermalux · sep 2026)
TARGET = 30_000_000
TICKET = 700_000
DAYS, DAY = 26, 20                      # días hábiles del mes · hoy = día hábil 20 (23 sep)
LEFT = DAYS - DAY                       # 6
EXP = DAY / DAYS                        # 76,9 %
R = dict(quote=0.38, appt=0.35, contacted=0.52, lead=0.35, call_share=0.30, answered=0.62)
# cascada con techo en cada paso (ceil): mejor un paso de más que uno de menos
SALES = math.ceil(TARGET / TICKET)                               # 43
QUOTES = math.ceil(SALES / R["quote"])                           # 114
APPTS = math.ceil(SALES / R["appt"])                             # 123
CONTACTED = math.ceil(max(QUOTES, APPTS) / R["contacted"])       # 237
CONVOS = math.ceil(CONTACTED / R["lead"])                        # 678
CALLS = math.ceil(CONTACTED * R["call_share"] / R["answered"])   # 115
ANSWERED = math.ceil(CONTACTED * R["call_share"])                # 72
EXP_SALES = round(SALES * EXP)                                   # 33 (43 × 20/26 = 33,1: aquí se redondea, no se techa)
assert (SALES, QUOTES, APPTS, CONTACTED, CONVOS, CALLS, ANSWERED, EXP_SALES) == (43, 114, 123, 237, 678, 115, 72, 33)

# resultados clave: (clave, etiqueta, meta, procedencia)
KR = [("sales", "Ventas cerradas", SALES, "history"), ("quotes", "Cotizaciones enviadas", QUOTES, "history"),
      ("appts", "Citas agendadas", APPTS, "history"), ("contacted", "Contactados", CONTACTED, "history"),
      ("convos", "Conversaciones nuevas", CONVOS, "history"), ("answered", "Llamadas contestadas", ANSWERED, "benchmark")]

SCEN = {
    "behind": dict(actual=18_940_000, proj=24_620_000, status=("Ritmo bajo", "warn"), ticket=701_000,
                   kr=dict(sales=27, quotes=71, appts=78, contacted=180, convos=520, answered=48),
                   week=(4, 5, "1,3"),
                   headline=f"Para llegar faltan <b class=\"tnum\">{copm(TARGET - 18_940_000)}</b>: "
                            f"<b>{math.ceil((SALES - 27) / LEFT)} ventas al día</b> en los {LEFT} días hábiles que quedan."),
    "ok": dict(actual=23_410_000, proj=30_430_000, status=("Al ritmo", "ok"), ticket=709_000,
               kr=dict(sales=33, quotes=88, appts=95, contacted=184, convos=524, answered=56),
               week=(5, 5, "1,7"),
               headline=f"Vas al ritmo. Mantén <b>{math.ceil((SALES - 33) / LEFT)} ventas al día</b> y llegas."),
    "ahead": dict(actual=26_770_000, proj=34_800_000, status=("Adelantado", "ok"), ticket=704_000,
                  kr=dict(sales=38, quotes=101, appts=108, contacted=196, convos=548, answered=61),
                  week=(7, 5, "2,3"),
                  headline=f"Vas <b class=\"tnum\">{copm(26_770_000 - int(TARGET * EXP))}</b> por delante de lo esperado "
                           f"(<span class=\"tnum\">{copm(int(TARGET * EXP))}</span>). Si sigues así cierras en <b class=\"tnum\">{copm(34_800_000)}</b>."),
}
assert copm(TARGET - 18_940_000) == "$ 11,1 M" and copm(26_770_000 - int(TARGET * EXP)) == "$ 3,7 M"


def pace_badge(cur: int, tgt: int) -> str:
    """Estado del ritmo de un resultado clave frente a lo esperado a hoy (umbrales del Método)."""
    ratio = cur / (tgt * EXP)
    if ratio > 1.10:
        return badge("Adelantado", "ok")
    if ratio < 0.90:
        return badge("Ritmo bajo", "warn")
    return ""


def ticket_row(ticket: int | None, source: str = "history") -> str:
    v = cop(ticket) if ticket else f'{cop(TICKET)} <span class="muted" style="font-weight:400">plan</span>'
    if ticket:
        v = f'{cop(ticket)} <span class="muted" style="font-weight:400">plan {cop(TICKET)}</span>'
    s = src(source) + (" · últimos 90 días · 61 ventas" if source == "history" else "")
    right = f'{rule(ticket / TICKET * 100 if ticket else 0)}<span class="go">{ic("chevron-right", size=16)}</span>'
    return gr("Ticket promedio", v, s, right, link=True)


def kr_rows(scenario: dict | None) -> str:
    """Los resultados clave de un escenario desde la tabla `KR` (M29). scenario=None → aprendiendo (sin ritmo)."""
    out = []
    for key, label, tgt, source in KR:
        if scenario is None:
            cur = dict(sales=1, quotes=3, appts=2, contacted=8, convos=24, answered=2)[key]
            s = f'{src("declared" if key == "sales" else "benchmark")}' + (" · aún sin historia para medir el ritmo" if key == "sales" else "")
            b = ""
        else:
            cur = scenario["kr"][key]
            s = f'Ritmo <b>{dec(cur / DAY, 2 if key == "sales" else 1)}</b> al día · esperado {dec(tgt / DAYS, 2 if key == "sales" else 1)} · {src(source)}'
            b = pace_badge(cur, tgt)
        v = f'{cur} <span class="muted" style="font-weight:400">de {tgt} · faltan {tgt - cur}</span>'
        right = f'{b}{rule(cur / tgt * 100)}<span class="go">{ic("chevron-right", size=16)}</span>'
        out.append(gr(label, v, s, right, link=True))
        if key == "sales":
            out.append(ticket_row(None if scenario is None else scenario["ticket"], "declared" if scenario is None else "history"))
    return "".join(out)


def kr_list(mode: str | None) -> str:
    rows = kr_rows(None if mode is None else SCEN[mode])
    return gl("Resultados clave", rows, right=f'<span class="muted tnum" style="letter-spacing:0;text-transform:none;font-weight:400">Objetivo: vender {cop(TARGET)} en septiembre</span>')


# acciones propuestas (regla: una propuesta pendiente por semana y meta; vence el sábado)
REACT = dict(title="Reactivar 38 cotizaciones sin respuesta", n=38, reply=0.16, buy=0.33)
REACT_EST = round(REACT["n"] * REACT["reply"] * REACT["buy"])                    # 2
REACT_COVER = math.ceil(REACT_EST / (SALES - SCEN["behind"]["kr"]["sales"]) * 100)  # 13 %
CONFIRM = dict(title="Confirmar por llamada las 14 citas de la semana", n=14, noshow=0.25)
CONFIRM_EST = round(CONFIRM["n"] * CONFIRM["noshow"] * R["appt"])               # 1
assert (REACT_EST, REACT_COVER, CONFIRM_EST) == (2, 13, 1)
REACT_HL = f"+{REACT_EST} ventas estimadas · cubre el {REACT_COVER} % de lo que falta"


def action_row(title: str, headline: str, why: str, expires: str = "", settled=False, settled_note="", can_approve=True) -> str:
    if settled:
        right = f'<span class="exp">{settled_note}</span>{btn("Ver qué quedó", "", "outline xs")}'
        return f'<div class="gr ar settled"><div class="k">{badge("Aprobada", "ok")}</div><div class="v t">{title}</div><div class="s">{why}</div><div class="r">{right}</div></div>'
    acts = f'{btn("Ver", "", "ghost xs hov")}{btn("Aprobar", "", "xs")}' if can_approve else btn("Ver", "", "outline xs")
    right = f'{badge(expires, "warn")}{acts}'
    return f'<div class="gr ar link" role="link" tabindex="0"><div class="v t">{title}</div><div class="s"><span class="hl">{headline}</span></div><div class="s">{why}</div><div class="r">{right}</div></div>'


def actions(mode: str, can_approve=True) -> str:
    note = ""
    if mode == "behind":
        rows = "".join([
            action_row(REACT["title"], REACT_HL,
                       f"Cotizaron hace más de 5 días y nadie volvió a escribirles. {REACT['n']} × 16 % que vuelven a responder × 1 de cada 3 que compra ≈ {REACT_EST}. "
                       "El agente les escribe mañana a las 9:00 por WhatsApp.", "vence el sábado", can_approve=can_approve),
            action_row(CONFIRM["title"], "", f"+{CONFIRM_EST} venta estimada · 14 × 25 % que no asistirían × 35 % que compran", settled=True,
                       settled_note="aprobada el 16 sep · 11 confirmaron · 2 no asistieron"),
        ])
        if not can_approve:
            rows += gr("", '<span class="muted small" style="font-weight:400">Pídele a un administrador que apruebe o cambie la meta.</span>')
    else:
        rows = gr("", '<span class="muted" style="font-weight:400">Estás al día. Cuando algo pueda acelerar la ruta, aquí lo verás.</span>')
        if mode == "ahead":
            note = f'<div class="mk-in">{ic("info", size=14)}<span>Nota del mockup: cuando vas adelantado el plan <b>no propone nada</b>. Subir la meta del mes siguiente no es un artefacto del plan; es una decisión del dueño en el editor.</span></div>'
    return gl("Axi propone", rows, icon="sparkles", cls="ai") + note


def hero(mode: str) -> str:
    s = SCEN[mode]
    done = s["actual"] / TARGET
    proj = s["proj"] / TARGET
    proj_lbl = f"cierre ≈ {copm(s['proj'])} · {proj * 100:.0f} %"
    return f"""<section class="hero" aria-label="La ruta del mes">
      <div class="big"><b>{copm(s["actual"])}</b><span>de {cop(TARGET)} · {done * 100:.0f} %</span></div>
      <p class="from">{src("history")}<span>· ticket {cop(TICKET)} · {SALES} ventas necesarias</span></p>
      {route(done, EXP, proj, proj_label=proj_lbl)}
      <p class="line">{badge(s["status"][0], s["status"][1])}<span>{s["headline"]}</span></p>
    </section>"""


def pace_line(week_sales: int, week_exp: int, per_day: str) -> str:
    lbl = f"Ritmo de esta semana: {week_sales} ventas, esperadas {week_exp}, {per_day} al día; abre el detalle de ventas"
    return f"""<a class="pace" href="#" aria-label="{lbl}">
      <span class="ey">Ritmo · esta semana</span>
      <span class="nums"><b>{week_sales}</b> ventas · esperadas <b>{week_exp}</b> · <b>{per_day}</b> al día {ic("chevron-right", size=15)}</span>
    </a>"""


def header(set_by="la pusiste tú el 1 sep", change=True) -> str:
    right = btn("Cambiar meta", "pencil", "outline sm") if change else ""
    lead = f'Meta del mes: <b class="tnum" style="font-weight:500;color:var(--foreground)">{cop(TARGET)}</b> · {set_by}'
    return f'<div class="header"><div><h1>Tu ruta de septiembre</h1><p class="lead">{lead}</p></div><div class="right">{right}</div></div>'


def learning_hero() -> str:
    actual = TICKET  # 1 venta en el único día hábil con datos
    return f"""<section class="hero" aria-label="La ruta del mes">
      <div class="big"><b>{copm(actual)}</b><span>de {cop(TARGET)} · {actual / TARGET * 100:.0f} %</span></div>
      <p class="from">{src("declared")}<span>· ticket {cop(TICKET)} · {SALES} ventas necesarias</span></p>
      {route(actual / TARGET, None, None)}
      <p class="line">{badge("Aprendiendo tu ritmo", "")}<span>Estamos aprendiendo tu ritmo. En 2 días tendrás proyección y acciones.</span></p>
    </section>"""


# ----------------------------------------------------------------------------- vistas de producto
def view_route(mode: str, can_approve=True) -> str:
    return f"""<div class="page cr">
      {K.crumb("Comercial")}
      {header(change=can_approve)}
      {hero(mode)}
      {pace_line(*SCEN[mode]["week"])}
      {kr_list(mode)}
      {actions(mode, can_approve=can_approve)}
    </div>"""


def view_learning() -> str:
    return f"""<div class="page cr">
      {K.crumb("Comercial")}
      {header(set_by="la pusiste tú ayer, 22 sep")}
      {learning_hero()}
      {K.notice("info", "<b>Estamos aprendiendo tu ritmo.</b> Llevas 1 día hábil de datos; con 3 empezamos a proyectar, y a los 30 días tus tasas reales reemplazan los supuestos por tipo de negocio.", icon="hourglass")}
      {kr_list(None)}
      {gl("Axi propone", gr("", '<span class="muted" style="font-weight:400">Cuando conozcamos tu ritmo, te proponemos acciones.</span>'), icon="sparkles", cls="ai")}
    </div>"""


def view_no_goal() -> str:
    def block(seed: str, label: str) -> str:
        return f"""<p class="muted small" style="margin-top:8px">{label}</p>
        <section class="card"><div class="empty page-empty">
          <div class="eic">{ic("route", size=30)}</div>
          <h3>Ponle una meta a septiembre</h3>
          <p>Dinos cuánto quieres vender y te trazamos el camino: cuántas ventas, cuántas conversaciones, cuántas llamadas.</p>
          <div class="acts">{btn("Definir la meta", "flag")}</div>
          <p class="seed">{seed}</p>
        </div></section>"""
    a = f'{ic("history", size=14)} El mes pasado vendiste <b class="tnum">$ 22.100.000</b>. Una meta de <b class="tnum">$ 25.400.000</b> (+15 %) es alcanzable con tu ritmo.'
    b = f'{ic("flask-conical", size=14)} Aún no tenemos tu historia: te proponemos empezar con lo típico de «Salud, belleza y citas».'
    return f"""<div class="page cr">
      {K.crumb("Comercial")}
      <div class="header"><div><h1>Tu ruta de septiembre</h1><p class="lead">Sin meta todavía.</p></div></div>
      {block(a, "Semilla con historia (tenant con ventas):")}
      {block(b, "Semilla sin historia (tenant nuevo):")}
    </div>"""


def view_goal_editor(mid_month=False) -> str:
    implies = "".join([
        gr("Ventas necesarias", str(SALES), f'{cop(TARGET)} ÷ ticket {cop(TICKET)} = 42,9 → {SALES} · {src("history")} · 61 ventas en 90 días'),
        gr("Cotizaciones", str(QUOTES), f'{SALES} ÷ 38 % (58 de 152 cotizaciones se vendieron en 60 días) · {src("history")}'),
        gr("Citas agendadas", str(APPTS), f'{SALES} ÷ 35 % de las citas agendadas terminan en venta · {src("history")}'),
        gr("Contactados", str(CONTACTED), f'{APPTS} ÷ 52 % de los contactados cotizan · {src("history")}'),
        gr("Conversaciones nuevas", str(CONVOS), f'{CONTACTED} ÷ 35 % de los que escriben se dejan contactar · {src("history")}'),
        gr("Llamadas", f'{CALLS} <span class="muted" style="font-weight:400">· {ANSWERED} contestadas</span>', f'3 de cada 10 contactos van por llamada · 62 % contestan · {src("benchmark")}'),
    ])
    sup = f"""<details class="sup"><summary>Ajustar supuestos {ic("chevron-down", size=16)}</summary>
      <div class="cad" style="padding:6px 18px 12px">
        <div class="f"><span class="k">Ticket promedio</span>{K.input("700.000", cls="adorn", icon="badge-dollar-sign")}</div>
        <div class="f"><span class="k">Cotización → venta</span>{K.input("38 %")}</div>
        <div class="f"><span class="k">Cita agendada → venta</span>{K.input("35 %")}</div>
        <div class="f"><span class="k">Contactado → cotiza</span>{K.input("52 %")}</div>
        <div class="f"><span class="k">Llamadas contestadas</span>{K.input("62 %")}</div>
        <div class="f"><span class="k">Contactos por llamada</span>{K.input("30 %")}</div>
      </div>
      <p class="muted small" style="padding:0 18px 12px">Lo que cambies aquí pasa a decir «lo dijiste tú». Cuando tu historia alcance muestra, te avisamos si conviene volver al dato real.</p>
    </details>"""
    mid = ""
    if mid_month:
        need = SALES - SCEN["behind"]["kr"]["sales"]
        mid = K.notice("info", f"Llevas <b class=\"tnum\">{copm(SCEN['behind']['actual'])}</b> y {SCEN['behind']['kr']['sales']} ventas. Si mantienes la meta, la ruta se recalcula desde hoy: "
                       f"faltan {need} ventas en los {LEFT} días hábiles que quedan ({dec(need / LEFT)} al día). Si la cambias, lo recorrido se conserva.", icon="route")
    return f"""<div class="page" style="max-width:720px">
      {K.crumb("Comercial", "Meta")}
      <div class="header"><div><h1>{"¿Cambias la meta de septiembre?" if mid_month else "¿Cuánto quieres vender en septiembre?"}</h1><p class="lead">El mes pasado: <b class="tnum" style="font-weight:500;color:var(--foreground)">$ 22.100.000</b> · 31 ventas · ticket $ 713.000</p></div></div>
      {mid}
      <div class="goal-in" role="textbox" aria-label="Meta del mes en pesos">{cop(TARGET)}<span class="caret" aria-hidden="true"></span><small>COP · septiembre 2026</small></div>
      <div class="seg inline sm" role="radiogroup" aria-label="Atajos">
        <button role="radio" aria-checked="false">Como el mes pasado</button>
        <button role="radio" aria-checked="false">+10 %</button>
        <button role="radio" aria-checked="false">+25 %</button>
        <button role="radio" aria-checked="true">Otra cifra</button>
      </div>
      {gl("Lo que implica", implies, right='<span class="muted" style="letter-spacing:0;text-transform:none;font-weight:400">cada paso redondea hacia arriba</span>')}
      {sup}
      <div class="form-actions" style="justify-content:flex-start">{btn("Guardar meta", "flag")}{btn("Cancelar", "", "ghost")}</div>
      <p class="muted small">Al guardar: «Meta puesta. {"La ruta sigue desde hoy." if mid_month else "Empezamos a medir el camino."}»</p>
    </div>"""


def trend_svg() -> str:
    # 26 días hábiles; esperado lineal 0→43; real hasta el día 20 = 27 (esperado a hoy 33)
    W, H, pad = 520, 180, 26
    def x(d): return pad + (W - 2 * pad) * d / DAYS
    def y(v): return H - pad - (H - 2 * pad) * v / SALES
    exp_pts = f"{x(0):.0f},{y(0):.0f} {x(DAYS):.0f},{y(SALES):.0f}"
    actual = [0, 1, 2, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14, 15, 17, 18, 20, 21, 23, 25, 27]
    act_pts = " ".join(f"{x(i):.0f},{y(v):.0f}" for i, v in enumerate(actual))
    fill = f"{x(0):.0f},{y(0):.0f} {act_pts} {x(DAY):.0f},{y(0):.0f}"
    grid = "".join(f'<line class="grid" x1="{pad}" x2="{W - pad}" y1="{y(v):.0f}" y2="{y(v):.0f}"/><text x="{pad - 6}" y="{y(v) + 4:.0f}" text-anchor="end">{v}</text>' for v in (0, 14, 29, SALES))
    ticks = "".join(f'<text x="{x(d):.0f}" y="{H - 8}" text-anchor="middle">{lbl}</text>' for d, lbl in ((0, "1 sep"), (10, "12 sep"), (DAY, "hoy"), (DAYS, "30 sep")))
    return f"""<svg class="trend" viewBox="0 0 {W} {H}" role="img" aria-label="Ventas acumuladas del mes: 27 reales frente a {EXP_SALES} esperadas a hoy">
      {grid}{ticks}
      <polygon class="fill" points="{fill}"/>
      <polyline class="exp" points="{exp_pts}"/>
      <polyline class="act" points="{act_pts}"/>
      <circle class="end" cx="{x(DAY):.0f}" cy="{y(27):.0f}" r="4.5"/>
    </svg>
    <div class="legend"><span><i></i>Real</span><span><i class="exp"></i>Esperado</span></div>"""


def sheet(label: str, head: str, body: str, foot: str) -> str:
    return f"""<div class="sheet-wrap"><aside class="sheet" role="dialog" aria-modal="true" aria-label="{label}">
      <div class="sheet-h">{head}</div>
      <div class="sheet-b">{body}</div>
      <div class="sheet-f">{foot}</div>
    </aside></div>"""


def view_kr_sheet() -> str:
    s = SCEN["behind"]
    cur = s["kr"]["sales"]
    need = SALES - cur
    proj_sales = round(cur / DAY * DAYS)  # 35
    head = f"""<span class="ey">Resultado clave</span>
        <h2>Ventas cerradas {btn("", "x", "ghost icon sm", 'aria-label="Cerrar"')}</h2>
        <div class="big">{cur} <span class="muted" style="font-size:16px;font-family:var(--font-body)">de {SALES} · faltan {need}</span>{badge("Ritmo bajo", "warn")}</div>"""
    body = f"""{trend_svg()}
        {gl("El camino", "".join([
            gr("Recorrido", f"{cur} ventas · {cur / SALES * 100:.0f} %"),
            gr("Donde deberías ir hoy", f"{EXP_SALES}", f"{SALES} × {DAY} de {DAYS} días hábiles"),
            gr("Ritmo real", f"{dec(cur / DAY, 2)} al día"),
            gr("Ritmo necesario", f"{dec(need / LEFT)} al día · {LEFT} días hábiles", f"{need} ventas que faltan ÷ {LEFT} días; en la cabecera se redondea a {math.ceil(need / LEFT)}"),
            gr("Proyección al cierre", f"{proj_sales} ventas · {proj_sales / SALES * 100:.0f} %", f"{cur} ÷ {DAY} × {DAYS} días · {copm(s['proj'])} · {s['proj'] / TARGET * 100:.0f} %"),
        ]))}
        {gl("De dónde sale", "".join([
            gr("Ticket promedio", cop(TICKET), src("history") + " · últimos 90 días · 61 ventas", btn("Corregir", "", "ghost xs hov")),
            gr("Cotización → venta", "38 %", src("history") + " · últimos 60 días · 58 de 152 cotizaciones", btn("Corregir", "", "ghost xs hov")),
            gr("Días hábiles", f"{DAYS} · lunes a sábado", "según tu horario de atención"),
        ]))}
        {gl("Mix sugerido", "".join([
            gr("Limpieza facial profunda", "19 ventas · " + cop(6_650_000), "45 % de tus ventas de los últimos 90 días"),
            gr("Toxina botulínica", "13 ventas · " + cop(11_050_000), "30 %"),
            gr("Otros tratamientos", "11 ventas · " + cop(12_300_000), "25 % · 6 productos"),
        ]))}"""
    foot = f'<span>1 acción propuesta empuja este resultado</span><div class="acts">{btn("Ver en el CRM", "arrow-right", "outline sm")}</div>'
    return f'{view_route("behind")}{sheet("Ventas cerradas", head, body, foot)}'


def action_head() -> str:
    return f"""<span class="ey">{badge("Lote de seguimiento", "outline")}{badge("vence el sábado", "warn")}</span>
        <h2>{REACT["title"]} {btn("", "x", "ghost icon sm", 'aria-label="Cerrar"')}</h2>
        <p class="hl" style="color:var(--axi-violet);font-weight:500">{REACT_HL}</p>"""


def action_body() -> str:
    return f"""{gl("Por qué ahora", "".join([
            gr("Ritmo de ventas", f"{dec(SCEN['behind']['kr']['sales'] / DAY, 2)} al día · esperado {dec(SALES / DAYS, 2)}", src("history")),
            gr("Cotizaciones sin respuesta", "38 · hace más de 5 días", "ninguna tiene seguimiento programado"),
            gr("Lo que suelen dar", "16 % vuelve a responder · 1 de cada 3 compra", f"38 × 16 % × 33 % ≈ {REACT_EST} ventas · " + src("history") + " · agosto"),
        ]))}
        {gl("Qué va a pasar", "".join([
            gr("Contactos", "38 · 36 recibirán el mensaje", "2 pidieron no recibir mensajes: quedan fuera", btn("Ver lista", "", "ghost xs hov")),
            gr("Canal", "WhatsApp", "con plantilla «Retomar cotización» (utility · aprobada)"),
            gr("Cuándo", "mañana 9:00 · 12 por hora", "dentro de tu horario · respeta las horas de silencio"),
            gr("Quién", "Sofía, tu agente", "objetivo: retomar la cotización y agendar la cita"),
            gr("Costo estimado", "≈ US$ 0,03", "36 plantillas utility"),
        ]))}
        {K.notice("info", "Verás el avance en <b>Ventas cerradas</b> y en <b>Tareas</b>. Nada se envía sin tu aprobación.", icon="shield-check")}"""


def view_action_sheet() -> str:
    foot = f'<span>Rechazar guarda el motivo y axi no vuelve a proponerlo esta semana.</span><div class="acts">{btn("Rechazar", "", "ghost sm")}{btn("Aprobar", "check", "sm")}</div>'
    return f'{view_route("behind")}{sheet("Acción propuesta", action_head(), action_body(), foot)}'


def view_action_reject() -> str:
    reasons = ["Prefiero que mi equipo los contacte uno por uno", "Es pronto para volver a escribirles", "No quiero mover precio este mes", "Otro motivo…"]
    menu = f'<div class="menu" role="listbox" aria-label="Motivo del rechazo"><div class="mh">¿Por qué no?</div>' + "".join(
        f'<button role="option" aria-selected="{"true" if i == 0 else "false"}">{ic("pen-line" if r.endswith("…") else "circle", size=13)}{r}</button>' for i, r in enumerate(reasons)) + "</div>"
    rej = btn("Rechazar", "", "outline sm", 'aria-expanded="true" aria-haspopup="listbox"')
    foot = f'<span>El motivo queda guardado y axi no vuelve a proponerlo esta semana.</span><div class="acts">{menu}{rej}{btn("Aprobar", "check", "sm", "disabled")}</div>'
    return f'{view_route("behind")}{sheet("Acción propuesta", action_head(), action_body(), foot)}'


def view_action_result() -> str:
    head = f"""<span class="ey">{badge("Lote de seguimiento", "outline")}{badge("Aprobada", "ok")}</span>
        <h2>{REACT["title"]} {btn("", "x", "ghost icon sm", 'aria-label="Cerrar"')}</h2>
        <p class="hl" style="color:var(--axi-violet);font-weight:500">{REACT_HL}</p>"""
    body = f"""{K.notice("ok", "<b>Listo. 36 contactos entran en seguimiento mañana a las 9:00.</b><br>2 quedaron fuera: pidieron no recibir mensajes.", icon="circle-check")}
        {gl("Qué quedó", "".join([
            gr("Lote", "36 tareas de seguimiento", "creadas ahora · las ejecuta Sofía desde las 9:00", btn("Ver lista", "", "ghost xs hov")),
            gr("Fuera del lote", "2 contactos", "pidieron no recibir mensajes · no se les escribe"),
            gr("Dónde se ve", "Ventas cerradas · Tareas", "cada respuesta y cada venta del lote cuentan en este resultado clave"),
        ]))}"""
    foot = f'<span>Aprobada hoy 14:12 por Camila.</span><div class="acts">{btn("Ver en Tareas", "arrow-right", "outline sm")}</div>'
    return f'{view_route("behind")}{sheet("Acción aprobada", head, body, foot)}'


NICHES = ["Restaurantes y comida", "Retail y moda", "Hoteles y turismo", "Salud, belleza y citas", "Inmobiliarias", "Educación y cursos",
          "Servicios profesionales", "Distribuidores B2B", "Software y servicios digitales", "Tecnología y electrónica", "Otro tipo de negocio"]
NICHE = "Salud, belleza y citas"


def view_journey_settings() -> str:
    tabs = [("Pipelines", "kanban"), ("Recorrido", "route"), ("Etiquetas", "tag"), ("Segmentos", "users"), ("Importar", "upload"), ("Seguimiento", "bot"), ("Secuencias", "list-ordered")]
    def stage(name, kind_label, kind_icon, cad, badge_html="", final=False):
        right = badge_html + (f'<span class="go">{ic("chevron-down", size=16)}</span>' if not final else "")
        v = f'<span class="kind">{ic(kind_icon, size=14)}{kind_label}{ic("chevron-down", size=13)}</span>'
        return gr(name, v, cad if not final else "Etapa final · sin cadencia", right, link=not final)
    # cadencia por etapa = lo que el modelo guarda: intentos · espera · canal · tiempo máximo · al agotarse
    expanded = f"""<div class="gr" style="background:color-mix(in srgb, var(--foreground) 2%, transparent)">
      <div class="k">Propuesta</div>
      <div class="v"><span class="kind">{ic("file-text", size=14)}Propuesta{ic("chevron-down", size=13)}</span><span class="muted small" style="font-weight:400">El cliente ya tiene una cotización en la mano.</span></div>
      <div class="cad" style="grid-column:1 / -1">
        <div class="f"><span class="k">Intentos</span>{K.input("4")}</div>
        <div class="f"><span class="k">Espera entre intentos</span>{K.select("2 días")}</div>
        <div class="f"><span class="k">Canal</span>{K.select("Mensaje", icon="message-circle")}</div>
        <div class="f"><span class="k">Tiempo máximo en la etapa</span>{K.select("10 días")}</div>
        <div class="f" style="grid-column:1 / -1"><span class="k">Al agotarse los intentos</span>{K.select("Marcar la oportunidad como perdida")}</div>
      </div>
      <div class="moves" style="grid-column:1 / -1">{ic("zap", size=13)}La mueven solos: <b>cotización enviada</b> · <b>cita cumplida</b>. El agente también puede moverla si el cliente lo pide o lo descarta.</div>
    </div>"""
    stages = "".join([
        stage("Consulta", "Nuevo", "sparkle", "2 intentos · espera 4 h · mensaje · máx. 2 días · al agotarse: dejar enfriar"),
        stage("Contactado", "Contactado", "message-circle", "3 intentos · espera 24 h · mensaje · máx. 5 días · al agotarse: marcar perdida"),
        stage("Cita agendada", "Agenda", "calendar-days", "1 intento · espera 24 h · llamada y luego mensaje · máx. 7 días · al agotarse: pasar a una persona"),
        expanded,
        stage("Pago confirmado", "Compromiso", "badge-check", "1 intento · espera 48 h · mensaje · máx. 3 días · al agotarse: pasar a una persona"),
        stage("En tratamiento", "Entrega", "heart-handshake", "", final=True),
        stage("Reagendar", "Personalizada", "circle-dashed", "No se mueve sola ni entra en las tasas del recorrido", badge("Sin tipo: no se mueve sola", "warn")),
    ])
    template = gr("Plantilla", NICHE, "6 etapas con cadencia · tu tipo de negocio", btn("Cambiar", "", "ghost xs hov"), link=True)
    descs = ["Pedido rápido · 2 intentos · 2 h", "Carrito · cotización · 3 intentos · 24 h", "Reserva · anticipo · 3 intentos · 48 h",
             "Cita · asistió · tratamiento · 4 intentos", "Visita · oferta · 3 intentos · 72 h · llamada", "Info · clase muestra · matrícula · 4 · 48 h",
             "Reunión · propuesta · 4 intentos · 72 h", "Lista de precios · pedido · 3 · 72 h", "Demo · prueba · 4 intentos · 48 h",
             "Cotización · pago · 3 intentos · 24 h", "Nuevo · contactado · propuesta · 3 · 48 h"]
    picker = f"""<div class="tpl" role="radiogroup" aria-label="Plantillas por tipo de negocio">
      {"".join(f'<button role="radio" aria-checked="{"true" if n == NICHE else "false"}"><b>{n}</b><span>{d}</span></button>' for n, d in zip(NICHES, descs))}
    </div>
    <p class="muted small" style="padding:0 18px 14px">Aplicar una plantilla reemplaza tipos y cadencias. <b>No borra etapas ni oportunidades.</b></p>"""
    return f"""<div class="page">
      {K.crumb("CRM", "Configuración", "Recorrido")}
      <div class="header"><div><h1>El recorrido del cliente</h1><p class="lead">Qué etapas pasa un contacto, cuánto insistimos en cada una y cuándo la movemos solos.</p></div></div>
      {seg_nav(tabs, "Recorrido", "Configuración del CRM", "sm")}
      {K.notice("info", "Cada etapa se mueve sola con sus eventos (una cita agendada, una cotización enviada). <b>El agente también puede moverla por su criterio.</b> Todo queda en el historial del contacto y se puede deshacer con un clic.", icon="sparkles")}
      {gl("", template + picker)}
      {gl("Etapas", stages, right='<span class="muted" style="letter-spacing:0;text-transform:none;font-weight:400">Se guarda al salir de cada campo</span>')}
      <p class="muted small">Los recordatorios de la cita (24 h y 2 h antes) los manda <b>Agenda</b>; aquí solo se decide cuánto insistir si la cita no se cumple.</p>
      <div class="mk-in">{ic("info", size=14)}<span>Ganado y Perdido no son etapas: son el estado de la oportunidad. Reordenar, renombrar y colorear etapas sigue en <b>Pipelines</b>. La probabilidad por etapa y los días de enfriamiento se leen aquí como «tiempo máximo». Una etapa <b>Personalizada</b> no se mueve sola ni entra en las tasas.</span></div>
    </div>"""


def view_contact_360() -> str:
    def tli(icon, title, desc, when, cls="", action=""):
        act = f'<span class="act">{action}</span>' if action else ""
        return f'<div class="tli {cls}"><div class="dc"><i>{ic(icon, size=13)}</i></div><div><div class="tt">{title}</div><div class="td">{desc}</div></div><div class="when"><span>{when}</span>{act}</div></div>'
    journey = gl("Recorrido", "".join([
        gr("Etapa", f'Propuesta {badge("Propuesta", "")}', "Oportunidad «Plan facial completo» · $ 1.240.000"),
        gr("En la etapa", "hoy", "máx. 10 días · vence el 3 oct"),
        gr("La movió", "el agente Sofía", "«Pidió la cotización del tratamiento completo»", btn("Deshacer", "rotate-ccw", "ghost xs hov")),
        gr("Cadencia", "intento 1 de 4", "próximo el 25 sep 10:00 · WhatsApp · espera 2 días", btn("Pausar cadencia", "pause", "ghost xs hov")),
    ]), icon="route")
    score = gl("Puntaje", gr("55 / 100", f'{rule(55)}', "Interesada · evaluando · sin compromiso aún"))
    timeline = f"""<section class="card">
      <div class="card-head"><div><h2>Todo lo que pasó</h2></div><div class="right">{seg_filter(["Todo", "Recorrido", "Mensajes", "Citas"], "Todo", "Filtro del historial")}</div></div>
      <div class="tl">
        {tli("route", f'Pasó a <b>Propuesta</b> {badge("Agente IA", "ai", icon="sparkles")}', "«Pidió la cotización del tratamiento completo» · desde Cita agendada", "hoy 10:42", "violet", btn("Deshacer", "rotate-ccw", "ghost xs"))}
        {tli("file-text", "Cotización enviada · $ 1.240.000", "Plan facial completo · 3 sesiones · por Sofía", "hoy 10:41", "brand")}
        {tli("calendar-check", "Asistió a la cita", "Valoración · sede Chapinero · 40 min", "ayer 16:30")}
        {tli("phone", "Llamada contestada · 3 min", "Recordatorio de la cita · confirmó", "21 sep")}
        {tli("route", "Pasó a <b>Cita agendada</b>", "Regla: cita agendada · desde Contactado", "19 sep", "", btn("Deshacer", "rotate-ccw", "ghost xs"))}
        {tli("route", "Pasó a <b>Contactado</b>", "Regla: primera respuesta · desde Consulta", "15 sep")}
        {tli("user-round", "Ciclo de vida: prospecto → lead", "Al responder por primera vez", "15 sep")}
        {tli("message-circle", "Escribió por Instagram", "«Hola, ¿cuánto vale la limpieza facial?»", "15 sep")}
      </div>
    </section>"""
    return f"""<div class="page">
      {K.crumb("CRM", "Contactos", "Laura Restrepo")}
      <div class="header"><div class="person"><div class="av">LR</div><div><h1>Laura Restrepo</h1><div class="sub">{badge("Lead", "info")}<span>Instagram · +57 310 ··· 4421 · Bogotá</span></div></div></div>
        <div class="right">{btn("Escribir", "message-circle", "outline sm")}{btn("Programar seguimiento", "calendar-clock", "sm")}</div></div>
      <div class="c360">
        <div class="stack">{journey}{score}</div>
        {timeline}
      </div>
    </div>"""


def view_analytics() -> str:
    # 30 días: 380 conversaciones · 133 contactados · 71 cotizadas · 77 citas agendadas · 61 asistieron · 27 ventas · $ 18.940.000
    tabs = [("Conversión", "trending-up"), ("Calidad", "badge-check"), ("Alertas", "bell")]
    kpis = "".join(f'<div class="kpi"><div class="k">{k}</div><div class="v">{v}</div><div class="d">{d}</div></div>' for k, v, d in [
        ("Ventas pagadas", copm(18_940_000), "27 pedidos · 30 días"), ("Tasa de cierre", "7,1 %", "27 de 380 conversaciones"), ("Contención", "74 %", "sin humano"), ("Escalamiento", "12 %", "3 % por fallo de la IA")])
    fun = "".join(f'<div class="row"><span>{n}</span><div class="bar {"star" if star else ""}"><i style="width:{w}%"></i></div><span class="n">{v}</span></div>' for n, w, v, star in [
        ("Conversaciones", 100, "380", False), ("Con intención", 62, "236", False), ("Citas agendadas", 20, "77", False), ("Cotizadas", 19, "71", False), ("Ventas pagadas", 7, "27", True)])
    rates = gl("Tasas vivas · 30 días", "".join([
        gr("Llamadas → contestadas", "64 %", "9 de 14 llamadas · muestra corta (mín. 15): la ruta usa el supuesto 62 %", rule(64, soft=True)),
        gr("Contestadas → cita agendada", "44 %", "4 de 9 contestadas", rule(44, soft=True)),
        gr("Cita agendada → asistió", "79 %", "61 de 77 citas · 16 no asistieron", rule(79, soft=True)),
        gr("Cita agendada → venta", "35 %", "27 de 77 citas · la tasa que usa la ruta", rule(35)),
        gr("Asistió → venta", "44 %", "27 de 61 visitas · la etapa que más pesa", rule(44, soft=True)),
        gr("Valor por cita agendada", cop(246_000), f"{cop(18_940_000)} ÷ 77 citas agendadas"),
        gr("Valor por visita", cop(310_000), f"{cop(18_940_000)} ÷ 61 personas que asistieron"),
    ]))
    flow = gl("Recorrido del pipeline · 30 días", "".join([
        gr("Consulta → Contactado", "35 % avanza", "133 de 380 · 1,2 días en promedio", rule(35, soft=True)),
        gr("Contactado → Cita agendada", "58 %", "77 de 133 · 2,1 días", rule(58, soft=True)),
        gr("Cita agendada → Propuesta", "79 %", "61 de 77 · 4,4 días", rule(79, soft=True)),
        gr("Propuesta → Pago confirmado", "44 %", "27 de 61 · 5,8 días · 9 vencidas", rule(44)),
        gr("Pago → En tratamiento", "96 %", "26 de 27 · 1,2 días", rule(96, soft=True)),
    ]), right=f'<a href="#" style="letter-spacing:0;text-transform:none;font-weight:500;display:inline-flex;gap:4px;align-items:center;text-decoration:none">Ajustar el recorrido {ic("arrow-right", size=13)}</a>')
    return f"""<div class="page">
      {K.crumb("Analítica")}
      <div class="header"><div><h1>Analítica</h1><p class="lead">Lo que produjo la IA, medido con hechos.</p></div><div class="right">{seg_filter(["7 d", "30 d", "90 d"], "30 d", "Periodo")}</div></div>
      {seg_nav(tabs, "Conversión", "Planos de analítica")}
      <div class="kpis">{kpis}</div>
      <section class="card"><div class="card-head"><div><h2>Embudo de conversión</h2><p class="lead">Existente. Las dos listas de abajo son lo nuevo.</p></div></div><div class="fun">{fun}</div></section>
      <div class="grid2">{rates}{flow}</div>
    </div>"""


def view_dashboard() -> str:
    s = SCEN["behind"]
    with_goal = f"""<section class="gpb" aria-label="Tu meta de septiembre">
      <div class="k">Tu meta de septiembre</div>
      <div class="v"><b class="tnum" style="font-weight:600">{copm(s["actual"])}</b><span class="muted">de {cop(TARGET)} · faltan {copm(TARGET - s["actual"])}</span>{badge("Ritmo bajo", "warn")}</div>
      <div style="grid-column:1">{route(s["actual"] / TARGET, EXP, s["proj"] / TARGET, compact=True, flag=False)}</div>
      <p class="from">{src("history")}<span>· {s["kr"]["sales"]} de {SALES} ventas · esperadas {EXP_SALES} a hoy</span></p>
      <div class="r"><span class="pct">{s["actual"] / TARGET * 100:.0f} %</span><span class="muted">faltan {LEFT} días hábiles</span><br><a href="#">Ver la ruta {ic("arrow-right", size=14)}</a></div>
    </section>"""
    without = f"""<section class="gpb" aria-label="Sin meta">
      <div class="v" style="grid-column:1 / -1"><a href="#" style="font-weight:500;text-decoration:none;display:inline-flex;gap:6px;align-items:center">{ic("route", size=16)}Ponle una meta al mes y te trazamos el camino {ic("arrow-right", size=14)}</a></div>
    </section>"""
    tiles = "".join(f'<div class="tile"><div class="k">{k}</div><div class="v">{v}</div></div>' for k, v in [("Ventas hoy", "$ 1.400.000"), ("Conversaciones abiertas", "23"), ("Pedidos por confirmar", "4")])
    return f"""<div class="page">
      {K.crumb("Panel")}
      <div class="header"><div><h1>Buenos días, Camila</h1><p class="lead">Clínica Dermalux · miércoles 23 de septiembre</p></div></div>
      <p class="muted small">Con meta:</p>{with_goal}
      <p class="muted small">Sin meta:</p>{without}
      <div class="tiles">{tiles}</div>
      <div class="mk-in">{ic("info", size=14)}<span>El bloque va debajo del banner del Panel y encima de las cifras del día. Sin capacidad, sin permiso o con error de red no pinta nada (regla del banner de onboarding).</span></div>
    </div>"""


def view_blocked() -> str:
    return f"""<div class="page cr">
      {K.crumb("Comercial")}
      <section class="card"><div class="empty page-empty">
        <div class="eic">{ic("route", size=30)}</div>
        <h3>Comercial no está en tu plan</h3>
        <p>Tus agentes siguen atendiendo y vendiendo. Activa Comercial para trazar la ruta del mes y que axi te proponga cómo llegar.</p>
        <div class="acts">{btn("Ver planes", "arrow-right", "outline sm")}</div>
      </div></section>
      <div class="mk-in">{ic("info", size=14)}<span>Detrás: el servidor responde <span class="mono">403 entitlements/capability_not_granted · crm</span>; la UI no muestra el código. Decisión abierta: en v1 la capacidad es la del CRM (todo plan con CRM lo tiene). Esta pantalla solo la ve un tenant sin CRM. Si Comercial se vende aparte, cambia la capacidad y este copy.</span></div>
    </div>"""


# ----------------------------------------------------------------------------- vistas de documento
def T(rows: list[list[str]], head: list[str]) -> str:
    th = "".join(f"<th>{h}</th>" for h in head)
    tr = "".join("<tr>" + "".join(f"<td>{c}</td>" for c in r) + "</tr>" for r in rows)
    return f'<div class="table-wrap"><table><thead><tr>{th}</tr></thead><tbody>{tr}</tbody></table></div>'


def doc_method() -> str:
    steps = "".join(f'<div class="step"><div class="n">{i}</div><div><b>{t}</b>{d}</div></div>' for i, t, d in [
        (1, "El destino: la meta del mes", "El dueño dice cuánto quiere vender en pesos. Una sola cifra, un mes. Alba la pregunta al arrancar; el panel la cambia cuando haga falta."),
        (2, "La ruta: del dinero a las acciones", "Con el ticket promedio y las tasas de tu embudo, axi calcula hacia atrás cuántas ventas, cotizaciones, citas, contactos, conversaciones y llamadas hacen falta. Es la matemática del embudo al revés."),
        (3, "El ritmo: cuánto por día hábil", f"La ruta se reparte en los días hábiles de tu horario. Así «hoy deberías ir en {EXP_SALES} ventas» tiene sentido un miércoles 23."),
        (4, "Dónde vas: el resultado de cada día", "Cada noche axi cierra el día con hechos (pagos, citas, llamadas contestadas, conversaciones nuevas) y compara con el ritmo. Te dice qué falta y a dónde llegas si sigues así."),
        (5, "Recalcular: acciones que apruebas", "Si el ritmo baja, Axi propone algo concreto y ejecutable con lo que ya existe: un lote de seguimiento, una secuencia, una campaña. Tú apruebas; nada sale solo."),
    ])
    example = T([
        ["Ventas", f"<b>{SALES}</b>", "⌈meta ÷ ticket promedio⌉", f"⌈{cop(TARGET)} ÷ {cop(TICKET)}⌉ = ⌈42,9⌉", "historia · 90 d · 61 ventas"],
        ["Cotizaciones", f"<b>{QUOTES}</b>", "⌈ventas ÷ (cotización → venta)⌉", f"⌈{SALES} ÷ 38 %⌉ = ⌈113,2⌉", "historia · 60 d · 58 de 152"],
        ["Citas agendadas", f"<b>{APPTS}</b>", "⌈ventas ÷ (cita agendada → venta)⌉", f"⌈{SALES} ÷ 35 %⌉ = ⌈122,9⌉", "historia · 60 d"],
        ["Contactados", f"<b>{CONTACTED}</b>", "⌈máx(cotizaciones, citas) ÷ (contactado → cotiza)⌉", f"⌈{APPTS} ÷ 52 %⌉ = ⌈236,5⌉", "historia · 60 d"],
        ["Conversaciones nuevas", f"<b>{CONVOS}</b>", "⌈contactados ÷ (lead → contactado)⌉", f"⌈{CONTACTED} ÷ 35 %⌉ = ⌈677,1⌉", "historia · 30 d"],
        ["Llamadas", f"<b>{CALLS}</b><small>{ANSWERED} contestadas</small>", "⌈contactados × parte por llamada ÷ contestación⌉", f"⌈{CONTACTED} × 30 % ÷ 62 %⌉ = ⌈114,7⌉", "<span class='src'>supuesto para tu tipo de negocio</span>"],
    ], ["Necesitas", "Cuánto", "Cómo se calcula", "Con tus números", "De dónde sale"])
    windows = T([
        ["Tasas del embudo", "30 → 60 → 90 días", "≥ 20 en el denominador", "la ventana más corta con muestra gana"],
        ["Ticket promedio", "90 días (180 si hace falta)", "≥ 5 ventas", "<b>jamás</b> se supone: sin ticket el plan queda «incompleto» y se pide"],
        ["Contestación de llamadas", "30 → 60 → 90 días", "≥ 15 llamadas", "sin llamadas no hay fila de llamadas"],
        ["Mix de productos", "90 días (180)", "≥ 10 ventas", "piso 5 % por categoría, máximo 8 filas + «Otros»"],
    ], ["Cifra", "Ventanas", "Muestra mínima", "Regla"])
    bench_rows = {  # lead→venta · lead→contactado · contactado→cotiza · cotización→venta · cita agendada→venta · asistencia a la cita · llamadas contestadas
        "Restaurantes y comida": ["22 %", "65 %", "70 %", "45 %", "—", "—", "55 %"],
        "Retail y moda": ["9 %", "38 %", "45 %", "35 %", "—", "—", "60 %"],
        "Hoteles y turismo": ["12 %", "45 %", "40 %", "40 %", "—", "—", "65 %"],
        "Salud, belleza y citas": ["7 %", "35 %", "52 %", "38 %", "35 %", "78 %", "62 %"],
        "Inmobiliarias": ["3 %", "40 %", "35 %", "20 %", "25 %", "70 %", "58 %"],
        "Educación y cursos": ["8 %", "40 %", "45 %", "30 %", "35 %", "65 %", "60 %"],
        "Servicios profesionales": ["10 %", "45 %", "50 %", "35 %", "40 %", "80 %", "65 %"],
        "Distribuidores B2B": ["15 %", "50 %", "60 %", "40 %", "—", "—", "70 %"],
        "Software y servicios digitales": ["6 %", "35 %", "40 %", "30 %", "30 %", "70 %", "55 %"],
        "Tecnología y electrónica": ["8 %", "38 %", "45 %", "35 %", "—", "—", "60 %"],
        "Otro tipo de negocio": ["8 %", "40 %", "45 %", "35 %", "35 %", "70 %", "60 %"],
    }
    assert list(bench_rows) == NICHES
    bench = T([[n, *v] for n, v in bench_rows.items()],
              ["Tipo de negocio", "Lead → venta", "Lead → contactado", "Contactado → cotiza", "Cotización → venta", "Cita agendada → venta", "Asistencia a la cita", "Llamadas contestadas"])
    return f"""<article class="doc">
      <span class="eyebrow">Módulo Comercial · Fase 0 · para discutir antes de construir</span>
      <h1>La ruta: de la meta del mes al trabajo de cada día</h1>
      <p class="lead">Los números no se esperan, se persiguen. Este módulo convierte «quiero vender treinta millones» en una ruta con ritmo, y cada día te dice dónde vas, qué falta y qué hacer.</p>
      <p class="quote">Como un Waze: eliges el destino, axi traza la ruta, y si el tráfico cambia, recalcula.</p>

      <h2>Cómo funciona</h2>
      <div class="steps">{steps}</div>

      <h2>Un ejemplo con números</h2>
      <p>Clínica Dermalux quiere vender <b class="tnum">{cop(TARGET)}</b> en septiembre. Este es el plan que axi le traza, cifra por cifra, con la procedencia de cada una:</p>
      {example}
      <div class="callout"><b>Cada paso redondea hacia arriba</b> (⌈ ⌉ es el techo): mejor un paso de más que uno de menos. Y la cascada se propaga: las {QUOTES} cotizaciones salen de las {SALES} ventas ya redondeadas, los {CONTACTED} contactados de las {APPTS} citas, y así hasta las {CONVOS} conversaciones. Lo mismo al repartir por día: «faltan 16 ventas en 6 días» son 2,7 al día, y la ruta dice <b>3 ventas al día</b>.</div>
      <div class="callout"><b>Cada cifra dice de dónde sale.</b> Hay tres procedencias, de más a menos fuerte: <b>tu historia</b> (lo que tu negocio hizo de verdad), <b>lo dijiste tú</b> (lo que declaraste a Alba o en el editor) y <b>supuesto para tu tipo de negocio</b> (un punto de partida mientras no hay datos). Una cifra derivada hereda la procedencia más débil de sus insumos, y un supuesto se retira solo en cuanto tu historia alcanza muestra. No hay mezclas: es explicable.</div>

      <h2>Ventanas, muestras y cuándo se retira un supuesto</h2>
      {windows}

      <h2>El ritmo</h2>
      <ul>
        <li><b>Días hábiles según tu horario</b> de atención (sin horario: lunes a sábado). Septiembre 2026 tiene {DAYS}; hoy, 23 de septiembre, es el día hábil {DAY}. Festivos: no en la primera versión, y lo decimos.</li>
        <li><b>Dónde deberías ir hoy</b> = meta × (días hábiles transcurridos ÷ totales) = {DAY} de {DAYS} = 76,9 %; en ventas, ⌈{SALES} × 76,9 %⌉ = {EXP_SALES}. El marcador hueco de la ruta.</li>
        <li><b>Estado del ritmo</b>: adelantado por encima del 110 % de lo esperado · al ritmo entre 90 y 110 · ritmo bajo por debajo del 90 · atrasado por debajo del 80. Con menos de 3 días hábiles, «aprendiendo tu ritmo»: sin proyección ni acciones.</li>
        <li><b>Proyección al cierre</b> = lo recorrido ÷ días transcurridos × días totales. La prolongación punteada. Con 27 ventas al día 20: 27 ÷ 20 × 26 = 35 ventas (81 %).</li>
        <li><b>Qué falta</b>: lo que queda, dividido en los días hábiles restantes y redondeado hacia arriba, en ventas, citas y contactos. «3 ventas al día en los 6 días que quedan».</li>
        <li>Un pago cuenta <b>el día que se pagó</b>, aunque la conversación sea de hace un mes. Nunca se retro-imputa.</li>
      </ul>

      <h2>Los OKR, sin escribirlos</h2>
      <p>El <b>Objetivo</b> es la meta del mes. Los <b>Resultados Clave</b> son las cifras del plan con su avance: ventas, ticket, cotizaciones, citas, contactados, conversaciones nuevas y llamadas. Se leen como OKR y se recalculan solos; no hay editor. Si algún día hace falta un resultado clave propio («reactivar 50 clientes antiguos»), se añade después.</p>

      <h2>Las acciones que Axi propone</h2>
      <ul>
        <li><b>Cuándo</b>: al cerrar el día, si el ritmo baja del umbral. <b>Una propuesta pendiente por semana y por meta</b> (la clave de la señal es semanal); vence el sábado; no se repite si la rechazas. Si vas al ritmo o adelantado, no propone nada.</li>
        <li><b>Qué</b>: un <b>lote de seguimiento</b> (contactos concretos, canal, hora, objetivo), inscribir en una <b>secuencia</b> existente, o un borrador de <b>campaña</b> cuando faltan conversaciones nuevas. Todo con lo que ya existe en el CRM y Marketing.</li>
        <li><b>Con qué cara</b>: cada propuesta dice cuántas ventas estima y de dónde sale la estimación (38 cotizaciones × 16 % que responden × 1 de cada 3 que compra ≈ 2), qué parte de la brecha cubre, por qué ahora (con la procedencia) y qué va a pasar exactamente si apruebas: quién, a quién, cuándo, por dónde, cuánto cuesta.</li>
        <li><b>Nunca</b>: enviar algo sin aprobación, escribir a quien pidió que no le escriban, ni fijar precios o montos desde el modelo.</li>
      </ul>

      <h2>Supuestos por tipo de negocio (hipótesis para discutir)</h2>
      <p>Son puntos de partida, marcados como «supuesto para tu tipo de negocio» en cada cifra y reemplazados por tu historia en cuanto hay muestra. Los once tipos son los mismos del alta de negocio. Vienen de los benchmarks públicos de venta por chat en LATAM y de la experiencia de los pilotos; hay que revisarlos con el dueño. «—» = ese negocio no trabaja con citas.</p>
      {bench}

      <h2>Lo que la primera versión no hace</h2>
      <ul>
        <li>Metas por vendedor o por agente (decisión: mensual del negocio).</li>
        <li>Festivos en el calendario de días hábiles.</li>
        <li>Meta en unidades o por producto: el mix se sugiere, no se fija.</li>
        <li>Ejecutar acciones sin aprobación, aunque haya reglas del dueño.</li>
      </ul>
    </article>"""


def doc_journey() -> str:
    kinds = T([
        ["<b>Nuevo</b>", "Consulta · Nuevo · Interesado", "Escribió o lo importaste; nadie ha conversado con él todavía.", "Entra al crear la oportunidad"],
        ["<b>Contactado</b>", "Contactado", "Hubo ida y vuelta: respondió un mensaje o contestó una llamada.", "primera respuesta · llamada contestada"],
        ["<b>Calificado</b>", "Calificado · Con necesidad", "Sabemos qué quiere, cuándo y si puede. Criterio del agente o del operador.", "solo por juicio"],
        ["<b>Agenda</b>", "Cita agendada · Visita · Demo", "Hay un compromiso en el calendario.", "cita agendada"],
        ["<b>Propuesta</b>", "Propuesta · Cotización enviada", "Tiene precio o plan en la mano.", "cotización enviada · cita cumplida"],
        ["<b>Negociación</b>", "Negociación · Pedido tomado", "Dijo que sí con condiciones; el pedido existe y falta el pago.", "pedido creado"],
        ["<b>Compromiso</b>", "Pago confirmado · Reserva confirmada", "Pagó o reservó.", "pago verificado (además la oportunidad pasa a ganada)"],
        ["<b>Entrega</b>", "Despachado · En tratamiento · Activación", "Se está cumpliendo lo prometido.", "por juicio o al despachar"],
        ["<b>Personalizada</b>", "Cualquier otra", "Etapa propia del negocio sin significado para axi.", "no se mueve sola ni entra en las tasas"],
    ], ["Tipo", "Nombres típicos", "Qué significa", "Qué la mueve sola"])
    rules = T([
        ["El cliente responde por primera vez", "→ Contactado", "mensaje"],
        ["Contesta una llamada (habló una persona)", "→ Contactado", "llamada"],
        ["Se agenda una cita", "→ Agenda", "cita"],
        ["Se envía una cotización", "→ Propuesta", "pedido cotizado"],
        ["Se crea el pedido", "→ Negociación", "pedido"],
        ["Asiste a la cita", "→ la etapa siguiente a Agenda", "cita cumplida (evento nuevo)"],
        ["Se verifica el pago", "→ Compromiso y <b>ganada</b>", "pago"],
    ], ["Cuando pasa esto", "La oportunidad va a", "Evidencia"])
    cadences = T([
        ["Restaurantes y comida", "Nuevo · 2 · 2 h · mensaje · máx. 1 d · dejar enfriar", "Pedido en minutos; insistir dos veces y soltar"],
        ["Retail y moda", "Propuesta · 3 · 24 h · mensaje · máx. 5 d · marcar perdida", "Carrito y cotización; un recordatorio de pago"],
        ["Hoteles y turismo", "Propuesta · 3 · 48 h · mensaje · máx. 7 d · marcar perdida", "Reserva con anticipo"],
        ["Salud, belleza y citas", "Agenda · 1 · 24 h · llamada y luego mensaje · máx. 7 d · pasar a una persona<br>Propuesta · 4 · 2 d · mensaje · máx. 10 d · marcar perdida", "El no-show es la fuga; confirmar por llamada"],
        ["Inmobiliarias", "Agenda · 3 · 72 h · llamada y luego mensaje · máx. 14 d · pasar a una persona", "Decisión lenta; la visita lo es todo"],
        ["Educación y cursos", "Propuesta · 4 · 48 h · mensaje · máx. 14 d · dejar enfriar", "Clase muestra y matrícula con fecha límite"],
        ["Servicios profesionales", "Propuesta · 4 · 72 h · mensaje · máx. 21 d · pasar a una persona", "Reunión, propuesta, seguimiento espaciado"],
        ["Distribuidores B2B", "Negociación · 3 · 72 h · llamada · máx. 14 d · pasar a una persona", "Lista de precios, pedido recurrente"],
        ["Software y servicios digitales", "Propuesta · 4 · 48 h · mensaje · máx. 14 d · dejar enfriar", "Demo, prueba, activación"],
        ["Tecnología y electrónica", "Propuesta · 3 · 24 h · mensaje · máx. 5 d · marcar perdida", "Compara precio; rapidez"],
        ["Otro tipo de negocio", "Propuesta · 3 · 48 h · mensaje · máx. 10 d · marcar perdida", "Punto de partida neutro"],
    ], ["Tipo de negocio", "Cadencia sugerida (etapa · intentos · espera · canal · máximo · al agotarse)", "Por qué"])
    return f"""<article class="doc">
      <span class="eyebrow">Recorrido del cliente · qué hay detrás de la pantalla</span>
      <h1>Un embudo que se mueve solo y que el agente entiende</h1>
      <p class="lead">Hoy las etapas del CRM son nombres libres: nada las mueve y no se puede medir cuánto tarda un cliente en pasar de una a otra. Le damos a cada etapa un <b>tipo</b> con significado, una <b>cadencia</b> y reglas de avance.</p>

      <h2>Los tipos de etapa</h2>
      <p>Cada negocio nombra sus etapas como quiera; el tipo es lo que axi entiende. Ganado y Perdido no son etapas: son el estado de la oportunidad.</p>
      {kinds}

      <h2>Qué mueve una etapa sola</h2>
      <p>Solo hechos con evidencia. Solo hacia adelante. Nunca hacia una etapa que el negocio marcó como manual, ni pisando un movimiento reciente del agente o de una persona.</p>
      {rules}

      <h2>El agente también mueve, por su criterio</h2>
      <p>Decisión del dueño: avance automático total. El agente conoce la etapa, el ciclo de vida, el puntaje y la cadencia del contacto en cada turno, y puede mover la oportunidad a cualquier etapa cuando la conversación lo justifique («ya no le interesa», «quiere el plan completo»). Para que eso sea un activo y no un riesgo:</p>
      <ul>
        <li><b>Razón obligatoria</b> en cada movimiento, y queda escrita en el historial del contacto con la firma «agente IA».</li>
        <li><b>Aviso al operador</b> con un botón de <b>deshacer</b>. Deshacer devuelve la etapa y pausa los movimientos de la IA en esa oportunidad hasta que una persona la reactive.</li>
        <li><b>Un movimiento por conversación cada 6 horas</b>, y las reglas por evento nunca contradicen un movimiento reciente.</li>
        <li><b>Interruptor por negocio</b> para apagar los movimientos por criterio sin perder los de eventos. Se enciende primero en un tenant piloto.</li>
        <li>El agente <b>nunca</b> fija montos: el valor de la oportunidad sale del pedido.</li>
        <li>Se mide: cuántos movimientos hizo la IA y cuántos se deshicieron. Si se deshace más del 30 %, es una alerta.</li>
      </ul>

      <h2>La cadencia por etapa</h2>
      <p>Hoy el seguimiento del agente tiene una política global (8 intentos, 72 horas, espera de 48 horas). Pasa a ser <b>por etapa</b> y con exactamente cinco campos, los que el modelo guarda: <b>intentos</b>, <b>espera</b> entre intentos (horas o días), <b>canal</b> (mensaje · llamada · llamada y luego mensaje), <b>tiempo máximo</b> en la etapa (días) y <b>qué hacer al agotarse</b> (marcar perdida · dejar enfriar · pasar a una persona). Los recordatorios de una cita (24 h y 2 h antes) no son cadencia: los manda Agenda. La cadencia de la etapa gobierna los seguimientos que el agente programa: cuando se agota, deja de insistir y lo dice.</p>
      {cadences}

      <h2>La ficha del contacto cuenta todo</h2>
      <ul>
        <li><b>Recorrido</b> arriba: etapa actual, días en la etapa frente al máximo, quién la movió y por qué, cadencia en curso («intento 1 de 4 · próximo el 25 sep 10:00»), con Deshacer y Pausar cadencia al pasar el ratón o al enfocar con el teclado.</li>
        <li><b>Historial</b> con las entradas nuevas: cambios de etapa (con actor y razón) y cambios de ciclo de vida (prospecto → lead → cliente), que hoy no se guardan en ninguna parte.</li>
        <li>Lo que ya existe se queda: mensajes, pedidos, citas, llamadas, notas, datos capturados.</li>
      </ul>

      <h2>Un hueco que se cierra de paso</h2>
      <div class="callout">Hoy <b>una cita cumplida no cuenta para nada</b>: no sube el puntaje, no convierte al contacto en cliente y no mueve la oportunidad. Los negocios de servicios nunca llegan a «cliente». Emitir ese hecho es lo primero que se construye.</div>
    </article>"""


def doc_brand() -> str:
    voice = f"""<div class="voice">
      <div><div class="h yes">{ic("check", size=14)}Así sí</div><p>«Para llegar faltan $ 11,1 M: 3 ventas al día en los 6 días que quedan.»</p><p>«Vas al ritmo. Mantén 2 ventas al día y llegas.»</p><p>«Meta puesta. Empezamos a medir el camino.»</p><p>«Estamos aprendiendo tu ritmo. En 2 días tendrás proyección.»</p></div>
      <div><div class="h no">{ic("x", size=14)}Así no</div><p>«Vas −37 % respecto al objetivo.»</p><p>«¡Felicitaciones! ¡Estás rompiendo récords! 🚀»</p><p>«Objetivo configurado exitosamente.»</p><p>«Datos insuficientes para el cálculo.»</p></div>
    </div>"""
    return f"""<article class="doc">
      <span class="eyebrow">Marca · borrador para discutir</span>
      <h1>axi vende progreso</h1>
      <p class="lead">El iPhone vende prestigio. Nosotros vendemos progreso: las ganas de echar pa' lante nos unen, y la marca lo dice con profesionalismo, sin informalidad.</p>

      <h2>Posicionamiento (borrador de la sección nueva del manual)</h2>
      <div class="quote">axi es para el negocio que quiere avanzar y no se conforma con atender. No vendemos software ni «inteligencia artificial»: vendemos el progreso que se ve en los números de cada mes, y el camino para llegar.</div>
      <div class="dd">
        <div><b>Qué vendemos</b><span>Progreso: metas que se persiguen, camino recorrido y camino que falta. No prestigio, no tecnología, no «atención al cliente».</span></div>
        <div><b>A quién</b><span>Al dueño o gerente que ya vende por chat y quiere crecer con método. El que mira el número todos los días.</span></div>
        <div><b>Cómo lo decimos</b><span>Cercano-profesional, tuteo, español de Colombia. Frases cortas. Siempre cifra + camino + siguiente paso. Nunca regaño, nunca vanidad.</span></div>
        <div><b>Qué no somos</b><span>Ni el bot barato ni el software corporativo. Ni «solución integral» ni «¡vamos con toda!».</span></div>
        <div><b>La prueba</b><span>Honestidad estructural: cada cifra dice de dónde sale (tu historia, lo dijiste tú, supuesto para tu tipo de negocio). Lo que la IA no cerró, no se lo atribuye.</span></div>
      </div>

      <h2>Qué cambia en los documentos</h2>
      <ul>
        <li><b>Manual de marca</b> (knowledge-base, se restaura del archivo): nueva sección «Posicionamiento: progreso» antes de la esencia; §1 deja de definir axi como «atención al cliente omnicanal»; §16 pone la meta como eje del producto; §11 gana el plano «La ruta comercial».</li>
        <li><b>Estrategia de mensaje de la landing</b> (landing-copy, se restaura): el eje «progreso» como marco del titular y una regla dura nueva: «los números se persiguen, no se esperan: cada cifra viene con su camino». La landing en sí se reescribe en una fase posterior.</li>
        <li><b>DESIGN.md</b>: cuarta idea de la esencia, <b>Progreso</b> — el producto muestra siempre camino recorrido y camino que falta; y las reglas de voz de abajo en §7.</li>
        <li><b>README del cliente</b>: se retira el eslogan heredado «El futuro del servicio al cliente» y la visión «CRM + marketplace».</li>
      </ul>

      <h2>Reglas de voz (para §7 y para el módulo)</h2>
      <ol>
        <li>La meta se <b>persigue</b>. «Faltan», «llegas», «recorrido», «camino». Nunca «déficit», «incumplimiento», «por debajo del objetivo».</li>
        <li><b>Cifra + camino + siguiente paso</b>, siempre juntos. Una cifra sola es un regaño o una vanidad.</li>
        <li>Nada de porcentajes negativos. «27 de 43 · faltan 16», no «−37 %».</li>
        <li>Cada cifra con su procedencia: «según tu historia», «lo dijiste tú», «supuesto para tu tipo de negocio». Es honestidad de marca, no un tecnicismo.</li>
        <li>Celebrar con sobriedad: «Meta cumplida con 4 días de sobra. Lo que venga ahora es camino extra.» Sin emojis en la herramienta de trabajo.</li>
        <li>Cuando no sabemos, lo decimos con calma: «Estamos aprendiendo tu ritmo».</li>
        <li>Axi propone en voz baja y en violeta; el dueño decide. «Axi propone», no «Recomendación del sistema». El violeta solo vive ahí: el resto de la ruta es coral y neutros.</li>
        <li>La marca en prosa va en minúscula («axi traza la ruta»); en mayúscula solo al abrir frase o como sujeto de una acción («Axi propone»). Los millones siempre con un decimal: «$ 11,1 M», «$ 3,7 M».</li>
      </ol>
      {voice}

      <h2>Dónde se ve en el módulo</h2>
      <ul>
        <li>Título: <b>Tu ruta de septiembre</b>. Ítem del menú: <b>Comercial</b>.</li>
        <li>Sin meta: «Ponle una meta a septiembre» · «Dinos cuánto quieres vender y te trazamos el camino».</li>
        <li>Sin acciones: «Estás al día. Cuando algo pueda acelerar la ruta, aquí lo verás.»</li>
        <li>Botones: Definir la meta · Guardar meta · Aprobar · Rechazar · Ver qué quedó · Deshacer · Pausar cadencia · Ver la ruta →</li>
        <li>Motivos de rechazo escritos como los diría el dueño: «Prefiero que mi equipo los contacte uno por uno» · «Es pronto para volver a escribirles» · «No quiero mover precio este mes» · «Otro motivo…».</li>
        <li>Tras aprobar: «Listo. 36 contactos entran en seguimiento mañana a las 9:00.» y, si aplica, «2 quedaron fuera: pidieron no recibir mensajes.»</li>
      </ul>
    </article>"""


def doc_decisions() -> str:
    dec_t = T([
        ["D1", "Documentos de marca", "Restaurar knowledge-base y landing-copy del archivo; ampliar DESIGN.md."],
        ["D2", "Alcance del tono", "Documentos + microcopy del módulo nuevo. La landing y el resto del panel, después."],
        ["D3", "La meta", "Mensual, del negocio, en pesos; se desglosa por semana y día. Sin metas por vendedor."],
        ["D4", "Autonomía", "Axi propone acciones ejecutables; el dueño aprueba. Nada sale solo."],
        ["D5", "Dónde vive", "Módulo «Comercial» con ítem propio (/comercial). Las tasas vivas en Analítica. El recorrido en CRM › Configuración."],
        ["D6", "Recorrido vivo", "Avance automático total: por eventos y por criterio del agente, con rastro, aviso y deshacer."],
        ["D7", "Arranque sin historia", "Alba pregunta ventas del mes pasado, ticket y meta; supuestos por tipo de negocio hasta que la historia los reemplace."],
        ["D8", "OKR", "Derivados de la meta. Sin editor."],
        ["D9", "Orden", "Primero este documento y el mockup; el backend no arranca hasta aprobarlos."],
    ], ["", "Decisión", "Qué quedó"])
    mine = T([
        ["Capacidad del plan", "Se reutiliza la del CRM (todo plan con CRM tiene Comercial). Vender Comercial aparte es un cambio pequeño después.", "¿De acuerdo, o Comercial es un módulo de pago propio desde el día uno?"],
        ["Rollup propio", "Los resultados diarios se guardan aparte del embudo de Analítica: cuentan por fecha del hecho e incluyen llamadas y avances de etapa.", "—"],
        ["Ganado y Perdido", "Siguen siendo el estado de la oportunidad, no etapas del recorrido.", "—"],
        ["Ticket promedio", "Jamás se supone. Sin ticket, el plan queda «incompleto» y se pide.", "—"],
        ["Propuestas", "Van a la misma bandeja «Por decidir» de Axel, con su origen «comercial». Una pendiente por semana y meta; aprobar y cambiar la meta piden permiso de administrador.", "—"],
        ["Redondeo", "Cada paso de la cascada y el reparto por día redondean hacia arriba.", "—"],
    ], ["Tema", "Lo que decidí", "Pregunta"])
    phases = T([
        ["F0", "Este documento + mockup", "Visual y método aprobados"],
        ["F1", "Marca: restaurar y aplicar los textos", "Lectura del dueño"],
        ["F2", "Spike del motor: fórmulas puras + vista previa con la historia real de Savage o EasyPos", "Cifras plausibles"],
        ["F3", "Meta, plan y ritmo (servidor y /comercial)", "Visual contra el mockup"],
        ["F4", "Recorrido vivo en el CRM: tipos, cadencia, reglas, historial, deshacer, settings y contacto 360", "Recorrido real de un contacto"],
        ["F5", "El agente conoce la etapa y puede moverla (piloto en un tenant)", "Prueba real con una conversación"],
        ["F6", "Acciones propuestas y aprobación", "Aprobar crea el lote real"],
        ["F7", "Axel lee la meta · Alba la pregunta · Analítica muestra las tasas vivas", "Visual rápido"],
        ["F8", "Cierre: tiempo real, accesibilidad, documentación", "Verja completa y auditoría"],
    ], ["Fase", "Qué entrega", "Cómo se aprueba"])
    return f"""<article class="doc">
      <span class="eyebrow">Decisiones y preguntas abiertas</span>
      <h1>Lo que ya decidimos y lo que falta decidir</h1>
      <h2>Decisiones del dueño (23 sep 2026)</h2>
      {dec_t}
      <h2>Decisiones mías, para confirmar</h2>
      {mine}
      <h2>Preguntas abiertas para esta conversación</h2>
      <ol>
        <li><b>El nombre y el icono.</b> «Comercial» en el menú y «Tu ruta de septiembre» como título de la página. ¿Convence «ruta» como metáfora visible, o prefieres «meta» / «plan» en el título?</li>
        <li><b>Los umbrales del ritmo.</b> Adelantado &gt; 110 %, al ritmo 90–110, ritmo bajo &lt; 90, atrasado &lt; 80. ¿Te suenan, o quieres que el negocio los ajuste?</li>
        <li><b>Los supuestos por tipo de negocio.</b> La tabla del Método es hipótesis. ¿Los revisas tú, los validamos con los pilotos, o arrancamos así y dejamos que la historia los corrija?</li>
        <li><b>Quién recibe los avisos</b> de «ritmo bajo» y de «el agente movió una etapa»: ¿solo el dueño, o también los operadores con permiso de CRM?</li>
        <li><b>La tanda de Alba «Tu meta del mes».</b> ¿Se vuelve a ofrecer cada mes desde el panel («¿cuál es la meta de octubre?») o solo la primera vez y luego el editor?</li>
        <li><b>Festivos.</b> No van en la primera versión. ¿Aceptable, o el calendario colombiano entra desde F3?</li>
        <li><b>La meta en unidades.</b> El mix se sugiere desde la historia. ¿Alguna vez el dueño querrá fijar «vender 20 de este producto» como meta?</li>
        <li><b>El piloto de F5</b> (el agente mueve etapas por criterio): ¿en qué tenant se enciende primero?</li>
      </ol>
      <h2>Las fases</h2>
      {phases}
      <p class="muted small">Plan completo: <span class="mono">axi-server/docs/plans/commercial_method_plan.md</span> · mockup: <span class="mono">axi-client/docs/design/mockups/commercial-route.html</span></p>
    </article>"""


# ----------------------------------------------------------------------------- salida
def shell(body: str) -> str:
    """Cada vista va dentro de `.shell` (container-type:inline-size) para que las @container del kit apliquen (M3)."""
    return f'<div class="shell">{body}</div>'


VIEWS = [(k, label, shell(body), note) for k, label, body, note in [
    ("metodo", "Método", doc_method(), "El método comercial explicado: el Waze en cinco pasos, un ejemplo con números (techo en cada paso), procedencia de cada cifra, ventanas y muestras, el ritmo, los OKR derivados, las acciones y los supuestos por tipo de negocio."),
    ("recorrido", "Recorrido", doc_journey(), "Qué hay detrás del recorrido del cliente: tipos de etapa, qué la mueve sola, el criterio del agente con sus salvaguardas, la cadencia por etapa (cinco campos) y las plantillas por tipo de negocio."),
    ("marca", "Marca", doc_brand(), "Borrador del posicionamiento «axi vende progreso», qué cambia en cada documento y las reglas de voz que el módulo estrena."),
    ("decisiones", "Decisiones", doc_decisions(), "Las nueve decisiones del dueño, las mías para confirmar, las preguntas abiertas y las fases."),
    ("sin-meta", "1 · Sin meta", view_no_goal(), "/comercial sin meta: un glifo, una frase y un botón. Debajo, una sola línea con la semilla: con historia propone una cifra alcanzable; sin historia, lo típico del tipo de negocio."),
    ("definir-meta", "2 · Definir meta", view_goal_editor(), "/comercial/meta: un solo número con consecuencias. Atajos, la lista viva «Lo que implica» (cada fila con su cuenta y su procedencia) y los supuestos ajustables plegados."),
    ("al-ritmo", "3 · Al ritmo", view_route("ok"), "La ruta del mes cuando todo va bien: una cifra, una línea, una frase. El marcador relleno (hoy real) coincide con el hueco (donde deberías ir). Faltan 10 ventas en 6 días = 1,7 → «Mantén 2 ventas al día». Sin acciones: «Estás al día»."),
    ("atrasado", "4 · Ritmo bajo", view_route("behind"), "Ritmo bajo: el marcador real queda detrás del hueco, la prolongación punteada muestra a dónde llegas si sigues así, y «Axi propone» trae UNA acción pendiente (vence el sábado; el ámbar es semántico y en oscuro usa el mismo token --axi-warning) más la aprobada la semana pasada."),
    ("adelantado", "5 · Adelantado", view_route("ahead"), "Adelantado: la proyección pasa la bandera. El plan no propone nada: «Estás al día»."),
    ("aprendiendo", "6 · Aprendiendo", view_learning(), "Meta puesta ayer: 1 día hábil de datos, sin marcador de «hoy» ni proyección, badge neutro, aviso de cuándo habrá proyección; las cifras dicen «supuesto para tu tipo de negocio»."),
    ("kr-detalle", "7 · Detalle de un resultado", view_kr_sheet(), "Hoja lateral de «Ventas cerradas» sobre la vista de ritmo bajo: la única gráfica del módulo (real vs esperado, el esperado en gris punteado), «El camino» con cada cuenta, «De dónde sale» (con Corregir al pasar el ratón o enfocar) y el mix sugerido. La hoja re-renderiza la vista de fondo: es un mockup."),
    ("accion", "8 · Acción propuesta", view_action_sheet(), "Hoja lateral de una acción: por qué ahora (con procedencia y la cuenta de la estimación), qué va a pasar exactamente si apruebas (quién, a quién, cuándo, canal, costo) y el par Aprobar / Rechazar."),
    ("recorrido-settings", "9 · Recorrido (CRM)", view_journey_settings(), "CRM › Configuración › Recorrido: plantilla por tipo de negocio (los once del alta), explicador, y la lista de etapas con tipo semántico y cadencia de cinco campos; una etapa expandida y lo que la mueve sola."),
    ("contacto-360", "10 · Contacto 360", view_contact_360(), "La ficha del contacto con la tarjeta «Recorrido» (etapa movida hoy, máximo y vencimiento, quién la movió y por qué, cadencia en curso; Deshacer y Pausar cadencia al pasar el ratón o enfocar) y el historial con las entradas nuevas de etapa y ciclo de vida."),
    ("analytics", "11 · Analítica", view_analytics(), "Analítica › Conversión: debajo del embudo existente, dos listas nuevas: las tasas vivas (llamadas → contestadas → citas → asistió → ventas, cada una con su divisor; valor por cita y por visita) y el recorrido del pipeline por tipo de etapa."),
    ("dashboard", "12 · Panel", view_dashboard(), "El bloque «Tu meta de septiembre» del Panel, con y sin meta. Una franja, la ruta compacta, la procedencia y el enlace a la ruta."),
    ("bloqueado", "13 · Bloqueado", view_blocked(), "Un negocio sin la capacidad: estado vacío sólido con salida a planes, sin códigos de error en la UI. Decisión abierta sobre si Comercial se vende aparte."),
    ("accion-rechazar", "14 · Acción: rechazar", view_action_reject(), "La misma hoja con el desplegable de motivos abierto sobre «Rechazar»: cuatro motivos escritos como los diría el dueño; el motivo se guarda y axi no vuelve a proponerlo esta semana."),
    ("accion-resultado", "15 · Acción: resultado", view_action_result(), "La hoja tras aprobar, con el resultado parcial: 36 entran en seguimiento mañana a las 9:00, 2 quedaron fuera por pedir no recibir mensajes; salida a Tareas."),
    ("meta-mitad", "16 · Meta a mitad de mes", view_goal_editor(mid_month=True), "El editor cuando ya hay meta y recorrido: aviso con lo que llevas y cómo se recalcula la ruta desde hoy; lo recorrido se conserva."),
    ("sin-permiso", "17 · Sin permiso de aprobar", view_route("behind", can_approve=False), "La vista de ritmo bajo para un operador sin permiso: sin «Aprobar» ni «Cambiar meta», solo «Ver», y una línea que dice a quién pedirlo."),
]]


def write_artifact(path: pathlib.Path) -> None:
    """Variante para publicar como Artifact: sin <html>/<head>/<body>; título + estilos + contenido."""
    full = (pathlib.Path(__file__).resolve().parent / "commercial-route.html").read_text()
    title = re.search(r"<title>(.*?)</title>", full, re.S).group(1)
    link = re.search(r'(<link rel="stylesheet"[^>]*>)', full)
    style = re.search(r"<style>(.*?)</style>", full, re.S).group(1)
    body = re.search(r"<body>(.*?)</body>", full, re.S).group(1)
    doc = f"<title>{title}</title>\n{link.group(1) if link else ''}\n<style>{style}\n.mk-bar{{top:env(safe-area-inset-top, 0px)}}\n</style>\n{body}"
    path.write_text(doc)
    print(f"artifact: {path} ({path.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    # El kit no acepta CSS extra por parámetro (`build_html` lee el BASE_CSS del módulo), así que se
    # inyecta aquí; se deja el monkeypatch a propósito para no tocar el kit compartido (M29).
    import _axi_mockup_kit as kit  # noqa: E402

    kit.BASE_CSS = kit.BASE_CSS + EXTRA_CSS
    K.build_html("La ruta comercial", "Mockup F0 · no es producto", "Comercial · el método, el recorrido, la marca y diecisiete pantallas",
                 VIEWS)
    if "--artifact" in sys.argv:
        write_artifact(pathlib.Path(sys.argv[sys.argv.index("--artifact") + 1]))
