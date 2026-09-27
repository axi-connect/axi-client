"""P7 · Documentos en el pedido y en la ficha del contacto (F8)."""
import sys
sys.path.insert(0, ".")
from kit import page, sidebar, topbar, ic, pm, write, canvas

OUT = "p7/project"


def pill(tone, text):
    return f'<span class="pill"><span class="dot dot-{tone}"></span>{text}</span>'


def dline(channel, text, detail=None, at=None, tone="ok", action=None):
    glyph = ic("wa" if channel == "whatsapp" else "mail", 12, 2)
    capbg = {"busy": "rgba(37,99,235,.12)", "bad": "rgba(220,38,38,.10)", "warn": "rgba(217,119,6,.12)"}.get(tone, "var(--soft)")
    color = {"busy": "var(--info)", "bad": "var(--bad)", "warn": "var(--fg)"}.get(tone, "var(--mut)")
    weight = "" if tone == "ok" else "font-weight:500;"
    beat = '<span class="beat" aria-hidden="true"></span>' if tone == "busy" else ""
    parts = [f'<span style="{weight}">{text}</span>']
    if detail:
        parts.append(f'<span class="sep"> · </span>{detail}')
    if at:
        parts.append(f'<span class="sep"> · </span><span style="white-space:nowrap">{at}</span>')
    act = f'<span style="flex-basis:100%;padding-left:26px"><button class="btn btn-s" style="height:28px;padding:0 12px;font-size:12px;color:var(--fg)">{action}</button></span>' if action else ""
    return f'<p class="dline" style="margin:0;color:{color};flex-wrap:wrap;row-gap:6px;align-items:flex-start"><span style="width:18px;height:18px;border-radius:6px;display:grid;place-items:center;flex-shrink:0;background:{capbg};color:{color};margin-top:1px">{glyph}</span>{beat}<span style="min-width:0;flex:1">{"".join(parts)}</span>{act}</p>'


def drow(code, name, number, meta, state=None, lines="", view=True, more=True, tone="ok", sub=""):
    st = state or ""
    view_btn = '<button class="btn btn-s" style="height:30px;padding:0 12px;font-size:13px">Ver</button>' if view else ""
    more_btn = f'<button class="icb icb-sm" style="border:0;background:transparent;color:var(--mut)" aria-label="Más acciones · {number}">{ic("dots", 16, 2)}</button>' if more else ""
    fade = "opacity:.6;" if tone == "off" else ""
    return f"""<li class="drow" style="list-style:none;padding:12px 0">
          {pm(code, tone)}
          <div style="min-width:0;{fade}"><p class="dname" style="margin:0;display:flex;align-items:center;gap:8px;flex-wrap:wrap">{name}{st}</p><p class="dmeta" style="margin:0"><span class="m">{number}</span><span class="sep">·</span><span>{meta}</span></p></div>
          <div style="display:flex;align-items:center;gap:2px">{view_btn}{more_btn}</div>
          {sub}{lines}
        </li>"""


def reason(icon, color, text, action=None):
    act = f'<span style="flex-basis:100%;padding-left:22px"><button class="btn btn-s" style="height:28px;padding:0 12px;font-size:12px">{ic("reset", 12, 2)}{action}</button></span>' if action else ""
    return f'<p class="dline" style="margin:0;align-items:flex-start;flex-wrap:wrap;row-gap:6px">{ic(icon, 14, 1.9, color, "margin-top:2px;flex-shrink:0")}<span style="flex:1;min-width:0">{text}</span>{act}</p>'


def docs_tile(rows, count, emit=True, foot=None, dark=False, emit_attr=""):
    emit_btn = f'<button class="btn btn-s" style="height:30px;padding:0 12px;font-size:13px"{emit_attr}>{ic("plus", 14, 2)}Emitir</button>' if emit else ""
    foot = foot if foot is not None else 'Cada papel sale con los datos <b style="font-weight:500;color:var(--fg)">de ese día</b>. Si el pedido cambia después, aquí se dice.'
    return f"""<section class="card" aria-label="Documentos" style="padding:18px 20px 4px;display:flex;flex-direction:column;border-radius:24px">
        <header style="display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:30px"><span style="font-size:12px;color:var(--mut)">Documentos <span style="font-variant-numeric:tabular-nums">· {count}</span></span>{emit_btn}</header>
        <ul style="margin:6px 0 0;padding:0">{rows}</ul>
        <p style="margin:0;padding:12px 0 14px;border-top:1px solid var(--line);font-size:12px;line-height:1.5;color:var(--mut)">{foot}</p>
      </section>"""


CONTRACT_LINES = dline("whatsapp", "Enviado por WhatsApp", None, "16 sep, 10:31") + dline("email", "Enviado por correo", None, "16 sep, 10:31")
RECEIPT_LINES = dline("email", "Enviado por correo", "salió solo", "hoy, 9:44")


def base_rows(extra=""):
    return (
        drow("contract", "Contrato", "CTR-2026-0120", "16 sep · 2 págs.", lines=CONTRACT_LINES)
        + drow("receipt", "Recibo de pago", "REC-2026-0019", "hoy · 1 pág.", lines=RECEIPT_LINES)
        + extra
    )


def kanban(dim=True):
    col = lambda title, n, cards: f"""<div style="width:236px;flex-shrink:0;display:flex;flex-direction:column;gap:10px"><div style="display:flex;justify-content:space-between;font-size:13px;font-weight:600;padding:0 4px">{title}<span style="color:var(--mut);font-weight:400">{n}</span></div>{cards}</div>"""
    card = lambda num, name, amt, sel=False: f"""<div class="card" style="padding:14px;border-radius:18px;display:flex;flex-direction:column;gap:8px;{'box-shadow:inset 0 0 0 2px var(--on);' if sel else ''}"><div style="display:flex;justify-content:space-between;font-size:12px;color:var(--mut)"><span class="m">{num}</span><span>hace 3 d</span></div><span style="font-size:13.5px;font-weight:600">{name}</span><span style="font-size:12.5px;color:var(--mut);font-variant-numeric:tabular-nums">{amt}</span><span style="height:4px;border-radius:9px;background:var(--soft2);overflow:hidden"><span style="display:block;height:100%;width:48%;background:var(--on)"></span></span></div>"""
    return f"""<div style="display:flex;gap:14px;{'opacity:.55;' if dim else ''}">
      {col('Por confirmar', 3, card('#0047', 'Mateo Ríos', '$ 9.120.000') + card('#0046', 'Lucía Pardo', '$ 4.500.000'))}
      {col('Confirmado', 4, card('#0045', 'Ana Gómez', 'falta $ 14.458.586', True) + card('#0044', 'Pedro Nieto', 'falta $ 9.269.326') + card('#0041', 'Sara Vélez', 'falta $ 2.100.000'))}
      {col('Entregado', 2, card('#0039', 'Iván Mora', 'pagado'))}
    </div>"""


def rail(body, dark=False):
    return f"""<aside aria-label="Detalle del pedido" style="width:380px;flex-shrink:0;border-radius:24px;border:1px solid var(--line);background:{'#0F0F11' if dark else 'rgba(244,244,245,.7)'};display:flex;flex-direction:column;overflow:hidden;min-height:0">
      <header style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;padding:16px 18px;border-bottom:1px solid var(--line);background:var(--card)">
        <div style="min-width:0"><div style="display:flex;align-items:center;gap:8px"><span class="m" style="font-size:15px;font-weight:600">#0045</span>{pill('ok', 'Confirmado')}</div><div style="margin-top:4px;font-size:12px;color:var(--mut);display:flex;gap:6px;align-items:center"><span style="width:18px;height:18px;border-radius:9px;background:var(--on);color:var(--onfg);font-size:8px;display:grid;place-items:center;font-weight:600">AG</span>Ana Gómez<span class="sep">·</span>WhatsApp<span class="sep">·</span>hace 3 días</div></div>
        <button class="icb icb-sm" aria-label="Cerrar">{ic('x', 15)}</button>
      </header>
      <div style="padding:14px;display:flex;flex-direction:column;gap:12px;overflow:hidden;min-height:0">{body}</div>
    </aside>"""


def pagos_compact():
    return f"""<section class="card" style="padding:16px 20px;border-radius:24px;display:flex;flex-direction:column;gap:10px">
        <span style="font-size:12px;color:var(--mut)">Pagos</span>
        <div style="display:grid;grid-template-columns:28px minmax(0,1fr) auto;gap:12px;align-items:center"><span style="width:28px;height:28px;border-radius:9px;background:var(--on);color:var(--onfg);display:grid;place-items:center">{ic('check', 14, 2.4)}</span><span style="min-width:0"><span style="display:block;font-size:13.5px;font-weight:600">Abono · Nequi</span><span style="display:block;font-size:12px;color:var(--mut)">hoy 9:41 · verificado por Juanita</span></span><span style="font-size:13.5px;font-weight:600;font-variant-numeric:tabular-nums">$ 5.000.000</span></div>
        <div style="display:grid;grid-template-columns:28px minmax(0,1fr) auto;gap:12px;align-items:center"><span style="width:28px;height:28px;border-radius:9px;background:var(--on);color:var(--onfg);display:grid;place-items:center">{ic('check', 14, 2.4)}</span><span style="min-width:0"><span style="display:block;font-size:13.5px;font-weight:600">Anticipo · Bancolombia</span><span style="display:block;font-size:12px;color:var(--mut)">16 sep · verificado por Juanita</span></span><span style="font-size:13.5px;font-weight:600;font-variant-numeric:tabular-nums">$ 8.339.394</span></div>
      </section>"""


def actividad():
    return """<section style="padding:4px 6px;display:flex;flex-direction:column;gap:8px"><span style="font-size:12px;color:var(--mut)">Lo que pasó</span>
        <div style="display:flex;justify-content:space-between;font-size:13px"><span>Abono verificado · $ 5.000.000</span><span style="color:var(--mut);font-size:12px">hoy, 9:43</span></div></section>"""


def board_page(rail_html, dark=False, overlay=""):
    return f"""<div style="width:1440px;height:900px;display:flex;background:var(--bg);overflow:hidden;position:relative">
  {sidebar('Pedidos', dark)}
  <main style="flex-grow:1;display:flex;flex-direction:column;min-width:0;min-height:0">
    {topbar(['Pedidos', '#0045 · Ana Gómez'], dark)}
    <div style="padding:0 24px 20px 40px;display:flex;gap:20px;flex-grow:1;min-height:0">
      <div style="flex-grow:1;min-width:0;display:flex;flex-direction:column;gap:16px;overflow:hidden">
        <h1 class="d" style="margin:0;font-size:38px;font-weight:700;letter-spacing:-.02em;line-height:1.1">Pedidos</h1>
        {kanban()}
      </div>
      {rail_html}
    </div>
  </main>
  {overlay}
</div>"""


# ─── 1 · En el pedido (interactivo) ────────────────────────────────────────

MENU = f"""<div class="menu" role="menu" aria-label="Emitir para la reserva #0045" style="position:absolute;right:38px;top:{{{{menuTop}}}}px;width:340px;z-index:6">
      <span style="font-size:12px;color:var(--mut);padding:8px 12px 4px">Emitir para la reserva #0045</span>
      <button class="mi" role="menuitem" style="grid-template-columns:30px minmax(0,1fr) auto;align-items:center">{pm('contract')}<span><b>Contrato</b><span>Ya emitido · uno por reserva</span></span><span class="m" style="font-size:12px">CTR-2026-0120</span></button>
      <button class="mi" role="menuitem" onClick="{{{{issueStatement}}}}" style="grid-template-columns:30px minmax(0,1fr) auto;align-items:center">{pm('statement')}<span><b>Estado de cuenta</b><span>Con los datos de hoy</span></span>{ic('chev', 14, 2, 'var(--mut)')}</button>
      <button class="mi" role="menuitem" style="grid-template-columns:30px minmax(0,1fr) auto;align-items:center">{pm('cuenta_cobro')}<span><b>Cuenta de cobro</b><span>Con los datos de hoy</span></span>{ic('chev', 14, 2, 'var(--mut)')}</button>
      <p style="margin:4px 0 0;padding:10px 12px 8px;border-top:1px solid var(--line);font-size:12px;line-height:1.5;color:var(--mut)">El <b style="font-weight:500;color:var(--fg)">recibo</b> no se emite a mano: sale solo con cada pago verificado.</p>
    </div>"""

STATEMENT_BUSY = """<sc-if value="{{busy}}" hint-placeholder-val="{{false}}"><li class="drow" style="list-style:none;padding:12px 0">""" + pm("statement", "busy") + """
          <div style="min-width:0"><p class="dname" style="margin:0;display:flex;align-items:center;gap:8px">Estado de cuenta<span class="pill" style="height:20px;font-size:11.5px"><span class="dot dot-info"></span>Generando</span></p><p class="dmeta" style="margin:0"><span class="m">EDC-2026-0004</span><span class="sep">·</span><span>ahora</span></p></div><div></div>
          <div role="progressbar" aria-label="Generando el PDF" style="grid-column:1/4;height:2px;border-radius:2px;background:var(--soft2);overflow:hidden;margin-top:4px"><span style="display:block;height:100%;width:40%;background:var(--info);animation:slide 1.6s ease-in-out infinite"></span></div>
        </li></sc-if>
        <sc-if value="{{ready}}" hint-placeholder-val="{{false}}">""" + "@@READY@@" + "</sc-if>"


def pedido(dark=False, interactive=True):
    extra = ""
    if interactive:
        ready = drow("statement", "Estado de cuenta", "EDC-2026-0004", "ahora · 1 pág.")
        extra = STATEMENT_BUSY.replace("@@READY@@", ready)
    else:
        extra = drow("statement", "Estado de cuenta", "EDC-2026-0004", "ahora", state='<span class="pill" style="height:20px;font-size:11.5px"><span class="dot dot-info"></span>Generando</span>',
                     view=False, more=False, tone="busy",
                     sub='<div role="progressbar" aria-label="Generando el PDF" style="grid-column:1/4;height:2px;border-radius:2px;background:var(--soft2);overflow:hidden;margin-top:4px"><span style="display:block;height:100%;width:40%;background:var(--info)"></span></div>')
    count = "{{count}}" if interactive else "3"
    tile = docs_tile(base_rows(extra), count, emit_attr=' onClick="{{toggleMenu}}" aria-expanded="{{menuOpen}}"' if interactive else "")
    body = pagos_compact() + tile + actividad()
    overlay = ('<sc-if value="{{menuOpen}}" hint-placeholder-val="{{false}}">' + MENU + "</sc-if>") if interactive else ""
    toast = """<sc-if value="{{busy}}" hint-placeholder-val="{{false}}"><div class="toast" role="status" style="position:absolute;left:50%;top:14px;transform:translateX(-50%);z-index:7"><span style="width:28px;height:28px;border-radius:99px;background:#2563EB;display:grid;place-items:center">""" + ic("file", 14, 2, "#FFFFFF") + """</span>Estado de cuenta en preparación · la fila avisa cuando está</div></sc-if>""" if interactive else ""
    return board_page(rail(body, dark), dark, overlay + toast)


PEDIDO_LOGIC = """class Component extends DCLogic {
  constructor(props) { super(props); this.state = { menu: false, stage: 'none' }; }
  renderVals() {
    const st = this.state;
    return {
      menuOpen: st.menu,
      menuTop: 404,
      toggleMenu: () => this.setState({ menu: !st.menu }),
      issueStatement: () => {
        this.setState({ menu: false, stage: 'busy' });
        setTimeout(() => this.setState({ stage: 'ready' }), 2600);
      },
      busy: st.stage === 'busy',
      ready: st.stage === 'ready',
      count: st.stage === 'none' ? '2' : '3'
    };
  }
}"""


# ─── 2 · Estados de la fila ────────────────────────────────────────────────

def estados():
    failed = drow("cuenta_cobro", "Cuenta de cobro", "CC-2026-0001", "ahora", state='<span class="pill" style="height:20px;font-size:11.5px"><span class="dot dot-bad"></span>No salió</span>', view=False, more=False, tone="bad",
                  sub=reason("alert", "var(--bad)", 'El generador no respondió a tiempo. Reintentar vuelve a producir <b style="font-weight:500;color:var(--fg)">el mismo número</b>.', "Reintentar"))
    outdated = drow("statement", "Estado de cuenta", "EDC-2026-0003", "22 sep · 1 pág.", state='<span class="pill" style="height:20px;font-size:11.5px"><span class="dot dot-warn"></span>Desactualizado</span>',
                    sub=reason("history", "var(--warn)", 'El pedido cambió después de este papel. Regenerar lo emite de nuevo con <b style="font-weight:500;color:var(--fg)">los datos y la plantilla de hoy</b>.'))
    gone = drow("contract", "Contrato", "CTR-2026-0098", "2 sep", state='<span class="pill" style="height:20px;font-size:11.5px"><span class="dot dot-mut"></span>Reemplazado</span>', more=False, tone="off",
                lines=dline("whatsapp", "Enviado por WhatsApp", None, "2 sep, 16:05"),
                sub=reason("archive", "var(--mut)", "Reemplazado por CTR-2026-0120. Sigue archivado: lo enviado, enviado está."))
    left = docs_tile(failed + outdated + gone, 3)

    sending = drow("contract", "Contrato", "CTR-2026-0120", "16 sep · 2 págs.",
                   lines=dline("whatsapp", "Enviando por WhatsApp…", None, None, "busy"))
    hsm = drow("receipt", "Recibo de pago", "REC-2026-0019", "hoy · 1 pág.",
               lines=dline("whatsapp", "Salió el aviso por WhatsApp", "el PDF llega cuando responda", "hoy, 9:44", "warn"))
    skipped = drow("statement", "Estado de cuenta", "EDC-2026-0004", "hoy · 1 pág.",
                   lines=dline("whatsapp", "No salió por WhatsApp", "no ha escrito en más de 24 h", "hoy, 10:02", "warn", ic("mail", 12, 2) + "Enviar por correo")
                   + dline("email", "No se pudo enviar por correo", "el servicio de correo no respondió", "hoy, 10:03", "bad", ic("reset", 12, 2) + "Reintentar"))
    middle = docs_tile(sending + hsm + skipped, 3, foot="La entrega es una línea por canal: por dónde salió y cuándo, o por qué no. El tono va en el texto, nunca en el fondo.")

    empty = f"""<section class="card" style="padding:18px 20px;border-radius:24px;display:flex;flex-direction:column;gap:12px">
        <header style="display:flex;align-items:center;justify-content:space-between"><span style="font-size:12px;color:var(--mut)">Documentos</span><button class="btn btn-s" style="height:30px;padding:0 12px;font-size:13px">{ic('plus', 14, 2)}Emitir</button></header>
        <div style="display:grid;grid-template-columns:48px minmax(0,1fr);gap:14px;align-items:center"><span style="position:relative;display:block;width:48px;height:52px">{pm('cuenta_cobro', 'ok', 'position:absolute;left:0;top:8px;opacity:.7')}{pm('contract', 'ok', 'position:absolute;left:10px;top:0;transform:rotate(4deg)')}</span>
        <span><span style="display:block;font-size:14.5px;font-weight:500">Todavía no hay papeles de esta reserva</span><span style="display:block;font-size:12px;color:var(--mut);line-height:1.5;margin-top:2px">Emite el <b style="font-weight:500;color:var(--fg)">contrato</b> cuando quieras. El <b style="font-weight:500;color:var(--fg)">recibo</b> puede salir solo con cada pago verificado: se enciende en Mi empresa › Documentos › Automáticos.</span></span></div>
      </section>"""
    error = """<section class="card" style="padding:16px 20px;border-radius:24px;display:flex;align-items:center;justify-content:space-between;gap:12px"><span style="font-size:13px;color:var(--mut)">No se pudieron cargar los documentos.</span><button class="btn btn-s" style="height:30px;padding:0 12px;font-size:13px">Reintentar</button></section>"""
    readonly = docs_tile(drow("contract", "Contrato", "CTR-2026-0120", "16 sep · 2 págs.", more=False, lines=dline("whatsapp", "Enviado por WhatsApp", None, "16 sep, 10:31")), 1, emit=False,
                         foot='Puedes abrir los papeles. Emitirlos o enviarlos es de <b style="font-weight:500;color:var(--fg)">supervisión</b>: gasta un consecutivo y le escribe al cliente.')
    right = f'<div style="display:flex;flex-direction:column;gap:16px">{empty}{error}<span class="kick" style="padding:6px 4px 0">Sin permiso de supervisión</span>{readonly}</div>'
    col = lambda title, inner: f'<div style="display:flex;flex-direction:column;gap:12px;min-width:0"><span class="kick">{title}</span>{inner}</div>'
    return f"""<div style="width:1440px;height:900px;background:var(--bg);padding:48px;box-sizing:border-box;display:grid;grid-template-columns:repeat(3,380px);justify-content:center;gap:40px;align-items:start">
  {col('El papel', left)}{col('La entrega', middle)}{col('Vacío, error y solo ver', right)}
</div>"""


# ─── 3 · Menús ─────────────────────────────────────────────────────────────

def menus():
    emit = MENU.replace("position:absolute;right:38px;top:{{menuTop}}px;", "").replace(' onClick="{{issueStatement}}"', "")
    rowmenu = f"""<div class="menu" role="menu" style="width:260px">
      <button class="mi mi-hl" role="menuitem">{ic('send', 16, 1.8, 'var(--mut)')}<span><b>Enviar</b><span>Por WhatsApp o correo, al cliente</span></span></button>
      <button class="mi" role="menuitem">{ic('reset', 16, 1.8, 'var(--mut)')}<span><b>Regenerar</b><span>Datos y plantilla de hoy, número nuevo</span></span></button>
      <button class="mi" role="menuitem">{ic('copy', 16, 1.8, 'var(--mut)')}<span><b>Copiar número</b><span class="m">CTR-2026-0120</span></span></button>
    </div>"""
    tile = docs_tile(base_rows(), 2)
    return f"""<div style="width:1440px;height:900px;background:var(--bg);padding:56px;box-sizing:border-box;display:grid;grid-template-columns:380px 340px 260px;justify-content:center;gap:48px;align-items:start">
  <div style="display:flex;flex-direction:column;gap:12px"><span class="kick">La sección, en reposo</span>{tile}</div>
  <div style="display:flex;flex-direction:column;gap:12px"><span class="kick">«Emitir»: lo que se emite a mano</span>{emit}</div>
  <div style="display:flex;flex-direction:column;gap:12px"><span class="kick">«…» de la fila</span>{rowmenu}<span style="font-size:12.5px;color:var(--mut);line-height:1.5">«Enviar» va primero y solo con el PDF listo. Un papel generándose o reemplazado no tiene «…».</span></div>
</div>"""


# ─── 4 · Ficha del contacto (360) ──────────────────────────────────────────

def contacto(dark=False):
    order = lambda num, prod, state, falta, pct: f"""<li style="list-style:none;padding:14px 0;border-top:1px solid var(--line)"><div style="display:flex;justify-content:space-between;gap:12px;align-items:center"><div style="min-width:0"><p style="margin:0;display:flex;gap:8px;align-items:center;font-size:14px;font-weight:600"><span class="m" style="font-size:12px;color:var(--mut);font-weight:400">{num}</span>{prod}{pill('ok', state)}</p><p style="margin:2px 0 0;font-size:12.5px;color:var(--mut)">{falta}</p></div><button class="btn btn-g" style="height:30px;padding:0 10px;font-size:12.5px">{ic('ext', 13, 2)}Abrir pedido</button></div><span style="display:block;margin-top:10px;height:4px;border-radius:9px;background:var(--soft2);overflow:hidden"><span style="display:block;height:100%;width:{pct}%;background:var(--on)"></span></span></li>"""
    rows = drow("contract", "Contrato", "CTR-2026-0120", "#0045 · 16 sep", lines=CONTRACT_LINES) + drow("receipt", "Recibo de pago", "REC-2026-0019", "#0045 · hoy", lines=RECEIPT_LINES) + drow("receipt", "Recibo de pago", "REC-2026-0007", "#0031 · 12 mar · pagado")
    return f"""<div style="width:1440px;height:900px;display:flex;background:var(--bg);overflow:hidden">
  {sidebar('Contactos', dark)}
  <main style="flex-grow:1;display:flex;flex-direction:column;min-width:0">
    {topbar(['Contactos', 'Ana Gómez Rueda'], dark)}
    <div style="padding:0 40px 28px;display:flex;flex-direction:column;gap:18px;min-height:0">
      <div style="display:flex;align-items:center;gap:16px"><span style="width:64px;height:64px;border-radius:20px;background:var(--on);color:var(--onfg);display:grid;place-items:center;font:700 22px Urbanist">AG</span><div><h1 class="d" style="margin:0;font-size:34px;font-weight:700;letter-spacing:-.02em">Ana Gómez Rueda</h1><p style="margin:2px 0 0;font-size:13.5px;color:var(--mut)">Cliente desde marzo · 2 pedidos · escribió hace 3 h</p></div></div>
      <section style="display:grid;grid-template-columns:minmax(0,1fr) 420px;gap:16px;min-height:0">
        <article class="card" style="padding:22px 24px 8px;border-radius:24px">
          <div style="display:flex;justify-content:space-between;align-items:baseline"><span class="d" style="font-size:20px;font-weight:700">Pedidos <span style="font:400 13px Poppins;color:var(--mut)">(2)</span></span><span class="lbl">Con saldo primero</span></div>
          <ul style="margin:10px 0 0;padding:0">{order('#0045', 'Expedición Cocuy', 'Confirmado', 'Falta <b style="color:var(--fg);font-weight:500">$ 14.458.586</b> de $ 27.797.980 · servicio el sáb 14 nov', 48)}{order('#0031', 'Caño Cristales', 'Entregado', '<b style="color:var(--fg);font-weight:500">Pagado</b> · $ 6.400.000', 100)}</ul>
        </article>
        {docs_tile(rows, 3, emit=False, foot='Los papeles se archivan <b style="font-weight:500;color:var(--fg)">a su nombre</b> y sobreviven al pedido. Se emiten desde cada pedido.')}
      </section>
    </div>
  </main>
</div>"""


# ─── 5 · Celular ───────────────────────────────────────────────────────────

def movil():
    return f"""<div style="width:390px;height:844px;background:var(--bg);overflow:hidden;display:flex;flex-direction:column">
  <header style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:var(--card);border-bottom:1px solid var(--line)"><button class="icb icb-sm" aria-label="Volver">{ic('back', 16)}</button><span style="display:flex;gap:8px;align-items:center"><span class="m" style="font-weight:600">#0045</span>{pill('ok', 'Confirmado')}</span><span style="width:30px"></span></header>
  <div style="padding:12px;display:flex;flex-direction:column;gap:12px">
    {pagos_compact()}
    {docs_tile(base_rows(), 2)}
  </div>
</div>"""


if __name__ == "__main__":
    write(OUT, "Main.dc.html", page("Pedido · documentos", pedido(), logic=PEDIDO_LOGIC))
    write(OUT, "Estados.dc.html", page("Documentos · estados", estados()))
    write(OUT, "Menus.dc.html", page("Documentos · menús", menus()))
    write(OUT, "Contacto.dc.html", page("Contacto · documentos", contacto()))
    write(OUT, "Oscuro.dc.html", page("Pedido · oscuro", pedido(dark=True, interactive=False), dark=True))
    write(OUT, "Movil.dc.html", page("Pedido · celular", movil(), w=390, h=844))
    canvas(OUT, "Cobros premium · F8 Documentos en el pedido", [
        ("Main.dc.html", 1440, 900, "1 · En el rail del pedido — un documento emitido es un hecho con número (interactivo: Emitir › Estado de cuenta)", True),
        ("Movil.dc.html", 390, 844, "2 · Celular", False),
        ("Oscuro.dc.html", 1440, 900, "3 · Oscuro — el papelito sigue blanco", False),
        ("Estados.dc.html", 1440, 900, "4 · Estados — el papel, la entrega, vacío, error y solo ver", False),
        ("Menus.dc.html", 1440, 900, "5 · «Emitir» y «…» de la fila", False),
        ("Contacto.dc.html", 1440, 900, "6 · Ficha del contacto — la misma lista, a su nombre", False),
    ], [
        ("El papel del pedido", ["Main.dc.html", "Movil.dc.html", "Oscuro.dc.html"]),
        ("Estados, menús y la ficha del contacto", ["Estados.dc.html", "Menus.dc.html", "Contacto.dc.html"]),
    ])
    print("ok")
