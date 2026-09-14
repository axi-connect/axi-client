#!/usr/bin/env python3
"""Ensambla el mockup navegable de F2 del programa «Seguimiento autónomo»
(programar seguimiento, bandeja, programados, rail de ejecución, ajustes y
plantillas de Meta) en un solo HTML autocontenido.

Iconos: se extraen de node_modules/lucide-react (v0.539) y se cachean en
agent-tasks-schedule.lucide.json para que el HTML se regenere sin node_modules.
Tokens: copiados literalmente de src/app/globals.css — el mockup NO inventa paleta.
Fuentes: Poppins y Geist Mono por Google Fonts (Nexa es local; los headings caen a
Poppins 600, igual que el mockup de Fase 0)."""
import json, pathlib, re, sys

S = pathlib.Path(__file__).parent
ROOT = S.parent.parent.parent
ICON_CACHE = S / "agent-tasks-schedule.lucide.json"
ICONS = [
    "sparkles", "message-square", "phone-call", "phone", "clock", "check", "chevron-down",
    "chevron-right", "calendar", "info", "triangle-alert", "plus", "ellipsis-vertical",
    "circle-user", "history", "pencil", "send", "circle-x", "power", "refresh-cw", "search",
    "list-checks", "kanban", "users", "settings", "sun", "moon", "x", "loader-circle",
    "circle-check", "pause-circle", "star", "file-text", "external-link", "arrow-right",
    "zap", "bell", "hourglass", "voicemail", "phone-off", "message-circle", "sliders-horizontal",
    "badge-check", "circle-dollar-sign", "layout-list", "calendar-days", "wand-sparkles",
]

def load_icons():
    cache = json.load(open(ICON_CACHE)) if ICON_CACHE.exists() else {}
    src = ROOT / "node_modules/lucide-react/dist/esm/icons"
    missing = [n for n in ICONS if n not in cache]
    for name in missing:
        f = src / f"{name}.js"
        if not f.exists():
            sys.exit(f"icono lucide no encontrado: {name}")
        body = f.read_text()
        # Alias (pause-circle → circle-pause): el fichero solo re-exporta.
        for _ in range(3):
            alias = re.search(r"from '\./([\w-]+)\.js'", body)
            if "__iconNode = [" in body or alias is None:
                break
            body = (src / f"{alias.group(1)}.js").read_text()
        # Solo el array externo termina en `];` (los internos en `],` o `]\n`).
        m = re.search(r"const __iconNode = (\[[\s\S]*?\]);", body)
        if m is None:
            sys.exit(f"no se pudo leer el icono lucide: {name}")
        # Literal JS (claves sin comillas): se leen tag + atributos por regex.
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
LIGHT = """--background:#ffffff;--foreground:#171717;--axi-brand:#e65759;--axi-brand-2:#e02f2f;--axi-violet:#7c3aed;--axi-amber:#f0a431;--axi-muted:#f4f4f5;--axi-success:#16a34a;--axi-warning:#d97706;--axi-destructive:#dc2626;--axi-info:#2563eb;--axi-on-color:#ffffff;--accent-mix:14%;color-scheme:light;"""
DARK = """--background:#0a0a0a;--foreground:#ededed;--axi-brand:#fb7185;--axi-brand-2:#df4f4f;--axi-violet:#a78bfa;--axi-amber:#fbbf24;--axi-muted:#18181b;--axi-success:#4ade80;--axi-warning:#fbbf24;--axi-destructive:#f87171;--axi-info:#60a5fa;--axi-on-color:#0a0a0a;--accent-mix:42%;color-scheme:dark;"""

CSS = r"""
:root{ __LIGHT__ }
@media (prefers-color-scheme: dark){ :root:not([data-theme="light"]){ __DARK__ } }
:root[data-theme="dark"]{ __DARK__ }
:root{
  --border:color-mix(in srgb, var(--foreground) 12%, var(--background));
  --border-soft:color-mix(in srgb, var(--border) 50%, transparent);
  --secondary:color-mix(in srgb, var(--foreground) 6%, var(--background));
  --muted:var(--axi-muted);
  --muted-fg:color-mix(in srgb, var(--foreground) 70%, transparent);
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
body{background:var(--background);color:var(--foreground);font-family:var(--font-body);font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased;padding-bottom:88px}
h1,h2,h3,h4{margin:0;font-weight:600;letter-spacing:-.01em}
button,input,select,textarea{font:inherit;color:inherit}
button{cursor:pointer;background:none;border:0;padding:0}
a{color:inherit;text-decoration:none}
[hidden]{display:none!important}
.ic{flex:none}
.muted{color:var(--muted-fg)}
.mono,.tnum{font-variant-numeric:tabular-nums}
.mono{font-family:var(--font-mono);font-size:.92em}
.violet{color:var(--axi-violet)}
.brand{color:var(--axi-brand)}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
:focus-visible{outline:none;box-shadow:0 0 0 3px color-mix(in srgb,var(--axi-brand) 50%,transparent)}

/* ─────────── Chrome del mockup (NO es producto) ─────────── */
.mk-bar{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:100;display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:center;padding:6px 8px;border-radius:999px;font-size:11.5px;
  background:color-mix(in srgb,var(--background) 80%,transparent);border:1px solid color-mix(in srgb,var(--border) 60%,transparent);box-shadow:var(--shadow-overlay);backdrop-filter:saturate(160%) blur(16px);max-width:calc(100vw - 24px)}
.mk-tag{display:flex;align-items:center;gap:6px;padding:0 8px;font-weight:600;color:var(--muted-fg);white-space:nowrap}
.mk-grp{display:flex;gap:2px;padding:2px;border-radius:999px;background:var(--secondary)}
.mk-grp b{padding:0 6px;font-weight:600;color:var(--muted-fg);align-self:center;font-size:10px;letter-spacing:.06em;text-transform:uppercase}
.mk-grp button{padding:5px 10px;border-radius:999px;color:var(--muted-fg);font-weight:500;white-space:nowrap}
.mk-grp button[aria-pressed="true"]{background:var(--accent);color:var(--foreground)}
.mk-theme{display:flex;align-items:center;gap:5px;padding:5px 10px;border-radius:999px;color:var(--muted-fg);font-weight:500}

/* ─────────── Cabecera CRM (CrmNav) ─────────── */
.crm-header{border-bottom:1px solid var(--border);padding:10px 24px}
.crm-header .row{display:flex;flex-wrap:wrap;align-items:center;gap:12px 24px}
.crm-header h1{font-size:18px;font-weight:700}
.wrap{max-width:1280px;margin:0 auto;padding:24px}
.narrow{max-width:896px;margin:0 auto}

/* ─────────── Pastilla única (segmented.tsx) ─────────── */
.seg{position:relative;display:inline-flex;border-radius:999px;padding:4px;border:1px solid var(--border);background:var(--background);box-shadow:var(--shadow-float);max-width:100%;overflow-x:auto;scrollbar-width:none}
.seg[data-surface="inline"]{background:color-mix(in srgb,var(--secondary) 60%,transparent);box-shadow:none}
.seg[data-size="sm"]{padding:2px}
.seg-list{display:flex;gap:2px;margin:0;padding:0;list-style:none;position:relative;z-index:1}
.seg-item{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;font-size:13px;font-weight:500;color:var(--muted-fg);white-space:nowrap;transition:color .2s}
.seg[data-size="sm"] .seg-item{padding:4px 10px;font-size:12px}
.seg-item .ic{width:16px;height:16px}
.seg[data-size="sm"] .seg-item .ic{width:14px;height:14px}
.seg-item[aria-current="page"],.seg-item[data-active="true"],.seg-item[data-state="active"]{color:var(--foreground)}
.seg-item[aria-current="page"] .ic,.seg-item[data-active="true"] .ic,.seg-item[data-state="active"] .ic{color:var(--axi-brand)}
.seg-pill{position:absolute;z-index:0;border-radius:999px;background:var(--accent);transition:transform .25s cubic-bezier(.2,.8,.2,1),width .25s;opacity:0}
.seg-count{margin-left:2px;font-size:11px;padding:0 6px;border-radius:999px;background:var(--secondary);color:var(--muted-fg)}
@media (prefers-reduced-motion:reduce){.seg-pill{transition:none}}

/* ─────────── Botones ─────────── */
.btn{display:inline-flex;align-items:center;gap:8px;height:36px;padding:0 14px;border-radius:999px;font-weight:500;font-size:13px;border:1px solid transparent;transition:background .2s,color .2s,border-color .2s}
.btn .ic{width:16px;height:16px}
.btn-primary{background:var(--axi-brand);color:var(--axi-on-color)}
.btn-primary:hover{background:var(--axi-brand-2)}
.btn-outline{border-color:var(--border);background:var(--background)}
.btn-outline:hover{background:var(--secondary)}
.btn-ghost{color:var(--muted-fg)}
.btn-ghost:hover{background:var(--secondary);color:var(--foreground)}
.btn-icon{width:28px;height:28px;padding:0;justify-content:center;border-radius:var(--r-sm)}
.btn:disabled{opacity:.5;cursor:not-allowed}

/* ─────────── Página de tareas ─────────── */
.page-head{display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:space-between;gap:12px}
.page-head h2{font-size:20px}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.chip{display:inline-flex;align-items:center;gap:5px;height:24px;padding:0 9px;border-radius:999px;border:1px solid var(--border);background:var(--background);font-size:12px;color:var(--muted-fg)}
.chip b{color:var(--foreground);font-weight:600;font-variant-numeric:tabular-nums}
.chip.warn{border-color:color-mix(in srgb,var(--axi-warning) 40%,transparent);background:color-mix(in srgb,var(--axi-warning) 8%,transparent);color:var(--axi-warning)}
.chip.warn b{color:var(--axi-warning)}
.filters{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;margin-top:16px}
.filters .lbl{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--muted-fg)}
.filters-row{display:flex;flex-wrap:wrap;gap:8px 16px;margin-top:8px}

.list{margin:16px 0 0;padding:0;list-style:none;border:1px solid var(--border);border-radius:var(--r-lg);background:var(--background);overflow:hidden}
.row{display:flex;align-items:center;gap:12px;padding:12px 16px;border-top:1px solid var(--border)}
.row:first-child{border-top:0}
.row .lead{width:20px;height:20px;display:grid;place-items:center;flex:none}
.row .body{min-width:0;flex:1}
.row .title{display:flex;flex-wrap:wrap;align-items:center;gap:6px;font-size:14px;font-weight:500}
.row .title .t{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.row .when{font-size:12px;color:var(--muted-fg);margin-top:1px;display:flex;flex-wrap:wrap;gap:4px 8px;align-items:center}
.row .when .abs{color:var(--foreground);font-weight:500}
.row .reason{font-size:12px;color:var(--muted-fg);margin-top:2px}
.row .who{font-size:12px;color:var(--muted-fg);display:inline-flex;align-items:center;gap:4px}
.row .who .ic{width:12px;height:12px}
.row .acts{display:flex;align-items:center;gap:4px;color:var(--muted-fg)}
.row.done .t{color:var(--muted-fg);text-decoration:line-through}
.checkbox{width:20px;height:20px;border-radius:6px;border:1px solid var(--input);display:grid;place-items:center}
.checkbox.on{background:var(--axi-success);border-color:var(--axi-success);color:#fff}

/* Badge de estado: superficie secondary + punto de tono (AA en claro) */
.badge{display:inline-flex;align-items:center;gap:6px;height:20px;padding:0 8px;border-radius:999px;font-size:11px;font-weight:500;border:1px solid var(--border);background:var(--secondary);color:var(--foreground);white-space:nowrap}
.badge i{width:6px;height:6px;border-radius:50%;background:var(--muted-fg);flex:none}
.badge.info i{background:var(--axi-info)}.badge.success i{background:var(--axi-success)}
.badge.warning i{background:var(--axi-warning)}.badge.destructive i{background:var(--axi-destructive)}
.badge .spin{width:11px;height:11px;animation:spin 1s linear infinite;color:var(--axi-info)}
@keyframes spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.badge .spin{animation:none}}

/* ─────────── Pestañas con panel (Tabs pill) ─────────── */
.tabs{margin-top:16px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}

/* ─────────── Agenda «Programados» ─────────── */
.agenda{margin-top:16px;display:flex;flex-direction:column;gap:20px}
.day{border:1px solid var(--border);border-radius:var(--r-lg);background:var(--background);overflow:hidden}
.day-head{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:8px;padding:10px 16px;background:var(--secondary);border-bottom:1px solid var(--border)}
.day-head h3{font-size:13px;font-weight:600}
.day-head h3 span{color:var(--muted-fg);font-weight:500;margin-left:6px}
.day-head .sum{font-size:12px;color:var(--muted-fg);display:flex;gap:12px}
.day-head .sum span{display:inline-flex;gap:4px;align-items:center}
.slot{display:grid;grid-template-columns:64px 20px 1fr auto;gap:0 12px;align-items:center;padding:11px 16px;border-top:1px solid var(--border)}
.slot:first-of-type{border-top:0}
.slot .hh{font-family:var(--font-mono);font-variant-numeric:tabular-nums;font-size:13px;color:var(--foreground)}
.slot .hh small{display:block;font-family:var(--font-body);font-size:10.5px;color:var(--muted-fg)}
.slot .what{min-width:0}
.slot .what .l1{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:13.5px;font-weight:500}
.slot .what .l2{font-size:12px;color:var(--muted-fg);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.slot.quiet{background:color-mix(in srgb,var(--muted) 60%,transparent)}
.slot.quiet .hh{color:var(--muted-fg)}
.day-note{padding:8px 16px;font-size:12px;color:var(--muted-fg);display:flex;gap:8px;align-items:center;border-top:1px dashed var(--border)}
.day-note .ic{width:14px;height:14px;color:var(--axi-info)}

/* ─────────── Modal ─────────── */
.modal-wrap{position:relative;min-height:70vh}
.scrim{position:absolute;inset:0;background:color-mix(in srgb,#000 40%,transparent);border-radius:var(--r-lg)}
.modal{position:relative;z-index:2;max-width:720px;margin:24px auto;background:var(--background);border:1px solid var(--border);border-radius:var(--r-xl);box-shadow:var(--shadow-overlay);overflow:hidden}
.modal-h{padding:20px 24px 12px}
.modal-h h2{font-size:18px;display:flex;align-items:center;gap:8px}
.modal-h p{margin:4px 0 0;font-size:13px;color:var(--muted-fg)}
.modal-b{padding:4px 24px 20px;display:grid;gap:16px}
.modal-f{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;padding:14px 24px;border-top:1px solid var(--border);background:var(--secondary)}
.modal-f .promise{font-size:13px;display:flex;gap:8px;align-items:flex-start;min-width:0}
.modal-f .promise .ic{color:var(--axi-violet);margin-top:2px}
.modal-f .promise b{font-weight:600}
.modal-f .btns{display:flex;gap:8px;margin-left:auto}

.field{display:grid;gap:6px}
.field>label,.field .lab{font-size:12.5px;font-weight:500}
.field .hint{font-size:12px;color:var(--muted-fg)}
.grid2{display:grid;gap:16px;grid-template-columns:1fr 1fr}
@media (max-width:640px){.grid2{grid-template-columns:1fr}}
.control{display:flex;align-items:center;gap:8px;height:36px;padding:0 12px;border:1px solid var(--input);border-radius:var(--r-md);background:var(--background);font-size:13.5px}
.control.locked{background:var(--muted);border-color:var(--border);color:var(--foreground)}
.control .ic{color:var(--muted-fg)}
.control .grow{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
textarea.control{height:auto;min-height:88px;padding:10px 12px;resize:vertical;display:block;width:100%;line-height:1.45}
.counter{text-align:right;font-size:11px;color:var(--muted-fg);font-variant-numeric:tabular-nums}
.ex-chips{display:flex;flex-wrap:wrap;gap:6px}
.ex{font-size:12px;padding:4px 10px;border-radius:999px;border:1px dashed var(--border);color:var(--muted-fg)}
.ex:hover{border-color:var(--foreground);color:var(--foreground)}

/* medio: tres opciones como radios en tarjetas (SegmentedControl no cabe con 2 líneas) */
.medium{display:grid;gap:8px;grid-template-columns:repeat(3,1fr)}
@media (max-width:640px){.medium{grid-template-columns:1fr}}
.opt{display:grid;grid-template-columns:auto 1fr;gap:4px 10px;align-items:start;padding:10px 12px;border:1px solid var(--border);border-radius:var(--r-md);text-align:left;background:var(--background)}
.opt .ic{grid-row:span 2;margin-top:2px;color:var(--muted-fg)}
.opt b{font-size:13px;font-weight:500}
.opt small{font-size:11.5px;color:var(--muted-fg);line-height:1.35}
.opt[aria-checked="true"]{border-color:var(--axi-brand);background:var(--accent)}
.opt[aria-checked="true"] .ic{color:var(--axi-violet)}
.opt[aria-disabled="true"]{opacity:.55;cursor:not-allowed}

.shortcuts{display:flex;flex-wrap:wrap;gap:6px}
.shortcut{font-size:12px;padding:4px 10px;border-radius:999px;border:1px solid var(--border);color:var(--muted-fg)}
.shortcut[aria-pressed="true"]{background:var(--accent);color:var(--foreground);border-color:transparent}
.tz{display:flex;gap:6px;align-items:center;font-size:12px;color:var(--muted-fg)}
.tz .ic{width:13px;height:13px}

.notice{display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border-radius:var(--r-md);border:1px solid var(--border);background:var(--background);font-size:12.5px;line-height:1.45}
.notice .ic{margin-top:2px;flex:none;width:15px;height:15px}
.notice.info .ic{color:var(--axi-info)}
.notice.warn{border-color:color-mix(in srgb,var(--axi-warning) 35%,transparent);background:color-mix(in srgb,var(--axi-warning) 6%,transparent)}
.notice.warn .ic{color:var(--axi-warning)}
.notice.ok .ic{color:var(--axi-success)}
.notice b{font-weight:600}
.notice .cost{margin-left:auto;font-family:var(--font-mono);font-size:12px;color:var(--muted-fg);white-space:nowrap}

.preview{border:1px solid var(--border);border-radius:var(--r-lg);padding:14px;background:color-mix(in srgb,var(--muted) 70%,transparent)}
.preview .from{font-size:11px;color:var(--muted-fg);display:flex;align-items:center;gap:6px;margin-bottom:8px}
.bubble{max-width:420px;padding:10px 12px;border-radius:14px 14px 14px 4px;background:var(--background);border:1px solid var(--border);font-size:13.5px;line-height:1.45;box-shadow:var(--shadow-float)}
.bubble mark{background:var(--accent);color:inherit;border-radius:4px;padding:0 3px}
.bubble time{display:block;text-align:right;font-size:10.5px;color:var(--muted-fg);margin-top:4px}

/* ─────────── Rail (DetailSheet) ─────────── */
.sheet-wrap{display:grid;grid-template-columns:1fr 440px;gap:24px;align-items:start}
@media (max-width:960px){.sheet-wrap{grid-template-columns:1fr}}
.sheet{border:1px solid var(--border);border-radius:var(--r-xl);background:var(--background);box-shadow:var(--shadow-overlay);overflow:hidden}
.sheet-h{padding:18px 20px 12px;border-bottom:1px solid var(--border)}
.sheet-h h2{font-size:16px}
.sheet-h .sub{font-size:13px;color:var(--muted-fg);margin-top:2px}
.sheet-box{margin:12px 20px 0;padding:12px;border-radius:var(--r-md);background:var(--secondary);display:grid;gap:8px;font-size:13px}
.sheet-box .kv{display:flex;justify-content:space-between;gap:12px;align-items:center}
.sheet-box .kv span:first-child{color:var(--muted-fg);font-size:12px}
.sheet-b{padding:16px 20px 20px}
.tl{list-style:none;margin:0;padding:0;display:grid}
.tl li{display:grid;grid-template-columns:24px 1fr;gap:0 12px;position:relative;padding-bottom:16px}
.tl li:not(:last-child)::before{content:"";position:absolute;left:11px;top:26px;bottom:-2px;width:2px;background:var(--border)}
.tl .dot{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:var(--secondary);color:var(--muted-fg)}
.tl .dot .ic{width:13px;height:13px}
.tl .dot.info{color:var(--axi-info)}.tl .dot.success{color:var(--axi-success)}.tl .dot.destructive{color:var(--axi-destructive)}
.tl .dot.violet{color:var(--axi-violet);background:color-mix(in srgb,var(--axi-violet) 12%,transparent)}
.tl .dot.warning{color:var(--axi-warning)}
.tl .ttl{font-size:13.5px;font-weight:500;display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.tl .dsc{font-size:12.5px;color:var(--muted-fg);margin-top:1px}
.tl .meta{font-size:12px;color:var(--muted-fg);margin-top:4px;display:flex;gap:12px;flex-wrap:wrap}
.tl .meta a{color:var(--axi-brand);font-weight:500;display:inline-flex;gap:4px;align-items:center}
.tl .meta a .ic{width:13px;height:13px}
.pill-medium{display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:1px 7px;border-radius:999px;border:1px solid var(--border);color:var(--muted-fg);background:var(--background)}
.pill-medium .ic{width:11px;height:11px}

/* ─────────── Ajustes ─────────── */
.cards{display:grid;gap:16px}
.card{border:1px solid var(--border);border-radius:var(--r-lg);background:var(--background);padding:20px}
.card h3{font-size:14px;font-weight:600;margin-bottom:12px}
.card .info-line{display:flex;gap:10px;font-size:12px;color:var(--muted-fg);margin-top:12px;line-height:1.5}
.card .info-line .ic{margin-top:2px;flex:none;width:14px;height:14px;color:var(--axi-info)}
.card .info-line b{color:var(--foreground);font-weight:600}
.num{display:grid;gap:6px}
.num label{font-size:12.5px;font-weight:500}
.num .control{width:140px;justify-content:space-between}
.num .control .ic{width:14px;height:14px}
.num small{font-size:11.5px;color:var(--muted-fg)}
.kill{display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:space-between;gap:12px}
.kill h3{display:flex;align-items:center;gap:8px;margin-bottom:4px}
.kill p{margin:0;font-size:12px;color:var(--muted-fg)}
.link{color:var(--axi-brand);font-weight:500;display:inline-flex;gap:4px;align-items:center}
.link .ic{width:13px;height:13px}

/* ─────────── Plantillas de Meta ─────────── */
.toolbar{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.toolbar .control{height:34px}
.tbl{width:100%;border-collapse:collapse;margin-top:16px;border:1px solid var(--border);border-radius:var(--r-lg);overflow:hidden;font-size:13px}
.tbl thead th{text-align:left;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted-fg);font-weight:600;padding:10px 14px;background:var(--secondary);border-bottom:1px solid var(--border)}
.tbl td{padding:12px 14px;border-bottom:1px solid var(--border);vertical-align:top}
.tbl tr:last-child td{border-bottom:0}
.tbl .name{font-family:var(--font-mono);font-size:12.5px}
.tbl .body{color:var(--muted-fg);font-size:12.5px;max-width:360px}
.tbl .cost{font-family:var(--font-mono);font-variant-numeric:tabular-nums;white-space:nowrap}
.tbl .why{font-size:12px;color:var(--muted-fg);margin-top:3px}
.tbl .star{color:var(--axi-amber)}
.suggest{display:grid;gap:10px;grid-template-columns:repeat(3,1fr)}
@media (max-width:760px){.suggest{grid-template-columns:1fr}}
.sug{padding:12px;border:1px solid var(--border);border-radius:var(--r-md);text-align:left;background:var(--background);display:grid;gap:6px}
.sug b{font-size:13px;font-weight:600;display:flex;align-items:center;gap:6px}
.sug b .ic{color:var(--axi-violet);width:14px;height:14px}
.sug p{margin:0;font-size:12px;color:var(--muted-fg);line-height:1.4}
.sug .badge{justify-self:start}
.cat{display:grid;gap:8px;grid-template-columns:repeat(3,1fr)}
@media (max-width:640px){.cat{grid-template-columns:1fr}}
.varbar{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:12px;color:var(--muted-fg)}
.varbar .ex{border-style:solid}
.examples{display:grid;gap:8px;grid-template-columns:1fr 1fr}
@media (max-width:640px){.examples{grid-template-columns:1fr}}
.examples .control{font-size:13px}
.examples .control .k{font-family:var(--font-mono);color:var(--muted-fg);font-size:12px}
.steps{display:grid;gap:8px;grid-template-columns:repeat(3,1fr);font-size:12px;color:var(--muted-fg)}
@media (max-width:640px){.steps{grid-template-columns:1fr}}
.steps div{display:flex;gap:8px;align-items:flex-start;padding:8px 10px;border-radius:var(--r-sm);background:var(--secondary)}
.steps .ic{width:14px;height:14px;margin-top:2px;flex:none}
.steps b{color:var(--foreground);font-weight:600}
"""

def badge(label, tone="neutral", spin=False):
    dot = f'{ic("loader-circle","spin",11)}' if spin else "<i></i>"
    return f'<span class="badge {tone}">{dot}{label}</span>'

def seg(items, active, size="sm", surface="inline", label="", role="radio", nav=False):
    lis = []
    for key, text, icon in items:
        icon_html = ic(icon) if icon else ""
        if nav:
            cur = ' aria-current="page"' if key == active else ""
            lis.append(f'<li><a class="seg-item" href="#"{cur}>{icon_html}{text}</a></li>')
        else:
            on = key == active
            lis.append(f'<li><button class="seg-item" role="radio" aria-checked="{str(on).lower()}"{" data-active=\"true\"" if on else ""} data-key="{key}">{icon_html}{text}</button></li>')
    tag = "nav" if nav else "div"
    r = "" if nav else ' role="radiogroup"'
    return (f'<{tag} class="seg" data-size="{size}" data-surface="{surface}"{r} aria-label="{label}">'
            f'<span class="seg-pill" data-pill></span><ul class="seg-list">{"".join(lis)}</ul></{tag}>')

CRM_NAV = seg([("contacts","Contactos","users"),("pipeline","Pipeline","kanban"),("tasks","Tareas","list-checks"),("settings","Configuración","settings")],
              "tasks", size="default", surface="raised", label="Secciones del CRM", nav=True)

def header():
    return f'<header class="crm-header"><div class="row"><h1>CRM</h1>{CRM_NAV}</div></header>'

# ───────────────────────── Datos del mockup ─────────────────────────
ROWS = [
  dict(medium="message", agent="Aria", title="Retomar la cotización del plan anual", contact="Ana Gómez",
       abs="jue 18 sep · 9:00", rel="en 3 días", badge=badge("Programada","info"), reason=None),
  dict(medium="call", agent="Aria", title="Confirmar interés en el módulo de llamadas", contact="Carlos Restrepo",
       abs="hoy · 15:30", rel="en 2 h", badge=badge("Programada","info"), reason=None),
  dict(medium="message", agent="Nova", title="Preguntar si recibió la propuesta", contact="Laura Pérez",
       abs="mié 17 sep · 9:00", rel="en 2 días", badge=badge("Esperando respuesta","info"),
       reason="Abrió con la plantilla «seguimiento_v1» el lun 15 · 9:02. Si Laura responde, el agente retoma el objetivo."),
  dict(medium="call", agent="Aria", title="Reactivar cuenta inactiva", contact="Sofía Martínez",
       abs="hoy · 14:10", rel="hace 20 min", badge=badge("Llamando","info",spin=True), reason=None, live=True),
  dict(medium="message", agent="Nova", title="Recordar el cupón de bienvenida", contact="Diego Torres",
       abs="lun 15 sep · 8:00", rel="hace 6 h", badge=badge("En espera","info"),
       reason="Fuera del horario permitido para escribir · reintenta hoy a las 8:00 a. m."),
  dict(medium="call", agent="Aria", title="Seguimiento de la demo del viernes", contact="Valentina Ruiz",
       abs="dom 14 sep · 11:00", rel="ayer", badge=badge("Llamada realizada","success"), reason="Duró 4:12 · dejó cita para el jueves", done=True),
  dict(medium="message", agent="Nova", title="Ofrecer renovación anticipada", contact="Mateo Herrera",
       abs="sáb 13 sep · 9:00", rel="hace 2 días", badge=badge("Enviado · sin respuesta","neutral"),
       reason="Abrió con plantilla el jue 11 · 9:00 · Mateo no respondió en 48 h", done=True),
  dict(medium="call", agent="Aria", title="Cobrar factura vencida", contact="Juliana Castro",
       abs="vie 12 sep · 10:00", rel="hace 3 días", badge=badge("No se pudo llamar","destructive"),
       reason="3 intentos sin contacto · buzón de voz las tres veces", done=True),
]

def medium_icon(m, cls="violet", size=16):
    return ic("message-square" if m=="message" else "phone-call", cls, size)

def row(r):
    cls = "row" + (" done" if r.get("done") else "")
    lead = f'<span class="lead" aria-label="La ejecuta un agente por {"mensaje" if r["medium"]=="message" else "llamada"}">{medium_icon(r["medium"])}</span>'
    reason = f'<p class="reason">{r["reason"]}</p>' if r.get("reason") else ""
    return f'''<li class="{cls}">{lead}
  <div class="body">
    <div class="title"><span class="t">{r["title"]}</span>{r["badge"]}</div>
    <p class="when"><span class="abs">{r["abs"]}</span><span>({r["rel"]})</span><span class="who">{ic("sparkles","violet",12)}{r["agent"]}</span><span class="who">{ic("circle-user","",12)}{r["contact"]}</span></p>
    {reason}
  </div>
  <div class="acts"><button class="btn btn-ghost btn-icon" aria-label="Ver contacto">{ic("circle-user")}</button><button class="btn btn-ghost btn-icon" aria-label="Más acciones">{ic("ellipsis-vertical")}</button></div>
</li>'''

def view_inbox():
    return f'''<main class="wrap narrow" id="view-inbox">
  <div class="page-head">
    <div>
      <h2>Tareas</h2>
      <div class="chips" aria-label="Resumen del agente">
        <span class="chip">programadas <b>4</b></span>
        <span class="chip">esperando respuesta <b>1</b></span>
        <span class="chip">en espera <b>1</b></span>
        <span class="chip warn">{ic("triangle-alert","",12)}sin enviar <b>1</b></span>
      </div>
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-outline" data-goto="form">{ic("sparkles","violet")}Programar seguimiento</button>
      <button class="btn btn-primary">{ic("plus")}Nueva tarea</button>
    </div>
  </div>

  <div class="tabs">
    {seg([("list","Lista","layout-list"),("scheduled","Programados","calendar-days")],"list",size="sm",surface="raised",label="Vista de tareas")}
    {seg([("mixed","Todas",None),("user","Del equipo",None),("agent","Del agente","sparkles")],"agent",size="sm",surface="inline",label="Filtrar por quién ejecuta")}
  </div>
  <div class="filters-row">
    <span class="filters lbl">Medio: {seg([("all","Todos",None),("message","Mensaje","message-square"),("call","Llamada","phone-call")],"all",label="Filtrar por medio")}</span>
    <span class="filters lbl">Última ejecución: {seg([("all","Todas",None),("awaiting","Esperando respuesta",None),("deferred","En espera",None),("failed","Sin enviar",None)],"all",label="Filtrar por desenlace")}</span>
  </div>

  <ul class="list">{"".join(row(r) for r in ROWS)}</ul>
  <p class="muted" style="font-size:12px;margin-top:10px">Página 1 de 1 — 8 tareas · Hora de Bogotá</p>
</main>'''

def slot(hh, ampm, medium, l1, contact, agent, badge_html, quiet=False):
    return f'''<div class="slot{" quiet" if quiet else ""}">
  <div class="hh">{hh}<small>{ampm}</small></div>
  {medium_icon(medium)}
  <div class="what"><div class="l1"><span>{contact}</span>{badge_html}</div><div class="l2">{l1} · {ic("sparkles","violet",11)} {agent}</div></div>
  <button class="btn btn-ghost btn-icon" aria-label="Ver ejecuciones">{ic("history")}</button>
</div>'''

def view_scheduled():
    return f'''<main class="wrap narrow" id="view-scheduled" hidden>
  <div class="page-head">
    <div><h2>Tareas</h2><p class="muted" style="font-size:13px;margin:4px 0 0">Lo que el agente va a hacer, día por día. Hora de Bogotá.</p></div>
    <div style="display:flex;gap:8px"><button class="btn btn-outline" data-goto="form">{ic("sparkles","violet")}Programar seguimiento</button><button class="btn btn-primary">{ic("plus")}Nueva tarea</button></div>
  </div>
  <div class="tabs">
    {seg([("list","Lista","layout-list"),("scheduled","Programados","calendar-days")],"scheduled",size="sm",surface="raised",label="Vista de tareas")}
    <span class="filters lbl">Agente: {seg([("all","Todos",None),("aria","Aria","sparkles"),("nova","Nova","sparkles")],"all",label="Filtrar por agente")}</span>
  </div>

  <div class="agenda">
    <section class="day">
      <div class="day-head"><h3>Hoy <span>lun 15 sep</span></h3><div class="sum"><span>{medium_icon("message","",13)} 2 mensajes</span><span>{medium_icon("call","",13)} 2 llamadas</span></div></div>
      {slot("8:00","a. m.","message","Recordar el cupón de bienvenida","Diego Torres","Nova",badge("En espera","info"),quiet=False)}
      {slot("2:10","p. m.","call","Reactivar cuenta inactiva","Sofía Martínez","Aria",badge("Llamando","info",spin=True))}
      {slot("3:30","p. m.","call","Confirmar interés en el módulo de llamadas","Carlos Restrepo","Aria",badge("Programada","info"))}
      {slot("6:00","p. m.","message","Enviar el enlace de pago pendiente","Camila Ortiz","Nova",badge("Programada","info"))}
      <div class="day-note">{ic("clock")}Entre las 8:00 p. m. y las 8:00 a. m. el agente no escribe ni llama (horario silencioso). Lo programado ahí sale a las 8:00.</div>
    </section>
    <section class="day">
      <div class="day-head"><h3>Mañana <span>mar 16 sep</span></h3><div class="sum"><span>{medium_icon("message","",13)} 1 mensaje</span></div></div>
      {slot("9:00","a. m.","message","Preguntar si llegó el pedido #1042","Andrés Mejía","Nova",badge("Programada","info"))}
    </section>
    <section class="day">
      <div class="day-head"><h3>jue 18 sep</h3><div class="sum"><span>{medium_icon("message","",13)} 2 mensajes</span></div></div>
      {slot("9:00","a. m.","message","Retomar la cotización del plan anual","Ana Gómez","Aria",badge("Abre con plantilla","info"))}
      {slot("9:00","a. m.","message","Preguntar si recibió la propuesta · tick de respuesta","Laura Pérez","Nova",badge("Esperando respuesta","info"))}
    </section>
  </div>
</main>'''

def notice_window(state):
    if state == "in":
        return f'''<div class="notice ok" data-win="in">{ic("circle-check")}<div><b>Ana escribió hace 3 h.</b> Puede recibir un mensaje del agente hasta hoy a las 5:20 p. m.; después WhatsApp exige una plantilla aprobada.</div></div>'''
    if state == "out":
        return f'''<div class="notice info" data-win="out">{ic("info")}<div><b>Ana no ha escrito en más de 24 h.</b> WhatsApp solo permite abrir con una plantilla aprobada por Meta; el agente retoma el objetivo cuando ella responda.</div><span class="cost">utility · ≈ US$0,0008</span></div>'''
    return f'''<div class="notice warn" data-win="none">{ic("triangle-alert")}<div><b>Ana no ha escrito en más de 24 h y no tienes plantillas aprobadas.</b> El mensaje saldrá cuando ella vuelva a escribir. <a class="link" href="#" data-goto="templates">Crear una plantilla de apertura {ic("arrow-right")}</a></div></div>'''

def view_form():
    return f'''<main class="wrap" id="view-form" hidden>
 <div class="modal-wrap">
  <div class="scrim" aria-hidden="true"></div>
  <div class="modal" role="dialog" aria-labelledby="mt">
    <div class="modal-h"><h2 id="mt">{ic("sparkles","violet",18)}Programar seguimiento</h2><p>El agente contacta a Ana con tu objetivo, a la hora que elijas, y sigue la conversación.</p></div>
    <div class="modal-b">
      <div class="grid2">
        <div class="field"><span class="lab">Contacto</span><div class="control locked">{ic("circle-user")}<span class="grow">Ana Gómez · +57 300 123 4567</span></div></div>
        <div class="field"><label for="f-agent">Agente</label><div class="control" id="f-agent">{ic("sparkles","violet")}<span class="grow">Aria — ventas</span>{ic("chevron-down")}</div></div>
      </div>

      <div class="field">
        <span class="lab">Cómo contacta</span>
        <div class="medium" role="radiogroup" aria-label="Cómo contacta">
          <button class="opt" role="radio" aria-checked="true" data-medium="message">{ic("message-square","",18)}<b>Mensaje</b><small>Le escribe por WhatsApp y sigue el chat.</small></button>
          <button class="opt" role="radio" aria-checked="false" data-medium="call">{ic("phone-call","",18)}<b>Llamada</b><small>Le llama con voz y conversa en vivo.</small></button>
          <button class="opt" role="radio" aria-checked="false" data-medium="call_then_message">{ic("phone","",18)}<b>Llamada y, si no conecta, mensaje</b><small>Tras agotar los intentos de llamada, cambia a mensaje.</small></button>
        </div>
      </div>

      <div class="field">
        <label for="f-obj">Objetivo</label>
        <textarea id="f-obj" class="control">Retomar la cotización del plan anual: preguntarle si la revisó y resolverle dudas de precio.</textarea>
        <div class="counter"><span id="obj-count">96</span> / 500</div>
        <div class="ex-chips"><button class="ex">Preguntar si recibió la propuesta y qué le pareció</button><button class="ex">Recordar que la promoción vence el viernes</button><button class="ex">Reactivar: saber si sigue interesada</button></div>
        <p class="hint">Una meta en tus palabras, no un guion. El agente redacta con su tono, su catálogo y sus reglas.</p>
      </div>

      <div class="field">
        <span class="lab">Cuándo</span>
        <div class="shortcuts" role="group" aria-label="Atajos de fecha">
          <button class="shortcut" aria-pressed="false">Mañana 9:00</button>
          <button class="shortcut" aria-pressed="true">En 3 días · jue 9:00</button>
          <button class="shortcut" aria-pressed="false">Lunes 9:00</button>
          <button class="shortcut" aria-pressed="false">Elegir…</button>
        </div>
        <div class="grid2">
          <div class="control">{ic("calendar")}<span class="grow">jue, 18 sep 2026</span>{ic("chevron-down")}</div>
          <div class="control">{ic("clock")}<span class="grow">9:00 a. m.</span>{ic("chevron-down")}</div>
        </div>
        <div class="tz">{ic("info")}Hora de Bogotá, la zona de tu negocio. Si a esa hora el agente no puede escribir (silencio 8:00 p. m.–8:00 a. m.), sale a las 8:00.</div>
      </div>

      <div class="field" id="win-block">
        <span class="lab">Estado del contacto en WhatsApp</span>
        {notice_window("out")}
      </div>

      <div class="field" id="tpl-block">
        <label for="f-tpl">Plantilla de apertura</label>
        <div class="control" id="f-tpl">{ic("file-text")}<span class="grow">seguimiento_v1 · utility · aprobada</span>{ic("chevron-down")}</div>
        <div class="grid2">
          <div class="field"><label for="f-topic">Tema (rellena {{2}})</label><input id="f-topic" class="control" value="la cotización del plan anual"></div>
          <div class="field"><span class="lab">Variables</span><div class="varbar"><span class="ex">{{1}} → nombre</span><span class="ex">{{2}} → tema</span></div></div>
        </div>
        <div class="preview">
          <div class="from">{ic("message-circle","",13)}Así lo verá Ana · vista previa</div>
          <div class="bubble">Hola <mark>Ana</mark>, te escribo por <mark>la cotización del plan anual</mark>. ¿Seguimos? Si prefieres que no te contactemos, respóndenos «no».<time>9:00 a. m.</time></div>
        </div>
        <p class="hint">La plantilla abre; cuando Ana responda, Aria continúa con tu objetivo en el mismo chat.</p>
      </div>
    </div>
    <div class="modal-f">
      <div class="promise">{ic("sparkles")}<div><b>Aria le escribirá a Ana el jue 18 sep a las 9:00 a. m.</b> (Bogotá)<br><span class="muted">Abre con la plantilla y retoma el objetivo cuando responda.</span></div></div>
      <div class="btns"><button class="btn btn-outline">Cancelar</button><button class="btn btn-primary" data-goto="inbox">Programar seguimiento</button></div>
    </div>
  </div>
 </div>
</main>'''

def view_rail():
    return f'''<main class="wrap" id="view-rail" hidden>
 <div class="sheet-wrap">
  <div>
    <h2 style="font-size:20px">Tareas</h2>
    <p class="muted" style="font-size:13px;margin-top:4px">La bandeja queda detrás; el rail se abre al lado con «Ver ejecuciones».</p>
    <ul class="list" style="opacity:.55">{"".join(row(r) for r in ROWS[:3])}</ul>
  </div>
  <aside class="sheet" aria-label="Ejecuciones">
    <div class="sheet-h"><h2>Ejecuciones</h2><div class="sub">Confirmar interés en el módulo de llamadas</div></div>
    <div class="sheet-box">
      <div class="kv"><span>Estado</span>{badge("Esperando respuesta","info")}</div>
      <div class="kv"><span>Cómo contacta</span><span class="pill-medium">{ic("phone")}Llamada y, si no conecta, mensaje</span></div>
      <div class="kv"><span>Agente</span><span style="display:inline-flex;gap:4px;align-items:center">{ic("sparkles","violet",13)}Aria</span></div>
      <div style="font-size:13px;line-height:1.45">Confirmar si sigue interesado en el módulo de llamadas y, si sí, agendar una demo de 20 min esta semana.</div>
      <div class="kv"><span>Siguiente paso</span><span class="tnum">Espera respuesta hasta el sáb 20 · 9:00 a. m.</span></div>
    </div>
    <div class="sheet-b">
      <ol class="tl">
        <li><span class="dot">{ic("phone-off")}</span><div><div class="ttl">Intento 1 · No contestó <span class="pill-medium">{ic("phone-call")}llamada</span></div><div class="dsc">Timbró 45 s · reintenta en 1 h</div><div class="meta"><span>lun 15 · 3:30 p. m.</span><a href="#">{ic("external-link")}Ver la llamada</a></div></div></li>
        <li><span class="dot">{ic("voicemail")}</span><div><div class="ttl">Intento 2 · Buzón de voz <span class="pill-medium">{ic("phone-call")}llamada</span></div><div class="dsc">Colgó sin dejar mensaje · reintenta en 2 h</div><div class="meta"><span>lun 15 · 4:31 p. m.</span><a href="#">{ic("external-link")}Ver la llamada</a></div></div></li>
        <li><span class="dot">{ic("phone-off")}</span><div><div class="ttl">Intento 3 · No contestó <span class="pill-medium">{ic("phone-call")}llamada</span></div><div class="dsc">Timbró 45 s</div><div class="meta"><span>lun 15 · 6:40 p. m.</span></div></div></li>
        <li><span class="dot violet">{ic("arrow-right")}</span><div><div class="ttl violet">Sin presupuesto por teléfono · continúa por mensaje</div><div class="dsc">El objetivo no cambia. Se reinician los intentos.</div><div class="meta"><span>lun 15 · 6:40 p. m.</span></div></div></li>
        <li><span class="dot success">{ic("send")}</span><div><div class="ttl">Intento 4 · Enviado con plantilla <span class="pill-medium">{ic("message-square")}mensaje</span></div><div class="dsc">Carlos no había escrito en 24 h: abrió con «seguimiento_v1». Cuando responda, Aria retoma el objetivo.</div><div class="meta"><span>mar 16 · 8:00 a. m.</span><a href="#">{ic("external-link")}Ver el mensaje</a></div></div></li>
        <li><span class="dot info">{ic("hourglass")}</span><div><div class="ttl">Esperando respuesta</div><div class="dsc">Hasta el sáb 20 · 9:00 a. m. Si no responde, la tarea cierra como «Enviado · sin respuesta».</div></div></li>
      </ol>
    </div>
  </aside>
 </div>
</main>'''

def view_settings():
    return f'''<main class="wrap narrow" id="view-settings" hidden>
  <h2 style="font-size:20px;margin-bottom:16px">Tareas de agente</h2>
  <div class="cards">
    <section class="card kill">
      <div><h3>{ic("sparkles","violet")}Las tareas de agente están activas</h3><p>El agente ejecuta los seguimientos programados: escribe y llama a tus clientes.</p></div>
      <button class="btn btn-outline">{ic("power")}Apagar</button>
    </section>
    <section class="card">
      <h3>Horario silencioso</h3>
      <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;font-size:13.5px"><span class="muted">No contactar entre</span><span class="control" style="width:120px">8:00 p. m.{ic("chevron-down")}</span><span class="muted">y</span><span class="control" style="width:120px">8:00 a. m.{ic("chevron-down")}</span></div>
      <p class="info-line">{ic("info")}<span>De 8:00 p. m. a 8:00 a. m. del día siguiente — 12 horas en silencio. Aplica a mensajes y llamadas. Las llamadas tienen además su propio horario en <a class="link" href="#">Llamadas → Configuración {ic("arrow-right")}</a>; manda el más estricto.</span></p>
    </section>
    <section class="card">
      <h3>Cuánto puede trabajar al día</h3>
      <div class="grid2">
        <div class="num"><label for="s-msg">Mensajes por día</label><div class="control" id="s-msg"><span class="tnum">200</span>{ic("sliders-horizontal")}</div><small>Entre 1 y 5 000</small></div>
        <div class="num"><label for="s-call">Llamadas por día</label><div class="control" id="s-call"><span class="tnum">20</span>{ic("sliders-horizontal")}</div><small>Entre 1 y 500 · la cuota de minutos del plan sigue siendo el tope duro</small></div>
      </div>
      <p class="info-line">{ic("info")}<span>Alcanzado un tope, el resto de tareas de ese medio quedan en espera y se reintentan mañana. No se pierden.</span></p>
    </section>
    <section class="card">
      <h3>Cuando abre con una plantilla de Meta</h3>
      <div class="grid2">
        <div class="num"><label for="s-wait">Horas esperando la respuesta</label><div class="control" id="s-wait"><span class="tnum">48</span>{ic("sliders-horizontal")}</div><small>Entre 1 y 168</small></div>
        <div class="field"><label for="s-tpl">Plantilla de apertura por defecto</label><div class="control" id="s-tpl">{ic("file-text")}<span class="grow">seguimiento_v1 · utility</span>{ic("chevron-down")}</div><span class="hint">Se propone al programar; cada tarea puede cambiarla.</span></div>
      </div>
      <p class="info-line">{ic("info")}<span>Si el contacto no ha escrito en 24 h, el agente abre con la plantilla y espera <b>48 h</b> a que responda. Si responde, retoma el objetivo en ese mismo chat; si no, la tarea cierra como <b>«Enviado · sin respuesta»</b>. <a class="link" href="#" data-goto="templates">Gestionar plantillas {ic("arrow-right")}</a></span></p>
    </section>
    <section class="card">
      <h3>Cuánto insiste</h3>
      <div class="grid2">
        <div class="num"><label for="s-att">Intentos por tarea</label><div class="control" id="s-att"><span class="tnum">8</span>{ic("sliders-horizontal")}</div></div>
        <div class="num"><label for="s-def">Horas máximas insistiendo</label><div class="control" id="s-def"><span class="tnum">72</span>{ic("sliders-horizontal")}</div></div>
      </div>
      <p class="info-line">{ic("info")}<span>Como mucho <b>8 intentos</b>, y deja de intentarlo <b>72 h</b> después del primero — lo que ocurra antes. Esperar por horario silencioso o por falta de cupo no gasta intentos.</span></p>
    </section>
    <div style="display:flex;justify-content:flex-end;gap:8px"><button class="btn btn-ghost">Descartar cambios</button><button class="btn btn-primary">Guardar configuración</button></div>
  </div>
</main>'''

def tpl_row(name, cat, body, status, cost, vars_, default=False, why=None):
    star = f'<span class="star" title="Plantilla de apertura por defecto">{ic("star","",14)}</span>' if default else ""
    return f'''<tr><td><div class="name">{name}</div><div class="why">{cat} · {vars_} variable{"s" if vars_!=1 else ""}</div></td><td class="body">{body}</td><td>{status}{f'<div class="why">{why}</div>' if why else ""}</td><td class="cost">{cost}</td><td style="text-align:right;white-space:nowrap">{star}<button class="btn btn-ghost btn-icon" aria-label="Más acciones">{ic("ellipsis-vertical")}</button></td></tr>'''

def view_templates():
    return f'''<main class="wrap" id="view-templates" hidden>
  <div class="page-head">
    <div><h2 style="font-size:20px">Plantillas de Meta</h2><p class="muted" style="font-size:13px;margin:4px 0 0">Las únicas que pueden abrir una conversación cuando el cliente lleva más de 24 h sin escribir. Viven en tu cuenta de WhatsApp Business; Meta las aprueba.</p></div>
    <div class="toolbar"><div class="control">{ic("phone")}<span>Ventas · +57 601 …</span>{ic("chevron-down")}</div><button class="btn btn-outline">{ic("refresh-cw")}Sincronizar</button><button class="btn btn-primary" id="new-tpl-btn">{ic("plus")}Nueva plantilla</button></div>
  </div>

  <div class="steps" style="margin-top:16px">
    <div>{ic("wand-sparkles","violet")}<span><b>Crea</b> el texto con variables ({{1}}, {{2}}) y un ejemplo por cada una.</span></div>
    <div>{ic("hourglass","",14)}<span><b>Meta revisa.</b> Suele decidir en minutos; puede tardar hasta 48 h. El estado se actualiza solo.</span></div>
    <div>{ic("circle-dollar-sign","",14)}<span><b>Cuesta por mensaje entregado.</b> En Colombia: utility US$0,0008 · marketing ≈ US$0,02.</span></div>
  </div>

  <table class="tbl">
    <thead><tr><th>Plantilla</th><th>Texto</th><th>Estado en Meta</th><th>Costo / msg (CO)</th><th></th></tr></thead>
    <tbody>
      {tpl_row("seguimiento_v1","Utility","Hola {{1}}, te escribo por {{2}}. ¿Seguimos? Si prefieres que no te contactemos, respóndenos «no».",badge("Aprobada","success"),"US$0,0008",2,default=True)}
      {tpl_row("recordar_cotizacion","Utility","Hola {{1}}, tu cotización de {{2}} sigue vigente hasta el {{3}}. ¿Quieres que la retomemos?",badge("Aprobada","success"),"US$0,0008",3)}
      {tpl_row("confirmar_interes","Utility","Hola {{1}}, hace unos días hablamos de {{2}}. ¿Sigues interesado? Respóndeme y te ayudo.",badge("En revisión","warning",spin=True),"US$0,0008",2,why="Enviada hace 12 min · Meta suele decidir en minutos, puede tardar hasta 48 h")}
      {tpl_row("promo_septiembre","Marketing","{{1}}, este mes el plan anual tiene 20 % de descuento. ¿Te cuento?",badge("Rechazada","destructive"),"US$0,02",1,why="Meta: la variable no puede abrir el mensaje. Corrige y envía como plantilla nueva (el nombre queda bloqueado 30 días).")}
      {tpl_row("bienvenida_leads","Utility","Hola {{1}}, gracias por dejarnos tus datos. ¿En qué te podemos ayudar?",badge("Pausada por Meta","warning"),"US$0,0008",1,why="Varios destinatarios la marcaron como no deseada. Se reactiva sola si mejora la calidad.")}
    </tbody>
  </table>

  <!-- Modal: nueva plantilla -->
  <div class="modal-wrap" style="margin-top:24px;min-height:0">
   <div class="modal" role="dialog" aria-labelledby="tt" style="margin:0 auto">
    <div class="modal-h"><h2 id="tt">{ic("file-text","",18)}Nueva plantilla de Meta</h2><p>Un texto fijo con huecos que se rellenan con datos del contacto. Meta la revisa antes de que puedas usarla.</p></div>
    <div class="modal-b">
      <div class="field"><span class="lab">Empieza con una sugerida</span>
        <div class="suggest">
          <button class="sug"><b>{ic("sparkles")}Retomar conversación</b><p>«Hola {{1}}, te escribo por {{2}}. ¿Seguimos?»</p>{badge("Utility · rápida de aprobar","neutral")}</button>
          <button class="sug"><b>{ic("sparkles")}Recordar cotización</b><p>«Hola {{1}}, tu cotización de {{2}} sigue vigente. ¿La retomamos?»</p>{badge("Utility · rápida de aprobar","neutral")}</button>
          <button class="sug"><b>{ic("sparkles")}Confirmar interés</b><p>«Hola {{1}}, hablamos de {{2}}. ¿Sigues interesado?»</p>{badge("Utility · rápida de aprobar","neutral")}</button>
        </div>
      </div>
      <div class="grid2">
        <div class="field"><label for="t-name">Nombre interno</label><input id="t-name" class="control" value="seguimiento_v2"><span class="hint">Minúsculas, números y guion bajo. Meta bloquea 30 días un nombre rechazado.</span></div>
        <div class="field"><label for="t-lang">Idioma</label><div class="control" id="t-lang"><span class="grow">Español (Colombia) · es_CO</span>{ic("chevron-down")}</div></div>
      </div>
      <div class="field"><span class="lab">Categoría</span>
        <div class="cat" role="radiogroup">
          <button class="opt" role="radio" aria-checked="true">{ic("badge-check","",18)}<b>Utility</b><small>Seguimiento de algo que el cliente inició (cotización, pedido, cita). US$0,0008 por mensaje. Aprobación rápida.</small></button>
          <button class="opt" role="radio" aria-checked="false">{ic("zap","",18)}<b>Marketing</b><small>Promociones y ofertas. ≈ US$0,02 por mensaje. Revisión más estricta.</small></button>
          <button class="opt" role="radio" aria-checked="false" aria-disabled="true">{ic("circle-x","",18)}<b>Autenticación</b><small>Solo códigos de verificación. No sirve para abrir una conversación.</small></button>
        </div>
      </div>
      <div class="field"><label for="t-body">Texto</label>
        <textarea id="t-body" class="control">Hola {{1}}, te escribo por {{2}}. ¿Seguimos? Si prefieres que no te contactemos, respóndenos «no».</textarea>
        <div class="varbar">Insertar variable: <button class="ex">{{n}} nombre</button><button class="ex">{{n}} empresa</button><button class="ex">{{n}} tema</button><span style="margin-left:auto" class="tnum">2 variables · 118 / 1024</span></div>
        <p class="hint">Reglas de Meta: las variables van en orden ({{1}}, {{2}}…), nunca abren ni cierran el mensaje, y no van pegadas.</p>
      </div>
      <div class="field"><span class="lab">Un ejemplo por variable <span class="muted">(Meta lo exige para aprobar)</span></span>
        <div class="examples"><div class="control"><span class="k">{{1}}</span><span class="grow">Ana</span></div><div class="control"><span class="k">{{2}}</span><span class="grow">la cotización del plan anual</span></div></div>
      </div>
      <div class="preview"><div class="from">{ic("message-circle","",13)}Así se verá</div><div class="bubble">Hola <mark>Ana</mark>, te escribo por <mark>la cotización del plan anual</mark>. ¿Seguimos? Si prefieres que no te contactemos, respóndenos «no».<time>9:00 a. m.</time></div></div>
      <div class="notice info">{ic("hourglass")}<div><b>Qué pasa al enviar:</b> queda «En revisión». Meta suele decidir en minutos y puede tardar hasta 48 h; te avisamos cuando cambie. Mientras, las tareas que la elijan esperan.</div></div>
    </div>
    <div class="modal-f"><div class="promise">{ic("circle-dollar-sign")}<div><b>Utility · US$0,0008 por mensaje entregado</b><br><span class="muted">Los mensajes de texto libre dentro de las 24 h siguen sin costo hasta el 1 de octubre.</span></div></div><div class="btns"><button class="btn btn-outline">Cancelar</button><button class="btn btn-primary">Enviar a revisión de Meta</button></div></div>
   </div>
  </div>
</main>'''

VIEWS = [("inbox","Bandeja"),("scheduled","Programados"),("form","Programar"),("rail","Ejecución"),("settings","Ajustes"),("templates","Plantillas de Meta")]

JS = r"""
(function(){
  "use strict";
  var ACTIVE='[data-active="true"],[aria-current="page"],[data-state="active"]';
  function placePill(seg){var pill=seg.querySelector("[data-pill]"),a=seg.querySelector(ACTIVE);if(!pill)return;if(!a){pill.style.opacity="0";return}
    var pad=seg.getAttribute("data-size")==="sm"?2:4;pill.style.width=a.offsetWidth+"px";pill.style.height=a.offsetHeight+"px";pill.style.top=pad+"px";pill.style.left="0";pill.style.transform="translateX("+(a.offsetLeft-pad)+"px)";pill.style.opacity="1"}
  function placeAll(){document.querySelectorAll(".seg").forEach(placePill)}
  document.querySelectorAll('.seg [role="radio"]').forEach(function(b){b.addEventListener("click",function(){var seg=b.closest(".seg");seg.querySelectorAll('[role="radio"]').forEach(function(o){o.setAttribute("aria-checked","false");o.removeAttribute("data-active")});b.setAttribute("aria-checked","true");b.setAttribute("data-active","true");placePill(seg);
    var k=b.getAttribute("data-key");if(k==="scheduled")show("scheduled");if(k==="list")show("inbox")})});
  /* radios en tarjeta (medio, categoría) */
  document.querySelectorAll('.opt[role="radio"]').forEach(function(b){b.addEventListener("click",function(){if(b.getAttribute("aria-disabled")==="true")return;b.parentElement.querySelectorAll('.opt').forEach(function(o){o.setAttribute("aria-checked","false")});b.setAttribute("aria-checked","true");
    var m=b.getAttribute("data-medium");if(m){var p=document.querySelector(".modal-f .promise b");if(p){p.textContent=m==="message"?"Aria le escribirá a Ana el jue 18 sep a las 9:00 a. m.":m==="call"?"Aria llamará a Ana el jue 18 sep a las 9:00 a. m.":"Aria llamará a Ana el jue 18 sep a las 9:00 a. m. y, si no conecta, le escribirá."}
      /* la ventana de 24 h solo aplica al mensaje */
      var win=document.getElementById("win-block"),tpl=document.getElementById("tpl-block");var msg=(m!=="call");win.hidden=!msg;tpl.hidden=!(msg&&window.__winState!=="in")}})});
  document.querySelectorAll(".shortcut").forEach(function(b){b.addEventListener("click",function(){document.querySelectorAll(".shortcut").forEach(function(o){o.setAttribute("aria-pressed","false")});b.setAttribute("aria-pressed","true")})});
  var obj=document.getElementById("f-obj"),cnt=document.getElementById("obj-count");if(obj){function sync(){cnt.textContent=String(obj.value.length)}obj.addEventListener("input",sync);sync();document.querySelectorAll("#view-form .ex").forEach(function(c){c.addEventListener("click",function(){obj.value=c.textContent.trim();sync();obj.focus()})})}
  /* estado del contacto (chrome del mockup) */
  var NOTICES=__NOTICES__;window.__winState="out";
  function setWin(s){window.__winState=s;var w=document.getElementById("win-block");w.innerHTML='<span class="lab">Estado del contacto en WhatsApp</span>'+NOTICES[s];document.getElementById("tpl-block").hidden=(s==="in")||(s==="none");document.querySelectorAll("[data-win-btn]").forEach(function(b){b.setAttribute("aria-pressed",String(b.getAttribute("data-win-btn")===s))});bindGoto()}
  document.querySelectorAll("[data-win-btn]").forEach(function(b){b.addEventListener("click",function(){setWin(b.getAttribute("data-win-btn"))})});
  /* vistas */
  var ids={inbox:"view-inbox",scheduled:"view-scheduled",form:"view-form",rail:"view-rail",settings:"view-settings",templates:"view-templates"};
  function show(n){Object.keys(ids).forEach(function(k){document.getElementById(ids[k]).hidden=(k!==n)});document.querySelectorAll(".mk-view").forEach(function(b){b.setAttribute("aria-pressed",String(b.getAttribute("data-view")===n))});
    var wg=document.getElementById("win-group");if(wg)wg.hidden=(n!=="form");window.scrollTo({top:0});requestAnimationFrame(placeAll)}
  document.querySelectorAll(".mk-view").forEach(function(b){b.addEventListener("click",function(){show(b.getAttribute("data-view"))})});
  function bindGoto(){document.querySelectorAll("[data-goto]").forEach(function(b){if(b.__g)return;b.__g=1;b.addEventListener("click",function(e){e.preventDefault();show(b.getAttribute("data-goto"))})})}
  bindGoto();
  /* tema */
  var root=document.documentElement,tb=document.getElementById("theme-btn"),tt=document.getElementById("theme-txt");
  function isDark(){var t=root.getAttribute("data-theme");return t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches}
  function paint(){tt.textContent=isDark()?"Claro":"Oscuro"}
  tb.addEventListener("click",function(){root.setAttribute("data-theme",isDark()?"light":"dark");paint()});paint();
  window.addEventListener("resize",placeAll);requestAnimationFrame(placeAll);
})();
"""

def build():
    notices = json.dumps({"in":notice_window("in"),"out":notice_window("out"),"none":notice_window("none")}, ensure_ascii=False)
    css = CSS.replace("__LIGHT__", LIGHT).replace("__DARK__", DARK)
    js = JS.replace("__NOTICES__", notices)
    views_btns = "".join(f'<button class="mk-view" data-view="{k}" aria-pressed="{str(k=="inbox").lower()}">{t}</button>' for k,t in VIEWS)
    html = f"""<title>Seguimiento autónomo</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap">
<style>{css}</style>

<div class="mk-bar" role="toolbar" aria-label="Controles del mockup">
  <span class="mk-tag">{ic("sparkles","violet",14)}Mockup · F2</span>
  <div class="mk-grp" role="group" aria-label="Vistas">{views_btns}</div>
  <div class="mk-grp" id="win-group" role="group" aria-label="Estado del contacto (solo demo)" hidden><b>contacto</b>
    <button data-win-btn="in" aria-pressed="false">Escribió hace 3 h</button>
    <button data-win-btn="out" aria-pressed="true">Frío · con plantilla</button>
    <button data-win-btn="none" aria-pressed="false">Frío · sin plantilla</button>
  </div>
  <button class="mk-theme" id="theme-btn">{ic("moon","",13)}<span id="theme-txt">Oscuro</span></button>
</div>

{header()}
{view_inbox()}
{view_scheduled()}
{view_form()}
{view_rail()}
{view_settings()}
{view_templates()}
<script>{js}</script>
"""
    out = S / "agent-tasks-schedule.html"
    out.write_text(html, encoding="utf-8")
    print(f"escrito {out} ({out.stat().st_size} bytes), iconos: {len(LUCIDE)}")

if __name__ == "__main__":
    build()
