"""P8 · Enviar un documento y lo que sale solo (F9)."""
import sys
sys.path.insert(0, ".")
from kit import page, sidebar, topbar, ic, pm, write, canvas
import p6
import p7

OUT = "p8/project"


# ─── El diálogo ───────────────────────────────────────────────────────────

def dialog_static(scn="open", channel="whatsapp", other=False, width=520):
    """Una versión fija del diálogo (oscuro, celular)."""
    wa_on = channel == "whatsapp"
    wa_sub = {"open": "+57 310 •••• 199 · escribió hace 3 h",
              "hsm": "+57 310 •••• 199 · su último mensaje fue hace 3 días",
              "nohsm": "No ha escrito en más de 24 h y no hay plantilla aprobada."}[scn]
    rows = {
        "open": [("Le llega", "el PDF al chat, con una línea que lo presenta"), ("La ventana de 24 h", "abierta · cierra hoy a las 18:40"), ("Antes", "ya se envió por correo el 16 sep")],
        "hsm": [("Le llega", "la plantilla «documento_listo»"), ("Y el PDF", "cuando responda, solo"), ("Antes", "ya se envió por correo el 16 sep")],
    }.get(scn, [])
    narrow = width < 420
    facts = "".join(f'<div class="fact" style="{"border-top:0;" if i == 0 else ""}{"flex-direction:column;gap:2px;" if narrow else ""}"><span style="color:var(--mut)">{a}</span><span style="{"" if narrow else "text-align:right"}">{b}</span></div>' for i, (a, b) in enumerate(rows))
    box = f'<div style="border-radius:18px;background:var(--soft);padding:4px 16px">{facts}</div>' if rows and wa_on else ""
    warn = ""
    if scn == "nohsm":
        warn = f'<div class="note note-warn">{ic("alert", 18, 2, "var(--warn)")}<span>Fuera de las 24 h, WhatsApp solo deja salir una plantilla aprobada de Meta. <a href="#" style="font-weight:500">Configurar plantilla</a> o mándalo por correo.</span><span></span></div>'
    email_box = ""
    if channel == "email":
        email_box = f'<div style="border-radius:18px;background:var(--soft);padding:4px 16px"><div class="fact" style="border-top:0"><span style="color:var(--mut)">Le llega</span><span>el PDF adjunto, con tu pie de página</span></div><div class="fact"><span style="color:var(--mut)">Responde a</span><span>reservas@juanitoxpeditions.co</span></div></div>'
        if other:
            email_box += '<div class="field"><label>Otro correo, solo esta vez</label><div class="input"><span class="ph">nombre@empresa.com</span></div><span class="hint">La ficha del contacto no cambia.</span></div>'
    wa_disabled = scn == "nohsm"
    return f"""<div class="dlg" role="dialog" aria-label="Enviar contrato" style="width:{width}px;padding:{20 if width < 420 else 24}px;box-sizing:border-box;display:flex;flex-direction:column;gap:16px">
      <div style="display:flex;gap:14px;align-items:center">{pm('contract', 'ok', 'transform:scale(1.25);margin:0 4px')}<div style="min-width:0"><span class="d" style="display:block;font-size:24px;font-weight:700;letter-spacing:-.01em;line-height:1.15">Enviar contrato</span><span style="display:block;font-size:12.5px;color:var(--mut);margin-top:2px"><span class="m" style="color:var(--fg)">CTR-2026-0120</span> de la reserva #0045 · a <b style="font-weight:500;color:var(--fg)">Ana Gómez</b></span></div></div>
      <div role="radiogroup" aria-label="Por dónde" style="display:flex;flex-direction:column;gap:8px">
        {channel_card('wa', 'WhatsApp', wa_sub, wa_on, wa_disabled)}
        {channel_card('mail', 'Correo', 'a***z@gmail.com · el de su ficha', channel == 'email', False)}
      </div>
      {box}{warn}{email_box}
      <div style="display:flex;justify-content:flex-end;gap:8px;padding-top:4px"><button class="btn btn-g">Volver</button><button class="btn btn-p"{' disabled' if (wa_on and wa_disabled) else ''}>{ic('send', 16, 2)}Enviar por {'WhatsApp' if wa_on else 'correo'}</button></div>
    </div>"""


def channel_card(icon, title, sub, on, disabled, attrs=""):
    return f"""<button class="opt{' opt-on' if on else ''}" role="radio" aria-checked="{'true' if on else 'false'}"{' aria-disabled="true"' if disabled else ''}{attrs} style="grid-template-columns:36px minmax(0,1fr) 18px;align-items:center;padding:12px 14px">
          <span class="cap">{ic(icon, 17)}</span>
          <span style="min-width:0"><span style="display:block;font-size:14.5px;font-weight:600">{title}</span><span style="display:block;font-size:12.5px;color:var(--mut);line-height:1.4">{sub}</span></span>
          <span class="radio{' radio-on' if on else ''}"></span>
        </button>"""


DIALOG_I = """<div class="dlg" role="dialog" aria-label="Enviar contrato" style="width:520px;padding:24px;box-sizing:border-box;display:flex;flex-direction:column;gap:16px">
      <div style="display:flex;gap:14px;align-items:center">@@PM@@<div style="min-width:0"><span class="d" style="display:block;font-size:24px;font-weight:700;letter-spacing:-.01em;line-height:1.15">Enviar contrato</span><span style="display:block;font-size:12.5px;color:var(--mut);margin-top:2px"><span class="m" style="color:var(--fg)">CTR-2026-0120</span> de la reserva #0045 · a <b style="font-weight:500;color:var(--fg)">Ana Gómez</b></span></div></div>
      <div role="radiogroup" aria-label="Por dónde" style="display:flex;flex-direction:column;gap:8px">
          <button class="opt {{waCls}}" role="radio" aria-checked="{{waChecked}}" aria-disabled="{{waOff}}" onClick="{{waPick}}" style="grid-template-columns:36px minmax(0,1fr) 18px;align-items:center;padding:12px 14px">
            <span class="cap">@@WA@@</span>
            <span style="min-width:0"><span style="display:block;font-size:14.5px;font-weight:600">WhatsApp</span><span style="display:block;font-size:12.5px;color:var(--mut);line-height:1.4">{{waSub}}</span></span>
            <span class="radio {{waRadio}}"></span>
          </button>
          <button class="opt {{mailCls}}" role="radio" aria-checked="{{mailChecked}}" aria-disabled="{{mailOff}}" onClick="{{mailPick}}" style="grid-template-columns:36px minmax(0,1fr) 18px;align-items:center;padding:12px 14px">
            <span class="cap">@@MAIL@@</span>
            <span style="min-width:0"><span style="display:block;font-size:14.5px;font-weight:600">Correo</span><span style="display:block;font-size:12.5px;color:var(--mut);line-height:1.4">{{mailSub}}</span></span>
            <span class="radio {{mailRadio}}"></span>
          </button>
      </div>
      <sc-if value="{{hasFacts}}" hint-placeholder-val="{{true}}"><div style="border-radius:18px;background:var(--soft);padding:4px 16px"><sc-for list="{{facts}}" as="f" hint-placeholder-count="3"><div class="fact" style="{{f.style}}"><span style="color:var(--mut)">{{f.k}}</span><span style="text-align:right">{{f.v}}</span></div></sc-for></div></sc-if>
      <sc-if value="{{noHsm}}" hint-placeholder-val="{{false}}"><div class="note note-warn">@@WARN@@<span>Fuera de las 24 h, WhatsApp solo deja salir una plantilla aprobada de Meta. <a href="#" style="font-weight:500">Configurar plantilla</a> o mándalo por correo.</span><span></span></div></sc-if>
      <sc-if value="{{isEmail}}" hint-placeholder-val="{{false}}"><button onClick="{{toggleOther}}" aria-expanded="{{other}}" style="all:unset;cursor:pointer;display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:500">@@CHEV@@Usar otro correo solo esta vez</button></sc-if>
      <sc-if value="{{other}}" hint-placeholder-val="{{false}}"><div class="field"><div class="input"><span class="ph">nombre@empresa.com</span></div><span class="hint">La ficha del contacto no cambia: este destino es solo para este envío.</span></div></sc-if>
      <div style="display:flex;justify-content:flex-end;gap:8px;padding-top:4px"><button class="btn btn-g">Volver</button><button class="btn btn-p" aria-disabled="{{blocked}}" style="{{sendStyle}}">@@SEND@@{{sendLabel}}</button></div>
    </div>"""


def enviar():
    dlg = (DIALOG_I.replace("@@PM@@", pm("contract", "ok", "transform:scale(1.25);margin:0 4px"))
           .replace("@@WARN@@", ic("alert", 18, 2, "var(--warn)")).replace("@@CHEV@@", ic("chev", 14, 2, "var(--mut)"))
           .replace("@@SEND@@", ic("send", 16, 2)).replace("@@WA@@", ic("wa", 17)).replace("@@MAIL@@", ic("mail", 17)))
    rail_body = p7.pagos_compact() + p7.docs_tile(p7.base_rows(), 2) + p7.actividad()
    scen = """<div style="position:absolute;left:50%;bottom:24px;transform:translateX(-50%);z-index:8;display:flex;align-items:center;gap:10px"><span style="font-size:12.5px;color:#FFFFFF;white-space:nowrap">El caso de Ana</span><div class="seg" style="background:rgba(255,255,255,.95)"><sc-for list="{{scenarios}}" as="s" hint-placeholder-count="4"><button class="tab {{s.cls}}" style="height:34px;font-size:12.5px" onClick="{{s.pick}}">{{s.label}}</button></sc-for></div></div>"""
    overlay = f'<div class="scrim" style="z-index:6"></div>{scen}<div style="position:absolute;inset:0;display:grid;place-items:center;z-index:7">{dlg}</div>'
    return p7.board_page(p7.rail(rail_body), False, overlay)


ENVIAR_LOGIC = """class Component extends DCLogic {
  constructor(props) { super(props); this.state = { scn: 'open', ch: 'whatsapp', other: false }; }
  renderVals() {
    const st = this.state;
    const scn = st.scn;
    const noMail = scn === 'nomail';
    const waSub = { open: '+57 310 •••• 199 · escribió hace 3 h', hsm: '+57 310 •••• 199 · su último mensaje fue hace 3 días', nohsm: 'No ha escrito en más de 24 h y no hay plantilla aprobada.', nomail: '+57 310 •••• 199 · escribió hace 3 h' }[scn];
    const waOff = scn === 'nohsm';
    const ch = (waOff && st.ch === 'whatsapp') ? null : (noMail && st.ch === 'email' ? 'whatsapp' : st.ch);
    const on = (id) => ch === id;
    const chVals = {
      waCls: on('whatsapp') ? 'opt-on' : '', waChecked: on('whatsapp') ? 'true' : 'false', waRadio: on('whatsapp') ? 'radio-on' : '', waSub, waOff: waOff ? 'true' : 'false', waPick: () => { if (!waOff) this.setState({ ch: 'whatsapp', other: false }); },
      mailCls: on('email') ? 'opt-on' : '', mailChecked: on('email') ? 'true' : 'false', mailRadio: on('email') ? 'radio-on' : '', mailSub: noMail ? 'No tiene correo en su ficha: añádelo en el contacto.' : 'a***z@gmail.com · el de su ficha', mailOff: noMail ? 'true' : 'false', mailPick: () => { if (!noMail) this.setState({ ch: 'email' }); }
    };
    let facts = [];
    if (ch === 'whatsapp' && (scn === 'open' || scn === 'nomail')) facts = [['Le llega', 'el PDF al chat, con una línea que lo presenta'], ['La ventana de 24 h', 'abierta · cierra hoy a las 18:40'], ['Antes', 'ya se envió por correo el 16 sep']];
    if (ch === 'whatsapp' && scn === 'hsm') facts = [['Le llega', 'la plantilla «documento_listo»'], ['Y el PDF', 'cuando responda, solo'], ['Antes', 'ya se envió por correo el 16 sep']];
    if (ch === 'email') facts = [['Le llega', 'el PDF adjunto, con tu pie de página'], ['Responde a', 'reservas@juanitoxpeditions.co']];
    const labels = [['open', 'Escribió hace 3 h'], ['hsm', 'Fuera de 24 h, con plantilla'], ['nohsm', 'Fuera de 24 h, sin plantilla'], ['nomail', 'Sin correo en la ficha']];
    return {
      ...chVals,
      facts: facts.map(([k, v], i) => ({ k, v, style: i === 0 ? 'border-top:0' : '' })),
      hasFacts: facts.length > 0,
      noHsm: waOff,
      isEmail: ch === 'email',
      other: st.other && ch === 'email',
      toggleOther: () => this.setState({ other: !st.other }),
      blocked: ch === null ? 'true' : 'false',
      sendStyle: ch === null ? 'opacity:.45;box-shadow:none;cursor:not-allowed' : '',
      sendLabel: ch === null ? 'Enviar' : (ch === 'whatsapp' ? 'Enviar por WhatsApp' : 'Enviar por correo'),
      scenarios: labels.map(([k, label]) => ({ label, cls: scn === k ? 'tab-on' : '', pick: () => this.setState({ scn: k, other: false }) }))
    };
  }
}"""


# ─── Tras enviar ───────────────────────────────────────────────────────────

def enviado():
    rows = (p7.drow("contract", "Contrato", "CTR-2026-0120", "16 sep · 2 págs.",
                    lines=p7.dline("whatsapp", "Enviando por WhatsApp…", None, None, "busy") + p7.dline("email", "Enviado por correo", None, "16 sep, 10:31"))
            + p7.drow("receipt", "Recibo de pago", "REC-2026-0019", "hoy · 1 pág.", lines=p7.RECEIPT_LINES))
    body = p7.pagos_compact() + p7.docs_tile(rows, 2) + p7.actividad()
    toast = f'<div class="toast" role="status" style="position:absolute;left:calc(248px + (100% - 248px) / 2);bottom:24px;transform:translateX(-50%);z-index:7"><span style="width:28px;height:28px;border-radius:99px;background:#16A34A;display:grid;place-items:center">{ic("send", 14, 2, "#FFFFFF")}</span>Contrato en camino por WhatsApp · la fila dice cuándo sale</div>'
    return p7.board_page(p7.rail(body), False, toast)


# ─── Automáticos (interactivo) ─────────────────────────────────────────────

AUTO_BODY = """<section style="display:grid;grid-template-columns:minmax(0,1fr) 400px;gap:16px;flex-grow:1;min-height:0">
        <div style="display:flex;flex-direction:column;gap:16px;min-width:0;min-height:0;overflow:hidden">
          <article class="card" style="padding:20px 24px">
            <div style="display:flex;justify-content:space-between;align-items:baseline;padding-bottom:12px"><span class="d" style="font-size:20px;font-weight:700">Cuándo sale el contrato</span><span class="lbl">Uno por reserva</span></div>
            <div role="radiogroup" aria-label="Cuándo sale el contrato" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">
              <sc-for list="{{issues}}" as="o" hint-placeholder-count="3"><button class="opt {{o.cls}}" role="radio" aria-checked="{{o.checked}}" onClick="{{o.pick}}"><span class="radio {{o.radio}}"></span><span><span style="display:block;font-size:14px;font-weight:600">{{o.title}}</span><span style="display:block;font-size:12px;color:var(--mut);line-height:1.45;margin-top:2px">{{o.desc}}</span></span></button></sc-for>
            </div>
            <div class="srow" style="margin-top:12px"><div><div class="stitle">El recibo, con cada pago verificado</div><div class="shint">Sale solo en cuanto verificas un pago; no se emite a mano.</div></div><button type="button" role="switch" aria-checked="{{receiptChecked}}" aria-label="Recibo automático" class="sw {{receiptSw}}" onClick="{{toggleReceipt}}"><span class="knob"></span></button></div>
          </article>
          <article class="card" style="padding:20px 24px 8px">
            <div style="display:flex;justify-content:space-between;align-items:baseline;padding-bottom:6px"><span class="d" style="font-size:20px;font-weight:700">Y se envía solo</span><span class="lbl">Solo lo que sale solo; lo tuyo pasa por «Enviar»</span></div>
            <div style="display:grid;grid-template-columns:minmax(0,1fr) 120px 120px;gap:0 12px;align-items:center;padding:8px 0;font-size:12px;color:var(--mut)"><span></span><span style="text-align:center">Por WhatsApp</span><span style="text-align:center">Por correo</span></div>
            <div style="display:grid;grid-template-columns:minmax(0,1fr) 120px 120px;gap:0 12px;align-items:center;padding:12px 0;border-top:1px solid var(--line)"><span style="display:flex;gap:12px;align-items:center">@@PMC@@<span><span style="display:block;font-size:14px;font-weight:600">Contrato</span><span style="display:block;font-size:12px;color:var(--mut)">{{cHint}}</span></span></span><span style="display:flex;justify-content:center"><button type="button" role="switch" aria-checked="{{cWaChecked}}" aria-label="Contrato por WhatsApp" class="sw {{cWaSw}}" onClick="{{cToggleWa}}"><span class="knob"></span></button></span><span style="display:flex;justify-content:center"><button type="button" role="switch" aria-checked="{{cMailChecked}}" aria-label="Contrato por correo" class="sw {{cMailSw}}" onClick="{{cToggleMail}}"><span class="knob"></span></button></span></div><div style="display:grid;grid-template-columns:minmax(0,1fr) 120px 120px;gap:0 12px;align-items:center;padding:12px 0;border-top:1px solid var(--line)"><span style="display:flex;gap:12px;align-items:center">@@PMR@@<span><span style="display:block;font-size:14px;font-weight:600">Recibo</span><span style="display:block;font-size:12px;color:var(--mut)">{{rHint}}</span></span></span><span style="display:flex;justify-content:center"><button type="button" role="switch" aria-checked="{{rWaChecked}}" aria-label="Recibo por WhatsApp" class="sw {{rWaSw}}" onClick="{{rToggleWa}}"><span class="knob"></span></button></span><span style="display:flex;justify-content:center"><button type="button" role="switch" aria-checked="{{rMailChecked}}" aria-label="Recibo por correo" class="sw {{rMailSw}}" onClick="{{rToggleMail}}"><span class="knob"></span></button></span></div>
          </article>
          <article class="card" style="padding:20px 24px">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:12px"><div><span class="d" style="display:block;font-size:20px;font-weight:700">Plantilla de respaldo</span><span style="display:block;font-size:12.5px;color:var(--mut);margin-top:2px">Fuera de las 24 h sale esta plantilla aprobada de Meta y el PDF cuando responda.</span></div><button type="button" role="switch" aria-checked="{{hsmChecked}}" aria-label="Usar plantilla de respaldo" class="sw {{hsmSw}}" onClick="{{toggleHsm}}"><span class="knob"></span></button></div>
            <sc-if value="{{hsm}}" hint-placeholder-val="{{true}}"><div style="display:grid;grid-template-columns:minmax(0,1fr) 160px;gap:16px;margin-top:14px"><div class="field"><label>Nombre en Meta</label><div class="input m" style="font-size:13px">documento_listo</div><span class="hint">Sin variables: tal cual la aprobó Meta.</span></div><div class="field"><label>Idioma</label><div class="input m" style="font-size:13px">es_CO</div></div></div></sc-if>
          </article>
        </div>
        @@ISLAND@@
      </section>"""

AUTO_ISLAND = """<article class="isl isl-glass glow-brand" style="padding:24px;display:flex;flex-direction:column;gap:14px;min-height:0">
          <div style="display:flex;flex-direction:column;gap:6px"><span class="kick">Lo que sale solo</span><span class="d" style="font-size:22px;font-weight:700;line-height:1.15;letter-spacing:-.01em">La reserva de Ana, de principio a fin</span><span style="font-size:12.5px;color:var(--mut)">{{summary}}</span></div>
          <ol style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column">
            <sc-for list="{{steps}}" as="s" hint-placeholder-count="4">
              <li style="display:grid;grid-template-columns:30px minmax(0,1fr);gap:12px;padding:12px 0;border-top:1px solid rgba(11,11,14,.08)">
                <span style="display:flex;justify-content:center;padding-top:2px"><sc-if value="{{s.contract}}" hint-placeholder-val="{{true}}">@@PMC@@</sc-if><sc-if value="{{s.receipt}}" hint-placeholder-val="{{false}}">@@PMR@@</sc-if><sc-if value="{{s.none}}" hint-placeholder-val="{{false}}"><span style="width:30px;height:38px;border:1.5px dashed rgba(11,11,14,.24);border-radius:3px;box-sizing:border-box"></span></sc-if></span>
                <span style="min-width:0"><span style="display:block;font-size:11.5px;color:var(--mut)">{{s.when}}</span><span style="display:block;font-size:14px;font-weight:600;margin-top:1px">{{s.what}}</span><span style="display:block;font-size:12.5px;color:var(--fg2);line-height:1.45;margin-top:2px">{{s.how}}</span></span>
              </li>
            </sc-for>
          </ol>
          <sc-if value="{{hsmGap}}" hint-placeholder-val="{{false}}"><div style="border:1.5px dashed rgba(11,11,14,.24);border-radius:16px;padding:10px 13px;font-size:12.5px;line-height:1.45;color:var(--mut)">Si Ana lleva más de 24 h sin escribir, por WhatsApp <b style="color:var(--fg);font-weight:500">no sale</b>: falta la plantilla de respaldo.</div></sc-if>
          <div style="flex-grow:1"></div>
          <span style="font-size:12px;color:var(--mut);line-height:1.5">Lo que emites a mano no sale solo: pasa por «Enviar», que dice antes lo que va a pasar.</span>
        </article>"""


def automaticos():
    body = AUTO_BODY.replace("@@ISLAND@@", AUTO_ISLAND).replace("@@PMC@@", pm("contract")).replace("@@PMR@@", pm("receipt")).replace("@@PMC@@", pm("contract")).replace("@@PMR@@", pm("receipt"))
    content = f"""{p6.type_tabs("auto")}
      {body}"""
    d = '<sc-if value="{{dirty}}" hint-placeholder-val="{{false}}">' + p6.dock("Se aplica a lo que se emita desde ahora", "Guardar ajustes") + "</sc-if>"
    return p6.shell("Mi empresa", ["Mi empresa", "Documentos", "Automáticos"], content, False, d)


AUTO_LOGIC = """class Component extends DCLogic {
  constructor(props) { super(props); this.saved = { issue: 'on_confirm', receipt: true, cWa: true, cMail: true, rWa: false, rMail: true, hsm: false }; this.state = { ...this.saved }; }
  renderVals() {
    const st = this.state;
    const set = (k, v) => () => this.setState({ [k]: v });
    const opts = [['never', 'Nunca solo', 'Lo emites tú desde el pedido, cuando quieras.'], ['on_confirm', 'Al confirmar', 'En cuanto el pedido pasa a confirmado, con o sin dinero.'], ['on_deposit', 'Al verificar el anticipo', 'Con el primer dinero verificado; con plan, al saldar el anticipo.']];
    const ways = (wa, mail) => wa && mail ? 'por WhatsApp y por correo' : wa ? 'por WhatsApp' : mail ? 'por correo, si tiene correo en su ficha' : null;
    const steps = [];
    if (st.issue !== 'never') {
      const w = ways(st.cWa, st.cMail);
      steps.push({ paper: true, contract: true, receipt: false, none: false, when: st.issue === 'on_confirm' ? 'Al confirmar la reserva' : 'Al verificar el anticipo', what: 'Sale el contrato CTR-2026-0121', how: w ? 'Y se le envía ' + w + '.' : 'Queda en el pedido; nadie lo envía solo.' });
    } else {
      steps.push({ paper: false, contract: false, receipt: false, none: true, when: 'Al confirmar la reserva', what: 'No sale ningún contrato solo', how: 'Lo emites tú desde el pedido.' });
    }
    if (st.receipt) {
      const w = ways(st.rWa, st.rMail);
      steps.push({ paper: true, contract: false, receipt: true, none: false, when: 'Con cada pago verificado', what: 'Sale el recibo REC-2026-0020', how: w ? 'Y se le envía ' + w + '.' : 'Queda en el pedido; nadie lo envía solo.' });
      steps.push({ paper: true, contract: false, receipt: true, none: false, when: 'Con la cuota 1, el jue 1 oct', what: 'Otro recibo, REC-2026-0021', how: w ? 'Igual: ' + w + '.' : 'Igual: queda en el pedido.' });
    } else {
      steps.push({ paper: false, contract: false, receipt: false, none: true, when: 'Con cada pago verificado', what: 'No sale ningún recibo solo', how: 'Si lo necesita, emítele un estado de cuenta.' });
    }
    const anyWa = (st.issue !== 'never' && st.cWa) || (st.receipt && st.rWa);
    const papers = steps.filter((s) => s.paper).length;
    const sent = (st.issue !== 'never' && (st.cWa || st.cMail) ? 1 : 0) + (st.receipt && (st.rWa || st.rMail) ? 2 : 0);
    const keys = Object.keys(this.saved);
    return {
      issues: opts.map(([k, title, desc]) => ({ title, desc, cls: st.issue === k ? 'opt-on' : '', checked: st.issue === k ? 'true' : 'false', radio: st.issue === k ? 'radio-on' : '', pick: set('issue', k) })),
      receiptChecked: st.receipt ? 'true' : 'false', receiptSw: st.receipt ? 'sw-on' : 'sw-off', toggleReceipt: set('receipt', !st.receipt),
      cHint: st.issue === 'never' ? 'No sale solo: estos no aplican' : 'Cuando sale solo', cWaChecked: String(st.cWa), cWaSw: st.cWa ? 'sw-on' : 'sw-off', cToggleWa: set('cWa', !st.cWa), cMailChecked: String(st.cMail), cMailSw: st.cMail ? 'sw-on' : 'sw-off', cToggleMail: set('cMail', !st.cMail),
      rHint: st.receipt ? 'Con cada pago verificado' : 'No sale solo: estos no aplican', rWaChecked: String(st.rWa), rWaSw: st.rWa ? 'sw-on' : 'sw-off', rToggleWa: set('rWa', !st.rWa), rMailChecked: String(st.rMail), rMailSw: st.rMail ? 'sw-on' : 'sw-off', rToggleMail: set('rMail', !st.rMail),
      hsm: st.hsm, hsmChecked: String(st.hsm), hsmSw: st.hsm ? 'sw-on' : 'sw-off', toggleHsm: set('hsm', !st.hsm),
      steps,
      hsmGap: anyWa && !st.hsm,
      summary: papers === 0 ? 'Con esto no sale nada solo: todo lo emites y lo envías tú.' : papers + (papers === 1 ? ' papel sale solo' : ' papeles salen solos') + (sent === 0 ? ' y ninguno se envía.' : '; ' + sent + ' le llegan sin que nadie los mande.'),
      dirty: keys.some((k) => st[k] !== this.saved[k]),
      reset: () => this.setState({ ...this.saved })
    };
  }
}"""


# ─── Oscuro y celular ──────────────────────────────────────────────────────

def oscuro():
    rail_body = p7.pagos_compact() + p7.docs_tile(p7.base_rows(), 2) + p7.actividad()
    overlay = f'<div class="scrim" style="z-index:6;background:rgba(0,0,0,.6)"></div><div style="position:absolute;inset:0;display:grid;place-items:center;z-index:7">{dialog_static("hsm")}</div>'
    return p7.board_page(p7.rail(rail_body, True), True, overlay)


def movil():
    return f"""<div style="width:390px;height:844px;background:var(--bg);overflow:hidden;position:relative">
  <div class="scrim"></div>
  <div style="position:absolute;left:0;right:0;bottom:0">{dialog_static("open", width=390).replace('border-radius:28px', 'border-radius:28px 28px 0 0', 1)}</div>
</div>"""


if __name__ == "__main__":
    write(OUT, "Main.dc.html", page("Enviar documento", enviar(), logic=ENVIAR_LOGIC))
    write(OUT, "Enviado.dc.html", page("Documento en camino", enviado()))
    write(OUT, "Automaticos.dc.html", page("Documentos · automáticos", automaticos(), logic=AUTO_LOGIC))
    write(OUT, "Oscuro.dc.html", page("Enviar · oscuro", oscuro(), dark=True))
    write(OUT, "Movil.dc.html", page("Enviar · celular", movil(), w=390, h=844))
    canvas(OUT, "Cobros premium · F9 Enviar y lo que sale solo", [
        ("Main.dc.html", 1440, 900, "1 · Enviar — el diálogo dice lo mismo que hará el motor (interactivo: canal y los cuatro casos de Ana)", True),
        ("Movil.dc.html", 390, 844, "2 · Celular — hoja desde abajo", False),
        ("Oscuro.dc.html", 1440, 900, "3 · Oscuro — fuera de 24 h, con plantilla", False),
        ("Enviado.dc.html", 1440, 900, "4 · Tras enviar — la fila dice «Enviando…» y el aviso lo confirma", False),
        ("Automaticos.dc.html", 1440, 900, "5 · Mi empresa › Documentos › Automáticos — «Lo que sale solo» (interactivo)", True),
    ], [
        ("Enviar un documento", ["Main.dc.html", "Movil.dc.html", "Oscuro.dc.html"]),
        ("Lo que pasa después y lo que sale solo", ["Enviado.dc.html", "Automaticos.dc.html"]),
    ])
    print("ok")
