#!/usr/bin/env python3
"""Mockup «Enviar documento» (cobros_frontend_plan.md §`documents`, F9).

La idea que ordena estas pantallas: **el diálogo dice lo MISMO que hará el motor**. No es un
formulario de «destinatario»: es una promesa concreta —por dónde va a salir el papel, si llega
directo o con un aviso previo, y qué falta si no puede— que el servidor calcula con las mismas
fuentes que usa para mandar. De ahí:

1. **Dos tarjetas, una elección.** WhatsApp o correo. Cada tarjeta lleva el destino enmascarado
   (la ficha es la única dirección de registro) o la razón por la que no se puede, escrita.
2. **La ventana de 24 h es la protagonista.** Dentro: «el PDF le llega al chat». Fuera, con
   plantilla: «le llega el aviso y el PDF sale cuando responda». Fuera, sin plantilla: no se puede,
   y el enlace lleva a configurarla. El diálogo no adivina: pregunta al servidor.
3. **Lo que ya pasó se dice.** Si el papel ya se envió, la tarjeta lo cuenta; reenviar es legítimo.
4. **La entrega es una tercera línea en la fila**, por canal, como texto con tono: «Enviado por
   WhatsApp · 17 sep», «Enviando…» con un punto que late, «No salió por correo: no tiene correo en
   su ficha». Nunca fondo de color. Un envío que falla ofrece «Reintentar» en la misma línea.
5. **Lo automático se configura donde se emite**: Mi empresa › Documentos gana «Emisión y envío
   automáticos» —cuándo sale el contrato, si el recibo sale solo, por dónde se manda lo que sale
   solo— y la plantilla aprobada de respaldo con su explicación honesta.
6. **Quien no puede enviar, ve.** Sin `documents:manage` las líneas de entrega existen igual.

Uso:  python3 send-document-dialog.build.py   (AXI_MOCKUP_ARTBOARDS_DIR=… exporta artboards)
"""
import importlib.util, pathlib, sys
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from _axi_mockup_kit import Kit  # noqa: E402

# El rail del pedido y sus piezas son los de F8: mismo idioma, mismas filas.
_spec = importlib.util.spec_from_file_location("f8", HERE / "order-rail-documents.build.py")
F8 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(F8)

K = Kit("send-document-dialog")
ic, btn, badge = K.ic, K.btn, K.badge
paper, doc, act, headline, payments_group, items, activity = F8.paper, F8.doc, F8.act, F8.headline, F8.payments_group, F8.items, F8.activity
VER, MORE, TOTAL, SALDO = F8.VER, F8.MORE, F8.TOTAL, F8.SALDO

EXTRA_CSS = F8.EXTRA_CSS + """
/* ── Entrega: la tercera línea de la fila, por canal ───────────────────── */
.doc .dl{grid-column:2 / -1;display:flex;align-items:center;gap:9px;font-size:12.5px;color:var(--muted-foreground);line-height:1.5;margin-top:2px;font-variant-numeric:tabular-nums}
.doc .dl .gl{width:18px;height:18px;border-radius:6px;display:grid;place-items:center;background:var(--secondary);color:var(--muted-foreground);flex:none}
.doc .dl .gl .ic{opacity:1}
.doc .dl b{color:var(--foreground);font-weight:500}
.doc .dl.busy{color:var(--axi-info)}
.doc .dl.busy .gl{background:color-mix(in srgb, var(--axi-info) 12%, transparent);color:var(--axi-info)}
.doc .dl .pulse{width:7px;height:7px;border-radius:50%;background:var(--axi-info);flex:none;animation:pulse 1.4s ease-in-out infinite;margin-left:2px}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.3;transform:scale(.65)}}
.doc .dl.bad{color:var(--axi-destructive)} .doc .dl.bad b{color:var(--axi-destructive)}
.doc .dl.bad .gl{background:color-mix(in srgb, var(--axi-destructive) 10%, transparent);color:var(--axi-destructive)}
.doc .dl.warn{color:var(--axi-warning)} .doc .dl.warn b{color:var(--axi-warning)}
.doc .dl.warn .gl{background:color-mix(in srgb, var(--axi-warning) 12%, transparent);color:var(--axi-warning)}
.doc .dl .btn.xs{height:26px;padding:0 10px;font-size:12px;border-radius:999px;margin-left:auto;flex:none;color:var(--foreground)}
.doc .dl time{white-space:nowrap}

/* ── El diálogo «Enviar» ───────────────────────────────────────────────── */
.dlg-scrim{position:absolute;inset:0;background:var(--scrim);z-index:20;display:grid;place-items:center;padding:24px}
.dlg{width:480px;border-radius:22px;border:1px solid var(--border);background:var(--background);box-shadow:var(--shadow-overlay);padding:24px 24px 20px;display:flex;flex-direction:column;gap:18px;position:relative}
.dlg h2{font-family:var(--font-body);font-size:19px;font-weight:600;letter-spacing:-.012em;display:flex;align-items:center;gap:10px}
.dlg h2 .paper{width:22px;height:28px} .dlg h2 .paper::before{top:4px;left:3px;right:3px} .dlg h2 .paper::after{top:8px;left:3px;right:6px;height:13px}
.dlg .sub{font-size:13px;color:var(--muted-foreground);margin-top:4px;line-height:1.5}
.dlg .sub .num{font-family:var(--font-mono);font-size:12px;color:var(--foreground);opacity:.85}
.dlg .x{position:absolute;right:14px;top:14px}
.chn{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.ch{border:1px solid var(--border);border-radius:16px;padding:14px 14px 13px;text-align:left;display:grid;grid-template-columns:34px minmax(0,1fr);gap:12px;align-items:start;background:var(--background);position:relative;min-height:88px}
.ch .cic{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:var(--secondary);color:var(--foreground)}
.ch .t{font-size:14.5px;font-weight:600;letter-spacing:-.005em;display:flex;align-items:center;gap:8px}
.ch .d{font-size:12.5px;color:var(--muted-foreground);margin-top:3px;line-height:1.45}
.ch .d .mono{font-family:var(--font-mono);font-size:12px;color:var(--foreground);opacity:.85}
.ch .d.reason{color:var(--muted-foreground)}
.ch[aria-checked="true"]{border-color:var(--foreground);box-shadow:0 0 0 1px var(--foreground) inset}
.ch[aria-checked="true"] .cic{background:var(--foreground);color:var(--background)}
.ch[aria-disabled="true"]{opacity:.62;background:color-mix(in srgb, var(--secondary) 50%, transparent)}
.ch .mark{position:absolute;right:12px;top:12px;color:var(--foreground)}
.ch .prev{grid-column:1 / -1;font-size:12px;color:var(--muted-foreground);display:flex;align-items:center;gap:6px;margin-top:-4px}
.ch .prev .ic{color:var(--axi-success)}
.dlg .notice{border-radius:14px;padding:12px 14px;font-size:13px}
.dlg .notice.ok .ic{color:var(--axi-success)}
.dlg .notice b{color:var(--foreground)}
.dlg .notice a{color:var(--foreground);font-weight:500;text-decoration:underline;text-underline-offset:3px}
.other{display:flex;flex-direction:column;gap:8px}
.other .lnk{font-size:13px;color:var(--foreground);font-weight:500;display:inline-flex;align-items:center;gap:6px;text-decoration:none;width:fit-content}
.other .lnk .ic{color:var(--muted-foreground)}
.other .input{height:40px;font-size:14px}
.other .hint{font-size:12px;color:var(--muted-foreground)}
.dlg-foot{display:flex;justify-content:flex-end;gap:8px;padding-top:2px}
.dlg-foot .btn{height:40px;border-radius:12px;padding:0 16px}
.dlg .btn.primary{background:var(--axi-brand);color:var(--axi-on-color)}
.dlg .busyb{opacity:.85}
.spin{width:14px;height:14px;border-radius:50%;border:2px solid color-mix(in srgb, currentColor 30%, transparent);border-top-color:currentColor;animation:spin .9s linear infinite;display:inline-block}
@keyframes spin{to{transform:rotate(360deg)}}

/* ── Móvil: el diálogo es una hoja ─────────────────────────────────────── */
.mobile .dlg{position:absolute;left:0;right:0;bottom:0;width:auto;border-radius:28px 28px 0 0;padding:14px 16px 22px;z-index:6}
.mobile .dlg .grab{margin:0 auto 6px}
.mobile .chn{grid-template-columns:1fr}
.mobile .ch{min-height:0}
.mobile .dlg-foot .btn{flex:1}

/* ── Ajustes: emisión y envío automáticos (lista agrupada, estilo iOS) ─── */
.autos{display:flex;flex-direction:column;gap:22px}
.aset{border:1px solid var(--border);border-radius:22px;background:var(--background);overflow:hidden;box-shadow:0 1px 2px rgb(0 0 0/.03)}
.ah{padding:18px 22px 6px}
.ah .t{font-size:15.5px;font-weight:600;letter-spacing:-.012em}
.ah .s{font-size:12.5px;color:var(--muted-foreground);margin-top:3px;line-height:1.5;max-width:66ch}
.rc{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;padding:12px 22px 18px}
.rcard{border:1px solid var(--border);border-radius:16px;padding:14px 14px 13px;text-align:left;display:flex;flex-direction:column;gap:6px;position:relative;background:var(--background)}
.rcard .t{font-size:14px;font-weight:600;letter-spacing:-.005em;padding-right:24px}
.rcard .d{font-size:12.5px;color:var(--muted-foreground);line-height:1.45}
.rcard[aria-checked="true"]{border-color:var(--foreground);box-shadow:0 0 0 1px var(--foreground) inset}
.rcard .radio{position:absolute;right:12px;top:13px;width:18px;height:18px;border-radius:50%;border:1.5px solid var(--border);display:grid;place-items:center}
.rcard[aria-checked="true"] .radio{border-color:var(--foreground);background:var(--foreground);color:var(--background)}
.arow{display:grid;grid-template-columns:34px minmax(0,1fr) auto;gap:14px;align-items:center;padding:14px 22px;position:relative}
.arow + .arow::before{content:"";position:absolute;left:70px;right:0;top:0;height:1px;background:var(--border-soft)}
.arow .gl{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:var(--secondary);color:var(--foreground)}
.arow .t{font-size:14px;font-weight:500}
.arow .d{font-size:12.5px;color:var(--muted-foreground);margin-top:2px;line-height:1.45;max-width:62ch}
.arow .d.warn{color:var(--axi-warning);display:flex;gap:6px;align-items:center}
.arow .d b{color:var(--foreground);font-weight:500}
.arow .sw{width:44px;height:26px} .arow .sw::after{width:22px;height:22px;top:2px;left:2px} .arow .sw[aria-checked="true"]::after{transform:translateX(18px)}
.hsm{display:grid;grid-template-columns:minmax(0,1fr) 130px;gap:12px;padding:8px 22px 20px}
.hsm .input{font-family:var(--font-mono);font-size:13px;height:42px;border-radius:12px}
.hsm .lbl{font-size:12.5px;color:var(--muted-foreground);margin-bottom:6px;display:block}
.hsm .full{grid-column:1 / -1;font-size:12.5px;color:var(--muted-foreground);line-height:1.55}
.hsm .full b{color:var(--foreground);font-weight:500}
"""

# ----------------------------------------------------------------------------- fila + entrega
def dline(tone: str, icon: str, text: str, action: str = "") -> str:
    glyph = f'<span class="gl">{ic(icon or ("message-circle" if "WhatsApp" in text else "mail"), size=12)}</span>'
    lead = glyph + ('<span class="pulse"></span>' if tone == "busy" else "")
    return f'<div class="dl {tone}">{lead}<span>{text}</span>{action}</div>'


def doc_with(kind: str, num: str, when: str, lines: list[str], state: str = "ok", acts: str = "", cls: str = "", extra: str = "") -> str:
    base = doc(kind, num, when, state, extra, acts, cls)
    return base.replace('<div class="acts">', "".join(lines) + '<div class="acts">', 1) if lines else base


LINES = {
    "wa_sent": dline("ok", "message-circle", "Enviado por <b>WhatsApp</b> · <time>17 sep, 10:24</time>"),
    "mail_sent": dline("ok", "mail", "Enviado por <b>correo</b> a la***@example.com · <time>17 sep, 10:24</time>"),
    "wa_busy": dline("busy", "", "Enviando por WhatsApp…"),
    "wa_hsm": dline("ok", "message-circle", "Salió el <b>aviso</b> por WhatsApp · el PDF llega cuando responda"),
    "wa_failed": dline("bad", "triangle-alert", "<b>No se pudo enviar</b> por WhatsApp", act("Reintentar", "rotate-ccw", "outline")),
    "wa_skipped": dline("warn", "clock", "<b>No salió</b> por WhatsApp: no ha escrito en más de 24 h", act("Enviar por correo", "mail", "outline")),
    "mail_skipped": dline("warn", "mail", "<b>No salió</b> por correo: no tiene correo en su ficha"),
    "mail_busy": dline("busy", "", "Enviando por correo…"),
}


def docs_delivery(variant: str, can_manage: bool = True) -> str:
    emitir = btn("Emitir", "plus", "outline xs") if can_manage else ""
    head = f'<div class="rsec-h"><h3>Documentos</h3>{emitir}</div>'
    both = VER + (MORE if can_manage else "")
    if variant == "base":
        rows = "".join([
            doc_with("Contrato", "CTR-2026-0120", "16 sep", [], "ok", both, extra="2 págs."),
            doc_with("Recibo", "REC-2026-0113", "16 sep", [LINES["wa_sent"]], "ok", both),
        ])
        foot = '<p class="gfoot">El recibo salió <b>solo</b> con el pago verificado. El contrato lo mandas tú: «…» › Enviar.</p>'
    elif variant == "sending":
        rows = "".join([
            doc_with("Contrato", "CTR-2026-0120", "16 sep", [LINES["wa_busy"]], "ok", both, extra="2 págs."),
            doc_with("Recibo", "REC-2026-0113", "16 sep", [LINES["wa_sent"]], "ok", both),
        ])
        foot = ""
    elif variant == "states":
        rows = "".join([
            doc_with("Contrato", "CTR-2026-0120", "16 sep", [LINES["wa_sent"], LINES["mail_sent"]], "ok", both, extra="2 págs."),
            doc_with("Recibo", "REC-2026-0113", "16 sep", [LINES["wa_hsm"], LINES["mail_skipped"]], "ok", both),
            doc_with("Cuenta de cobro", "CC-2026-0002", "17 sep", [LINES["wa_failed"] if can_manage else dline("bad", "triangle-alert", "<b>No se pudo enviar</b> por WhatsApp")], "ok", both),
            doc_with("Estado de cuenta", "EDC-2026-0003", "hoy, 9:12", [LINES["wa_skipped"] if can_manage else dline("warn", "clock", "<b>No salió</b> por WhatsApp: no ha escrito en más de 24 h")], "ok", both),
            doc_with("Contrato", "CTR-2026-0118", "16 sep", [dline("ok", "message-circle", "Enviado por <b>WhatsApp</b> · <time>12 sep</time>")], "gone", VER, cls="dim"),
        ])
        foot = ('<p class="gfoot">Cada línea es un <b>hecho</b>: lo que salió, por dónde y cuándo; lo que no salió, y por qué. Un reemplazado que se envió sigue diciéndolo.</p>'
                if can_manage else
                '<p class="gfoot">Puedes abrir los papeles. Emitirlos o enviarlos es de <b>supervisión</b>: gasta un consecutivo y le escribe al cliente.</p>')
    else:
        rows, foot = "", ""
    return f'<section class="rsec" aria-label="Documentos" style="position:relative">{head}<div class="group">{rows}{foot}</div></section>'


def sheet(variant: str = "base", can_manage: bool = True, toast: str = "") -> str:
    return f"""<aside class="sheet" aria-label="Pedido JX-0042">
      <div class="sheet-top">
        <div><p class="id">JX-0042</p><p class="who">Laura Gómez</p><p class="where">Expedición Cocuy · 2 cupos · sale el 14 mar</p></div>
        {badge("Abonado", "warn")}
      </div>
      <div class="sheet-body">
        {headline()}
        {payments_group()}
        {docs_delivery(variant, can_manage)}
        <p class="origin">Cotizado en <b>US$ 7.000</b>. El total quedó fijo el 16 de septiembre a <b>3.100,45</b> por dólar.</p>
      </div>
      {toast}
    </aside>"""


def order_page(variant: str = "base", can_manage: bool = True, toast: str = "", overlay: str = "") -> str:
    return f"""<div class="split" style="position:relative;min-height:1000px">
      <div class="content">
        <div class="page-head"><h1>Pedido JX-0042</h1><p class="sub">Laura Gómez · llegó por WhatsApp el 16 de septiembre</p></div>
        {items()}
        {activity()}
      </div>
      {sheet(variant, can_manage, toast)}
      {overlay}
    </div>"""


# ----------------------------------------------------------------------------- el diálogo
def channel_card(kind: str, title: str, desc: str, checked: bool, disabled: bool = False, prev: str = "", reason: bool = False) -> str:
    icon = "message-circle" if kind == "whatsapp" else "mail"
    mark = f'<span class="mark">{ic("circle-check", size=16)}</span>' if checked else ""
    p = f'<span class="prev">{ic("circle-check", size=12)}{prev}</span>' if prev else ""
    return f"""<button class="ch" role="radio" aria-checked="{str(checked).lower()}" aria-disabled="{str(disabled).lower()}">
      <span class="cic">{ic(icon, size=17)}</span>
      <span><span class="t">{title}</span><span class="d {'reason' if reason else ''}">{desc}</span></span>{mark}{p}
    </button>"""


def dialog(mode: str = "open", kind: str = "Contrato", num: str = "CTR-2026-0120", mobile: bool = False) -> str:
    """mode: open | no-email | hsm | no-hsm | other-email | sending"""
    wa_open = channel_card("whatsapp", "WhatsApp", '<span class="mono">+57 ··· 0199</span> · escribió hace 3 h', True)
    mail_ok = channel_card("email", "Correo", '<span class="mono">la···@example.com</span>', False)
    mail_none = channel_card("email", "Correo", "No tiene correo en su ficha. Añádelo en el contacto para mandarlo por aquí.", False, True, reason=True)
    if mode == "no-email":
        cards, notice, other, primary = wa_open, K.notice("ok", "Escribió hace 3 horas: la ventana de 24 h está abierta y <b>el PDF le llega al chat</b>, con una línea que lo presenta."), "", "Enviar por WhatsApp"
    elif mode == "hsm":
        wa = channel_card("whatsapp", "WhatsApp", '<span class="mono">+57 ··· 0199</span> · no ha escrito en 2 días', True)
        cards = wa + mail_ok
        notice = K.notice("info", "Lleva más de 24 h sin escribir, así que WhatsApp no deja mandar el PDF directo. Le llegará la plantilla <b>«documento_listo»</b> y <b>el PDF sale solo cuando responda</b>.")
        other, primary = "", "Enviar por WhatsApp"
    elif mode == "no-hsm":
        wa = channel_card("whatsapp", "WhatsApp", "No ha escrito en más de 24 h y no hay una plantilla aprobada configurada.", False, True, reason=True)
        mail = channel_card("email", "Correo", '<span class="mono">la···@example.com</span>', True)
        cards = wa + mail
        notice = K.notice("warn", "Fuera de las 24 h, WhatsApp solo deja salir una <b>plantilla aprobada de Meta</b>. <a href=\"#\">Configurar plantilla</a> en Mi empresa › Documentos, o mandarlo por correo.")
        other, primary = "", "Enviar por correo"
    elif mode == "other-email":
        wa = channel_card("whatsapp", "WhatsApp", '<span class="mono">+57 ··· 0199</span> · escribió hace 3 h', False)
        mail = channel_card("email", "Correo", '<span class="mono">la···@example.com</span>', True, prev="Ya se envió por correo el 12 sep")
        cards = wa + mail
        notice = ""
        other = f"""<div class="other">
          <a class="lnk" href="#" aria-expanded="true">{ic("chevron-down", size=14)}Usar otro correo solo esta vez</a>
          {K.input("contabilidad@cocuytravel.co", "", "", "at-sign")}
          <p class="hint">La ficha del contacto no cambia: este destino es solo para este envío.</p>
        </div>"""
        primary = "Enviar por correo"
    elif mode == "sending":
        cards, notice, other, primary = wa_open + mail_ok, K.notice("ok", "Escribió hace 3 horas: la ventana de 24 h está abierta y <b>el PDF le llega al chat</b>."), "", ""
    else:
        cards, notice, other, primary = wa_open + mail_ok, K.notice("ok", "Escribió hace 3 horas: la ventana de 24 h está abierta y <b>el PDF le llega al chat</b>, con una línea que lo presenta."), "", "Enviar por WhatsApp"
    if mode == "no-email":
        cards = wa_open + mail_none
    foot_btn = (f'<button class="btn primary busyb" aria-disabled="true"><span class="spin"></span>Enviando…</button>' if mode == "sending"
                else btn(primary, "send", "primary"))
    grab = '<div class="grab"></div>' if mobile else ""
    close = "" if mobile else btn("", "x", "ghost icon sm x", 'aria-label="Cerrar"')
    return f"""<div class="dlg" role="dialog" aria-modal="true" aria-labelledby="dlg-t">
      {grab}{close}
      <div><h2 id="dlg-t">{paper(kind)}Enviar {kind.lower()}</h2>
        <p class="sub"><span class="num">{num}</span> de la reserva JX-0042 · a <b>Laura Gómez</b></p></div>
      <div class="chn" role="radiogroup" aria-label="Por dónde">{cards}</div>
      {notice}{other}
      <div class="dlg-foot">{btn("Volver", "", "ghost")}{foot_btn}</div>
    </div>"""


def overlay(mode: str) -> str:
    return f'<div class="dlg-scrim">{dialog(mode)}</div>'


def sending_toast() -> str:
    return f"""<div class="toast ok" role="status" style="position:absolute;left:26px;right:26px;bottom:22px;width:auto">{paper("Contrato")}
      <div><b>Contrato CTR-2026-0120 en camino por WhatsApp</b><small>Te avisamos aquí si no sale.</small></div>{act("Ver chat", "", "outline")}</div>"""


# ----------------------------------------------------------------------------- ajustes
def settings_auto() -> str:
    tabs = K.nav([("General", "building-2"), ("Sucursales", "map-pin"), ("Funciones", "toggle-right"), ("Documentos", "file-text")],
                 "Documentos", "Ajustes de la empresa")

    def rcard(t: str, d: str, on: bool) -> str:
        mark = ic("check", size=11) if on else ""
        return f'<button class="rcard" role="radio" aria-checked="{str(on).lower()}"><span class="radio">{mark}</span><span class="t">{t}</span><span class="d">{d}</span></button>'

    def arow(t: str, d: str, on: bool, warn: str = "", icon: str = "file-text") -> str:
        w = f'<p class="d warn">{ic("triangle-alert", size=12)}{warn}</p>' if warn else ""
        return f'<div class="arow"><span class="gl">{ic(icon, size=16)}</span><div><p class="t">{t}</p><p class="d">{d}</p>{w}</div>{K.switch(on, label=t)}</div>'

    issue = f"""<div class="aset">
      <div class="ah"><p class="t">Cuándo se emite el contrato</p><p class="s">Sale con los datos del pedido de ese momento y su consecutivo. Se manda según los interruptores de abajo.</p></div>
      <div class="rc" role="radiogroup" aria-label="Cuándo se emite el contrato">
        {rcard("Nunca solo", "Lo emites tú desde el pedido, cuando quieras.", False)}
        {rcard("Al confirmar el pedido", "En cuanto el pedido pasa a confirmado, con o sin dinero.", False)}
        {rcard("Al verificar el anticipo", "Con plan de pagos, cuando la cuota del anticipo queda saldada. Sin plan, con el primer pago verificado.", True)}
      </div>
      {arow("Recibo automático", "Con cada pago verificado sale un recibo a nombre del cliente.", True, icon="receipt")}
    </div>"""
    send = f"""<div class="aset">
      <div class="ah"><p class="t">Por dónde se manda lo que sale solo</p><p class="s">Aplica a lo que se <b>emite solo</b>. Lo que emites tú se manda desde el pedido, eligiendo el canal.</p></div>
      {arow("Contrato · WhatsApp", "Al quedar listo, le llega al chat como PDF.", True, icon="message-circle")}
      {arow("Contrato · correo", "Solo si el contacto tiene correo en su ficha; si no, la fila del pedido lo dice.", False, icon="mail")}
      {arow("Recibo · WhatsApp", "Cada recibo, al quedar listo.", True, "Fuera de las 24 h no saldrá el PDF hasta que configures la plantilla de abajo.", icon="message-circle")}
      {arow("Recibo · correo", "Solo si el contacto tiene correo en su ficha.", True, icon="mail")}
    </div>"""
    hsm = f"""<div class="aset">
      <div class="ah"><p class="t">Plantilla aprobada de respaldo</p><p class="s">WhatsApp solo deja escribir libremente durante 24 h desde el último mensaje del cliente. Pasadas, sale esta plantilla y <b>el PDF cuando responda</b>.</p></div>
      <div class="hsm">
        <div><span class="lbl">Nombre de la plantilla en Meta</span>{K.input("", "documento_listo", "", "file-text")}</div>
        <div><span class="lbl">Idioma</span>{K.input("", "es")}</div>
        <p class="full">Tiene que ser una plantilla <b>sin variables</b>: los ajustes solo guardan nombre e idioma, así que su texto debe valer para cualquier documento («tu documento está listo; respóndenos y te lo enviamos»). Vacío = fuera de las 24 h no se manda nada, y la fila lo dice.</p>
      </div>
    </div>"""
    return f"""<div class="setwrap">
      <div class="topbar"><p class="ttl">Mi empresa</p><span class="small muted">JuanitoXpeditions · agencia de expediciones</span></div>
      {tabs}
      <div class="two">
        <div class="autos">
          <p class="set-title">{ic("zap", size=14)}Emisión y envío automáticos<span class="n">3 ajustes</span></p>
          {issue}{send}{hsm}
          <div class="savebar">{btn("Descartar", "", "ghost")}{btn("Guardar ajustes", "")}</div>
        </div>
        <aside class="side-note">
          <h4>{ic("info", size=15)}Lo que cambia y lo que no</h4>
          Un interruptor de envío actúa sobre lo que se emite <b>desde ahora</b>; lo ya emitido no se reenvía solo.
          <br><br>Lo que sale solo lleva el mismo papel, número y datos que si lo emitieras tú. En la fila del pedido se ve igual: quién lo pidió (el sistema), por dónde salió y cuándo.
          <br><br>Si un envío automático no sale —sin correo, fuera de las 24 h sin plantilla, canal caído—, te avisa la campanita y la fila del pedido dice el motivo.
        </aside>
      </div>
    </div>"""


# ----------------------------------------------------------------------------- móvil
def mobile() -> str:
    return f"""<div class="mobile">
      <div class="grab"></div>
      <div class="m-top"><div><p class="id">JX-0042</p><p class="who">Laura Gómez</p></div>{btn("", "x", "ghost icon sm", 'aria-label="Cerrar"')}</div>
      <div class="m-body">
        {headline()}
        {docs_delivery("base")}
      </div>
      <div class="scrim"></div>
      {dialog("open", mobile=True)}
    </div>"""


VIEWS = [
    ("enviar", "1 · Enviar", order_page("base", overlay=overlay("open")),
     "«…» › Enviar abre el diálogo sobre el rail. Dos tarjetas: WhatsApp (número enmascarado, «escribió hace 3 h») y correo (dirección enmascarada). El aviso bajo el grupo lo escribe el servidor con las mismas fuentes que usará para mandar: la ventana está abierta y el PDF le llega al chat. El botón nombra el canal: «Enviar por WhatsApp»."),
    ("sin-correo", "2 · Sin correo", order_page("base", overlay=overlay("no-email")),
     "La ficha no tiene correo: la tarjeta se deshabilita CON la razón y la salida honesta («añádelo en el contacto»). No hay campo para inventarse una dirección: la ficha es la única dirección de registro."),
    ("hsm", "3 · Fuera de 24 h, con plantilla", order_page("base", overlay=overlay("hsm")),
     "El cliente lleva días sin escribir. WhatsApp sigue disponible, pero el aviso dice exactamente qué pasará: le llega la plantilla aprobada y el PDF sale solo cuando responda. Es lo que el motor hará; el diálogo no lo suaviza."),
    ("sin-hsm", "4 · Fuera de 24 h, sin plantilla", order_page("base", overlay=overlay("no-hsm")),
     "Sin plantilla configurada, WhatsApp no puede: la tarjeta lo dice y el aviso enlaza a configurarla (solo con permiso de plantillas). El correo queda como camino y el botón cambia de nombre."),
    ("otro-correo", "5 · Otro correo", order_page("base", overlay=overlay("other-email")),
     "Con correo en la ficha, se puede usar otro «solo esta vez» (contabilidad, un familiar) sin tocar la ficha. La tarjeta recuerda que ya se envió el 12 de septiembre: reenviar es legítimo y se dice."),
    ("en-camino", "6 · En camino", order_page("sending", toast=sending_toast()),
     "Al confirmar, el diálogo se cierra y la fila gana la tercera línea: un glifo del canal en cápsula y «Enviando por WhatsApp…» con un punto que late (tono info, sin fondo). El aviso discreto dice a dónde va, ofrece «Ver chat» y promete avisar si no sale. La fila cambia sola cuando el proveedor confirma."),
    ("estados", "7 · Estados de entrega", order_page("states"),
     "Una línea por canal, como texto con tono: enviado (gris, con fecha), «salió el aviso» (el HSM; el PDF llega cuando responda), no salió por correo (ámbar, con la razón), no se pudo enviar (rojo, «Reintentar»), no salió por ventana («Enviar por correo» como salida). Un reemplazado que SÍ se envió sigue diciéndolo."),
    ("solo-ver", "7b · Solo ver", order_page("states", can_manage=False),
     "Sin `documents:manage` las líneas existen igual —son hechos— pero sin botones: el pie dice por qué. Nada deshabilitado: lo que no se puede, no está."),
    ("ajustes", "8 · Ajustes", settings_auto(),
     "Mi empresa › Documentos gana «Emisión y envío automáticos»: cuándo sale el contrato (tres opciones excluyentes; «al verificar el anticipo» explica el caso con plan y sin plan), el recibo automático, los cuatro interruptores de envío (solo para lo que sale solo) con la pista de dependencia con la plantilla, y la plantilla aprobada de respaldo con su regla honesta: sin variables."),
    ("oscuro", "9 · Oscuro", order_page("base", overlay=overlay("hsm")),
     "Mismos tokens; el papel sigue blanco, las tarjetas se marcan con borde, nunca con fondo de color."),
    ("movil", "10 · Móvil", mobile(),
     "En el móvil el diálogo es una hoja desde abajo: las dos tarjetas apiladas, el aviso y el botón a todo el ancho."),
]

if __name__ == "__main__":
    K.extra_css = EXTRA_CSS
    K.build_html("Enviar documento", "Mockup F0 · no es producto", "Cobros · F9 «Emisión automática y entrega»", VIEWS)
    K.export_artboards([
        {"file": "Main.dc.html", "title": "Enviar · el diálogo dice lo que hará el motor", "body": order_page("base", overlay=overlay("open")), "w": 1440, "h": 1000},
        {"file": "sin-correo.dc.html", "title": "Sin correo · la tarjeta dice por qué", "body": order_page("base", overlay=overlay("no-email")), "w": 1440, "h": 1000},
        {"file": "fuera-24h-plantilla.dc.html", "title": "Fuera de 24 h · sale el aviso, el PDF cuando responda", "body": order_page("base", overlay=overlay("hsm")), "w": 1440, "h": 1000},
        {"file": "fuera-24h-sin-plantilla.dc.html", "title": "Fuera de 24 h sin plantilla · configurar o correo", "body": order_page("base", overlay=overlay("no-hsm")), "w": 1440, "h": 1000},
        {"file": "otro-correo.dc.html", "title": "Otro correo solo esta vez · ya se envió antes", "body": order_page("base", overlay=overlay("other-email")), "w": 1440, "h": 1000},
        {"file": "en-camino.dc.html", "title": "En camino · la fila late, el aviso es discreto", "body": order_page("sending", toast=sending_toast()), "w": 1440, "h": 1000},
        {"file": "estados.dc.html", "title": "Estados de entrega · una línea por canal, hechos", "body": order_page("states"), "w": 1440, "h": 1120},
        {"file": "solo-ver.dc.html", "title": "Solo ver · las líneas existen, sin botones", "body": order_page("states", can_manage=False), "w": 1440, "h": 1120},
        {"file": "ajustes.dc.html", "title": "Mi empresa › Documentos · Emisión y envío automáticos", "body": settings_auto(), "w": 1440, "h": 1180},
        {"file": "oscuro.dc.html", "title": "Oscuro · borde, nunca fondo", "body": order_page("base", overlay=overlay("hsm")), "w": 1440, "h": 1000, "dark": True},
        {"file": "movil.dc.html", "title": "Móvil · el diálogo es una hoja", "body": mobile(), "w": 460, "h": 900},
    ])
