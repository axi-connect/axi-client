#!/usr/bin/env python3
"""Ensambla el mockup navegable de F4 del programa «Seguimiento autónomo»
(acción masiva tras captar o importar + secuencias) en un solo HTML
autocontenido.

Sistema visual: se REUTILIZA el del mockup de F2 (`agent-tasks-schedule.html`),
leyendo su bloque <style> tal cual y añadiendo debajo solo lo propio de F4. Es
deliberado: los dos mockups describen la misma pantalla del producto y una
paleta que derive entre ellos convertiría el gate visual en una comparación de
mockups en vez de una revisión del flujo.

Iconos: se extraen de node_modules/lucide-react y se cachean en
agent-tasks-bulk.lucide.json para regenerar el HTML sin node_modules.
"""
import json, pathlib, re, sys

S = pathlib.Path(__file__).parent
ROOT = S.parent.parent.parent
BASE = S / "agent-tasks-schedule.html"
ICON_CACHE = S / "agent-tasks-bulk.lucide.json"
ICONS = [
    "sparkles", "message-square", "phone-call", "phone", "clock", "check", "chevron-down",
    "chevron-right", "calendar-days", "info", "triangle-alert", "plus", "circle-user",
    "history", "pencil", "send", "circle-x", "refresh-cw", "search", "users", "settings",
    "sun", "moon", "x", "circle-check", "star", "file-text", "external-link", "arrow-right",
    "zap", "hourglass", "sliders-horizontal", "circle-dollar-sign", "wand-sparkles",
    "layers", "repeat", "timer", "user-minus", "gauge", "shield-check", "upload", "play",
    "trash-2", "download", "funnel", "user-round-x", "split", "list-checks", "ban",
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

def base_css():
    if not BASE.exists():
        sys.exit(f"falta el mockup de F2 ({BASE.name}): de ahí sale el sistema visual")
    return re.search(r"<style>(.*?)</style>", BASE.read_text(), re.S).group(1)

EXTRA_CSS = """
/* ─────────── F4: acción masiva ─────────── */
.entry{display:grid;gap:12px;margin-bottom:28px}
.entry>h3{font-size:13px;font-weight:600;color:var(--muted-fg);text-transform:uppercase;letter-spacing:.06em}
.entry>h3 span{text-transform:none;letter-spacing:0;font-weight:500;margin-left:8px}
.selbar{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:8px 12px;border:1px solid var(--border);border-bottom:0;border-radius:var(--r-lg) var(--r-lg) 0 0;background:var(--secondary);font-size:12.5px}
.selbar b{font-variant-numeric:tabular-nums}
.selbar .btns{display:flex;gap:8px;margin-left:auto;flex-wrap:wrap}
.selbar .all{color:var(--axi-brand);font-weight:500}
.flat{margin-top:0;border-top-left-radius:0;border-top-right-radius:0}
.done-banner{display:flex;flex-wrap:wrap;gap:14px;align-items:flex-start;padding:16px 18px;border-radius:var(--r-lg);border:1px solid color-mix(in srgb,var(--axi-success) 35%,transparent);background:color-mix(in srgb,var(--axi-success) 6%,transparent)}
.done-banner .ic-big{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:color-mix(in srgb,var(--axi-success) 16%,transparent);color:var(--axi-success);flex:none}
.done-banner .txt{min-width:220px;flex:1}
.done-banner h4{font-size:15px;font-weight:600}
.done-banner p{margin:3px 0 0;font-size:12.5px;color:var(--muted-fg);line-height:1.5}
.done-banner .btns{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.counts{display:flex;flex-wrap:wrap;gap:20px;padding:14px 0}
.counts div{display:grid;gap:2px}
.counts b{font-size:20px;font-weight:600;font-variant-numeric:tabular-nums}
.counts span{font-size:12px;color:var(--muted-fg)}
.counts .dim b{color:var(--muted-fg)}
/* Reparto en el tiempo */
.rate{display:grid;gap:10px;padding:12px 14px;border-radius:var(--r-md);background:var(--secondary)}
.rate-row{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end}
.rate .bar{position:relative;height:28px;border-radius:var(--r-sm);background:var(--background);border:1px solid var(--border);overflow:hidden;display:flex}
.rate .bar i{display:block;height:100%;border-right:1px solid var(--background)}
.rate .bar i.d1{background:color-mix(in srgb,var(--axi-violet) 55%,transparent)}
.rate .bar i.d2{background:color-mix(in srgb,var(--axi-violet) 30%,transparent)}
.rate .bar i.quiet{background:repeating-linear-gradient(45deg,var(--muted) 0 6px,transparent 6px 12px)}
.rate .legend{display:flex;flex-wrap:wrap;gap:14px;font-size:11.5px;color:var(--muted-fg)}
.rate .legend span{display:inline-flex;align-items:center;gap:5px}
.rate .legend i{width:9px;height:9px;border-radius:2px;flex:none}
/* Exclusiones */
.excl{border:1px solid var(--border);border-radius:var(--r-md);overflow:hidden}
.excl>summary{list-style:none;cursor:pointer;display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:10px 14px;font-size:12.5px;background:var(--secondary)}
.excl>summary::-webkit-details-marker{display:none}
.excl>summary .ic{color:var(--muted-fg)}
.excl>summary b{font-variant-numeric:tabular-nums}
.excl[open]>summary .chev{transform:rotate(90deg)}
.excl .chev{transition:transform .2s;margin-left:auto}
.excl ul{margin:0;padding:6px 0;list-style:none}
.excl li{display:flex;flex-wrap:wrap;align-items:baseline;gap:10px;padding:8px 14px;font-size:12.5px}
.excl li b{font-variant-numeric:tabular-nums;min-width:26px;text-align:right}
.excl li .why{color:var(--muted-fg);font-size:12px}
.excl li .fix{margin-left:auto;color:var(--axi-brand);font-size:12px;font-weight:500}
/* Resultado del lote */
.tiles{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(150px,1fr))}
.tile{border:1px solid var(--border);border-radius:var(--r-lg);padding:14px 16px;display:grid;gap:3px}
.tile b{font-size:24px;font-weight:600;font-variant-numeric:tabular-nums}
.tile span{font-size:12px;color:var(--muted-fg)}
.tile.ok{border-color:color-mix(in srgb,var(--axi-success) 35%,transparent)}
.tile.ok b{color:var(--axi-success)}
/* ─────────── F4b: secuencias ─────────── */
.seq-card{border:1px solid var(--border);border-radius:var(--r-lg);padding:16px 18px;display:grid;gap:10px;background:var(--background)}
.seq-card .top{display:flex;flex-wrap:wrap;align-items:center;gap:10px}
.seq-card h3{font-size:14px;font-weight:600}
.seq-card .top .btns{margin-left:auto;display:flex;gap:6px}
.seq-flow{display:flex;flex-wrap:wrap;align-items:center;gap:6px;font-size:12px;color:var(--muted-fg)}
.seq-flow .node{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:999px;border:1px solid var(--border);background:var(--secondary)}
.seq-flow .node .ic{width:12px;height:12px;color:var(--axi-violet)}
.seq-flow .arr{color:var(--muted-fg);opacity:.6}
.seq-rules{display:flex;flex-wrap:wrap;gap:8px}
.rule{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;padding:2px 9px;border-radius:999px;border:1px solid color-mix(in srgb,var(--axi-info) 35%,transparent);background:color-mix(in srgb,var(--axi-info) 6%,transparent);color:var(--muted-fg)}
.rule .ic{width:12px;height:12px;color:var(--axi-info)}
/* Editor: pasos en vertical */
.steps-v{display:grid;gap:0;position:relative}
.step{display:grid;grid-template-columns:76px 1fr;gap:14px;padding:14px 0;position:relative}
.step+.step{border-top:1px dashed var(--border)}
.step .when{display:grid;gap:4px;justify-items:end;text-align:right;padding-top:2px}
.step .when b{font-size:12.5px;font-weight:600;white-space:nowrap}
.step .when span{font-size:11px;color:var(--muted-fg)}
.step .box{border:1px solid var(--border);border-radius:var(--r-md);padding:12px 14px;display:grid;gap:8px;background:var(--background)}
.step .box .hd{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.step .box .hd .btns{margin-left:auto;display:flex;gap:4px}
.step .obj{font-size:13px;line-height:1.5}
.step .meta{display:flex;flex-wrap:wrap;gap:8px;font-size:11.5px;color:var(--muted-fg)}
.add-step{display:flex;align-items:center;gap:8px;justify-content:center;padding:12px;border:1px dashed var(--border);border-radius:var(--r-md);color:var(--muted-fg);font-size:12.5px;font-weight:500;margin-top:14px}
/* Inscripciones */
.prog{display:inline-flex;align-items:center;gap:4px}
.prog i{width:7px;height:7px;border-radius:50%;background:var(--border);display:block}
.prog i.on{background:var(--axi-violet)}
.prog i.now{background:var(--axi-violet);box-shadow:0 0 0 3px color-mix(in srgb,var(--axi-violet) 22%,transparent)}
.seq-rules .opt{flex:1;min-width:250px}
@media (max-width:720px){
  .cat{grid-template-columns:1fr}
}
@media (max-width:640px){
  .step{grid-template-columns:1fr}
  .step .when{justify-items:start;text-align:left}
  .steps{grid-template-columns:1fr}
  .counts{gap:14px}
  .wrap{padding:16px}
}
"""

# ───────────────────────────── piezas compartidas ─────────────────────────────

def crm_header(active):
    """Cabecera del CRM (CrmNav): pastilla de secciones, no pestañas de vista."""
    tabs = [("users", "Contactos", "contacts"), ("split", "Pipeline", "pipeline"),
            ("list-checks", "Tareas", "tasks"), ("settings", "Ajustes", "settings")]
    items = "".join(
        f'<li><a class="seg-item" href="#"{" aria-current=\"page\"" if key == active else ""}>'
        f'{ic(icon)}{label}</a></li>' for icon, label, key in tabs)
    return ('<header class="crm-header"><div class="row"><h1>CRM</h1>'
            '<nav class="seg" data-size="default" data-surface="raised" aria-label="Secciones del CRM">'
            f'<span class="seg-pill" data-pill></span><ul class="seg-list">{items}</ul></nav>'
            '</div></header>')

def badge(text, tone="", icon=None):
    body = ic(icon, size=12) if icon else "<i></i>"
    return f'<span class="badge {tone}">{body}{text}</span>'

def notice(text, tone="info", icon="info", extra=""):
    return f'<div class="notice {tone}">{ic(icon)}<span>{text}</span>{extra}</div>'

def medium_pill(kind):
    return {
        "message": f'<span class="pill-medium">{ic("message-square")}mensaje</span>',
        "call": f'<span class="pill-medium">{ic("phone-call")}llamada</span>',
        "both": f'<span class="pill-medium">{ic("phone")}llamada y si no, mensaje</span>',
    }[kind]

# ───────────────────────────── V1 · dónde aparece ─────────────────────────────

def view_entradas():
    """Los tres puntos donde hoy el camino se corta: promover, importar y el
    segmento. En los tres el producto termina diciendo «ya está» y deja al
    operador sin el siguiente paso."""
    leads_rows = "".join(
        f'<tr><td><span class="checkbox on">{ic("check", size=12)}</span></td>'
        f'<td><b>{name}</b><div class="why">{co}</div></td><td class="muted">{city}</td>'
        f'<td>{badge(state, tone)}</td></tr>'
        for name, co, city, state, tone in [
            ("Hotel Sierra Nevada", "hoteles · 34 habitaciones", "Santa Marta", "Con datos", "success"),
            ("Boutique Malecón", "retail · moda", "Cartagena", "Con datos", "success"),
            ("Café de la Loma", "restaurantes", "Medellín", "Con datos", "success"),
        ])

    promover = f"""
    <div class="entry">
      <h3>1 · Captación <span>después de promover leads al CRM</span></h3>
      <div class="selbar">
        <span class="checkbox on">{ic("check", size=12)}</span>
        <b>12</b> seleccionados
        <span class="btns">
          <button class="btn btn-outline">{ic("wand-sparkles")}Buscar datos de 8</button>
          <button class="btn btn-primary">{ic("shield-check")}Promover 12 al CRM</button>
        </span>
      </div>
      <table class="tbl flat"><thead><tr><th></th><th>Lead</th><th>Ciudad</th><th>Estado</th></tr></thead>
        <tbody>{leads_rows}</tbody></table>
      <div class="done-banner">
        <span class="ic-big">{ic("circle-check", size=19)}</span>
        <div class="txt">
          <h4>12 leads promovidos al CRM</h4>
          <p>Ya son contactos tuyos. Todavía no les hemos escrito: promover declara la base
             legal y crea el contacto — escribirle es otra decisión, y es tuya.</p>
        </div>
        <span class="btns">
          <button class="btn btn-outline">{ic("external-link")}Ver en el CRM</button>
          <button class="btn btn-primary">{ic("sparkles")}Poner al agente a trabajar con los 12</button>
        </span>
      </div>
    </div>"""

    importado = f"""
    <div class="entry">
      <h3>2 · Import terminado <span>/crm/settings/imports</span></h3>
      <div class="card">
        <div class="top" style="display:flex;flex-wrap:wrap;align-items:center;gap:10px">
          <h3 style="margin:0">{ic("file-text")} contactos-septiembre.csv</h3>
          {badge("Completado", "success")}
          <span class="muted" style="margin-left:auto;font-size:12px">hace 2 minutos</span>
        </div>
        <div class="counts">
          <div><b>300</b><span>filas</span></div>
          <div><b>268</b><span>creados</span></div>
          <div><b>24</b><span>actualizados</span></div>
          <div class="dim"><b>5</b><span>saltados</span></div>
          <div class="dim"><b>3</b><span>con error</span></div>
        </div>
        <div class="done-banner">
          <span class="ic-big">{ic("upload", size=18)}</span>
          <div class="txt">
            <h4>268 contactos nuevos, sin una sola conversación</h4>
            <p>Es el momento exacto en que un CRM se queda en agenda: la lista entró y nadie
               la trabaja. El agente puede abrir la conversación con cada uno, repartido en el
               tiempo para no quemar el número.</p>
            <label style="display:inline-flex;align-items:center;gap:8px;margin-top:10px;font-size:12.5px">
              <span class="checkbox"></span> Incluir también los 24 actualizados
            </label>
          </div>
          <span class="btns">
            <button class="btn btn-outline">{ic("plus")}Nuevo import</button>
            <button class="btn btn-primary">{ic("sparkles")}Poner al agente a trabajar con los 268</button>
          </span>
        </div>
      </div>
    </div>"""

    contactos_rows = "".join(
        f'<tr><td><span class="checkbox{" on" if on else ""}">{ic("check", size=12) if on else ""}</span></td>'
        f'<td><b>{name}</b><div class="why">{last}</div></td><td class="muted">{stage}</td>'
        f'<td class="tnum">{score}</td></tr>'
        for name, last, stage, score, on in [
            ("Ana Gómez", "última conversación hace 97 días", "Cliente", "72", True),
            ("Carlos Ruiz", "última conversación hace 104 días", "Cliente", "65", True),
            ("Marcela Peña", "última conversación hace 91 días", "Oportunidad", "58", True),
            ("Jorge Salas", "última conversación hace 120 días", "Cliente", "44", False),
        ])

    segmento = f"""
    <div class="entry">
      <h3>3 · Contactos y segmentos <span>selección en la lista, o el segmento entero</span></h3>
      <div class="selbar">
        <span class="checkbox on">{ic("check", size=12)}</span>
        <b>3</b> seleccionados ·
        <a href="#" class="all">Seleccionar los 143 que cumplen el filtro</a>
        <span class="btns">
          <button class="btn btn-outline">{ic("download")}Exportar</button>
          <button class="btn btn-primary">{ic("sparkles")}Programar seguimiento para 3</button>
        </span>
      </div>
      <table class="tbl flat"><thead><tr><th></th><th>Contacto</th><th>Etapa</th><th>Score</th></tr></thead>
        <tbody>{contactos_rows}</tbody></table>
      <div class="card" style="margin-top:16px">
        <div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px">
          <h3 style="margin:0">{ic("funnel", "violet")} Clientes inactivos 90 días</h3>
          <span class="badge">143 contactos</span>
          <span class="btns" style="margin-left:auto;display:flex;gap:8px">
            <button class="btn btn-outline">{ic("download")}Exportar</button>
            <button class="btn btn-primary">{ic("sparkles")}Poner al agente a trabajar con estos 143</button>
          </span>
        </div>
        <div class="info-line">{ic("info")}<span>El segmento se resuelve <b>al programar</b>, no ahora:
          si mañana entran seis contactos más al filtro, no reciben nada de este lote. Un segmento que
          se ejecuta solo cada vez que cambia es una secuencia, y eso se configura abajo.</span></div>
      </div>
    </div>"""

    return (crm_header("contacts") + '<div class="wrap">'
            '<div class="page-head"><div><h2>Dónde aparece la acción masiva</h2>'
            '<p class="muted" style="margin:4px 0 0;font-size:13px;max-width:60ch">Tres finales de camino que hoy '
            'terminan en «ya está»: promover leads, terminar un import y mirar un segmento. '
            'El mismo modal en los tres.</p></div></div>'
            f'<div style="margin-top:20px">{promover}{importado}{segmento}</div></div>')

# ──────────────────────── V2 · el modal de acción masiva ────────────────────────

def medium_options(active):
    opts = [
        ("message", "message-square", "Mensaje", "Por WhatsApp, con el agente de siempre."),
        ("call", "phone-call", "Llamada", "El agente llama y conversa por voz."),
        ("both", "phone", "Llamada y si no, mensaje",
         "Llama; si no conecta, sigue por mensaje sin perder el objetivo."),
    ]
    return "".join(
        f'<button class="opt" role="radio" aria-checked="{"true" if key == active else "false"}" '
        f'data-medium-opt="{key}">{ic(icon)}<b>{label}</b><small>{dsc}</small></button>'
        for key, icon, label, dsc in opts)

def view_lote():
    """El modal es el mismo de F2 con el contacto sustituido por «N contactos»,
    más las dos cosas que solo existen en lote: el REPARTO en el tiempo y el
    recuento de a quién no se le va a escribir (y por qué)."""
    exclusiones = f"""
    <details class="excl">
      <summary>{ic("user-round-x")}<b>32</b> de 300 no van a recibir nada — mira por qué
        {ic("chevron-right", "chev")}</summary>
      <ul>
        <li><b>18</b> se dieron de baja de comunicaciones comerciales
            <span class="why">Es una obligación legal, no una preferencia.</span></li>
        <li><b>9</b> ya tienen un seguimiento del agente abierto
            <span class="why">Una tarea por contacto: tres mensajes encolados al mismo cliente son acoso.</span>
            <a href="#" class="fix">Ver las 9</a></li>
        <li><b>5</b> no tienen WhatsApp ni teléfono
            <span class="why">Sin canal no hay a dónde escribir.</span>
            <a href="#" class="fix">Completar datos</a></li>
      </ul>
    </details>"""

    reparto = f"""
    <div class="field">
      <span class="lab">Cuándo empieza y a qué ritmo</span>
      <div class="rate">
        <div class="rate-row">
          <div class="field" style="flex:1;min-width:150px">
            <span class="hint">Empieza</span>
            <span class="control">{ic("calendar-days")}<span class="grow">jue 18 sept · 9:00</span></span>
          </div>
          <div class="field" style="flex:1;min-width:150px">
            <span class="hint">Ritmo</span>
            <span class="control">{ic("gauge")}<span class="grow">20 por hora</span>{ic("chevron-down")}</span>
          </div>
          <div class="field" style="flex:1.4;min-width:190px">
            <span class="hint">Termina</span>
            <span class="control locked">{ic("timer")}<span class="grow">vie 19 sept · 11:00</span></span>
          </div>
        </div>
        <div class="bar" aria-hidden="true">
          <i class="d1" style="width:31%"></i><i class="quiet" style="width:28%"></i>
          <i class="d2" style="width:29%"></i><i class="quiet" style="width:12%"></i>
        </div>
        <div class="legend">
          <span><i style="background:color-mix(in srgb,var(--axi-violet) 55%,transparent)"></i>jueves · 200</span>
          <span><i style="background:color-mix(in srgb,var(--axi-violet) 30%,transparent)"></i>viernes · 68</span>
          <span><i style="background:var(--muted)"></i>horario silencioso y noche</span>
        </div>
      </div>
      {notice('Tu cupo diario son <b>200 tareas</b>, así que el lote cruza a la mañana siguiente. '
              'El agente no se lo salta: lo que sobra sale el viernes desde las 8:00.', 'warn', 'triangle-alert')}
      {notice('El ritmo no es decoración. Meta limita a cuántos destinatarios nuevos puedes escribir en 24 h '
              'y mide tu calidad; mandar 268 aperturas de golpe es la forma más rápida de que te bajen el límite.',
              'info', 'info')}
    </div>"""

    ventana = f"""
    <div class="field" data-when-medium="message both">
      <span class="lab">Cómo abre la conversación</span>
      {notice('<b>214 de los 268</b> llevan más de 24 h sin escribirte: a esos Meta solo deja entrar con una '
              'plantilla aprobada. Los otros 54 reciben el mensaje normal del agente.', 'info', 'info')}
      <div class="field">
        <span class="hint">Plantilla de apertura</span>
        <span class="control">{ic("send")}<span class="grow">seguimiento_v1 · utility · es</span>{ic("chevron-down")}</span>
      </div>
      <div class="field">
        <span class="hint">Tema (la variable {{{{2}}}} de la plantilla)</span>
        <span class="control"><span class="grow">tu pedido de septiembre</span></span>
      </div>
      <div class="preview">
        <div class="from">{ic("message-square", size=12)} Así le llega a Ana Gómez</div>
        <div class="bubble">Hola <b class="violet">Ana</b>, te escribo por <b class="violet">tu pedido de
          septiembre</b>. ¿Seguimos?</div>
      </div>
      {notice('Las variables las rellenamos con los datos del contacto y el tema que escribiste — '
              '<b>nunca con texto del modelo</b>. El agente entra cuando el cliente responde.', 'info', 'info',
              extra='<span class="cost">214 × US$0,0008 ≈ <b>US$0,17</b></span>')}
    </div>"""

    llamada = f"""
    <div class="field" data-when-medium="call both" hidden>
      <span class="lab">Llamadas</span>
      {notice('268 llamadas a 20 por hora son <b>13 horas de línea</b>. Tu cupo de llamadas del agente '
              'son 20 al día, así que este lote tardaría dos semanas en salir entero.', 'warn', 'triangle-alert')}
      {notice('Para un lote grande, «llamada y si no, mensaje» reparte mejor: llama a quien puede atender '
              'y escribe al resto el mismo día.', 'info', 'info')}
    </div>"""

    return f"""
    <div class="wrap modal-wrap">
      <div class="modal">
        <div class="modal-h">
          <h2>{ic("sparkles", "violet", 19)} Seguimiento para 268 contactos</h2>
          <p>Del import <b>contactos-septiembre.csv</b> · hace 2 minutos</p>
        </div>
        <div class="modal-b">
          <div class="field">
            <span class="lab">Agente</span>
            <span class="control">{ic("sparkles", "violet")}<span class="grow">Axi · asesora comercial</span>{ic("chevron-down")}</span>
          </div>
          <div class="field">
            <span class="lab">Cómo contacta</span>
            <div class="cat" role="radiogroup" aria-label="Cómo contacta">{medium_options("message")}</div>
          </div>
          <div class="field">
            <span class="lab">Objetivo</span>
            <textarea class="control" style="height:74px;padding:10px 12px;resize:none;line-height:1.5"
              >Presentarnos, preguntar qué necesita y ofrecerle una cita si le interesa</textarea>
            <span class="hint">Una meta en tus palabras, no un guion. El agente redacta con su tono y tu catálogo.</span>
            <div class="ex-chips">
              <button class="ex">Reactivar a quien no compra hace 3 meses</button>
              <button class="ex">Confirmar interés y agendar</button>
            </div>
          </div>
          {reparto}
          {exclusiones}
          {ventana}
          {llamada}
        </div>
        <div class="modal-f">
          <p class="promise">{ic("sparkles")}<span>El agente escribirá a <b>268 contactos</b> desde el
            <b>jueves 18 a las 9:00</b>, a <b>20 por hora</b>. Puedes pararlo entero mientras no haya salido.</span></p>
          <span class="btns">
            <button class="btn btn-ghost">Cancelar</button>
            <button class="btn btn-primary">{ic("sparkles")}Programar 268 seguimientos</button>
          </span>
        </div>
      </div>
    </div>"""

# ──────────────────────────── V3 · resultado del lote ────────────────────────────

def view_resultado():
    saltadas = "".join(
        f'<tr><td class="tnum"><b>{n}</b></td><td>{razon}<div class="why">{why}</div></td>'
        f'<td><a href="#" class="fix" style="color:var(--axi-brand);font-weight:500">{accion}</a></td></tr>'
        for n, razon, why, accion in [
            ("18", "Se dieron de baja", "No se les puede escribir nada comercial.", "Ver la lista"),
            ("9", "Ya tenían un seguimiento abierto", "El que estaba sigue su curso.", "Ver esas tareas"),
            ("5", "Sin WhatsApp ni teléfono", "Entraron al CRM sin canal de contacto.", "Completar datos"),
        ])
    return (crm_header("tasks") + f"""
    <div class="wrap narrow">
      <div class="done-banner" style="margin-bottom:20px">
        <span class="ic-big">{ic("circle-check", size=19)}</span>
        <div class="txt">
          <h4>268 seguimientos programados</h4>
          <p>Empiezan el jueves 18 a las 9:00 y se reparten a 20 por hora. Nada ha salido todavía.</p>
        </div>
        <span class="btns">
          <button class="btn btn-outline">{ic("trash-2")}Cancelar el lote</button>
          <button class="btn btn-primary">{ic("calendar-days")}Ver en Programados</button>
        </span>
      </div>
      <div class="tiles">
        <div class="tile ok"><b>268</b><span>programadas</span></div>
        <div class="tile"><b>32</b><span>no entraron</span></div>
        <div class="tile"><b>214</b><span>abrirán con plantilla</span></div>
        <div class="tile"><b>US$0,17</b><span>costo estimado de Meta</span></div>
      </div>
      <h3 style="margin:24px 0 0;font-size:14px">Los 32 que no entraron</h3>
      <table class="tbl"><thead><tr><th>N.º</th><th>Motivo</th><th>Qué puedes hacer</th></tr></thead>
        <tbody>{saltadas}</tbody></table>
      <div class="card" style="margin-top:20px">
        <div class="info-line">{ic("info")}<span>Esto es una <b>foto de ahora</b>. Cada tarea vuelve a
          comprobar la baja, el horario silencioso y el cupo justo antes de ejecutarse: si alguien se da de
          baja el miércoles, el jueves no recibe nada aunque esté en este lote.</span></div>
        <div class="info-line">{ic("triangle-alert")}<span><b>«Cancelar el lote»</b> solo existe mientras no
          haya salido nada. En cuanto el primer mensaje se envía, lo que se cancela son las tareas que
          quedan — lo enviado no se recoge.</span></div>
      </div>
    </div>""")

# ─────────────────────────── V4 · secuencias (lista) ───────────────────────────

def seq_flow(steps):
    nodes = []
    for i, (icon, label) in enumerate(steps):
        if i:
            nodes.append(f'<span class="arr">{ic("arrow-right", size=13)}</span>')
        nodes.append(f'<span class="node">{ic(icon)}{label}</span>')
    return f'<div class="seq-flow">{"".join(nodes)}</div>'

def view_secuencias():
    """Una secuencia NO es un motor nuevo: materializa tareas de agente normales,
    una por paso. Por eso hereda horario silencioso, cupo, opt-out y el rail de
    ejecuciones sin escribir nada de eso otra vez."""
    activas = f"""
    <div class="seq-card">
      <div class="top">
        <h3>{ic("layers", "violet")} Post-captación</h3>
        {badge("Activa", "success")}
        <span class="btns">
          <button class="btn btn-outline btn-icon" aria-label="Editar">{ic("pencil")}</button>
          <button class="btn btn-outline">{ic("users")}12 inscritos</button>
        </span>
      </div>
      {seq_flow([("message-square", "Día 0 · mensaje"), ("phone-call", "+2 días · llamada"),
                 ("message-square", "+5 días · mensaje")])}
      <div class="seq-rules">
        <span class="rule">{ic("circle-check")}Para si responde</span>
        <span class="rule">{ic("circle-dollar-sign")}Para si compra</span>
      </div>
    </div>
    <div class="seq-card">
      <div class="top">
        <h3>{ic("layers", "violet")} Reactivación de fríos</h3>
        {badge("Activa", "success")}
        <span class="btns">
          <button class="btn btn-outline btn-icon" aria-label="Editar">{ic("pencil")}</button>
          <button class="btn btn-outline">{ic("users")}45 inscritos</button>
        </span>
      </div>
      {seq_flow([("send", "Día 0 · plantilla"), ("message-square", "+4 días · mensaje"),
                 ("phone", "+10 días · llamada y si no, mensaje")])}
      <div class="seq-rules"><span class="rule">{ic("circle-check")}Para si responde</span></div>
    </div>
    <div class="seq-card">
      <div class="top">
        <h3>{ic("layers")} Post-import</h3>
        {badge("Borrador")}
        <span class="btns">
          <button class="btn btn-outline btn-icon" aria-label="Editar">{ic("pencil")}</button>
          <button class="btn btn-primary">{ic("play")}Activar</button>
        </span>
      </div>
      {seq_flow([("send", "Día 0 · plantilla"), ("message-square", "+3 días · mensaje")])}
      <div class="seq-rules"><span class="rule">{ic("circle-check")}Para si responde</span></div>
    </div>"""

    plantillas = "".join(
        f'<button class="sug"><b>{ic("wand-sparkles")}{t}</b><p>{d}</p>'
        f'<span class="badge">{p}</span></button>'
        for t, d, p in [
            ("Post-captación", "Para leads recién promovidos: presentarse, entender la necesidad y ofrecer cita.", "3 pasos"),
            ("Post-import", "Para una lista que entra de golpe: abrir con plantilla y retomar a los 3 días.", "2 pasos"),
            ("Reactivación de fríos", "Para clientes que llevan meses sin comprar: recordar, escuchar y llamar.", "3 pasos"),
        ])

    return (crm_header("settings") + f"""
    <div class="wrap narrow">
      <div class="page-head">
        <div><h2>Secuencias</h2>
          <p class="muted" style="margin:4px 0 0;font-size:13px;max-width:62ch">Varios contactos seguidos en el
            tiempo, con un solo objetivo por paso. Se detienen solas cuando el cliente responde — que es lo
            único que las separa de mandar tres mensajes seguidos.</p></div>
        <button class="btn btn-primary">{ic("plus")}Nueva secuencia</button>
      </div>
      <div class="cards" style="margin-top:20px">{activas}</div>
      <h3 style="margin:28px 0 12px;font-size:14px">Empieza por una de estas</h3>
      <div class="cat">{plantillas}</div>
      <div class="card" style="margin-top:20px">
        <div class="info-line">{ic("info")}<span>Cada paso es una <b>tarea de agente normal</b>: respeta el
          horario silencioso, el cupo diario, la baja y la ventana de 24 h, y deja su rail de intentos.
          Una secuencia no es un canal nuevo — es la misma tarea, tres veces, con memoria.</span></div>
      </div>
    </div>""")

# ─────────────────────────── V5 · editor de secuencia ───────────────────────────

def view_editor():
    pasos = []
    for when, sub, icon, label, obj, extra in [
        ("Día 0", "al inscribir", "send", "Plantilla de apertura",
         "Presentarnos, preguntar qué necesita y ofrecer una cita si le interesa",
         'seguimiento_v1 · utility · es'),
        ("+2 días", "jue 9:00", "phone-call", "Llamada",
         "Preguntar si revisó lo que le enviamos y resolver dudas por voz", None),
        ("+5 días", "dom 9:00", "phone", "Llamada y si no, mensaje",
         "Último intento: ofrecer una cita concreta o cerrar la conversación con elegancia", None),
    ]:
        meta = f'<span class="pill-medium">{ic("send")}{extra}</span>' if extra else ""
        pasos.append(f"""
        <div class="step">
          <div class="when"><b>{when}</b><span>{sub}</span></div>
          <div class="box">
            <div class="hd">{ic(icon, "violet")}<b style="font-size:13px;font-weight:600">{label}</b>
              <span class="btns">
                <button class="btn btn-ghost btn-icon" aria-label="Editar paso">{ic("pencil")}</button>
                <button class="btn btn-ghost btn-icon" aria-label="Quitar paso">{ic("trash-2")}</button>
              </span>
            </div>
            <p class="obj" style="margin:0">{obj}</p>
            <div class="meta">{meta}</div>
          </div>
        </div>""")

    return (crm_header("settings") + f"""
    <div class="wrap narrow">
      <div class="page-head">
        <div><h2>Post-captación</h2>
          <p class="muted" style="margin:4px 0 0;font-size:13px">3 pasos · 12 inscritos ahora mismo</p></div>
        <span style="display:flex;gap:8px">
          <button class="btn btn-outline">Cancelar</button>
          <button class="btn btn-primary">{ic("check")}Guardar secuencia</button>
        </span>
      </div>

      <div class="card" style="margin-top:20px">
        <h3>Cuándo se detiene sola</h3>
        <div class="seq-rules">
          <label class="opt" style="grid-template-columns:auto 1fr;cursor:pointer" aria-checked="true" role="checkbox">
            {ic("circle-check")}<b>Para si responde</b>
            <small>En cuanto el cliente escribe o contesta la llamada, los pasos que quedan se cancelan.</small>
          </label>
          <label class="opt" style="grid-template-columns:auto 1fr;cursor:pointer" aria-checked="true" role="checkbox">
            {ic("circle-dollar-sign")}<b>Para si compra</b>
            <small>Un pedido pagado o una oportunidad ganada cierran la secuencia como cumplida.</small>
          </label>
        </div>
        <div class="info-line">{ic("triangle-alert")}<span>Sin ninguna de las dos, la secuencia sigue
          escribiendo a quien ya te contestó. <b>Es la diferencia entre un seguimiento y un acoso</b>, así que
          las dos vienen activadas.</span></div>
      </div>

      <h3 style="margin:24px 0 4px;font-size:14px">Los pasos</h3>
      <div class="steps-v">{"".join(pasos)}</div>
      <button class="add-step">{ic("plus")}Añadir paso</button>

      <div class="card" style="margin-top:20px">
        <div class="info-line">{ic("info")}<span>Los días son <b>desde la inscripción</b>, no fechas fijas:
          quien entre hoy recibirá el último paso el <b>martes 23</b>; quien entre mañana, el miércoles 24.
          La hora la pone tu horario de trabajo — un paso que caiga a las 3 a. m. sale a las 8:00.</span></div>
      </div>
    </div>""")

# ─────────────────────────── V6 · inscripciones ───────────────────────────

def view_inscripciones():
    def prog(done, total, stopped=False):
        dots = "".join(
            f'<i class="{"on" if i < done - 1 else "now" if i == done - 1 and not stopped else ""}"></i>'
            for i in range(total))
        return f'<span class="prog">{dots}</span>'

    filas = "".join(
        f'<tr><td><b>{name}</b><div class="why">{src}</div></td>'
        f'<td>{prog(step, 3, stop)}<div class="why">Paso {step} de 3</div></td>'
        f'<td class="muted">{nxt}</td><td>{badge(state, tone)}<div class="why">{why}</div></td></tr>'
        for name, src, step, nxt, state, tone, why, stop in [
            ("Ana Gómez", "inscrita al promover · hace 2 días", 2, "mañana 9:00", "Activa", "info", "Llamada pendiente", False),
            ("Carlos Ruiz", "inscrito al promover · hace 2 días", 1, "—", "Parada", "success", "Respondió el mismo día", True),
            ("Marcela Peña", "inscrita al promover · hace 4 días", 3, "hoy 9:00", "Activa", "info", "Último paso", False),
            ("Jorge Salas", "import de septiembre · hace 6 días", 3, "—", "Completada", "", "Los 3 pasos salieron, sin respuesta", True),
            ("Luisa Prada", "import de septiembre · hace 6 días", 1, "—", "Parada", "success", "Compró: oportunidad ganada", True),
        ])

    return (crm_header("settings") + f"""
    <div class="wrap narrow">
      <div class="page-head">
        <div><h2>Inscritos en «Post-captación»</h2>
          <p class="muted" style="margin:4px 0 0;font-size:13px">Quién va por dónde, y por qué se paró.</p></div>
        <button class="btn btn-outline">{ic("pencil")}Editar la secuencia</button>
      </div>
      <div class="chips" style="margin-top:12px">
        <span class="chip"><b>12</b> activas</span>
        <span class="chip"><b>18</b> paradas porque respondieron</span>
        <span class="chip"><b>3</b> paradas porque compraron</span>
        <span class="chip"><b>7</b> completadas sin respuesta</span>
      </div>
      <table class="tbl"><thead><tr><th>Contacto</th><th>Progreso</th><th>Próximo paso</th><th>Estado</th></tr></thead>
        <tbody>{filas}</tbody></table>
      <div class="card" style="margin-top:20px">
        <div class="info-line">{ic("info")}<span><b>Parada</b> no es un fallo: es la secuencia haciendo lo que
          prometió. Lo que hay que vigilar es «completada sin respuesta» — tres intentos y silencio suele
          querer decir que el objetivo del paso 1 no era interesante.</span></div>
      </div>
    </div>""")

# ───────────────────────────── ensamblado ─────────────────────────────

VIEWS = [
    ("entradas", "Dónde aparece", view_entradas),
    ("lote", "Programar en lote", view_lote),
    ("resultado", "Resultado", view_resultado),
    ("secuencias", "Secuencias", view_secuencias),
    ("editor", "Editor", view_editor),
    ("inscritos", "Inscritos", view_inscripciones),
]

def chrome():
    botones = "".join(
        f'<button data-view="{key}"{" aria-pressed=\"true\"" if i == 0 else " aria-pressed=\"false\""}>{label}</button>'
        for i, (key, label, _) in enumerate(VIEWS))
    medios = "".join(
        f'<button data-medium="{key}"{" aria-pressed=\"true\"" if key == "message" else " aria-pressed=\"false\""}>{label}</button>'
        for key, label in [("message", "Mensaje"), ("call", "Llamada"), ("both", "Llamada→mensaje")])
    return f"""
    <div class="mk-bar" role="toolbar" aria-label="Chrome del mockup">
      <span class="mk-tag">{ic("sparkles", "violet", 13)}F4 · acción masiva y secuencias</span>
      <div class="mk-grp">{botones}</div>
      <div class="mk-grp" id="mk-medium" hidden><b>Medio</b>{medios}</div>
      <button class="mk-theme" id="theme-btn">{ic("moon", "", 13)}<span id="theme-txt">Oscuro</span></button>
    </div>"""

SCRIPT = """
(function(){
  "use strict";
  var ACTIVE='[data-active="true"],[aria-current="page"],[data-state="active"]';
  function placePill(seg){var pill=seg.querySelector("[data-pill]"),a=seg.querySelector(ACTIVE);if(!pill)return;
    if(!a){pill.style.opacity="0";return}
    var pad=seg.getAttribute("data-size")==="sm"?2:4;
    pill.style.width=a.offsetWidth+"px";pill.style.height=a.offsetHeight+"px";pill.style.top=pad+"px";
    pill.style.left="0";pill.style.transform="translateX("+(a.offsetLeft-pad)+"px)";pill.style.opacity="1"}
  function placeAll(){document.querySelectorAll(".seg").forEach(placePill)}

  /* Vistas del mockup */
  function show(key){
    document.querySelectorAll("[data-view-panel]").forEach(function(p){p.hidden=p.getAttribute("data-view-panel")!==key});
    document.querySelectorAll(".mk-grp [data-view]").forEach(function(b){
      b.setAttribute("aria-pressed", String(b.getAttribute("data-view")===key))});
    document.getElementById("mk-medium").hidden = key!=="lote";
    window.scrollTo(0,0); placeAll();
  }
  document.querySelectorAll(".mk-grp [data-view]").forEach(function(b){
    b.addEventListener("click",function(){show(b.getAttribute("data-view"))})});

  /* Medio elegido en el lote: cambia qué bloques aplican y la promesa */
  function setMedium(m){
    document.querySelectorAll('[data-medium-opt]').forEach(function(o){
      o.setAttribute("aria-checked", String(o.getAttribute("data-medium-opt")===m))});
    document.querySelectorAll(".mk-grp [data-medium]").forEach(function(b){
      b.setAttribute("aria-pressed", String(b.getAttribute("data-medium")===m))});
    document.querySelectorAll("[data-when-medium]").forEach(function(el){
      el.hidden = el.getAttribute("data-when-medium").split(" ").indexOf(m)<0});
    var p=document.querySelector(".modal-f .promise span");
    if(p){p.innerHTML = m==="call"
      ? 'El agente <b>llamará a 268 contactos</b> desde el <b>jueves 18 a las 9:00</b>, a <b>20 por hora</b>. Puedes pararlo entero mientras no haya salido.'
      : m==="both"
      ? 'El agente <b>llamará a 268 contactos</b> desde el <b>jueves 18 a las 9:00</b> y, a quien no conteste, le escribirá. Puedes pararlo entero mientras no haya salido.'
      : 'El agente escribirá a <b>268 contactos</b> desde el <b>jueves 18 a las 9:00</b>, a <b>20 por hora</b>. Puedes pararlo entero mientras no haya salido.'}
  }
  document.querySelectorAll('[data-medium-opt]').forEach(function(o){
    o.addEventListener("click",function(){setMedium(o.getAttribute("data-medium-opt"))})});
  document.querySelectorAll(".mk-grp [data-medium]").forEach(function(b){
    b.addEventListener("click",function(){setMedium(b.getAttribute("data-medium"))})});

  /* Tema */
  var tb=document.getElementById("theme-btn");
  tb.addEventListener("click",function(){
    var dark=document.documentElement.getAttribute("data-theme")==="dark";
    document.documentElement.setAttribute("data-theme", dark?"light":"dark");
    document.getElementById("theme-txt").textContent = dark?"Oscuro":"Claro";
    placeAll();
  });

  window.addEventListener("resize", placeAll);
  placeAll();
})();
"""

def build():
    panels = "".join(
        f'<div data-view-panel="{key}"{"" if i == 0 else " hidden"}>{fn()}</div>'
        for i, (key, _, fn) in enumerate(VIEWS))
    html = (
        "<title>Trabajar la lista entera</title>\n"
        '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
        '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
        '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?'
        'family=Poppins:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap">\n'
        f"<style>{base_css()}{EXTRA_CSS}</style>\n"
        f"{chrome()}\n{panels}\n<script>{SCRIPT}</script>\n"
    )
    out = S / "agent-tasks-bulk.html"
    out.write_text(html, encoding="utf-8")
    print(f"{out.name}: {len(html) // 1024} KB · {len(VIEWS)} vistas")

if __name__ == "__main__":
    build()
