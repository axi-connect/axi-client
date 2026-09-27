"""P6 · Mi empresa › Documentos (F7): el editor de plantillas y el emisor."""
import sys
sys.path.insert(0, ".")
from kit import page, sidebar, topbar, ic, pm, write, canvas

OUT = "p6/project"

TYPES = [("contract", "Contrato", True), ("quote", "Cotización", False), ("proposal", "Propuesta", False),
         ("receipt", "Recibo", True), ("statement", "Estado de cuenta", False), ("cuenta_cobro", "Cuenta de cobro", False)]


def type_tabs(active="contract", compact=False):
    tabs = []
    for code, label, mine in TYPES:
        on = code == active
        # El punto dice «tu versión»; sin punto, el modelo de Axi.
        dot = f'<span class="dot" style="background:{"var(--onfg)" if on else "var(--info)"}"></span>' if mine else ""
        tabs.append(f'<button class="tab{" tab-on" if on else ""}" role="tab" aria-selected="{"true" if on else "false"}">{label}{dot}</button>')
    tabs.append('<span aria-hidden="true" style="width:1px;height:20px;align-self:center;background:var(--line2);margin:0 4px"></span>')
    tabs.append(f'<button class="tab{" tab-on" if active == "settings" else ""}" role="tab">{ic("building", 15)}Emisor y numeración</button>')
    tabs.append(f'<button class="tab{" tab-on" if active == "auto" else ""}" role="tab">{ic("zap", 15)}Automáticos</button>')
    return f'<div role="tablist" aria-label="Tipo de documento" class="seg" style="flex-wrap:nowrap">{"".join(tabs)}</div>'


def company_nav():
    return """<nav aria-label="Secciones de Mi empresa" class="seg">
        <a class="tab" href="#">General</a><a class="tab" href="#">Sucursales</a><a class="tab tab-on" href="#" aria-current="page">Documentos</a><a class="tab" href="#">Funciones</a>
      </nav>"""


# ─── La hoja ─────────────────────────────────────────────────────────────

def sheet(width=520, number="CTR-2026-0121", legal="JuanitoXpeditions S.A.S.", intro=True, bad_var=False, scale_font=1.0):
    f = lambda px: f"{px * scale_font:.1f}px"
    intro_txt = (
        f'Entre {legal} (la agencia) y Ana Gómez Rueda (el viajero) se celebra el presente contrato para la prestación de los servicios turísticos descritos a continuación.'
    )
    bad = (f'<p style="font-size:{f(8.5)};line-height:1.55;color:#3F3F46;margin-top:8px;padding:6px 8px;border:1px dashed #F87171;border-radius:4px;background:#FEF2F2">'
           'La vista previa espera: <b>{{cupo_restante}}</b> no existe en el contrato.</p>') if bad_var else ""
    return f"""<div class="sheet" style="width:{width}px;padding:{width*0.075:.0f}px {width*0.08:.0f}px;flex-shrink:0">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:10px;border-bottom:1.5px solid #E65759">
    <div style="display:flex;flex-direction:column;gap:6px"><span style="width:64px;height:17px;border-radius:4px;background:linear-gradient(90deg,#F2A93B,#E65759 55%,#7B5CF0)"></span><span style="font-size:{f(8)};color:#71717A">Contrato</span></div>
    <div style="text-align:right"><p class="m" style="font-size:{f(9.5)};font-weight:600;color:#18181B">{number}</p><p style="font-size:{f(7.5)};color:#71717A">26 de septiembre de 2026</p></div>
  </div>
  <p style="font-size:{f(13)};font-weight:700;margin-top:14px !important;letter-spacing:-.01em">Contrato de servicios turísticos {number}</p>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:10px;font-size:{f(8)};line-height:1.55;color:#3F3F46">
    <div><p style="font-size:{f(6.5)};letter-spacing:.1em;color:#E65759;font-weight:700">LA AGENCIA</p><p style="font-weight:700;color:#18181B">{legal}</p><p>NIT 901.234.567-8</p><p>Calle 93 # 11-27, oficina 402, Bogotá</p></div>
    <div><p style="font-size:{f(6.5)};letter-spacing:.1em;color:#E65759;font-weight:700">EL VIAJERO</p><p style="font-weight:700;color:#18181B">Ana Gómez Rueda</p><p>CC 1.020.456.789</p><p>+57 310 555 0199</p></div>
  </div>
  {f'<p style="font-size:{f(8.5)};line-height:1.6;color:#3F3F46;margin-top:10px">{intro_txt}</p>' if intro else ''}
  {bad}
  <div style="margin-top:10px;display:grid;grid-template-columns:auto 1fr;gap:3px 18px;font-size:{f(8.5)};color:#3F3F46"><b style="color:#18181B">Reserva</b><span>#0045</span><b style="color:#18181B">Fecha de salida</b><span>sábado 14 de noviembre de 2026</span><b style="color:#18181B">Viajeros</b><span>2</span></div>
  <div style="margin-top:12px;display:flex;flex-direction:column;gap:7px;font-size:{f(8.2)};line-height:1.55;color:#3F3F46">
    <div><b style="color:#18181B"><span style="color:#E65759">1.</span> Objeto</b><p>La agencia organiza y presta los servicios turísticos de la Expedición Cocuy para la salida del 14 de noviembre.</p></div>
    <div><b style="color:#18181B"><span style="color:#E65759">2.</span> Precio</b><p>El valor total es de $ 27.797.980 (US$ 7.000 a 3.971,14 COP por dólar), fijo desde la confirmación.</p></div>
    <div><b style="color:#18181B"><span style="color:#E65759">3.</span> Forma de pago</b><p>Un anticipo del 33 % y el saldo en dos cuotas; el saldo vence 30 días antes de la salida.</p></div>
  </div>
  <div style="margin-top:12px;border-top:1px solid #E4E4E7;font-size:{f(8)};color:#3F3F46">
    <div style="display:grid;grid-template-columns:1fr 40px 90px 90px;padding:6px 0;font-weight:700;color:#18181B;border-bottom:1px solid #E4E4E7"><span>Descripción</span><span>Cant.</span><span style="text-align:right">Precio unitario</span><span style="text-align:right">Total</span></div>
    <div style="display:grid;grid-template-columns:1fr 40px 90px 90px;padding:5px 0"><span>Expedición Cocuy · sáb 14 nov</span><span>2</span><span style="text-align:right">$ 13.898.990</span><span style="text-align:right">$ 27.797.980</span></div>
  </div>
</div>"""


def desk(inner, status='<span class="pill"><span class="dot dot-ok"></span>Al día</span>', note="con los datos de una reserva de ejemplo"):
    return f"""<article style="border-radius:24px;background:var(--desk);display:flex;flex-direction:column;min-width:0;min-height:0;overflow:hidden;border:1px solid var(--line)">
          <div style="display:flex;align-items:center;gap:10px;padding:14px 16px 0 20px">
            {status}<span style="font-size:12.5px;color:var(--mut)">{note}</span>
            <span style="flex-grow:1"></span>
            <button class="icb icb-sm" aria-label="Alejar">{ic('zoomout', 15)}</button><button class="icb icb-sm" aria-label="Acercar">{ic('zoomin', 15)}</button><button class="icb icb-sm" aria-label="Pantalla completa">{ic('expand', 15)}</button>
          </div>
          <div style="flex-grow:1;min-height:0;overflow:hidden;display:flex;justify-content:center;padding:18px 20px 0">{inner}</div>
        </article>"""


BLOCKS = [
    ("logo", "image", "Logo", "El isotipo del negocio, a la izquierda", []),
    ("title", "heading", "Título", 'Contrato de servicios turísticos <span class="tok">{{document_number}}</span>', ["lock"]),
    ("parties", "parties", "Partes", "La agencia · El viajero", ["lock"]),
    ("intro", "text", "Párrafo", 'Entre <span class="tok">{{company_legal_name}}</span> (la agencia) y…', []),
    ("summary", "list", "Datos en pares", "Reserva · Fecha de salida · Viajeros", []),
    ("clauses", "clauses", "Cláusulas", "4 cláusulas · Objeto, Precio, Forma de pago…", []),
    ("items", "table", "Tabla de ítems", "Descripción · Cant. · Precio unitario · Total", ["data"]),
    ("totals", "sigma", "Totales", "Total · Total en USD · Tasa aplicada", ["fx"]),
    ("plan", "calendar", "Plan de pagos", "N.º · Concepto · Vence · Valor · Pagado", ["data", "plan"]),
    ("closing", "text", "Párrafo", 'Para constancia se firma en <span class="tok">{{company_city}}</span>…', []),
    ("signatures", "sign", "Firmas", "Por la agencia · El viajero · con fecha", ["lock"]),
    ("footer", "footer", "Pie de página", "Se repite en cada página", ["repeat"]),
]

TAGS = {
    "lock": ("lock", "obligatorio"),
    "data": ("db", "filas desde los datos"),
    "plan": ("branch", "solo si hay plan de pagos"),
    "fx": ("branch", "con conversión si la hay"),
    "repeat": ("repeat", "en cada página"),
}


def tagline(tags):
    return "".join(f'<span class="tag">{ic(TAGS[t][0], 12, 1.9)}{TAGS[t][1]}</span>' for t in tags)


def block_row_static(i, b, open_=False, extra=""):
    bid, icon, name, summary, tags = b
    return f"""<li style="list-style:none;border-top:1px solid var(--line)">
      <div style="display:grid;grid-template-columns:22px 36px minmax(0,1fr) auto;gap:12px;align-items:center;padding:11px 0">
        <span class="m" style="font-size:11px;color:var(--mut);text-align:right">{i:02d}</span>
        <span class="cap">{ic(icon, 17)}</span>
        <span style="min-width:0;display:flex;flex-direction:column;gap:3px"><span style="font-size:14px;font-weight:600">{name}</span><span style="font-size:12.5px;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{summary}</span>{f'<span style="display:flex;gap:6px;flex-wrap:wrap;margin-top:3px">{tagline(tags)}</span>' if tags else ''}</span>
        <span style="display:flex;gap:2px;color:var(--mut)">{ic('up', 16)}{ic('down', 16)}</span>
      </div>{extra}
    </li>"""


def blocks_card(rows_html, head_pill, head_meta, count=12, dark=False):
    return f"""<article class="card" style="padding:20px 24px 0;display:flex;flex-direction:column;min-width:0;min-height:0;overflow:hidden">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding-bottom:14px">
            <div style="display:flex;flex-direction:column;gap:6px;min-width:0">
              <div style="display:flex;align-items:center;gap:10px"><span class="d" style="font-size:26px;font-weight:700;letter-spacing:-.02em;line-height:1.1">Contrato</span>{head_pill}</div>
              <span style="font-size:12.5px;color:var(--mut)">{head_meta}</span>
            </div>
            <button class="btn btn-g btn-sm" style="padding:0 10px;color:var(--fg2)">{ic('reset', 15)}Restablecer</button>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:8px"><span class="lbl">Los bloques, en el orden en que se imprimen</span><span class="lbl">{count}</span></div>
          <ul style="margin:0;padding:0;overflow:hidden;flex-grow:1;min-height:0">{rows_html}</ul>
        </article>"""


def shell(active_nav, crumbs, content, dark=False, dock=""):
    return f"""<div style="width:1440px;height:900px;display:flex;background:var(--bg);overflow:hidden;position:relative">
  {sidebar(active_nav, dark)}
  <main style="flex-grow:1;display:flex;flex-direction:column;min-width:0;min-height:0">
    {topbar(crumbs, dark)}
    <div style="padding:0 40px 28px;display:flex;flex-direction:column;gap:16px;flex-grow:1;min-height:0">
      <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:20px">
        <h1 class="d" style="margin:0;font-size:38px;font-weight:700;letter-spacing:-.02em;line-height:1.1">Mi empresa</h1>
        {company_nav()}
      </div>
      {content}
    </div>
  </main>
  {dock}
</div>"""


def dock(detail, save="Guardar plantilla", disabled=False, interactive=True):
    reset = ' onClick="{{reset}}"' if interactive else ""
    return f"""<footer class="isl isl-ink glow-brand" role="region" aria-label="Cambios sin guardar" style="position:absolute;left:calc(248px + (100% - 248px) / 2);bottom:20px;transform:translateX(-50%);border-radius:999px;padding:8px 8px 8px 24px;display:flex;align-items:center;gap:18px;white-space:nowrap;box-shadow:0 20px 50px -20px rgba(11,11,14,.55);z-index:5">
      <span style="display:flex;flex-direction:column;gap:1px"><span style="font-size:13.5px;font-weight:600">Cambios sin guardar</span><span style="font-size:12px;color:#A1A1AA">{detail}</span></span>
      <span style="display:flex;gap:6px"><button class="btn"{reset} style="background:transparent;color:#F4F4F5;border:1px solid rgba(255,255,255,.18)">Descartar</button><button class="btn btn-p"{' disabled' if disabled else ''}>{save}</button></span>
    </footer>"""


# ─── 1 · Editor (interactivo) ─────────────────────────────────────────────

def editor(dark=False, interactive=True):
    rows = []
    for i, b in enumerate(BLOCKS, 1):
        if b[0] == "intro" and interactive:
            head = block_row_static(i, b).replace('<li style="list-style:none;border-top:1px solid var(--line)">',
                                                   '<li style="list-style:none;border-top:1px solid var(--line)"><button onClick="{{toggleIntro}}" style="all:unset;display:block;width:100%;cursor:pointer" aria-expanded="{{introOpen}}">', 1)
            head = head.replace("</div>\n    </li>", "</div></button>\n    <sc-if value=\"{{introOpen}}\" hint-placeholder-val=\"{{true}}\">" + INTRO_EDITOR + "</sc-if>\n    </li>", 1)
            rows.append(head)
        else:
            rows.append(block_row_static(i, b))
    pill = '<span class="pill"><span class="dot dot-info"></span>Tu versión 3</span>'
    meta = "editada hace 2 días por Juanita"
    content = f"""{type_tabs()}
      <section style="display:grid;grid-template-columns:460px minmax(0,1fr);gap:16px;flex-grow:1;min-height:0">
        {blocks_card(''.join(rows), pill, meta, dark=dark)}
        {desk(sheet(580, scale_font=1.2))}
      </section>"""
    d = '<sc-if value="{{dirty}}" hint-placeholder-val="{{false}}">' + dock("Guardar crea tu versión 4; lo ya emitido conserva la suya") + "</sc-if>" if interactive else ""
    return shell("Mi empresa", ["Mi empresa", "Documentos", "Contrato"], content, dark, d)


INTRO_EDITOR = """<div style="margin:0 0 14px 70px;padding:14px;border-radius:16px;background:var(--soft);display:flex;flex-direction:column;gap:12px">
        <div class="field"><label>Texto</label><div class="input" style="display:block;height:auto;min-height:66px;padding:10px 14px;white-space:normal;font-size:13px;line-height:1.7">Entre&nbsp;<span class="tok">{{company_legal_name}}</span>&nbsp;(la agencia) y&nbsp;<span class="tok">{{contact_name}}</span>&nbsp;(el viajero) se celebra el presente contrato para la prestación de los servicios turísticos descritos a continuación.</div>
          <span style="display:flex;gap:6px;flex-wrap:wrap"><span class="tok">{{contact_document}}</span><span class="tok">{{order_number}}</span><span class="tok">{{service_date}}</span><span class="lbl" style="align-self:center">+ 14 variables</span></span></div>
        <div class="field"><label>Cuándo aparece</label>
          <span style="display:flex;gap:6px;flex-wrap:wrap"><sc-for list="{{whens}}" as="w" hint-placeholder-count="3"><button class="chip {{w.cls}}" aria-pressed="{{w.pressed}}" onClick="{{w.pick}}">{{w.label}}</button></sc-for></span>
          <span class="hint">{{whenHint}}</span></div>
      </div>"""

EDITOR_LOGIC = """class Component extends DCLogic {
  constructor(props) { super(props); this.state = { open: true, when: 'always' }; }
  renderVals() {
    const st = this.state;
    const opts = [['always', 'Siempre'], ['plan', 'Solo con plan de pagos'], ['single', 'Solo en pago único']];
    const hints = { always: 'Sale en todos los contratos.', plan: 'Solo en las reservas que se pagan en cuotas; en pago único desaparece.', single: 'Solo cuando la reserva se paga de una.' };
    return {
      introOpen: st.open,
      toggleIntro: () => this.setState({ open: !st.open }),
      whens: opts.map(([k, label]) => ({ label, cls: st.when === k ? 'chip-on' : '', pressed: st.when === k ? 'true' : 'false', pick: () => this.setState({ when: k }) })),
      whenHint: hints[st.when],
      dirty: st.when !== 'always',
      reset: () => this.setState({ when: 'always' })
    };
  }
}"""


# ─── 2 · Emisor y numeración (interactivo) ────────────────────────────────

NUMBERING = [
    ("contract", "Contrato", "CTR", 121, True),
    ("receipt", "Recibo", "REC", 20, True),
    ("statement", "Estado de cuenta", "EDC", 4, True),
    ("cuenta_cobro", "Cuenta de cobro", "CC", None, False),
    ("quote", "Cotización", "COT", None, False),
]


def emisor(dark=False, interactive=True):
    fields = [("Razón social", "JuanitoXpeditions S.A.S.", "Vacío: sale el nombre del negocio."),
              ("Etiqueta del NIT", "NIT", "Se imprime delante de 901.234.567-8."),
              ("Dirección", "Calle 93 # 11-27, oficina 402", "Vacío: la de Mi empresa."),
              ("Ciudad", '<span class="ph">Bogotá</span>', "Vacío: la de Mi empresa."),
              ("Teléfono", "+57 300 123 4567", "Sale en el pie y en «Partes»."),
              ("Correo", "reservas@juanitoxpeditions.co", "Sale en el pie y en «Partes».")]
    fhtml = "".join(f'<div class="field"><label>{l}</label><div class="input">{v}</div><span class="hint">{h}</span></div>' for l, v, h in fields)
    nrows = []
    for code, label, prefix, nxt, started in NUMBERING:
        if code == "cuenta_cobro" and interactive:
            num = f"""<span style="display:flex;align-items:center;gap:6px"><button class="icb icb-sm" aria-label="Uno menos" onClick="{{{{dec}}}}">−</button><span class="input m" style="width:76px;height:36px;justify-content:center;font-size:13px">{{{{ccNext}}}}</span><button class="icb icb-sm" aria-label="Uno más" onClick="{{{{inc}}}}">+</button></span>"""
            sample = '<span class="m" style="font-size:13px">CC-2026-{{ccPad}}</span>'
            hint = "Aún no sale el primero: fija desde dónde cuenta."
        elif started:
            num = f'<span style="display:inline-flex;align-items:center;gap:6px;font-size:12.5px;color:var(--mut)">{ic("lock", 14)}va en {nxt - 1}</span>'
            sample = f'<span class="m" style="font-size:13px">{prefix}-2026-{nxt:04d}</span>'
            hint = "Ya salió el primero: la cuenta sigue sola."
        else:
            num = '<span class="input m" style="width:76px;height:36px;justify-content:center;font-size:13px">1</span>'
            sample = f'<span class="m" style="font-size:13px">{prefix}-2026-0001</span>'
            hint = "Aún no sale el primero: fija desde dónde cuenta."
        nrows.append(f"""<div style="display:grid;grid-template-columns:30px minmax(0,1fr) 84px 148px 124px;gap:14px;align-items:center;padding:12px 0;border-top:1px solid var(--line)">
              {pm(code)}
              <span style="min-width:0"><span style="display:block;font-size:14px;font-weight:600">{label}</span><span style="display:block;font-size:12px;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{hint}</span></span>
              <span class="input m" style="height:36px;font-size:13px;text-transform:uppercase">{prefix}</span>
              {num}
              <span style="text-align:right">{sample}</span>
            </div>""")
    island_cls = "isl isl-dark glow-brand" if dark else "isl isl-glass glow-brand"
    cc_fact = '<span class="m">CC-2026-{{ccPad}}</span>' if interactive else '<span class="m">CC-2026-0001</span>'
    island = f"""<article class="{island_cls}" style="padding:24px;display:flex;flex-direction:column;gap:16px;min-height:0">
          <div style="display:flex;flex-direction:column;gap:6px"><span class="kick">Así firma tus papeles</span><span class="d" style="font-size:22px;font-weight:700;line-height:1.15;letter-spacing:-.01em">El encabezado y el pie que llevan todos</span></div>
          <div class="sheet" style="padding:16px 18px;display:flex;flex-direction:column;gap:10px">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:8px;border-bottom:1.5px solid #E65759"><span style="width:52px;height:14px;border-radius:3px;background:linear-gradient(90deg,#F2A93B,#E65759 55%,#7B5CF0)"></span><span class="m" style="font-size:9px;font-weight:600">CTR-2026-0121</span></div>
            <div style="font-size:9.5px;line-height:1.55;color:#3F3F46"><p style="font-size:7.5px;letter-spacing:.1em;color:#E65759;font-weight:700">LA AGENCIA</p><p style="font-weight:700;color:#18181B;font-size:11px">JuanitoXpeditions S.A.S.</p><p>NIT 901.234.567-8</p><p>Calle 93 # 11-27, oficina 402, Bogotá</p><p>+57 300 123 4567 · reservas@juanitoxpeditions.co</p></div>
            <div style="border-top:1px solid #E4E4E7;padding-top:7px;font-size:8px;color:#71717A;text-align:center;line-height:1.5">JuanitoXpeditions S.A.S. · NIT 901.234.567-8 · Bogotá<br>Registro Nacional de Turismo 45012</div>
          </div>
          <div>
            <div class="fact"><span style="color:var(--mut)">Próximo contrato</span><span class="m">CTR-2026-0121</span></div>
            <div class="fact"><span style="color:var(--mut)">Próximo recibo</span><span class="m">REC-2026-0020</span></div>
            <div class="fact"><span style="color:var(--mut)">Primera cuenta de cobro</span>{cc_fact}</div>
          </div>
          <div style="flex-grow:1"></div>
          <span style="font-size:12.5px;color:var(--mut);line-height:1.5">El NIT y el isotipo salen de Mi empresa › General. Lo ya emitido conserva su emisor y su número.</span>
        </article>"""
    content = f"""{type_tabs("settings")}
      <section style="display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:16px;flex-grow:1;min-height:0">
        <div style="display:flex;flex-direction:column;gap:16px;min-width:0;min-height:0;overflow:hidden">
          <article class="card" style="padding:20px 24px 22px">
            <div style="display:flex;justify-content:space-between;align-items:baseline;padding-bottom:14px"><span class="d" style="font-size:20px;font-weight:700">Quién emite</span><span class="lbl">Lo vacío cae a Mi empresa</span></div>
            <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px 16px">{fhtml}</div>
          </article>
          <article class="card" style="padding:20px 24px 8px">
            <div style="display:flex;justify-content:space-between;align-items:baseline;padding-bottom:10px"><span class="d" style="font-size:20px;font-weight:700">Numeración</span><span class="lbl">Prefijo · siguiente número · cómo sale</span></div>
            {''.join(nrows)}
          </article>
        </div>
        {island}
      </section>"""
    d = '<sc-if value="{{dirty}}" hint-placeholder-val="{{false}}">' + dock("La primera cuenta de cobro saldrá con este número", "Guardar ajustes") + "</sc-if>" if interactive else ""
    return shell("Mi empresa", ["Mi empresa", "Documentos", "Emisor y numeración"], content, dark, d)


EMISOR_LOGIC = """class Component extends DCLogic {
  constructor(props) { super(props); this.state = { cc: 1 }; }
  renderVals() {
    const cc = this.state.cc;
    return {
      ccNext: String(cc),
      ccPad: String(cc).padStart(4, '0'),
      inc: () => this.setState({ cc: cc + 1 }),
      dec: () => this.setState({ cc: Math.max(1, cc - 1) }),
      dirty: cc !== 1,
      reset: () => this.setState({ cc: 1 })
    };
  }
}"""


# ─── 3 · Oscuro ───────────────────────────────────────────────────────────

# ─── 4 · Estados ──────────────────────────────────────────────────────────

def estados():
    unknown = f"""<article class="card" style="padding:20px 22px;display:flex;flex-direction:column;gap:12px;min-width:0">
        <span class="kick">Una variable que no existe</span>
        <div style="display:grid;grid-template-columns:36px minmax(0,1fr);gap:12px;align-items:center"><span class="cap">{ic('text', 17)}</span><span><span style="display:block;font-size:14px;font-weight:600">Párrafo</span><span style="display:block;font-size:12.5px;color:var(--mut)">Quedan <span class="tok tok-bad">{{{{cupo_restante}}}}</span> cupos en tu salida…</span></span></div>
        <div class="note note-warn" style="grid-template-columns:18px minmax(0,1fr)">{ic('alert', 18, 2, 'var(--warn)')}<span><b style="font-weight:600">{{{{cupo_restante}}}} no existe en el contrato.</b> La hoja espera hasta que la corrijas; las variables que sí hay están bajo cada texto.</span></div>
        <div style="flex-grow:1"></div>
        <div class="isl isl-ink glow-brand" style="border-radius:24px;padding:14px 14px 14px 20px;display:flex;align-items:center;gap:12px"><span style="display:flex;flex-direction:column;gap:1px;min-width:0;flex:1"><span style="font-size:13px;font-weight:600">Cambios sin guardar</span><span style="font-size:11.5px;color:#A1A1AA">Corrige {{{{cupo_restante}}}} para guardar</span></span><button class="btn btn-p btn-sm" disabled>Guardar</button></div>
      </article>"""
    first = f"""<article class="card" style="padding:20px 22px;display:flex;flex-direction:column;gap:12px;min-width:0">
        <span class="kick">La primera vez</span>
        <div style="display:flex;align-items:center;gap:10px"><span class="d" style="font-size:24px;font-weight:700">Cuenta de cobro</span><span class="pill"><span class="dot dot-mut"></span>Modelo de Axi</span></div>
        <p style="margin:0;font-size:13px;color:var(--fg2);line-height:1.55">Así sale hoy, escrito por Axi para tu tipo de negocio. Edita lo que quieras: al guardar nace <b style="font-weight:600">tu versión 1</b> y el modelo sigue ahí para volver.</p>
        <div style="display:flex;gap:10px;align-items:center;padding:12px 14px;border-radius:16px;background:var(--soft)">{pm('cuenta_cobro')}<span style="font-size:12.5px;color:var(--mut);line-height:1.45">Todavía no has emitido ninguna. La primera saldrá como <span class="m" style="color:var(--fg)">CC-2026-0001</span>.</span></div>
      </article>"""
    reset = f"""<article class="card" style="padding:0;position:relative;overflow:hidden;min-width:0;min-height:360px;background:var(--desk)">
        <div class="scrim" style="border-radius:24px"></div>
        <div class="dlg" role="dialog" aria-label="¿Vuelves al modelo de Axi?" style="position:absolute;left:24px;right:24px;top:50%;transform:translateY(-50%);padding:24px;display:flex;flex-direction:column;gap:12px">
          <span class="d" style="font-size:22px;font-weight:700">¿Vuelves al modelo de Axi?</span>
          <p style="margin:0;font-size:13px;line-height:1.55;color:var(--fg2)">Desde ahora el contrato saldrá con el texto de Axi. <b style="font-weight:600">Tu versión 3 queda en el historial</b> y lo que ya se emitió no cambia.</p>
          <div style="display:flex;justify-content:flex-end;gap:8px;padding-top:4px"><button class="btn btn-g">Cancelar</button><button class="btn btn-p">Volver al modelo</button></div>
        </div>
      </article>"""
    noperm = f"""<article class="card" style="padding:28px 22px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px;min-width:0">
        <span class="cap" style="width:48px;height:48px;border-radius:16px">{ic('shield', 22)}</span>
        <span class="d" style="font-size:20px;font-weight:700">Las plantillas las configura quien administra</span>
        <p style="margin:0;font-size:13px;color:var(--mut);line-height:1.55;max-width:40ch">Cambiar el texto de un contrato o el emisor requiere el permiso «Configurar plantillas de documentos». Pídeselo a quien administra los roles.</p>
        <button class="btn btn-s btn-sm">Volver a Mi empresa</button>
      </article>"""
    off = f"""<article class="card" style="padding:28px 22px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px;min-width:0">
        <span class="cap" style="width:48px;height:48px;border-radius:16px">{ic('power', 22)}</span>
        <span class="d" style="font-size:20px;font-weight:700">Aquí no hay documentos</span>
        <p style="margin:0;font-size:13px;color:var(--mut);line-height:1.55;max-width:40ch">Este negocio no emite contratos ni cuentas de cobro: la función está apagada. Si los necesitas, enciéndela en Funciones.</p>
        <button class="btn btn-s btn-sm">Ir a Funciones</button>
      </article>"""
    failed = f"""<article style="border-radius:24px;background:var(--desk);border:1px solid var(--line);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:10px;padding:28px 22px;min-width:0">
        <div class="sheet" style="width:120px;height:160px;opacity:.5;display:flex;align-items:center;justify-content:center">{ic('file', 28, 1.5, '#A1A1AA')}</div>
        <span style="font-size:14px;font-weight:600">La hoja no pudo actualizarse</span>
        <span style="font-size:12.5px;color:var(--mut);max-width:34ch;line-height:1.5">Sin conexión con el generador. Tus cambios siguen aquí; guardar no depende de la vista previa.</span>
        <button class="btn btn-s btn-sm">Reintentar</button>
      </article>"""
    return f"""<div style="width:1440px;height:900px;background:var(--bg);padding:40px;box-sizing:border-box;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:repeat(2,minmax(0,1fr));gap:20px">
  {unknown}{first}{reset}{noperm}{off}{failed}
</div>"""


# ─── 5 · Celular ──────────────────────────────────────────────────────────

def movil():
    rows = "".join(f"""<div style="display:grid;grid-template-columns:36px minmax(0,1fr) auto;gap:12px;align-items:center;padding:11px 0;border-top:1px solid var(--line)"><span class="cap">{ic(b[1], 17)}</span><span style="min-width:0"><span style="display:block;font-size:14px;font-weight:600">{b[2]}</span><span style="display:block;font-size:12px;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{b[3]}</span></span><span style="color:var(--mut)">{ic('chev', 16)}</span></div>""" for b in BLOCKS[:6])
    return f"""<div style="width:390px;height:844px;background:var(--bg);overflow:hidden;display:flex;flex-direction:column;position:relative">
  <header style="height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 16px;flex-shrink:0"><button class="icb" aria-label="Abrir menú">{ic('menu', 18, 1.8)}</button><span style="font-size:13px;color:var(--mut)">Mi empresa / <span style="color:var(--fg);font-weight:500">Documentos</span></span><span style="width:38px"></span></header>
  <div style="padding:0 16px;display:flex;gap:6px;overflow:hidden;flex-shrink:0"><button class="tab tab-on">Contrato<span class="dot" style="background:var(--onfg)"></span></button><button class="tab">Cotización</button><button class="tab">Propuesta</button><button class="tab">Recibo</button></div>
  <div style="padding:12px 16px 24px;display:flex;flex-direction:column;gap:12px;min-height:0">
    <article style="border-radius:24px;background:var(--desk);border:1px solid var(--line);padding:14px;display:grid;grid-template-columns:96px minmax(0,1fr);gap:14px;align-items:center">
      <div style="height:128px;overflow:hidden;border-radius:4px"><div style="transform:scale(.185);transform-origin:top left;width:520px">{sheet(520)}</div></div>
      <div style="display:flex;flex-direction:column;gap:8px;min-width:0"><span class="pill" style="align-self:flex-start"><span class="dot dot-ok"></span>Al día</span><span style="font-size:13px;color:var(--fg2);line-height:1.45">La hoja con los datos de una reserva de ejemplo.</span><button class="btn btn-s btn-sm" style="align-self:flex-start">Ver la hoja</button></div>
    </article>
    <article class="card" style="padding:16px 16px 4px">
      <div style="display:flex;align-items:center;gap:8px;padding-bottom:4px"><span class="d" style="font-size:20px;font-weight:700">Contrato</span><span class="pill"><span class="dot dot-info"></span>Tu versión 3</span></div>
      <span class="lbl" style="display:block;padding:6px 0 8px">12 bloques, en el orden en que se imprimen</span>
      {rows}
    </article>
  </div>
  <footer class="isl isl-ink glow-brand" role="region" aria-label="Cambios sin guardar" style="position:absolute;left:16px;right:16px;bottom:16px;border-radius:999px;padding:6px 6px 6px 18px;display:flex;align-items:center;gap:10px;white-space:nowrap"><span style="font-size:13px;font-weight:600;flex-grow:1">Cambios sin guardar</span><button class="btn btn-sm" style="background:transparent;color:#F4F4F5;border:1px solid rgba(255,255,255,.18);height:40px">Descartar</button><button class="btn btn-p btn-sm" style="height:40px">Guardar</button></footer>
</div>"""


if __name__ == "__main__":
    write(OUT, "Main.dc.html", page("Documentos · editor", editor(), logic=EDITOR_LOGIC))
    write(OUT, "Emisor.dc.html", page("Documentos · emisor", emisor(), logic=EMISOR_LOGIC))
    write(OUT, "Oscuro.dc.html", page("Documentos · oscuro", editor(dark=True, interactive=False), dark=True))
    write(OUT, "EmisorOscuro.dc.html", page("Emisor · oscuro", emisor(dark=True, interactive=False), dark=True))
    write(OUT, "Estados.dc.html", page("Documentos · estados", estados()))
    write(OUT, "Movil.dc.html", page("Documentos · celular", movil(), w=390, h=844))
    canvas(OUT, "Cobros premium · F7 Documentos de Mi empresa", [
        ("Main.dc.html", 1440, 900, "1 · El editor — el papel manda; los bloques son su índice (interactivo)", True),
        ("Movil.dc.html", 390, 844, "2 · Celular — la hoja en miniatura, los bloques debajo", False),
        ("Oscuro.dc.html", 1440, 900, "3 · Oscuro — el papel sigue blanco", False),
        ("Emisor.dc.html", 1440, 900, "4 · Emisor y numeración — «Así firma tus papeles» (interactivo)", True),
        ("EmisorOscuro.dc.html", 1440, 900, "5 · Emisor — oscuro", False),
        ("Estados.dc.html", 1440, 900, "6 · Estados — variable que no existe, primera vez, restablecer, permiso, función, sin vista previa", False),
    ], [
        ("La plantilla: el papel manda", ["Main.dc.html", "Movil.dc.html", "Oscuro.dc.html"]),
        ("Quién emite y cómo se numera", ["Emisor.dc.html", "EmisorOscuro.dc.html", "Estados.dc.html"]),
    ])
    print("ok")
