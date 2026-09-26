#!/usr/bin/env python3
"""Mockup «Recordatorios de cobro» (cobros_frontend_plan.md §4, F5).

La idea que ordena estas pantallas: **una cadencia es una conversación, no una lista de
números**. El dueño no está configurando un cron; está decidiendo qué le llega por WhatsApp a
una persona que le debe dinero, y cuándo. Así que la vista previa no es un calendario: es el
hilo de mensajes tal como va a verlo el cliente, con sus fechas reales. Eso hace visible de un
vistazo lo que una rejilla de ajustes esconde — que apagar una plantilla deja un hueco, y que
sin plantilla aprobada de Meta el aviso de mora no sale nunca.

De ahí salen las tres decisiones del diseño:

1. **El editor enseña el resultado, no el ajuste.** Misma forma que la política de F4 (ajustes a
   la izquierda, consecuencia a la derecha), pero la consecuencia aquí son los mensajes.
2. **Lo que NO se manda se ve.** El servidor registra doce razones para no enviar precisamente
   para que «el negocio lo apagó» y «esto está roto» no se parezcan. Si el timeline las pinta
   igual, ese trabajo se pierde: van con el mismo peso visual que un mensaje enviado, pero sin
   burbuja y con la razón escrita.
3. **En la Cartera, el aviso es una línea de la fila, no una columna.** F4 quitó la tabla a
   propósito; devolverla por una fecha sería deshacerlo. El «último aviso» baja al subtítulo de
   quien debe, donde ya viven el pedido y la fecha.

Uso:  python3 collections-reminders.build.py   (AXI_MOCKUP_ARTBOARDS_DIR=… exporta artboards)
"""
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from _axi_mockup_kit import Kit  # noqa: E402

K = Kit("collections-reminders")
ic, btn, badge = K.ic, K.btn, K.badge

EXTRA_CSS = """
/* ── Página (mismo molde que F4: una columna de trabajo, con aire) ───────── */
.wrap{max-width:1040px;margin:0 auto;padding:40px 40px 80px;display:flex;flex-direction:column;gap:30px}
.topbar{display:flex;align-items:center;justify-content:space-between;gap:16px}
.topbar .ttl{font-size:19px;font-weight:600;letter-spacing:-.015em}
.topbar .acts{display:flex;gap:8px;align-items:center}

/* ── Ajustes: filas, no rejilla de formulario (idioma de F4) ─────────────── */
.two{display:grid;grid-template-columns:minmax(0,1fr) 372px;gap:36px;align-items:start}
.set-title{font-size:13px;color:var(--muted-foreground);padding:0 4px 9px;font-weight:500}
.set{border:1px solid var(--border);border-radius:16px;background:var(--background);overflow:hidden}
.set-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;align-items:center;padding:14px 17px;position:relative;min-height:56px}
.set-row + .set-row::before{content:"";position:absolute;left:17px;right:0;top:0;height:1px;background:var(--border-soft)}
.set-row .k{font-size:14px}
.set-row .k .kk{font-size:12.5px;color:var(--muted-foreground);margin-top:2px}
.set-row .v{font-size:14px;color:var(--muted-foreground);display:flex;align-items:center;gap:7px;font-variant-numeric:tabular-nums}
.set-row .v b{color:var(--foreground);font-weight:500}
.set-row.off .k{color:var(--muted-foreground)}
.set-note{font-size:12.5px;color:var(--muted-foreground);padding:10px 4px 0;line-height:1.55;max-width:62ch}
.set-note b{color:var(--foreground);font-weight:500}
.set-block + .set-block{margin-top:28px}

/* ── Los desfases: fichas, porque se añaden y se quitan ─────────────────── */
.days{display:flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:flex-end}
.day{height:28px;min-width:38px;padding:0 10px;border-radius:999px;background:var(--secondary);
     display:inline-flex;align-items:center;justify-content:center;gap:6px;font-size:12.5px;
     font-weight:500;font-variant-numeric:tabular-nums;color:var(--foreground)}
.day .x{opacity:.45}
.day.add{background:transparent;border:1px dashed var(--border);color:var(--muted-foreground);font-weight:400}

/* ── La vista previa: el hilo, no un calendario ──────────────────────────── */
.thread{border:1px solid var(--border);border-radius:20px;background:var(--background);padding:20px 20px 24px}
.thread .cap{font-size:12.5px;color:var(--muted-foreground)}
.thread .who{font-size:15.5px;font-weight:600;letter-spacing:-.01em;margin-top:3px}
.thread .chat{display:flex;flex-direction:column;gap:14px;margin-top:20px}
.when{font-size:11.5px;color:var(--muted-foreground);text-align:center;font-variant-numeric:tabular-nums}
.bub{align-self:flex-end;max-width:88%;background:var(--secondary);border-radius:16px 16px 5px 16px;
     padding:11px 14px;font-size:13px;line-height:1.55}
.bub .meta{display:flex;align-items:center;gap:6px;margin-top:8px;font-size:11px;color:var(--muted-foreground);justify-content:flex-end}
.bub.in{align-self:flex-start;border-radius:16px 16px 16px 5px;background:color-mix(in srgb, var(--axi-info) 10%, var(--background))}
.gap{align-self:stretch;border:1px dashed var(--border);border-radius:14px;padding:11px 14px;
     display:flex;gap:9px;align-items:flex-start;color:var(--muted-foreground);font-size:12.5px;line-height:1.5}
.gap b{color:var(--foreground);font-weight:500}

/* ── Editor de un texto ──────────────────────────────────────────────────── */
.editor{border:1px solid var(--border);border-radius:16px;background:var(--background);overflow:hidden}
.editor .body{padding:15px 17px;font-size:13.5px;line-height:1.7;min-height:118px}
.editor .body .v{background:color-mix(in srgb, var(--axi-violet) 14%, transparent);
                 border-radius:5px;padding:1px 5px;font-size:12.5px;font-family:var(--font-mono)}
.editor .bar{display:flex;gap:6px;flex-wrap:wrap;padding:11px 14px;border-top:1px solid var(--border-soft);background:var(--secondary)}
.vchip{height:25px;padding:0 9px;border-radius:7px;background:var(--background);border:1px solid var(--border);
       display:inline-flex;align-items:center;font-size:11.5px;font-family:var(--font-mono);color:var(--muted-foreground)}
.hintbar{font-size:12px;color:var(--muted-foreground);align-self:center}
.count{font-size:11.5px;color:var(--muted-foreground);margin-left:auto;align-self:center;font-variant-numeric:tabular-nums}

/* ── Lista de deudores (F4, con una línea más) ───────────────────────────── */
.sec{display:flex;align-items:center;gap:9px;padding:0 4px 10px;font-size:13px;color:var(--muted-foreground)}
.sec .t{font-weight:500;color:var(--foreground)}
.sec .n{margin-left:auto;font-variant-numeric:tabular-nums}
.sec.gone .ic{color:var(--axi-destructive)}
.sec.late .ic{color:var(--axi-warning)}
.sec.soon .ic{color:var(--axi-info)}
.block + .block{margin-top:26px}
.glist{border:1px solid var(--border);border-radius:18px;background:var(--background);overflow:hidden}
.grow{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:16px;align-items:center;
      padding:16px 20px;min-height:76px;position:relative;text-align:left;width:100%}
.grow + .grow::before{content:"";position:absolute;left:20px;right:0;top:0;height:1px;background:var(--border-soft)}
.grow .nm{font-size:15.5px;font-weight:500;letter-spacing:-.005em;display:block}
/* La fila deja de ser UN botón porque ahora tiene una acción propia: un botón
   dentro de otro no es HTML válido. El nombre estira su área hasta cubrir la
   fila —patrón de tarjeta enlazada— y «Escribir» queda por encima. Así la fila
   entera sigue abriendo el plan y el botón hace lo suyo. */
.grow .nm a{color:inherit;text-decoration:none}
.grow .nm a::after{content:"";position:absolute;inset:0}
.grow .btn{position:relative;z-index:1}
.grow .sub{font-size:13px;color:var(--muted-foreground);margin-top:3px;display:block}
/* Texto que fluye, no cajas en flex: al envolverse en el móvil, un flex dejaba
   el separador «·» solo al principio de la línea y parecía una viñeta. */
.grow .sub .id{margin-right:2px}
.grow .sub .id{font-family:var(--font-mono);font-size:11.5px}
.grow .last{font-size:12.5px;color:var(--muted-foreground);margin-top:5px;display:flex;align-items:center;gap:6px}
.grow .last.bad{color:var(--axi-warning)}
.grow .last.none{opacity:.75}
.grow .right{text-align:right}
.grow .amt{font-size:16.5px;font-weight:600;letter-spacing:-.015em;font-variant-numeric:tabular-nums}
.grow .due{font-size:12.5px;color:var(--muted-foreground);margin-top:3px;font-variant-numeric:tabular-nums}
.grow .due.late{color:var(--axi-destructive)}

/* ── Historial del plan ──────────────────────────────────────────────────── */
.hist{display:flex;flex-direction:column}
.ev{display:grid;grid-template-columns:26px minmax(0,1fr) auto;gap:14px;align-items:start;padding:13px 0;position:relative}
.ev::after{content:"";position:absolute;left:12px;top:32px;bottom:-13px;width:1px;background:var(--border)}
.ev:last-child::after{display:none}
.ev .pin{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;background:var(--secondary);color:var(--muted-foreground);z-index:1}
.ev.sent .pin{background:color-mix(in srgb, var(--axi-success) 16%, var(--background));color:var(--axi-success)}
.ev.fail .pin{background:color-mix(in srgb, var(--axi-destructive) 14%, var(--background));color:var(--axi-destructive)}
.ev .t{font-size:13.5px;font-weight:500}
.ev .m{font-size:12.5px;color:var(--muted-foreground);margin-top:2px;line-height:1.5}
.ev .ts{font-size:12px;color:var(--muted-foreground);font-variant-numeric:tabular-nums;white-space:nowrap}
.ev.skip .t{font-weight:400;color:var(--muted-foreground)}

/* ── Diálogo de envío manual ─────────────────────────────────────────────── */
.modal.wide{max-width:520px;padding:26px;gap:18px;border-radius:24px}
.modal.wide h2{font-size:20px;letter-spacing:-.015em;font-family:var(--font-body);font-weight:600}
.modal .sub{font-size:13px;color:var(--muted-foreground);margin-top:3px}
.modal-foot{display:flex;justify-content:flex-end;gap:8px;margin-top:2px}

/* ── Móvil ───────────────────────────────────────────────────────────────── */
.phone{width:390px;margin:28px auto;border:1px solid var(--border);border-radius:38px;background:var(--background);
       padding:14px 10px 20px;box-shadow:var(--shadow-float)}
.phone .ph-top{display:flex;align-items:center;justify-content:space-between;padding:6px 12px 14px}
.phone .ph-top .t{font-size:17px;font-weight:600;letter-spacing:-.015em}
.phone .glist{border-radius:16px}
.phone .grow{grid-template-columns:minmax(0,1fr) auto;padding:14px 16px}
/* En el móvil la fila NO lleva botón: tres botones a lo ancho se comen la
   pantalla y devuelven el problema que F4 quitó de la Cartera. La fila entera
   abre el plan, y escribir se decide ahí, con la cuota delante. */
.phone .grow .btn{display:none}
.phone .set{border-radius:14px}

/* ── Vacío ───────────────────────────────────────────────────────────────── */
.void{display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px;padding:64px 20px}
.void .vic{width:52px;height:52px;border-radius:16px;background:var(--secondary);display:grid;place-items:center;color:var(--muted-foreground);margin-bottom:6px}
.void h3{font-size:17px;font-family:var(--font-body);font-weight:600;letter-spacing:-.01em}
.void p{color:var(--muted-foreground);font-size:13.5px;max-width:46ch;line-height:1.6}
.foot-note{font-size:12.5px;color:var(--muted-foreground);padding:12px 4px 0;max-width:72ch;line-height:1.55}
.foot-note b{color:var(--foreground);font-weight:500}
"""

CHEV = ic("chevron-right", size=15)

TABS = [("Medios", "credit-card"), ("Plan de pagos", "calendar-clock"),
        ("Recordatorios", "bell"), ("Moneda y TRM", "banknote"), ("Documentos", "file-text")]


def hub(active: str, body: str) -> str:
    return f"""<div class="wrap">
      <div class="topbar"><p class="ttl">Pagos</p>
        <span class="small muted">JuanitoXpeditions · agencia de expediciones</span></div>
      {K.nav(TABS, active, "Ajustes de pagos")}
      {body}
    </div>"""


# ── El hilo: la vista previa de verdad ─────────────────────────────────────
MSG_SOON = ("Hola Laura, te recordamos que la cuota 2 de 3 de tu pedido JX-0042 vence el "
            "16 de octubre: $ 3.797.500. Puedes pagar por Nequi, Bancolombia.")
MSG_TODAY = ("Hola Laura, hoy vence la cuota 2 de tu pedido JX-0042: $ 3.797.500. "
             "Puedes pagar por Nequi, Bancolombia.")
MSG_LATE = ("Hola Laura, tu pedido JX-0042 tiene una cuota pendiente desde el 16 de octubre por "
            "$ 3.797.500. Te falta $ 7.595.000 en total. Escríbenos y lo resolvemos.")


def bubble(text: str, meta: str = "WhatsApp · entregado") -> str:
    return f'<div class="bub">{text}<div class="meta">{ic("check-check", size=13)}{meta}</div></div>'


def thread(mode: str = "full") -> str:
    """mode: full | off (due_today apagada) | hsm (mora sin plantilla aprobada)."""
    parts = [f'<p class="when">9 de octubre · 7 días antes</p>', bubble(MSG_SOON)]

    if mode == "off":
        parts += [
            '<p class="when">16 de octubre · el día del vencimiento</p>',
            f'<div class="gap">{ic("bell-off", size=15)}<div>Ese día <b>no se escribe nada</b>: '
            'el aviso del día del vencimiento está apagado. Queda anotado en el historial del '
            'plan con su razón, para que se sepa que fue una decisión y no un fallo.</div></div>',
        ]
    else:
        parts += [f'<p class="when">16 de octubre · el día del vencimiento</p>', bubble(MSG_TODAY)]

    parts.append('<p class="when">17 de octubre · 1 día de mora</p>')
    if mode == "hsm":
        parts.append(
            f'<div class="gap">{ic("clock-alert", size=15)}<div>Laura lleva ocho días sin '
            'escribir, así que la ventana de 24 horas de WhatsApp está cerrada y este aviso '
            '<b>no sale</b>. Es justo a quien hay que perseguir. Con una plantilla aprobada de '
            'Meta, sí saldría.</div></div>'
        )
    else:
        parts += [
            bubble(MSG_LATE, "Plantilla aprobada · fuera de la ventana de 24 h"),
            '<div class="bub in">Ya pagué ayer, les mando el comprobante 🙏</div>',
        ]

    chat = "".join(parts)
    return f"""<div class="thread">
      <p class="cap">Lo que le va a llegar a</p>
      <p class="who">Laura Gómez · cuota 2 de 3</p>
      <div class="chat">{chat}</div>
    </div>"""


# ── 1 · La cadencia ────────────────────────────────────────────────────────
def days_chips(labels: list[str]) -> str:
    """Las fichas son la cadencia tal cual la guarda el servidor.

    «El día que vence» NO es un interruptor aparte: es el desfase 0 de la misma
    lista. Darle un control propio inventaba un concepto que el modelo no tiene
    y metía un coral más en una pantalla que ya tenía seis.
    """
    chips = "".join(f'<span class="day">{l}{ic("x", "x", 12)}</span>' for l in labels)
    return f'<div class="days">{chips}<span class="day add">{ic("plus", size=12)}</span></div>'


def cadence(mode: str = "full") -> str:
    hsm_note = (
        K.notice("warn",
                 "<b>No hay plantilla aprobada para la mora.</b> Fuera de la ventana de 24 horas "
                 "de WhatsApp solo pasa una plantilla que Meta haya aprobado, y quien lleva días "
                 "sin escribir es justo el que hay que perseguir: sin ella, ese aviso no sale.",
                 acts=btn("Registrar la plantilla", "shield-check", "sm"), cls="mt")
        if mode == "hsm" else ""
    )
    return hub("Recordatorios", f"""
      <div class="two">
        <div>
          <div class="set-block">
            <p class="set-title">Cuándo escribimos</p>
            <div class="set">
              <div class="set-row"><span class="k">Antes de vencer</span>
                {days_chips(["7 días", "3 días", "el día"])}</div>
              <div class="set-row"><span class="k">Después de vencer</span>
                {days_chips(["1 día", "3 días", "7 días"])}</div>
              <div class="set-row"><span class="k">Callar si el cliente promete pagar
                <div class="kk">Hasta la fecha que prometió</div></span>
                <span class="v">{K.switch(True, label="Pausar con promesa")}</span></div>
            </div>
            <p class="set-note">Cada aviso sale <b>una sola vez</b> y en su día exacto: «faltan
              7 días» no se repite los siete días siguientes. Un recordatorio diario deja de
              leerse justo antes de la fecha que importa.</p>
          </div>

          <div class="set-block">
            <p class="set-title">Qué decimos</p>
            <div class="set">
              <div class="set-row"><span class="k">Antes de vencer
                <div class="kk">«…la cuota 2 de 3 vence el 16 de octubre»</div></span>
                <span class="v"><b>Tu texto</b>{CHEV}</span></div>
              <div class="set-row {"off" if mode == "off" else ""}"><span class="k">El día que vence
                <div class="kk">«…hoy vence la cuota 2 de tu pedido»</div></span>
                <span class="v">{"<b>Apagado</b>" if mode == "off" else "Texto de la casa"}{CHEV}</span></div>
              <div class="set-row"><span class="k">En mora
                <div class="kk">«…una cuota pendiente desde el 16 de octubre»</div></span>
                <span class="v">Texto de la casa{CHEV}</span></div>
            </div>
            {hsm_note}
            <p class="set-note">Lo que cambies aquí vale <b>también para los pedidos que ya
              están en marcha</b>. El calendario de un cliente se pactó con él y no se toca;
              cómo le hablas, no lo pactaste con nadie.</p>
          </div>

          <div class="set-block">
            <p class="set-title">Por dónde</p>
            <div class="set">
              <div class="set-row"><span class="k">WhatsApp</span>
                <span class="v">{K.switch(True, label="Avisar por WhatsApp")}</span></div>
              <div class="set-row"><span class="k">Correo
                <div class="kk">Solo a quien tenga correo en su ficha</div></span>
                <span class="v">{K.switch(True, label="Avisar por correo")}</span></div>
            </div>
          </div>
        </div>
        {thread(mode)}
      </div>""")


# ── 2 · Editando un texto ──────────────────────────────────────────────────
def template_editor() -> str:
    def v(name: str) -> str:
        return f'<span class="v">{{{{{name}}}}}</span>'

    body = (f'Hola {v("contact_name")}, te recordamos que la cuota {v("installment_seq")} de '
            f'{v("installments_count")} de tu pedido {v("order_number")} vence el {v("due_date")}: '
            f'{v("amount")}. Puedes pagar por {v("payment_methods")}.')
    chips = "".join(f'<span class="vchip">{{{{{n}}}}}</span>' for n in
                    ["contact_name", "order_number", "amount", "balance", "due_date",
                     "installment_seq", "installments_count", "payment_methods"])
    return hub("Recordatorios", f"""
      <div class="two">
        <div>
          <div class="set-block">
            <p class="set-title">El aviso de «antes de vencer»</p>
            <div class="set" style="margin-bottom:14px">
              <div class="set-row"><span class="k">Enviar este aviso
                <div class="kk">Apagarlo no borra el texto: deja de salir y queda dicho en el
                  historial de cada plan</div></span>
                <span class="v">{K.switch(True, label="Enviar el aviso de antes de vencer")}</span></div>
            </div>
            <div class="editor">
              <div class="body">{body}</div>
              <div class="bar">{chips}<span class="count">187 / 1.000</span></div>
            </div>
            <p class="set-note">Las piezas moradas se rellenan con los datos del pedido al
              enviar. Si una no se puede saber, <b>sale un guion y nunca un cero</b>: un
              recordatorio que se inventa un importe es peor que no mandarlo.</p>
          </div>
          <div class="set-block">
            <p class="set-title">Fuera de la ventana de 24 horas</p>
            <div class="set">
              <div class="set-row"><span class="k">Plantilla aprobada de Meta</span>
                <span class="v"><b>cobro_recordatorio</b>{CHEV}</span></div>
              <div class="set-row"><span class="k">Idioma</span>
                <span class="v"><b>Español (es)</b>{CHEV}</span></div>
            </div>
            <p class="set-note">WhatsApp solo deja escribir libremente durante 24 horas desde el
              último mensaje del cliente. Pasadas esas horas sale esta plantilla.</p>
          </div>
          <div class="topbar" style="padding-top:6px">
            <span></span>
            <span class="acts">{btn("Descartar", "", "ghost")}{btn("Guardar el texto", "")}</span>
          </div>
        </div>
        <div class="thread">
          <p class="cap">Con los datos de</p>
          <p class="who">Laura Gómez · cuota 2 de 3</p>
          <div class="chat">
            <p class="when">Así se verá</p>
            {bubble(MSG_SOON)}
          </div>
          <p class="set-note" style="padding:16px 0 0">No es un ejemplo escrito a mano: es tu
            texto con un pedido real de tu cartera. Cambia una palabra y cambia aquí.</p>
        </div>
      </div>""")


# ── 3 · La Cartera con el último aviso ─────────────────────────────────────
DEBTORS = [
    {"sec": "gone", "icon": "plane-landing", "title": "Ya viajaron y deben", "n": "2 · $ 11.240.000",
     "rows": [
         {"nm": "Marcela Ruiz", "id": "JX-0031", "who": "Travesía Cocora · viajó el 2 de septiembre",
          "last": ("bad", "clock-alert", "No salió hace 2 días · fuera de la ventana de 24 h"),
          "amt": "$ 7.595.000", "due": "18 días de mora", "late": True},
         {"nm": "Andrés Peña", "id": "JX-0028", "who": "Nevado del Ruiz · viajó el 28 de agosto",
          "last": ("ok", "check-check", "Avisado ayer · entregado"),
          "amt": "$ 3.645.000", "due": "23 días de mora", "late": True},
     ]},
    {"sec": "late", "icon": "triangle-alert", "title": "En mora", "n": "1 · $ 3.797.500",
     "rows": [
         {"nm": "Laura Gómez", "id": "JX-0042", "who": "Expedición Sierra Nevada · sale el 14 de marzo",
          "last": ("ok", "check-check", "Avisado hace 2 días · leído"),
          "amt": "$ 3.797.500", "due": "3 días de mora", "late": True},
     ]},
    {"sec": "soon", "icon": "calendar-clock", "title": "Vencen esta semana", "n": "2 · $ 6.410.000",
     "rows": [
         {"nm": "Julián Torres", "id": "JX-0044", "who": "Expedición Sierra Nevada · sale el 14 de marzo",
          "last": ("none", "bell", "Sin avisos todavía · el primero sale en 4 días"),
          "amt": "$ 3.213.333", "due": "vence el 20 de septiembre"},
         {"nm": "Paula Mesa", "id": "JX-0039", "who": "Travesía Cocora · sale el 2 de noviembre",
          "last": ("ok", "pause", "En pausa · prometió pagar el 24 de septiembre"),
          "amt": "$ 3.196.667", "due": "vence el 22 de septiembre"},
     ]},
]


def debtor_row(r: dict) -> str:
    kind, icon, text = r["last"]
    cls = {"bad": "last bad", "none": "last none"}.get(kind, "last")
    due_cls = "due late" if r.get("late") else "due"
    return f"""<div class="grow">
        <span><span class="nm"><a href="#">{r["nm"]}</a></span>
          <span class="sub"><span class="id">{r["id"]}</span>&nbsp;· {r["who"]}</span>
          <span class="{cls}">{ic(icon, size=13)}{text}</span></span>
        <span class="right"><span class="amt" style="display:block">{r["amt"]}</span>
          <span class="{due_cls}" style="display:block">{r["due"]}</span></span>
        {btn("Escribir", "send", "outline sm")}
      </div>"""


def receivables(overlay: str = "") -> str:
    blocks = "".join(
        f"""<div class="block">
          <div class="sec {b["sec"]}">{ic(b["icon"], "ic", 15)}<span class="t">{b["title"]}</span>
            <span class="n">{b["n"]}</span></div>
          <div class="glist">{"".join(debtor_row(r) for r in b["rows"])}</div>
        </div>""" for b in DEBTORS)
    return f"""<div class="wrap">
      <div class="topbar"><p class="ttl">Cartera</p>
        <span class="acts">{badge("5 con avisos hoy", "", "bell")}</span></div>
      {blocks}
      <p class="foot-note">El último aviso baja al subtítulo de quien debe, donde ya viven el
        pedido y la fecha: es contexto para decidir, no una columna que comparar. <b>«No salió»
        se ve igual de claro que «entregado»</b> — si el aviso de alguien lleva días sin salir,
        eso es lo primero que hay que saber antes de escribirle a mano.</p>
    </div>{overlay}"""


# ── 4 · Escribir ahora ─────────────────────────────────────────────────────
def send_dialog(late: bool = False) -> str:
    """El envío manual salta la cadencia, pero NO la fecha de la cuota.

    Que el texto salga de la fecha y no de «es manual, luego es mora» es un
    arreglo del servidor de esta misma fase: mandarle «tienes una cuota
    pendiente desde el 20 de septiembre» a alguien cuya fecha todavía no ha
    llegado se lee como un cobro agresivo por un error de programación.
    """
    if late:
        who, ref = "Laura Gómez", "JX-0042 · cuota 2 de 3 · $ 3.797.500 · venció el 16 de octubre"
        stage = "En mora · vencida hace 3 días"
        msg = ("Hola Laura, tu pedido JX-0042 tiene una cuota pendiente desde el 16 de octubre "
               "por $ 3.797.500. Te falta $ 7.595.000 en total. Escríbenos y lo resolvemos.")
        note = ("La cuota lleva <b>tres días vencida</b>, así que el texto que sale es el de "
                "mora. Laura escribió ayer, así que la ventana de 24 horas está abierta y no "
                "hace falta plantilla aprobada.")
        count = "191"
    else:
        who, ref = "Julián Torres", "JX-0044 · cuota 1 de 3 · $ 3.213.333 · vence el 20 de septiembre"
        stage = "Antes de vencer · faltan 4 días"
        msg = ("Hola Julián, te recordamos que la cuota 1 de 3 de tu pedido JX-0044 vence el 20 "
               "de septiembre: $ 3.213.333. Puedes pagar por Nequi, Bancolombia.")
        note = ("La cuota <b>todavía no ha vencido</b>, así que no sale el texto de mora: "
                "decirle «tienes una cuota pendiente desde el 20 de septiembre» a alguien cuya "
                "fecha aún no ha llegado se lee como un cobro agresivo.")
        count = "186"
    return f"""<div class="overlay"><div class="modal wide">
      <div><h2>Escribir a {who}</h2><p class="sub">{ref}</p></div>
      <div class="set">
        <div class="set-row"><span class="k">Texto que va a salir</span>
          <span class="v"><b>{stage}</b>{CHEV}</span></div>
        <div class="set-row"><span class="k">Por</span>
          <span class="v"><b>WhatsApp</b>{CHEV}</span></div>
      </div>
      <div class="editor">
        <div class="body" style="min-height:92px">{msg}</div>
        <div class="bar"><span class="hintbar">Se puede editar antes de enviar</span>
          <span class="count">{count} / 1.000</span></div>
      </div>
      <p class="set-note" style="padding:0">{note}</p>
      <div class="modal-foot">{btn("Cancelar", "", "ghost")}{btn("Enviar ahora", "send")}</div>
    </div></div>"""


# ── 5 · El historial del plan ──────────────────────────────────────────────
EVENTS = [
    ("sent", "check-check", "Aviso entregado · 7 días antes",
     "WhatsApp a Laura Gómez · cuota 2 de 3", "hoy 08:00"),
    ("skip", "pause", "No se escribió · el cliente prometió pagar",
     "Prometió el 24 de septiembre. Perseguirlo ahora sería romper el acuerdo que se le acaba de aceptar.", "ayer 08:00"),
    ("sent", "check-check", "Aviso entregado · el día del vencimiento",
     "WhatsApp a Laura Gómez · cuota 2 de 3", "16 sep 08:00"),
    ("skip", "bell-off", "No se escribió · el texto está apagado",
     "El aviso de 3 días antes está apagado en Ajustes › Recordatorios. Fue una decisión del negocio, no un fallo.", "13 sep 08:00"),
    ("fail", "circle-alert", "El aviso falló",
     "WhatsApp lo aceptó y lo rechazó después: el número no tiene cuenta. Correo sí salió.", "9 sep 08:04"),
    ("sent", "check-check", "Aviso entregado · 7 días antes",
     "Correo a laura@example.com · cuota 1 de 3", "9 sep 08:00"),
]


def timeline() -> str:
    evs = "".join(
        f"""<div class="ev {kind}"><span class="pin">{ic(icon, size=14)}</span>
          <div><p class="t">{t}</p><p class="m">{m}</p></div>
          <span class="ts">{ts}</span></div>""" for kind, icon, t, m, ts in EVENTS)
    return f"""<div class="wrap">
      <div class="topbar"><p class="ttl">Plan de pagos · Laura Gómez</p>
        <span class="small muted">JX-0042 · saldo $ 7.595.000</span></div>
      <div class="two">
        <div>
          <p class="set-title">Historial de avisos</p>
          <div class="set" style="padding:6px 18px 10px">
            <div class="hist">{evs}</div>
          </div>
          <p class="set-note">Lo que <b>no</b> se mandó pesa lo mismo que lo que sí, y dice por
            qué. Un aviso que no sale sin dejar rastro hace que «el negocio lo apagó» y «esto
            está roto» se vean exactamente igual, que es como una función de avisos puede estar
            muerta semanas sin que nadie se entere.</p>
        </div>
        <div class="thread">
          <p class="cap">Lo siguiente</p>
          <p class="who">En 4 días · 3 días antes de vencer</p>
          <div class="chat"><p class="when">20 de septiembre, 08:00</p>{bubble(MSG_SOON, "Se enviará por WhatsApp")}</div>
          <p class="set-note" style="padding:16px 0 0">Los avisos salen a las 8 de la mañana en
            la hora del negocio, no en la del servidor.</p>
        </div>
      </div>
    </div>"""


# ── 6 · Móvil ──────────────────────────────────────────────────────────────
def mobile() -> str:
    rows = "".join(debtor_row(r) for r in DEBTORS[0]["rows"] + DEBTORS[1]["rows"])
    return f"""<div class="phone">
      <div class="ph-top"><span class="t">Cartera</span>{ic("search", size=18)}</div>
      <div class="sec gone" style="padding:0 14px 10px">{ic("plane-landing", "ic", 15)}
        <span class="t">Ya viajaron y deben</span><span class="n">2</span></div>
      <div class="glist" style="margin:0 8px">{rows}</div>
      <p class="foot-note" style="padding:14px 18px 0">La fila pierde el botón antes que el
        aviso: perseguir un cobro se hace de pie, y lo que hay que saber antes de llamar es si
        ya se le escribió y si el mensaje llegó. Tres botones a lo ancho devolverían el problema
        que F4 quitó de la Cartera.</p>
    </div>"""


# ── 7 · Sin la función ─────────────────────────────────────────────────────
def disabled() -> str:
    return f"""<div class="wrap">
      <div class="topbar"><p class="ttl">Pagos</p>
        <span class="small muted">Savage Wear · tienda de ropa</span></div>
      {K.nav([("Medios", "credit-card"), ("Documentos", "file-text")], "Medios", "Ajustes de pagos")}
      <div class="glist">
        <div class="void">
          <span class="vic">{ic("bell-off", size=22)}</span>
          <h3>Aquí no hay recordatorios</h3>
          <p>Este negocio cobra de una, así que no tiene cuotas que recordar. La pestaña no
            existe, el barrido diario no lo mira y el servidor responde 403 a quien la pida.</p>
        </div>
      </div>
      <p class="foot-note">Los recordatorios cuelgan de <b>Plan de pagos</b>: sin cuotas no hay
        nada que avisar. Se encienden juntos en Mi empresa › Funciones.</p>
    </div>"""


VIEWS = [
    ("cadencia", "1 · Cadencia", cadence("full"),
     "La vista previa no es un calendario: es el hilo que va a recibir el cliente, con sus fechas y sus cifras reales. Los ajustes de la izquierda no se leen como un formulario sino como filas, y cada bloque responde una pregunta: cuándo escribimos, qué decimos, por dónde. La frase del pie dice lo que más importa y lo que el servidor acaba de arreglar: lo que cambies aquí alcanza también a los pedidos que ya están en marcha."),
    ("texto", "2 · El texto", template_editor(),
     "Las variables son piezas moradas dentro del texto, no una tabla de referencia aparte. A la derecha, el mismo texto ya rellenado con un pedido real de la cartera: se escribe viendo lo que llega, igual que la política de F4 se decidía viendo el calendario que produce."),
    ("apagada", "3 · Una apagada", cadence("off"),
     "Apagar un aviso deja un hueco VISIBLE en el hilo, con la fecha en la que no se va a escribir. Es la diferencia entre un ajuste que se olvida y una consecuencia que se ve: el servidor registra ese «no se envió» con su razón precisamente para que nadie confunda una decisión del negocio con una avería."),
    ("hsm", "4 · Sin plantilla aprobada", cadence("hsm"),
     "El caso que más duele y el más fácil de no contar: pasadas 24 horas sin que el cliente escriba, WhatsApp solo deja pasar una plantilla aprobada por Meta. Sin ella, el aviso de mora no sale — y quien lleva días callado es justo a quien hay que perseguir. Se avisa donde se decide, no en la documentación."),
    ("cartera", "5 · En la Cartera", receivables(),
     "F4 quitó la tabla a propósito, así que el último aviso no vuelve como columna: baja al subtítulo de quien debe. «No salió hace 2 días» se lee tan claro como «avisado ayer», que es lo que hay que saber antes de escribirle a mano. Una sola acción por fila, como en F4."),
    ("escribir", "6 · Escribir ahora", receivables(send_dialog()),
     "El envío manual salta la cadencia pero NO la fecha: el diálogo enseña qué texto va a salir y por qué. A alguien cuya cuota vence en cuatro días no se le manda el texto de mora, que le diría «tienes una cuota pendiente desde» con una fecha que aún no ha llegado."),
    ("escribir-mora", "7 · Escribir · en mora", receivables(send_dialog(late=True)),
     "La misma pantalla con la cuota ya vencida: cambia el texto que sale y cambia la razón que se da. El operador puede editarlo antes de enviar, y lo que mande queda en el historial con su nombre."),
    ("historial", "8 · El historial", timeline(),
     "Lo que no se mandó pesa lo mismo que lo que sí, y dice por qué: «el cliente prometió pagar», «el texto está apagado», «WhatsApp lo rechazó después de aceptarlo». Sin ese rastro, una función de avisos puede estar muerta semanas sin que nadie lo note."),
    ("movil", "9 · Móvil", mobile(),
     "Perseguir un cobro se hace de pie. La fila pierde el importe secundario antes que el aviso: lo que hay que saber antes de llamar es si ya se le escribió y si el mensaje llegó."),
    ("sin-funcion", "10 · Sin la función", disabled(),
     "Savage Wear cobra de una: la pestaña no existe, el barrido diario no lo mira y el servidor responde 403. Los recordatorios cuelgan de Plan de pagos, porque sin cuotas no hay nada que recordar."),
]

if __name__ == "__main__":
    K.extra_css = EXTRA_CSS
    K.build_html("Recordatorios de cobro", "Mockup F0 · no es producto",
                 "Cobros · F5 «Recordatorios automáticos»", VIEWS)
    K.export_artboards([
        {"file": "reminders-cadence.dc.html", "title": "Cadencia · el hilo es la vista previa", "body": cadence("full"), "w": 1440, "h": 1030},
        {"file": "reminders-cadence-dark.dc.html", "title": "Cadencia · oscuro", "body": cadence("full"), "w": 1440, "h": 1030, "dark": True},
        {"file": "reminders-template.dc.html", "title": "El texto y su resultado", "body": template_editor(), "w": 1440, "h": 980},
        {"file": "reminders-off.dc.html", "title": "Una plantilla apagada deja un hueco", "body": cadence("off"), "w": 1440, "h": 1030},
        {"file": "reminders-hsm.dc.html", "title": "Sin plantilla aprobada no sale", "body": cadence("hsm"), "w": 1440, "h": 1170},
        {"file": "reminders-receivables.dc.html", "title": "Cartera · último aviso", "body": receivables(), "w": 1440, "h": 940},
        {"file": "reminders-send.dc.html", "title": "Escribir ahora · aún no vence", "body": receivables(send_dialog()), "w": 1440, "h": 960},
        {"file": "reminders-send-late.dc.html", "title": "Escribir ahora · en mora", "body": receivables(send_dialog(late=True)), "w": 1440, "h": 960},
        {"file": "reminders-history.dc.html", "title": "Historial · lo que no se mandó", "body": timeline(), "w": 1440, "h": 780},
        {"file": "reminders-mobile.dc.html", "title": "Cartera en el móvil", "body": mobile(), "w": 460, "h": 800},
        {"file": "reminders-disabled.dc.html", "title": "Sin la función", "body": disabled(), "w": 1440, "h": 620},
    ])
