#!/usr/bin/env python3
"""Ensambla el paso «Contenido» del asistente de campañas en un HTML autocontenido.

Qué propone, en una línea: hoy el paso pregunta «¿Qué les dices?» UNA vez —con
una plantilla del tenant— y remata con una franja ámbar que avisa de que los
contactos fríos se omitirán y te manda a OTRA pantalla. Aquí el paso admite lo
que en realidad son dos mensajes distintos: el de quien te escribió hace poco y
el de quien lleva más de 24 h. La franja ámbar deja de ser un aviso y pasa a ser
el estado vacío del segundo bloque: en vez de contarte el problema, te deja
resolverlo ahí mismo.

Iconos: lucide (v0.539) desde node_modules, cacheados en campaign-hsm-step.lucide.json.
Tokens: copiados literalmente de src/app/globals.css — el mockup NO inventa paleta.
Fuentes: Poppins y Geist Mono por Google Fonts (Nexa es local; headings caen a Poppins 600).
"""
import json, pathlib, re, sys

S = pathlib.Path(__file__).parent
ROOT = S.parent.parent.parent
ICON_CACHE = S / "campaign-hsm-step.lucide.json"
SIBLING_CACHE = S / "crm-tasks-premium.lucide.json"
ICONS = [
    "sparkles", "moon", "message-square", "clock", "triangle-alert", "info",
    "circle-dollar-sign", "check", "check-check", "chevron-right", "chevron-down",
    "users", "calendar-days", "send", "x", "circle-check", "circle-alert",
    "gauge", "badge-check", "user-round", "pencil", "external-link", "arrow-right",
    "hash", "type", "ban", "megaphone", "layers", "zap", "plus", "search",
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


# Literales con llaves: en f-string habría que escribirlos por cuadruplicado.
V1, V2 = "{{1}}", "{{2}}"

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
body{background:var(--background);color:var(--foreground);font-family:var(--font-body);font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased;padding-bottom:104px}
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
.violet{color:var(--axi-violet)}
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
.crumb .ic{width:13px;height:13px}
.wrap{max-width:1000px;margin:0 auto;padding:22px 24px 0}
@media (max-width:520px){.wrap{padding:18px 16px 0}.app-header{padding:10px 16px}}

/* ─────────── Botones ─────────── */
.btn{display:inline-flex;align-items:center;gap:8px;height:36px;padding:0 14px;border-radius:999px;font-weight:500;font-size:13px;border:1px solid transparent;transition:background .2s,color .2s,border-color .2s,opacity .2s}
.btn .ic{width:16px;height:16px}
.btn-primary{background:var(--axi-brand);color:var(--axi-on-color)}
.btn-primary:hover{background:var(--axi-brand-2)}
.btn-primary[aria-disabled="true"]{opacity:.42;cursor:not-allowed}
.btn-primary[aria-disabled="true"]:hover{background:var(--axi-brand)}
.btn-outline{border-color:var(--border);background:var(--background)}
.btn-outline:hover{background:var(--secondary)}
.btn-ghost{color:var(--muted-fg)}
.btn-ghost:hover{background:var(--secondary);color:var(--foreground)}
.btn-sm{height:30px;padding:0 12px;font-size:12.5px;gap:6px}
.btn-sm .ic{width:14px;height:14px}

/* ─────────── Indicador de pasos ─────────── */
/* Una sola línea con filete: los pasos hechos llevan palomita, el actual va en
   pastilla de acento. No es una barra de progreso con porcentaje: son cuatro
   preguntas, y el usuario puede volver a cualquiera. */
.steps{display:flex;align-items:center;gap:6px;overflow-x:auto;scrollbar-width:none;margin:0 -4px;padding:2px 4px}
.steps::-webkit-scrollbar{display:none}
.steps .st{display:inline-flex;align-items:center;gap:7px;height:30px;padding:0 12px;border-radius:999px;font-size:12.5px;color:var(--faint-fg);white-space:nowrap}
.steps .st .ic{width:14px;height:14px}
.steps .st.done{color:var(--muted-fg)}
.steps .st.done .ic{color:var(--axi-success)}
.steps .st.now{background:var(--accent);color:var(--foreground);font-weight:600}
.steps .sep{width:14px;height:1px;background:var(--border);flex:none}

.head{margin-top:18px}
.head h2{font-size:22px;letter-spacing:-.02em}
.head .sub{font-size:13px;color:var(--muted-fg);margin-top:4px;max-width:62ch}

/* ─────────── Los dos mensajes ─────────── */
/* Dos paneles hermanos, mismos bordes y mismo relleno: la simetría es la que
   dice «son dos mitades del mismo envío», no dos funciones distintas. A 860 px
   se apilan; el orden importa, primero el caliente. */
.two{display:grid;gap:14px;margin-top:16px}
@media (min-width:860px){.two{grid-template-columns:1fr 1fr;align-items:start}}
.panel{border:1px solid var(--border);border-radius:var(--r-lg);background:var(--background);overflow:clip;display:flex;flex-direction:column}
.panel>.body{padding:14px;display:flex;flex-direction:column;gap:12px}
/* La cabecilla lleva el «a quién» y el «cuántos»: sin la cifra, elegir la
   plantilla es a ciegas. La cifra es un tope estimado, y lo dice el ≈. */
.phead{display:flex;align-items:center;gap:10px;padding:11px 14px;border-bottom:1px solid var(--border);background:color-mix(in srgb,var(--foreground) 2.5%,var(--background))}
.phead .glyph{width:30px;height:30px;flex:none;display:grid;place-items:center;border-radius:var(--r-sm);background:color-mix(in srgb,var(--foreground) 6%,transparent);color:var(--muted-fg)}
.phead .glyph .ic{width:15px;height:15px}
.phead .txt{min-width:0;display:flex;flex-direction:column;gap:1px}
.phead b{font-size:13.5px;font-weight:600;letter-spacing:-.01em}
.phead i{font-style:normal;font-size:11.5px;color:var(--muted-fg)}
.phead .count{margin-left:auto;font-size:12px;color:var(--muted-fg);white-space:nowrap;font-variant-numeric:tabular-nums}

/* ─────────── Campos ─────────── */
.field{display:flex;flex-direction:column;gap:6px}
/* Etiqueta como `span` + `aria-label` en el control: el mismo panel se repite en
   varias vistas del mockup y un `for=` obligaría a `id` únicos por vista. */
.field>.lbl{font-size:11.5px;font-weight:500;color:var(--muted-fg)}
.sel{position:relative;display:flex;align-items:center}
.sel select{appearance:none;width:100%;height:36px;padding:0 32px 0 11px;border:1px solid var(--input);border-radius:var(--r-sm);background:var(--background);font-size:13px}
.sel .ic{position:absolute;right:10px;width:14px;height:14px;color:var(--faint-fg);pointer-events:none}
.sel input[type=text]{width:100%;height:36px;padding:0 11px;border:1px solid var(--input);border-radius:var(--r-sm);background:var(--background);font-size:13px}
.hint{font-size:11.5px;color:var(--faint-fg);line-height:1.45}

/* ─────────── Estado vacío del bloque de Meta ─────────── */
/* Aquí vivía la franja ámbar. El aviso sigue, pero con la salida dentro: el
   problema y su solución en la misma caja. */
.blank{border:1px dashed color-mix(in srgb,var(--axi-warning) 42%,var(--border));border-radius:var(--r-md);background:color-mix(in srgb,var(--axi-warning) 6%,var(--background));padding:16px;display:flex;flex-direction:column;gap:11px;align-items:flex-start}
.blank .top{display:flex;gap:9px;align-items:flex-start}
.blank .top .ic{color:var(--axi-warning);margin-top:1px}
.blank p{font-size:12.5px;line-height:1.55;color:var(--muted-fg)}
.blank strong{color:var(--foreground);font-weight:600}

/* ─────────── Burbuja de WhatsApp ─────────── */
.chat{border:1px solid var(--border-soft);border-radius:var(--r-md);background:color-mix(in srgb,var(--foreground) 3%,var(--background));padding:13px}
.bubble{max-width:34ch;border:1px solid var(--border-soft);background:var(--background);border-radius:var(--r-lg);border-bottom-left-radius:6px;padding:9px 11px;font-size:13px;line-height:1.55;box-shadow:var(--shadow-float)}
.bubble mark{background:color-mix(in srgb,var(--axi-brand) 16%,transparent);color:inherit;border-radius:4px;padding:0 3px;font-weight:500}
.bubble .meta{display:block;margin-top:3px;text-align:right;font-size:10px;color:var(--faint-fg)}
.bubble .meta .ic{width:12px;height:12px;display:inline-block;vertical-align:-2px;color:var(--axi-info)}
.chat .ph{font-size:12px;color:var(--faint-fg)}

/* ─────────── Mapeo de variables ─────────── */
/* Una fila por variable. Sin esto el envío sale sin parámetros y Meta lo
   rechaza: por eso el mapeo vive PEGADO al selector, no escondido tras un
   «avanzado». El hueco sin resolver se marca en el propio campo. */
.vars{border:1px solid var(--border);border-radius:var(--r-md);overflow:clip}
.vars .vh{display:flex;align-items:center;gap:7px;padding:8px 11px;border-bottom:1px solid var(--border);background:color-mix(in srgb,var(--foreground) 3%,var(--background));font-size:11.5px;color:var(--muted-fg);font-weight:500}
.vars .vh .ic{width:13px;height:13px}
.vrow{display:grid;grid-template-columns:auto 1fr;gap:9px;align-items:center;padding:9px 11px}
.vrow+.vrow{border-top:1px solid var(--border-soft)}
.vrow .tok{font-family:var(--font-mono);font-size:11.5px;padding:3px 7px;border-radius:6px;background:var(--secondary);border:1px solid var(--border-soft);color:var(--muted-fg)}
.vrow .pair{display:grid;gap:7px}
@media (min-width:420px){.vrow .pair.two-up{grid-template-columns:1fr 1fr}}
.vrow.todo .sel select{border-color:color-mix(in srgb,var(--axi-warning) 55%,var(--input));box-shadow:0 0 0 3px color-mix(in srgb,var(--axi-warning) 12%,transparent)}

/* ─────────── Callout (franja inline) ─────────── */
/* El mismo componente para coste, cupo y error. Hoy vive PRIVADO dentro de
   BulkFollowUpModal; aquí se propone compartido. Tinte al 7 %, nunca texto del
   color del tinte sobre el tinte: eso es lo que no pasa AA en claro. */
.callout{display:flex;gap:9px;align-items:flex-start;border:1px solid;border-radius:var(--r-md);padding:10px 12px;font-size:12.5px;line-height:1.55;color:var(--muted-fg)}
.callout .ic{margin-top:1px;width:15px;height:15px}
.callout strong{color:var(--foreground);font-weight:600}
.callout.info{border-color:color-mix(in srgb,var(--axi-info) 26%,var(--border));background:color-mix(in srgb,var(--axi-info) 6%,var(--background))}
.callout.info>.ic{color:var(--axi-info)}
.callout.warn{border-color:color-mix(in srgb,var(--axi-warning) 30%,var(--border));background:color-mix(in srgb,var(--axi-warning) 7%,var(--background))}
.callout.warn>.ic{color:var(--axi-warning)}
.callout.bad{border-color:color-mix(in srgb,var(--axi-destructive) 28%,var(--border));background:color-mix(in srgb,var(--axi-destructive) 6%,var(--background))}
.callout.bad>.ic{color:var(--axi-destructive)}
.callout.calm{border-color:var(--border);background:var(--secondary)}
.callout.calm>.ic{color:var(--muted-fg)}

/* ─────────── Etiqueta de estado (superficie neutra + punto) ─────────── */
.tag{display:inline-flex;align-items:center;gap:6px;height:22px;padding:0 9px;border-radius:999px;background:var(--secondary);border:1px solid var(--border-soft);font-size:11px;color:var(--muted-fg);white-space:nowrap}
.tag .dot{width:6px;height:6px;border-radius:999px;flex:none}
.tag .dot.ok{background:var(--axi-success)}
.tag .dot.mk{background:var(--axi-violet)}
.tagrow{display:flex;flex-wrap:wrap;gap:6px;align-items:center}

/* ─────────── Pie de navegación del asistente ─────────── */
.nav{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;margin-top:18px;padding-top:14px;border-top:1px solid var(--border)}
.nav .why{font-size:12px;color:var(--axi-warning);display:flex;align-items:center;gap:6px}
.nav .why .ic{width:14px;height:14px}

/* ─────────── Revisión ─────────── */
.sums{display:grid;gap:1px;margin-top:16px;background:var(--border);border:1px solid var(--border);border-radius:var(--r-md);overflow:clip;grid-template-columns:repeat(2,minmax(0,1fr))}
@media (min-width:760px){.sums{grid-template-columns:repeat(4,minmax(0,1fr))}}
.sum{background:var(--background);padding:11px 13px;display:flex;flex-direction:column;gap:3px}
.sum i{font-style:normal;font-size:11px;color:var(--muted-fg)}
.sum b{font-size:15px;font-weight:600;letter-spacing:-.01em}
.sum .s{font-size:11.5px;color:var(--faint-fg)}

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
  /* ── plantillas de Meta del mockup (aprobadas y de categoría marketing) ── */
  var T = {
    promo: {
      name:"promo_septiembre_2026", lang:"es", cat:"marketing", cost:0.02,
      body:["Hola ", 1, " 👋 En Savage tenemos 30% en la colección de ", 2,
            " hasta el domingo. ¿Te muestro lo que llegó?"]
    },
    carrito: {
      name:"recuperacion_carrito", lang:"es", cat:"marketing", cost:0.02,
      body:["Hola ", 1, ", dejaste algo esperando en el carrito. Sigue disponible hoy. ¿Te ayudo a terminar el pedido?"]
    }
  };
  var SRC = { first_name:"Laura", topic:"septiembre", company:"Savage" };

  function labelFor(v){
    if(v==="contact") return SRC.first_name;
    if(v==="company") return SRC.company;
    if(v==="static")  return SRC.topic;
    return null;
  }

  /* ── Paneles vivos: el selector manda sobre previa, variables y coste ──
     El mismo panel aparece en varias vistas, así que el cableado va por CLASE y
     acotado a su propio panel. Con `id` solo habría respondido el primero. */
  var CHECK = '<svg class="ic" width="12" height="12" viewBox="0 0 24 24" fill="none" ' +
    'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ' +
    'aria-hidden="true">__CHECKCHECK__</svg>';

  function wire(panel){
    var sel = panel.querySelector(".js-sel");
    if(!sel) return;
    var bubble = panel.querySelector(".js-bubble"),
        varsBox = panel.querySelector(".js-vars"),
        costEl = panel.querySelector(".js-cost span"),
        v1 = panel.querySelector(".js-v1"),
        v2 = panel.querySelector(".js-v2"),
        row1 = panel.querySelector(".js-vrow1"),
        row2 = panel.querySelector(".js-vrow2"),
        free = panel.querySelector(".js-free"),
        view = panel.closest(".wrap"),
        btn = view ? view.querySelector(".js-go") : null,
        why = view ? view.querySelector(".js-why") : null;

    function nodeFor(i){ return i === 1 ? v1 : v2; }

    function paint(){
      var t = T[sel.value];
      if(!t) return;
      var html = "";
      t.body.forEach(function(part){
        if(typeof part === "string"){
          html += part.replace(/&/g,"&amp;").replace(/</g,"&lt;");
          return;
        }
        var node = nodeFor(part), val = node ? labelFor(node.value) : null;
        html += val === null ? '<mark>{{'+part+'}}</mark>' : '<mark>'+val+'</mark>';
      });
      bubble.innerHTML = html + '<span class="meta">12:04 ' + CHECK + '</span>';

      /* la segunda variable solo existe en una de las dos plantillas */
      if(row2) row2.hidden = (t.body.indexOf(2) === -1);
      if(varsBox) varsBox.hidden = (t.body.indexOf(1) === -1 && t.body.indexOf(2) === -1);
      if(costEl){
        var total = (820 * t.cost).toFixed(2).replace(".", ",");
        costEl.innerHTML = 'Como mucho <strong>820 &times; US$0,0200 &asymp; US$' + total +
          '</strong>. Una plantilla de <strong>marketing</strong> cuesta unas 25 veces ' +
          'm&aacute;s que una de utilidad, y solo se cobra la que Meta entrega.';
      }
      if(free && v2) free.hidden = (v2.value !== "static");

      /* el paso se bloquea si queda un hueco sin decidir: sin parámetros,
         Meta rechaza el envío entero */
      var need = [];
      [1,2].forEach(function(i){
        if(t.body.indexOf(i) === -1) return;
        var node = nodeFor(i);
        if(node && labelFor(node.value) === null) need.push("{{"+i+"}}");
      });
      [[v1,row1],[v2,row2]].forEach(function(p){
        if(p[0] && p[1]) p[1].classList.toggle("todo", labelFor(p[0].value) === null);
      });
      if(btn) btn.setAttribute("aria-disabled", String(need.length > 0));
      if(why){
        why.hidden = need.length === 0;
        if(need.length > 0)
          why.querySelector("span").textContent = "Falta decir qué va en " + need.join(" y ");
      }
    }

    [sel, v1, v2].forEach(function(n){ if(n) n.addEventListener("change", paint); });
    paint();
  }
  document.querySelectorAll(".hsm-live").forEach(wire);

  /* ── vistas del mockup ── */
  var ids = {vacio:"view-vacio", elegida:"view-elegida", cupo:"view-cupo",
             sincanal:"view-sincanal", revision:"view-revision", notas:"view-notas"};
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
  /* el estado vacío ofrece la salida: llevar a la vista con plantilla elegida */
  document.querySelectorAll(".js-pick").forEach(function(b){
    b.addEventListener("click", function(){ show("elegida"); });
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

def header():
    return f"""
<div class="app-header">
  <div class="row">
    <h1>Nueva campa&ntilde;a</h1>
    <span class="crumb">{ic("chevron-right", "", 13)}Marketing {ic("chevron-right", "", 13)}Campa&ntilde;as</span>
  </div>
</div>"""


def steps(current="contenido"):
    items = [("audiencia", "Audiencia"), ("contenido", "Contenido"),
             ("programacion", "Programaci&oacute;n"), ("revision", "Revisi&oacute;n")]
    order = [k for k, _ in items]
    here = order.index(current)
    out = []
    for i, (key, label) in enumerate(items):
        if i < here:
            out.append(f'<span class="st done">{ic("circle-check", "", 14)}{label}</span>')
        elif i == here:
            out.append(f'<span class="st now" aria-current="step">{label}</span>')
        else:
            out.append(f'<span class="st">{label}</span>')
        if i < len(items) - 1:
            out.append('<span class="sep"></span>')
    return f'<div class="steps" role="list" aria-label="Pasos">{"".join(out)}</div>'


def panel_tenant(body_html):
    """Panel izquierdo: el mensaje de siempre, para quien sigue en ventana."""
    return f"""
<section class="panel">
  <div class="phead">
    <span class="glyph">{ic("message-square")}</span>
    <span class="txt"><b>A quien te escribi&oacute; hace poco</b><i>Dentro de las 24 h &middot; texto libre</i></span>
    <span class="count">&asymp; 420</span>
  </div>
  <div class="body">{body_html}</div>
</section>"""


TENANT_BODY = f"""
    <div class="field">
      <span class="lbl">Plantilla</span>
      <div class="sel">
        <select aria-label="Plantilla del tenant">
          <option>Novedades de temporada</option>
          <option>Recordatorio de carrito</option>
        </select>
        {ic("chevron-down")}
      </div>
      <p class="hint">Se rellenan <code class="mono">{{{{first_name}}}}</code>,
        <code class="mono">{{{{contact_name}}}}</code> y <code class="mono">{{{{company_name}}}}</code>.</p>
    </div>
    <div class="chat">
      <div class="bubble">Hola <mark>Laura</mark>, lleg&oacute; la colecci&oacute;n nueva a Savage y
        se est&aacute; yendo r&aacute;pido. ¿Te paso el cat&aacute;logo?
        <span class="meta">12:04 {ic("check-check", "", 12)}</span></div>
    </div>"""


def panel_meta(body_html, count="&asymp; 820", live=False):
    """`live=True` marca el panel para que el JS lo cablee (previa, variables, coste)."""
    cls = "body hsm-live" if live else "body"
    return f"""
<section class="panel">
  <div class="phead">
    <span class="glyph">{ic("clock")}</span>
    <span class="txt"><b>A quien lleva m&aacute;s de 24 h</b><i>Fuera de ventana &middot; solo plantilla de Meta</i></span>
    <span class="count">{count}</span>
  </div>
  <div class="{cls}">{body_html}</div>
</section>"""


META_BLANK = f"""
    <div class="blank">
      <div class="top">
        {ic("triangle-alert")}
        <p>Meta solo deja abrir una conversaci&oacute;n fr&iacute;a con una
          <strong>plantilla aprobada</strong>. Sin elegir una, estos
          <strong>820 contactos</strong> se omiten y lo ver&aacute;s en el detalle de la campa&ntilde;a.</p>
      </div>
      <button class="btn btn-outline btn-sm js-pick">{ic("badge-check")}Elegir plantilla de Meta</button>
    </div>
    <p class="hint">¿No tienes ninguna aprobada todav&iacute;a?
      <a href="#" style="text-decoration:underline">Crear una</a> &mdash; Meta suele responder en menos de 24 h.</p>"""


META_CHOSEN = f"""
    <div class="field">
      <span class="lbl">Plantilla aprobada</span>
      <div class="sel">
        <select class="js-sel" aria-label="Plantilla de Meta aprobada">
          <option value="promo">promo_septiembre_2026</option>
          <option value="carrito">recuperacion_carrito</option>
        </select>
        {ic("chevron-down")}
      </div>
      <div class="tagrow">
        <span class="tag"><span class="dot ok"></span>Aprobada</span>
        <span class="tag"><span class="dot mk"></span>Marketing</span>
        <span class="tag">Espa&ntilde;ol</span>
      </div>
    </div>

    <div class="vars js-vars">
      <div class="vh">{ic("hash")}Qu&eacute; va en cada hueco</div>
      <div class="vrow js-vrow1">
        <span class="tok">{V1}</span>
        <div class="pair">
          <div class="sel">
            <select class="js-v1" aria-label="Qu&eacute; va en la variable 1">
              <option value="contact">Nombre del contacto</option>
              <option value="company">Nombre de tu empresa</option>
              <option value="static">Texto fijo</option>
              <option value="">Sin decidir</option>
            </select>
            {ic("chevron-down")}
          </div>
        </div>
      </div>
      <div class="vrow js-vrow2">
        <span class="tok">{V2}</span>
        <div class="pair two-up">
          <div class="sel">
            <select class="js-v2" aria-label="Qu&eacute; va en la variable 2">
              <option value="static">Texto fijo</option>
              <option value="contact">Nombre del contacto</option>
              <option value="company">Nombre de tu empresa</option>
              <option value="">Sin decidir</option>
            </select>
            {ic("chevron-down")}
          </div>
          <div class="sel js-free"><input type="text" value="septiembre" aria-label="Texto fijo"></div>
        </div>
      </div>
    </div>

    <div class="chat">
      <div class="bubble js-bubble"></div>
    </div>

    <p class="callout calm js-cost">{ic("circle-dollar-sign")}<span></span></p>"""


def nav():
    """Pie del asistente. El bloqueo lo pone el JS: depende del mapeo de variables."""
    return f"""
<div class="nav">
  <button class="btn btn-ghost btn-sm">Atr&aacute;s</button>
  <span class="why js-why" hidden>{ic("circle-alert")}<span></span></span>
  <button class="btn btn-primary js-go">Continuar{ic("arrow-right")}</button>
</div>"""


def page(view_id, hidden, head_title, head_sub, inner, current="contenido"):
    h = " hidden" if hidden else ""
    return f"""
<div class="wrap" id="{view_id}"{h}>
  {steps(current)}
  <div class="head">
    <h2>{head_title}</h2>
    <p class="sub">{head_sub}</p>
  </div>
  {inner}
</div>"""


# ───────────────────────── Vistas ─────────────────────────

def view_vacio():
    return page(
        "view-vacio", False, "&iquest;Qu&eacute; les dices?",
        "Son dos mensajes, no uno: el que ve quien te escribi&oacute; hace poco y el que "
        "necesita quien lleva m&aacute;s de 24 h en silencio.",
        f'<div class="two">{panel_tenant(TENANT_BODY)}{panel_meta(META_BLANK)}</div>{nav()}',
    )


def view_elegida():
    return page(
        "view-elegida", True, "&iquest;Qu&eacute; les dices?",
        "Son dos mensajes, no uno: el que ve quien te escribi&oacute; hace poco y el que "
        "necesita quien lleva m&aacute;s de 24 h en silencio.",
        f'<div class="two">{panel_tenant(TENANT_BODY)}{panel_meta(META_CHOSEN, live=True)}</div>{nav()}',
    )


def view_cupo():
    inner = f"""
<div class="two">{panel_tenant(TENANT_BODY)}{panel_meta(META_CHOSEN, live=True)}</div>
<div style="display:grid;gap:10px;margin-top:14px">
  <p class="callout warn">{ic("gauge")}<span>Meta te deja abrir <strong>250 conversaciones nuevas cada 24 h</strong>,
    y ese cupo es del portafolio entero: lo comparten todos tus n&uacute;meros. Esta campa&ntilde;a tiene
    <strong>820 destinatarios fr&iacute;os</strong>, as&iacute; que <strong>saldr&aacute; repartida en 4 d&iacute;as</strong>,
    del 15 al 18 de septiembre. No hace falta que hagas nada: se reparte sola.</span></p>
  <p class="callout info">{ic("info")}<span>El cupo sube solo cuando Meta ve calidad: 250 &rarr; 2.000 &rarr; 10.000.
    Mandar de golpe m&aacute;s de la cuenta es justo lo que lo baja.</span></p>
</div>
{nav()}"""
    return page("view-cupo", True, "&iquest;Qu&eacute; les dices?",
                "Con plantilla elegida, el asistente ya sabe cu&aacute;nto cabe por d&iacute;a y te lo dice "
                "antes de lanzar, no despu&eacute;s.", inner)


def view_sincanal():
    inner = f"""
<div class="two">{panel_tenant(TENANT_BODY)}{panel_meta(f'''
    <div class="blank" style="border-style:solid">
      <div class="top">
        {ic("ban")}
        <p>Las plantillas de Meta viven en un n&uacute;mero de <strong>WhatsApp Cloud</strong>,
          y todav&iacute;a no tienes ninguno conectado. Sin &eacute;l no hay forma de alcanzar a quien
          lleva m&aacute;s de 24 h en silencio.</p>
      </div>
      <button class="btn btn-outline btn-sm">{ic("external-link")}Conectar WhatsApp</button>
    </div>
    <p class="hint">La campa&ntilde;a puede salir igual: solo llegar&aacute; a los 420 contactos que est&aacute;n
      dentro de la ventana.</p>''')}</div>
{nav()}"""
    return page("view-sincanal", True, "&iquest;Qu&eacute; les dices?",
                "Cuando no hay canal de WhatsApp Cloud, el bloque no desaparece: explica qu&eacute; falta "
                "y qu&eacute; pasa si sigues sin &eacute;l.", inner)


def view_revision():
    inner = f"""
<dl class="sums">
  <div class="sum"><i>Campa&ntilde;a</i><b>Colecci&oacute;n septiembre</b><span class="s">Savage</span></div>
  <div class="sum"><i>Audiencia</i><b class="tnum">&asymp; 1.240</b><span class="s">420 en ventana &middot; 820 fr&iacute;os</span></div>
  <div class="sum"><i>Coste tope</i><b class="tnum">US$16,40</b><span class="s">820 &times; US$0,0200</span></div>
  <div class="sum"><i>Salida</i><b>15&ndash;18 sep</b><span class="s">4 d&iacute;as por el cupo</span></div>
</dl>

<div class="two" style="margin-top:14px">
  <section class="panel">
    <div class="phead">
      <span class="glyph">{ic("message-square")}</span>
      <span class="txt"><b>Dentro de 24 h</b><i>Novedades de temporada</i></span>
      <span class="count">&asymp; 420</span>
    </div>
    <div class="body">
      <div class="chat"><div class="bubble">Hola <mark>Laura</mark>, lleg&oacute; la colecci&oacute;n nueva a
        Savage y se est&aacute; yendo r&aacute;pido. ¿Te paso el cat&aacute;logo?
        <span class="meta">12:04 {ic("check-check", "", 12)}</span></div></div>
    </div>
  </section>
  <section class="panel">
    <div class="phead">
      <span class="glyph">{ic("clock")}</span>
      <span class="txt"><b>Fuera de 24 h</b><i class="mono">promo_septiembre_2026</i></span>
      <span class="count">&asymp; 820</span>
    </div>
    <div class="body">
      <div class="chat"><div class="bubble">Hola <mark>Laura</mark> 👋 En Savage tenemos 30% en la
        colecci&oacute;n de <mark>septiembre</mark> hasta el domingo. ¿Te muestro lo que lleg&oacute;?
        <span class="meta">12:04 {ic("check-check", "", 12)}</span></div></div>
      <div class="tagrow">
        <span class="tag"><span class="dot ok"></span>Aprobada</span>
        <span class="tag"><span class="dot mk"></span>Marketing</span>
      </div>
    </div>
  </section>
</div>

<p class="callout warn" style="margin-top:12px">{ic("gauge")}<span>Por el cupo de Meta, los 820 fr&iacute;os
  salen en <strong>4 tandas de 250</strong>, una por d&iacute;a. Los 420 que est&aacute;n en ventana salen todos hoy.</span></p>

<div class="nav">
  <button class="btn btn-ghost btn-sm">Atr&aacute;s</button>
  <span></span>
  <button class="btn btn-primary">{ic("send")}Lanzar campa&ntilde;a</button>
</div>"""
    return page("view-revision", True, "Revisa antes de lanzar",
                "El resumen deja de decir &laquo;Sin plantilla&raquo;: ense&ntilde;a los dos mensajes, "
                "lo que cuesta como mucho y en cu&aacute;ntos d&iacute;as sale.", inner, current="revision")


def view_notas():
    cards = [
        ("layers", "Un paso, dos mensajes",
         "El paso preguntaba <em>&laquo;¿Qu&eacute; les dices?&raquo;</em> una vez y remataba con una franja "
         "&aacute;mbar avisando de que los contactos fr&iacute;os se omitir&iacute;an. Pero son dos p&uacute;blicos "
         "con reglas distintas y hac&iacute;an falta dos respuestas. La franja deja de ser un aviso y pasa a ser "
         "el estado vac&iacute;o del segundo bloque: el problema y su soluci&oacute;n en la misma caja."),
        ("external-link", "El aviso ya no te echa de la pantalla",
         "Hoy ese texto enlaza a <code>/marketing/settings/meta-templates</code>, o sea: te saca del "
         "asistente en mitad de una campa&ntilde;a a medio hacer. Ahora la plantilla se elige aqu&iacute;, "
         "y el enlace a crear una queda como salida secundaria."),
        ("hash", "El mapeo de variables no es un detalle",
         "Hoy el servidor guarda <code>hsm_param_mapping</code> y el despacho nunca lo convierte en "
         "<code>components</code>: una plantilla con <code>{{1}}</code> saldr&iacute;a sin par&aacute;metros y "
         "Meta la rechaza. Por eso el mapeo vive pegado al selector y bloquea el paso si queda un hueco "
         "sin decidir, en vez de esconderse tras un &laquo;avanzado&raquo;."),
        ("circle-dollar-sign", "Un tope, no una previsi&oacute;n",
         "La estimaci&oacute;n de audiencia no dice cu&aacute;ntos est&aacute;n fuera de la ventana, as&iacute; que "
         "el coste se ense&ntilde;a como <em>&laquo;como mucho&raquo;</em> &mdash; el mismo encuadre honesto que ya "
         "usa el seguimiento masivo del CRM. Y se dice que una <em>marketing</em> cuesta unas 25 veces una "
         "<em>utility</em>, porque es la diferencia entre gastar US$0,66 y US$16,40."),
        ("gauge", "El cupo se avisa antes, no despu&eacute;s",
         "Meta abre 250 conversaciones nuevas cada 24 h en un portafolio nuevo, y el cupo lo comparten "
         "todos los n&uacute;meros. La campa&ntilde;a no se bloquea: se reparte sola en d&iacute;as y se dice "
         "cu&aacute;ntos. Lanzar de golpe es justo lo que hunde la calificaci&oacute;n de calidad del n&uacute;mero."),
        ("badge-check", "Dos controles nuevos, compartidos desde el d&iacute;a uno",
         "El selector de plantilla existe hoy <strong>cuatro veces</strong> reescrito a mano en cuatro "
         "pantallas distintas. Este nace compartido para que las otras converjan. Y la franja de aviso ya "
         "existe, pero privada dentro del modal del CRM: se promueve a componente com&uacute;n."),
    ]
    body = "".join(
        f'<div class="note"><span class="k">{ic(icon)}{i + 1:02d}</span><h3>{title}</h3><p>{text}</p></div>'
        for i, (icon, title, text) in enumerate(cards)
    )
    return page("view-notas", True, "Qu&eacute; cambia y por qu&eacute;",
                "Seis decisiones de dise&ntilde;o de este paso, con el motivo detr&aacute;s de cada una.",
                f'<div class="notes">{body}</div>')


VIEWS = [("vacio", "Sin elegir"), ("elegida", "Con plantilla"), ("cupo", "Cupo de Meta"),
         ("sincanal", "Sin canal"), ("revision", "Revisi&oacute;n"), ("notas", "Qu&eacute; cambia")]


def build():
    css = CSS.replace("__LIGHT__", LIGHT).replace("__DARK__", DARK)
    js = JS.replace("__CHECKCHECK__", LUCIDE["check-check"])
    btns = "".join(
        f'<button class="mk-view" data-view="{k}" aria-pressed="{str(k == "vacio").lower()}">{t}</button>'
        for k, t in VIEWS
    )
    html = f"""<title>Campa&ntilde;a con plantilla</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap">
<style>{css}</style>

<div class="mk-bar" role="toolbar" aria-label="Controles del mockup">
  <span class="mk-tag">{ic("sparkles", "violet", 14)}Mockup &middot; Campa&ntilde;as &rsaquo; Contenido</span>
  <div class="mk-grp" role="group" aria-label="Vistas">{btns}</div>
  <button class="mk-theme" id="theme-btn">{ic("moon", "", 13)}<span id="theme-txt">Oscuro</span></button>
</div>

{header()}
{view_vacio()}
{view_elegida()}
{view_cupo()}
{view_sincanal()}
{view_revision()}
{view_notas()}
<script>{js}</script>
"""
    out = S / "campaign-hsm-step.html"
    out.write_text(html, encoding="utf-8")
    print(f"escrito {out} ({out.stat().st_size} bytes), iconos: {len(LUCIDE)}")


if __name__ == "__main__":
    build()
