#!/usr/bin/env python3
"""Mockup «La ruta comercial» (commercial_method_plan.md · F0).

Un solo HTML para discutir el método ANTES de tocar el backend: cuatro vistas de documento (Método,
Recorrido, Marca, Decisiones) y trece vistas de producto (/comercial en sus estados, el detalle de
un resultado clave y de una acción, /crm/settings/recorrido, el contacto 360, Analítica, el bloque
del Panel y el estado bloqueado). Misma convención que los demás mockups: kit compartido, tokens
literales de `globals.css`, iconos `__iconNode` de lucide-react, tema claro/oscuro con el botón.

Uso:  python3 commercial-route.build.py [--artifact <ruta>]
      --artifact escribe además una variante sin <html>/<head>/<body> para publicarla como Artifact.
"""
import html as _html
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from _axi_mockup_kit import Kit  # noqa: E402

K = Kit("commercial-route")
ic, btn, badge = K.ic, K.btn, K.badge

# ----------------------------------------------------------------------------- CSS propio del mockup
EXTRA_CSS = r"""
/* ---- documento (vistas Método / Recorrido / Marca / Decisiones) */
.doc{max-width:76ch;margin:0 auto;padding:32px 24px 96px;display:flex;flex-direction:column;gap:20px;font-size:15px;line-height:1.62}
.doc .eyebrow{font-size:11.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--axi-brand);font-weight:600}
.doc h1{font-size:36px;line-height:1.1}
.doc h2{font-size:22px;margin-top:22px;padding-top:22px;border-top:1px solid var(--border-soft)}
.doc h3{font-size:16px;font-family:var(--font-body);font-weight:600;letter-spacing:0;margin-top:6px}
.doc .lead{font-size:17px;color:var(--muted-foreground);max-width:60ch}
.doc p{max-width:68ch}
.doc ul,.doc ol{margin:0;padding-left:22px;display:flex;flex-direction:column;gap:6px}
.doc li{max-width:66ch}
.doc .formula{font-family:var(--font-mono);font-size:12.5px;line-height:1.7;background:var(--secondary);padding:14px 16px;border-radius:12px;overflow-x:auto;white-space:pre}
.doc .steps{display:flex;flex-direction:column;gap:14px}
.doc .step{display:grid;grid-template-columns:40px minmax(0,1fr);gap:14px;align-items:start}
.doc .step .n{width:40px;height:40px;border-radius:12px;background:var(--secondary);display:grid;place-items:center;font-family:var(--font-heading);font-size:17px;color:var(--axi-brand)}
.doc .step b{display:block;font-weight:600;margin-bottom:2px}
.doc .callout{border:1px solid var(--border);border-radius:16px;padding:14px 18px;background:var(--secondary);font-size:14px}
.doc .callout b{font-weight:600}
.doc .quote{border-left:2px solid var(--axi-brand);padding:2px 0 2px 16px;font-size:17px;font-family:var(--font-heading);line-height:1.4}
.doc table{font-size:13.5px}
.doc th{white-space:normal}
.doc td small{display:block;color:var(--muted-foreground);font-size:12px}
.doc .two{display:grid;grid-template-columns:1fr 1fr;gap:16px}
@container (max-width: 640px){.doc .two{grid-template-columns:1fr}}
.doc .dd{display:grid;grid-template-columns:minmax(0,1fr);gap:0;border:1px solid var(--border);border-radius:14px;overflow:hidden}
.doc .dd div{display:grid;grid-template-columns:150px minmax(0,1fr);gap:12px;padding:10px 14px;border-top:1px solid var(--border-soft);font-size:14px}
.doc .dd div:first-child{border-top:0}
.doc .dd b{font-weight:500;color:var(--muted-foreground);font-size:13px}
@container (max-width: 600px){.doc .dd div{grid-template-columns:1fr}}
.doc .src{display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--muted-foreground)}
.doc .yes{color:var(--axi-success)} .doc .no{color:var(--axi-destructive)}
.doc .voice{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.doc .voice > div{border:1px solid var(--border);border-radius:14px;padding:12px 14px;font-size:13.5px}
.doc .voice .h{font-size:11.5px;letter-spacing:.08em;text-transform:uppercase;font-weight:600;margin-bottom:6px}
@container (max-width: 640px){.doc .voice{grid-template-columns:1fr}}

/* ---- /comercial */
.cr{max-width:1000px}
.hero{border:1px solid var(--border);border-radius:var(--radius-xl);padding:24px 28px 20px;display:flex;flex-direction:column;gap:16px;background:var(--background)}
.hero .big{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}
.hero .big b{font-family:var(--font-heading);font-size:46px;line-height:1;letter-spacing:-.025em;font-weight:700;font-variant-numeric:tabular-nums}
.hero .big span{color:var(--muted-foreground);font-size:15px}
.hero .line{display:flex;gap:10px;align-items:center;flex-wrap:wrap;font-size:14.5px;line-height:1.45}
.route{width:100%;height:auto;display:block;overflow:visible}
.route .track{stroke:var(--secondary);stroke-width:8;stroke-linecap:round;fill:none}
.route .done{stroke:url(#gradRoute);stroke-width:8;stroke-linecap:round;fill:none}
.route .proj{stroke:var(--muted-foreground);stroke-width:2;stroke-dasharray:3 6;stroke-linecap:round;fill:none}
.route .now{fill:var(--axi-brand);stroke:var(--background);stroke-width:3}
.route .exp{fill:var(--background);stroke:var(--foreground);stroke-width:2}
.route .tick{stroke:var(--border);stroke-width:1}
.route text{font-family:var(--font-body);font-size:10.5px;fill:var(--muted-foreground)}
.route text.lbl{font-size:11px;fill:var(--foreground);font-weight:500}
.route .flag{fill:var(--foreground)}
.pace{border-left:2px solid var(--axi-brand);padding:2px 0 2px 14px;display:flex;flex-direction:column;gap:2px;width:fit-content;text-decoration:none;color:inherit}
.pace:hover .nums .ic{color:var(--foreground)}
.pace .ey{font-size:11.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted-foreground);font-weight:600}
.pace .nums{font-size:15px;display:flex;gap:6px;align-items:center;flex-wrap:wrap} .pace .nums b{font-weight:600;font-variant-numeric:tabular-nums}
.pace .nums .ic{color:var(--muted-foreground);margin-left:4px}

/* ficha = lista (grouped-list) */
.gl{border:1px solid var(--border);border-radius:var(--radius-lg);background:var(--background);box-shadow:var(--shadow-float);overflow:hidden}
.gl-h{padding:14px 18px 4px;font-size:11.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted-foreground);font-weight:600;display:flex;align-items:center;gap:8px;justify-content:space-between}
.gl-h .ic{color:var(--axi-violet)}
.gr{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:1px 16px;padding:12px 18px;align-items:center;position:relative}
.gr+.gr::before{content:"";position:absolute;left:18px;right:18px;top:0;border-top:1px solid var(--border-soft)}
.gr .k{font-size:12px;color:var(--muted-foreground);grid-column:1}
.gr .v{font-size:15px;font-weight:500;display:flex;gap:10px;align-items:center;flex-wrap:wrap;grid-column:1;font-variant-numeric:tabular-nums}
.gr .s{font-size:12.5px;color:var(--muted-foreground);grid-column:1;display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.gr .r{grid-column:2;grid-row:1 / span 3;display:flex;align-items:center;gap:12px}
.gr .go{opacity:0;color:var(--muted-foreground);transition:opacity .15s var(--ease)} .gr:hover .go{opacity:1}
.gr .hov{opacity:0;transition:opacity .15s var(--ease)} .gr:hover .hov{opacity:1}
.gr.link:hover{background:color-mix(in srgb, var(--foreground) 3%, transparent);cursor:pointer}
.rule{width:96px;height:4px;border-radius:999px;background:var(--secondary);overflow:hidden;flex:none}
.rule i{display:block;height:100%;background:var(--axi-brand);border-radius:999px}
.rule.soft i{background:var(--muted-foreground);opacity:.5}
.src{display:inline-flex;align-items:center;gap:5px;color:var(--muted-foreground)}
.src .ic{color:var(--muted-foreground)}
.ar .t{font-size:15px;font-weight:500}
.ar .hl{color:var(--axi-violet);font-weight:500;font-size:13.5px;font-variant-numeric:tabular-nums}
.ar.settled{opacity:.62}
.ar .exp{font-size:12px;color:var(--muted-foreground)} .ar .exp.soon{color:var(--axi-warning)}

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
.sheet{width:min(580px,100%);min-height:100%;background:color-mix(in srgb, var(--background) 90%, transparent);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-left:1px solid var(--border);box-shadow:var(--shadow-overlay);display:flex;flex-direction:column}
.sheet-h{padding:20px 24px 14px;display:flex;flex-direction:column;gap:6px;border-bottom:1px solid var(--border-soft)}
.sheet-h .ey{font-size:11.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted-foreground);font-weight:600}
.sheet-h h2{font-size:20px;font-family:var(--font-body);font-weight:600;letter-spacing:-.01em;display:flex;justify-content:space-between;gap:12px;align-items:center}
.sheet-h .big{font-family:var(--font-heading);font-size:30px;letter-spacing:-.02em;font-variant-numeric:tabular-nums;display:flex;gap:10px;align-items:center}
.sheet-b{padding:18px 24px;display:flex;flex-direction:column;gap:16px}
.sheet-f{margin-top:auto;padding:14px 24px;border-top:1px solid var(--border-soft);display:flex;gap:8px;justify-content:space-between;align-items:center;flex-wrap:wrap;font-size:12.5px;color:var(--muted-foreground)}
.sheet-f .acts{display:flex;gap:8px;margin-left:auto}
.trend{width:100%;height:auto;display:block}
.trend .grid{stroke:var(--border-soft);stroke-width:1}
.trend .exp{stroke:var(--axi-violet);stroke-width:2;fill:none;stroke-dasharray:4 5}
.trend .act{stroke:var(--axi-brand);stroke-width:2.5;fill:none;stroke-linecap:round;stroke-linejoin:round}
.trend .fill{fill:var(--axi-brand);opacity:.08}
.trend text{font-family:var(--font-body);font-size:10.5px;fill:var(--muted-foreground)}
.trend .end{fill:var(--axi-brand);stroke:var(--background);stroke-width:2}
.legend{display:flex;gap:16px;font-size:12px;color:var(--muted-foreground)}
.legend i{display:inline-block;width:14px;height:0;border-top:2px solid var(--axi-brand);vertical-align:middle;margin-right:6px}
.legend i.exp{border-top:2px dashed var(--axi-violet)}

/* recorrido (settings) */
.kind{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 10px;border-radius:8px;border:1px solid var(--input);font-size:13px;font-weight:500;background:var(--background)}
.kind .ic{color:var(--muted-foreground)}
.cad{display:grid;grid-template-columns:1fr 1fr;gap:10px 20px;padding:4px 0 6px}
.cad .f{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;font-size:13.5px;padding:8px 0;border-bottom:1px solid var(--border-soft)}
.cad .f .k{color:var(--muted-foreground)}
.cad .f .input,.cad .f .select{width:auto;min-width:120px;min-height:32px;font-size:13.5px}
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
.tli .when{font-size:12px;color:var(--muted-foreground);white-space:nowrap;display:flex;flex-direction:column;align-items:flex-end;gap:4px}
.tli .act{opacity:0;transition:opacity .15s var(--ease)} .tli:hover .act{opacity:1}
.person{display:flex;gap:14px;align-items:center}
.person .av{width:48px;height:48px;border-radius:50%;background:var(--secondary);display:grid;place-items:center;font-weight:600;font-size:16px}
.person h1{font-size:24px;font-family:var(--font-body);font-weight:600}
.person .sub{font-size:13px;color:var(--muted-foreground);display:flex;gap:8px;align-items:center;flex-wrap:wrap}

/* analítica */
.fun{display:flex;flex-direction:column;gap:8px}
.fun .row{display:grid;grid-template-columns:150px minmax(0,1fr) 70px;gap:12px;align-items:center;font-size:13px}
.fun .bar{height:22px;border-radius:6px;background:var(--secondary);overflow:hidden}
.fun .bar i{display:block;height:100%;background:var(--muted-foreground);opacity:.45;border-radius:6px}
.fun .bar.star i{background:var(--axi-brand);opacity:1}
.fun .n{text-align:right;font-variant-numeric:tabular-nums;font-weight:500}
.kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
@container (max-width: 760px){.kpis{grid-template-columns:1fr 1fr}}
.kpi{border:1px solid var(--border);border-radius:var(--radius-lg);padding:14px 16px}
.kpi .k{font-size:12px;color:var(--muted-foreground)} .kpi .v{font-family:var(--font-heading);font-size:26px;letter-spacing:-.02em;font-variant-numeric:tabular-nums;margin-top:2px}
.kpi .d{font-size:12px;color:var(--muted-foreground);margin-top:2px}

/* panel */
.gpb{border:1px solid var(--border);border-radius:var(--radius-xl);padding:14px 20px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 24px;align-items:center;background:var(--background)}
.gpb .k{font-size:12px;color:var(--muted-foreground)}
.gpb .v{font-size:14.5px;display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}
.gpb .r{grid-column:2;grid-row:1 / span 2;text-align:right;font-size:13.5px}
.gpb .r a{font-weight:500;text-decoration:none;display:inline-flex;gap:4px;align-items:center}
.gpb .r .pct{font-family:var(--font-heading);font-size:22px;letter-spacing:-.02em;display:block;font-variant-numeric:tabular-nums}
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
.seed{font-size:13px;color:var(--muted-foreground);display:flex;gap:8px;align-items:center;justify-content:center;flex-wrap:wrap;margin-top:10px}
.seed .ic{color:var(--muted-foreground)}
@media (prefers-reduced-motion: reduce){.goal-in .caret{animation:none}}
"""


# ----------------------------------------------------------------------------- helpers
def cop(n: int) -> str:
    """$ 18.940.000"""
    return "$ " + f"{n:,}".replace(",", ".")


def copm(n: int) -> str:
    """$ 18,9 M"""
    m = n / 1_000_000
    s = f"{m:.1f}".replace(".", ",")
    if s.endswith(",0"):
        s = s[:-2]
    return f"$ {s} M"


def src(kind: str, niche: str = "clínicas estéticas") -> str:
    lbl = {"history": ("según tu historia", "history"), "declared": ("lo dijiste tú", "user-round"),
           "benchmark": (f"supuesto para {niche}", "flask-conical")}[kind]
    return f'<span class="src">{ic(lbl[1], size=12)}{lbl[0]}</span>'


def gl(title: str, rows: str, icon: str = "", right: str = "") -> str:
    h = f'<div class="gl-h"><span style="display:flex;gap:8px;align-items:center">{ic(icon, size=14) if icon else ""}{title}</span>{right}</div>' if title else ""
    return f'<section class="gl">{h}{rows}</section>'


def gr(k: str, v: str, s: str = "", right: str = "", link: bool = False, cls: str = "") -> str:
    r = f'<div class="r">{right}</div>' if right else ""
    ss = f'<div class="s">{s}</div>' if s else ""
    return f'<div class="gr {"link" if link else ""} {cls}"><div class="k">{k}</div><div class="v">{v}</div>{ss}{r}</div>'


def rule(pct: float, soft: bool = False) -> str:
    return f'<span class="rule {"soft" if soft else ""}" aria-hidden="true"><i style="width:{min(100, max(2, pct)):.0f}%"></i></span>'


def route(done: float, expected: float | None, proj: float | None, month_label: str = "sep", compact: bool = False,
          proj_label: str = "", flag: bool = True) -> str:
    """Línea de ruta. done/expected/proj en 0–1 (proj puede superar 1)."""
    x0, x1 = 24, 976
    W = x1 - x0
    h = 40 if compact else 72
    y = 16 if compact else 30
    xd = x0 + W * min(done, 1)
    parts = [
        '<defs><linearGradient id="gradRoute" x1="0" x2="1" y1="0" y2="0">'
        '<stop offset="0" style="stop-color:var(--axi-brand)"/><stop offset="1" style="stop-color:var(--axi-brand-2)"/></linearGradient></defs>',
        f'<line class="track" x1="{x0}" y1="{y}" x2="{x1}" y2="{y}"/>',
    ]
    if not compact:
        # semanas hábiles de septiembre 2026 (lun–sáb): S1 5 d · S2 6 · S3 6 · S4 6 · S5 3 = 26
        acc = 0
        for i, days in enumerate([5, 6, 6, 6, 3]):
            cx = x0 + W * (acc + days / 2) / 26
            parts.append(f'<text x="{cx:.0f}" y="{y + 30}" text-anchor="middle">S{i + 1}</text>')
            acc += days
            if i < 4:
                tx = x0 + W * acc / 26
                parts.append(f'<line class="tick" x1="{tx:.0f}" y1="{y + 12}" x2="{tx:.0f}" y2="{y + 18}"/>')
    if proj is not None and proj > done:
        xp = x0 + W * min(proj, 1.04)
        parts.append(f'<line class="proj" x1="{xd:.0f}" y1="{y}" x2="{xp:.0f}" y2="{y}"/>')
        if proj_label and not compact:
            # la etiqueta va a la derecha del final punteado; si no cabe antes de la bandera, a la izquierda
            if proj < 0.9:
                parts.append(f'<text class="lbl" x="{xp + 12:.0f}" y="{y + 4}" text-anchor="start">{proj_label}</text>')
            else:
                parts.append(f'<text class="lbl" x="{min(xp, x1) - 14:.0f}" y="{y - 14}" text-anchor="end">{proj_label}</text>')
    if done > 0:
        parts.append(f'<line class="done" x1="{x0}" y1="{y}" x2="{xd:.0f}" y2="{y}"/>')
    if flag:
        parts.append(f'<path class="flag" d="M{x1 - 1} {y - 22} v22 M{x1 - 1} {y - 22} h11 l-3 4 3 4 h-11" stroke="var(--foreground)" stroke-width="1.6" fill="none"/>')
    if expected is not None:
        xe = x0 + W * expected
        parts.append(f'<circle class="exp" cx="{xe:.0f}" cy="{y}" r="6"/>')
        if not compact:
            parts.append(f'<text x="{xe:.0f}" y="{y - 14}" text-anchor="middle">hoy</text>')
    if done > 0:
        parts.append(f'<circle class="now" cx="{xd:.0f}" cy="{y}" r="7"/>')
    label = f'Ruta del mes: {done * 100:.0f} % recorrido' + (f', {expected * 100:.0f} % esperado a hoy' if expected is not None else "") + (
        f', proyección {proj * 100:.0f} %' if proj else "")
    return f'<svg class="route" viewBox="0 0 1000 {h}" role="img" aria-label="{_html.escape(label)}">{"".join(parts)}</svg>'


def kr_row(label: str, cur, tgt, rate_now: str, rate_exp: str, source: str, pct: float, badge_html: str = "",
           extra: str = "", unit: str = "", link=True) -> str:
    v = f'{cur} <span class="muted" style="font-weight:400">de {tgt}{unit}</span>'
    s = f'Ritmo {rate_now} · esperado {rate_exp} · {src(source)}' if rate_now else src(source)
    if extra:
        s += f'<br>{extra}'
    right = f'{badge_html}{rule(pct)}<span class="go">{ic("chevron-right", size=16)}</span>'
    return gr(label, v, s, right, link=link)


def action_row(title: str, headline: str, why: str, expires: str, soon=False, settled=False, settled_note="") -> str:
    if settled:
        right = f'<span class="exp">{settled_note}</span>{btn("Ver qué quedó", "", "outline xs")}'
        return f'<div class="gr ar settled"><div class="k">{badge("Aprobada", "ok")}</div><div class="v t">{title}</div><div class="s">{why}</div><div class="r">{right}</div></div>'
    right = f'<span class="exp {"soon" if soon else ""}">{expires}</span>{btn("Ver", "", "ghost xs hov")}{btn("Aprobar", "", "xs")}'
    return f'<div class="gr ar link"><div class="v t">{title}</div><div class="s"><span class="hl">{headline}</span></div><div class="s">{why}</div><div class="r">{right}</div></div>'


def header(month="septiembre", set_by="la pusiste tú el 1 sep", target=30_000_000, change=True, sub=None) -> str:
    right = btn("Cambiar meta", "pencil", "outline sm") if change else ""
    lead = sub if sub is not None else f'Meta del mes: <b class="tnum" style="font-weight:500;color:var(--foreground)">{cop(target)}</b> · {set_by}'
    return f'<div class="header"><div><h1>Tu ruta de {month}</h1><p class="lead">{lead}</p></div><div class="right">{right}</div></div>'


# ----------------------------------------------------------------------------- escenarios (Clínica Dermalux · sep 2026 · 26 días hábiles lun–sáb · hoy 23 sep = día hábil 20)
TARGET = 30_000_000
EXP = 20 / 26  # 76,9 %
SCEN = {
    "behind": dict(actual=18_940_000, sales=27, proj=24_620_000, status=("Ritmo bajo", "warn"),
                   headline=f"Para llegar faltan <b>{copm(TARGET - 18_940_000)}</b>: 3 ventas al día en los 6 días hábiles que quedan."),
    "ok": dict(actual=23_410_000, sales=33, proj=30_430_000, status=("Al ritmo", "ok"),
               headline="Vas al ritmo. Mantén <b>2 ventas al día</b> y llegas."),
    "ahead": dict(actual=26_770_000, sales=38, proj=34_800_000, status=("Adelantado", "ok"),
                  headline=f"Vas <b>{copm(26_770_000 - int(TARGET * EXP))}</b> por delante. Si sigues así cierras en <b>{copm(34_800_000)}</b>."),
}


def hero(mode: str) -> str:
    s = SCEN[mode]
    done = s["actual"] / TARGET
    proj = s["proj"] / TARGET
    proj_lbl = f"cierre ≈ {copm(s['proj'])} · {proj * 100:.0f} %"
    return f"""<section class="hero" aria-label="La ruta del mes">
      <div class="big"><b>{copm(s["actual"])}</b><span>de {cop(TARGET)} · {done * 100:.0f} %</span></div>
      {route(done, EXP, proj, proj_label=proj_lbl)}
      <p class="line">{badge(s["status"][0], s["status"][1])}<span>{s["headline"]}</span></p>
    </section>"""


def pace_line(week_sales=6, week_exp=8, per_day="1,5") -> str:
    return f"""<a class="pace" href="#" aria-label="Ritmo de esta semana; abre el detalle de ventas">
      <span class="ey">Ritmo · esta semana</span>
      <span class="nums"><b>{week_sales}</b> ventas · esperadas <b>{week_exp}</b> · <b>{per_day}</b> al día {ic("chevron-right", size=15)}</span>
    </a>"""


def kr_list(mode: str, learning=False) -> str:
    if learning:
        rows = "".join([
            kr_row("Ventas cerradas", 2, 42, "", "", "declared", 5, extra='Aún sin historia para medir el ritmo.'),
            gr("Ticket promedio", cop(710_000), src("declared"), f'<span class="go">{ic("chevron-right", size=16)}</span>', link=True),
            kr_row("Cotizaciones enviadas", 5, 110, "", "", "benchmark", 5),
            kr_row("Citas agendadas", 4, 95, "", "", "benchmark", 4),
            kr_row("Contactados", 11, 210, "", "", "benchmark", 5),
            kr_row("Conversaciones nuevas", 36, 600, "", "", "benchmark", 6),
            kr_row("Llamadas contestadas", 6, 120, "", "", "benchmark", 5),
        ])
        return gl("Resultados clave", rows, right='<span class="muted" style="letter-spacing:0;text-transform:none;font-weight:400">Objetivo: vender $ 30.000.000 en septiembre</span>')
    if mode == "behind":
        rows = "".join([
            kr_row("Ventas cerradas", 27, 42, "1,35 al día", "1,6", "history", 64, badge("Ritmo bajo", "warn"),
                   extra='Mix sugerido: 45 % Limpieza facial · 30 % Toxina · 25 % Otros'),
            gr("Ticket promedio", f'{cop(701_000)} <span class="muted" style="font-weight:400">plan {cop(710_000)}</span>', src("history") + ' · últimos 90 días · 61 ventas', f'{rule(99)}<span class="go">{ic("chevron-right", size=16)}</span>', link=True),
            kr_row("Cotizaciones enviadas", 71, 110, "3,6 al día", "4,2", "history", 65, badge("Ritmo bajo", "warn")),
            kr_row("Citas agendadas", 61, 95, "3,1 al día", "3,7", "history", 64, badge("Ritmo bajo", "warn")),
            kr_row("Contactados", 152, 210, "7,6 al día", "8,1", "history", 72),
            kr_row("Conversaciones nuevas", 471, 600, "23,6 al día", "23,1", "history", 79),
            kr_row("Llamadas contestadas", 79, 120, "4,0 al día", "4,6", "benchmark", 66, badge("Ritmo bajo", "warn")),
        ])
    elif mode == "ok":
        rows = "".join([
            kr_row("Ventas cerradas", 33, 42, "1,65 al día", "1,6", "history", 79, extra='Mix sugerido: 45 % Limpieza facial · 30 % Toxina · 25 % Otros'),
            gr("Ticket promedio", f'{cop(709_000)} <span class="muted" style="font-weight:400">plan {cop(710_000)}</span>', src("history") + ' · últimos 90 días · 61 ventas', f'{rule(100)}<span class="go">{ic("chevron-right", size=16)}</span>', link=True),
            kr_row("Cotizaciones enviadas", 86, 110, "4,3 al día", "4,2", "history", 78),
            kr_row("Citas agendadas", 74, 95, "3,7 al día", "3,7", "history", 78),
            kr_row("Contactados", 166, 210, "8,3 al día", "8,1", "history", 79),
            kr_row("Conversaciones nuevas", 455, 600, "22,8 al día", "23,1", "history", 76),
            kr_row("Llamadas contestadas", 93, 120, "4,7 al día", "4,6", "benchmark", 78),
        ])
    else:
        rows = "".join([
            kr_row("Ventas cerradas", 38, 42, "1,9 al día", "1,6", "history", 90, badge("Adelantado", "ok"), extra='Mix sugerido: 45 % Limpieza facial · 30 % Toxina · 25 % Otros'),
            gr("Ticket promedio", f'{cop(704_000)} <span class="muted" style="font-weight:400">plan {cop(710_000)}</span>', src("history") + ' · últimos 90 días · 61 ventas', f'{rule(99)}<span class="go">{ic("chevron-right", size=16)}</span>', link=True),
            kr_row("Cotizaciones enviadas", 98, 110, "4,9 al día", "4,2", "history", 89, badge("Adelantado", "ok")),
            kr_row("Citas agendadas", 82, 95, "4,1 al día", "3,7", "history", 86),
            kr_row("Contactados", 171, 210, "8,6 al día", "8,1", "history", 81),
            kr_row("Conversaciones nuevas", 468, 600, "23,4 al día", "23,1", "history", 78),
            kr_row("Llamadas contestadas", 97, 120, "4,9 al día", "4,6", "benchmark", 81),
        ])
    return gl("Resultados clave", rows, right='<span class="muted" style="letter-spacing:0;text-transform:none;font-weight:400">Objetivo: vender $ 30.000.000 en septiembre</span>')


def actions(mode: str) -> str:
    if mode == "behind":
        rows = "".join([
            action_row("Reactivar 38 cotizaciones sin respuesta", "+6 ventas estimadas · cubre el 38 % de lo que falta",
                       "Cotizaron hace más de 5 días y nadie volvió a escribirles. El agente les escribe mañana a las 9:00 por WhatsApp.",
                       "vence en 2 días", soon=True),
            action_row("Confirmar por llamada las 14 citas de esta semana", "+3 ventas estimadas · cubre el 19 %",
                       "Sin confirmación, 1 de cada 4 no asiste. El agente llama hoy entre 3 y 6 p. m. y, si no contestan, escribe.",
                       "vence el sábado"),
            action_row("Secuencia «Volver a escribir a los de agosto»", "", "52 contactos inscritos · 3 respondieron · 1 cita agendada", "",
                       settled=True, settled_note="aprobada ayer"),
        ])
    elif mode == "ok":
        rows = gr("", '<span class="muted" style="font-weight:400">Estás al día. Cuando algo pueda acelerar la ruta, aquí lo verás.</span>')
    else:
        rows = "".join([
            action_row("Subir la meta de octubre a $ 33 M", "El ritmo de septiembre la sostiene",
                       "Cierras en $ 34,8 M con el ritmo actual. Una meta que ya alcanzaste deja de mover al equipo.", "vence el 30 sep"),
        ])
    return gl("Axi propone", rows, icon="sparkles")


def learning_hero() -> str:
    actual = 1_420_000
    return f"""<section class="hero" aria-label="La ruta del mes">
      <div class="big"><b>{copm(actual)}</b><span>de {cop(TARGET)} · {actual / TARGET * 100:.0f} %</span></div>
      {route(actual / TARGET, None, None)}
      <p class="line">{badge("Aprendiendo tu ritmo", "")}<span>Estamos aprendiendo tu ritmo. En 5 días tendrás proyección y acciones.</span></p>
    </section>"""


# ----------------------------------------------------------------------------- vistas de producto
def view_route(mode: str) -> str:
    return f"""<div class="page cr">
      {K.crumb("Comercial")}
      {header()}
      {hero(mode)}
      {pace_line(*{"behind": (6, 8, "1,5"), "ok": (8, 8, "2,0"), "ahead": (10, 8, "2,5")}[mode])}
      {kr_list(mode)}
      {actions(mode)}
    </div>"""


def view_learning() -> str:
    return f"""<div class="page cr">
      {K.crumb("Comercial")}
      {header(set_by="la pusiste tú el 21 sep")}
      {learning_hero()}
      {K.notice("info", "<b>Estamos aprendiendo tu ritmo.</b> Con 3 días hábiles de datos empezamos a proyectar; a los 30 días tus tasas reales reemplazan los supuestos por tipo de negocio.", icon="hourglass")}
      {kr_list("behind", learning=True)}
      {gl("Axi propone", gr("", '<span class="muted" style="font-weight:400">Cuando conozcamos tu ritmo, te proponemos acciones.</span>'), icon="sparkles")}
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
    b = f'{ic("flask-conical", size=14)} Aún no tenemos tu historia: te proponemos empezar con lo típico de una clínica estética.'
    return f"""<div class="page cr">
      {K.crumb("Comercial")}
      <div class="header"><div><h1>Tu ruta de septiembre</h1><p class="lead">Sin meta todavía.</p></div></div>
      {block(a, "Semilla con historia (tenant con ventas):")}
      {block(b, "Semilla sin historia (tenant nuevo):")}
    </div>"""


def view_goal_editor(mid_month=False) -> str:
    implies = "".join([
        gr("Ventas necesarias", "42", f'ticket {cop(710_000)} · {src("history")} · 61 ventas en 90 días'),
        gr("Cotizaciones", "≈ 110", f'38 % de las cotizaciones se venden · {src("history")}'),
        gr("Citas agendadas", "≈ 95", f'44 % de las citas terminan en venta · {src("history")}'),
        gr("Contactados", "≈ 210", f'52 % de los contactados cotizan · {src("history")}'),
        gr("Conversaciones nuevas", "≈ 600", f'35 % de los que escriben se dejan contactar · {src("history")}'),
        gr("Llamadas", "≈ 120", f'62 % contestan · 3 de cada 10 contactos van por llamada · {src("benchmark")}'),
    ])
    sup = f"""<details class="sup"><summary>Ajustar supuestos {ic("chevron-down", size=16)}</summary>
      <div class="cad" style="padding:6px 18px 12px">
        <div class="f"><span class="k">Ticket promedio</span>{K.input("710.000", cls="adorn", icon="badge-dollar-sign")}</div>
        <div class="f"><span class="k">Cotización → venta</span>{K.input("38 %")}</div>
        <div class="f"><span class="k">Cita → venta</span>{K.input("44 %")}</div>
        <div class="f"><span class="k">Contactado → cotiza</span>{K.input("52 %")}</div>
        <div class="f"><span class="k">Llamadas contestadas</span>{K.input("62 %", cls="")}</div>
        <div class="f"><span class="k">Contactos por llamada</span>{K.input("30 %")}</div>
      </div>
      <p class="muted small" style="padding:0 18px 12px">Lo que cambies aquí pasa a decir «lo dijiste tú». Cuando tu historia alcance muestra, te avisamos si conviene volver al dato real.</p>
    </details>"""
    mid = K.notice("info", f"Llevas <b>{copm(18_940_000)}</b>. La ruta se recalcula desde hoy con los 6 días hábiles que quedan.", icon="route") if mid_month else ""
    return f"""<div class="page" style="max-width:720px">
      {K.crumb("Comercial", "Meta")}
      <div class="header"><div><h1>¿Cuánto quieres vender en septiembre?</h1><p class="lead">El mes pasado: <b class="tnum" style="font-weight:500;color:var(--foreground)">$ 22.100.000</b> · 31 ventas · ticket $ 713.000</p></div></div>
      {mid}
      <div class="goal-in" role="textbox" aria-label="Meta del mes en pesos">$ 30.000.000<span class="caret" aria-hidden="true"></span><small>COP · septiembre 2026</small></div>
      <div class="seg inline sm" role="radiogroup" aria-label="Atajos">
        <button role="radio" aria-checked="false">Como el mes pasado</button>
        <button role="radio" aria-checked="false">+10 %</button>
        <button role="radio" aria-checked="false">+25 %</button>
        <button role="radio" aria-checked="true">Otra cifra</button>
      </div>
      {gl("Lo que implica", implies)}
      {sup}
      <div class="form-actions" style="justify-content:flex-start">{btn("Guardar meta", "flag")}{btn("Cancelar", "", "ghost")}</div>
      <p class="muted small">Al guardar: «Meta puesta. Empezamos a medir el camino.»</p>
    </div>"""


def trend_svg() -> str:
    # 26 días hábiles; esperado lineal 0→42; real hasta el día 20 = 27
    W, H, pad = 520, 180, 26
    def x(d): return pad + (W - 2 * pad) * d / 26
    def y(v): return H - pad - (H - 2 * pad) * v / 42
    exp_pts = f"{x(0):.0f},{y(0):.0f} {x(26):.0f},{y(42):.0f}"
    actual = [0, 1, 2, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14, 15, 17, 18, 20, 21, 23, 25, 27]
    act_pts = " ".join(f"{x(i):.0f},{y(v):.0f}" for i, v in enumerate(actual))
    fill = f"{x(0):.0f},{y(0):.0f} {act_pts} {x(20):.0f},{y(0):.0f}"
    grid = "".join(f'<line class="grid" x1="{pad}" x2="{W - pad}" y1="{y(v):.0f}" y2="{y(v):.0f}"/><text x="{pad - 6}" y="{y(v) + 4:.0f}" text-anchor="end">{v}</text>' for v in (0, 14, 28, 42))
    ticks = "".join(f'<text x="{x(d):.0f}" y="{H - 8}" text-anchor="middle">{lbl}</text>' for d, lbl in ((0, "1 sep"), (10, "12 sep"), (20, "hoy"), (26, "30 sep")))
    return f"""<svg class="trend" viewBox="0 0 {W} {H}" role="img" aria-label="Ventas acumuladas del mes: 27 reales frente a 32 esperadas a hoy">
      {grid}{ticks}
      <polygon class="fill" points="{fill}"/>
      <polyline class="exp" points="{exp_pts}"/>
      <polyline class="act" points="{act_pts}"/>
      <circle class="end" cx="{x(20):.0f}" cy="{y(27):.0f}" r="4.5"/>
    </svg>
    <div class="legend"><span><i></i>Real</span><span><i class="exp"></i>Esperado</span></div>"""


def view_kr_sheet() -> str:
    body = f"""<div class="sheet-wrap"><aside class="sheet" role="dialog" aria-label="Ventas cerradas">
      <div class="sheet-h">
        <span class="ey">Resultado clave</span>
        <h2>Ventas cerradas {btn("", "x", "ghost icon sm", 'aria-label="Cerrar"')}</h2>
        <div class="big">27 <span class="muted" style="font-size:16px;font-family:var(--font-body)">de 42</span>{badge("Ritmo bajo", "warn")}</div>
      </div>
      <div class="sheet-b">
        {trend_svg()}
        {gl("El camino", "".join([
            gr("Recorrido", "27 ventas · 64 %"),
            gr("Donde deberías ir hoy", "32"),
            gr("Ritmo real", "1,35 al día"),
            gr("Ritmo necesario", "2,5 al día · 6 días hábiles"),
            gr("Proyección al cierre", "35 ventas · 83 %"),
        ]))}
        {gl("De dónde sale", "".join([
            gr("Ticket promedio", cop(710_000), src("history") + " · últimos 90 días · 61 ventas", f'{btn("Corregir", "", "ghost xs hov")}'),
            gr("Cotización → venta", "38 %", src("history") + " · últimos 60 días · 187 cotizaciones", f'{btn("Corregir", "", "ghost xs hov")}'),
            gr("Días hábiles", "26 · lunes a sábado", "según tu horario de atención"),
        ]))}
        {gl("Mix sugerido", "".join([
            gr("Limpieza facial profunda", "19 ventas · " + cop(6_650_000), "45 % de tus ventas de los últimos 90 días"),
            gr("Toxina botulínica", "13 ventas · " + cop(11_050_000), "30 %"),
            gr("Otros tratamientos", "10 ventas · " + cop(12_300_000), "25 % · 6 productos"),
        ]))}
      </div>
      <div class="sheet-f"><span>2 acciones propuestas empujan este resultado</span><div class="acts">{btn("Ver en el CRM", "arrow-right", "outline sm")}</div></div>
    </aside></div>"""
    return f'{view_route("behind")}{body}'


def view_action_sheet() -> str:
    body = f"""<div class="sheet-wrap"><aside class="sheet" role="dialog" aria-label="Acción propuesta">
      <div class="sheet-h">
        <span class="ey" style="display:flex;gap:8px;align-items:center">{badge("Lote de seguimiento", "outline")}<span class="exp" style="color:var(--axi-warning);text-transform:none;letter-spacing:0">vence en 2 días</span></span>
        <h2>Reactivar 38 cotizaciones sin respuesta {btn("", "x", "ghost icon sm", 'aria-label="Cerrar"')}</h2>
        <p class="hl" style="color:var(--axi-violet);font-weight:500">+6 ventas estimadas · cubre el 38 % de lo que falta</p>
      </div>
      <div class="sheet-b">
        {gl("Por qué ahora", "".join([
            gr("Ritmo de ventas", "1,35 al día · esperado 1,6", src("history")),
            gr("Cotizaciones sin respuesta", "38 · hace más de 5 días", "ninguna tiene seguimiento programado"),
            gr("Lo que suelen dar", "16 % vuelve a responder · 1 de cada 3 compra", src("history") + " · agosto"),
        ]))}
        {gl("Qué va a pasar", "".join([
            gr("Contactos", "38", "cotizaron y no respondieron en 5 días · 2 excluidos por baja comercial", f'{btn("Ver lista", "", "ghost xs hov")}'),
            gr("Canal", "WhatsApp", "con plantilla «Retomar cotización» (utility · aprobada)"),
            gr("Cuándo", "mañana 9:00 · 12 por hora", "dentro de tu horario · respeta las horas de silencio"),
            gr("Quién", "Sofía, tu agente", "objetivo: retomar la cotización y agendar la cita"),
            gr("Costo estimado", "≈ US$ 0,03", "38 plantillas utility"),
        ]))}
        {K.notice("info", "Verás el avance en <b>Ventas cerradas</b> y en <b>Tareas</b>. Nada se envía sin tu aprobación.", icon="shield-check")}
      </div>
      <div class="sheet-f"><span>Rechazar guarda el motivo y Axi no vuelve a proponerlo esta semana.</span><div class="acts">{btn("Rechazar", "", "ghost sm")}{btn("Aprobar", "check", "sm")}</div></div>
    </aside></div>"""
    return f'{view_route("behind")}{body}'


def view_journey_settings() -> str:
    tabs = [("Pipelines", "kanban"), ("Recorrido", "route"), ("Etiquetas", "tag"), ("Segmentos", "users"), ("Importar", "upload"), ("Seguimiento", "bot"), ("Secuencias", "list-ordered")]
    def stage(name, kind_label, kind_icon, cad, badge_html="", final=False):
        right = badge_html + (f'<span class="go">{ic("chevron-down", size=16)}</span>' if not final else "")
        v = f'<span class="kind">{ic(kind_icon, size=14)}{kind_label}{ic("chevron-down", size=13)}</span>'
        return gr(name, v, cad if not final else "Etapa final", right, link=not final)
    expanded = f"""<div class="gr" style="background:color-mix(in srgb, var(--foreground) 2%, transparent)">
      <div class="k">Propuesta</div>
      <div class="v"><span class="kind">{ic("file-text", size=14)}Propuesta{ic("chevron-down", size=13)}</span><span class="muted small" style="font-weight:400">El cliente ya tiene una cotización o un plan de tratamiento en la mano.</span></div>
      <div class="cad" style="grid-column:1 / -1">
        <div class="f"><span class="k">Intentos</span>{K.input("4")}</div>
        <div class="f"><span class="k">Espera entre intentos</span>{K.select("2 días")}</div>
        <div class="f"><span class="k">Canal</span>{K.select("WhatsApp", icon="message-circle")}</div>
        <div class="f"><span class="k">Tiempo máximo en la etapa</span>{K.select("10 días")}</div>
        <div class="f" style="grid-column:1 / -1"><span class="k">Cuándo dejar de insistir</span><span style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">tras <b>4</b> intentos sin respuesta → {K.select("marcar la oportunidad como perdida")}</span></div>
      </div>
      <div class="moves" style="grid-column:1 / -1">{ic("zap", size=13)}La mueven solos: <b>cotización enviada</b> · <b>plan de tratamiento enviado</b>. El agente también puede moverla si el cliente lo pide o lo descarta.</div>
    </div>"""
    stages = "".join([
        stage("Consulta", "Nuevo", "sparkle", "2 intentos · cada 4 h · WhatsApp · máx. 2 días · luego descartar"),
        stage("Contactado", "Contactado", "message-circle", "3 intentos · cada 24 h · WhatsApp · máx. 5 días · luego a Perdida"),
        stage("Cita agendada", "Agenda", "calendar-days", "2 recordatorios · 24 h y 2 h antes · llamada y mensaje · máx. 7 días"),
        expanded,
        stage("Pago confirmado", "Compromiso", "badge-check", "1 recordatorio de pago · 48 h · WhatsApp · máx. 3 días"),
        stage("En tratamiento", "Entrega", "heart-handshake", "", final=True),
        stage("Reagendar (personalizada)", "Sin tipo", "circle-dashed", "Sin tipo no se mueve sola ni entra en las tasas del recorrido", badge("Sin tipo", "warn")),
    ])
    template = gr("Plantilla", "Clínica estética", "Salud, belleza y citas · 6 etapas con cadencia", f'{btn("Cambiar", "", "ghost xs hov")}', link=True)
    picker = f"""<div class="tpl" role="radiogroup" aria-label="Plantillas por tipo de negocio">
      {"".join(f'<button role="radio" aria-checked="{"true" if n == "Clínica estética" else "false"}"><b>{n}</b><span>{d}</span></button>' for n, d in [
          ("Restaurantes y comida", "Pedido rápido · 2 intentos · 2 h"),
          ("Retail y moda", "Carrito · cotización · 3 intentos · 24 h"),
          ("Hoteles y turismo", "Reserva · anticipo · 3 intentos · 48 h"),
          ("Clínica estética", "Cita · asistió · tratamiento · 4 intentos"),
          ("Inmobiliarias", "Visita · oferta · 3 intentos · 72 h · llamada"),
          ("Educación y cursos", "Info · clase muestra · matrícula · 4 · 48 h"),
          ("Servicios profesionales", "Reunión · propuesta · 4 intentos · 72 h"),
          ("Distribuidores B2B", "Lista de precios · pedido · 3 · 72 h"),
          ("Software y digital", "Demo · prueba · 4 intentos · 48 h"),
          ("Tecnología y electrónica", "Cotización · pago · 3 intentos · 24 h"),
          ("Otro tipo de negocio", "Nuevo · contactado · propuesta · 3 · 48 h"),
      ])}
    </div>
    <p class="muted small" style="padding:0 18px 14px">Aplicar una plantilla reemplaza tipos y cadencias. <b>No borra etapas ni oportunidades.</b></p>"""
    return f"""<div class="page">
      {K.crumb("CRM", "Configuración", "Recorrido")}
      <div class="header"><div><h1>El recorrido del cliente</h1><p class="lead">Qué etapas pasa un contacto, cuánto insistimos en cada una y cuándo la movemos solos.</p></div></div>
      {K.nav(tabs, "Recorrido", "Configuración del CRM", "sm")}
      {K.notice("info", "Cada etapa se mueve sola con sus eventos (una cita agendada, una cotización enviada). <b>El agente también puede moverla por su criterio.</b> Todo queda en el historial del contacto y se puede deshacer con un clic.", icon="sparkles")}
      {gl("", template + picker)}
      {gl("Etapas", stages, right='<span class="muted" style="letter-spacing:0;text-transform:none;font-weight:400">Se guarda al salir de cada campo</span>')}
      <div class="mk-in">{ic("info", size=14)}<span>Ganado y Perdido no son etapas: son el estado de la oportunidad. Reordenar, renombrar y colorear etapas sigue en <b>Pipelines</b>. La probabilidad por etapa y los días de enfriamiento se leen aquí como «tiempo máximo».</span></div>
    </div>"""


def view_contact_360() -> str:
    def tli(icon, title, desc, when, cls="", action=""):
        act = f'<span class="act">{action}</span>' if action else ""
        return f'<div class="tli {cls}"><div class="dc"><i>{ic(icon, size=13)}</i></div><div><div class="tt">{title}</div><div class="td">{desc}</div></div><div class="when"><span>{when}</span>{act}</div></div>'
    journey = gl("Recorrido", "".join([
        gr("Etapa", f'Propuesta {badge("Propuesta", "violet")}', "Oportunidad «Plan facial completo» · $ 1.240.000"),
        gr("En la etapa", "6 días", "máx. 10 · vence el 27 sep"),
        gr("La movió", "el agente Sofía", "«Pidió la cotización del tratamiento completo»", f'{btn("Deshacer", "rotate-ccw", "ghost xs hov")}'),
        gr("Cadencia", "intento 2 de 4", "próximo mañana 10:00 · WhatsApp · espera 2 días", f'{btn("Pausar", "pause", "ghost xs hov")}'),
    ]), icon="route")
    score = gl("Puntaje", gr("55 / 100", f'{rule(55)}', "Interesada · evaluando · sin compromiso aún"))
    timeline = f"""<section class="card">
      <div class="card-head"><div><h2>Todo lo que pasó</h2></div><div class="right">{K.nav([("Todo", "list"), ("Recorrido", "route"), ("Mensajes", "message-circle"), ("Citas", "calendar-days")], "Todo", "Filtro del historial", "sm inline")}</div></div>
      <div class="tl">
        {tli("route", f'Pasó a <b>Propuesta</b> {badge("Agente IA", "ai", icon="sparkles")}', "«Pidió la cotización del tratamiento completo» · desde Cita agendada", "hoy 10:42", "violet", btn("Deshacer", "rotate-ccw", "ghost xs"))}
        {tli("file-text", "Cotización enviada · $ 1.240.000", "Plan facial completo · 3 sesiones · por Sofía", "hoy 10:41", "brand")}
        {tli("calendar-check", "Asistió a la cita", "Valoración · sede Chapinero · 40 min", "ayer 16:30")}
        {tli("route", "Pasó a <b>Cita agendada</b>", "Regla: cita agendada · desde Contactado", "19 sep", "", btn("Deshacer", "rotate-ccw", "ghost xs"))}
        {tli("phone", "Llamada contestada · 3 min", "Recordatorio de la cita · confirmó", "18 sep")}
        {tli("route", "Pasó a <b>Contactado</b>", "Regla: primera respuesta · desde Consulta", "15 sep")}
        {tli("user-round", "Ciclo de vida: prospecto → lead", "Al agendar la cita", "15 sep")}
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
    tabs = [("Conversión", "trending-up"), ("Calidad", "badge-check"), ("Alertas", "bell")]
    kpis = "".join(f'<div class="kpi"><div class="k">{k}</div><div class="v">{v}</div><div class="d">{d}</div></div>' for k, v, d in [
        ("Ventas pagadas", "$ 18,9 M", "27 pedidos · 30 días"), ("Tasa de cierre", "7,1 %", "de 380 conversaciones"), ("Contención", "74 %", "sin humano"), ("Escalamiento", "12 %", "3 % por fallo de la IA")])
    fun = "".join(f'<div class="row"><span>{n}</span><div class="bar {"star" if star else ""}"><i style="width:{w}%"></i></div><span class="n">{v}</span></div>' for n, w, v, star in [
        ("Conversaciones", 100, "380", False), ("Con intención", 62, "236", False), ("Cotizadas", 40, "152", False), ("Citas agendadas", 32, "121", False), ("Ventas pagadas", 7, "27", True)])
    rates = gl("Tasas vivas · 30 días", "".join([
        gr("Llamadas → contestadas", "62 %", "79 de 128 llamadas · según tu historia", rule(62, soft=True)),
        gr("Contestadas → cita agendada", "30 %", "24 de 79", rule(30, soft=True)),
        gr("Cita agendada → asistió", "78 %", "61 de 78 · 12 no asistieron", rule(78, soft=True)),
        gr("Asistió → venta", "44 %", "27 de 61 · la etapa que más pesa", rule(44)),
        gr("Valor por cita agendada", cop(320_000), "lo que mueve cada agenda"),
        gr("Valor por visita", cop(540_000), "lo que mueve cada persona que asiste"),
    ]), icon="")
    flow = gl("Recorrido del pipeline · 30 días", "".join([
        gr("Nuevo → Contactado", "71 % avanza", "3,2 días en promedio · 210 entraron", rule(71, soft=True)),
        gr("Contactado → Cita agendada", "52 %", "2,1 días · 149 entraron", rule(52, soft=True)),
        gr("Cita agendada → Propuesta", "78 %", "4,4 días · 78 entraron", rule(78, soft=True)),
        gr("Propuesta → Pago confirmado", "44 %", "5,8 días · 61 entraron · 9 vencidas", rule(44)),
        gr("Pago → En tratamiento", "96 %", "1,2 días", rule(96, soft=True)),
    ]), right=f'<a href="#" style="letter-spacing:0;text-transform:none;font-weight:500;display:inline-flex;gap:4px;align-items:center;text-decoration:none">Ajustar el recorrido {ic("arrow-right", size=13)}</a>')
    return f"""<div class="page">
      {K.crumb("Analítica")}
      <div class="header"><div><h1>Analítica</h1><p class="lead">Lo que produjo la IA, medido con hechos.</p></div><div class="right"><nav class="seg sm inline" aria-label="Periodo"><a href="#">7 d</a><a href="#" aria-current="page">30 d</a><a href="#">90 d</a></nav></div></div>
      {K.nav(tabs, "Conversión", "Planos de analítica")}
      <div class="kpis">{kpis}</div>
      <section class="card"><div class="card-head"><div><h2>Embudo de conversión</h2><p class="lead">Existente. Las dos listas de abajo son lo nuevo.</p></div></div><div class="fun">{fun}</div></section>
      <div class="grid2">{rates}{flow}</div>
    </div>"""


def view_dashboard() -> str:
    with_goal = f"""<section class="gpb" aria-label="Tu meta de septiembre">
      <div class="k">Tu meta de septiembre</div>
      <div class="v"><b class="tnum" style="font-weight:600">{copm(18_940_000)}</b><span class="muted">de {cop(TARGET)}</span>{badge("Ritmo bajo", "warn")}</div>
      <div style="grid-column:1">{route(18_940_000 / TARGET, EXP, 24_620_000 / TARGET, compact=True, flag=False)}</div>
      <div class="r"><span class="pct">63 %</span><span class="muted">faltan 6 días hábiles</span><br><a href="#">Ver la ruta {ic("arrow-right", size=14)}</a></div>
    </section>"""
    without = f"""<section class="gpb" aria-label="Sin meta">
      <div class="v" style="grid-column:1 / -1"><a href="#" style="font-weight:500;text-decoration:none;display:inline-flex;gap:6px;align-items:center">{ic("route", size=16)}Ponle una meta al mes y te trazamos el camino {ic("arrow-right", size=14)}</a></div>
    </section>"""
    tiles = "".join(f'<div class="tile"><div class="k">{k}</div><div class="v">{v}</div></div>' for k, v in [("Ventas hoy", "$ 1.420.000"), ("Conversaciones abiertas", "23"), ("Pedidos por confirmar", "4")])
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
        <p>Tus agentes siguen atendiendo y vendiendo. Activa Comercial para trazar la ruta del mes y que Axi te proponga cómo llegar.</p>
        <div class="acts">{btn("Ver planes", "arrow-right", "outline sm")}</div>
        <p class="muted small mono">403 entitlements/capability_not_granted · crm</p>
      </div></section>
      <div class="mk-in">{ic("info", size=14)}<span>Decisión abierta: en v1 la capacidad es la del CRM (todo plan con CRM lo tiene). Esta pantalla solo la ve un tenant sin CRM. Si Comercial se vende aparte, cambia la capacidad y este copy.</span></div>
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
        (3, "El ritmo: cuánto por día hábil", "La ruta se reparte en los días hábiles de tu horario. Así «hoy deberías ir en 32 ventas» tiene sentido un miércoles 23."),
        (4, "Dónde vas: el resultado de cada día", "Cada noche axi cierra el día con hechos (pagos, citas, llamadas contestadas, conversaciones nuevas) y compara con el ritmo. Te dice qué falta y a dónde llegas si sigues así."),
        (5, "Recalcular: acciones que apruebas", "Si el ritmo baja, Axi propone algo concreto y ejecutable con lo que ya existe: un lote de seguimiento, una secuencia, una campaña. Tú apruebas; nada sale solo."),
    ])
    example = T([
        ["Ventas", "<b>42</b>", "meta ÷ ticket promedio", "$ 30.000.000 ÷ $ 710.000", "historia · 90 d · 61 ventas"],
        ["Cotizaciones", "<b>110</b>", "ventas ÷ (cotización → venta)", "42 ÷ 38 %", "historia · 60 d"],
        ["Citas agendadas", "<b>95</b>", "ventas ÷ (cita → venta)", "42 ÷ 44 %", "historia · 60 d"],
        ["Contactados", "<b>210</b>", "máx(cotizaciones, citas) ÷ (contactado → cotiza)", "110 ÷ 52 %", "historia · 60 d"],
        ["Conversaciones nuevas", "<b>600</b>", "contactados ÷ (lead → contactado)", "210 ÷ 35 %", "historia · 30 d"],
        ["Llamadas", "<b>120</b>", "contactados × parte por llamada ÷ contestación", "210 × 30 % ÷ 62 %", "<span class='src'>supuesto para clínicas estéticas</span>"],
    ], ["Necesitas", "Cuánto", "Cómo se calcula", "Con tus números", "De dónde sale"])
    windows = T([
        ["Tasas del embudo", "30 → 60 → 90 días", "≥ 20 en el denominador", "la ventana más corta con muestra gana"],
        ["Ticket promedio", "90 días (180 si hace falta)", "≥ 5 ventas", "<b>jamás</b> se supone: sin ticket el plan queda «incompleto» y se pide"],
        ["Contestación de llamadas", "30 → 60 → 90 días", "≥ 15 llamadas", "sin llamadas no hay fila de llamadas"],
        ["Mix de productos", "90 días (180)", "≥ 10 ventas", "piso 5 % por categoría, máximo 8 filas + «Otros»"],
    ], ["Cifra", "Ventanas", "Muestra mínima", "Regla"])
    bench = T([
        ["Restaurantes y comida", "22 %", "70 %", "65 %", "55 %", "—"],
        ["Retail y moda", "9 %", "45 %", "38 %", "60 %", "—"],
        ["Hoteles y turismo", "12 %", "40 %", "45 %", "65 %", "—"],
        ["Salud, belleza y citas", "7 %", "52 %", "35 %", "62 %", "44 %"],
        ["Inmobiliarias", "3 %", "35 %", "40 %", "58 %", "25 %"],
        ["Educación y cursos", "8 %", "45 %", "40 %", "60 %", "35 %"],
        ["Servicios profesionales", "10 %", "50 %", "45 %", "65 %", "40 %"],
        ["Distribuidores B2B", "15 %", "60 %", "50 %", "70 %", "—"],
        ["Software y digital", "6 %", "40 %", "35 %", "55 %", "30 %"],
        ["Tecnología y electrónica", "8 %", "45 %", "38 %", "60 %", "—"],
        ["Otro tipo de negocio", "8 %", "45 %", "40 %", "60 %", "35 %"],
    ], ["Tipo de negocio", "Lead → venta", "Contactado → cotiza", "Lead → contactado", "Llamadas contestadas", "Cita → venta"])
    return f"""<article class="doc">
      <span class="eyebrow">Módulo Comercial · Fase 0 · para discutir antes de construir</span>
      <h1>La ruta: de la meta del mes al trabajo de cada día</h1>
      <p class="lead">Los números no se esperan, se persiguen. Este módulo convierte «quiero vender treinta millones» en una ruta con ritmo, y cada día te dice dónde vas, qué falta y qué hacer.</p>
      <p class="quote">Como un Waze: eliges el destino, axi traza la ruta, y si el tráfico cambia, recalcula.</p>

      <h2>Cómo funciona</h2>
      <div class="steps">{steps}</div>

      <h2>Un ejemplo con números</h2>
      <p>Clínica Dermalux quiere vender <b>$ 30.000.000</b> en septiembre. Este es el plan que axi le traza, cifra por cifra, con la procedencia de cada una:</p>
      {example}
      <div class="callout"><b>Cada cifra dice de dónde sale.</b> Hay tres procedencias, de más a menos fuerte: <b>tu historia</b> (lo que tu negocio hizo de verdad), <b>lo dijiste tú</b> (lo que declaraste a Alba o en el editor) y <b>supuesto por tipo de negocio</b> (un punto de partida mientras no hay datos). Una cifra derivada hereda la procedencia más débil de sus insumos, y un supuesto se retira solo en cuanto tu historia alcanza muestra. No hay mezclas: es explicable.</div>

      <h2>Ventanas, muestras y cuándo se retira un supuesto</h2>
      {windows}

      <h2>El ritmo</h2>
      <ul>
        <li><b>Días hábiles según tu horario</b> de atención (sin horario: lunes a sábado). Septiembre 2026 tiene 26; hoy, 23 de septiembre, es el día hábil 20. Festivos: no en la primera versión, y lo decimos.</li>
        <li><b>Dónde deberías ir hoy</b> = meta × (días hábiles transcurridos ÷ totales). El marcador hueco de la ruta.</li>
        <li><b>Estado del ritmo</b>: adelantado por encima del 110 % de lo esperado · al ritmo entre 90 y 110 · ritmo bajo por debajo del 90 · atrasado por debajo del 80. Con menos de 3 días hábiles, «aprendiendo tu ritmo»: sin proyección ni acciones.</li>
        <li><b>Proyección al cierre</b> = lo recorrido ÷ días transcurridos × días totales. La prolongación punteada.</li>
        <li><b>Qué falta</b>: lo que queda, dividido en los días hábiles restantes, en ventas, citas y contactos. «3 ventas al día en los 6 días que quedan».</li>
        <li>Un pago cuenta <b>el día que se pagó</b>, aunque la conversación sea de hace un mes. Nunca se retro-imputa.</li>
      </ul>

      <h2>Los OKR, sin escribirlos</h2>
      <p>El <b>Objetivo</b> es la meta del mes. Los <b>Resultados Clave</b> son las cifras del plan con su avance: ventas, ticket, cotizaciones, citas, contactados, conversaciones nuevas y llamadas. Se leen como OKR y se recalculan solos; no hay editor. Si algún día hace falta un resultado clave propio («reactivar 50 clientes antiguos»), se añade después.</p>

      <h2>Las acciones que Axi propone</h2>
      <ul>
        <li><b>Cuándo</b>: al cerrar el día, si el ritmo baja del umbral. Una propuesta por semana como máximo por meta; vence al terminar la semana; no se repite si la rechazas.</li>
        <li><b>Qué</b>: un <b>lote de seguimiento</b> (contactos concretos, canal, hora, objetivo), inscribir en una <b>secuencia</b> existente, o un borrador de <b>campaña</b> cuando faltan conversaciones nuevas. Todo con lo que ya existe en el CRM y Marketing.</li>
        <li><b>Con qué cara</b>: cada propuesta dice cuántas ventas estima, qué parte de la brecha cubre, por qué ahora (con la procedencia) y qué va a pasar exactamente si apruebas: quién, a quién, cuándo, por dónde, cuánto cuesta.</li>
        <li><b>Nunca</b>: enviar algo sin aprobación, escribir a quien pidió que no le escriban, ni fijar precios o montos desde el modelo.</li>
      </ul>

      <h2>Supuestos por tipo de negocio (hipótesis para discutir)</h2>
      <p>Son puntos de partida, marcados como «supuesto» en cada cifra y reemplazados por tu historia en cuanto hay muestra. Vienen de los benchmarks públicos de venta por chat en LATAM y de la experiencia de los pilotos; hay que revisarlos con el dueño.</p>
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
        ["Restaurantes y comida", "Nuevo 2 · cada 2 h · WhatsApp", "Pedido en minutos; insistir dos veces y soltar"],
        ["Retail y moda", "Propuesta 3 · cada 24 h · WhatsApp · máx. 5 d", "Carrito y cotización; un recordatorio de pago"],
        ["Hoteles y turismo", "Propuesta 3 · cada 48 h · máx. 7 d", "Reserva con anticipo; recordatorio antes de la fecha"],
        ["Salud, belleza y citas", "Agenda 2 recordatorios · Propuesta 4 · cada 48 h · máx. 10 d", "El no-show es la fuga; confirmar por llamada"],
        ["Inmobiliarias", "Agenda 3 · cada 72 h · llamada y mensaje · máx. 14 d", "Decisión lenta; la visita lo es todo"],
        ["Educación y cursos", "Propuesta 4 · cada 48 h · máx. 14 d", "Clase muestra y matrícula con fecha límite"],
        ["Servicios profesionales", "Propuesta 4 · cada 72 h · máx. 21 d", "Reunión, propuesta, seguimiento espaciado"],
        ["Distribuidores B2B", "Negociación 3 · cada 72 h · máx. 14 d", "Lista de precios, pedido recurrente"],
        ["Software y digital", "Propuesta 4 · cada 48 h · máx. 14 d", "Demo, prueba, activación"],
        ["Tecnología y electrónica", "Propuesta 3 · cada 24 h · máx. 5 d", "Compara precio; rapidez"],
        ["Otro tipo de negocio", "Propuesta 3 · cada 48 h · máx. 10 d", "Punto de partida neutro"],
    ], ["Tipo de negocio", "Cadencia sugerida (etapa · intentos · espera · máximo)", "Por qué"])
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
      <p>Hoy el seguimiento del agente tiene una política global (8 intentos, 72 horas, espera de 48 horas). Pasa a ser <b>por etapa</b>: cuántas veces insistir, cada cuánto, por qué canal, cuánto tiempo como máximo y qué hacer al agotarse (marcar perdida, dejar enfriar, pasar a una persona). La cadencia de la etapa gobierna los seguimientos que el agente programa: cuando se agota, deja de insistir y lo dice.</p>
      {cadences}

      <h2>La ficha del contacto cuenta todo</h2>
      <ul>
        <li><b>Recorrido</b> arriba: etapa actual, días en la etapa frente al máximo, quién la movió y por qué, cadencia en curso («intento 2 de 4 · próximo mañana 10:00»), con deshacer y pausar al pasar el ratón.</li>
        <li><b>Historial</b> con las entradas nuevas: cambios de etapa (con actor y razón) y cambios de ciclo de vida (prospecto → lead → cliente), que hoy no se guardan en ninguna parte.</li>
        <li>Lo que ya existe se queda: mensajes, pedidos, citas, llamadas, notas, datos capturados.</li>
      </ul>

      <h2>Un hueco que se cierra de paso</h2>
      <div class="callout">Hoy <b>una cita cumplida no cuenta para nada</b>: no sube el puntaje, no convierte al contacto en cliente y no mueve la oportunidad. Los negocios de servicios nunca llegan a «cliente». Emitir ese hecho es lo primero que se construye.</div>
    </article>"""


def doc_brand() -> str:
    voice = f"""<div class="voice">
      <div><div class="h yes">Así sí</div><p>«Para llegar faltan $ 11 M: 3 ventas al día en los 6 días que quedan.»</p><p>«Vas al ritmo. Mantén 2 ventas al día y llegas.»</p><p>«Meta puesta. Empezamos a medir el camino.»</p><p>«Estamos aprendiendo tu ritmo. En 5 días tendrás proyección.»</p></div>
      <div><div class="h no">Así no</div><p>«Vas −37 % respecto al objetivo.»</p><p>«¡Felicitaciones! ¡Estás rompiendo récords! 🚀»</p><p>«Objetivo configurado exitosamente.»</p><p>«Datos insuficientes para el cálculo.»</p></div>
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
        <div><b>La prueba</b><span>Honestidad estructural: cada cifra dice de dónde sale (tu historia, lo dijiste tú, supuesto). Lo que la IA no cerró, no se lo atribuye.</span></div>
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
        <li>Nada de porcentajes negativos. «18 de 42 · faltan 24», no «−57 %».</li>
        <li>Cada cifra con su procedencia: «según tu historia», «lo dijiste tú», «supuesto para clínicas estéticas». Es honestidad de marca, no un tecnicismo.</li>
        <li>Celebrar con sobriedad: «Meta cumplida con 4 días de sobra. Lo que venga ahora es camino extra.» Sin emojis en la herramienta de trabajo.</li>
        <li>Cuando no sabemos, lo decimos con calma: «Estamos aprendiendo tu ritmo».</li>
        <li>Axi propone en voz baja y en violeta; el dueño decide. «Axi propone», no «Recomendación del sistema».</li>
      </ol>
      {voice}

      <h2>Dónde se ve en el módulo</h2>
      <ul>
        <li>Título: <b>Tu ruta de septiembre</b>. Ítem del menú: <b>Comercial</b>.</li>
        <li>Sin meta: «Ponle una meta a septiembre» · «Dinos cuánto quieres vender y te trazamos el camino».</li>
        <li>Sin acciones: «Estás al día. Cuando algo pueda acelerar la ruta, aquí lo verás.»</li>
        <li>Botones: Definir la meta · Guardar meta · Aprobar · Ver qué quedó · Deshacer · Ver la ruta →</li>
        <li>Motivos de rechazo escritos como los diría el dueño: «Prefiero que mi equipo los contacte uno por uno» · «Es pronto para volver a escribirles» · «No quiero mover precio este mes».</li>
      </ul>
    </article>"""


def doc_decisions() -> str:
    dec = T([
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
        ["Propuestas", "Van a la misma bandeja «Por decidir» de Axel, con su origen «comercial».", "—"],
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
      {dec}
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
VIEWS = [
    ("metodo", "Método", doc_method(), "El método comercial explicado: el Waze en cinco pasos, un ejemplo con números, procedencia de cada cifra, ventanas y muestras, el ritmo, los OKR derivados, las acciones y los supuestos por tipo de negocio."),
    ("recorrido", "Recorrido", doc_journey(), "Qué hay detrás del recorrido del cliente: tipos de etapa, qué la mueve sola, el criterio del agente con sus salvaguardas, la cadencia por etapa y las plantillas por tipo de negocio."),
    ("marca", "Marca", doc_brand(), "Borrador del posicionamiento «axi vende progreso», qué cambia en cada documento y las reglas de voz que el módulo estrena."),
    ("decisiones", "Decisiones", doc_decisions(), "Las nueve decisiones del dueño, las cuatro mías para confirmar, las preguntas abiertas y las fases."),
    ("sin-meta", "1 · Sin meta", view_no_goal(), "/comercial sin meta: un glifo, una frase y un botón. Debajo, una sola línea con la semilla: con historia propone una cifra alcanzable; sin historia, lo típico del tipo de negocio."),
    ("definir-meta", "2 · Definir meta", view_goal_editor(), "/comercial/meta: un solo número con consecuencias. Atajos, la lista viva «Lo que implica» (cada fila con su procedencia) y los supuestos ajustables plegados."),
    ("al-ritmo", "3 · Al ritmo", view_route("ok"), "La ruta del mes cuando todo va bien: una cifra, una línea, una frase. El marcador relleno (hoy real) coincide con el hueco (donde deberías ir). Sin acciones: «Estás al día»."),
    ("atrasado", "4 · Ritmo bajo", view_route("behind"), "Ritmo bajo: el marcador real queda detrás del hueco, la prolongación punteada muestra a dónde llegas si sigues así, y «Axi propone» trae dos acciones con su estimación más una ya aprobada."),
    ("adelantado", "5 · Adelantado", view_route("ahead"), "Adelantado: la proyección pasa la bandera. Axi propone subir la meta del mes siguiente en vez de callarse."),
    ("aprendiendo", "6 · Aprendiendo", view_learning(), "Meta puesta hace dos días: sin marcador de «hoy» ni proyección, badge neutro, aviso de cuándo habrá proyección; las cifras dicen «supuesto por tipo de negocio»."),
    ("kr-detalle", "7 · Detalle de un resultado", view_kr_sheet(), "Hoja lateral de «Ventas cerradas» sobre la vista de ritmo bajo: la única gráfica del módulo (real vs esperado), «El camino», «De dónde sale» (con Corregir al pasar el ratón) y el mix sugerido."),
    ("accion", "8 · Acción propuesta", view_action_sheet(), "Hoja lateral de una acción: por qué ahora (con procedencia), qué va a pasar exactamente si apruebas (quién, a quién, cuándo, canal, costo) y el par Aprobar / Rechazar."),
    ("recorrido-settings", "9 · Recorrido (CRM)", view_journey_settings(), "CRM › Configuración › Recorrido: plantilla por tipo de negocio (selector inline), explicador, y la lista de etapas con tipo semántico y cadencia; una etapa expandida con sus campos y lo que la mueve sola."),
    ("contacto-360", "10 · Contacto 360", view_contact_360(), "La ficha del contacto con la tarjeta «Recorrido» (etapa, días, quién la movió y por qué, cadencia en curso; Deshacer y Pausar al pasar el ratón) y el historial con las entradas nuevas de etapa y ciclo de vida."),
    ("analytics", "11 · Analítica", view_analytics(), "Analítica › Conversión: debajo del embudo existente, dos listas nuevas: las tasas vivas (llamadas → contestadas → citas → ventas, valor por cita y por visita) y el recorrido del pipeline por tipo de etapa."),
    ("dashboard", "12 · Panel", view_dashboard(), "El bloque «Tu meta de septiembre» del Panel, con y sin meta. Una franja, la ruta compacta y el enlace a la ruta."),
    ("bloqueado", "13 · Bloqueado", view_blocked(), "Un negocio sin la capacidad: estado vacío sólido con salida a planes. Decisión abierta sobre si Comercial se vende aparte."),
]


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
    from _axi_mockup_kit import BASE_CSS  # noqa: E402  (solo para inyectar el CSS propio)
    import _axi_mockup_kit as kit  # noqa: E402

    kit.BASE_CSS = BASE_CSS + EXTRA_CSS
    K.build_html("La ruta comercial", "Mockup F0 · no es producto", "Comercial · el método, el recorrido, la marca y trece pantallas",
                 VIEWS)
    if "--artifact" in sys.argv:
        write_artifact(pathlib.Path(sys.argv[sys.argv.index("--artifact") + 1]))
