#!/usr/bin/env python3
"""Mockup «Importar / Plantilla / Exportar contactos» (plan crm_contacts_import_export_plan.md, F0).

Genera `crm-contacts-import-export.html` autocontenido. Vistas: la cabecera de
Contactos con el menú agrupado abierto; el modal de importación en sus cuatro
pasos (guía animada, archivo + opciones, procesando, reporte); el error de
archivo inválido; y el historial de /crm/settings/imports.

Fuentes: los subsets woff2 que Next ya compiló en `.next/static/media` (Poppins
400–700, Nexa 700, Geist Mono) se incrustan como data URI porque el CSP del
Artifact bloquea CDNs. Si no hay build, cae a Google Fonts + fallback local.
Iconos: los `__iconNode` de `node_modules/lucide-react` (los mismos SVG que
pinta el panel). Tokens: copiados literalmente de `src/app/globals.css`.

Uso:  python3 crm-contacts-import-export.build.py
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
OUT = S / "crm-contacts-import-export.html"

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
    """(link tags, @font-face css). Prefiere los subsets locales; si no hay build, Google Fonts."""
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
_ICON_CACHE: dict[str, str] = {}


def ic(name: str, cls: str = "", size: int = 16) -> str:
    if name not in _ICON_CACHE:
        txt = (LUCIDE_DIR / f"{name}.js").read_text()
        body = ""
        for tag, attrs in re.findall(r'\["(\w+)",\s*\{([^}]*)\}\]', txt):
            pairs = [(k, v) for k, v in re.findall(r'(\w+):\s*"([^"]*)"', attrs) if k != "key"]
            body += f"<{tag} " + " ".join(f'{k}="{v}"' for k, v in pairs) + "/>"
        _ICON_CACHE[name] = body
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
  /* La isla oscura de la guía usa los PRIMITIVOS del tema oscuro en ambos temas
     (mismo recurso que las «islas oscuras» de /productos): no inventa paleta. */
  --island:#0a0a0a; --island-fg:#ededed; --island-brand:#fb7185;
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

/* ---- shell del panel: grupo (content), max-w-7xl p-6 ------------------------------------- */
.view{position:relative}
.page{max-width:1120px;margin:0 auto;padding:20px 16px 80px;display:flex;flex-direction:column;gap:16px}
.crumb{font-size:13px;color:var(--muted-foreground);display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.crumb b{color:var(--foreground);font-weight:500}
.seg{display:flex;width:fit-content;max-width:100%;gap:2px;padding:4px;border-radius:999px;border:1px solid var(--border);background:var(--background);box-shadow:var(--shadow-float);overflow-x:auto;scrollbar-width:none}
.seg a{display:inline-flex;align-items:center;gap:8px;height:36px;padding:0 14px;border-radius:999px;color:var(--muted-foreground);text-decoration:none;white-space:nowrap;font-weight:500}
.seg a[aria-current="page"]{background:var(--accent);color:var(--foreground)}
.header{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px}
.header h1{font-size:22px}
.header .right{display:flex;gap:8px;align-items:center;flex-wrap:wrap}

/* botones (ui/button.tsx): default = gradiente corto; outline; ghost; sm = h-8 */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:36px;padding:0 16px;border-radius:999px;border:1px solid transparent;background-image:linear-gradient(to right,var(--axi-brand),var(--axi-brand-2));color:var(--axi-on-color);font-weight:500;font-size:14px;text-decoration:none;white-space:nowrap;transition:filter .2s,transform .1s}
.btn:hover{filter:brightness(1.1)} .btn:active{transform:scale(.97)}
.btn.outline{background-image:none;background:var(--background);color:var(--foreground);border-color:var(--border)}
.btn.outline:hover{background:var(--secondary);filter:none}
.btn.ghost{background-image:none;background:transparent;color:var(--foreground)}
.btn.ghost:hover{background:var(--secondary);filter:none}
.btn.sm{height:32px;padding:0 12px;font-size:13px}
.btn.icon{width:36px;padding:0}
.btn[disabled]{opacity:.5;pointer-events:none}
.btn.link{background:none;color:var(--muted-foreground);height:auto;padding:0;font-weight:400;text-decoration:underline;text-underline-offset:3px;text-decoration-color:var(--border)}
.btn.link:hover{color:var(--foreground);filter:none}

/* menú agrupado (ui/dropdown-menu.tsx: propio, glass, absolute) */
.dd{position:relative}
.dd-trigger .ic:last-child{transition:transform .2s}
.dd[data-open] .dd-trigger{background:var(--secondary)}
.dd[data-open] .dd-trigger .ic:last-child{transform:rotate(180deg)}
.dd-menu{position:absolute;right:0;top:calc(100% + 6px);z-index:20;width:300px;padding:4px;border-radius:var(--radius-lg);border:1px solid var(--border);background:color-mix(in srgb, var(--background) 65%, transparent);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);box-shadow:var(--shadow-float);display:flex;flex-direction:column;transform-origin:top right;animation:pop .18s var(--ease) both}
@keyframes pop{from{opacity:0;transform:scale(.96) translateY(-4px)}}
.dd-item{display:grid;grid-template-columns:32px 1fr;gap:12px;align-items:center;width:100%;padding:8px 10px;border-radius:10px;text-align:left}
.dd-item:hover,.dd-item:focus-visible{background:var(--accent);outline:none}
.dd-ic{width:32px;height:32px;border-radius:10px;display:grid;place-items:center;background:var(--secondary);color:var(--foreground)}
.dd-item:hover .dd-ic{background:var(--background)}
.dd-item b{display:block;font-weight:500;font-size:13.5px;line-height:1.3}
.dd-item small{display:block;color:var(--muted-foreground);font-size:12px;line-height:1.35}
.dd-item .kbd{margin-left:auto}
.dd-sep{height:1px;background:var(--border);margin:4px 8px}
.dd-item.export .dd-ic{background:var(--accent)}

/* filtros + tabla (calco de ContactFilters + DataTable) */
.filters{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.input{display:flex;align-items:center;gap:8px;height:36px;padding:0 12px;border-radius:var(--radius-md);border:1px solid var(--input);background:var(--background);color:var(--muted-foreground);min-width:260px;flex:1 1 260px;max-width:420px}
.select{display:inline-flex;align-items:center;justify-content:space-between;gap:10px;height:36px;padding:0 12px;border-radius:var(--radius-md);border:1px solid var(--input);background:var(--background);color:var(--foreground);font-size:13.5px;min-width:144px}
.select.ph{color:var(--muted-foreground)}
.table-wrap{overflow-x:auto;border:1px solid var(--border);border-radius:var(--radius-lg);background:var(--background)}
table{width:100%;border-collapse:collapse;font-size:13.5px;min-width:720px}
th,td{text-align:left;padding:10px 14px;border-bottom:1px solid var(--border-soft);vertical-align:middle}
th{font-size:12px;font-weight:500;color:var(--muted-foreground);letter-spacing:.02em;white-space:nowrap}
tbody tr:last-child td{border-bottom:none}
tbody tr:hover td{background:var(--secondary)}
.who{display:flex;align-items:center;gap:10px;min-width:0}
.av{width:32px;height:32px;border-radius:50%;background:var(--accent);color:var(--foreground);display:grid;place-items:center;font-size:12px;font-weight:600;flex:none}
.who b{display:block;font-weight:500;line-height:1.25}
.who small{display:block;color:var(--muted-foreground);font-size:12px}
.pager{display:flex;justify-content:space-between;align-items:center;font-size:13px;color:var(--muted-foreground)}

/* badges: Badge secondary + punto (nunca tinte 12 % + texto del mismo color: no pasa AA en claro) */
.badge{display:inline-flex;align-items:center;gap:6px;height:22px;padding:0 9px;border-radius:999px;font-size:12px;font-weight:500;background:var(--secondary);color:var(--foreground);white-space:nowrap;border:1px solid var(--border-soft)}
.badge .dot{width:7px;height:7px;border-radius:50%;background:var(--muted-foreground)}
.badge.lead .dot{background:var(--axi-info)} .badge.customer .dot{background:var(--axi-success)} .badge.prospect .dot{background:var(--axi-amber)}
.badge.processing .dot{background:var(--axi-amber)} .badge.done .dot{background:var(--axi-success)} .badge.failed .dot{background:var(--axi-destructive)}
.badge.req .dot{background:var(--axi-brand)} .badge.rec .dot{background:var(--axi-amber)} .badge.opt{color:var(--muted-foreground)}
.badge.opt .dot{display:none}

/* estado vacío / tarjetas sólidas */
.card{border:1px solid var(--border);background:var(--background);border-radius:var(--radius-xl);padding:20px 24px}
.card h2{font-size:16px}
.card .lead{margin:2px 0 14px;color:var(--muted-foreground);font-size:13px}

/* ---- modal (ui/dialog.tsx: sm:max-w-2xl, rounded-xl, p-8, glass-overlay) --------------- */
.overlay{position:absolute;inset:0;z-index:30;background:var(--scrim);display:flex;align-items:flex-start;justify-content:center;padding:32px 16px 48px}
.modal{position:relative;width:100%;max-width:672px;border-radius:var(--radius-xl);border:1px solid var(--border);background:color-mix(in srgb, var(--background) 80%, transparent);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);box-shadow:var(--shadow-overlay);padding:32px;display:flex;flex-direction:column;gap:20px;animation:rise .28s var(--ease) both}
@keyframes rise{from{opacity:0;transform:translateY(8px) scale(.985)}}
.modal.guide{padding:0;overflow:hidden}
.x{position:absolute;top:16px;right:16px;width:32px;height:32px;border-radius:8px;display:grid;place-items:center;color:var(--muted-foreground);opacity:.8}
.x:hover{opacity:1;background:var(--secondary)}
.modal-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;padding-right:36px}
.modal-head h2{font-size:22px;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.modal-head p{color:var(--muted-foreground);margin-top:4px;font-size:13.5px}
.modal-foot{display:flex;justify-content:flex-end;gap:8px;align-items:center;flex-wrap:wrap}
.modal-foot .left{margin-right:auto}
.chk{display:inline-flex;align-items:center;gap:8px;font-size:13px;color:var(--muted-foreground);cursor:pointer}
.chk input{width:16px;height:16px;accent-color:var(--axi-brand);margin:0}

/* la tarjeta guía: isla oscura + cuerpo */
.hero{position:relative;height:250px;background:var(--island);color:var(--island-fg);overflow:hidden;isolation:isolate}
.hero::before{content:"";position:absolute;inset:0;background:
  radial-gradient(60% 70% at 70% 100%, color-mix(in srgb, var(--island-brand) 22%, transparent), transparent 70%),
  repeating-linear-gradient(0deg, color-mix(in srgb, var(--island-fg) 6%, transparent) 0 1px, transparent 1px 28px),
  repeating-linear-gradient(90deg, color-mix(in srgb, var(--island-fg) 6%, transparent) 0 1px, transparent 1px 28px);
  mask-image:linear-gradient(180deg, transparent 0%, #000 35%, #000 100%);-webkit-mask-image:linear-gradient(180deg, transparent 0%, #000 35%, #000 100%)}
.hero .eyebrow{position:absolute;left:28px;top:22px;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:color-mix(in srgb, var(--island-fg) 55%, transparent)}
.hero .floor{position:absolute;left:50%;bottom:26px;width:420px;height:64px;transform:translateX(-50%);border-radius:50%;background:radial-gradient(closest-side, color-mix(in srgb, var(--island-brand) 45%, transparent), transparent);filter:blur(14px);opacity:.75}
.sheet{position:absolute;left:50%;bottom:40px;width:380px;height:118px;transform:translateX(-50%) perspective(600px) rotateX(58deg);transform-origin:bottom;border:1px solid color-mix(in srgb, var(--island-fg) 22%, transparent);border-radius:8px;background:
  repeating-linear-gradient(0deg, color-mix(in srgb, var(--island-fg) 10%, transparent) 0 1px, transparent 1px 30px),
  repeating-linear-gradient(90deg, color-mix(in srgb, var(--island-fg) 10%, transparent) 0 1px, transparent 1px 95px),
  color-mix(in srgb, var(--island-fg) 4%, transparent)}
.chips{position:absolute;left:50%;top:44px;transform:translateX(-50%);width:400px;height:150px}
.chip{position:absolute;display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;width:270px;height:44px;padding:0 12px 0 10px;border-radius:10px;border:1px solid color-mix(in srgb, var(--island-fg) 18%, transparent);background:color-mix(in srgb, var(--island-fg) 8%, var(--island));box-shadow:0 12px 30px rgb(0 0 0/.45), inset 0 1px 0 color-mix(in srgb, var(--island-fg) 10%, transparent);font-family:var(--font-mono);font-size:12.5px;animation:drop .7s var(--ease) both;opacity:0}
.chip .n{font-size:10.5px;color:color-mix(in srgb, var(--island-fg) 50%, transparent)}
.chip .name{font-weight:500;color:var(--island-fg)}
.chip .name small{display:block;font-family:var(--font-body);font-size:10.5px;color:color-mix(in srgb, var(--island-fg) 55%, transparent);font-weight:400;margin-top:-1px}
.chip .t{font-family:var(--font-body);font-size:11px;padding:2px 8px;border-radius:999px;background:color-mix(in srgb, var(--island-fg) 10%, transparent);color:color-mix(in srgb, var(--island-fg) 75%, transparent)}
.chip .t.req{background:color-mix(in srgb, var(--island-brand) 22%, transparent);color:var(--island-brand)}
.chip.c1{left:10px;top:0;animation-delay:.05s}
.chip.c2{left:60px;top:38px;animation-delay:.22s}
.chip.c3{left:110px;top:76px;animation-delay:.39s}
@keyframes drop{from{opacity:0;transform:translate3d(-28px,-34px,0) rotate(-3deg)}to{opacity:1;transform:none}}
.ready{position:absolute;right:26px;bottom:24px;display:inline-flex;align-items:center;gap:8px;height:28px;padding:0 10px 0 6px;border-radius:999px;border:1px solid color-mix(in srgb, var(--island-brand) 40%, transparent);background:color-mix(in srgb, var(--island-brand) 12%, var(--island));color:var(--island-fg);font-size:11.5px;animation:fadeup .5s var(--ease) .85s both;opacity:0}
.ready .ok{width:18px;height:18px;border-radius:50%;background:var(--island-brand);color:var(--island);display:grid;place-items:center}
@keyframes fadeup{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.guide-body{padding:24px 32px 28px;display:flex;flex-direction:column;gap:18px}
.eyebrow-row{display:flex;align-items:center;gap:8px;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted-foreground);font-weight:600}
.eyebrow-row::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--axi-brand)}
.guide-body h2{font-size:24px;margin-top:-8px}
.guide-body .lead{color:var(--muted-foreground);max-width:56ch;margin-top:-10px}
.spec{display:grid;grid-template-columns:40px 1fr;gap:14px;align-items:center;padding:12px 14px;border:1px solid var(--border);border-radius:var(--radius-md);background:var(--background)}
.spec .sq{width:40px;height:40px;border-radius:10px;background:var(--accent);color:var(--axi-brand);display:grid;place-items:center}
.spec b{display:block;font-weight:500}
.spec small{color:var(--muted-foreground);font-size:12.5px}
.cols{border:1px solid var(--border);border-radius:var(--radius-md);overflow:hidden;background:var(--background)}
.cols .hd,.cols .row{display:grid;grid-template-columns:minmax(0,1.5fr) 92px 150px;gap:12px;align-items:center;padding:9px 14px}
.cols .hd{font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted-foreground);font-weight:600;background:var(--secondary)}
.cols .row{border-top:1px solid var(--border-soft);font-size:13px}
.cols .name{display:flex;align-items:center;gap:8px;min-width:0}
.cols .name code{font-family:var(--font-mono);font-size:12.5px;font-weight:500}
.cols .type{color:var(--muted-foreground);font-size:12.5px}
.cols .ex{font-family:var(--font-mono);font-size:12px;text-align:right;color:var(--muted-foreground);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cols .hd .ex{font-family:var(--font-body)}
.foot-note{font-size:12px;color:var(--muted-foreground);margin-top:-8px}
@media (max-width:560px){.cols .hd,.cols .row{grid-template-columns:minmax(0,1fr) 150px}.cols .type{display:none}.chips{transform:translateX(-50%) scale(.82)}.hero .eyebrow{left:16px}}

/* paso archivo */
.drop{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:30px 20px;text-align:center;border:2px dashed var(--border);border-radius:var(--radius-lg);transition:border-color .2s,background .2s;cursor:pointer}
.drop:hover{border-color:color-mix(in srgb, var(--axi-brand) 50%, transparent)}
.drop .ic{color:var(--muted-foreground)}
.drop b{font-weight:500}
.drop small{color:var(--muted-foreground);font-size:12.5px}
.drop.error{border-color:var(--axi-destructive);background:color-mix(in srgb, var(--axi-destructive) 6%, var(--background))}
.drop.error .ic{color:var(--axi-destructive)}
.file{display:grid;grid-template-columns:44px 1fr auto;gap:14px;align-items:center;padding:12px 14px;border:1px solid var(--border);border-radius:var(--radius-lg);background:var(--background)}
.file .sq{width:44px;height:44px;border-radius:12px;background:var(--secondary);display:grid;place-items:center;color:var(--axi-success)}
.file b{display:block;font-weight:500}
.file small{color:var(--muted-foreground);font-size:12.5px}
.opts{display:grid;gap:12px;grid-template-columns:1fr}
@media (min-width:640px){.opts{grid-template-columns:repeat(3,minmax(0,1fr))}}
.opt label{display:block;font-size:12px;font-weight:500;color:var(--muted-foreground);margin-bottom:6px}
.opt .select{width:100%}
.tags{display:inline-flex;gap:6px;align-items:center;flex-wrap:wrap}
.tag{display:inline-flex;align-items:center;gap:4px;height:22px;padding:0 8px;border-radius:999px;background:var(--secondary);font-size:12px}

/* progreso ligado al job (DESIGN-SYSTEM §6: existe mientras el servidor procesa) */
.progress{height:8px;border-radius:999px;background:var(--secondary);overflow:hidden;position:relative}
.progress .bar{position:absolute;inset:0 auto 0 0;width:38%;border-radius:999px;background-image:linear-gradient(to right,var(--axi-brand),var(--axi-brand-2));animation:slide 1.4s var(--ease) infinite}
@keyframes slide{0%{transform:translateX(-110%)}100%{transform:translateX(280%)}}
.status{display:flex;align-items:center;gap:10px;color:var(--muted-foreground);font-size:13.5px}
.spin{animation:spin 1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.hint{display:grid;grid-template-columns:18px 1fr;gap:10px;padding:10px 12px;border-radius:var(--radius-md);background:var(--secondary);font-size:13px;color:var(--muted-foreground)}
.hint .ic{margin-top:2px}

/* reporte */
.tiles{display:grid;gap:10px;grid-template-columns:repeat(2,minmax(0,1fr))}
@media (min-width:640px){.tiles{grid-template-columns:repeat(4,minmax(0,1fr))}}
.tile{border:1px solid var(--border);border-radius:var(--radius-md);padding:12px 14px;background:var(--background)}
.tile .v{font-family:var(--font-heading);font-size:26px;font-weight:700;letter-spacing:-.02em;font-variant-numeric:tabular-nums;line-height:1.1}
.tile .l{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--muted-foreground);margin-top:4px}
.tile .l .dot{width:7px;height:7px;border-radius:50%}
.errs{border:1px solid var(--border);border-radius:var(--radius-md);overflow:hidden}
.errs table{min-width:0;font-size:13px}
.errs th,.errs td{padding:8px 12px}
.errs td.mono{color:var(--muted-foreground)}
.errs tbody tr:hover td{background:transparent}

/* toast flotante (floating-alert) */
.toast{position:absolute;right:24px;bottom:24px;z-index:35;width:min(380px, calc(100% - 32px));display:grid;grid-template-columns:20px 1fr;gap:12px;padding:14px 16px;border-radius:var(--radius-lg);border:1px solid color-mix(in srgb, var(--axi-destructive) 35%, var(--border));background:color-mix(in srgb, var(--background) 82%, transparent);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);box-shadow:var(--shadow-overlay);animation:rise .28s var(--ease) both}
.toast .ic{color:var(--axi-destructive);margin-top:2px}
.toast b{display:block;font-weight:500}
.toast p{color:var(--muted-foreground);font-size:13px;margin-top:2px}
.toast .acts{display:flex;gap:8px;margin-top:10px}

/* historial */
.two{display:grid;gap:16px;grid-template-columns:1fr}
@media (min-width:900px){.two{grid-template-columns:minmax(0,1.25fr) minmax(0,1fr)}}
.hist{display:flex;flex-direction:column}
.hist-row{display:grid;grid-template-columns:36px 1fr auto;gap:12px;align-items:center;padding:12px 0;border-top:1px solid var(--border-soft);text-align:left;width:100%}
.hist-row:first-child{border-top:0}
.hist-row .sq{width:36px;height:36px;border-radius:10px;background:var(--secondary);display:grid;place-items:center;color:var(--muted-foreground)}
.hist-row b{display:block;font-weight:500;font-size:13.5px}
.hist-row small{display:block;color:var(--muted-foreground);font-size:12px}
.hist-row:hover{background:var(--secondary);margin:0 -12px;padding-left:12px;padding-right:12px;border-radius:10px}

@media (prefers-reduced-motion: reduce){
  .chip,.ready,.dd-menu,.modal,.toast{animation:none!important;opacity:1!important;transform:none!important}
  .progress .bar{animation:none;width:100%;opacity:.5}
  .spin{animation:none}
}
"""


# ----------------------------------------------------------------------------- piezas
def btn(label: str, icon: str = "", cls: str = "", trailing: str = "", attrs: str = "") -> str:
    return f'<button class="btn {cls}" {attrs}>{ic(icon) if icon else ""}{label}{trailing}</button>'


def badge(label: str, cls: str = "") -> str:
    return f'<span class="badge {cls}"><span class="dot"></span>{label}</span>'


def crumb(*parts: str) -> str:
    items = []
    for i, p in enumerate(parts):
        items.append(f"<b>{p}</b>" if i == len(parts) - 1 else p)
    return '<nav class="crumb" aria-label="Breadcrumb">' + f' {ic("chevron-right", size=14)} '.join(items) + "</nav>"


def crm_nav(active: str = "Contactos") -> str:
    tabs = [("Contactos", "users"), ("Pipeline", "kanban"), ("Tareas", "list-checks"), ("Configuración", "settings")]
    return '<nav class="seg" aria-label="Secciones del CRM">' + "".join(
        f'<a href="#" {"aria-current=page" if t == active else ""}>{ic(i)}{t}</a>' for t, i in tabs
    ) + "</nav>"


def settings_nav(active: str = "Imports") -> str:
    tabs = [("Pipelines", "kanban"), ("Etiquetas", "tag"), ("Segmentos", "funnel"), ("Imports", "upload"), ("Tareas de agente", "sparkles")]
    return '<nav class="seg" aria-label="Configuración del CRM">' + "".join(
        f'<a href="#" {"aria-current=page" if t == active else ""}>{ic(i)}{t}</a>' for t, i in tabs
    ) + "</nav>"


def menu(open_: bool) -> str:
    items = ""
    if open_:
        items = f"""
        <div class="dd-menu" role="menu" aria-label="Importar / Exportar">
          <button class="dd-item" role="menuitem"><span class="dd-ic">{ic("file-down", size=16)}</span><span><b>Descargar plantilla</b><small>Excel con las columnas esperadas</small></span></button>
          <button class="dd-item" role="menuitem"><span class="dd-ic">{ic("upload", size=16)}</span><span><b>Importar contactos</b><small>CSV o XLSX · hasta 10 MB</small></span></button>
          <div class="dd-sep" role="separator"></div>
          <button class="dd-item export" role="menuitem"><span class="dd-ic">{ic("download", size=16)}</span><span><b>Exportar contactos</b><small>CSV con los filtros activos · queda auditado</small></span></button>
        </div>"""
    return f"""
      <div class="dd" {"data-open" if open_ else ""}>
        <button class="btn outline dd-trigger" aria-haspopup="menu" aria-expanded="{"true" if open_ else "false"}">{ic("arrow-down-up")}Importar / Exportar{ic("chevron-down", size=14)}</button>
        {items}
      </div>"""


CONTACTS = [
    ("LG", "Laura Gómez", "+57 300 123 4567", "Lead", "lead", "Bogotá", "Importación", "14 sep"),
    ("AR", "Andrés Ruiz", "+57 315 880 2211", "Cliente", "customer", "Medellín", "Conversación", "13 sep"),
    ("CT", "Camila Torres", "camila.t@correo.com", "Prospecto", "prospect", "Cali", "Formulario web", "13 sep"),
    ("JP", "Julián Pardo", "+57 301 456 7890", "Lead", "lead", "Bogotá", "Importación", "12 sep"),
    ("VM", "Valentina Mora", "+57 320 998 1122", "Prospecto", "prospect", "Barranquilla", "Manual", "11 sep"),
    ("SV", "Santiago Vélez", "+57 310 224 6688", "Cliente", "customer", "Bucaramanga", "Integración", "10 sep"),
    ("MC", "Mariana Castro", "mcastro@empresa.co", "Lead", "lead", "Pereira", "Captación", "9 sep"),
]


def contacts_page(menu_open: bool) -> str:
    rows = "".join(
        f"""<tr><td><div class="who"><span class="av">{ini}</span><span><b>{name}</b><small>{ch}</small></span></div></td>
        <td>{badge(stage, cls)}</td><td>{city}</td><td class="muted">{src}</td><td class="muted tnum">{date} 2026</td>
        <td><button class="btn ghost icon sm" aria-label="Acciones de {name}">{ic("ellipsis")}</button></td></tr>"""
        for ini, name, ch, stage, cls, city, src, date in CONTACTS
    )
    return f"""
    <div class="page">
      {crumb("Inicio", "CRM", "Contactos")}
      {crm_nav("Contactos")}
      <div class="header">
        <div><h1>Contactos</h1><p class="muted tnum">1.284 contactos</p></div>
        <div class="right">
          {btn("Duplicados", "copy-check", "ghost")}
          {menu(menu_open)}
          {btn("Nuevo contacto", "plus")}
        </div>
      </div>
      <div class="filters">
        <div class="input">{ic("search")}Buscar por nombre, teléfono o correo</div>
        <div class="select ph">Etapa {ic("chevron-down", size=14)}</div>
        <div class="select ph">Fuente {ic("chevron-down", size=14)}</div>
        {btn("Más filtros", "funnel", "ghost")}
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Contacto</th><th>Etapa</th><th>Ciudad</th><th>Fuente</th><th>Creado</th><th></th></tr></thead>
        <tbody>{rows}</tbody></table></div>
      <div class="pager"><span class="tnum">1–25 de 1.284</span><span style="display:flex;gap:6px">{btn("Anterior", cls="outline sm", attrs="disabled")}{btn("Siguiente", cls="outline sm")}</span></div>
    </div>"""


COLUMNS = [
    ("nombre", "Recomendada", "rec", "Texto", "Laura"),
    ("apellido", "Opcional", "opt", "Texto", "Gómez"),
    ("telefono", "Requerida*", "req", "Teléfono", "3001234567"),
    ("correo", "Requerida*", "req", "Correo", "laura@correo.com"),
    ("ciudad", "Opcional", "opt", "Texto", "Bogotá"),
    ("direccion", "Opcional", "opt", "Texto", "Cra 7 # 45-10"),
    ("etapa", "Opcional", "opt", "Lista", "prospecto · lead · cliente · otro"),
]


def guide_modal() -> str:
    rows = "".join(
        f'<div class="row"><div class="name"><code>{c}</code>{badge(req, cls)}</div><div class="type">{t}</div><div class="ex" title="{ex}">{ex}</div></div>'
        for c, req, cls, t, ex in COLUMNS
    )
    return f"""
    <div class="overlay" role="dialog" aria-modal="true" aria-labelledby="g-title">
      <div class="modal guide">
        <button class="x" aria-label="Cerrar">{ic("x")}</button>
        <div class="hero" aria-hidden="true">
          <span class="eyebrow">Estructura del archivo</span>
          <div class="sheet"></div><div class="floor"></div>
          <div class="chips">
            <div class="chip c1"><span class="n">01</span><span class="name">nombre<small>Texto</small></span><span class="t">recomendada</span></div>
            <div class="chip c2"><span class="n">03</span><span class="name">telefono<small>+57 300 123 4567</small></span><span class="t req">requerida</span></div>
            <div class="chip c3"><span class="n">04</span><span class="name">correo<small>laura@correo.com</small></span><span class="t req">requerida</span></div>
          </div>
          <div class="ready"><span class="ok">{ic("check", size=12)}</span>7 columnas · una fila por contacto</div>
        </div>
        <div class="guide-body">
          <div class="eyebrow-row">Guía de carga</div>
          <h2 id="g-title">Prepara tu archivo para empezar</h2>
          <p class="lead">Sube un archivo con estas columnas y leeremos tus contactos sin errores. Si ya tienes tu base, solo renombra las cabeceras.</p>
          <div class="spec"><span class="sq">{ic("file-spreadsheet", size=20)}</span><span><b>CSV o XLSX</b><small>Máximo 10 MB · 20.000 filas · una fila por contacto</small></span></div>
          <div class="cols">
            <div class="hd"><span>Columnas esperadas</span><span>Tipo</span><span class="ex">Ejemplo</span></div>
            {rows}
          </div>
          <p class="foot-note">* Basta con una de las dos: teléfono o correo. Los celulares colombianos de 10 dígitos se guardan como +57 automáticamente.</p>
          <div class="modal-foot">
            <label class="chk left"><input type="checkbox" id="g-skip"> No volver a mostrar</label>
            {btn("Descargar plantilla", "file-down", "outline sm")}
            {btn("Ahora no", cls="ghost sm")}
            {btn("Entendido", cls="sm", trailing=ic("arrow-right", size=14))}
          </div>
        </div>
      </div>
    </div>"""


def upload_modal(state: str = "selected") -> str:
    """state: empty | selected | error"""
    if state == "selected":
        dz = f"""<div class="file"><span class="sq">{ic("file-spreadsheet", size=22)}</span><span><b>leads-septiembre.xlsx</b><small>XLSX · 48 KB · listo para importar</small></span>{btn("Cambiar", cls="ghost sm")}</div>"""
    else:
        err = " error" if state == "error" else ""
        dz = f"""<label class="drop{err}" for="f-file">{ic("cloud-upload", size=32)}<b>Arrastra tu CSV o XLSX aquí o haz clic para elegirlo</b><small>Máx. 10 MB · 20.000 filas · una fila por contacto</small><input class="sr" type="file" id="f-file" accept=".csv,.xlsx"></label>"""
    toast = ""
    if state == "error":
        toast = f"""
        <div class="toast" role="alert">{ic("circle-alert", size=18)}<div><b>El archivo debe ser CSV o XLSX</b><p>Elegiste <span class="mono">presupuesto.pdf</span>. Si aún no tienes tu base en ese formato, descarga la plantilla y pégala ahí.</p><div class="acts">{btn("Descargar plantilla", "file-down", "outline sm")}</div></div></div>"""
    return f"""
    <div class="overlay" role="dialog" aria-modal="true" aria-labelledby="u-title">
      <div class="modal">
        <button class="x" aria-label="Cerrar">{ic("x")}</button>
        <div class="modal-head">
          <div><h2 id="u-title">Importar contactos</h2><p>Sube tu archivo. Los duplicados se detectan por teléfono o correo.</p></div>
          {btn("Ver estructura del archivo", "info", "ghost sm")}
        </div>
        {dz}
        <div class="opts">
          <div class="opt"><label for="o-dup">Si el contacto ya existe</label><div class="select" id="o-dup">Omitir la fila {ic("chevron-down", size=14)}</div></div>
          <div class="opt"><label for="o-tags">Etiquetar como</label><div class="select" id="o-tags"><span class="tags"><span class="tag">Base sept 2026 {ic("x", size=11)}</span></span>{ic("chevron-down", size=14)}</div></div>
          <div class="opt"><label for="o-stage">Etapa inicial</label><div class="select" id="o-stage">Lead {ic("chevron-down", size=14)}</div></div>
        </div>
        <div class="modal-foot">
          {btn("Cancelar", cls="outline sm")}
          {btn("Importar contactos", "file-up", "sm", attrs="" if state == "selected" else "disabled")}
        </div>
      </div>
      {toast}
    </div>"""


def processing_modal() -> str:
    return f"""
    <div class="overlay" role="dialog" aria-modal="true" aria-labelledby="p-title">
      <div class="modal">
        <button class="x" aria-label="Cerrar">{ic("x")}</button>
        <div class="modal-head"><div><h2 id="p-title">Importando <span class="mono" style="font-size:16px;font-weight:500">leads-septiembre.xlsx</span> {badge("Procesando", "processing")}</h2><p>Leemos el archivo fila a fila y validamos teléfonos, correos y etapas.</p></div></div>
        <div class="progress" role="progressbar" aria-label="Importando contactos" aria-busy="true"><div class="bar"></div></div>
        <div class="status" role="status">{ic("loader-circle", "spin")}1.240 filas detectadas · los contactos aparecerán en la lista al terminar</div>
        <div class="hint">{ic("info", size=16)}<span>Puedes cerrar esta ventana: el import sigue en segundo plano y te avisamos con una notificación cuando termine.</span></div>
        <div class="modal-foot">{btn("Cerrar", cls="outline sm")}</div>
      </div>
    </div>"""


ERRORS = [
    ("8", "telefono", "Teléfono no válido: usa 10 dígitos (300…) o el formato +57…"),
    ("23", "correo", "Correo no válido"),
    ("57", "—", "Sin teléfono ni correo: fila no identificable"),
    ("112", "etapa", "Etapa desconocida: usa prospecto, lead, cliente u otro"),
    ("340", "telefono", "Teléfono no válido: usa 10 dígitos (300…) o el formato +57…"),
]


def report_modal() -> str:
    rows = "".join(f'<tr><td class="mono tnum">{r}</td><td class="mono">{f}</td><td>{m}</td></tr>' for r, f, m in ERRORS)
    return f"""
    <div class="overlay" role="dialog" aria-modal="true" aria-labelledby="r-title">
      <div class="modal">
        <button class="x" aria-label="Cerrar">{ic("x")}</button>
        <div class="modal-head"><div><h2 id="r-title">Importación completada {badge("Completado", "done")}</h2><p><span class="mono">leads-septiembre.xlsx</span> · 1.240 filas · hace unos segundos</p></div></div>
        <div class="tiles">
          <div class="tile"><div class="v">1.183</div><div class="l"><span class="dot" style="background:var(--axi-success)"></span>Creados</div></div>
          <div class="tile"><div class="v">0</div><div class="l"><span class="dot" style="background:var(--axi-info)"></span>Actualizados</div></div>
          <div class="tile"><div class="v">41</div><div class="l"><span class="dot" style="background:var(--muted-foreground)"></span>Omitidos · ya existían</div></div>
          <div class="tile"><div class="v">16</div><div class="l"><span class="dot" style="background:var(--axi-destructive)"></span>Con errores</div></div>
        </div>
        <div>
          <p class="muted" style="font-size:12.5px;margin-bottom:8px">Filas que no se importaron. Corrígelas en tu archivo y vuelve a subirlo: las que ya entraron se omiten solas.</p>
          <div class="errs"><table><thead><tr><th style="width:64px">Fila</th><th style="width:110px">Campo</th><th>Qué pasó</th></tr></thead><tbody>{rows}</tbody></table></div>
          <p class="muted" style="font-size:12px;margin-top:6px">Mostrando 5 de 16 errores.</p>
        </div>
        <div class="modal-foot">
          {btn("Importar otro", "rotate-ccw", "outline sm")}
          {btn("Ver contactos", cls="sm", trailing=ic("arrow-right", size=14))}
        </div>
      </div>
    </div>"""


HISTORY = [
    ("leads-septiembre.xlsx", "hace 2 min · Laura P.", "Completado", "done", "1.183 creados · 41 omitidos · 16 errores"),
    ("clientes-shopify-export.csv", "ayer · Andrés M.", "Completado", "done", "312 creados · 88 actualizados"),
    ("base-feria-agosto.xlsx", "28 ago · Laura P.", "Fallido", "failed", "El archivo no tiene columnas reconocibles"),
    ("contactos-old.csv", "14 ago · Andrés M.", "Completado", "done", "2.040 creados · 5 errores"),
]


def history_page() -> str:
    rows = "".join(
        f"""<button class="hist-row"><span class="sq">{ic("file-spreadsheet" if f.endswith("xlsx") else "file-text", size=18)}</span><span><b>{f}</b><small>{when} · {counts}</small></span>{badge(st, cls)}</button>"""
        for f, when, st, cls, counts in HISTORY
    )
    return f"""
    <div class="page">
      {crumb("Inicio", "CRM", "Configuración")}
      {crm_nav("Configuración")}
      {settings_nav("Imports")}
      <div class="two">
        <section class="card">
          <div class="modal-head" style="padding-right:0"><div><h2>Nuevo import</h2><p class="lead" style="margin:2px 0 0">El mismo asistente que en Contactos.</p></div>{btn("Ver estructura del archivo", "info", "ghost sm")}</div>
          <div style="display:flex;flex-direction:column;gap:14px;margin-top:14px">
            <label class="drop" for="h-file">{ic("cloud-upload", size=28)}<b>Arrastra tu CSV o XLSX aquí o haz clic para elegirlo</b><small>Máx. 10 MB · 20.000 filas</small><input class="sr" type="file" id="h-file"></label>
            <div class="opts">
              <div class="opt"><label for="h-dup">Si el contacto ya existe</label><div class="select" id="h-dup">Omitir la fila {ic("chevron-down", size=14)}</div></div>
              <div class="opt"><label for="h-tags">Etiquetar como</label><div class="select ph" id="h-tags">Sin etiquetas {ic("chevron-down", size=14)}</div></div>
              <div class="opt"><label for="h-stage">Etapa inicial</label><div class="select" id="h-stage">Default (prospecto) {ic("chevron-down", size=14)}</div></div>
            </div>
            <div class="modal-foot">{btn("Descargar plantilla", "file-down", "outline sm")}{btn("Importar contactos", "file-up", "sm", attrs="disabled")}</div>
          </div>
        </section>
        <section class="card">
          <h2>Historial</h2><p class="lead">Cada import queda registrado con su reporte. Haz clic para reabrirlo.</p>
          <div class="hist">{rows}</div>
        </section>
      </div>
    </div>"""


VIEWS = [
    ("menu", "1 · Menú agrupado", contacts_page(True), "Cabecera de /crm/contacts con el botón «Importar / Exportar» abierto. Reemplaza al botón «Exportar» suelto; «Duplicados» y «Nuevo contacto» no cambian."),
    ("guide", "2 · Guía", contacts_page(False) + guide_modal(), "Paso 1 del modal /crm/contacts/import: la tarjeta guía. Las fichas entran en cascada una sola vez (sin loop) y quedan quietas."),
    ("upload", "3 · Archivo", contacts_page(False) + upload_modal("selected"), "Paso 2: archivo elegido + opciones (duplicados, etiquetas, etapa inicial). Haz clic en «Cambiar» para ver el dropzone vacío."),
    ("processing", "4 · Procesando", contacts_page(False) + processing_modal(), "Paso 3: el job corre en el servidor; la barra existe solo mientras procesa. Se puede cerrar y seguir trabajando."),
    ("report", "5 · Reporte", contacts_page(False) + report_modal(), "Paso 4: contadores + errores por fila. «Ver contactos» cierra y refresca la lista."),
    ("error", "6 · Error", contacts_page(False) + upload_modal("error"), "Archivo rechazado en cliente (extensión o tamaño): el dropzone se marca y el aviso ofrece la plantilla."),
    ("history", "7 · Historial", history_page(), "/crm/settings/imports conserva el historial y embebe el mismo asistente; deja de estar gateado por crm:manage y pasa a contacts:import."),
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
        // re-dispara las animaciones de entrada (fichas, menú, modal)
        v.querySelectorAll('.chip,.ready,.dd-menu,.modal,.toast').forEach(function (el) {
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
  // vista 3: «Cambiar» alterna archivo elegido ↔ dropzone vacío
  var up = document.querySelector('.view[data-view="upload"]');
  if (up) {
    var file = up.querySelector('.file');
    var empty = document.createElement('label');
    empty.className = 'drop';
    empty.innerHTML = file.nextElementSibling ? '' : '';
    empty.innerHTML = __EMPTY_DROP__;
    var submit = up.querySelector('.modal-foot .btn:not(.outline)');
    file.querySelector('.btn').addEventListener('click', function () { file.replaceWith(empty); submit.setAttribute('disabled', ''); });
    empty.addEventListener('click', function (e) { e.preventDefault(); empty.replaceWith(file); submit.removeAttribute('disabled'); });
  }
  var ids = Array.prototype.map.call(views, function (v) { return v.dataset.view; });
  var initial = location.hash.slice(1);
  show(ids.indexOf(initial) >= 0 ? initial : 'menu');
})();
"""


def build() -> None:
    link, faces = font_css()
    css = CSS.replace("__LIGHT__", LIGHT).replace("__DARK__", DARK)
    empty_drop = json.dumps(
        f'{ic("cloud-upload", size=32)}<b>Arrastra tu CSV o XLSX aquí o haz clic para elegirlo</b><small>Máx. 10 MB · 20.000 filas · una fila por contacto</small>'
    )
    js = JS.replace("__EMPTY_DROP__", empty_drop)
    mk_buttons = "".join(f'<button class="mk-view" data-view="{k}" aria-pressed="false">{label}</button>' for k, label, _, _ in VIEWS)
    sections = "".join(
        f'<section class="view" data-view="{k}" data-note="{note}" hidden>{html}</section>' for k, _, html, note in VIEWS
    )
    doc = f"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Importar contactos al CRM</title>
{link}
<style>
{faces}
{css}
</style>
</head>
<body>
<div class="mk-bar">
  <span class="mk-tag">Mockup F0 · no es producto</span>
  <span>CRM · Importar / Plantilla / Exportar contactos</span>
  <div class="mk-views" role="group" aria-label="Vistas del mockup">{mk_buttons}<button class="mk-theme" id="theme">Tema</button></div>
  <span class="mk-note" id="mk-note"></span>
</div>
{sections}
<script>{js}</script>
</body>
</html>
"""
    OUT.write_text(doc)
    print(f"{OUT.name}: {OUT.stat().st_size // 1024} KB, {len(VIEWS)} vistas, fuentes {'embebidas' if faces else 'Google Fonts'}")


if __name__ == "__main__":
    build()
