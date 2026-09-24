#!/usr/bin/env python3
"""Mockup «Notificaciones con sileo» (F0): el aviso flotante de la plataforma pasa de la banda
de cristal (`StatusAlert` vía `useAlert().showAlert`) y del `FloatingAlert` legado a la píldora
de sileo, con la capa de adaptación `core/notifications` que conserva el contrato de `showAlert`.

El probador NO imita sileo: incrusta el paquete real (sileo 0.1.5 + React 19, empaquetado con
esbuild desde `notificaciones-sileo.adapter.js`) para que lo que se aprueba sea lo que se instala.

Uso:  SILEO_BUNDLE=/ruta/sileo-bundle.js python3 notificaciones-sileo.build.py
"""
import os
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from _axi_mockup_kit import Kit, S  # noqa: E402

K = Kit("notificaciones-sileo")
ic, btn, badge = K.ic, K.btn, K.badge

BUNDLE = pathlib.Path(os.environ.get("SILEO_BUNDLE", S / "notificaciones-sileo.bundle.js"))

# ----------------------------------------------------------------------------- CSS propio
CSS = r"""
:root{
  --font-body:"Poppins",ui-sans-serif,system-ui,sans-serif;
  /* Tintas de la píldora (capa 1 propuesta: --toast-*). Sobre píldora oscura se usa la
     paleta brillante; sobre píldora clara, la profunda. Todas ≥ 4.5:1 sobre su píldora. */
  --toast-width:min(360px, calc(100vw - 32px));
}
:root[data-pill="dark"]{
  --pill-ink:#ededed;
  --t-success:#4ade80; --t-error:#f87171; --t-warning:#fbbf24; --t-info:#60a5fa; --t-action:#fb7185; --t-loading:#a1a1aa;
}
:root[data-pill="light"]{
  --pill-ink:#171717;
  --t-success:#166534; --t-error:#b91c1c; --t-warning:#92400e; --t-info:#1d4ed8; --t-action:#be3437; --t-loading:#52525b;
}
:root{ --toast-surface:#ffffff }
@media (prefers-color-scheme: dark){ :root:not([data-theme="light"]){ --toast-surface:#18181b } }
:root[data-theme="dark"]{ --toast-surface:#18181b }

[data-sileo-viewport]{
  --sileo-width:var(--toast-width);
  --sileo-state-success:var(--t-success); --sileo-state-error:var(--t-error);
  --sileo-state-warning:var(--t-warning); --sileo-state-info:var(--t-info);
  --sileo-state-action:var(--t-action);   --sileo-state-loading:var(--t-loading);
  font-family:var(--font-body); z-index:9999;
}
[data-sileo-title].axi-t{text-transform:none;font-weight:600;font-size:13px;letter-spacing:-.005em}
[data-sileo-button].axi-b{text-decoration:none;font-weight:600;font-family:var(--font-body)}
/* sileo pinta el cuerpo al 50 % con [data-sileo-viewport][data-theme=…] [data-sileo-description]
   (0,3,0) e inyecta su CSS después del nuestro: hace falta (0,4,0) para que el 72 % AA gane. */
[data-sileo-viewport][data-theme] [data-sileo-description].axi-d{color:color-mix(in srgb, var(--pill-ink) 72%, transparent);font-size:13px;line-height:1.45}
/* El gooey (σ = 8 + umbral de alfa) se come ~6 px del extremo: 14 px nominales = 8 px reales,
   icono concéntrico con la curva. A la derecha sileo ya suma 10 px (PILL_PADDING): con 4 px el
   título respira ~16 px. sileo mide este padding con getComputedStyle, así que el ancho se reajusta. */
[data-sileo-viewport] [data-sileo-header]{padding-inline:14px 4px}
/* El relleno llega como atributo SVG (fill="#…") y no se entera de un cambio de tema con avisos
   abiertos. Una propiedad CSS gana al atributo de presentación: el color sigue al token al vuelo. */
:root{--toast-fill:var(--foreground)}
:root[data-toast-mode="surface"]{--toast-fill:var(--toast-surface)}
[data-sileo-svg] rect[data-sileo-pill],[data-sileo-svg] rect[data-sileo-body]{fill:var(--toast-fill)}
[data-sileo-svg]{filter:drop-shadow(0 1px 2px rgb(0 0 0/.10)) drop-shadow(0 10px 28px rgb(0 0 0/.16))}

/* ---- página */
body{background:var(--background);color:var(--foreground);font-family:var(--font-body)}
.lede{font-size:15px;line-height:1.6;color:var(--muted-foreground);max-width:72ch}
.lede b{color:var(--foreground);font-weight:600}
.grid2{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:16px;align-items:start}
@media (max-width: 900px){ .grid2{grid-template-columns:minmax(0,1fr)} }
.stack{display:flex;flex-direction:column;gap:16px}
.row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.eyebrow{font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--muted-foreground)}
.small{font-size:12.5px} .muted{color:var(--muted-foreground)} .mono{font-family:"Geist Mono",ui-monospace,monospace}
.tnum{font-variant-numeric:tabular-nums}
.form2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px 16px;margin-top:16px}
@media (max-width: 640px){ .form2{grid-template-columns:minmax(0,1fr)} }
.form2 .full{grid-column:1/-1}
.actions-end{display:flex;justify-content:flex-end;gap:8px;margin-top:18px;grid-column:1/-1}

/* escenarios */
.scn{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:4px 12px;align-items:center;padding:12px 0;border-top:1px solid var(--border-soft)}
.scn:first-of-type{border-top:0}
.dotc{width:10px;height:10px;border-radius:50%}
.scn .q{font-size:13.5px;font-weight:500}
.scn .src{grid-column:2/3;font-size:12px;color:var(--muted-foreground)}
.scn .btn{grid-row:1/3;grid-column:3}
.d-success{background:var(--axi-success)} .d-error{background:var(--axi-destructive)} .d-warning{background:var(--axi-warning)}
.d-info{background:var(--axi-info)} .d-action{background:var(--axi-brand)} .d-loading{background:var(--muted-foreground)}

.opt{display:flex;flex-direction:column;gap:6px}
.opt label{font-size:12px;font-weight:500;color:var(--muted-foreground)}
.seg2{display:inline-flex;padding:3px;border-radius:12px;background:var(--secondary);gap:2px;flex-wrap:wrap}
.seg2 button{border:0;background:transparent;color:var(--foreground);font:500 12.5px var(--font-body);padding:6px 12px;border-radius:9px;cursor:pointer}
.seg2 button[aria-checked="true"]{background:var(--background);box-shadow:var(--shadow-float)}
.seg2 button:focus-visible,.scn .btn:focus-visible{outline:2px solid var(--axi-brand);outline-offset:2px}

pre.map{margin:0;background:var(--secondary);border-radius:12px;padding:14px 16px;font:12px/1.6 "Geist Mono",ui-monospace,monospace;overflow-x:auto;white-space:pre}
pre.map .k{color:var(--muted-foreground)}

/* antes / después */
.screen{position:relative;border:1px solid var(--border);border-radius:16px;overflow:hidden;background:
  linear-gradient(180deg, color-mix(in srgb, var(--axi-brand) 5%, var(--background)), var(--background) 40%)}
.screen .hdr{height:54px;display:flex;align-items:center;gap:10px;padding:0 16px;border-bottom:1px solid var(--border-soft);font-size:13px;color:var(--muted-foreground)}
.screen .body{padding:18px 16px;display:flex;flex-direction:column;gap:10px}
.screen .sk{background:var(--secondary);border-radius:8px}
.cap{font-size:12px;color:var(--muted-foreground);margin-top:8px;display:flex;gap:6px;align-items:flex-start}
.cap .ic{flex:none;margin-top:2px}
/* réplica de StatusAlert (notice.tsx) */
.old-status{position:absolute;top:16px;left:0;right:0;margin:0 auto;width:672px;border-radius:16px;border:1px solid color-mix(in srgb, var(--axi-destructive) 25%, transparent);
  background:color-mix(in srgb, color-mix(in srgb, var(--axi-destructive) 8%, var(--background)) 85%, transparent);backdrop-filter:blur(12px);
  padding:16px 40px 16px 16px;display:grid;grid-template-columns:auto 1fr;gap:12px;align-items:center;box-shadow:0 10px 15px -3px rgb(0 0 0/.1)}
.old-status .disc{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:color-mix(in srgb, var(--axi-destructive) 10%, transparent);color:var(--axi-destructive)}
.old-status b{font-size:16px;font-weight:600;letter-spacing:-.01em;display:block}
.old-status span{font-size:14px;color:var(--muted-foreground)}
.old-status .x{position:absolute;right:8px;top:8px;color:var(--muted-foreground)}
.old-float{position:absolute;top:50px;right:24px;width:min(92%,28rem);border-radius:16px;border:1px solid var(--border);
  background:color-mix(in srgb, var(--background) 65%, transparent);backdrop-filter:blur(16px);padding:12px 36px 12px 16px;font-size:14px;box-shadow:var(--shadow-float)}
.old-float b{font-weight:500;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--axi-success)}
.old-float .x{position:absolute;right:8px;top:10px;color:var(--muted-foreground)}
.phone{width:300px;max-width:100%;height:230px}
/* réplica estática de la píldora de sileo */
.pill-demo{position:absolute;top:12px;left:50%;transform:translateX(-50%);width:min(340px,calc(100% - 24px));
  background:var(--foreground);color:var(--background);border-radius:20px;padding:0 0 12px;box-shadow:0 10px 28px rgb(0 0 0/.16)}
.pill-demo .h{height:40px;display:flex;align-items:center;gap:8px;padding:0 16px 0 8px}
.pill-demo .bd{width:24px;height:24px;border-radius:50%;display:grid;place-items:center}
.pill-demo .t{font-size:13px;font-weight:600}
.pill-demo p{margin:0;padding:4px 16px 0;font-size:13px;line-height:1.45;opacity:.72}
.before-after{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
@media (max-width: 860px){ .before-after{grid-template-columns:minmax(0,1fr)} }

ul.problems{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:10px}
ul.problems li{display:grid;grid-template-columns:auto 1fr;gap:10px;font-size:13.5px;line-height:1.5}
ul.problems li .ic{margin-top:3px;color:var(--axi-destructive)}
ul.problems.good li .ic{color:var(--axi-success)}

/* dónde cambia */
.table-wrap{overflow-x:auto}
table.t{width:100%;border-collapse:collapse;font-size:13.5px}
table.t th{text-align:left;font-weight:500;font-size:12px;color:var(--muted-foreground);padding:8px 12px;border-bottom:1px solid var(--border)}
table.t td{padding:10px 12px;border-bottom:1px solid var(--border-soft);vertical-align:top}
table.t td.n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.bar{height:6px;border-radius:99px;background:var(--axi-brand);opacity:.85}
.chip{display:inline-flex;align-items:center;gap:6px;height:22px;padding:0 9px;border-radius:999px;font-size:12px;font-weight:500;background:var(--secondary);white-space:nowrap}
.chip.auto{background:color-mix(in srgb, var(--axi-success) 12%, var(--background))}
.chip.mig{background:color-mix(in srgb, var(--axi-warning) 14%, var(--background))}
.chip.keep{background:var(--secondary)}
.chip.new{background:color-mix(in srgb, var(--axi-violet) 12%, var(--background))}

/* DS */
.tax{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
@media (max-width: 960px){ .tax{grid-template-columns:repeat(2,minmax(0,1fr))} }
@media (max-width: 520px){ .tax{grid-template-columns:minmax(0,1fr)} }
.tax .cell{border:1px solid var(--border);border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:8px}
.tax .cell.hl{border-color:color-mix(in srgb, var(--axi-brand) 45%, var(--border));background:color-mix(in srgb, var(--axi-brand) 4%, var(--background))}
.tax h3{font-size:15px;font-weight:600;margin:0;display:flex;gap:8px;align-items:center}
.tax p{margin:0;font-size:13px;line-height:1.5;color:var(--muted-foreground)}
.tax code{font-size:12px}
.rules{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 24px}
@media (max-width: 760px){ .rules{grid-template-columns:minmax(0,1fr)} }
.rules div{font-size:13.5px;line-height:1.55}
.rules b{display:block;font-weight:600;margin-bottom:2px}
code{font-family:"Geist Mono",ui-monospace,monospace;font-size:12.5px;background:var(--secondary);padding:1px 5px;border-radius:6px}
.diff{display:flex;flex-direction:column;gap:0}
.diff .li{display:grid;grid-template-columns:110px minmax(0,1fr);gap:12px;padding:10px 0;border-top:1px solid var(--border-soft);font-size:13.5px;line-height:1.5}
.diff .li:first-child{border-top:0}
.diff .li .where{font-family:"Geist Mono",ui-monospace,monospace;font-size:12px;color:var(--muted-foreground)}
@media (max-width: 560px){ .diff .li{grid-template-columns:minmax(0,1fr);gap:2px} }
.dur{display:grid;grid-template-columns:90px minmax(0,1fr) 44px;gap:10px;align-items:center;font-size:13px}
.dur .track{height:8px;border-radius:99px;background:var(--secondary);position:relative;overflow:hidden}
.dur .fillb{position:absolute;inset:0 auto 0 0;border-radius:99px}
"""

# ----------------------------------------------------------------------------- escenarios del probador
SCENARIOS = [
    # (key, dot, qué es, de dónde sale, etiqueta del botón)
    ("save", "success", "Guardar con promesa", "Nuevo · <code>notify.promise</code> en el «Guardar» del contacto", "Guardar"),
    ("success", "success", "«Contacto eliminado»", "crm · <code>showAlert({ tone: \"success\" })</code> · 147 llamadas del tono", "Probar"),
    ("split", "success", "«Tarea encolada: el agente la ejecutará en breve»", "crm · 47 caracteres: se parte en cabeza y cuerpo", "Probar"),
    ("error", "error", "Error del servidor en el título", "<code>title: errorMessage(err)</code> · 191 llamadas lo hacen", "Probar"),
    ("warning", "warning", "«Falta confirmar el PIN del número»", "channels · <code>tone: \"warning\"</code>", "Probar"),
    ("info", "info", "«Provisión iniciada»", "platform · con descripción", "Probar"),
    ("action", "action", "Alerta en tiempo real con «Ver»", "analytics · <code>actions: [{ label: \"Ver\" }]</code> · no se cierra sola", "Probar"),
    ("burst", "loading", "Éxito, error y advertencia seguidos", "Hoy el segundo borra al primero; prueba las tres opciones de abajo", "Probar"),
]


def view_live() -> str:
    rows = "".join(
        f"""<div class="scn"><span class="dotc d-{dot}"></span><span class="q">{q}</span>
        <span class="src">{src}</span>{btn(label, "", "outline sm", f'data-scn="{k}" id="scn-{k}"')}</div>"""
        for k, dot, q, src, label in SCENARIOS
    )
    return f"""<div class="page">
      {K.crumb("CRM", "Contactos", "Laura Gómez")}
      <div class="header"><div><h1>Laura Gómez</h1><p class="lead">Probador en vivo: sileo 0.1.5 real con la capa de adaptación propuesta. Cambia el tema arriba para ver la píldora invertida.</p></div>
        <div class="right">{badge("WhatsApp", "ok")}{badge("Lead caliente", "violet")}</div></div>
      <div class="grid2">
        <div class="stack">
          <section class="card">
            <div class="card-head"><div><h2>Datos del contacto</h2><p class="lead">El «Guardar» dispara <code>notify.promise</code>: la píldora nace en «Guardando…» y se transforma en el resultado, sin un segundo aviso.</p></div></div>
            <div class="form2">
              {K.field("Nombre", K.input("Laura Gómez", fid="f-name"), fid="f-name")}
              {K.field("Teléfono", K.input("+57 310 555 0142", fid="f-phone"), fid="f-phone")}
              {K.field("Correo", K.input("laura@savage.co", fid="f-mail"), fid="f-mail")}
              {K.field("Etapa", K.select("Propuesta enviada", fid="f-stage"), fid="f-stage")}
              <div class="actions-end">{btn("Cancelar", "", "outline")}{btn("Guardar", "check", "", 'data-scn="save" id="btn-save"')}</div>
            </div>
          </section>
          <section class="card">
            <div class="card-head"><div><h2>Cómo se traduce la llamada</h2><p class="lead">El módulo sigue llamando a <code>showAlert</code>; el adaptador decide píldora, cuerpo y duración. Último aviso disparado:</p></div></div>
            <pre class="map" id="map"><span class="k">// dispara un escenario para ver la traducción</span></pre>
          </section>
        </div>
        <div class="stack">
          <section class="card">
            <div class="card-head"><div><h2>Dispara un aviso</h2><p class="lead">Copy real del código de hoy.</p></div></div>
            <div style="margin-top:6px">{rows}</div>
          </section>
          <section class="card">
            <div class="card-head"><div><h2>Variantes a decidir</h2><p class="lead">Lo recomendado viene marcado.</p></div></div>
            <div class="stack" style="margin-top:12px;gap:14px">
              <div class="opt"><label id="lbl-pos">Posición</label>
                <div class="seg2" role="radiogroup" aria-labelledby="lbl-pos" data-opt="position">
                  <button role="radio" aria-checked="true" data-val="top-center" id="pos-top">Arriba al centro · recomendado</button>
                  <button role="radio" aria-checked="false" data-val="bottom-right" id="pos-br">Abajo a la derecha</button>
                </div></div>
              <div class="opt"><label id="lbl-mode">Material de la píldora</label>
                <div class="seg2" role="radiogroup" aria-labelledby="lbl-mode" data-opt="mode">
                  <button role="radio" aria-checked="true" data-val="ink" id="mode-ink">Tinta invertida · recomendado</button>
                  <button role="radio" aria-checked="false" data-val="surface" id="mode-surface">Superficie del tema</button>
                </div></div>
              <div class="opt"><label id="lbl-stack">Varios avisos seguidos</label>
                <div class="seg2" role="radiogroup" aria-labelledby="lbl-stack" data-opt="stack">
                  <button role="radio" aria-checked="false" data-val="slot" id="stk-slot">Una ranura</button>
                  <button role="radio" aria-checked="true" data-val="errors" id="stk-err">Apilar errores y avisos · recomendado</button>
                  <button role="radio" aria-checked="false" data-val="stack" id="stk-all">Apilar todo</button>
                </div></div>
              <p class="small muted" style="margin:0">Una ranura es lo nativo de sileo: el aviso nuevo se transforma sobre el anterior. Recomendado: los éxitos e infos se transforman entre sí, pero un error o una advertencia nunca se pisan.</p>
              <p class="small muted" style="margin:0">Tinta = la píldora usa el color del texto (oscura en claro, clara en oscuro), como la Dynamic Island. Superficie = blanca en claro; sobre fondos claros se apoya solo en la sombra.</p>
            </div>
          </section>
        </div>
      </div>
    </div>"""


def screen(inner: str, cls: str = "", label: str = "") -> str:
    return f"""<div class="screen {cls}" role="img" aria-label="{label}">
      <div class="hdr">{ic("panel-left", size=16)}<span>CRM › Contactos</span><span style="margin-left:auto">{ic("bell", size=16)}</span></div>
      <div class="body">{K.skeleton("40%", "18px")}{K.skeleton("100%", "64px")}{K.skeleton("100%", "64px")}{K.skeleton("70%", "14px")}</div>
      {inner}
    </div>"""


OLD_STATUS = f"""<div class="old-status"><span class="disc">{ic("circle-alert", size=20)}</span>
  <div><b>El teléfono +57 310 555 0142 ya pertenece a otro contacto de este tenant</b><span>Revisa los datos e inténtalo de nuevo.</span></div>
  <span class="x" aria-hidden="true">{ic("x", size=16)}</span></div>"""
OLD_FLOAT = f"""<div class="old-float"><b>Rol actualizado correctamente en el sistema de permisos</b><span class="muted small">Los cambios aplican al próximo inicio de sesión.</span><span class="x">{ic("x", size=16)}</span></div>"""
NEW_PILL = f"""<div class="pill-demo"><div class="h"><span class="bd" style="background:color-mix(in srgb, var(--t-error) 22%, transparent);color:var(--t-error)">{ic("circle-alert", size=15)}</span><span class="t" style="color:var(--t-error)">No se pudo completar</span></div>
  <p>El teléfono +57 310 555 0142 ya pertenece a otro contacto de este tenant. Revisa los datos e inténtalo de nuevo.</p></div>"""


def view_before_after() -> str:
    return f"""<div class="page">
      <div class="header"><div><p class="eyebrow">Hoy vs propuesta</p><h1>Antes y después</h1>
        <p class="lede">Hoy conviven <b>dos</b> avisos flotantes: la banda de cristal de <code>useAlert()</code> (384 llamadas) y el <code>FloatingAlert</code> legado de 10 páginas de catálogo y ajustes. La propuesta deja <b>uno</b>: la píldora de sileo, detrás del mismo <code>showAlert</code>.</p></div>
        <div class="right">{btn("Verlo en vivo", "play", "sm", 'data-scn="error" id="ba-live"')}</div></div>
      <div class="before-after">
        <section class="card">
          <div class="card-head"><div><h2>{ic("history", size=18)} Hoy: <code>StatusAlert</code> vía <code>showAlert</code></h2></div></div>
          <div style="margin-top:14px">{screen(OLD_STATUS, "", "Réplica del aviso actual: banda de 672 px arriba al centro")}</div>
          <p class="cap">{ic("ruler", size=14)} Réplica de <code>notice.tsx</code>: <code>w-2xl</code> fijo (672 px), título de 16 px en una línea que se parte en tres.</p>
        </section>
        <section class="card">
          <div class="card-head"><div><h2>{ic("sparkles", size=18)} Propuesta: píldora de sileo</h2></div></div>
          <div style="margin-top:14px">{screen(NEW_PILL, "", "La misma alerta como píldora de sileo")}</div>
          <p class="cap">{ic("ruler", size=14)} 360 px como máximo; la píldora dice qué pasó y el cuerpo explica. Se expande al pasar el ratón y se descarta deslizando.</p>
        </section>
        <section class="card">
          <div class="card-head"><div><h2>{ic("smartphone", size=18)} Hoy en un teléfono</h2></div></div>
          <div class="row" style="margin-top:14px;gap:16px;align-items:flex-start">
            {screen(OLD_STATUS, "phone", "En 300 px de ancho la banda se sale por los dos lados")}
            <p class="cap" style="flex:1;min-width:180px">{ic("triangle-alert", size=14)} <span><code>w-2xl</code> sin tope: en un teléfono la banda mide más que la pantalla y se corta por los dos lados. Lo sufren <code>/configurar</code> (sin login, móvil) y el panel.</span></p>
          </div>
        </section>
        <section class="card">
          <div class="card-head"><div><h2>{ic("history", size=18)} Hoy: <code>FloatingAlert</code> legado</h2></div></div>
          <div style="margin-top:14px">{screen(OLD_FLOAT, "", "FloatingAlert arriba a la derecha con el título cortado")}</div>
          <p class="cap">{ic("ruler", size=14)} Arriba a la derecha y a 50 px, otra receta, otro tamaño; el título se corta con «…» (<code>line-clamp-1</code>) y un error nunca se cierra solo.</p>
        </section>
      </div>
      <div class="grid2">
        <section class="card"><div class="card-head"><div><h2>Qué falla hoy</h2></div></div>
          <ul class="problems" style="margin-top:12px">
            <li>{ic("circle-x", size=16)}<span><b>Un aviso a la vez.</b> <code>setAlert(a)</code> reemplaza: si un guardado y un error llegan juntos, el primero desaparece sin leerse.</span></li>
            <li>{ic("circle-x", size=16)}<span><b>El error va en el título.</b> 191 llamadas ponen <code>errorMessage(err)</code> como título; la frase larga del servidor se pinta a 16 px semibold.</span></li>
            <li>{ic("circle-x", size=16)}<span><b>Dos recetas visuales</b> (<code>StatusAlert</code> y <code>FloatingAlert</code>) con posiciones, radios y duraciones distintas.</span></li>
            <li>{ic("circle-x", size=16)}<span><b>Tres avisos «en línea» que en realidad flotan.</b> «Solo lectura» y «Pausado» de Formularios y el error de la Agenda usan <code>StatusAlert</code>, cuya caja es <code>fixed top-4 z-[9999]</code>: tapan la vista en vez de vivir en ella.</span></li>
            <li>{ic("circle-x", size=16)}<span><b>Botón de cerrar en inglés</b> (<code>aria-label="Dismiss"</code>).</span></li>
          </ul></section>
        <section class="card"><div class="card-head"><div><h2>Qué gana la propuesta</h2></div></div>
          <ul class="problems good" style="margin-top:12px">
            <li>{ic("circle-check", size=16)}<span><b>Ningún error se pierde</b>: los éxitos se transforman uno en otro (la ranura de sileo) y los errores y advertencias se apilan con su propio reloj.</span></li>
            <li>{ic("circle-check", size=16)}<span><b>Píldora + cuerpo</b>: el título corto dice qué pasó; el detalle del servidor baja al cuerpo sin tocar las 384 llamadas.</span></li>
            <li>{ic("circle-check", size=16)}<span><b>Promesa en un aviso</b>: «Guardando…» se transforma en «Guardado» o en el error.</span></li>
            <li>{ic("circle-check", size=16)}<span><b>Deslizar para descartar, hover que expande, <code>aria-live</code></b> y movimiento anulado con <code>prefers-reduced-motion</code>, de serie.</span></li>
            <li>{ic("circle-check", size=16)}<span><b>Un solo sitio</b>: ningún módulo importa <code>sileo</code>; todo pasa por <code>core/notifications</code>.</span></li>
          </ul></section>
      </div>
    </div>"""


MODULES = [("platform", 112), ("crm", 77), ("marketing", 35), ("prospecting", 33), ("scheduling", 18), ("agents", 15),
           ("channels", 12), ("inbox", 10), ("companies", 10), ("orders", 7), ("billing", 7), ("otros 10 módulos + rutas", 48)]


def view_where() -> str:
    mx = max(n for _, n in MODULES)
    mod_rows = "".join(
        f'<tr><td>{m}</td><td style="width:45%"><div class="bar" style="width:{n / mx * 100:.0f}%"></div></td><td class="n">{n}</td></tr>'
        for m, n in MODULES
    )
    surfaces = [
        ("Todo aviso de <code>useAlert().showAlert</code>", "Panel, <code>/platform</code>, <code>/configurar</code>, <code>/comenzar</code>: el provider vive en el layout raíz", "384 llamadas · 118 archivos", "auto", "Cambia solo"),
        ("<code>FloatingAlert</code> legado", "Ajustes › Roles y Usuarios; Catálogo › Productos, Tipos, Catálogos, Categorías (crear/editar)", "10 páginas", "mig", "Se migra a <code>showAlert</code>"),
        ("<code>StatusAlert</code> usado como aviso en línea", "Formularios («Solo lectura», «Pausado») y Agenda (error al cargar la empresa)", "3 sitios", "mig", "Pasa a <code>Alert</code> en línea"),
        ("Guardados largos", "Formularios de <code>DynamicForm</code> y sheets cuyo «Guardar» tarda (sync de catálogo, plantillas Meta, provisión)", "opt-in", "new", "<code>notify.promise</code>"),
        ("Alertas en tiempo real con acción", "Analítica: «Nueva alerta…» y evaluación crítica con «Ver»", "2 llamadas", "auto", "Píldora con botón, sin cierre automático"),
        ("Confirmaciones <code>showModal</code>", "Eliminar, descartar cambios, desconectar canal", "32 llamadas", "keep", "No cambia: una decisión no es un aviso"),
        ("Avisos en línea <code>Alert</code> y banners", "Callouts de ajustes, banner de prueba/facturación, errores de carga en la vista", "—", "keep", "No cambia"),
    ]
    surf_rows = "".join(
        f'<tr><td><b style="font-weight:500">{a}</b><div class="small muted" style="margin-top:2px">{b}</div></td><td class="n">{c}</td><td><span class="chip {k}">{t}</span></td></tr>'
        for a, b, c, k, t in surfaces
    )
    return f"""<div class="page">
      <div class="header"><div><p class="eyebrow">Alcance</p><h1>Dónde cambia</h1>
        <p class="lede">El cambio es <b>de una sola pieza</b>: el <code>AlertProvider</code> deja de pintar <code>StatusAlert</code> y monta el <code>Toaster</code>. Las 384 llamadas de los módulos no se tocan; lo que sí se toca a mano son 13 sitios que se saltaban el sistema.</p></div></div>
      <section class="card"><div class="card-head"><div><h2>Superficies</h2></div></div>
        <div class="table-wrap" style="margin-top:8px"><table class="t"><thead><tr><th>Qué</th><th style="text-align:right">Tamaño</th><th>Qué le pasa</th></tr></thead><tbody>{surf_rows}</tbody></table></div>
      </section>
      <div class="grid2">
        <section class="card"><div class="card-head"><div><h2>Avisos por módulo</h2><p class="lead">Llamadas a <code>showAlert</code>. Todas cambian de aspecto sin editarse.</p></div></div>
          <div class="table-wrap" style="margin-top:8px"><table class="t"><tbody>{mod_rows}</tbody></table></div></section>
        <section class="card"><div class="card-head"><div><h2>Tonos en uso</h2><p class="lead">Dentro de <code>showAlert</code>.</p></div></div>
          <div class="table-wrap" style="margin-top:8px"><table class="t"><tbody>
            <tr><td><span class="row"><span class="dotc d-error"></span>error</span></td><td class="n">216</td><td class="small muted">191 con el error del servidor como título</td></tr>
            <tr><td><span class="row"><span class="dotc d-success"></span>success</span></td><td class="n">147</td><td class="small muted">«Contacto eliminado», «Secuencia guardada»</td></tr>
            <tr><td><span class="row"><span class="dotc d-warning"></span>warning</span></td><td class="n">11</td><td class="small muted">validación, estado de canal</td></tr>
            <tr><td><span class="row"><span class="dotc d-info"></span>info</span></td><td class="n">7</td><td class="small muted">procesos iniciados</td></tr>
          </tbody></table></div>
          <p class="small muted" style="margin:12px 0 0">Títulos: mediana 20 caracteres, p90 36, máximo 150. La píldora admite 34: el 90 % entra tal cual; el resto se parte (cabeza — cola) o toma el título por tono.</p></section>
      </div>
      <section class="card"><div class="card-head"><div><h2>Arquitectura</h2><p class="lead">Mismo patrón que <code>LAYERS</code> y <code>motion.ts</code>: una fuente única.</p></div></div>
        <pre class="map" style="margin-top:12px"><span class="k">src/core/notifications/</span>
  notify.ts          <span class="k">// API única: notify.success/error/warning/info/promise/dismiss — envuelve sileo</span>
  to-options.ts      <span class="k">// showAlert → SileoOptions: tono, cabeza/cola, duración, botón (probado con jest)</span>
  toaster.tsx        <span class="k">// &lt;Toaster&gt; con fill leído de --toast-fill y tema de next-themes</span>
<span class="k">src/core/providers/alert-provider.tsx</span>
  showAlert(a)  →  notify.fromAlert(a)     <span class="k">// contrato intacto, identidad estable (useCallback)</span>
<span class="k">src/app/globals.css</span>
  --toast-*          <span class="k">// capa 1: tintas por píldora; [data-sileo-*] solo aquí</span>
<span class="k">eslint</span>  no-restricted-imports: "sileo" fuera de core/notifications
<span class="k">borrar</span>  shared/components/ui/floating-alert.tsx · StatusAlert flotante de notice.tsx</pre>
        <p class="small muted" style="margin:12px 0 0">Dependencias: sileo 0.1.5 (MIT, 150 KB sin comprimir) trae <code>motion ^12.34</code>, que a su vez trae <code>framer-motion</code>. Hoy tenemos <code>framer-motion ^12.23</code>: se sube a <code>^12.34</code> en el mismo commit para no cargar dos copias.</p>
      </section>
    </div>"""


def view_ds() -> str:
    durations = [("success", "Éxito", 4, "var(--axi-success)"), ("info", "Info", 5, "var(--axi-info)"),
                 ("warning", "Atención", 7, "var(--axi-warning)"), ("error", "Error", 8, "var(--axi-destructive)")]
    dur_rows = "".join(
        f'<div class="dur"><span>{lbl}</span><span class="track"><span class="fillb" style="width:{s / 8 * 100:.0f}%;background:{c}"></span></span><span class="tnum muted">{s} s</span></div>'
        for _, lbl, s, c in durations
    )
    stale = [
        ("§1", "Las clases manuales <code>.bg-background</code>/<code>.text-foreground</code> ya no existen: se quita la «deuda»."),
        ("§2.1", "<code>--color-destructive</code> ya apunta a <code>--axi-destructive</code>: se quita la nota de deuda."),
        ("§2.3", "<code>core/styles/gradients.ts</code> ya se borró: la nota de «deprecado» pasa a historia."),
        ("§3.1", "El <code>!important</code> de los headings y la carga de Geist Sans ya se retiraron."),
        ("§4.1", "Los radios de marca ya están re-mapeados en <code>@theme</code>: sobra el «estado actual»."),
        ("§4.4", "La capa <code>alert</code> (9999) pasa a ser del <code>Toaster</code>; <code>FloatingAlert</code> desaparece."),
        ("§5.2", "<code>FloatingAlert</code> sale de la columna de cristal: la píldora es tinta, no glass (ver abajo)."),
        ("§8", "<code>ThemeToggle</code> ya existe (header, sidebar, sitio, platform): deja de estar «a crear»."),
        ("§9", "«Confirmación / alerta → <code>useAlert()</code>» se parte en dos filas: aviso = <code>showAlert</code>/<code>notify</code>, decisión = <code>showModal</code>."),
        ("§9.4 nuevo", "«Avisos y notificaciones»: taxonomía, anatomía, copy, duraciones, tintas y accesibilidad (esta vista)."),
        ("§11", "Checklist: «¿el aviso usa <code>showAlert</code>/<code>notify</code> y no un componente propio?»."),
        ("DESIGN §5.1", "La lista de glass pierde «alerts flotantes» y gana la excepción de la tinta, con su motivo."),
    ]
    stale_rows = "".join(f'<div class="li"><span class="where">{w}</span><span>{t}</span></div>' for w, t in stale)
    return f"""<div class="page">
      <div class="header"><div><p class="eyebrow">DESIGN-SYSTEM §9.4 · propuesta</p><h1>Avisos y notificaciones</h1>
        <p class="lede">Lo que queda escrito para que ningún módulo vuelva a inventar su aviso. <b>Cuatro formas de hablarle al usuario</b>, y cada mensaje tiene exactamente una.</p></div></div>
      <div class="tax">
        <div class="cell hl"><h3>{ic("bell-ring", size=16)} Aviso (toast)</h3><p>Algo <b>pasó</b> como consecuencia de una acción o de un evento, y la persona puede seguir trabajando. Efímero.</p><p><code>showAlert</code> · <code>notify.*</code></p></div>
        <div class="cell"><h3>{ic("message-square-warning", size=16)} Aviso en línea</h3><p>Un <b>estado</b> de la vista que dura mientras dure: solo lectura, pausado, error al cargar. Vive en el flujo, no flota.</p><p><code>Alert</code> (<code>ui/alert.tsx</code>)</p></div>
        <div class="cell"><h3>{ic("square-stack", size=16)} Confirmación</h3><p>Hace falta una <b>decisión</b> antes de seguir: eliminar, descartar, desconectar. Bloquea.</p><p><code>showModal</code></p></div>
        <div class="cell"><h3>{ic("panel-top", size=16)} Banner</h3><p>Un estado de la <b>cuenta</b> que afecta a todo el panel: prueba, pago pendiente. Persistente, bajo el header.</p><p>banners del shell</p></div>
      </div>
      <div class="grid2">
        <section class="card"><div class="card-head"><div><h2>Reglas del aviso</h2></div></div>
          <div class="rules" style="margin-top:12px">
            <div><b>Píldora ≤ 34 caracteres</b>Qué pasó, en pasado o en estado: «Contacto guardado», «No se pudo guardar». Sin punto final. Mayúscula solo inicial (sileo capitaliza cada palabra: se anula).</div>
            <div><b>El detalle va al cuerpo</b>Por qué y qué hacer: «Revisa el QR e inténtalo de nuevo». El mensaje del servidor (<code>errorMessage</code>) es cuerpo, nunca píldora.</div>
            <div><b>Un botón como mucho</b>Verbo concreto («Ver», «Deshacer», «Reintentar»). Con botón, el aviso no se cierra solo.</div>
            <div><b>Nunca para confirmar</b>Si hace falta decidir, es <code>showModal</code>. Si el estado dura, es <code>Alert</code> en línea.</div>
            <div><b>Promesa para esperas</b>Si la acción tarda más de ~1 s, <code>notify.promise</code>: un solo aviso que cambia de estado, nunca «Guardando» + «Guardado».</div>
            <div><b>Anatomía de la píldora</b>40 px de alto; icono de 24 px concéntrico con el extremo (8 px reales por los cuatro lados); título a ~16 px del borde derecho; cuerpo con 16 px. El padding del header es 14 px / 4 px porque el filtro «gooey» se come ~6 px del extremo y sileo ya suma 10 px a la derecha: compensa, no es arbitrario.</div>
            <div><b>Una ranura, salvo los errores</b>Un éxito nuevo se transforma sobre el anterior (lo nativo de sileo). Errores y advertencias llevan id propio y se apilan: nunca se pisan.</div>
            <div><b>Nada de avisos por cargar</b>Un GET que carga la vista no avisa si sale bien; si falla, la vista pinta su estado de error (§9) y el aviso es opcional.</div>
          </div></section>
        <section class="card"><div class="card-head"><div><h2>Duración por tono</h2><p class="lead">Más lectura, más tiempo. El hover pausa.</p></div></div>
          <div class="stack" style="margin-top:14px;gap:10px">{dur_rows}
            <div class="dur"><span>Con botón</span><span class="track"><span class="fillb" style="width:100%;background:repeating-linear-gradient(90deg,var(--axi-brand) 0 6px,transparent 6px 10px)"></span></span><span class="tnum muted">∞</span></div>
          </div></section>
      </div>
      <div class="grid2">
        <section class="card"><div class="card-head"><div><h2>Material: tinta invertida</h2><p class="lead">La única superficie flotante que no es glass, y por qué.</p></div></div>
          <p class="small" style="line-height:1.6;margin:12px 0 0">La píldora es una forma SVG que se deforma (el «gooey» de sileo): no admite <code>backdrop-filter</code> ni borde. Se pinta con el color del texto (<code>--toast-fill: var(--foreground)</code>) y las tintas de estado del tema contrario, así que conmuta con <code>.dark</code> sin variantes. Es el lenguaje de la Dynamic Island: un aviso es un evento, no una superficie donde trabajar.</p>
          <div class="table-wrap" style="margin-top:12px"><table class="t"><thead><tr><th>Tinta</th><th>Píldora oscura (tema claro)</th><th>Píldora clara (tema oscuro)</th></tr></thead><tbody>
            <tr><td>Éxito</td><td class="mono">#4ADE80 · 10,3:1</td><td class="mono">#166534 · 6,1:1</td></tr>
            <tr><td>Error</td><td class="mono">#F87171 · 6,5:1</td><td class="mono">#B91C1C · 5,5:1</td></tr>
            <tr><td>Atención</td><td class="mono">#FBBF24 · 10,7:1</td><td class="mono">#92400E · 6,1:1</td></tr>
            <tr><td>Info</td><td class="mono">#60A5FA · 7,1:1</td><td class="mono">#1D4ED8 · 5,7:1</td></tr>
            <tr><td>Acción (coral)</td><td class="mono">#FB7185 · 6,7:1</td><td class="mono">#BE3437 · 4,8:1</td></tr>
            <tr><td>Cuerpo</td><td class="mono">texto al 72 % · 8,4:1</td><td class="mono">texto al 72 % · 6,6:1</td></tr>
          </tbody></table></div>
          <p class="small muted" style="margin:10px 0 0">Los valores por defecto de sileo no pasan AA en la píldora clara (cuerpo al 50 % = 3,3:1) y el verde/ámbar de nuestra paleta clara tampoco (2,8:1 y 2,7:1). Por eso las tintas son tokens propios de capa 1.</p></section>
        <section class="card"><div class="card-head"><div><h2>Accesibilidad y movimiento</h2></div></div>
          <div class="rules" style="margin-top:12px;grid-template-columns:minmax(0,1fr)">
            <div><b>Región viva</b>sileo anuncia con <code>aria-live="polite"</code>. Un error no interrumpe al lector de pantalla: por eso un error que exige actuar ya no es aviso, es confirmación o aviso en línea.</div>
            <div><b>Movimiento</b>Muelle en CSS (<code>linear()</code>, 600 ms), corre en el compositor como pide §6 para lo que debe sobrevivir a cargas. Con <code>prefers-reduced-motion</code> sileo pone las duraciones a 0.</div>
            <div><b>Capa</b><code>LAYERS.alert</code> (9999) pasa al viewport de sileo: siempre por encima de modales y sheets.</div>
            <div><b>Tipografía</b>Poppins 600 a 13 px en la píldora, 13 px en el cuerpo; nada de Nexa: un aviso no es un titular.</div>
          </div></section>
      </div>
      <section class="card"><div class="card-head"><div><h2>Qué se corrige del Design System</h2><p class="lead">Verificado contra el código de <code>main</code> (<code>b48c8ba</code>): la mitad de las «deudas» que el documento anuncia ya están pagadas.</p></div></div>
        <div class="diff" style="margin-top:8px">{stale_rows}</div></section>
    </div>"""


# ----------------------------------------------------------------------------- JS del probador
LIVE_JS = r"""
(function(){
  var host=document.createElement('div'); document.body.appendChild(host);
  var bar=document.querySelector('.mk-bar');
  AxiToast.mount(host);
  function off(){ AxiToast.configure({offsetTop:(bar?bar.offsetHeight:0)+12}); }
  off(); addEventListener('resize',off);
  var map=document.getElementById('map');
  function esc(s){return String(s).replace(/[&<>]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c]})}
  function show(call, a){
    var o=AxiToast.toOptions(a);
    var btnDesc=o.button?'{ title: '+JSON.stringify(o.button.title)+' }':'—';
    map.innerHTML='<span class="k">// el módulo llama</span>\n'+esc(call)+'\n\n<span class="k">// el adaptador entrega a sileo.'+(a.tone==='neutral'?'info':a.tone)+'()</span>\n'+
      'title:       '+esc(JSON.stringify(o.title))+'\ndescription: '+esc(o.description?JSON.stringify(o.description):'—')+
      '\nduration:    '+(o.duration===null?'null <span class="k">// con botón no se cierra sola</span>':o.duration+' ms')+'\nbutton:      '+esc(btnDesc);
    AxiToast.showAlert(a);
  }
  var S={
    success:function(){show('showAlert({ tone: "success", title: "Contacto eliminado" })',{tone:'success',title:'Contacto eliminado'})},
    split:function(){show('showAlert({ tone: "success", title: "Tarea encolada: el agente la ejecutará en breve" })',{tone:'success',title:'Tarea encolada: el agente la ejecutará en breve'})},
    error:function(){show('showAlert({ tone: "error", title: errorMessage(err, "No se pudo guardar") })\n<span class="k">// errorMessage devolvió el mensaje del servidor:</span>\n<span class="k">// "El teléfono +57 310 555 0142 ya pertenece a otro contacto de este tenant"</span>',{tone:'error',title:'El teléfono +57 310 555 0142 ya pertenece a otro contacto de este tenant'})},
    warning:function(){show('showAlert({ tone: "warning", title: "Falta confirmar el PIN del número",\n  description: "Escríbelo en el panel de WhatsApp para terminar el alta." })',{tone:'warning',title:'Falta confirmar el PIN del número',description:'Escríbelo en el panel de WhatsApp para terminar el alta.'})},
    info:function(){show('showAlert({ tone: "info", title: "Provisión iniciada",\n  description: "El estado se actualiza automáticamente cada 3 segundos." })',{tone:'info',title:'Provisión iniciada',description:'El estado se actualiza automáticamente cada 3 segundos.'})},
    action:function(){show('showAlert({ tone: "error", title: "Nueva alerta: tiempo de respuesta",\n  actions: [{ label: "Ver", onClick: () => goToTab("alertas") }] })',{tone:'error',title:'Nueva alerta: tiempo de respuesta',description:'La mediana pasó de 2 min en la última hora.',actions:[{label:'Ver',onClick:function(){AxiToast.clear()}}]})},
    burst:function(){
      S.success(); setTimeout(function(){S.error()},450); setTimeout(function(){S.warning()},900);
    },
    save:function(){
      map.innerHTML='<span class="k">// el «Guardar» del formulario</span>\nnotify.promise(saveContact(values), {\n  loading: { title: "Guardando contacto" },\n  success: { title: "Contacto guardado" },\n  error:   (err) => ({ title: "No se pudo guardar", description: errorMessage(err) }),\n})';
      var ok=Math.random()>.3;
      AxiToast.promise(new Promise(function(res,rej){setTimeout(function(){ok?res():rej(new Error('El correo laura@savage.co ya está en otro contacto'))},1600)}),{
        loading:{title:'Guardando contacto'},
        success:{title:'Contacto guardado',description:'Laura Gómez · Propuesta enviada'},
        error:function(e){return {title:'No se pudo guardar',description:e.message+'. Revisa el correo e inténtalo de nuevo.'}}
      }).catch(function(){});
    }
  };
  document.addEventListener('click',function(e){
    var b=e.target.closest('[data-scn]'); if(b){ e.preventDefault(); S[b.dataset.scn](); return; }
    var r=e.target.closest('.seg2 [role=radio]'); if(r){
      var g=r.parentElement; g.querySelectorAll('[role=radio]').forEach(function(x){x.setAttribute('aria-checked',String(x===r))});
      var o={}; o[g.dataset.opt]=r.dataset.val; AxiToast.configure(o);
    }
  });
})();
"""


def build() -> None:
    views = [
        ("vivo", "1 · Probador en vivo", view_live(), "sileo real + adaptador propuesto. Dispara los escenarios, cambia el tema, la posición y el material; pasa el ratón por la píldora para expandirla y deslízala para descartarla."),
        ("antes", "2 · Antes y después", view_before_after(), "Réplicas fieles de StatusAlert (notice.tsx) y FloatingAlert frente a la píldora."),
        ("donde", "3 · Dónde cambia", view_where(), "Inventario medido sobre main b48c8ba: 384 llamadas a showAlert que cambian solas y 13 sitios que se tocan a mano."),
        ("ds", "4 · Design System", view_ds(), "La sección §9.4 propuesta y las correcciones del DESIGN-SYSTEM desactualizado."),
    ]
    K.build_html("Notificaciones con sileo", "Mockup F0 · no es producto", "Avisos flotantes de la plataforma", views)
    out = S / f"{K.name}.html"
    doc = out.read_text()
    bundle = BUNDLE.read_text().replace("</script", "<\\/script")
    doc = doc.replace("</style>", CSS + "\n</style>", 1)
    doc = doc.replace("</body>", f"<script>{bundle}</script>\n<script>{LIVE_JS}</script>\n</body>", 1)
    out.write_text(doc)
    print(f"{out.name}: {out.stat().st_size // 1024} KB con sileo incrustado")


if __name__ == "__main__":
    build()
