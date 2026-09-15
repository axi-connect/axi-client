#!/usr/bin/env python3
"""Ensambla el rediseño de /crm/tasks (bandeja de tareas) en un HTML autocontenido.

Qué propone, en una línea: la bandeja de hoy apila cuatro filas de controles
antes de la primera tarea y unas cifras que no se pueden pulsar. Aquí las
cifras SON el filtro, los cuatro segmentados se funden en una barra, y la
lista deja de ser plana: se agrupa por día, con hora absoluta en el canalón y
una línea de «ahora».

Iconos: lucide (v0.539) desde node_modules, cacheados en crm-tasks-premium.lucide.json.
Tokens: copiados literalmente de src/app/globals.css — el mockup NO inventa paleta.
Fuentes: Poppins y Geist Mono por Google Fonts (Nexa es local; headings caen a Poppins 600).
"""
import json, pathlib, re, sys

S = pathlib.Path(__file__).parent
ROOT = S.parent.parent.parent
ICON_CACHE = S / "crm-tasks-premium.lucide.json"
SIBLING_CACHE = S / "agent-tasks-schedule.lucide.json"
ICONS = [
    "sparkles", "message-square", "phone-call", "clock", "check", "chevron-down", "chevron-right",
    "calendar-days", "layout-list", "info", "triangle-alert", "plus", "ellipsis-vertical",
    "circle-user", "history", "pencil", "send", "circle-x", "refresh-cw", "search", "users",
    "sun", "moon", "loader-circle", "circle-check", "arrow-right", "bell", "hourglass",
    "sliders-horizontal", "circle-dollar-sign", "wand-sparkles", "inbox", "check-check",
    "circle-alert", "user-round", "corner-down-right", "external-link", "star", "zap",
]


def load_icons():
    cache = {}
    if ICON_CACHE.exists():
        cache = json.load(open(ICON_CACHE))
    elif SIBLING_CACHE.exists():
        cache = {k: v for k, v in json.load(open(SIBLING_CACHE)).items() if k in ICONS}
    src = ROOT / "node_modules/lucide-react/dist/esm/icons"
    missing = [n for n in ICONS if n not in cache]
    for name in missing:
        f = src / f"{name}.js"
        if not f.exists():
            sys.exit(f"icono lucide no encontrado: {name}")
        body = f.read_text()
        for _ in range(3):
            alias = re.search(r"from '\./([\w-]+)\.js'", body)
            if "__iconNode = [" in body or alias is None:
                break
            body = (src / f"{alias.group(1)}.js").read_text()
        m = re.search(r"const __iconNode = (\[[\s\S]*?\]);", body)
        if m is None:
            sys.exit(f"no se pudo leer el icono lucide: {name}")
        parts = []
        for tag, attrs in re.findall(r'\[\s*"(\w+)",\s*\{(.*?)\}\s*\]', m.group(1), re.S):
            a = " ".join(f'{k}="{v}"' for k, v in re.findall(r'(\w+):\s*"([^"]*)"', attrs) if k != "key")
            parts.append(f"<{tag} {a}/>")
        cache[name] = "".join(parts)
    if missing:
        json.dump(cache, open(ICON_CACHE, "w"), indent=0, ensure_ascii=False)
    return cache


LUCIDE = load_icons()


def ic(name, cls="", size=16):
    return (f'<svg class="ic {cls}" width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" '
            f'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" '
            f'aria-hidden="true">{LUCIDE[name]}</svg>')


# ───────────────────────── Tokens (copiados de globals.css) ─────────────────────────
LIGHT = ("--background:#ffffff;--foreground:#171717;--axi-brand:#e65759;--axi-brand-2:#e02f2f;"
         "--axi-violet:#7c3aed;--axi-amber:#f0a431;--axi-muted:#f4f4f5;--axi-success:#16a34a;"
         "--axi-warning:#d97706;--axi-destructive:#dc2626;--axi-info:#2563eb;--axi-on-color:#ffffff;"
         "--accent-mix:14%;color-scheme:light;")
DARK = ("--background:#0a0a0a;--foreground:#ededed;--axi-brand:#fb7185;--axi-brand-2:#df4f4f;"
        "--axi-violet:#a78bfa;--axi-amber:#fbbf24;--axi-muted:#18181b;--axi-success:#4ade80;"
        "--axi-warning:#fbbf24;--axi-destructive:#f87171;--axi-info:#60a5fa;--axi-on-color:#0a0a0a;"
        "--accent-mix:42%;color-scheme:dark;")

CSS = r"""
:root{ __LIGHT__ }
@media (prefers-color-scheme: dark){ :root:not([data-theme="light"]){ __DARK__ } }
:root[data-theme="dark"]{ __DARK__ }
:root{
  --border:color-mix(in srgb, var(--foreground) 12%, var(--background));
  --border-soft:color-mix(in srgb, var(--border) 55%, transparent);
  --secondary:color-mix(in srgb, var(--foreground) 6%, var(--background));
  --muted:var(--axi-muted);
  --muted-fg:color-mix(in srgb, var(--foreground) 70%, transparent);
  --faint-fg:color-mix(in srgb, var(--foreground) 48%, transparent);
  --accent:color-mix(in srgb, var(--axi-brand) var(--accent-mix), var(--background));
  --input:color-mix(in srgb, var(--foreground) 14%, var(--background));
  --r-sm:8px;--r-md:12px;--r-lg:16px;--r-xl:20px;
  --shadow-float:0 1px 2px rgb(0 0 0/.05),0 4px 12px rgb(0 0 0/.06);
  --shadow-overlay:0 1px 2px rgb(0 0 0/.06),0 16px 48px rgb(0 0 0/.16);
  --font-body:"Poppins",Helvetica,Arial,sans-serif;
  --font-mono:"Geist Mono",ui-monospace,SFMono-Regular,Menlo,monospace;
}
*{box-sizing:border-box}
html,body{margin:0}
body{background:var(--background);color:var(--foreground);font-family:var(--font-body);font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased;padding-bottom:96px}
h1,h2,h3,h4{margin:0;font-weight:600;letter-spacing:-.01em}
p{margin:0}
button,input,select,textarea{font:inherit;color:inherit}
button{cursor:pointer;background:none;border:0;padding:0}
a{color:inherit;text-decoration:none}
img{max-width:100%}
[hidden]{display:none!important}
.ic{flex:none}
.muted{color:var(--muted-fg)}
.tnum{font-variant-numeric:tabular-nums}
.mono{font-family:var(--font-mono);font-variant-numeric:tabular-nums}
.violet{color:var(--axi-violet)}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
:focus-visible{outline:none;box-shadow:0 0 0 3px color-mix(in srgb,var(--axi-brand) 50%,transparent)}

/* ─────────── Chrome del mockup (NO es producto) ─────────── */
.mk-bar{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:100;display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:center;padding:6px 8px;border-radius:999px;font-size:11.5px;
  background:color-mix(in srgb,var(--background) 80%,transparent);border:1px solid color-mix(in srgb,var(--border) 60%,transparent);box-shadow:var(--shadow-overlay);backdrop-filter:saturate(160%) blur(16px);max-width:calc(100vw - 24px)}
.mk-tag{display:flex;align-items:center;gap:6px;padding:0 8px;font-weight:600;color:var(--muted-fg);white-space:nowrap}
.mk-grp{display:flex;gap:2px;padding:2px;border-radius:999px;background:var(--secondary)}
.mk-grp button{padding:5px 10px;border-radius:999px;color:var(--muted-fg);font-weight:500;white-space:nowrap}
.mk-grp button[aria-pressed="true"]{background:var(--accent);color:var(--foreground)}
.mk-theme{display:flex;align-items:center;gap:5px;padding:5px 10px;border-radius:999px;color:var(--muted-fg);font-weight:500}

/* ─────────── Cabecera CRM (CrmNav) ─────────── */
.crm-header{border-bottom:1px solid var(--border);padding:10px 24px}
.crm-header .row{display:flex;flex-wrap:wrap;align-items:center;gap:10px 22px}
.crm-header h1{font-size:18px;font-weight:700}
.crm-header nav{display:flex;gap:2px;flex-wrap:wrap}
.crm-header nav a{padding:5px 11px;border-radius:999px;font-size:13px;color:var(--muted-fg)}
.crm-header nav a[aria-current="page"]{background:var(--accent);color:var(--foreground);font-weight:500}
.wrap{max-width:1120px;margin:0 auto;padding:22px 24px 0}
@media (max-width:520px){.wrap{padding:18px 16px 0}.crm-header{padding:10px 16px}}

/* ─────────── Botones ─────────── */
.btn{display:inline-flex;align-items:center;gap:8px;height:36px;padding:0 14px;border-radius:999px;font-weight:500;font-size:13px;border:1px solid transparent;transition:background .2s,color .2s,border-color .2s}
.btn .ic{width:16px;height:16px}
.btn-primary{background:var(--axi-brand);color:var(--axi-on-color)}
.btn-primary:hover{background:var(--axi-brand-2)}
.btn-outline{border-color:var(--border);background:var(--background)}
.btn-outline:hover{background:var(--secondary)}
.btn-ghost{color:var(--muted-fg)}
.btn-ghost:hover{background:var(--secondary);color:var(--foreground)}
.btn-sm{height:28px;padding:0 10px;font-size:12px;gap:6px}
.btn-sm .ic{width:13px;height:13px}
.btn-icon{width:28px;height:28px;padding:0;justify-content:center;border-radius:var(--r-sm)}

/* ─────────── Cabecera de página ─────────── */
.head{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:12px}
.head h2{font-size:22px;letter-spacing:-.02em}
.head .sub{font-size:12.5px;color:var(--muted-fg);margin-top:3px}
.head .actions{display:flex;flex-wrap:wrap;gap:8px}

/* ─────────── Marcador: las cifras SON el filtro ─────────── */
.score{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin-top:16px}
@media (max-width:860px){.score{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media (max-width:520px){.score{grid-template-columns:repeat(2,minmax(0,1fr))}}
.tile{position:relative;display:flex;flex-direction:column;gap:1px;align-items:flex-start;padding:10px 12px 11px;border:1px solid var(--border);border-radius:var(--r-md);background:var(--background);text-align:left;transition:border-color .18s,background .18s}
.tile:hover{border-color:color-mix(in srgb,var(--foreground) 24%,var(--background))}
.tile .v{font-size:22px;font-weight:600;line-height:1.1;font-variant-numeric:tabular-nums;letter-spacing:-.02em}
.tile .k{display:flex;align-items:center;gap:5px;font-size:11.5px;color:var(--muted-fg);line-height:1.3}
.tile .k .ic{width:12px;height:12px}
.tile[aria-checked="true"]{background:var(--accent);border-color:color-mix(in srgb,var(--axi-brand) 45%,var(--background))}
.tile[aria-checked="true"] .k{color:var(--foreground)}
.tile.alarm .v,.tile.alarm .k .ic{color:var(--axi-destructive)}
.tile.warnish .v,.tile.warnish .k .ic{color:var(--axi-warning)}
.tile.good .v,.tile.good .k .ic{color:var(--axi-success)}
.tile.zero .v{color:var(--faint-fg)}

/* ─────────── Barra única de trabajo ─────────── */
.toolbar{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:14px}
.searchbox{display:flex;align-items:center;gap:8px;height:34px;padding:0 12px;border:1px solid var(--input);border-radius:999px;background:var(--background);flex:1 1 220px;min-width:0;max-width:340px;color:var(--muted-fg)}
.searchbox input{border:0;outline:0;background:none;width:100%;min-width:0;font-size:13px}
.searchbox input::placeholder{color:var(--faint-fg)}
.picker{display:inline-flex;align-items:center;gap:7px;height:34px;padding:0 11px;border:1px solid var(--border);border-radius:999px;font-size:12.5px;color:var(--muted-fg);white-space:nowrap}
.picker b{font-weight:500;color:var(--foreground)}
.picker .ic{width:14px;height:14px}
.spacer{flex:1 1 12px}
.divider{width:1px;height:20px;background:var(--border);flex:none}
@media (max-width:640px){.divider{display:none}}

/* ─────────── Pastilla única (segmented.tsx) ─────────── */
.seg{position:relative;display:inline-flex;border-radius:999px;padding:2px;border:1px solid var(--border);background:color-mix(in srgb,var(--secondary) 60%,transparent);max-width:100%;overflow-x:auto;scrollbar-width:none}
.seg-list{display:flex;gap:2px;margin:0;padding:0;list-style:none;position:relative;z-index:1}
.seg-item{display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border-radius:999px;font-size:12px;font-weight:500;color:var(--muted-fg);white-space:nowrap;transition:color .2s}
.seg-item .ic{width:14px;height:14px}
.seg-item[data-active="true"]{color:var(--foreground)}
.seg-item[data-active="true"] .ic{color:var(--axi-brand)}
.seg-item[data-active="true"] .ic.violet{color:var(--axi-violet)}
.seg-pill{position:absolute;z-index:0;border-radius:999px;background:var(--accent);transition:transform .25s cubic-bezier(.2,.8,.2,1),width .25s;opacity:0}
@media (prefers-reduced-motion:reduce){.seg-pill{transition:none}}
"""

CSS += r"""
/* ─────────── Franja del agente (digest de F5, traído a la vista) ─────────── */
.agent-strip{display:flex;flex-wrap:wrap;align-items:center;gap:8px 18px;margin-top:14px;padding:11px 14px;border:1px solid var(--border);border-left:3px solid var(--axi-violet);border-radius:var(--r-md);background:var(--secondary)}
.agent-strip .lead{display:inline-flex;align-items:center;gap:7px;font-size:13px;font-weight:500}
.agent-strip .lead .ic{color:var(--axi-violet)}
.agent-strip .facts{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:12.5px;color:var(--muted-fg)}
.agent-strip .facts span{display:inline-flex;align-items:center;gap:5px}
.agent-strip .facts b{font-weight:600;color:var(--foreground);font-variant-numeric:tabular-nums}
.agent-strip .facts .ic{width:13px;height:13px}
.agent-strip a{margin-left:auto;font-size:12.5px;color:var(--muted-fg);display:inline-flex;align-items:center;gap:5px}
.agent-strip a:hover{color:var(--foreground)}

/* ─────────── Lista agrupada por día ─────────── */
.glist{margin-top:18px;border:1px solid var(--border);border-radius:var(--r-lg);background:var(--background);overflow:clip}
.ghead{position:sticky;top:0;z-index:3;display:flex;align-items:baseline;gap:8px;padding:8px 16px;background:var(--secondary);border-bottom:1px solid var(--border);border-top:1px solid var(--border)}
.glist>.ghead:first-child{border-top:0}
.ghead h3{font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase}
.ghead .dt{font-size:11.5px;color:var(--muted-fg);letter-spacing:0;text-transform:none;font-weight:400}
.ghead .n{margin-left:auto;font-size:11.5px;color:var(--muted-fg);font-variant-numeric:tabular-nums}
.ghead.late h3{color:var(--axi-destructive)}

.trow{position:relative;display:grid;grid-template-columns:3px 62px 20px minmax(0,1fr) auto;align-items:center;gap:0 12px;padding:11px 16px 11px 0;border-top:1px solid var(--border-soft)}
.ghead+.trow,.day-head+.trow{border-top:0}
.trow:hover{background:color-mix(in srgb,var(--foreground) 3%,transparent)}
.stripe{align-self:stretch;border-radius:0 2px 2px 0;background:transparent}
.trow.late .stripe{background:var(--axi-destructive)}
.trow.ai .stripe{background:color-mix(in srgb,var(--axi-violet) 70%,transparent)}
.trow.fail .stripe{background:var(--axi-destructive)}
.gut{font-family:var(--font-mono);font-variant-numeric:tabular-nums;font-size:13.5px;line-height:1.25;text-align:right;color:var(--foreground)}
.gut small{display:block;font-family:var(--font-body);font-size:10.5px;color:var(--faint-fg);letter-spacing:.01em}
.trow.late .gut{color:var(--axi-destructive)}
.trow.past .gut,.trow.past .t{color:var(--muted-fg)}
.lead-ic{display:grid;place-items:center;width:20px;height:20px}
.lead-ic .ic{color:var(--axi-violet)}
.cbox{width:19px;height:19px;border-radius:6px;border:1px solid var(--input);display:grid;place-items:center;color:transparent;transition:border-color .15s}
.cbox:hover{border-color:var(--axi-success)}
.cbox.on{background:var(--axi-success);border-color:var(--axi-success);color:#fff}
.tbody{min-width:0}
.tline{display:flex;flex-wrap:wrap;align-items:center;gap:6px;min-width:0}
.tline .t{font-size:13.5px;font-weight:500;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.meta{display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px;font-size:12px;color:var(--muted-fg);margin-top:2px}
.meta .who{display:inline-flex;align-items:center;gap:5px;color:var(--foreground);font-weight:500}
.meta .who .av{width:16px;height:16px;border-radius:999px;display:grid;place-items:center;font-size:8.5px;font-weight:600;background:var(--secondary);color:var(--muted-fg);border:1px solid var(--border)}
.meta .dot{color:var(--faint-fg)}
.meta .ai{display:inline-flex;align-items:center;gap:4px;color:var(--axi-violet)}
.meta .ai .ic{width:12px;height:12px}
.reason{display:flex;align-items:flex-start;gap:6px;font-size:12px;color:var(--muted-fg);margin-top:3px;line-height:1.4}
.reason .ic{width:13px;height:13px;margin-top:2px;color:var(--faint-fg)}
.trow.fail .reason .ic{color:var(--axi-destructive)}
.tail{display:flex;align-items:center;gap:8px;padding-right:16px}
.inline-acts{display:flex;gap:6px}
.trow .acts{display:flex;align-items:center;gap:2px;color:var(--faint-fg)}
.trow .acts .btn-icon:hover{background:var(--secondary);color:var(--foreground)}
@media (max-width:720px){
  .trow{grid-template-columns:3px 52px 20px minmax(0,1fr);row-gap:8px;padding-bottom:12px}
  .tail{grid-column:2 / -1;padding-right:16px}
  .inline-acts{flex-wrap:wrap}
}

/* Badge de estado: superficie secondary + punto de tono (AA en claro) */
.badge{display:inline-flex;align-items:center;gap:6px;height:21px;padding:0 9px;border-radius:999px;font-size:11px;font-weight:500;border:1px solid var(--border);background:var(--secondary);color:var(--foreground);white-space:nowrap}
.badge i{width:6px;height:6px;border-radius:50%;background:var(--faint-fg);flex:none}
.badge.info i{background:var(--axi-info)}
.badge.success i{background:var(--axi-success)}
.badge.warning i{background:var(--axi-warning)}
.badge.destructive i{background:var(--axi-destructive)}
.badge.violet i{background:var(--axi-violet)}
.badge .spin{width:11px;height:11px;animation:spin 1s linear infinite;color:var(--axi-info)}
@keyframes spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.badge .spin{animation:none}}

/* Línea de «ahora» */
.now{display:grid;grid-template-columns:3px 62px 1fr;align-items:center;gap:0 12px;padding:0 16px 0 0}
.now .lbl{font-family:var(--font-mono);font-size:10.5px;color:var(--axi-brand);text-align:right;letter-spacing:.02em}
.now .rule{height:1px;background:linear-gradient(to right,var(--axi-brand),color-mix(in srgb,var(--axi-brand) 10%,transparent));position:relative}
.now .rule::before{content:"";position:absolute;left:-3px;top:-2px;width:5px;height:5px;border-radius:50%;background:var(--axi-brand)}
@media (max-width:720px){.now{grid-template-columns:3px 52px 1fr}}

/* Pie */
.foot{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;padding:12px 4px 0;font-size:12.5px;color:var(--muted-fg)}
.pager{display:flex;gap:4px}
.pager button{width:28px;height:28px;border-radius:var(--r-sm);border:1px solid var(--border);display:grid;place-items:center;color:var(--muted-fg)}
.pager button[aria-current="true"]{background:var(--accent);color:var(--foreground);border-color:color-mix(in srgb,var(--axi-brand) 40%,var(--background))}

/* ─────────── Agenda «Programados» ─────────── */
.agenda{margin-top:18px;display:flex;flex-direction:column;gap:16px}
.day{border:1px solid var(--border);border-radius:var(--r-lg);background:var(--background);overflow:hidden}
.day-head{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:8px;padding:10px 16px;background:var(--secondary);border-bottom:1px solid var(--border)}
.day-head h3{font-size:13px;font-weight:600}
.day-head h3 span{color:var(--muted-fg);font-weight:400;margin-left:6px;font-size:12px}
.day-head .sum{font-size:12px;color:var(--muted-fg);display:flex;flex-wrap:wrap;gap:6px 14px}
.day-head .sum span{display:inline-flex;gap:5px;align-items:center}
.day-head .sum .ic{width:13px;height:13px}
.band{display:flex;align-items:center;gap:8px;padding:6px 16px;font-size:11.5px;color:var(--muted-fg);background:color-mix(in srgb,var(--muted) 70%,transparent);border-top:1px solid var(--border-soft)}
.band .ic{width:13px;height:13px}
.band .hh{font-family:var(--font-mono);width:46px;color:var(--faint-fg)}

/* ─────────── Vacío que enseña ─────────── */
.empty{margin-top:18px;border:1px solid var(--border);border-radius:var(--r-lg);background:var(--background);padding:40px 24px;text-align:center}
.empty .glyph{width:52px;height:52px;margin:0 auto 14px;border-radius:var(--r-lg);display:grid;place-items:center;background:var(--secondary);border:1px solid var(--border);color:var(--muted-fg)}
.empty h3{font-size:16px}
.empty p{max-width:44ch;margin:6px auto 0;font-size:13px;color:var(--muted-fg)}
.paths{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-top:18px}
.path{display:flex;gap:10px;align-items:flex-start;text-align:left;width:250px;padding:12px 14px;border:1px solid var(--border);border-radius:var(--r-md);background:var(--background)}
.path:hover{border-color:color-mix(in srgb,var(--foreground) 24%,var(--background))}
.path .ic{margin-top:2px;color:var(--axi-violet)}
.path b{display:block;font-size:13px;font-weight:500}
.path small{display:block;font-size:11.5px;color:var(--muted-fg);line-height:1.4;margin-top:2px}

/* ─────────── Notas (chrome del mockup) ─────────── */
.notes{max-width:1120px;margin:0 auto;padding:22px 24px 0}
.notes h2{font-size:18px}
.notes .lede{font-size:13px;color:var(--muted-fg);margin-top:4px;max-width:70ch}
.cols{display:grid;gap:14px;grid-template-columns:repeat(2,minmax(0,1fr));margin-top:18px}
@media (max-width:820px){.cols{grid-template-columns:1fr}}
.card{border:1px solid var(--border);border-radius:var(--r-lg);background:var(--background);padding:16px 18px}
.card h3{font-size:12px;letter-spacing:.07em;text-transform:uppercase;color:var(--muted-fg)}
.card ol,.card ul{margin:12px 0 0;padding:0;list-style:none;display:grid;gap:12px}
.card li{display:grid;grid-template-columns:20px minmax(0,1fr);gap:10px;font-size:13px}
.card li .num{font-family:var(--font-mono);font-size:11px;color:var(--faint-fg);padding-top:3px}
.card li .ic{margin-top:3px;color:var(--faint-fg)}
.card li b{font-weight:500}
.card li small{display:block;font-size:12px;color:var(--muted-fg);line-height:1.45;margin-top:2px}
.card li code{font-family:var(--font-mono);font-size:11.5px;padding:1px 5px;border-radius:5px;background:var(--secondary)}
"""


# ───────────────────────── Piezas ─────────────────────────
def badge(label, tone="neutral", spin=False):
    inner = ic("loader-circle", "spin", 11) if spin else "<i></i>"
    return f'<span class="badge {tone}">{inner}{label}</span>'


def initials(name):
    parts = [p for p in name.split(" ") if p]
    return (parts[0][0] + (parts[1][0] if len(parts) > 1 else "")).upper()


def trow(hour, title, contact, *, day=None, medium="human", state=None, reason=None,
         agent=None, flags=(), acts=None, done=False):
    """Una fila. El canalon lleva la hora ABSOLUTA; el estado va a la derecha."""
    cls = " ".join(["trow", *flags])
    gut = f'<div class="gut">{hour}' + (f"<small>{day}</small>" if day else "") + "</div>"
    if medium == "human":
        lead = (f'<button class="cbox{" on" if done else ""}" role="checkbox" '
                f'aria-checked="{str(done).lower()}" aria-label="Completar {title}">'
                f'{ic("check", "", 13)}</button>')
    else:
        name = "phone-call" if medium == "call" else "message-square"
        lbl = "La ejecuta un agente por llamada" if medium == "call" else "La ejecuta un agente por mensaje"
        lead = f'<span class="lead-ic"><span class="sr">{lbl}</span>{ic(name, "", 16)}</span>'

    who = f'<span class="who"><span class="av">{initials(contact)}</span>{contact}</span>'
    bits = [who]
    if agent:
        bits.append(f'<span class="dot">&middot;</span><span class="ai">{ic("sparkles","",12)}{agent}</span>')
    meta = f'<div class="meta">{"".join(bits)}</div>'
    body = [f'<div class="tline"><span class="t">{title}</span></div>', meta]
    if reason:
        body.append(f'<div class="reason">{ic("info","",13)}<span>{reason}</span></div>')

    tail = []
    if state:
        tail.append(badge(*state))
    if acts:
        tail.append(f'<div class="inline-acts">{acts}</div>')
    tail.append('<div class="acts"><button class="btn btn-icon" aria-label="Mas acciones">'
                + ic("ellipsis-vertical", "", 14) + "</button></div>")
    return (f'<div class="{cls}"><span class="stripe"></span>{gut}{lead}'
            f'<div class="tbody">{"".join(body)}</div>'
            f'<div class="tail">{"".join(tail)}</div></div>')


def ghead(title, when=None, n=None, late=False):
    dt = f'<span class="dt">{when}</span>' if when else ""
    cnt = f'<span class="n">{n}</span>' if n else ""
    return f'<div class="ghead{" late" if late else ""}"><h3>{title}</h3>{dt}{cnt}</div>'


NOW = '<div class="now"><span></span><span class="lbl">11:20</span><span class="rule"></span></div>'


def tile(value, label, icon, *, active=False, tone="", zero=False):
    cls = " ".join(["tile", tone] + (["zero"] if zero else []))
    return (f'<button class="{cls}" role="radio" aria-checked="{str(active).lower()}">'
            f'<span class="v">{value}</span>'
            f'<span class="k">{ic(icon,"",12)}{label}</span></button>')


def seg(items, label):
    lis = "".join(
        f'<li><button class="seg-item" role="radio" aria-checked="{str(a).lower()}" '
        f'data-active="{str(a).lower()}" data-key="{k}">{(ic(i,v,14) if i else "")}{t}</button></li>'
        for k, t, i, v, a in items
    )
    return (f'<div class="seg" role="radiogroup" aria-label="{label}">'
            f'<span class="seg-pill" data-pill></span><ul class="seg-list">{lis}</ul></div>')


# ───────────────────────── Cabecera del CRM ─────────────────────────
NAV = [("Resumen", 0), ("Contactos", 0), ("Oportunidades", 0), ("Tareas", 1), ("Segmentos", 0), ("Ajustes", 0)]


def header():
    links = "".join(
        f'<a href="#"{" aria-current=\"page\"" if a else ""}>{t}</a>' for t, a in NAV
    )
    return (f'<header class="crm-header"><div class="row"><h1>CRM</h1>'
            f'<nav aria-label="Secciones del CRM">{links}</nav></div></header>')


ACTIONS = (
    '<div class="actions">'
    f'<button class="btn btn-outline">{ic("sparkles","violet",16)}Programar seguimiento</button>'
    f'<button class="btn btn-primary">{ic("plus","",16)}Nueva tarea</button>'
    "</div>"
)


def head(sub):
    return (f'<div class="head"><div><h2>Tareas</h2>'
            f'<p class="sub">{sub}</p></div>{ACTIONS}</div>')


VIEW_SEG = [("list", "Lista", "layout-list", "", True), ("scheduled", "Programados", "calendar-days", "", False)]
VIEW_SEG_SCHED = [("list", "Lista", "layout-list", "", False), ("scheduled", "Programados", "calendar-days", "", True)]


def exec_seg(active):
    return seg([("mixed", "Todas", "", "", active == "mixed"),
                ("user", "Del equipo", "users", "", active == "user"),
                ("agent", "Del agente", "sparkles", "violet", active == "agent")],
               "Filtrar por quien ejecuta")


def toolbar(*, executor="mixed", view="list", picker=None):
    pick = picker or f'{ic("user-round","",14)}<b>Mis tareas</b>{ic("chevron-down","",14)}'
    return (
        '<div class="toolbar">'
        f'<label class="searchbox">{ic("search","",15)}'
        '<input type="text" placeholder="Buscar por contacto u objetivo" aria-label="Buscar tareas">'
        "</label>"
        f'<button class="picker">{pick}</button>'
        '<span class="spacer"></span>'
        f'{seg(VIEW_SEG if view == "list" else VIEW_SEG_SCHED, "Vista de tareas")}'
        '<span class="divider"></span>'
        f"{exec_seg(executor)}"
        "</div>"
    )


FOOT = ('<div class="foot"><span>15 de 38 tareas &middot; Hora de Bogot&aacute; (GMT-5)</span>'
        '<div class="pager">'
        '<button aria-current="true">1</button><button>2</button><button>3</button>'
        f'<button aria-label="Siguiente">{ic("chevron-right","",14)}</button></div></div>')


FAIL_ACTS = (f'<button class="btn btn-outline btn-sm">{ic("history","",13)}Ver ejecuciones</button>'
             f'<button class="btn btn-ghost btn-sm">{ic("refresh-cw","",13)}Reintentar</button>')


# ───────────────────────── Vista 1: bandeja mezclada ─────────────────────────
def score_mixed():
    return ('<div class="score" role="radiogroup" aria-label="Filtrar la bandeja">'
            + tile("14", "abiertas", "inbox", active=True)
            + tile("2", "vencidas", "triangle-alert", tone="alarm")
            + tile("6", "para hoy", "clock")
            + tile("9", "esta semana", "calendar-days")
            + tile("1", "sin asignar", "user-round")
            + "</div>")


ROWS_LATE = (
    trow("17:00", "Enviar la cotizaci&oacute;n del plan anual", "Marcela Ocampo",
         day="mar 16", state=("2 d&iacute;as de retraso", "destructive"), flags=["late"]) +
    trow("09:00", "Confirmar direcci&oacute;n de entrega del pedido #4812", "Juli&aacute;n Restrepo",
         day="ayer", state=("1 d&iacute;a de retraso", "destructive"), flags=["late"])
)

ROWS_TODAY_A = (
    trow("09:00", "Preguntarle si ya revis&oacute; la cotizaci&oacute;n del plan anual", "Ana Guti&eacute;rrez",
         medium="message", agent="Aria", state=("Esperando respuesta", "info"),
         reason="Abri&oacute; con la plantilla de Meta. Si el cliente responde, el agente retoma el objetivo.",
         flags=["ai", "past"]) +
    trow("10:30", "Confirmar inter&eacute;s en el plan Pro", "Camilo V&eacute;lez",
         medium="call", agent="Aria", state=("Llamando", "info", True), flags=["ai", "past"])
)

ROWS_TODAY_B = (
    trow("12:00", "Llamar a recepci&oacute;n de Cl&iacute;nica Norte", "Patricia Ruiz",
         state=("Sin asignar", "neutral")) +
    trow("14:00", "Retomar la conversaci&oacute;n del carrito abandonado", "Laura Pe&ntilde;a",
         medium="message", agent="Aria", state=("En espera", "info"),
         reason="Fuera de la ventana de 24 h de WhatsApp &mdash; lo reintenta a las 20:00.",
         flags=["ai"]) +
    trow("16:30", "Confirmar si recibi&oacute; el cat&aacute;logo", "Diego Salas",
         medium="message", agent="Aria", state=("No se pudo enviar", "destructive"),
         reason="El contacto no tiene ning&uacute;n canal alcanzable.",
         flags=["ai", "fail"], acts=FAIL_ACTS) +
    trow("18:00", "Revisar la propuesta de Distribuidora del Valle", "&Oacute;scar Tamayo")
)

ROWS_TOMORROW = (
    trow("09:00", "Preguntar si ya decidi&oacute; sobre el plan anual", "Sof&iacute;a Mendoza",
         medium="message", agent="Aria", state=("Programada", "neutral"),
         reason="Contacto fr&iacute;o: abrir&aacute; con la plantilla <em>retomar_conversacion</em> &middot; &asymp; US$0,0008.",
         flags=["ai"]) +
    trow("09:00", "Confirmar la cita del lunes", "Andr&eacute;s Quintero",
         medium="call", agent="Leo", state=("Programada", "neutral"),
         reason="Llamar&aacute; y, si no conecta, le escribir&aacute;.", flags=["ai"]) +
    trow("15:00", "Enviar la factura a Almacenes Ruiz", "Nubia Ruiz")
)

ROWS_WEEK = (
    trow("09:00", "Reactivar: no compra desde junio", "H&eacute;ctor Arango", day="lun 22",
         medium="message", agent="Aria", state=("Programada", "neutral"), flags=["ai"]) +
    trow("11:00", "Preparar la demo para Inversiones Caribe", "Ximena Lozano", day="lun 22") +
    trow("16:00", "Llamar para la renovaci&oacute;n anual", "Rodrigo Pineda", day="mi&eacute; 24")
)


def view_inbox():
    return (f'<main class="wrap" id="view-inbox">'
            + head("Lo que el equipo y los agentes tienen entre manos, en hora de Bogot&aacute;.")
            + score_mixed()
            + toolbar()
            + '<div class="glist">'
            + ghead("Vencidas", n="2", late=True) + ROWS_LATE
            + ghead("Hoy", "jueves 18 de septiembre", "6") + ROWS_TODAY_A + NOW + ROWS_TODAY_B
            + ghead("Ma&ntilde;ana", "viernes 19 de septiembre", "3") + ROWS_TOMORROW
            + ghead("Esta semana", "22 &ndash; 26 de septiembre", "3") + ROWS_WEEK
            + "</div>" + FOOT + "</main>")


# ───────────────────────── Vista 2: solo agente ─────────────────────────
def score_agent():
    return ('<div class="score" role="radiogroup" aria-label="Filtrar los seguimientos del agente">'
            + tile("18", "programadas", "sparkles", active=True)
            + tile("5", "esperando respuesta", "hourglass")
            + tile("3", "en espera", "clock")
            + tile("1", "sin enviar", "triangle-alert", tone="alarm")
            + tile("3", "acabaron en compra", "circle-dollar-sign", tone="good")
            + "</div>")


AGENT_STRIP = (
    '<div class="agent-strip">'
    f'<span class="lead">{ic("wand-sparkles","",16)}Hoy, tus agentes</span>'
    '<span class="facts">'
    f'<span>{ic("send","",13)}<b>12</b> seguimientos</span>'
    f'<span>{ic("message-square","",13)}<b>4</b> respondieron</span>'
    f'<span>{ic("phone-call","",13)}<b>2</b> llamadas conectadas</span>'
    f'<span>{ic("calendar-days","",13)}<b>1</b> cita agendada</span>'
    "</span>"
    f'<a href="#">Ver el resumen{ic("arrow-right","",13)}</a>'
    "</div>"
)

ROWS_AGENT_DONE = (
    trow("08:15", "Confirmar si le lleg&oacute; el comprobante", "Valeria C&oacute;rdoba",
         medium="message", agent="Aria", state=("Enviada", "success"), flags=["ai", "past"]) +
    trow("08:40", "Retomar tras la visita a la tienda", "Mauricio Gil",
         medium="message", agent="Aria", state=("Enviado &middot; sin respuesta", "neutral"),
         reason="El cliente no respondi&oacute; a la apertura.", flags=["ai", "past"])
)

ROWS_AGENT_WEEK = (
    trow("09:00", "Reactivar: no compra desde junio", "H&eacute;ctor Arango", day="lun 22",
         medium="message", agent="Aria", state=("Programada", "neutral"), flags=["ai"]) +
    trow("10:00", "Paso 2 de <em>Post-captaci&oacute;n</em>: confirmar inter&eacute;s", "Tatiana Bedoya",
         day="lun 22", medium="call", agent="Leo", state=("Programada", "neutral"),
         reason="Se detiene sola si el cliente responde antes.", flags=["ai"])
)


def view_agent():
    picker = f'{ic("sparkles","violet",14)}<b>Todos los agentes</b>{ic("chevron-down","",14)}'
    return (f'<main class="wrap" id="view-agent" hidden>'
            + head("Lo que tus agentes van a hacer, y lo que ya hicieron hoy.")
            + score_agent()
            + AGENT_STRIP
            + toolbar(executor="agent", picker=picker)
            + '<div class="glist">'
            + ghead("Hoy", "jueves 18 de septiembre", "7") + ROWS_AGENT_DONE + ROWS_TODAY_A + NOW
            + trow("14:00", "Retomar la conversaci&oacute;n del carrito abandonado", "Laura Pe&ntilde;a",
                   medium="message", agent="Aria", state=("En espera", "info"),
                   reason="Fuera de la ventana de 24 h de WhatsApp &mdash; lo reintenta a las 20:00.",
                   flags=["ai"])
            + trow("16:30", "Confirmar si recibi&oacute; el cat&aacute;logo", "Diego Salas",
                   medium="message", agent="Aria", state=("No se pudo enviar", "destructive"),
                   reason="El contacto no tiene ning&uacute;n canal alcanzable.",
                   flags=["ai", "fail"], acts=FAIL_ACTS)
            + ghead("Ma&ntilde;ana", "viernes 19 de septiembre", "2")
            + trow("09:00", "Preguntar si ya decidi&oacute; sobre el plan anual", "Sof&iacute;a Mendoza",
                   medium="message", agent="Aria", state=("Programada", "neutral"),
                   reason="Contacto fr&iacute;o: abrir&aacute; con la plantilla <em>retomar_conversacion</em> &middot; &asymp; US$0,0008.",
                   flags=["ai"])
            + trow("09:00", "Confirmar la cita del lunes", "Andr&eacute;s Quintero",
                   medium="call", agent="Leo", state=("Programada", "neutral"),
                   reason="Llamar&aacute; y, si no conecta, le escribir&aacute;.", flags=["ai"])
            + ghead("Esta semana", "22 &ndash; 26 de septiembre", "2") + ROWS_AGENT_WEEK
            + "</div>" + FOOT + "</main>")


# ───────────────────────── Vista 3: programados ─────────────────────────
def day_card(title, when, sums, rows, *, band=None):
    s = "".join(f'<span>{ic(i,"",13)}{t}</span>' for i, t in sums)
    b = (f'<div class="band">{ic("moon","",13)}<span class="hh">20:00</span>'
         f'<span>{band}</span></div>') if band else ""
    return (f'<section class="day"><div class="day-head">'
            f'<h3>{title}<span>{when}</span></h3><div class="sum">{s}</div></div>'
            f"{rows}{b}</section>")


def view_scheduled():
    return (f'<main class="wrap" id="view-scheduled" hidden>'
            + head("La agenda del agente: qu&eacute; va a pasar, y a qu&eacute; hora.")
            + score_agent()
            + toolbar(executor="agent", view="scheduled",
                      picker=f'{ic("sparkles","violet",14)}<b>Todos los agentes</b>{ic("chevron-down","",14)}')
            + '<div class="agenda">'
            + day_card("Hoy", "jueves 18 de septiembre",
                       [("message-square", "3 mensajes"), ("phone-call", "1 llamada")],
                       ROWS_TODAY_A + NOW +
                       trow("14:00", "Retomar la conversaci&oacute;n del carrito abandonado", "Laura Pe&ntilde;a",
                            medium="message", agent="Aria", state=("En espera", "info"), flags=["ai"]),
                       band="A partir de las 20:00 el agente no escribe (horario silencioso).")
            + day_card("Ma&ntilde;ana", "viernes 19 de septiembre",
                       [("message-square", "1 mensaje"), ("phone-call", "1 llamada")],
                       ROWS_TOMORROW[:ROWS_TOMORROW.rfind('<div class="trow')])
            + day_card("Lunes", "22 de septiembre",
                       [("message-square", "1 mensaje"), ("phone-call", "1 llamada")],
                       ROWS_AGENT_WEEK)
            + "</div></main>")


# ───────────────────────── Vista 4: vac&iacute;o ─────────────────────────
def view_empty():
    return (f'<main class="wrap" id="view-empty" hidden>'
            + head("Lo que el equipo y los agentes tienen entre manos, en hora de Bogot&aacute;.")
            + '<div class="score" role="radiogroup" aria-label="Filtrar la bandeja">'
            + tile("0", "abiertas", "inbox", active=True, zero=True)
            + tile("0", "vencidas", "triangle-alert", zero=True)
            + tile("0", "para hoy", "clock", zero=True)
            + tile("0", "esta semana", "calendar-days", zero=True)
            + tile("0", "sin asignar", "user-round", zero=True)
            + "</div>"
            + toolbar()
            + '<div class="empty">'
            f'<div class="glyph">{ic("inbox","",24)}</div>'
            "<h3>Nada pendiente por aqu&iacute;</h3>"
            "<p>Cuando haya un pendiente aparecer&aacute; aqu&iacute; con su d&iacute;a y su hora. "
            "Hay dos formas de empezar:</p>"
            '<div class="paths">'
            f'<button class="path">{ic("sparkles","",16)}<span><b>Programar un seguimiento</b>'
            "<small>Eliges el objetivo y la hora; el agente le escribe o le llama al cliente.</small></span></button>"
            f'<button class="path">{ic("plus","",16)}<span><b>Crear una tarea del equipo</b>'
            "<small>Un pendiente para una persona, con vencimiento y responsable.</small></span></button>"
            "</div></div></main>")


# ───────────────────────── Vista 5: qué cambia ─────────────────────────
PROPOSALS = [
    ("Marcador que <em>es</em> el filtro",
     "Las cinco cifras de arriba dejan de ser texto muerto y pasan a ser el filtro "
     "(<code>role=radiogroup</code>). Hoy &laquo;2 vencidas&raquo; y el bot&oacute;n &laquo;Vencidas&raquo; son "
     "dos cosas distintas que dicen lo mismo. Precedente: los contadores pulsables de la bandeja de conversaciones."),
    ("Una sola barra de trabajo",
     "Buscador + &laquo;Mis tareas&nbsp;&#9662;&raquo; + Lista/Programados + Todas/Del equipo/Del agente, "
     "en una fila. Sustituye a las cuatro filas apiladas de hoy. El buscador por contacto u objetivo "
     "no existe todav&iacute;a y es la petici&oacute;n m&aacute;s obvia cuando la bandeja pasa de 30 tareas."),
    ("Lista agrupada por d&iacute;a, con canal&oacute;n de hora",
     "Vencidas / Hoy / Ma&ntilde;ana / Esta semana, con cabecera pegajosa y la hora absoluta en mono a la "
     "izquierda. Es la mejor idea de &laquo;Programados&raquo; tra&iacute;da a la vista por defecto: la lista "
     "plana no responde a &laquo;qu&eacute; sigue&raquo;."),
    ("L&iacute;nea de &laquo;ahora&raquo;",
     "Una regla coral dentro del grupo de Hoy separa lo que ya pas&oacute; de lo que viene. Es la &uacute;nica "
     "licencia decorativa de la pantalla, y es informaci&oacute;n."),
    ("Franja de estado en el borde de la fila",
     "3&nbsp;px a la izquierda: rojo si est&aacute; vencida o no sali&oacute;, violeta si la ejecuta un agente. "
     "Deja escanear la columna sin leer una palabra, y respeta el techo de tinte del 14&nbsp;%."),
    ("Acciones en l&iacute;nea en lo que fall&oacute;",
     "&laquo;Ver ejecuciones&raquo; y &laquo;Reintentar&raquo; salen del men&uacute; &#8942; y se ponen en la fila. "
     "Una tarea que no sali&oacute; es la &uacute;nica que pide una decisi&oacute;n ahora."),
    ("Franja &laquo;Hoy, tus agentes&raquo;",
     "El digest de F5 deja de vivir solo en la campanita y encabeza el modo agente: 12 seguimientos, "
     "4 respondieron, 2 llamadas conectadas, 1 cita. Es la respuesta a &laquo;&iquest;esto sirve para algo?&raquo;."),
    ("Vac&iacute;o que ense&ntilde;a",
     "En vez de un reloj gen&eacute;rico, las dos rutas reales. Un tenant nuevo aterriza aqu&iacute; con cero tareas: "
     "es la pantalla que m&aacute;s se ve el primer d&iacute;a y la que menos trabajo ten&iacute;a."),
]

REMOVALS = [
    ("Los <em>chips</em> de estad&iacute;sticas",
     "Absorbidos por el marcador. Misma informaci&oacute;n, la mitad de altura, y ahora se pueden pulsar."),
    ("El segmentado &laquo;Vence:&raquo;",
     "Sus cuatro valores son cuatro fichas del marcador. Una fila menos."),
    ("El segmentado &laquo;Mis tareas / Sin asignar / Todas&raquo;",
     "Pasa al selector &laquo;Mis tareas&nbsp;&#9662;&raquo; de la barra: es un eje que se toca una vez al d&iacute;a, "
     "no merece una fila permanente. &laquo;Sin asignar&raquo; sigue a un clic desde su ficha."),
    ("El segmentado &laquo;&Uacute;ltima ejecuci&oacute;n&raquo; del modo agente",
     "Sus tres valores (esperando / en espera / sin enviar) ya son fichas del marcador en ese modo. "
     "Desaparece una fila que solo exist&iacute;a a veces &mdash; y un salto de layout."),
    ("El ancho <code>max-w-4xl</code>",
     "896&nbsp;&rarr;&nbsp;1120&nbsp;px. El canal&oacute;n de hora y el estado a la derecha necesitan el espacio; "
     "a 896 la fila se apelotona en cuanto el objetivo pasa de seis palabras."),
]

KEEP = [
    ("La bandeja sigue siendo <em>una</em>",
     "Mezclada por defecto, con el agente como filtro y no como pesta&ntilde;a. Separarla convertir&iacute;a las "
     "tareas de IA en un rinc&oacute;n que nadie visita &mdash; la decisi&oacute;n ya estaba tomada en F2."),
    ("<code>deferred</code> nunca se pinta en &aacute;mbar",
     "&laquo;En espera&raquo; es operaci&oacute;n normal: la ventana de 24&nbsp;h se cierra sola. Pintarla de alarma "
     "es lo que empuja a un tenant a apagar la automatizaci&oacute;n."),
    ("Los badges son superficie neutra + punto de color",
     "Ning&uacute;n badge tintado: al 12&nbsp;% de tinte el verde se queda en 2,9:1 en tema claro."),
    ("Las tareas de agente no llevan casilla",
     "Las cierra el motor, no la persona. El hueco lo ocupa el icono del medio en curso."),
    ("Violeta = IA, y solo en el icono",
     "Sin superficies violetas en zona de trabajo."),
]


def note_card(title, items, numbered=False):
    lis = []
    for i, (t, d) in enumerate(items, 1):
        mark = f'<span class="num">{i:02d}</span>' if numbered else ic("check", "", 14)
        lis.append(f"<li>{mark}<span><b>{t}</b><small>{d}</small></span></li>")
    tag = "ol" if numbered else "ul"
    return f'<div class="card"><h3>{title}</h3><{tag}>{"".join(lis)}</{tag}></div>'


def view_notes():
    return ('<section class="notes" id="view-notes" hidden>'
            "<h2>Qu&eacute; cambia en <code>/crm/tasks</code></h2>"
            '<p class="lede">La vista de hoy apila cuatro filas de controles &mdash;unos 150&nbsp;px&mdash; antes de '
            "la primera tarea, y encabeza con cuatro cifras que no se pueden pulsar. El rendimiento del rediseño no "
            "es est&eacute;tico: es que la pantalla pase de describir filtros a responder &laquo;qu&eacute; sigue&raquo;.</p>"
            + '<div class="cols">'
            + note_card("Controles nuevos &mdash; a aprobar antes de codificar", PROPOSALS, numbered=True)
            + "<div>"
            + note_card("Lo que desaparece", REMOVALS)
            + '<div style="height:14px"></div>'
            + note_card("Lo que no se toca, a prop&oacute;sito", KEEP)
            + "</div></div></section>")


# ───────────────────────── JS ─────────────────────────
JS = r"""
(function(){
  var ACTIVE='[data-active="true"]';
  function placePill(s){var p=s.querySelector("[data-pill]"),a=s.querySelector(ACTIVE);if(!p)return;
    if(!a){p.style.opacity="0";return}
    p.style.width=a.offsetWidth+"px";p.style.height=a.offsetHeight+"px";p.style.top="2px";p.style.left="0";
    p.style.transform="translateX("+(a.offsetLeft-2)+"px)";p.style.opacity="1"}
  function placeAll(){document.querySelectorAll(".seg").forEach(placePill)}

  document.querySelectorAll('.seg [role="radio"]').forEach(function(b){
    b.addEventListener("click",function(){
      var s=b.closest(".seg");
      s.querySelectorAll('[role="radio"]').forEach(function(o){o.setAttribute("aria-checked","false");o.setAttribute("data-active","false")});
      b.setAttribute("aria-checked","true");b.setAttribute("data-active","true");placePill(s);
      var k=b.getAttribute("data-key");
      if(k==="scheduled")show("scheduled");
      if(k==="list")show(document.getElementById("view-agent").hidden?"inbox":"agent");
      if(k==="agent")show("agent");
      if(k==="mixed"||k==="user")show("inbox");
    });
  });

  /* fichas del marcador: son el filtro */
  document.querySelectorAll('.score [role="radio"]').forEach(function(b){
    b.addEventListener("click",function(){
      b.parentElement.querySelectorAll('[role="radio"]').forEach(function(o){o.setAttribute("aria-checked","false")});
      b.setAttribute("aria-checked","true");
    });
  });

  /* casillas */
  document.querySelectorAll(".cbox").forEach(function(b){
    b.addEventListener("click",function(){
      var on=b.getAttribute("aria-checked")==="true";
      b.setAttribute("aria-checked",String(!on));b.classList.toggle("on",!on);
      var row=b.closest(".trow");if(row)row.querySelector(".t").style.textDecoration=on?"":"line-through";
    });
  });

  /* vistas del mockup */
  var ids={inbox:"view-inbox",agent:"view-agent",scheduled:"view-scheduled",empty:"view-empty",notes:"view-notes"};
  function show(n){
    Object.keys(ids).forEach(function(k){document.getElementById(ids[k]).hidden=(k!==n)});
    document.querySelectorAll(".mk-view").forEach(function(b){b.setAttribute("aria-pressed",String(b.getAttribute("data-view")===n))});
    window.scrollTo({top:0});requestAnimationFrame(placeAll);
  }
  document.querySelectorAll(".mk-view").forEach(function(b){
    b.addEventListener("click",function(){show(b.getAttribute("data-view"))});
  });

  /* tema */
  var root=document.documentElement,tb=document.getElementById("theme-btn"),tt=document.getElementById("theme-txt");
  function isDark(){var t=root.getAttribute("data-theme");return t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches}
  function paint(){tt.textContent=isDark()?"Claro":"Oscuro"}
  tb.addEventListener("click",function(){root.setAttribute("data-theme",isDark()?"light":"dark");paint();requestAnimationFrame(placeAll)});
  paint();
  window.addEventListener("resize",placeAll);
  requestAnimationFrame(placeAll);
  window.addEventListener("load",placeAll);
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(placeAll);
})();
"""

VIEWS = [("inbox", "Bandeja"), ("agent", "Del agente"), ("scheduled", "Programados"),
         ("empty", "Vac&iacute;a"), ("notes", "Qu&eacute; cambia")]


def build():
    css = CSS.replace("__LIGHT__", LIGHT).replace("__DARK__", DARK)
    btns = "".join(
        f'<button class="mk-view" data-view="{k}" aria-pressed="{str(k == "inbox").lower()}">{t}</button>'
        for k, t in VIEWS
    )
    html = f"""<title>Bandeja de tareas</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap">
<style>{css}</style>

<div class="mk-bar" role="toolbar" aria-label="Controles del mockup">
  <span class="mk-tag">{ic("sparkles", "violet", 14)}Mockup &middot; /crm/tasks</span>
  <div class="mk-grp" role="group" aria-label="Vistas">{btns}</div>
  <button class="mk-theme" id="theme-btn">{ic("moon", "", 13)}<span id="theme-txt">Oscuro</span></button>
</div>

{header()}
{view_inbox()}
{view_agent()}
{view_scheduled()}
{view_empty()}
{view_notes()}
<script>{JS}</script>
"""
    out = S / "crm-tasks-premium.html"
    out.write_text(html, encoding="utf-8")
    print(f"escrito {out} ({out.stat().st_size} bytes), iconos: {len(LUCIDE)}")


if __name__ == "__main__":
    build()
