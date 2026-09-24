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

/* ── El diálogo «Enviar»: cristal, una acción, y la vista previa de cómo llega ── */
.dlg-scrim{position:absolute;inset:0;background:color-mix(in srgb, var(--foreground) 22%, transparent);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);z-index:20;display:grid;place-items:center;padding:24px}
.dlg{width:500px;border-radius:28px;border:1px solid color-mix(in srgb, var(--border) 70%, transparent);background:color-mix(in srgb, var(--background) 88%, transparent);backdrop-filter:blur(28px) saturate(1.4);-webkit-backdrop-filter:blur(28px) saturate(1.4);box-shadow:0 30px 80px -20px rgb(0 0 0/.35),0 2px 6px rgb(0 0 0/.06);padding:26px 26px 22px;display:flex;flex-direction:column;gap:20px;position:relative}
.dlg h2{font-family:var(--font-heading);font-size:24px;font-weight:700;letter-spacing:-.02em;line-height:1.1;display:flex;align-items:center;gap:12px}
.dlg h2 .paper{width:26px;height:33px;border-radius:3px} .dlg h2 .paper::before{top:5px;left:4px;right:4px} .dlg h2 .paper::after{top:10px;left:4px;right:7px;height:15px}
.dlg .sub{font-size:13.5px;color:var(--muted-foreground);margin-top:6px;line-height:1.5}
.dlg .sub .num{font-family:var(--font-mono);font-size:12.5px;color:var(--foreground);opacity:.85}
.dlg .sub b{color:var(--foreground);font-weight:500}
.dlg .x{position:absolute;right:16px;top:16px;width:30px;height:30px;border-radius:50%;background:var(--secondary);color:var(--muted-foreground)}
.dlg .x:hover{color:var(--foreground)}

/* Selector: dos tarjetas que se sienten como botones de iOS */
.chn{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.ch{border:1px solid var(--border);border-radius:18px;padding:14px 14px 13px;text-align:left;display:grid;grid-template-columns:38px minmax(0,1fr);gap:12px;align-items:start;background:var(--background);position:relative;min-height:90px;transition:transform .15s var(--ease),box-shadow .15s var(--ease)}
.ch:hover{transform:translateY(-1px);box-shadow:var(--shadow-float)}
.ch .cic{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;background:var(--secondary);color:var(--foreground)}
.ch .t{font-size:14.5px;font-weight:600;letter-spacing:-.005em;display:flex;align-items:center;gap:8px}
.ch .d{font-size:12.5px;color:var(--muted-foreground);margin-top:3px;line-height:1.45}
.ch .d .mono{font-family:var(--font-mono);font-size:12px;color:var(--foreground);opacity:.85}
.ch .live{display:inline-flex;align-items:center;gap:5px}
.ch .live::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--axi-success)}
.ch .cold::before{background:var(--axi-warning)}
.ch[aria-checked="true"]{border-color:var(--axi-brand);box-shadow:0 0 0 1px var(--axi-brand) inset,0 10px 30px -14px color-mix(in srgb, var(--axi-brand) 60%, transparent)}
.ch[aria-checked="true"] .cic{background:var(--axi-brand);color:var(--axi-on-color)}
.ch[aria-disabled="true"]{opacity:.6;background:color-mix(in srgb, var(--secondary) 55%, transparent);box-shadow:none;transform:none}
.ch .mark{position:absolute;right:11px;top:11px;width:20px;height:20px;border-radius:50%;background:var(--axi-brand);color:var(--axi-on-color);display:grid;place-items:center}
.ch .prev{grid-column:1 / -1;font-size:12px;color:var(--muted-foreground);display:flex;align-items:center;gap:6px;margin-top:-4px}
.ch .prev .ic{color:var(--axi-success)}

/* La vista previa: así le llega. Es el elemento memorable del diálogo. */
.arrive{border-radius:20px;background:var(--secondary);padding:14px 16px 14px;display:flex;flex-direction:column;gap:10px;position:relative;overflow:hidden}
.arrive .cap{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:12px;color:var(--muted-foreground);letter-spacing:.01em}
.arrive .cap b{color:var(--foreground);font-weight:500}
.arrive .cap .st{display:inline-flex;align-items:center;gap:6px;font-weight:500}
.arrive .cap .st.ok{color:var(--axi-success)} .arrive .cap .st.warn{color:var(--axi-warning)} .arrive .cap .st.info{color:var(--axi-info)}
.arrive .cap .st .dot{width:6px;height:6px;border-radius:50%;background:currentColor}
.bubble{max-width:330px;border-radius:18px 18px 18px 6px;background:var(--background);box-shadow:0 1px 2px rgb(0 0 0/.06),0 6px 18px -10px rgb(0 0 0/.18);padding:10px 12px 9px;display:flex;flex-direction:column;gap:8px;position:relative}
.bubble .file{display:grid;grid-template-columns:30px minmax(0,1fr);gap:10px;align-items:center;padding:8px 10px;border-radius:12px;background:var(--secondary)}
.bubble .file .fn{font-size:13px;font-weight:500;font-family:var(--font-mono);letter-spacing:0}
.bubble .file .fs{font-size:11.5px;color:var(--muted-foreground);margin-top:1px}
.bubble .txt{font-size:13.5px;line-height:1.45}
.bubble .meta{font-size:11px;color:var(--muted-foreground);display:flex;justify-content:flex-end;gap:5px;align-items:center;font-variant-numeric:tabular-nums}
.bubble .meta .ic{color:var(--axi-info)}
.bubble.tpl{border:1px dashed var(--border);box-shadow:none;background:transparent}
.bubble.ghost{opacity:.55;border:1px dashed var(--border);box-shadow:none;background:transparent}
.bubble.ghost .file{background:transparent;border:1px dashed var(--border)}
.then{font-size:12px;color:var(--muted-foreground);display:flex;align-items:center;gap:8px;padding-left:6px}
.then .ic{color:var(--muted-foreground)}
.mailprev{border-radius:16px;background:var(--background);box-shadow:0 1px 2px rgb(0 0 0/.06),0 6px 18px -10px rgb(0 0 0/.18);padding:12px 14px;display:flex;flex-direction:column;gap:6px}
.mailprev .row1{display:flex;justify-content:space-between;gap:10px;font-size:12.5px;color:var(--muted-foreground)}
.mailprev .row1 b{color:var(--foreground);font-weight:600;font-size:13.5px}
.mailprev .subj{font-size:14px;font-weight:500;letter-spacing:-.005em}
.mailprev .att{display:inline-flex;align-items:center;gap:8px;height:30px;padding:0 10px 0 6px;border-radius:9px;background:var(--secondary);font-size:12.5px;width:fit-content;margin-top:2px}
.mailprev .att .paper{width:16px;height:20px;border-radius:2px} .mailprev .att .paper::before{top:3px;left:2px;right:2px} .mailprev .att .paper::after{top:6px;left:2px;right:4px;height:9px}
.mailprev .att .fn{font-family:var(--font-mono);font-size:12px}
.arrive .cant{display:flex;gap:12px;align-items:flex-start;font-size:13px;line-height:1.5;color:var(--muted-foreground)}
.arrive .cant .ic{color:var(--axi-warning);flex:none;margin-top:2px}
.arrive .cant b{color:var(--foreground);font-weight:500}
.arrive .cant a{color:var(--foreground);font-weight:500;text-decoration:underline;text-underline-offset:3px}
.arrive.sending::after{content:"";position:absolute;inset:0;background:linear-gradient(100deg,transparent 30%,color-mix(in srgb, var(--background) 55%, transparent) 50%,transparent 70%);animation:shimmer 1.6s linear infinite}
@keyframes shimmer{0%{transform:translateX(-60%)}100%{transform:translateX(60%)}}

.other{display:flex;flex-direction:column;gap:8px}
.other .lnk{font-size:13px;color:var(--foreground);font-weight:500;display:inline-flex;align-items:center;gap:6px;text-decoration:none;width:fit-content}
.other .lnk .ic{color:var(--muted-foreground)}
.other .input{height:44px;font-size:14.5px;border-radius:14px}
.other .hint{font-size:12px;color:var(--muted-foreground)}
.dlg-foot{display:flex;justify-content:flex-end;gap:10px;padding-top:2px;align-items:center}
.dlg-foot .btn{height:44px;border-radius:999px;padding:0 18px;font-size:14.5px}
.dlg .btn.primary{background:var(--axi-brand);color:var(--axi-on-color);box-shadow:0 10px 24px -12px color-mix(in srgb, var(--axi-brand) 80%, transparent)}
.dlg .busyb{opacity:.85}
.spin{width:14px;height:14px;border-radius:50%;border:2px solid color-mix(in srgb, currentColor 30%, transparent);border-top-color:currentColor;animation:spin .9s linear infinite;display:inline-block}
@keyframes spin{to{transform:rotate(360deg)}}

/* ── Móvil: el diálogo es una hoja ─────────────────────────────────────── */
.mobile .dlg{position:absolute;left:0;right:0;bottom:0;width:auto;border-radius:30px 30px 0 0;padding:12px 16px 24px;z-index:6;gap:16px}
.mobile .dlg .grab{margin:0 auto 4px}
.mobile .chn{grid-template-columns:1fr}
.mobile .ch{min-height:0}
.mobile .bubble{max-width:100%}
.mobile .dlg-foot .btn{flex:1}

/* ── Ajustes: emisión y envío automáticos (lista agrupada, estilo iOS) ─── */
.autos{display:flex;flex-direction:column;gap:22px}
.aset{border:1px solid var(--border);border-radius:22px;background:var(--background);overflow:hidden;box-shadow:0 1px 2px rgb(0 0 0/.03)}
.ah{padding:18px 22px 6px}
.ah .t{font-size:15.5px;font-weight:600;letter-spacing:-.012em}
.ah .s{font-size:12.5px;color:var(--muted-foreground);margin-top:3px;line-height:1.5;max-width:66ch}
.rc{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;padding:12px 22px 18px}
.rcard{border:1px solid var(--border);border-radius:16px;padding:14px 14px 13px;text-align:left;display:flex;flex-direction:column;gap:6px;position:relative;background:var(--background);transition:transform .15s var(--ease),box-shadow .15s var(--ease)}
.rcard:hover{transform:translateY(-1px);box-shadow:var(--shadow-float)}
.rcard .t{font-size:14px;font-weight:600;letter-spacing:-.005em;padding-right:24px}
.rcard .d{font-size:12.5px;color:var(--muted-foreground);line-height:1.45}
.rcard[aria-checked="true"]{border-color:var(--axi-brand);box-shadow:0 0 0 1px var(--axi-brand) inset}
.rcard .radio{position:absolute;right:12px;top:13px;width:18px;height:18px;border-radius:50%;border:1.5px solid var(--border);display:grid;place-items:center}
.rcard[aria-checked="true"] .radio{border-color:var(--axi-brand);background:var(--axi-brand);color:var(--axi-on-color)}
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
    mark = f'<span class="mark">{ic("check", size=12)}</span>' if checked else ""
    p = f'<span class="prev">{ic("circle-check", size=12)}{prev}</span>' if prev else ""
    return f"""<button class="ch" role="radio" aria-checked="{str(checked).lower()}" aria-disabled="{str(disabled).lower()}">
      <span class="cic">{ic(icon, size=18)}</span>
      <span><span class="t">{title}</span><span class="d {'reason' if reason else ''}">{desc}</span></span>{mark}{p}
    </button>"""


def bubble(kind: str, num: str, caption: str, pages: str = "2 páginas · 184 KB", cls: str = "", meta: str = "10:24") -> str:
    return f"""<div class="bubble {cls}">
      <div class="file">{paper(kind)}<div><p class="fn">{num}.pdf</p><p class="fs">{pages}</p></div></div>
      <p class="txt">{caption}</p>
      <p class="meta">{meta}{ic("check-check", size=13)}</p>
    </div>"""


def arrive(mode: str, kind: str, num: str) -> str:
    """La vista previa de cómo le llega el papel: es la promesa del diálogo, dibujada."""
    caption = f"Hola Laura, aquí está tu {kind.lower()} {num} de la reserva JX-0042."
    if mode in ("open", "no-email", "sending"):
        st = '<span class="st ok"><span class="dot"></span>Ventana abierta · escribió hace 3 h</span>'
        body = bubble(kind, num, caption)
        return f'<div class="arrive {"sending" if mode == "sending" else ""}"><div class="cap"><b>Así le llega</b> por WhatsApp{st}</div>{body}</div>'
    if mode == "hsm":
        st = '<span class="st warn"><span class="dot"></span>Ventana cerrada · no ha escrito en 2 días</span>'
        tpl = f"""<div class="bubble tpl"><p class="txt">Hola Laura, tu {kind.lower()} de Cocuy Travel ya está listo. Respóndenos y te lo enviamos por aquí.</p><p class="meta">plantilla <b>documento_listo</b></p></div>"""
        then = f'<p class="then">{ic("corner-down-right", size=14)}Cuando responda, sale el PDF <b>solo</b>:</p>'
        ghost = bubble(kind, num, caption, cls="ghost", meta="al responder")
        return f'<div class="arrive"><div class="cap"><b>Así le llega</b> por WhatsApp{st}</div>{tpl}{then}{ghost}</div>'
    if mode == "no-hsm":
        st = '<span class="st warn"><span class="dot"></span>Ventana cerrada</span>'
        cant = f"""<div class="cant">{ic("clock", size=16)}<p>Lleva más de 24 h sin escribir y WhatsApp solo deja salir una <b>plantilla aprobada de Meta</b>. Aún no hay una configurada: <a href="#">configurar plantilla</a> en Mi empresa › Documentos, o mandarlo por correo.</p></div>"""
        return f'<div class="arrive"><div class="cap"><b>Por WhatsApp no puede salir</b>{st}</div>{cant}</div>'
    if mode == "other-email":
        mail = f"""<div class="mailprev">
          <div class="row1"><b>Cocuy Travel S.A.S.</b><span>para contabilidad@cocuytravel.co</span></div>
          <p class="subj">Cocuy Travel S.A.S.: tu {kind.lower()} {num}</p>
          <span class="att">{paper(kind)}<span class="fn">{num}.pdf</span></span>
        </div>"""
        return f'<div class="arrive"><div class="cap"><b>Así le llega</b> por correo<span class="st info"><span class="dot"></span>Responde a reservas@cocuytravel.co</span></div>{mail}</div>'
    return ""


def dialog(mode: str = "open", kind: str = "Contrato", num: str = "CTR-2026-0120", mobile: bool = False) -> str:
    """mode: open | no-email | hsm | no-hsm | other-email | sending"""
    wa_open = channel_card("whatsapp", "WhatsApp", '<span class="mono">+57 ··· 0199</span><br><span class="live">Escribió hace 3 h</span>', True)
    mail_ok = channel_card("email", "Correo", '<span class="mono">la···@example.com</span><br>De su ficha', False)
    mail_none = channel_card("email", "Correo", "No tiene correo en su ficha. Añádelo en el contacto para mandarlo por aquí.", False, True, reason=True)
    other = ""
    if mode == "no-email":
        cards, primary = wa_open + mail_none, "Enviar por WhatsApp"
    elif mode == "hsm":
        wa = channel_card("whatsapp", "WhatsApp", '<span class="mono">+57 ··· 0199</span><br><span class="live cold">No ha escrito en 2 días</span>', True)
        cards, primary = wa + mail_ok, "Enviar por WhatsApp"
    elif mode == "no-hsm":
        wa = channel_card("whatsapp", "WhatsApp", "Fuera de las 24 h y sin plantilla aprobada configurada.", False, True, reason=True)
        mail = channel_card("email", "Correo", '<span class="mono">la···@example.com</span><br>De su ficha', True)
        cards, primary = wa + mail, "Enviar por correo"
    elif mode == "other-email":
        wa = channel_card("whatsapp", "WhatsApp", '<span class="mono">+57 ··· 0199</span><br><span class="live">Escribió hace 3 h</span>', False)
        mail = channel_card("email", "Correo", '<span class="mono">la···@example.com</span><br>De su ficha', True, prev="Ya se envió por correo el 12 sep")
        cards, primary = wa + mail, "Enviar por correo"
        other = f"""<div class="other">
          <a class="lnk" href="#" aria-expanded="true">{ic("chevron-down", size=14)}Usar otro correo solo esta vez</a>
          {K.input("contabilidad@cocuytravel.co", "", "", "at-sign")}
          <p class="hint">La ficha del contacto no cambia: este destino es solo para este envío.</p>
        </div>"""
    elif mode == "sending":
        cards, primary = wa_open + mail_ok, ""
    else:
        cards, primary = wa_open + mail_ok, "Enviar por WhatsApp"
    foot_btn = ('<button class="btn primary busyb" aria-disabled="true"><span class="spin"></span>Enviando…</button>' if mode == "sending"
                else btn(primary, "send", "primary"))
    grab = '<div class="grab"></div>' if mobile else ""
    close = "" if mobile else btn("", "x", "ghost icon sm x", 'aria-label="Cerrar"')
    return f"""<div class="dlg" role="dialog" aria-modal="true" aria-labelledby="dlg-t">
      {grab}{close}
      <div><h2 id="dlg-t">{paper(kind)}Enviar {kind.lower()}</h2>
        <p class="sub"><span class="num">{num}</span> de la reserva JX-0042 · a <b>Laura Gómez</b></p></div>
      <div class="chn" role="radiogroup" aria-label="Por dónde">{cards}</div>
      {arrive(mode, kind, num)}{other}
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
     "«…» › Enviar abre un diálogo de cristal sobre el rail. Dos tarjetas: WhatsApp (número enmascarado, punto verde «escribió hace 3 h») y correo (dirección de su ficha). Debajo, lo memorable: «Así le llega», la burbuja del chat con el PDF y su presentación, tal como la verá Laura. La escribe el servidor con las mismas fuentes con las que manda. Una sola acción coral que nombra el canal."),
    ("sin-correo", "2 · Sin correo", order_page("base", overlay=overlay("no-email")),
     "La ficha no tiene correo: la tarjeta se deshabilita CON la razón y la salida honesta («añádelo en el contacto»). No hay campo para inventarse una dirección: la ficha es la única dirección de registro."),
    ("hsm", "3 · Fuera de 24 h, con plantilla", order_page("base", overlay=overlay("hsm")),
     "El cliente lleva días sin escribir (punto ámbar). WhatsApp sigue disponible, y la vista previa dibuja exactamente qué pasará: primero la plantilla aprobada (con borde discontinuo), y cuando responda, el PDF atenuado que saldrá solo. Es lo que el motor hará; el diálogo no lo suaviza."),
    ("sin-hsm", "4 · Fuera de 24 h, sin plantilla", order_page("base", overlay=overlay("no-hsm")),
     "Sin plantilla configurada, WhatsApp no puede: la tarjeta lo dice, la vista previa explica por qué y enlaza a configurarla (solo con permiso de plantillas). El correo queda como camino, seleccionado, y el botón cambia de nombre."),
    ("otro-correo", "5 · Otro correo", order_page("base", overlay=overlay("other-email")),
     "Con correo en la ficha, se puede usar otro «solo esta vez» (contabilidad, un familiar) sin tocar la ficha. La vista previa es ahora el sobre: remitente (el emisor del tenant), asunto y adjunto. La tarjeta recuerda que ya se envió el 12 de septiembre: reenviar es legítimo y se dice."),
    ("en-camino", "6 · En camino", order_page("sending", toast=sending_toast()),
     "Al confirmar, el diálogo se cierra y la fila gana la tercera línea: un glifo del canal en cápsula y «Enviando por WhatsApp…» con un punto que late (tono info, sin fondo). El aviso de cristal dice a dónde va, ofrece «Ver chat» y promete avisar si no sale. La fila cambia sola cuando el proveedor confirma."),
    ("estados", "7 · Estados de entrega", order_page("states"),
     "Una línea por canal, como texto con tono: enviado (gris, con fecha), «salió el aviso» (el HSM; el PDF llega cuando responda), no salió por correo (ámbar, con la razón), no se pudo enviar (rojo, «Reintentar»), no salió por ventana («Enviar por correo» como salida). Un reemplazado que SÍ se envió sigue diciéndolo."),
    ("solo-ver", "7b · Solo ver", order_page("states", can_manage=False),
     "Sin `documents:manage` las líneas existen igual —son hechos— pero sin botones: el pie dice por qué. Nada deshabilitado: lo que no se puede, no está."),
    ("ajustes", "8 · Ajustes", settings_auto(),
     "Mi empresa › Documentos gana «Emisión y envío automáticos» como lista agrupada al estilo iOS: cuándo sale el contrato (tres tarjetas excluyentes, la elegida con el check coral; «al verificar el anticipo» explica el caso con plan y sin plan), el recibo automático, los cuatro interruptores de envío (solo para lo que sale solo) con la pista de la plantilla, y la plantilla aprobada de respaldo con su regla honesta: sin variables."),
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
