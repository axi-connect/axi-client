#!/usr/bin/env python3
"""Ensambla el constructor de plantillas de Meta (F5) en un HTML autocontenido.

Qué propone, en una línea: hoy solo se puede escribir el CUERPO, así que una
campaña masiva es texto plano — sin imagen, sin pie y sin el botón que abre la
ventana de 24 h de un toque. Aquí la plantilla se arma por piezas, y las reglas
de Meta dejan de ser errores que llegan después para convertirse en cosas que
la interfaz no te deja hacer.

La decisión de diseño que manda sobre todo lo demás: Meta EXIGE que las
respuestas rápidas vayan agrupadas —«rápida, URL, rápida» es una combinación
inválida que rechaza la API—, así que el constructor tiene dos grupos separados
y reordena solo. Una combinación inválida no se puede ni representar.

Iconos: lucide (v0.539) desde node_modules, cacheados en hsm-template-builder.lucide.json.
Tokens: copiados literalmente de src/app/globals.css — el mockup NO inventa paleta.
Fuentes: Poppins y Geist Mono por Google Fonts (Nexa es local; headings caen a Poppins 600).
"""
import json, pathlib, re, sys

S = pathlib.Path(__file__).parent
ROOT = S.parent.parent.parent
ICON_CACHE = S / "hsm-template-builder.lucide.json"
SIBLING_CACHE = S / "campaign-hsm-step.lucide.json"
ICONS = [
    "sparkles", "moon", "image", "type", "plus", "x", "triangle-alert", "info",
    "circle-check", "phone", "link", "copy", "corner-up-left", "trash-2",
    "chevron-down", "message-square", "circle-alert", "layers", "align-left",
    "monitor", "smartphone", "eye", "check-check", "hash", "circle-dollar-sign",
    "badge-check", "grip-vertical", "clock",
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


V1 = "{{1}}"

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
  /* El lienzo del chat: verde de WhatsApp muy rebajado, para que la burbuja se
     lea como lo que es. No es color de marca de axi y por eso no sale de aquí. */
  --chat-ground:#e7ded5;
}
:root:not([data-theme="light"]){ }
@media (prefers-color-scheme: dark){ :root:not([data-theme="light"]){ --chat-ground:#10161a; } }
:root[data-theme="dark"]{ --chat-ground:#10161a; }
*{box-sizing:border-box}
html,body{margin:0}
body{background:var(--background);color:var(--foreground);font-family:var(--font-body);font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased;padding-bottom:108px}
h1,h2,h3,h4{margin:0;font-weight:600;letter-spacing:-.01em}
p{margin:0}
button,input,select,textarea{font:inherit;color:inherit}
button{cursor:pointer;background:none;border:0;padding:0}
a{color:inherit;text-decoration:none}
img{max-width:100%}
[hidden]{display:none!important}
.ic{flex:none}
.muted{color:var(--muted-fg)}
.mono{font-family:var(--font-mono);font-variant-numeric:tabular-nums}
.tnum{font-variant-numeric:tabular-nums}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
:focus-visible{outline:none;box-shadow:0 0 0 3px color-mix(in srgb,var(--axi-brand) 50%,transparent)}

/* ─────────── Chrome del mockup (NO es producto) ─────────── */
.mk-bar{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:100;display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:center;padding:6px 8px;border-radius:999px;font-size:11.5px;
  background:color-mix(in srgb,var(--background) 80%,transparent);border:1px solid color-mix(in srgb,var(--border) 60%,transparent);box-shadow:var(--shadow-overlay);backdrop-filter:saturate(160%) blur(16px);max-width:calc(100vw - 24px)}
.mk-tag{display:flex;align-items:center;gap:6px;padding:0 8px;font-weight:600;color:var(--muted-fg);white-space:nowrap}
.mk-grp{display:flex;gap:2px;padding:2px;border-radius:999px;background:var(--secondary);flex-wrap:wrap;justify-content:center}
.mk-grp button{padding:5px 10px;border-radius:999px;color:var(--muted-fg);font-weight:500;white-space:nowrap}
.mk-grp button[aria-pressed="true"]{background:var(--accent);color:var(--foreground)}
.mk-theme{display:flex;align-items:center;gap:5px;padding:5px 10px;border-radius:999px;color:var(--muted-fg);font-weight:500}

/* ─────────── Cabecera ─────────── */
.app-header{border-bottom:1px solid var(--border);padding:10px 24px}
.app-header .row{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.app-header h1{font-size:18px;font-weight:700}
.crumb{display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--faint-fg)}
.wrap{max-width:1120px;margin:0 auto;padding:22px 24px 0}
@media (max-width:520px){.wrap{padding:18px 16px 0}.app-header{padding:10px 16px}}
.head h2{font-size:22px;letter-spacing:-.02em}
.head .sub{font-size:13px;color:var(--muted-fg);margin-top:4px;max-width:64ch}

/* ─────────── Botones ─────────── */
.btn{display:inline-flex;align-items:center;gap:8px;height:36px;padding:0 14px;border-radius:999px;font-weight:500;font-size:13px;border:1px solid transparent;transition:background .2s,color .2s,border-color .2s,opacity .2s}
.btn .ic{width:16px;height:16px}
.btn-primary{background:var(--axi-brand);color:var(--axi-on-color)}
.btn-primary:hover{background:var(--axi-brand-2)}
.btn-primary[aria-disabled="true"]{opacity:.42;cursor:not-allowed}
.btn-outline{border-color:var(--border);background:var(--background)}
.btn-outline:hover{background:var(--secondary)}
.btn-ghost{color:var(--muted-fg)}
.btn-ghost:hover{background:var(--secondary);color:var(--foreground)}
.btn-sm{height:30px;padding:0 11px;font-size:12.5px;gap:6px}
.btn-sm .ic{width:14px;height:14px}
.btn-icon{width:28px;height:28px;padding:0;justify-content:center;border-radius:var(--r-sm)}

/* ─────────── El taller: piezas a la izquierda, teléfono a la derecha ─────────── */
/* El teléfono se queda pegado al hacer scroll: el sentido del constructor es
   ver el efecto de cada campo, y si la previa se va arriba deja de servir. */
.shop{display:grid;gap:18px;margin-top:18px;align-items:start}
@media (min-width:960px){.shop{grid-template-columns:minmax(0,1fr) 300px}}
.pieces{display:flex;flex-direction:column;gap:10px;min-width:0}

/* ─────────── Una pieza ─────────── */
.piece{border:1px solid var(--border);border-radius:var(--r-lg);background:var(--background);overflow:clip}
.piece>header{display:flex;align-items:center;gap:10px;padding:10px 13px;border-bottom:1px solid var(--border);background:color-mix(in srgb,var(--foreground) 2.5%,var(--background))}
.piece>header .glyph{width:28px;height:28px;flex:none;display:grid;place-items:center;border-radius:var(--r-sm);background:color-mix(in srgb,var(--foreground) 6%,transparent);color:var(--muted-fg)}
.piece>header .glyph .ic{width:14px;height:14px}
.piece>header .txt{min-width:0;display:flex;flex-direction:column;gap:1px}
.piece>header b{font-size:13.5px;font-weight:600;letter-spacing:-.01em}
.piece>header i{font-style:normal;font-size:11.5px;color:var(--muted-fg)}
.piece>header .end{margin-left:auto;display:flex;align-items:center;gap:6px}
.piece .body{padding:13px;display:flex;flex-direction:column;gap:10px}
/* El cuerpo es lo único obligatorio: se marca con el filete, no con un asterisco. */
.piece.required{border-left:3px solid color-mix(in srgb,var(--axi-brand) 55%,transparent)}

/* ─────────── Campos ─────────── */
.field{display:flex;flex-direction:column;gap:6px}
.field .lbl{display:flex;align-items:center;gap:8px;font-size:11.5px;font-weight:500;color:var(--muted-fg)}
.field .lbl .count{margin-left:auto;font-variant-numeric:tabular-nums;color:var(--faint-fg)}
.field .lbl .count.over{color:var(--axi-destructive);font-weight:600}
.inp,.sel select,textarea.inp{width:100%;height:36px;padding:0 11px;border:1px solid var(--input);border-radius:var(--r-sm);background:var(--background);font-size:13px}
textarea.inp{height:auto;min-height:84px;padding:9px 11px;line-height:1.55;resize:vertical}
.sel{position:relative;display:flex;align-items:center}
.sel select{appearance:none;padding-right:32px}
.sel .ic{position:absolute;right:10px;width:14px;height:14px;color:var(--faint-fg);pointer-events:none}
.hint{font-size:11.5px;color:var(--faint-fg);line-height:1.5}
.row2{display:grid;gap:9px}
@media (min-width:520px){.row2{grid-template-columns:1fr 1fr}}

/* ─────────── Elegir el tipo de cabecera ─────────── */
.seg{display:inline-flex;gap:2px;padding:2px;border-radius:999px;background:var(--secondary)}
.seg button{display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border-radius:999px;font-size:12.5px;color:var(--muted-fg)}
.seg button .ic{width:13px;height:13px}
.seg button[aria-pressed="true"]{background:var(--background);color:var(--foreground);font-weight:500;box-shadow:var(--shadow-float)}

/* ─────────── Añadir pieza ─────────── */
.adders{display:flex;flex-wrap:wrap;gap:8px}
.adder{display:inline-flex;align-items:center;gap:7px;height:34px;padding:0 12px;border:1px dashed var(--border);border-radius:999px;font-size:12.5px;color:var(--muted-fg);transition:border-color .18s,color .18s,background .18s}
.adder:hover{border-color:color-mix(in srgb,var(--axi-brand) 45%,var(--border));color:var(--foreground);background:var(--secondary)}
.adder .ic{width:14px;height:14px}

/* ─────────── Botones de la plantilla ─────────── */
/* DOS grupos, y no una lista suelta: Meta exige que las respuestas rápidas
   vayan juntas —«rápida, URL, rápida» es combinación inválida— así que el
   constructor no deja mezclarlas. Lo que no se puede representar, no falla. */
.bgroup{border:1px solid var(--border);border-radius:var(--r-md);overflow:clip}
.bgroup>.gh{display:flex;align-items:center;gap:8px;padding:7px 11px;border-bottom:1px solid var(--border);background:color-mix(in srgb,var(--foreground) 3%,var(--background));font-size:11.5px;color:var(--muted-fg);font-weight:500}
.bgroup>.gh .ic{width:13px;height:13px}
.bgroup>.gh .cap{margin-left:auto;font-variant-numeric:tabular-nums;color:var(--faint-fg);font-weight:400}
.brow{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:9px 11px}
.brow+.brow{border-top:1px solid var(--border-soft)}
.brow .grip{color:var(--faint-fg);cursor:grab}
.brow .grip .ic{width:14px;height:14px}
.brow .kind{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 9px;border-radius:999px;background:var(--secondary);border:1px solid var(--border-soft);font-size:11.5px;color:var(--muted-fg);white-space:nowrap}
.brow .kind .ic{width:13px;height:13px}
.brow .inp{height:30px;flex:1 1 130px;min-width:0}
.brow .rm{margin-left:auto}
.bempty{padding:11px;font-size:12px;color:var(--faint-fg)}

/* ─────────── El teléfono ─────────── */
.phone{position:sticky;top:16px;display:flex;flex-direction:column;gap:10px}
.screen{border:1px solid var(--border);border-radius:var(--r-xl);background:var(--chat-ground);padding:14px 12px;box-shadow:var(--shadow-float)}
.bubble{background:var(--background);border-radius:var(--r-md);border-top-left-radius:6px;overflow:clip;box-shadow:0 1px 1px rgb(0 0 0/.12);max-width:270px}
.bubble .media{aspect-ratio:1.91/1;background:linear-gradient(135deg,color-mix(in srgb,var(--axi-brand) 26%,var(--muted)),color-mix(in srgb,var(--axi-violet) 22%,var(--muted)));display:grid;place-items:center;color:var(--muted-fg)}
.bubble .media .ic{width:22px;height:22px;opacity:.75}
.bubble .pad{padding:8px 10px 6px}
.bubble .bhead{font-size:13.5px;font-weight:600;line-height:1.35;margin-bottom:3px}
.bubble .btext{font-size:13px;line-height:1.5;white-space:pre-wrap}
.bubble .bfoot{margin-top:5px;font-size:11px;color:var(--faint-fg)}
.bubble mark{background:color-mix(in srgb,var(--axi-brand) 18%,transparent);color:inherit;border-radius:4px;padding:0 3px;font-weight:500}
.bubble .stamp{display:block;text-align:right;font-size:10px;color:var(--faint-fg);padding:0 10px 6px}
.bubble .stamp .ic{width:12px;height:12px;display:inline-block;vertical-align:-2px;color:var(--axi-info)}
.bubble .acts{border-top:1px solid var(--border-soft)}
.bubble .act{display:flex;align-items:center;justify-content:center;gap:6px;padding:8px;font-size:12.5px;color:#1d9bf0;font-weight:500}
.bubble .act+.act{border-top:1px solid var(--border-soft)}
.bubble .act .ic{width:13px;height:13px}
.phone .cap{font-size:11px;color:var(--faint-fg);text-align:center;line-height:1.45}

/* ─────────── Avisos ─────────── */
.callout{display:flex;gap:9px;align-items:flex-start;border:1px solid;border-radius:var(--r-md);padding:10px 12px;font-size:12.5px;line-height:1.55;color:var(--muted-fg)}
.callout .ic{margin-top:1px;width:15px;height:15px}
.callout strong{color:var(--foreground);font-weight:600}
.callout.info{border-color:color-mix(in srgb,var(--axi-info) 26%,var(--border));background:color-mix(in srgb,var(--axi-info) 6%,var(--background))}
.callout.info>.ic{color:var(--axi-info)}
.callout.warn{border-color:color-mix(in srgb,var(--axi-warning) 30%,var(--border));background:color-mix(in srgb,var(--axi-warning) 7%,var(--background))}
.callout.warn>.ic{color:var(--axi-warning)}
.callout.calm{border-color:var(--border);background:var(--secondary)}
.callout.calm>.ic{color:var(--muted-fg)}

/* ─────────── Pie del formulario ─────────── */
.foot{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;margin-top:16px;padding-top:14px;border-top:1px solid var(--border)}

/* ─────────── Notas ─────────── */
.notes{display:grid;gap:12px;margin-top:16px}
@media (min-width:760px){.notes{grid-template-columns:1fr 1fr}}
.note{border:1px solid var(--border);border-radius:var(--r-md);padding:13px 15px;display:flex;flex-direction:column;gap:6px;background:var(--background)}
.note h3{font-size:13px}
.note p{font-size:12.5px;color:var(--muted-fg);line-height:1.6}
.note .k{display:inline-flex;align-items:center;gap:6px;font-size:11px;color:var(--faint-fg);font-weight:600;text-transform:uppercase;letter-spacing:.06em}
.note .k .ic{width:13px;height:13px}
.note code{font-family:var(--font-mono);font-size:11.5px;background:var(--secondary);border:1px solid var(--border-soft);border-radius:5px;padding:1px 5px}
"""

JS = r"""
(function(){
  /* ── vistas del mockup ── */
  var ids = {minimo:"view-minimo", completa:"view-completa", botones:"view-botones",
             limites:"view-limites", media:"view-media", notas:"view-notas"};
  function show(n){
    Object.keys(ids).forEach(function(k){ document.getElementById(ids[k]).hidden = (k !== n); });
    document.querySelectorAll(".mk-view").forEach(function(b){
      b.setAttribute("aria-pressed", String(b.getAttribute("data-view") === n));
    });
    window.scrollTo({top:0});
  }
  document.querySelectorAll(".mk-view").forEach(function(b){
    b.addEventListener("click", function(){ show(b.getAttribute("data-view")); });
  });
  document.querySelectorAll("[data-goto]").forEach(function(b){
    b.addEventListener("click", function(){ show(b.getAttribute("data-goto")); });
  });

  /* ── segmentado del tipo de cabecera ── */
  document.querySelectorAll(".seg").forEach(function(seg){
    seg.querySelectorAll("button").forEach(function(btn){
      btn.addEventListener("click", function(){
        seg.querySelectorAll("button").forEach(function(b){ b.setAttribute("aria-pressed","false"); });
        btn.setAttribute("aria-pressed","true");
      });
    });
  });

  /* ── contadores que cuentan lo que cuenta Meta ── */
  document.querySelectorAll("[data-count]").forEach(function(input){
    /* El contador se busca dentro del MISMO campo: la pieza del cuerpo aparece
       en cuatro vistas y con `id` habría cuatro iguales. */
    var field = input.closest(".field");
    var out = field ? field.querySelector(".count") : null;
    var max = Number(input.getAttribute("data-max"));
    function paint(){
      if(!out) return;
      out.textContent = String(input.value.length) + "/" + String(max);
      out.classList.toggle("over", input.value.length > max);
    }
    input.addEventListener("input", paint);
    paint();
  });

  /* ── tema ── */
  var root = document.documentElement,
      tb = document.getElementById("theme-btn"),
      tt = document.getElementById("theme-txt");
  function isDark(){
    var t = root.getAttribute("data-theme");
    return t ? t === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  function paint(){ tt.textContent = isDark() ? "Claro" : "Oscuro"; }
  tb.addEventListener("click", function(){
    root.setAttribute("data-theme", isDark() ? "light" : "dark"); paint();
  });
  paint();
})();
"""


# ───────────────────────── Piezas ─────────────────────────

def header_bar():
    return f"""
<div class="app-header">
  <div class="row">
    <h1>Nueva plantilla de Meta</h1>
    <span class="crumb">Marketing &rsaquo; Plantillas de Meta</span>
  </div>
</div>"""


def piece(glyph, title, sub, body, end="", required=False):
    cls = "piece required" if required else "piece"
    return f"""
<section class="{cls}">
  <header>
    <span class="glyph">{ic(glyph)}</span>
    <span class="txt"><b>{title}</b><i>{sub}</i></span>
    <span class="end">{end}</span>
  </header>
  <div class="body">{body}</div>
</section>"""


def remove_btn(label):
    return (f'<button class="btn btn-ghost btn-icon" aria-label="Quitar {label}">'
            f'{ic("x", "", 14)}</button>')


BODY_PIECE = f"""
    <div class="field">
      <span class="lbl">Texto<span class="count">0/1024</span></span>
      <textarea class="inp" data-count data-max="1024"
        aria-label="Cuerpo del mensaje">Hola {V1}, en Savage abrimos la temporada con 30% en toda la colección. Es hasta el domingo.</textarea>
      <div class="adders">
        <button class="adder">{ic("hash")}Insertar hueco</button>
      </div>
      <p class="hint">Los huecos se rellenan al enviar con el dato de cada contacto.
        Meta exige un ejemplo por cada uno.</p>
    </div>"""


HEADER_PIECE = f"""
    <div class="seg" role="group" aria-label="Tipo de cabecera">
      <button aria-pressed="true">{ic("type")}Texto</button>
      <button aria-pressed="false">{ic("image")}Imagen</button>
    </div>
    <div class="field">
      <span class="lbl">Texto de la cabecera<span class="count">0/60</span></span>
      <input class="inp" data-count data-max="60" aria-label="Texto de la cabecera"
        value="Temporada nueva en Savage">
      <p class="hint">Admite <strong>un solo hueco</strong>, y no admite negritas ni cursivas.</p>
    </div>"""


FOOTER_PIECE = f"""
    <div class="field">
      <span class="lbl">Texto del pie<span class="count">0/60</span></span>
      <input class="inp" data-count data-max="60" aria-label="Texto del pie"
        value="Responde SALIR para no recibir más promociones">
      <p class="hint">Sin huecos: Meta no los admite en el pie. Es el sitio donde suele ir
        la salida del cliente.</p>
    </div>"""


def button_row(kind_icon, kind_label, fields, label="el botón"):
    return f"""
      <div class="brow">
        <span class="grip">{ic("grip-vertical")}</span>
        <span class="kind">{ic(kind_icon)}{kind_label}</span>
        {fields}
        <span class="rm">{remove_btn(label)}</span>
      </div>"""


BUTTONS_PIECE = f"""
    <div class="bgroup">
      <div class="gh">{ic("corner-up-left")}Respuestas rápidas<span class="cap">2 de 10</span></div>
      {button_row("corner-up-left", "Rápida",
                  '<input class="inp" value="Ver la colección" aria-label="Texto del botón">')}
      {button_row("corner-up-left", "Rápida",
                  '<input class="inp" value="No me interesa" aria-label="Texto del botón">')}
      <div class="brow">
        <button class="adder">{ic("plus")}Añadir respuesta rápida</button>
      </div>
    </div>

    <div class="bgroup">
      <div class="gh">{ic("link")}Acciones<span class="cap">1 de 4</span></div>
      {button_row("link", "Enlace",
                  '<input class="inp" value="Ir a la tienda" aria-label="Texto del botón">'
                  '<input class="inp mono" value="savage.co/temporada" aria-label="Dirección">')}
      <div class="brow">
        <button class="adder">{ic("plus")}Enlace</button>
        <button class="adder">{ic("phone")}Llamar</button>
        <button class="adder">{ic("copy")}Copiar código</button>
      </div>
    </div>

    <p class="callout warn">{ic("triangle-alert")}<span>Con más de tres botones, WhatsApp enseña
      solo dos y esconde el resto detr&aacute;s de <strong>&laquo;Ver todas las opciones&raquo;</strong>.
      Y una plantilla con cuatro o m&aacute;s, o que mezcle r&aacute;pidas con acciones,
      <strong>no se puede ver en WhatsApp de escritorio</strong>: a quien la reciba ah&iacute; se le
      pedir&aacute; abrirla en el celular.</span></p>"""


def bubble(header=None, media=False, body_html=None, footer=None, actions=None, more=False):
    parts = []
    if media:
        parts.append(f'<div class="media">{ic("image")}</div>')
    pad = []
    if header is not None:
        pad.append(f'<div class="bhead">{header}</div>')
    if body_html is not None:
        pad.append(f'<div class="btext">{body_html}</div>')
    if footer is not None:
        pad.append(f'<div class="bfoot">{footer}</div>')
    if pad:
        parts.append(f'<div class="pad">{"".join(pad)}</div>')
    parts.append(f'<span class="stamp">12:04 {ic("check-check", "", 12)}</span>')
    if actions:
        rows = "".join(
            f'<div class="act">{ic(icon, "", 13)}{text}</div>' for icon, text in actions
        )
        if more:
            rows += f'<div class="act">{ic("chevron-down", "", 13)}Ver todas las opciones</div>'
        parts.append(f'<div class="acts">{rows}</div>')
    return f'<div class="bubble">{"".join(parts)}</div>'


SAMPLE_BODY = ('Hola <mark>Laura</mark>, en Savage abrimos la temporada con 30% en toda la '
               'colecci&oacute;n. Es hasta el domingo.')


def phone(inner, caption):
    return f"""
<aside class="phone">
  <div class="screen">{inner}</div>
  <p class="cap">{caption}</p>
</aside>"""


def page(view_id, hidden, title, sub, inner):
    h = " hidden" if hidden else ""
    return f"""
<div class="wrap" id="{view_id}"{h}>
  <div class="head">
    <h2>{title}</h2>
    <p class="sub">{sub}</p>
  </div>
  {inner}
</div>"""


def foot(label="Enviar a revisi&oacute;n de Meta", note=""):
    return f"""
<div class="foot">
  <span class="hint">{note}</span>
  <span style="display:flex;gap:8px">
    <button class="btn btn-ghost btn-sm">Cancelar</button>
    <button class="btn btn-primary">{label}</button>
  </span>
</div>"""


# ───────────────────────── Vistas ─────────────────────────

def view_minimo():
    inner = f"""
<div class="shop">
  <div class="pieces">
    {piece("align-left", "Cuerpo", "Lo &uacute;nico que Meta exige", BODY_PIECE, required=True)}
    <div class="adders">
      <button class="adder" data-goto="completa">{ic("type")}A&ntilde;adir cabecera</button>
      <button class="adder" data-goto="completa">{ic("message-square")}A&ntilde;adir pie</button>
      <button class="adder" data-goto="botones">{ic("corner-up-left")}A&ntilde;adir botones</button>
    </div>
    <p class="callout calm">{ic("info")}<span>Una plantilla solo con cuerpo es lo que se puede
      crear hoy: texto plano. La imagen, el pie y los botones son opcionales para Meta, pero son
      la diferencia entre un aviso y algo que el cliente puede <strong>responder de un
      toque</strong> &mdash; y ese toque es lo que abre la ventana de 24 h sin que teclee nada.</span></p>
    {foot(note="Meta suele decidir en minutos; puede tardar hasta 48 h.")}
  </div>
  {phone(bubble(body_html=SAMPLE_BODY),
         "As&iacute; le llega hoy: sin imagen, sin pie y sin ning&uacute;n bot&oacute;n.")}
</div>"""
    return page("view-minimo", False, "Una plantilla se arma por piezas",
                "Solo el cuerpo es obligatorio. Lo dem&aacute;s se a&ntilde;ade cuando hace falta, "
                "y cada pieza aparece en la previa en cuanto la escribes.", inner)


def view_completa():
    inner = f"""
<div class="shop">
  <div class="pieces">
    {piece("type", "Cabecera", "Texto o imagen &middot; opcional", HEADER_PIECE,
           end=remove_btn("la cabecera"))}
    {piece("align-left", "Cuerpo", "Lo &uacute;nico que Meta exige", BODY_PIECE, required=True)}
    {piece("message-square", "Pie", "60 caracteres, sin huecos &middot; opcional", FOOTER_PIECE,
           end=remove_btn("el pie"))}
    <div class="adders">
      <button class="adder" data-goto="botones">{ic("corner-up-left")}A&ntilde;adir botones</button>
    </div>
    {foot(note="Cuatro piezas, un solo env&iacute;o.")}
  </div>
  {phone(bubble(header="Temporada nueva en Savage", body_html=SAMPLE_BODY,
                footer="Responde SALIR para no recibir m&aacute;s promociones"),
         "La cabecera va en negrita arriba; el pie, en gris peque&ntilde;o abajo.")}
</div>"""
    return page("view-completa", True, "Cabecera, cuerpo y pie",
                "Cada pieza tiene su tope de caracteres y sus reglas, y el contador cuenta lo que "
                "cuenta Meta &mdash; no lo que nos parezca.", inner)


def view_botones():
    inner = f"""
<div class="shop">
  <div class="pieces">
    {piece("corner-up-left", "Botones", "Hasta 10, en dos grupos", BUTTONS_PIECE,
           end=remove_btn("los botones"))}
    <p class="callout info">{ic("circle-check")}<span>Los dos grupos no son un capricho de
      presentaci&oacute;n: Meta <strong>exige</strong> que las respuestas r&aacute;pidas vayan
      juntas. &laquo;R&aacute;pida, enlace, r&aacute;pida&raquo; es una combinaci&oacute;n que su
      API rechaza. Separarlas en dos grupos hace que esa combinaci&oacute;n
      <strong>no se pueda ni construir</strong>.</span></p>
    {foot(note="El orden dentro de cada grupo s&iacute; lo eliges t&uacute;.")}
  </div>
  {phone(bubble(header="Temporada nueva en Savage", body_html=SAMPLE_BODY,
                footer="Responde SALIR para no recibir m&aacute;s promociones",
                actions=[("link", "Ir a la tienda"), ("corner-up-left", "Ver la colecci&oacute;n")],
                more=True),
         "Con m&aacute;s de tres, WhatsApp ense&ntilde;a dos y esconde el resto.")}
</div>"""
    return page("view-botones", True, "Los botones, en dos grupos",
                "El bot&oacute;n de respuesta r&aacute;pida es lo que abre la ventana de 24 h sin "
                "que el cliente teclee; el de enlace es lo que lo lleva al cat&aacute;logo.", inner)


def view_limites():
    rows = f"""
    <div class="bgroup">
      <div class="gh">{ic("link")}Acciones<span class="cap">4 de 4 &middot; al tope</span></div>
      {button_row("link", "Enlace", '<input class="inp" value="Ir a la tienda" aria-label="Texto">')}
      {button_row("link", "Enlace", '<input class="inp" value="Ver ofertas" aria-label="Texto">')}
      {button_row("phone", "Llamar", '<input class="inp" value="Ll&aacute;manos" aria-label="Texto">')}
      {button_row("copy", "Copiar", '<input class="inp mono" value="TEMP30" aria-label="C&oacute;digo">')}
      <div class="brow">
        <button class="adder" aria-disabled="true" style="opacity:.45;cursor:not-allowed">
          {ic("link")}Enlace &middot; m&aacute;ximo 2</button>
        <button class="adder" aria-disabled="true" style="opacity:.45;cursor:not-allowed">
          {ic("phone")}Llamar &middot; m&aacute;ximo 1</button>
        <button class="adder" aria-disabled="true" style="opacity:.45;cursor:not-allowed">
          {ic("copy")}Copiar c&oacute;digo &middot; m&aacute;ximo 1</button>
      </div>
    </div>"""
    inner = f"""
<div class="shop">
  <div class="pieces">
    {piece("corner-up-left", "Botones", "Cada tipo tiene su tope", rows)}
    <p class="callout warn">{ic("triangle-alert")}<span>Los topes son de Meta y no se negocian:
      <strong>dos enlaces</strong>, <strong>un tel&eacute;fono</strong>, <strong>un copiar
      c&oacute;digo</strong> y hasta <strong>diez r&aacute;pidas</strong>, con un total de diez.
      El bot&oacute;n de a&ntilde;adir se apaga al llegar, en vez de dejarte llenar el formulario
      y que Meta lo rechace un minuto despu&eacute;s.</span></p>
    <p class="callout calm">{ic("monitor")}<span>Esta combinaci&oacute;n
      <strong>no se ve en WhatsApp de escritorio</strong>. A quien la reciba ah&iacute; se le
      pedir&aacute; abrirla en el celular, as&iacute; que conviene saberlo antes de mandarla a
      ochocientas personas.</span></p>
    {foot(note="")}
  </div>
  {phone(bubble(header="Temporada nueva en Savage", body_html=SAMPLE_BODY,
                actions=[("link", "Ir a la tienda"), ("link", "Ver ofertas")], more=True),
         "Dos visibles y el resto detr&aacute;s de &laquo;Ver todas las opciones&raquo;.")}
</div>"""
    return page("view-limites", True, "Cuando se llega al tope",
                "Las reglas de Meta dejan de ser errores que llegan despu&eacute;s y se convierten "
                "en cosas que la interfaz no te deja hacer.", inner)


def view_media():
    media_piece = f"""
    <div class="seg" role="group" aria-label="Tipo de cabecera">
      <button aria-pressed="false">{ic("type")}Texto</button>
      <button aria-pressed="true">{ic("image")}Imagen</button>
    </div>
    <div class="field">
      <span class="lbl">Imagen de ejemplo</span>
      <div style="display:flex;align-items:center;gap:10px;border:1px dashed var(--border);
                  border-radius:var(--r-md);padding:11px">
        <span style="width:46px;height:46px;flex:none;border-radius:var(--r-sm);
                     background:linear-gradient(135deg,color-mix(in srgb,var(--axi-brand) 26%,var(--muted)),
                     color-mix(in srgb,var(--axi-violet) 22%,var(--muted)));display:grid;
                     place-items:center;color:var(--muted-fg)">{ic("image")}</span>
        <span style="min-width:0">
          <span style="display:block;font-size:12.5px;font-weight:500">coleccion-septiembre.jpg</span>
          <span style="display:block;font-size:11.5px;color:var(--faint-fg)">1.200 &times; 628 &middot; 240 KB</span>
        </span>
        <span style="margin-left:auto">{remove_btn("la imagen")}</span>
      </div>
      <p class="hint">Meta revisa <strong>esta</strong> imagen, pero al enviar se manda la que
        elijas en cada campa&ntilde;a. Esta es el ejemplo con el que aprueba la plantilla.</p>
    </div>"""
    inner = f"""
<div class="shop">
  <div class="pieces">
    {piece("image", "Cabecera", "Imagen &middot; opcional", media_piece,
           end=remove_btn("la cabecera"))}
    {piece("align-left", "Cuerpo", "Lo &uacute;nico que Meta exige", BODY_PIECE, required=True)}
    <p class="callout info">{ic("info")}<span>Una cabecera es <strong>texto o imagen</strong>, no
      las dos. Cambiar de tipo no borra lo que escribiste: se guarda por si vuelves.</span></p>
    {foot(note="")}
  </div>
  {phone(bubble(media=True, body_html=SAMPLE_BODY,
                footer="Responde SALIR para no recibir m&aacute;s promociones",
                actions=[("link", "Ir a la tienda")]),
         "La imagen ocupa el ancho de la burbuja, encima del texto.")}
</div>"""
    return page("view-media", True, "Cabecera con imagen",
                "Es lo que convierte un aviso en algo que se mira. Meta aprueba la plantilla con "
                "una imagen de ejemplo; cada campa&ntilde;a manda la suya.", inner)


def view_notas():
    cards = [
        ("layers", "Piezas que se a&ntilde;aden, no un formulario lleno",
         "Lo &uacute;nico obligatorio es el cuerpo. Enseñar de entrada cuatro bloques con sus "
         "campos vac&iacute;os convierte una plantilla de dos l&iacute;neas en un tr&aacute;mite. "
         "Se empieza con el cuerpo y las dem&aacute;s piezas se piden cuando hacen falta."),
        ("corner-up-left", "Dos grupos de botones, y no es cosm&eacute;tica",
         "Meta <strong>exige</strong> que las respuestas r&aacute;pidas vayan juntas: "
         "<code>r&aacute;pida, enlace, r&aacute;pida</code> es una combinaci&oacute;n que su API "
         "rechaza con «invalid combination». Separarlas en dos grupos hace que la "
         "combinaci&oacute;n inv&aacute;lida <strong>no se pueda representar</strong>, que es "
         "mejor que validarla."),
        ("triangle-alert", "Los topes apagan el bot&oacute;n, no rechazan al final",
         "Dos enlaces, un tel&eacute;fono, un copiar c&oacute;digo, diez r&aacute;pidas, diez en "
         "total. Con el bot&oacute;n de a&ntilde;adir apagado y el motivo escrito al lado, el "
         "operador no llena un formulario para que se lo tumben un minuto despu&eacute;s."),
        ("eye", "La previa no miente sobre lo que ver&aacute; el cliente",
         "Con m&aacute;s de tres botones WhatsApp ense&ntilde;a dos y esconde el resto tras "
         "«Ver todas las opciones». La previa lo hace igual. Una previa que ense&ntilde;a cinco "
         "botones bonitos cuando el cliente ver&aacute; dos es peor que no tenerla."),
        ("monitor", "El aviso del escritorio, antes y no despu&eacute;s",
         "Cuatro o m&aacute;s botones, o mezclar r&aacute;pidas con acciones, hace que la "
         "plantilla <strong>no se pueda ver en WhatsApp de escritorio</strong>. Es un dato de "
         "Meta que no est&aacute; en ninguna parte del producto y que cambia la decisi&oacute;n "
         "de quien escribe a ochocientas personas."),
        ("hash", "Los huecos, solo donde Meta los admite",
         "El cuerpo admite varios, la cabecera <strong>uno</strong> y el pie <strong>ninguno</strong>. "
         "Por eso el pie no tiene bot&oacute;n de insertar hueco: la regla se cuenta una vez, en la "
         "forma del control, en vez de repetirse en un aviso que nadie lee."),
    ]
    body = "".join(
        f'<div class="note"><span class="k">{ic(icon)}{i + 1:02d}</span><h3>{title}</h3><p>{text}</p></div>'
        for i, (icon, title, text) in enumerate(cards)
    )
    return page("view-notas", True, "Qu&eacute; cambia y por qu&eacute;",
                "Seis decisiones del constructor, con el motivo detr&aacute;s de cada una.",
                f'<div class="notes">{body}</div>')


VIEWS = [("minimo", "Solo cuerpo"), ("completa", "Con cabecera y pie"), ("botones", "Botones"),
         ("limites", "En el tope"), ("media", "Con imagen"), ("notas", "Qu&eacute; cambia")]


def build():
    css = CSS.replace("__LIGHT__", LIGHT).replace("__DARK__", DARK)
    btns = "".join(
        f'<button class="mk-view" data-view="{k}" aria-pressed="{str(k == "minimo").lower()}">{t}</button>'
        for k, t in VIEWS
    )
    html = f"""<title>Constructor de plantillas</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap">
<style>{css}</style>

<div class="mk-bar" role="toolbar" aria-label="Controles del mockup">
  <span class="mk-tag">{ic("sparkles", "", 14)}Mockup &middot; Plantillas de Meta</span>
  <div class="mk-grp" role="group" aria-label="Vistas">{btns}</div>
  <button class="mk-theme" id="theme-btn">{ic("moon", "", 13)}<span id="theme-txt">Oscuro</span></button>
</div>

{header_bar()}
{view_minimo()}
{view_completa()}
{view_botones()}
{view_limites()}
{view_media()}
{view_notas()}
<script>{JS}</script>
"""
    out = S / "hsm-template-builder.html"
    out.write_text(html, encoding="utf-8")
    print(f"escrito {out} ({out.stat().st_size} bytes), iconos: {len(LUCIDE)}")


if __name__ == "__main__":
    build()
