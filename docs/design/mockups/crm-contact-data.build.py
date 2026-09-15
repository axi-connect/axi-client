#!/usr/bin/env python3
"""Mockup «Datos recopilados por el agente» (plan crm_contacts_f1_captured_data.md, F0).

Genera `crm-contact-data.html` autocontenido. Vistas: la card «Datos recopilados» en el
Contacto 360 con los estados posibles; una fila en edición inline + el diálogo de rechazo; el
rail de contexto del inbox con «Faltan» y «De esta conversación»; el mismo rail recibiendo un
dato en vivo; la tabla de contactos con la columna «Datos»; y el estado vacío.

Fuentes: los subsets woff2 que Next ya compiló en `.next/static/media` del checkout principal
(Poppins 400–700, Nexa 700, Geist Mono) se incrustan como data URI porque el CSP del Artifact
bloquea CDNs. Si no hay build, cae a Google Fonts + fallback local. Iconos: los `__iconNode` de
`node_modules/lucide-react` (los mismos SVG que pinta el panel). Tokens: literales de
`src/app/globals.css`.

Uso:  python3 crm-contact-data.build.py
"""
import base64
import json
import pathlib
import re

S = pathlib.Path(__file__).resolve().parent


def repo_root() -> pathlib.Path:
    """axi-client. En un worktree (`.claude/worktrees/<x>`) no hay build ni node_modules: usa los del checkout principal."""
    root = S.parents[2]
    if not (root / "node_modules").exists() and ".claude" in root.parts:
        root = root.parents[2]
    return root


ROOT = repo_root()
OUT = S / "crm-contact-data.html"
LUCIDE_JSON = S / "crm-contact-data.lucide.json"

# ----------------------------------------------------------------------------- fuentes
FONT_FILES = {
    ("Poppins", 400): "eafabf029ad39a43-s.p.woff2",
    ("Poppins", 500): "8888a3826f4a3af4-s.p.woff2",
    ("Poppins", 600): "0484562807a97172-s.p.woff2",
    ("Poppins", 700): "b957ea75a84b6ea7-s.p.woff2",
    ("Nexa", 700): "e04577cbc41b91fb-s.p.woff2",
    ("Geist Mono", "100 900"): "7d4881bb7e1bf84d-s.p.woff2",
}
MEDIA = ROOT / ".next" / "static" / "media"


def font_css() -> tuple[str, str]:
    if all((MEDIA / f).exists() for f in FONT_FILES.values()):
        faces = []
        for (family, weight), file in FONT_FILES.items():
            b64 = base64.b64encode((MEDIA / file).read_bytes()).decode()
            faces.append(
                f'@font-face{{font-family:"{family}";font-weight:{weight};font-style:normal;font-display:swap;'
                f'src:url(data:font/woff2;base64,{b64}) format("woff2")}}'
            )
        return "", "\n".join(faces)
    link = (
        '<link rel="preconnect" href="https://fonts.googleapis.com">'
        '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap">'
    )
    return link, ""


# ----------------------------------------------------------------------------- iconos lucide
LUCIDE_DIR = ROOT / "node_modules" / "lucide-react" / "dist" / "esm" / "icons"
_ICON_CACHE: dict[str, str] = json.loads(LUCIDE_JSON.read_text()) if LUCIDE_JSON.exists() else {}


def _icon_body(name: str) -> str:
    """Sigue los alias (`pause-circle` → `circle-pause`) que re-exportan con `from './x.js'`."""
    path = LUCIDE_DIR / f"{name}.js"
    txt = path.read_text()
    m = re.search(r"from\s+'\./([\w-]+)\.js'", txt)
    if m and "__iconNode" not in txt:
        return _icon_body(m.group(1))
    body = ""
    for tag, attrs in re.findall(r'\["(\w+)",\s*\{([^}]*)\}\]', txt):
        pairs = [(k, v) for k, v in re.findall(r'(\w+):\s*"([^"]*)"', attrs) if k != "key"]
        body += f"<{tag} " + " ".join(f'{k}="{v}"' for k, v in pairs) + "/>"
    return body


def ic(name: str, cls: str = "", size: int = 16) -> str:
    if name not in _ICON_CACHE:
        _ICON_CACHE[name] = _icon_body(name)
    return (
        f'<svg class="ic {cls}" width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
        f'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{_ICON_CACHE[name]}</svg>'
    )


# ----------------------------------------------------------------------------- tokens (globals.css, literal)
LIGHT = """
  --background:#ffffff; --foreground:#171717;
  --axi-brand:#e65759; --axi-brand-2:#e02f2f; --axi-violet:#7c3aed; --axi-amber:#f0a431; --axi-muted:#f4f4f5;
  --axi-success:#16a34a; --axi-warning:#d97706; --axi-destructive:#dc2626; --axi-info:#2563eb; --axi-on-color:#ffffff;
  --accent:color-mix(in srgb, var(--axi-brand) 14%, var(--background));
  --shadow-float:0 1px 2px rgb(0 0 0/.05), 0 4px 12px rgb(0 0 0/.06);
  --shadow-overlay:0 1px 2px rgb(0 0 0/.06), 0 16px 48px rgb(0 0 0/.16);
  --scrim:rgb(0 0 0/.35);
  color-scheme:light;
"""
DARK = """
  --background:#0a0a0a; --foreground:#ededed;
  --axi-brand:#fb7185; --axi-brand-2:#df4f4f; --axi-violet:#a78bfa; --axi-amber:#fbbf24; --axi-muted:#18181b;
  --axi-success:#4ade80; --axi-warning:#fbbf24; --axi-destructive:#f87171; --axi-info:#60a5fa; --axi-on-color:#0a0a0a;
  --accent:color-mix(in srgb, var(--axi-brand) 42%, var(--background));
  --shadow-float:0 1px 2px rgb(0 0 0/.4), 0 4px 12px rgb(0 0 0/.35);
  --shadow-overlay:0 1px 2px rgb(0 0 0/.5), 0 16px 48px rgb(0 0 0/.55);
  --scrim:rgb(0 0 0/.6);
  color-scheme:dark;
"""

CSS = r"""
:root{ __LIGHT__ }
@media (prefers-color-scheme: dark){ :root:not([data-theme="light"]){ __DARK__ } }
:root[data-theme="dark"]{ __DARK__ }
:root{
  /* CAPA 2 — semánticos derivados (sin hex nuevos) */
  --border:color-mix(in srgb, var(--foreground) 12%, var(--background));
  --border-soft:color-mix(in srgb, var(--border) 50%, transparent);
  --secondary:color-mix(in srgb, var(--foreground) 6%, var(--background));
  --muted-foreground:color-mix(in srgb, var(--foreground) 70%, transparent);
  --input:color-mix(in srgb, var(--foreground) 14%, var(--background));
  --radius-sm:8px; --radius-md:12px; --radius-lg:16px; --radius-xl:20px;
  --font-body:"Poppins", Helvetica, Arial, sans-serif; --font-heading:"Nexa","Poppins",sans-serif; --font-mono:"Geist Mono",ui-monospace,SFMono-Regular,monospace;
  --ease:cubic-bezier(.2,.8,.2,1);
}
*{box-sizing:border-box}
[hidden]{display:none!important}
html{scroll-behavior:smooth}
body{margin:0;background:var(--background);color:var(--foreground);font-family:var(--font-body);font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased}
h1,h2,h3,h4{margin:0;font-family:var(--font-heading);font-weight:700;letter-spacing:-.02em;text-wrap:balance}
p{margin:0}
button{font:inherit;color:inherit;cursor:pointer;background:none;border:0;padding:0}
a{color:inherit}
:focus-visible{outline:2px solid var(--axi-brand);outline-offset:2px}
.ic{flex:none}
.muted{color:var(--muted-foreground)}
.tnum{font-variant-numeric:tabular-nums}
.mono{font-family:var(--font-mono);font-size:12.5px}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}

/* ---- barra del mockup (NO es producto) ---------------------------------------------- */
.mk-bar{position:sticky;top:0;z-index:40;display:flex;flex-wrap:wrap;align-items:center;gap:8px 16px;padding:8px 16px;background:var(--foreground);color:var(--background);font-size:12px}
.mk-tag{font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;opacity:.75}
.mk-views{display:flex;gap:4px;margin-left:auto;flex-wrap:wrap}
.mk-view,.mk-theme{border:1px solid color-mix(in srgb, var(--background) 30%, transparent);background:transparent;color:inherit;border-radius:999px;padding:4px 10px}
.mk-view[aria-pressed="true"]{background:var(--background);color:var(--foreground);font-weight:500}
.mk-note{width:100%;opacity:.8}

/* ---- shell del panel (content, max-w-7xl p-6) ---------------------------------------- */
.view{position:relative}
.page{max-width:1120px;margin:0 auto;padding:20px 16px 80px;display:flex;flex-direction:column;gap:16px}
.crumb{font-size:13px;color:var(--muted-foreground);display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.crumb b{color:var(--foreground);font-weight:500}
.seg{display:flex;width:fit-content;max-width:100%;gap:2px;padding:4px;border-radius:999px;border:1px solid var(--border);background:var(--background);box-shadow:var(--shadow-float);overflow-x:auto;scrollbar-width:none}
.seg a{display:inline-flex;align-items:center;gap:8px;height:36px;padding:0 14px;border-radius:999px;color:var(--muted-foreground);text-decoration:none;white-space:nowrap;font-weight:500}
.seg a[aria-current="page"]{background:var(--accent);color:var(--foreground)}
.seg a[aria-current="page"] .ic{color:var(--axi-brand)}

/* botones (ui/button.tsx) */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:36px;padding:0 16px;border-radius:999px;border:1px solid transparent;background-image:linear-gradient(to right,var(--axi-brand),var(--axi-brand-2));color:var(--axi-on-color);font-weight:500;font-size:14px;text-decoration:none;white-space:nowrap;transition:filter .2s,transform .1s}
.btn:hover{filter:brightness(1.1)} .btn:active{transform:scale(.97)}
.btn.outline{background-image:none;background:var(--background);color:var(--foreground);border-color:var(--border)}
.btn.outline:hover{background:var(--secondary);filter:none}
.btn.ghost{background-image:none;background:transparent;color:var(--foreground)}
.btn.ghost:hover{background:var(--secondary);filter:none}
.btn.destructive{background-image:none;background:var(--axi-destructive);color:var(--axi-on-color)}
.btn.sm{height:32px;padding:0 12px;font-size:13px}
.btn.xs{height:28px;padding:0 10px;font-size:12.5px;gap:6px}
.btn.icon{width:36px;padding:0}
.btn.icon.xs{width:28px}
.btn[disabled]{opacity:.5;pointer-events:none}

/* badges: Badge secondary + punto (nunca tinte + texto del mismo color) */
.badge{display:inline-flex;align-items:center;gap:6px;height:22px;padding:0 9px;border-radius:999px;font-size:12px;font-weight:500;background:var(--secondary);color:var(--foreground);white-space:nowrap;border:1px solid var(--border-soft)}
.badge .dot{width:7px;height:7px;border-radius:50%;background:var(--muted-foreground);opacity:.55}
.badge.ok .dot{background:var(--axi-success);opacity:1} .badge.warn .dot{background:var(--axi-warning);opacity:1}
.badge.lead .dot{background:var(--axi-info);opacity:1} .badge.customer .dot{background:var(--axi-success);opacity:1} .badge.prospect .dot{background:var(--axi-amber);opacity:1}
.badge.outline{background:transparent;border-color:var(--border)}
.badge.outline .dot{display:none}

/* cards sólidas (DESIGN-SYSTEM §5.2) */
.card{border:1px solid var(--border);background:var(--background);border-radius:var(--radius-xl);padding:20px 24px}
.card h2{font-size:16px;display:flex;align-items:center;gap:8px}
.card .lead{color:var(--muted-foreground);font-size:13px;margin-top:2px}
.card-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:14px}
.card-head .right{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.grid2{display:grid;gap:16px;grid-template-columns:1fr}
@media (min-width:1024px){.grid2{grid-template-columns:1fr 1fr}}
.stack{display:flex;flex-direction:column;gap:16px}

/* cabecera del 360 (Contact360Header) */
.who{display:flex;align-items:center;gap:14px;min-width:0}
.av{width:56px;height:56px;border-radius:50%;background:var(--accent);color:var(--foreground);display:grid;place-items:center;font-size:18px;font-weight:600;flex:none}
.av.sm{width:32px;height:32px;font-size:12px}
.who h1{font-size:22px}
.who .sub{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:4px;color:var(--muted-foreground);font-size:13px}
.who .sub .ic{color:var(--muted-foreground)}
.header{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px}
.header .right{display:flex;gap:8px;align-items:center;flex-wrap:wrap}

/* score + copiloto + etiquetas: resumen fiel de los bloques que ya existen */
.score{display:flex;gap:16px;align-items:center}
.ring{width:64px;height:64px;border-radius:50%;background:conic-gradient(var(--axi-brand) 0 72%, var(--secondary) 72% 100%);display:grid;place-items:center;flex:none}
.ring b{width:50px;height:50px;border-radius:50%;background:var(--background);display:grid;place-items:center;font-family:var(--font-heading);font-size:18px}
.steps{display:flex;gap:6px;flex-wrap:wrap}
.step{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--muted-foreground)}
.step .ic{color:var(--axi-success)}
.step.off .ic{color:var(--border)}
.tags{display:flex;gap:6px;flex-wrap:wrap}
.kv{display:grid;grid-template-columns:auto 1fr;gap:6px 14px;font-size:13px}
.kv dt{color:var(--muted-foreground)} .kv dd{margin:0}

/* ===================== el panel «Datos recopilados» ===================== */
.data-card .card-head{margin-bottom:8px}
.data-card h2 .ic{color:var(--axi-violet)}
.sect{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted-foreground);font-weight:600;margin:18px 0 6px;display:flex;align-items:center;gap:8px}
.sect:first-of-type{margin-top:6px}
.sect .count{font-weight:500;letter-spacing:0;text-transform:none;font-size:12px}
.rows{display:flex;flex-direction:column}
.row{display:grid;grid-template-columns:minmax(150px,1.1fr) minmax(0,1.6fr) 130px 150px auto;gap:14px;align-items:center;padding:10px 0;border-top:1px solid var(--border-soft);min-width:0}
.row:first-child{border-top:none}
.row .lbl{display:flex;flex-direction:column;gap:2px;min-width:0}
.row .lbl b{font-weight:500;font-size:13.5px;line-height:1.3}
.row .lbl small{font-family:var(--font-mono);font-size:11px;color:var(--muted-foreground);display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.row .val{min-width:0;font-size:13.5px}
.row .val .v{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.row .val .said{display:flex;gap:4px;align-items:center;font-size:12px;color:var(--muted-foreground);margin-top:1px}
.row .val .said .ic{color:var(--axi-violet)}
.row .val.empty .v{color:var(--muted-foreground)}
.row .val .invalid{display:flex;gap:4px;align-items:center;font-size:12px;color:var(--axi-destructive);margin-top:1px}
.row .val .proposal{display:inline-flex;gap:6px;align-items:center;margin-top:4px;padding:3px 8px 3px 6px;border-radius:999px;border:1px dashed color-mix(in srgb, var(--axi-violet) 45%, var(--border));font-size:12px;color:var(--foreground)}
.row .val .proposal .ic{color:var(--axi-violet)}
.src{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;color:var(--muted-foreground);white-space:nowrap}
.src .ic{color:var(--muted-foreground)} .src.ia .ic{color:var(--axi-violet)}
.src small{font-size:11px;opacity:.85}
.acts{display:flex;gap:2px;justify-content:flex-end}
.acts .btn{color:var(--muted-foreground)}
.acts .btn:hover{color:var(--foreground)}
.acts .btn.danger:hover{color:var(--axi-destructive)}
.row.hl{animation:hl 2.4s var(--ease) both}
@keyframes hl{0%{background:var(--accent)}100%{background:transparent}}
.row.hl{margin:0 -12px;padding-left:12px;padding-right:12px;border-radius:10px}
.lock{color:var(--muted-foreground)}
.missing .row{grid-template-columns:minmax(150px,1.1fr) minmax(0,1.6fr) 130px 150px auto}
.tries{display:inline-flex;gap:5px;align-items:center;font-size:12px;color:var(--axi-warning)}
.tries.calm{color:var(--muted-foreground)}
details.sys{margin-top:14px}
details.sys summary{list-style:none;cursor:pointer;font-size:12.5px;color:var(--muted-foreground);display:inline-flex;gap:6px;align-items:center}
details.sys summary::-webkit-details-marker{display:none}
details.sys[open] summary .ic{transform:rotate(90deg)}
details.sys .rows{margin-top:6px;opacity:.85}
.foot-note{font-size:12px;color:var(--muted-foreground);margin-top:12px;display:flex;gap:6px;align-items:flex-start}
.foot-note .ic{margin-top:2px}
.legend{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--muted-foreground)}

/* edición inline */
.row.editing{background:var(--secondary);margin:0 -12px;padding:10px 12px;border-radius:12px;border-top-color:transparent}
.field{display:flex;gap:8px;align-items:center;min-width:0}
.select,.input{display:inline-flex;align-items:center;justify-content:space-between;gap:10px;height:32px;padding:0 10px;border-radius:10px;border:1px solid var(--input);background:var(--background);color:var(--foreground);font-size:13px;min-width:0}
.select{min-width:190px}
.input{flex:1}
.field .hint{font-size:11.5px;color:var(--muted-foreground);white-space:nowrap}
.listbox{position:absolute;z-index:20;margin-top:4px;width:220px;padding:4px;border-radius:12px;border:1px solid var(--border);background:color-mix(in srgb, var(--background) 82%, transparent);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);box-shadow:var(--shadow-float);display:flex;flex-direction:column}
.listbox div{padding:7px 10px;border-radius:8px;font-size:13px;display:flex;justify-content:space-between;align-items:center}
.listbox div[aria-selected="true"]{background:var(--accent)}
.listbox div .ic{color:var(--axi-brand)}
.rel{position:relative}

/* diálogo de rechazo (ui/dialog.tsx) */
.overlay{position:absolute;inset:0;z-index:30;background:var(--scrim);display:flex;align-items:flex-start;justify-content:center;padding:120px 16px 48px}
.modal{position:relative;width:100%;max-width:460px;border-radius:var(--radius-xl);border:1px solid var(--border);background:color-mix(in srgb, var(--background) 82%, transparent);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);box-shadow:var(--shadow-overlay);padding:28px;display:flex;flex-direction:column;gap:14px;animation:rise .28s var(--ease) both}
@keyframes rise{from{opacity:0;transform:translateY(8px) scale(.985)}}
.modal h2{font-size:20px}
.modal p{color:var(--muted-foreground);font-size:13.5px}
.modal .quote{padding:10px 12px;border-radius:10px;background:var(--secondary);font-size:13px;display:grid;grid-template-columns:auto 1fr;gap:4px 12px}
.modal .quote dt{color:var(--muted-foreground)} .modal .quote dd{margin:0}
.modal-foot{display:flex;justify-content:flex-end;gap:8px;margin-top:6px}

/* ===================== inbox: rail de contexto ===================== */
.inbox{display:grid;grid-template-columns:1fr 48px 340px;height:calc(100vh - 44px);min-height:640px;border-top:1px solid var(--border)}
.chat{display:flex;flex-direction:column;min-width:0;border-right:1px solid var(--border)}
.chat-head{height:57px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px;padding:0 16px}
.chat-head .who h1{font-size:15px;font-family:var(--font-body);font-weight:500;letter-spacing:0}
.chat-head .who .sub{margin-top:0;font-size:12px}
.chat-head .right{margin-left:auto;display:flex;gap:8px;align-items:center}
.thread{flex:1;padding:20px 24px;display:flex;flex-direction:column;gap:10px;overflow:hidden;background:color-mix(in srgb, var(--foreground) 2%, var(--background))}
.day{align-self:center;font-size:11.5px;color:var(--muted-foreground);padding:3px 10px;border-radius:999px;border:1px solid var(--border-soft);background:color-mix(in srgb, var(--background) 70%, transparent)}
.bubble{max-width:62%;padding:9px 12px;border-radius:14px;font-size:13.5px;line-height:1.45;position:relative}
.bubble.in{align-self:flex-start;background:var(--background);border:1px solid var(--border)}
.bubble.out{align-self:flex-end;background:var(--accent)}
.bubble time{display:block;font-size:10.5px;color:var(--muted-foreground);margin-top:3px;text-align:right}
.bubble .who-ia{display:inline-flex;gap:4px;align-items:center;font-size:10.5px;color:var(--axi-violet);margin-bottom:2px}
.tool-note{align-self:flex-end;display:inline-flex;gap:6px;align-items:center;font-size:11.5px;color:var(--muted-foreground);padding:2px 0}
.tool-note .ic{color:var(--axi-violet)}
.composer{height:64px;border-top:1px solid var(--border);display:flex;align-items:center;gap:10px;padding:0 16px}
.composer .input{flex:1;height:40px;border-radius:999px;color:var(--muted-foreground)}
.rail{display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px 0;border-right:1px solid var(--border)}
.rail button{width:36px;height:36px;border-radius:10px;display:grid;place-items:center;color:var(--muted-foreground)}
.rail button[aria-pressed="true"]{background:var(--accent);color:var(--foreground)}
.rail button[aria-pressed="true"] .ic{color:var(--axi-brand)}
.panel{display:flex;flex-direction:column;min-width:0;background:var(--background)}
.panel-head{height:57px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 16px;font-weight:500}
.panel-body{flex:1;overflow:hidden;padding:16px;display:flex;flex-direction:column;gap:18px}
.panel-foot{border-top:1px solid var(--border);padding:12px;display:flex;flex-direction:column;gap:8px}
.panel .who{flex-direction:column;text-align:center;gap:8px}
.panel .who .sub{justify-content:center}
.fl{display:grid;grid-template-columns:auto 1fr;gap:6px 12px;font-size:13px}
.fl dt{color:var(--muted-foreground)} .fl dd{margin:0;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
/* variante rail del panel: filas apiladas */
.rrows{display:flex;flex-direction:column}
.rrow{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 10px;padding:8px 0;border-top:1px solid var(--border-soft);align-items:start}
.rrow:first-child{border-top:none}
.rrow .lbl{font-size:12px;color:var(--muted-foreground);display:flex;gap:6px;align-items:center}
.rrow .lbl .ic{color:var(--muted-foreground)} .rrow .lbl.ia .ic{color:var(--axi-violet)}
.rrow .v{font-size:13.5px;grid-column:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rrow .v.empty{color:var(--muted-foreground)}
.rrow .meta{grid-column:1;font-size:11.5px;color:var(--muted-foreground);display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.rrow .meta .ic{color:var(--axi-violet)}
.rrow .side{grid-row:1 / span 3;display:flex;flex-direction:column;align-items:flex-end;gap:4px}
.rrow .acts{opacity:.9}
.rrow.hl{animation:hl 2.4s var(--ease) both;margin:0 -8px;padding-left:8px;padding-right:8px;border-radius:10px}
.sess{display:flex;flex-direction:column;gap:6px}
.sess a{display:grid;grid-template-columns:32px 1fr auto;gap:10px;align-items:center;padding:8px 10px;border-radius:12px;border:1px solid var(--border);text-decoration:none}
.sess a:hover{background:var(--secondary)}
.sess .sq{width:32px;height:32px;border-radius:9px;background:var(--secondary);display:grid;place-items:center;color:var(--foreground)}
.sess b{display:block;font-weight:500;font-size:13px;line-height:1.25}
.sess small{display:block;color:var(--muted-foreground);font-size:11.5px}
.toast{position:absolute;right:360px;bottom:84px;z-index:35;width:300px;display:grid;grid-template-columns:20px 1fr;gap:10px;padding:12px 14px;border-radius:var(--radius-lg);border:1px solid var(--border);background:color-mix(in srgb, var(--background) 82%, transparent);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);box-shadow:var(--shadow-overlay);animation:rise .28s var(--ease) both;font-size:13px}
.toast .ic{color:var(--axi-violet);margin-top:1px}
.toast b{display:block;font-weight:500}
.toast small{color:var(--muted-foreground);font-size:12px}

/* ===================== tabla de contactos ===================== */
.filters{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.filters .input{min-width:260px;flex:1 1 260px;max-width:420px;height:36px;border-radius:var(--radius-md)}
.filters .select{height:36px;border-radius:var(--radius-md);min-width:144px}
.filters .select.on{background:var(--accent);border-color:transparent}
.table-wrap{overflow-x:auto;border:1px solid var(--border);border-radius:var(--radius-lg);background:var(--background)}
table{width:100%;border-collapse:collapse;font-size:13.5px;min-width:760px}
th,td{text-align:left;padding:10px 14px;border-bottom:1px solid var(--border-soft);vertical-align:middle}
th{font-size:12px;font-weight:500;color:var(--muted-foreground);letter-spacing:.02em;white-space:nowrap}
tbody tr:last-child td{border-bottom:none}
tbody tr:hover td{background:var(--secondary)}
td .who{gap:10px} td .who b{display:block;font-weight:500;line-height:1.25} td .who small{display:block;color:var(--muted-foreground);font-size:12px}
.pager{display:flex;justify-content:space-between;align-items:center;font-size:13px;color:var(--muted-foreground)}
.datacell{display:inline-flex;flex-direction:column;gap:2px}
.datacell small{font-size:11.5px;color:var(--muted-foreground)}

/* estado vacío */
.empty{display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px;padding:28px 16px}
.empty .glyph{width:64px;height:64px;border-radius:20px;background:var(--secondary);display:grid;place-items:center;color:var(--axi-violet)}
.empty h3{font-size:15px;font-family:var(--font-body);font-weight:600;letter-spacing:0}
.empty p{color:var(--muted-foreground);font-size:13px;max-width:44ch}

@media (max-width:900px){
  .row,.missing .row{grid-template-columns:minmax(0,1fr) auto;grid-auto-rows:auto}
  .row .val{grid-column:1 / -1} .row .src,.row .badge{grid-column:1} .row .acts{grid-column:2;grid-row:1}
  .inbox{grid-template-columns:1fr;height:auto} .chat,.rail{display:none} .toast{right:16px}
}
@media (prefers-reduced-motion: reduce){
  .modal,.toast,.row.hl,.rrow.hl{animation:none!important;opacity:1!important;transform:none!important}
}
"""


# ----------------------------------------------------------------------------- piezas
def btn(label: str, icon: str = "", cls: str = "", attrs: str = "") -> str:
    return f'<button class="btn {cls}" {attrs}>{ic(icon) if icon else ""}{label}</button>'


def badge(label: str, cls: str = "") -> str:
    return f'<span class="badge {cls}"><span class="dot"></span>{label}</span>'


def crumb(*parts: str) -> str:
    items = [f"<b>{p}</b>" if i == len(parts) - 1 else p for i, p in enumerate(parts)]
    return '<nav class="crumb" aria-label="Breadcrumb">' + f' {ic("chevron-right", size=14)} '.join(items) + "</nav>"


def crm_nav(active: str = "Contactos") -> str:
    tabs = [("Contactos", "users"), ("Pipeline", "kanban"), ("Tareas", "list-checks"), ("Configuración", "settings")]
    return '<nav class="seg" aria-label="Secciones del CRM">' + "".join(
        f'<a href="#" {"aria-current=page" if t == active else ""}>{ic(i)}{t}</a>' for t, i in tabs
    ) + "</nav>"


SRC_META = {
    "ai_agent": ("Agente IA", "sparkles", "ia"),
    "user": ("Operador", "user-round", ""),
    "import": ("Importación", "upload", ""),
    "public_form": ("Formulario web", "globe", ""),
    "integration": ("Integración", "plug", ""),
    "merge": ("Fusión", "git-merge", ""),
}


def src(kind: str, when: str = "", who: str = "") -> str:
    label, icon, cls = SRC_META[kind]
    detail = who or when
    return f'<span class="src {cls}">{ic(icon, size=14)}<span>{label}{f"<br><small>{detail}</small>" if detail else ""}</span></span>'


def state(kind: str) -> str:
    return {
        "captured": badge("Capturado", "off"),
        "confirmed": badge("Confirmado", "ok"),
        "corrected": badge("Corregido", "ok"),
        "invalid": badge("Inválido", "warn"),
        "missing": badge("Falta", "warn"),
        "proposal": badge("Propuesta pendiente", "warn"),
        "undefined": badge("Sin definir", "off"),
    }[kind]


def acts(*names: str) -> str:
    meta = {
        "confirm": ("check", "Confirmar", ""),
        "edit": ("pencil", "Corregir", ""),
        "reject": ("x", "Rechazar", "danger"),
        "release": ("lock-open", "Liberar (permitir que el agente lo actualice)", ""),
        "apply": ("sparkles", "Aplicar la propuesta del agente", ""),
        "add": ("plus", "Añadir al formulario de captura", ""),
    }
    out = ""
    for n in names:
        icon, title, cls = meta[n]
        out += f'<button class="btn ghost icon xs {cls}" title="{title}" aria-label="{title}">{ic(icon, size=14)}</button>'
    return f'<div class="acts">{out}</div>'


def lbl(label: str, code: str, flow: str = "", required: bool = False, protected: bool = False, undefined: bool = False) -> str:
    bits = [f"<code>{code}</code>"]
    if flow:
        bits.append(f"· {flow}")
    if required:
        bits.append("· obligatorio")
    if undefined:
        bits.append("· sin formulario")
    lock = f' {ic("lock", "lock", size=12)}' if protected else ""
    return f'<div class="lbl"><b>{label}{lock}</b><small>{" ".join(bits)}</small></div>'


def val(v: str, said: str = "", invalid: str = "", proposal: str = "", empty: bool = False) -> str:
    extra = ""
    if said:
        extra += f'<span class="said">{ic("sparkles", size=12)}dijo «{said}»</span>'
    if invalid:
        extra += f'<span class="invalid">{ic("circle-alert", size=12)}{invalid}</span>'
    if proposal:
        extra += f'<span class="proposal">{ic("sparkles", size=12)}El agente propone: <b>{proposal}</b></span>'
    return f'<div class="val {"empty" if empty else ""}"><span class="v">{v}</span>{extra}</div>'


def row(label_html: str, value_html: str, source_html: str, state_html: str, acts_html: str, cls: str = "") -> str:
    return f'<div class="row {cls}">{label_html}{value_html}{source_html}{state_html}{acts_html}</div>'


# ----------------------------------------------------------------------------- 360
def header_360() -> str:
    return f"""
    <div class="header">
      <div class="who">
        <div class="av">LG</div>
        <div>
          <h1>Laura Gómez</h1>
          <div class="sub">{badge("Lead", "lead")}<span>{ic("phone", size=13)} +57 300 123 4567</span><span>{ic("mail", size=13)} laura.gomez@kodecol.co</span><span>{ic("map-pin", size=13)} Bogotá</span></div>
        </div>
      </div>
      <div class="right">
        <span class="select">{ic("user-round", size=14)} Responsable: Isabel {ic("chevron-down", size=14)}</span>
        {btn("Editar", "pencil", "outline sm")}
        {btn("", "ellipsis-vertical", "outline icon sm", 'aria-label="Más acciones"')}
      </div>
    </div>"""


def summary_grid() -> str:
    return f"""
    <div class="grid2">
      <div class="stack">
        <section class="card">
          <div class="card-head"><div><h2>Puntaje del embudo</h2><p class="lead">Hitos por comportamiento, con evidencia</p></div></div>
          <div class="score"><div class="ring"><b>60</b></div>
            <div class="steps"><span class="step">{ic("circle-check", size=14)}Conversó</span><span class="step">{ic("circle-check", size=14)}Interés</span><span class="step">{ic("circle-check", size=14)}Evaluando</span><span class="step off">{ic("circle", size=14)}Comprometido</span><span class="step off">{ic("circle", size=14)}Convertido</span></div>
          </div>
        </section>
        <section class="card">
          <div class="card-head"><div><h2>{ic("sparkles", size=16)} Copiloto</h2><p class="lead">Resumen · Siguiente acción · Borrador</p></div><div class="right">{btn("Resumen", "", "outline sm")}{btn("Siguiente acción", "", "outline sm")}</div></div>
          <p class="muted" style="font-size:13px">Pidió cotización del plan anual para dos sedes; quedó pendiente confirmar el sector para la propuesta.</p>
        </section>
      </div>
      <div class="stack">
        <section class="card">
          <div class="card-head"><div><h2>Etiquetas</h2></div>{btn("Editar", "pencil", "ghost sm")}</div>
          <div class="tags">{badge("vip", "outline")}{badge("mayorista", "outline")}</div>
        </section>
        <section class="card">
          <div class="card-head"><div><h2>Oportunidades</h2><p class="lead">1 abierta</p></div>{btn("Nueva", "plus", "outline sm")}</div>
          <dl class="kv"><dt>Plan anual · 2 sedes</dt><dd>Propuesta · $ 4.200.000</dd></dl>
        </section>
      </div>
    </div>"""


def data_rows(editing: bool = False, live: bool = False) -> str:
    rows = [
        row(lbl("Empresa", "company_name", "Registro", required=True), val("Kodecol"), src("ai_agent", "hoy 10:12"), state("captured"), acts("confirm", "edit", "reject"), "hl" if live else ""),
        (
            row(
                lbl("Sector", "sector", "Registro", required=True, protected=True),
                f"""<div class="val rel"><div class="field"><span class="select" aria-expanded="true">Tecnología {ic("chevron-down", size=14)}</span><span class="hint">Enter guarda · Esc cancela</span></div>
                    <div class="listbox" role="listbox"><div>Salud</div><div aria-selected="true">Tecnología {ic("check", size=14)}</div><div>Retail</div><div>Educación</div><div>Servicios</div></div></div>""",
                src("user", "Isabel · ahora"),
                state("corrected"),
                f'<div class="acts">{btn("Guardar", "", "sm")}{btn("Cancelar", "", "ghost sm")}</div>',
                "editing",
            )
            if editing
            else row(lbl("Sector", "sector", "Registro", required=True, protected=True), val("Salud", said="salud tecnologia"), src("ai_agent", "hoy 10:12"), state("captured"), acts("confirm", "edit", "reject"))
        ),
        row(lbl("Ciudad", "city", "Registro"), val("Bogotá"), src("user", "Isabel · ayer"), state("confirmed"), acts("edit", "release")),
        row(lbl("Correo", "email", "Registro", required=True), val("laura.gomez@kodecol.co"), src("user", "Andrés · 12 sep"), state("corrected"), acts("edit", "release")),
        row(lbl("Dirección", "address", "Pedido"), val("Cra 7 # 45-10, of 302"), src("import", "12 sep · leads_sept.xlsx"), state("captured"), acts("confirm", "edit", "reject")),
        row(lbl("Presupuesto mensual", "presupuesto", "Pedido"), val("$ 3.000.000"), src("public_form", "9 sep · contacto-web"), state("captured"), acts("confirm", "edit", "reject")),
        row(lbl("Tamaño del equipo", "team_size", "Registro", protected=True), val("12 personas", proposal="20 personas"), src("user", "Isabel · 11 sep"), state("proposal"), acts("apply", "edit", "release")),
        row(lbl("Teléfono alterno", "telefono_alterno", "Registro"), val("—", invalid="«+57 3 00» no es un número marcable", empty=True), src("ai_agent", "hoy 10:14"), state("invalid"), acts("edit")),
        row(lbl("Instagram", "instagram_user", undefined=True), val("@lauragomez.co"), src("ai_agent", "13 sep"), state("undefined"), acts("add", "edit", "reject")),
    ]
    return "".join(rows)


def missing_rows() -> str:
    return "".join(
        [
            row(lbl("Fecha de decisión", "fecha_decision", "Pedido", required=True), val("Sin dato", empty=True), f'<span class="tries">{ic("repeat", size=13)}Pedido 3 veces</span>', state("missing"), acts("edit")),
            row(lbl("NIT", "document_number", "Pedido", required=True), val("Sin dato", empty=True), f'<span class="tries calm">{ic("repeat", size=13)}Aún no pedido</span>', state("missing"), acts("edit")),
        ]
    )


def system_rows() -> str:
    return f"""<details class="sys"><summary>{ic("chevron-right", size=14)}Técnicos (2) · claves de fusiones y del sistema</summary>
      <div class="rows">
        {row(lbl("_merged_phone", "_merged_phone"), val("+57 310 555 0199"), src("merge", "8 sep"), state("captured"), "")}
        {row(lbl("_merged_into", "_merged_into"), val("01a0…c3f2"), src("merge", "8 sep"), state("captured"), "")}
      </div></details>"""


def data_card(editing: bool = False, live: bool = False) -> str:
    return f"""
    <section class="card data-card" aria-labelledby="dc-title">
      <div class="card-head">
        <div><h2 id="dc-title">{ic("clipboard-list", size=16)} Datos recopilados</h2><p class="lead">Lo que el agente, el equipo y los formularios saben de este contacto, con su origen. Lo que confirmes o corrijas queda protegido: el agente solo podrá proponer cambios.</p></div>
        <div class="right">{btn("Formularios de captura", "settings-2", "outline sm")}</div>
      </div>
      <h3 class="sect">Recopilados <span class="count">· 9 campos</span></h3>
      <div class="rows">{data_rows(editing, live)}</div>
      <h3 class="sect">Faltan <span class="count">· 2 obligatorios</span></h3>
      <div class="rows missing">{missing_rows()}</div>
      {system_rows()}
      <p class="foot-note">{ic("info", size=14)}<span>«Rechazar» borra el dato y deja que el agente lo vuelva a pedir. {ic("lock", size=11)} = protegido por el equipo. Las acciones aparecen al pasar el ratón; en táctil, siempre.</span></p>
    </section>"""


def view_360(editing: bool = False, dialog: bool = False) -> str:
    modal = ""
    if dialog:
        modal = f"""
        <div class="overlay">
          <div class="modal" role="dialog" aria-modal="true" aria-labelledby="rj">
            <h2 id="rj">¿Rechazar este dato?</h2>
            <p>Se borra de la ficha y el agente podrá volver a pedirlo en la próxima conversación. Queda en el historial quién lo rechazó.</p>
            <dl class="quote"><dt>Empresa</dt><dd>Kodecol</dd><dt>Origen</dt><dd>Agente IA · hoy 10:12</dd></dl>
            <div class="modal-foot">{btn("Cancelar", "", "outline")}{btn("Rechazar dato", "x", "destructive")}</div>
          </div>
        </div>"""
    return f"""
    <div class="page">
      {crumb("CRM", "Contactos", "Laura Gómez")}
      {crm_nav("Contactos")}
      {header_360()}
      {summary_grid()}
      {data_card(editing=editing)}
      <section class="card"><div class="card-head"><div><h2>Historial</h2><p class="lead">Actividades · Oportunidades · Pedidos · Conversaciones · Citas</p></div>{btn("Programar seguimiento", "sparkles", "outline sm")}</div><p class="muted" style="font-size:13px">hoy 10:12 · Conversación · «Datos capturados por el agente: empresa, sector» · ✦ IA</p></section>
    </div>{modal}"""


# ----------------------------------------------------------------------------- inbox
def chat(live: bool = False) -> str:
    live_bits = ""
    if live:
        live_bits = f"""
        <div class="bubble in">Sí, trabajo en Kodecol, en el área de salud tecnología<time>10:12</time></div>
        <div class="tool-note">{ic("sparkles", size=12)}El agente guardó: empresa, sector</div>
        <div class="bubble out"><span class="who-ia">{ic("sparkles", size=11)}Agente</span>¡Perfecto, Laura! ¿Para cuándo necesitan tener la decisión tomada?<time>10:12</time></div>"""
    return f"""
    <div class="chat">
      <div class="chat-head">
        <div class="who"><div class="av sm">LG</div><div><h1>Laura Gómez</h1><div class="sub">+57 300 123 4567 · WhatsApp Principal</div></div></div>
        {badge("Lead", "lead")}{badge("IA", "outline")}
        <div class="right">{btn("Intervenir", "", "outline sm")}{btn("", "ellipsis-vertical", "outline icon sm", 'aria-label="Más"')}</div>
      </div>
      <div class="thread">
        <span class="day">Hoy</span>
        <div class="bubble in">Hola, quiero cotizar el plan anual para dos sedes<time>10:09</time></div>
        <div class="bubble out"><span class="who-ia">{ic("sparkles", size=11)}Agente</span>¡Hola! Con gusto. Para armarte la propuesta, ¿me confirmas el nombre de tu empresa y el sector en el que trabajan?<time>10:10</time></div>
        {live_bits or f'<div class="bubble in">Sí, trabajo en Kodecol, en el área de salud tecnología<time>10:12</time></div><div class="bubble out"><span class="who-ia">{ic("sparkles", size=11)}Agente</span>¡Perfecto, Laura! ¿Para cuándo necesitan tener la decisión tomada?<time>10:12</time></div>'}
      </div>
      <div class="composer"><span class="input">Escribe un mensaje…</span>{btn("", "send", "icon", 'aria-label="Enviar"')}</div>
    </div>"""


def rail_icons() -> str:
    return f"""
    <aside class="rail" aria-label="Contexto">
      <button aria-pressed="true" title="Contacto">{ic("user-round")}</button>
      <button aria-pressed="false" title="Adjuntos">{ic("paperclip")}</button>
      <button aria-pressed="false" title="Historial">{ic("history")}</button>
      <button aria-pressed="false" title="Llamadas">{ic("phone")}</button>
    </aside>"""


def rrow(label: str, kind: str, value: str, meta: str, st: str, actions: str, cls: str = "", icon: str = "") -> str:
    lab, ico, c = SRC_META[kind] if kind in SRC_META else (label, icon, "")
    return f"""<div class="rrow {cls}">
      <div class="lbl {c}">{ic(ico, size=12)}{label}</div>
      <div class="v {'empty' if value == 'Sin dato' else ''}">{value}</div>
      <div class="meta">{meta}</div>
      <div class="side">{st}{actions}</div>
    </div>"""


def contact_panel(live: bool = False) -> str:
    new_row = rrow("Sector", "ai_agent", "Salud", f'{ic("sparkles", size=11)}dijo «salud tecnologia» · Agente IA · ahora', state("captured"), acts("confirm", "edit"), "hl" if live else "")
    return f"""
    <section class="panel" aria-label="Contacto">
      <div class="panel-head"><span>Contacto</span>{btn("", "x", "ghost icon sm", 'aria-label="Cerrar"')}</div>
      <div class="panel-body">
        <div class="who"><div class="av">LG</div><div><p style="font-weight:500">Laura Gómez</p><div class="sub">{badge("Lead", "lead")}<span class="tnum">Score 60</span></div></div></div>
        <dl class="fl"><dt>Teléfono</dt><dd>+57 300 123 4567</dd><dt>Email</dt><dd>laura.gomez@kodecol.co</dd><dt>Ciudad</dt><dd>Bogotá</dd><dt>Origen</dt><dd>Conversación</dd></dl>
        <div>
          <h3 class="sect" style="margin-top:0">{ic("clipboard-list", size=13)} Datos recopilados <span class="count">· 6</span></h3>
          <div class="rrows">
            {rrow("Empresa", "ai_agent", "Kodecol", "Agente IA · hoy 10:12", state("captured"), acts("confirm", "edit"), "hl" if live else "")}
            {new_row}
            {rrow("Tamaño del equipo", "user", "12 personas", f'{ic("sparkles", size=11)}Propuesta del agente: 20 personas', state("proposal"), acts("apply", "edit"))}
            {rrow("Presupuesto mensual", "public_form", "$ 3.000.000", "Formulario web · 9 sep", state("captured"), acts("confirm", "edit"))}
          </div>
          <h3 class="sect">Faltan <span class="count">· 2 obligatorios</span></h3>
          <div class="rrows">
            {rrow("Fecha de decisión", "ai_agent", "Sin dato", f'<span class="tries">{ic("repeat", size=12)}Pedido 3 veces</span>', state("missing"), acts("edit"))}
            {rrow("NIT", "ai_agent", "Sin dato", '<span class="tries calm">Aún no pedido</span>', state("missing"), acts("edit"))}
          </div>
          <h3 class="sect">De esta conversación</h3>
          <div class="sess">
            <a href="#"><span class="sq">{ic("shopping-cart", size=15)}</span><span><b>Pedido en borrador</b><small>2 productos · $ 180.000</small></span>{ic("chevron-right", size=14)}</a>
            <a href="#"><span class="sq">{ic("calendar", size=15)}</span><span><b>Cita propuesta</b><small>jue 18 sep · 10:00</small></span>{ic("chevron-right", size=14)}</a>
          </div>
        </div>
      </div>
      <div class="panel-foot">{btn("Programar seguimiento", "sparkles", "outline sm")}{btn("Ver ficha completa", "external-link", "outline sm")}</div>
    </section>"""


def view_inbox(live: bool = False) -> str:
    toast = ""
    if live:
        toast = f'<div class="toast" role="status">{ic("sparkles", size=16)}<div><b>El agente guardó 2 datos</b><small>Empresa y sector · la ficha se actualizó</small></div></div>'
    return f'<div class="inbox">{chat(live)}{rail_icons()}{contact_panel(live)}</div>{toast}'


# ----------------------------------------------------------------------------- tabla
CONTACTS = [
    ("LG", "Laura Gómez", "+57 300 123 4567", "Lead", "lead", "Bogotá", "Conversación", ("warn", "Faltan 2", "9 recopilados")),
    ("AR", "Andrés Ruiz", "+57 315 880 2211", "Cliente", "customer", "Medellín", "Conversación", ("ok", "Completo", "5 recopilados")),
    ("CT", "Camila Torres", "camila.t@correo.com", "Prospecto", "prospect", "Cali", "Formulario web", ("ok", "Completo", "3 recopilados")),
    ("JP", "Julián Pardo", "+57 301 456 7890", "Lead", "lead", "Bogotá", "Importación", ("warn", "Faltan 4", "1 recopilado")),
    ("VM", "Valentina Mora", "+57 320 998 1122", "Prospecto", "prospect", "Barranquilla", "Manual", ("warn", "Faltan 3", "2 recopilados")),
    ("SV", "Santiago Vélez", "+57 310 224 6688", "Cliente", "customer", "Bucaramanga", "Integración", ("ok", "Completo", "4 recopilados")),
    ("MC", "Mariana Castro", "mcastro@empresa.co", "Lead", "lead", "Pereira", "Captación", ("off", "Sin datos", "sin formulario activo")),
]


def view_table() -> str:
    rows = "".join(
        f"""<tr>
          <td><div class="who"><div class="av sm">{ini}</div><div><b>{name}</b><small>{contact}</small></div></div></td>
          <td>{badge(stage, cls)}</td>
          <td>{city}</td>
          <td class="muted">{source}</td>
          <td><span class="datacell">{badge(d[1], d[0])}<small>{d[2]}</small></span></td>
          <td class="muted tnum">14 sep</td>
          <td>{btn("", "ellipsis-vertical", "ghost icon sm", 'aria-label="Acciones"')}</td>
        </tr>"""
        for ini, name, contact, stage, cls, city, source, d in CONTACTS
    )
    return f"""
    <div class="page">
      {crumb("CRM", "Contactos")}
      <div class="header">{crm_nav("Contactos")}<div class="right">{btn("Duplicados", "copy", "outline sm")}{btn("Importar / Exportar", "arrow-down-up", "outline sm")}{btn("Nuevo contacto", "plus", "sm")}</div></div>
      <div class="filters">
        <span class="input">{ic("search", size=15)} Buscar por nombre, teléfono o correo…</span>
        <span class="select">Etapa {ic("chevron-down", size=14)}</span>
        <span class="select">Origen {ic("chevron-down", size=14)}</span>
        <span class="select on">{ic("clipboard-list", size=14)} Datos: incompletos {ic("x", size=14)}</span>
        <span class="select">Más filtros {ic("chevron-down", size=14)}</span>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Contacto</th><th>Etapa</th><th>Ciudad</th><th>Origen</th><th>Datos</th><th>Creado</th><th></th></tr></thead>
        <tbody>{rows}</tbody>
      </table></div>
      <div class="pager"><span>Mostrando 7 de 268 contactos · 3 con datos incompletos</span><span>1 · 2 · 3 … 11</span></div>
    </div>"""


def view_empty() -> str:
    return f"""
    <div class="page">
      {crumb("CRM", "Contactos", "Mariana Castro")}
      {crm_nav("Contactos")}
      <div class="header"><div class="who"><div class="av">MC</div><div><h1>Mariana Castro</h1><div class="sub">{badge("Lead", "lead")}<span>{ic("mail", size=13)} mcastro@empresa.co</span><span>{ic("map-pin", size=13)} Pereira</span></div></div></div></div>
      <section class="card data-card">
        <div class="card-head"><div><h2>{ic("clipboard-list", size=16)} Datos recopilados</h2><p class="lead">Lo que el agente, el equipo y los formularios saben de este contacto, con su origen.</p></div></div>
        <div class="empty">
          <div class="glyph">{ic("clipboard-list", size=28)}</div>
          <h3>Tu agente todavía no pide datos</h3>
          <p>Define en Formularios de captura qué debe conseguir el agente antes de cerrar un pedido o una cita. Lo que recoja aparecerá aquí, con su origen y estado.</p>
          {btn("Configurar formularios de captura", "settings-2", "outline sm")}
        </div>
      </section>
    </div>"""


VIEWS = [
    ("card", "1 · Card 360", view_360(), "La card «Datos recopilados» entra en el Contacto 360 entre el resumen y el historial. Cada fila: dato · valor · origen · estado · acciones. El candado marca lo protegido por el equipo; «dijo …» enseña lo que el cliente escribió cuando el agente lo interpretó."),
    ("edit", "2 · Corregir", view_360(editing=True), "Corregir en línea: el control depende del tipo del campo (aquí un select con las opciones del formulario). Al guardar, el dato queda Corregido · Operador y protegido: el agente solo podrá proponer."),
    ("reject", "3 · Rechazar", view_360(dialog=True), "Rechazar pide confirmación: borra el valor, NO protege el campo y el agente puede volver a pedirlo. Destructivo en rojo, nunca coral."),
    ("rail", "4 · Rail del inbox", view_inbox(), "La misma información en el rail de contexto (variante compacta): recopilados, faltan (con cuántas veces lo pidió el agente) y «De esta conversación» con el pedido en borrador y la cita propuesta."),
    ("live", "5 · En vivo", view_inbox(live=True), "El agente acaba de guardar dos datos en la conversación: las filas aparecen resaltadas sin recargar (llega `contact.updated` por WebSocket) y el aviso lo dice."),
    ("table", "6 · Tabla", view_table(), "Columna «Datos» en /crm/contacts (Completo · Faltan N · Sin datos) con un filtro «Datos: incompletos». El conteo lo dan los formularios activos."),
    ("empty", "7 · Vacío", view_empty(), "Tenant sin formularios de captura: la card explica qué hacer y lleva a configurarlos. Sin ámbar, sin tinte."),
]

JS = r"""
(function () {
  var views = document.querySelectorAll('.view');
  var buttons = document.querySelectorAll('.mk-view');
  var note = document.getElementById('mk-note');
  function show(id) {
    buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.view === id)); });
    views.forEach(function (v) {
      var on = v.dataset.view === id;
      v.hidden = !on;
      if (on) {
        note.textContent = v.dataset.note;
        v.querySelectorAll('.modal,.toast,.hl').forEach(function (el) {
          el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
        });
      }
    });
    window.scrollTo({ top: 0 });
  }
  buttons.forEach(function (b) { b.addEventListener('click', function () { show(b.dataset.view); history.replaceState(null, '', '#' + b.dataset.view); }); });
  document.getElementById('theme').addEventListener('click', function () {
    var root = document.documentElement;
    var dark = root.getAttribute('data-theme') === 'dark' || (!root.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);
    root.setAttribute('data-theme', dark ? 'light' : 'dark');
  });
  var ids = Array.prototype.map.call(views, function (v) { return v.dataset.view; });
  var initial = location.hash.slice(1);
  show(ids.indexOf(initial) >= 0 ? initial : 'card');
})();
"""


def build() -> None:
    link, faces = font_css()
    css = CSS.replace("__LIGHT__", LIGHT).replace("__DARK__", DARK)
    mk_buttons = "".join(f'<button class="mk-view" data-view="{k}" aria-pressed="false">{label}</button>' for k, label, _, _ in VIEWS)
    sections = "".join(
        f'<section class="view" data-view="{k}" data-note="{note}" hidden>{html}</section>' for k, _, html, note in VIEWS
    )
    doc = f"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Datos recopilados del contacto</title>
{link}
<style>
{faces}
{css}
</style>
</head>
<body>
<div class="mk-bar">
  <span class="mk-tag">Mockup F0 · no es producto</span>
  <span>CRM · F1 «El dato que el agente recopila»</span>
  <div class="mk-views" role="group" aria-label="Vistas del mockup">{mk_buttons}<button class="mk-theme" id="theme">Tema</button></div>
  <span class="mk-note" id="mk-note"></span>
</div>
{sections}
<script>{JS}</script>
</body>
</html>
"""
    OUT.write_text(doc)
    LUCIDE_JSON.write_text(json.dumps(_ICON_CACHE, indent=0, ensure_ascii=False))
    print(f"{OUT.name}: {OUT.stat().st_size // 1024} KB, {len(VIEWS)} vistas, {len(_ICON_CACHE)} iconos, fuentes {'embebidas' if faces else 'Google Fonts'}")


if __name__ == "__main__":
    build()
