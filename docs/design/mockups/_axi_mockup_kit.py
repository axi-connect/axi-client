#!/usr/bin/env python3
"""Kit compartido de los mockups del programa Cobros (`cobros_frontend_plan.md` §4).

Misma convención que `crm-contact-data.build.py`: HTML autocontenido con barra de vistas y tema,
tokens literales de `globals.css`, iconos `__iconNode` de lucide-react, fuentes incrustadas desde el
build de Next del checkout principal (fallback Google Fonts). Además exporta cada vista como
artboard `.dc.html` para el lienzo de diseño (Design canvas) cuando se define
`AXI_MOCKUP_ARTBOARDS_DIR` — ahí las fuentes van por Google Fonts + Nexa subida como asset
(`AXI_NEXA_URL`), porque el lienzo no admite data URIs.
"""
from __future__ import annotations

import base64
import html as _html
import json
import os
import pathlib
import re
import sys

S = pathlib.Path(__file__).resolve().parent


def repo_root() -> pathlib.Path:
    root = S.parents[2]
    if not (root / "node_modules").exists() and ".claude" in root.parts:
        root = root.parents[2]
    return root


ROOT = repo_root()

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
if not MEDIA.exists() and ".claude" in ROOT.parts:
    # El worktree no compila: los subsets woff2 viven en el build del checkout principal.
    MEDIA = ROOT.parents[2] / ".next" / "static" / "media"
GOOGLE_LINK = (
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700'
    '&family=Geist+Mono:wght@400;500&display=swap">'
)


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
    return GOOGLE_LINK, ""


# ----------------------------------------------------------------------------- iconos lucide
LUCIDE_DIR = ROOT / "node_modules" / "lucide-react" / "dist" / "esm" / "icons"


class Icons:
    def __init__(self, cache_file: pathlib.Path):
        self.file = cache_file
        self.cache: dict[str, str] = json.loads(cache_file.read_text()) if cache_file.exists() else {}

    def _body(self, name: str) -> str:
        path = LUCIDE_DIR / f"{name}.js"
        if not path.exists():
            print(f"[kit] icono lucide desconocido: {name}", file=sys.stderr)
            return '<circle cx="12" cy="12" r="9"/>'
        txt = path.read_text()
        m = re.search(r"from\s+'\./([\w-]+)\.js'", txt)
        if m and "__iconNode" not in txt:
            return self._body(m.group(1))
        body = ""
        for tag, attrs in re.findall(r'\[\s*"(\w+)",\s*\{([^}]*)\}\s*\]', txt, flags=re.S):
            pairs = [(k, v) for k, v in re.findall(r'(\w+):\s*"([^"]*)"', attrs) if k != "key"]
            body += f"<{tag} " + " ".join(f'{k}="{v}"' for k, v in pairs) + "/>"
        return body

    def __call__(self, name: str, cls: str = "", size: int = 16) -> str:
        if name not in self.cache:
            self.cache[name] = self._body(name)
        return (
            f'<svg class="ic {cls}" width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
            f'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{self.cache[name]}</svg>'
        )

    def save(self) -> None:
        self.file.write_text(json.dumps(self.cache, indent=0, ensure_ascii=False))


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

BASE_CSS = r"""
:root{ __LIGHT__ }
@media (prefers-color-scheme: dark){ :root:not([data-theme="light"]){ __DARK__ } }
:root[data-theme="dark"], .dark{ __DARK__ }
:root, .dark{
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
body{margin:0;background:var(--background);color:var(--foreground);font-family:var(--font-body);font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased}
.shell{background:var(--background);color:var(--foreground);font-family:var(--font-body);font-size:14px;line-height:1.5;container-type:inline-size;position:relative}
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
.small{font-size:12.5px}

/* barra del mockup (NO es producto) */
.mk-bar{position:sticky;top:0;z-index:40;display:flex;flex-wrap:wrap;align-items:center;gap:8px 16px;padding:8px 16px;background:var(--foreground);color:var(--background);font-size:12px}
.mk-tag{font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;opacity:.75}
.mk-views{display:flex;gap:4px;margin-left:auto;flex-wrap:wrap}
.mk-view,.mk-theme{border:1px solid color-mix(in srgb, var(--background) 30%, transparent);background:transparent;color:inherit;border-radius:999px;padding:4px 10px}
.mk-view[aria-pressed="true"]{background:var(--background);color:var(--foreground);font-weight:500}
.mk-note{width:100%;opacity:.8}

/* shell del panel (content, max-w-7xl p-6) */
.view{position:relative}
.page{max-width:1120px;margin:0 auto;padding:20px 24px 72px;display:flex;flex-direction:column;gap:16px}
.crumb{font-size:13px;color:var(--muted-foreground);display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.crumb b{color:var(--foreground);font-weight:500}
.header{display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:space-between;gap:12px}
.header h1{font-size:28px;font-family:var(--font-body);font-weight:600;letter-spacing:-.02em}
.header .lead{color:var(--muted-foreground);font-size:13.5px;margin-top:2px}
.header .right{display:flex;gap:8px;align-items:center;flex-wrap:wrap}

/* pastilla (segmented.tsx §9.3): NavTabs raised / inline */
.seg{display:flex;width:fit-content;max-width:100%;gap:2px;padding:4px;border-radius:999px;border:1px solid var(--border);background:var(--background);box-shadow:var(--shadow-float);overflow-x:auto;scrollbar-width:none}
.seg.inline{box-shadow:none;background:color-mix(in srgb, var(--secondary) 60%, transparent)}
.seg a,.seg button{display:inline-flex;align-items:center;gap:8px;height:36px;padding:0 14px;border-radius:999px;color:var(--muted-foreground);text-decoration:none;white-space:nowrap;font-weight:500;font-size:14px}
.seg a[aria-current="page"],.seg button[aria-checked="true"]{background:var(--accent);color:var(--foreground)}
.seg a[aria-current="page"] .ic,.seg button[aria-checked="true"] .ic{color:var(--axi-brand)}
.seg.sm a,.seg.sm button{height:28px;padding:0 12px;font-size:12px;gap:6px}
.seg.sm{padding:2px}
.seg .cnt{font-size:11px;padding:0 6px;border-radius:999px;background:color-mix(in srgb, var(--foreground) 8%, transparent);color:var(--muted-foreground)}

/* botones (ui/button.tsx) */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:36px;padding:0 16px;border-radius:var(--radius-md);border:1px solid transparent;background:var(--axi-brand);color:var(--axi-on-color);font-weight:500;font-size:14px;white-space:nowrap;text-decoration:none}
.btn:hover{filter:brightness(1.06)} .btn:active{transform:scale(.97)}
.btn.outline{background:var(--background);color:var(--foreground);border-color:var(--border)}
.btn.outline:hover{background:var(--secondary);filter:none}
.btn.ghost{background:transparent;color:var(--foreground)}
.btn.ghost:hover{background:var(--secondary);filter:none}
.btn.destructive{background:var(--axi-destructive);color:var(--axi-on-color)}
.btn.sm{height:32px;padding:0 12px;font-size:13px}
.btn.xs{height:28px;padding:0 10px;font-size:12.5px;gap:6px}
.btn.icon{width:36px;padding:0} .btn.icon.sm{width:32px}
.btn[disabled],.btn[aria-disabled="true"]{opacity:.5;pointer-events:none}

/* badges: Badge secondary + punto (nunca tinte + texto del mismo color) */
.badge{display:inline-flex;align-items:center;gap:6px;height:22px;padding:0 9px;border-radius:999px;font-size:12px;font-weight:500;background:var(--secondary);color:var(--foreground);white-space:nowrap;border:1px solid transparent}
.badge .dot{width:7px;height:7px;border-radius:50%;background:var(--muted-foreground);opacity:.55;flex:none}
.badge.ok .dot{background:var(--axi-success);opacity:1} .badge.warn .dot{background:var(--axi-warning);opacity:1}
.badge.info .dot{background:var(--axi-info);opacity:1} .badge.violet .dot{background:var(--axi-violet);opacity:1}
.badge.off .dot{opacity:.4}
.badge.outline{background:transparent;border-color:var(--border)} .badge.outline .dot{display:none}
.badge .ic{color:var(--muted-foreground)}

/* cards sólidas (DESIGN-SYSTEM §5.2) */
.card{border:1px solid var(--border);background:var(--background);border-radius:var(--radius-xl);padding:20px 24px}
.card h2{font-size:17px;display:flex;align-items:center;gap:8px;font-family:var(--font-body);font-weight:500;letter-spacing:0}
.card .lead{color:var(--muted-foreground);font-size:13px;margin-top:2px;max-width:70ch}
.card-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:14px}
.card-head .right{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.card-foot{margin-top:16px;padding-top:12px;border-top:1px solid var(--border-soft);display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center;font-size:12.5px;color:var(--muted-foreground)}
.card-foot a{color:var(--foreground);font-weight:500;text-underline-offset:3px;text-decoration-color:var(--border)}
.grid2{display:grid;gap:16px;grid-template-columns:1fr}
@container (min-width: 900px){.grid2{grid-template-columns:1fr 1fr}}
.grid3{display:grid;gap:12px;grid-template-columns:repeat(3,minmax(0,1fr))}
.stack{display:flex;flex-direction:column;gap:16px}
.kv{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px 24px;font-size:13.5px}
.kv dt{color:var(--muted-foreground);font-size:12px;text-transform:uppercase;letter-spacing:.04em;font-weight:500} .kv dd{margin:2px 0 0;font-weight:500}
@container (max-width: 600px){.kv{grid-template-columns:1fr 1fr}}

/* formularios (input.tsx / select.tsx / label.tsx) */
.form{display:grid;gap:16px 20px;grid-template-columns:1fr}
@container (min-width: 700px){.form{grid-template-columns:1fr 1fr}}
.field{display:flex;flex-direction:column;gap:6px;min-width:0}
.field.full{grid-column:1 / -1}
.field label,.field .lbl{font-size:13px;font-weight:500}
.field .hint{font-size:12px;color:var(--muted-foreground);line-height:1.45}
.field .hint a{color:var(--foreground);font-weight:500;text-underline-offset:3px;text-decoration-color:var(--border)}
.input,.select,.textarea{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:36px;padding:0 12px;border-radius:var(--radius-sm);border:1px solid var(--input);background:var(--background);color:var(--foreground);font-size:14px;width:100%}
.textarea{align-items:flex-start;padding:8px 12px;min-height:76px;line-height:1.45}
.input.ph,.select.ph,.textarea.ph{color:var(--muted-foreground)}
.input .ic,.select .ic{color:var(--muted-foreground)}
.input.adorn{padding-left:10px} .input.adorn span{flex:1}
.input.readonly{background:var(--secondary);color:var(--muted-foreground)}
.input.err{border-color:var(--axi-destructive)} .field .err-msg{font-size:12px;color:var(--axi-destructive)}
.form-actions{grid-column:1 / -1;display:flex;justify-content:flex-end;gap:8px;padding-top:4px}
.select .val{display:flex;align-items:center;gap:8px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

/* switch (ui/switch.tsx): 32×18, coral encendido */
.sw{position:relative;display:inline-block;width:32px;height:18px;border-radius:999px;background:var(--input);flex:none;transition:background .2s var(--ease)}
.sw::after{content:"";position:absolute;top:1px;left:1px;width:16px;height:16px;border-radius:50%;background:var(--background);transition:transform .2s var(--ease);box-shadow:0 1px 2px rgb(0 0 0/.15)}
.sw[aria-checked="true"]{background:var(--axi-brand)} .sw[aria-checked="true"]::after{transform:translateX(14px)}
.sw[aria-disabled="true"]{opacity:.5;cursor:not-allowed}

/* filas de función (FeatureSwitchRow) */
.frow{display:grid;grid-template-columns:40px minmax(0,1fr) auto;gap:4px 14px;align-items:start;padding:14px 0;border-bottom:1px solid var(--border-soft)}
.frow:last-child{border-bottom:none}
.frow .fic{width:40px;height:40px;border-radius:12px;background:var(--secondary);display:grid;place-items:center;color:var(--foreground)}
.frow.off .fic{color:var(--muted-foreground)}
.frow .ft{display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px;font-weight:500;font-size:14.5px}
.frow .fd{font-size:13px;color:var(--muted-foreground);margin-top:1px;max-width:64ch}
.frow .fm{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;margin-top:8px;font-size:12.5px;color:var(--muted-foreground)}
.frow .fm .ic{color:var(--muted-foreground)}
.frow .fm .dep{display:inline-flex;gap:5px;align-items:center}
.frow .fm .dep .ic{color:var(--axi-warning)}
.frow .ctl{display:flex;align-items:center;gap:10px;padding-top:10px;font-size:12.5px;color:var(--muted-foreground)}
.frow .ctl .ic{color:var(--muted-foreground)}
@container (max-width: 600px){.frow{grid-template-columns:minmax(0,1fr) auto} .frow .fic{display:none}}

/* avisos (Notice / Alert): superficie secondary + icono de color, nunca fondo de color */
.notice{display:grid;grid-template-columns:20px minmax(0,1fr);gap:10px;padding:12px 14px;border-radius:var(--radius-md);border:1px solid var(--border);background:var(--secondary);font-size:13px;line-height:1.5}
.notice .ic{margin-top:2px;color:var(--axi-info)}
.notice.warn .ic{color:var(--axi-warning)} .notice.err .ic{color:var(--axi-destructive)} .notice.ok .ic{color:var(--axi-success)}
.notice b{font-weight:500}
.notice .acts{display:flex;gap:8px;margin-top:8px;flex-wrap:wrap}
.notice.inline{background:transparent;border-style:dashed}

/* tabla */
.table-wrap{overflow-x:auto;border:1px solid var(--border);border-radius:var(--radius-lg);background:var(--background)}
table{width:100%;border-collapse:collapse;font-size:13.5px}
th,td{text-align:left;padding:11px 14px;border-bottom:1px solid var(--border-soft);vertical-align:middle}
th{font-size:12px;font-weight:500;color:var(--muted-foreground);letter-spacing:.02em;white-space:nowrap}
tbody tr:last-child td{border-bottom:none}
td .t{font-weight:500} td .d{font-size:12px;color:var(--muted-foreground);display:block;margin-top:1px;max-width:38ch}

/* skeleton */
.sk{background:color-mix(in srgb, var(--foreground) 8%, transparent);border-radius:8px;animation:pulse 1.6s ease-in-out infinite}
@keyframes pulse{50%{opacity:.5}}

/* toast (FloatingAlert) — glass: es flotante */
.toast{position:absolute;right:24px;bottom:24px;z-index:35;width:340px;display:grid;grid-template-columns:20px 1fr;gap:10px;padding:12px 14px;border-radius:var(--radius-lg);border:1px solid var(--border);background:color-mix(in srgb, var(--background) 78%, transparent);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);box-shadow:var(--shadow-overlay);font-size:13px}
.toast .ic{margin-top:1px}
.toast.err .ic{color:var(--axi-destructive)} .toast.ok .ic{color:var(--axi-success)}
.toast b{display:block;font-weight:500} .toast small{color:var(--muted-foreground);font-size:12px}

/* modal (Modal/Dialog): glass-overlay */
.overlay{position:absolute;inset:0;z-index:30;background:var(--scrim);display:flex;align-items:flex-start;justify-content:center;padding:120px 16px 48px}
.modal{position:relative;width:100%;max-width:480px;border-radius:var(--radius-xl);border:1px solid var(--border);background:color-mix(in srgb, var(--background) 84%, transparent);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);box-shadow:var(--shadow-overlay);padding:22px 24px;display:flex;flex-direction:column;gap:14px}
.modal h2{font-size:19px;font-family:var(--font-body);font-weight:600;letter-spacing:-.01em}
.modal p{color:var(--muted-foreground);font-size:13.5px}
.modal-foot{display:flex;justify-content:flex-end;gap:8px;margin-top:4px}

/* medios de pago (PaymentMethodCard) */
.pm{display:grid;grid-template-columns:40px 1fr auto;gap:14px;align-items:start;border:1px solid var(--border);background:var(--background);border-radius:var(--radius-lg);padding:14px 16px}
.pm .pic{width:40px;height:40px;border-radius:12px;background:var(--secondary);display:grid;place-items:center}
.pm .pt{display:flex;flex-wrap:wrap;align-items:center;gap:8px;font-weight:500}
.pm .pt small{font-weight:400;font-size:12px;color:var(--muted-foreground)}
.pm .pd{font-size:13px;color:var(--muted-foreground);margin-top:2px}
.pm .acts{display:flex;gap:2px}
.pm .acts .btn{color:var(--muted-foreground)}
.badge.ai{background:color-mix(in srgb, var(--axi-violet) 10%, transparent);color:var(--axi-violet)} .badge.ai .dot{display:none} .badge.ai .ic{color:var(--axi-violet)}

/* TRM card */
.fx-big{font-family:var(--font-heading);font-size:40px;line-height:1.05;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.fx-sub{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;color:var(--muted-foreground);font-size:12.5px;margin-top:6px}
.fx-row{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:baseline;padding:10px 0;border-top:1px solid var(--border-soft);font-size:13.5px}
.fx-row .v{font-weight:500;font-variant-numeric:tabular-nums} .fx-row .k{color:var(--muted-foreground)}
.fx-eq{margin-top:14px;padding:12px 14px;border-radius:var(--radius-md);background:var(--secondary);font-size:13px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center}
.fx-eq b{font-weight:500;font-variant-numeric:tabular-nums}

/* estado vacío / 403 */
.empty{display:flex;flex-direction:column;align-items:center;text-align:center;gap:8px;padding:36px 16px}
.empty .eic{width:48px;height:48px;border-radius:14px;background:var(--secondary);display:grid;place-items:center;color:var(--muted-foreground);margin-bottom:4px}
.empty h3{font-size:16px;font-family:var(--font-body);font-weight:600;letter-spacing:0}
.empty p{color:var(--muted-foreground);font-size:13.5px;max-width:46ch}
.empty .acts{display:flex;gap:8px;margin-top:6px;flex-wrap:wrap;justify-content:center}

/* rail del pedido (OrderDetailRail) */
.rail{width:380px;border-left:1px solid var(--border);display:flex;flex-direction:column;background:var(--background)}
.rail-head{padding:14px 16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;gap:8px}
.rail-body{padding:14px 16px;display:flex;flex-direction:column;gap:14px}
.rsec h3{font-family:var(--font-body);font-size:11.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted-foreground);font-weight:600;margin-bottom:6px}
.rline{display:flex;justify-content:space-between;gap:10px;align-items:center;font-size:13.5px;padding:6px 0}
.rline .k{color:var(--muted-foreground)} .rline .v{font-weight:500;display:flex;gap:6px;align-items:center}

@media (prefers-reduced-motion: reduce){ .sk,.toast,.modal{animation:none!important} }
"""

JS = r"""
(function () {
  var views = document.querySelectorAll('.view');
  var buttons = document.querySelectorAll('.mk-view');
  var note = document.getElementById('mk-note');
  function show(id) {
    buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.view === id)); });
    views.forEach(function (v) { var on = v.dataset.view === id; v.hidden = !on; if (on) note.textContent = v.dataset.note; });
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
  show(ids.indexOf(initial) >= 0 ? initial : ids[0]);
})();
"""


def css() -> str:
    return BASE_CSS.replace("__LIGHT__", LIGHT).replace("__DARK__", DARK)


# ----------------------------------------------------------------------------- piezas
class Kit:
    def __init__(self, name: str):
        self.name = name
        self.ic = Icons(S / f"{name}.lucide.json")
        # CSS propio del mockup, encima del recetario común. Lo que sea de
        # sistema (botones, badges, cards) va en BASE_CSS, no aquí.
        self.extra_css = ""

    def btn(self, label: str, icon: str = "", cls: str = "", attrs: str = "") -> str:
        return f'<button class="btn {cls}" {attrs}>{self.ic(icon) if icon else ""}{label}</button>'

    def badge(self, label: str, cls: str = "", icon: str = "") -> str:
        lead = self.ic(icon, size=12) if icon else '<span class="dot"></span>'
        return f'<span class="badge {cls}">{lead}{label}</span>'

    def crumb(self, *parts: str) -> str:
        items = [f"<b>{p}</b>" if i == len(parts) - 1 else p for i, p in enumerate(parts)]
        sep = f' {self.ic("chevron-right", size=14)} '
        return f'<nav class="crumb" aria-label="Breadcrumb">{sep.join(items)}</nav>'

    def nav(self, items: list[tuple[str, str]], active: str, label: str, cls: str = "") -> str:
        links = "".join(
            f'<a href="#" {"aria-current=page" if t == active else ""}>{self.ic(i)}{t}</a>' for t, i in items
        )
        return f'<nav class="seg {cls}" aria-label="{label}"><ul style="display:contents;margin:0;padding:0;list-style:none">{links}</ul></nav>'

    def switch(self, on: bool, disabled: bool = False, label: str = "") -> str:
        return (
            f'<button type="button" role="switch" class="sw" aria-checked="{str(on).lower()}" '
            f'aria-disabled="{str(disabled).lower()}" aria-label="{_html.escape(label)}"></button>'
        )

    def field(self, label: str, control: str, hint: str = "", full: bool = False, fid: str = "") -> str:
        h = f'<p class="hint">{hint}</p>' if hint else ""
        return f'<div class="field {"full" if full else ""}"><label for="{fid}">{label}</label>{control}{h}</div>'

    def input(self, value: str = "", placeholder: str = "", cls: str = "", icon: str = "", fid: str = "") -> str:
        ph = "ph" if not value else ""
        txt = value or placeholder
        lead = self.ic(icon, size=15) if icon else ""
        return f'<div class="input {ph} {cls}" id="{fid}" role="textbox" aria-readonly="true">{lead}<span>{txt}</span></div>'

    def select(self, value: str, cls: str = "", icon: str = "", fid: str = "") -> str:
        lead = self.ic(icon, size=15) if icon else ""
        return (
            f'<div class="select {cls}" id="{fid}" role="combobox" aria-expanded="false"><span class="val">{lead}{value}</span>'
            f'{self.ic("chevron-down", size=15)}</div>'
        )

    def notice(self, kind: str, body: str, icon: str = "", acts: str = "", cls: str = "") -> str:
        icons = {"info": "info", "warn": "triangle-alert", "err": "circle-alert", "ok": "circle-check"}
        a = f'<div class="acts">{acts}</div>' if acts else ""
        return f'<div class="notice {kind} {cls}">{self.ic(icon or icons[kind], size=18)}<div>{body}{a}</div></div>'

    def skeleton(self, w: str, h: str = "14px", extra: str = "") -> str:
        return f'<div class="sk" style="width:{w};height:{h};{extra}"></div>'

    # -------------------------------------------------------------------- salida
    def build_html(self, title: str, tag: str, subtitle: str, views: list[tuple[str, str, str, str]]) -> None:
        link, faces = font_css()
        mk_buttons = "".join(
            f'<button class="mk-view" data-view="{k}" aria-pressed="false">{label}</button>' for k, label, _, _ in views
        )
        sections = "".join(
            f'<section class="view" data-view="{k}" data-note="{_html.escape(note, quote=True)}" hidden>{body}</section>'
            for k, _, body, note in views
        )
        doc = f"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
{link}
<style>
{faces}
{css()}
{self.extra_css}
</style>
</head>
<body>
<div class="mk-bar">
  <span class="mk-tag">{tag}</span>
  <span>{subtitle}</span>
  <div class="mk-views" role="group" aria-label="Vistas del mockup">{mk_buttons}<button class="mk-theme" id="theme">Tema</button></div>
  <span class="mk-note" id="mk-note"></span>
</div>
{sections}
<script>{JS}</script>
</body>
</html>
"""
        out = S / f"{self.name}.html"
        out.write_text(doc)
        self.ic.save()
        print(f"{out.name}: {out.stat().st_size // 1024} KB, {len(views)} vistas, {len(self.ic.cache)} iconos, fuentes {'embebidas' if faces else 'Google Fonts'}")

    def export_artboards(self, boards: list[dict]) -> list[dict]:
        """boards: {file, title, body, w, h, dark?}. Escribe `<dir>/project/<file>` y devuelve los boards."""
        target = os.environ.get("AXI_MOCKUP_ARTBOARDS_DIR")
        if not target:
            return []
        nexa = os.environ.get("AXI_NEXA_URL", "")
        face = (
            f'@font-face{{font-family:"Nexa";font-weight:700;font-style:normal;font-display:swap;src:url({nexa}) format("woff2")}}'
            if nexa
            else ""
        )
        out_dir = pathlib.Path(target) / "project"
        out_dir.mkdir(parents=True, exist_ok=True)
        for b in boards:
            klass = "shell dark" if b.get("dark") else "shell"
            doc = f"""<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  {GOOGLE_LINK}
  <style>
    {face}
    {css()}
    {self.extra_css}
    body {{ margin: 0; background: var(--background); }}
    a {{ color: inherit; }} a:hover {{ color: inherit; }}
  </style>
</helmet>
<div class="{klass}" style="width: {b['w']}px; height: {b['h']}px; overflow: hidden; box-sizing: border-box;">
{b['body']}
</div>
</x-dc>
<script data-dc-script data-props='{{"$preview":{{"width":{b['w']},"height":{b['h']}}}}}'>
class Component extends DCLogic {{
  renderVals() {{ return {{}}; }}
}}
</script>
</body>
</html>
"""
            (out_dir / b["file"]).write_text(doc)
        print(f"  artboards: {len(boards)} → {out_dir}")
        return boards
