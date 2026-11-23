#!/usr/bin/env python3
"""Mockup · «Limpiar del chat lo que no llegó» en la pantalla «Seguimiento» del lote.

Pedido de Cristian (23-nov): desde el resumen del lote (por secuencia, filtrable por búsqueda),
una opción para quitar del inbox los WhatsApp que no se pudieron entregar. Hoy se hizo a mano en
producción (25 mensajes y 13 chats vacíos); esto lo deja como botón.

Reglas que respeta:
- Solo toca mensajes que NO llegaron (fallidos). Nunca uno entregado, leído o respondido.
- El seguimiento NO pierde nada: el negocio sigue diciendo «No llegó» y por qué. Solo sale del chat.
- Un chat que queda vacío se quita también (no deja conversaciones fantasma en el inbox).
- Confirmación en línea, frase humana, sin menú numerado.
"""
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from _axi_mockup_kit import Kit  # noqa: E402

K = Kit("outreach-batch-cleanup")
ic, btn = K.ic, K.btn

K.extra_css = r"""
@keyframes truncate-mask-inline{from,to{-webkit-mask-image:linear-gradient(to right,#000 calc(100% - 2rem),transparent);mask-image:linear-gradient(to right,#000 calc(100% - 2rem),transparent)}}
.tr{display:block;min-width:0;overflow:hidden;white-space:nowrap;text-overflow:clip}
@supports (animation-timeline: scroll()){.tr{animation:truncate-mask-inline linear both;animation-timeline:scroll(self inline)}.tr:focus-visible{animation:none}}
.page{max-width:1200px}
.back{display:inline-flex;align-items:center;gap:4px;font-size:14px;color:var(--muted-foreground);text-decoration:none}
.ph h1{font-family:var(--font-heading);font-size:26px;font-weight:700;letter-spacing:-.02em;line-height:1.2}
.ph .sub{font-size:14px;color:var(--muted-foreground);margin-top:2px}
.meta{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:13px;color:var(--muted-foreground);margin-top:8px}
.meta span{display:inline-flex;gap:6px;align-items:center}
.chan{display:grid;gap:16px;grid-template-columns:1fr}
@media (min-width:900px){.chan{grid-template-columns:1fr 1fr}}
.chan>*{min-width:0}
.cc{border:1px solid var(--border);border-radius:var(--radius-xl);padding:16px 18px;background:var(--background);display:flex;flex-direction:column;gap:12px}
.cc-h{display:flex;align-items:center;gap:10px}
.cc-h .tile{width:32px;height:32px;border-radius:10px;display:grid;place-items:center;background:var(--secondary)}
.cc-h h2{font-family:var(--font-body);font-size:15px;font-weight:600;letter-spacing:0}
.cc-h .muted{font-size:12.5px;margin-left:auto}
.funnel{display:grid;grid-template-columns:repeat(var(--n),minmax(0,1fr));gap:6px}
.st{min-width:0;padding:8px 10px;border-radius:12px;background:var(--secondary)}
.st b{display:block;font-size:22px;font-weight:600;line-height:1.1;font-variant-numeric:tabular-nums}
.st span{display:block;font-size:12px;color:var(--muted-foreground);white-space:nowrap;overflow:hidden}
.st.win b{color:var(--axi-success)} .st.win{background:color-mix(in srgb,var(--axi-success) 12%,var(--background))}
.st.bad b{color:var(--axi-destructive)}
.base{font-size:13px;color:var(--muted-foreground)} .base b{color:var(--foreground);font-weight:600}
.fails{display:flex;flex-wrap:wrap;gap:6px;font-size:12.5px;align-items:center}
.fail{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 9px;border-radius:999px;border:1px solid var(--border);max-width:100%;min-width:0}
.fail .n{font-weight:600;font-variant-numeric:tabular-nums}
/* Lo nuevo: el pie de la tarjeta de WhatsApp */
.clean{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;justify-content:space-between;border-top:1px solid var(--border-soft);padding-top:12px}
.clean p{font-size:12.5px;color:var(--muted-foreground);display:flex;gap:6px;align-items:flex-start;min-width:0;flex:1 1 260px}
.clean p .ic{margin-top:2px;flex:none}
.new{outline:2px dashed color-mix(in srgb,var(--axi-brand) 55%,transparent);outline-offset:6px;border-radius:12px}
.confirm{border:1px solid var(--border);border-radius:var(--radius-lg);padding:14px 16px;background:var(--background);box-shadow:var(--shadow-overlay);display:grid;gap:10px}
.confirm h3{font-family:var(--font-body);font-size:15px;font-weight:600;letter-spacing:0}
.confirm ul{margin:0;padding:0 0 0 18px;display:grid;gap:4px;font-size:13.5px;color:var(--muted-foreground)}
.confirm .acts{display:flex;gap:8px;flex-wrap:wrap}
.done{display:flex;gap:8px;align-items:flex-start;font-size:12.5px;color:var(--muted-foreground)}
.done .ic{color:var(--axi-success);margin-top:2px;flex:none}
/* Fila del negocio (como en la vista aprobada) */
.list{border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden}
.lr{display:grid;grid-template-columns:minmax(180px,1.3fr) minmax(0,1fr) minmax(0,1fr) minmax(130px,.7fr);gap:14px;align-items:center;padding:10px 14px;border-bottom:1px solid var(--border-soft);font-size:14px}
.lr:last-child{border-bottom:0}
.lr>*{min-width:0}
.biz .sub,.why,.seqc .sub{font-size:12.5px;color:var(--muted-foreground)}
.cs{display:grid;grid-template-columns:16px minmax(0,1fr);gap:2px 8px;align-items:center}
.cs>.ic{color:var(--muted-foreground)}
.cs .lbl{display:flex;align-items:center;gap:8px;min-width:0;font-weight:500;font-size:13.5px}
.cs .why{grid-column:2}
.cs.bad .lbl{color:var(--axi-destructive)} .cs.good .lbl{color:var(--axi-success)}
.tag{display:inline-flex;align-items:center;gap:4px;height:20px;padding:0 7px;border-radius:999px;font-size:11.5px;font-weight:500;color:var(--muted-foreground);border:1px dashed var(--border);white-space:nowrap}
@media (max-width:1023px){.lr{grid-template-columns:minmax(0,1fr);gap:6px}}
.phone{width:390px;max-width:100%;margin:0 auto;border-left:1px solid var(--border);border-right:1px solid var(--border)}
.phone .page{padding:12px 16px 48px}
.phone .ph h1{font-size:22px}
.phone .chan{grid-template-columns:1fr}
.phone .funnel{grid-template-columns:repeat(2,minmax(0,1fr))!important}
.phone .lr{grid-template-columns:minmax(0,1fr);gap:6px}
@media (max-width:640px){.page{padding:12px 16px 48px}.funnel{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
"""


def header() -> str:
    return f"""
      <a class="back" href="#">{ic("chevron-left", size=16)}Secuencias</a>
      <div class="ph">
        <h1>Seguimiento · Captación cliente cero</h1>
        <p class="sub tr">25 negocios · 4 búsquedas del lote 1</p>
        <div class="meta"><span>{ic("filter", size=14)}Búsqueda: todas</span><span>{ic("send", size=14)}Primer toque lun 23 nov, 8:00</span></div>
      </div>"""


def whatsapp(state: str) -> str:
    if state == "after":
        foot = f"""<div class="clean"><p class="done">{ic("circle-check", size=14)}<span>Se quitaron del chat 13 mensajes que no llegaron y 10 chats que quedaban vacíos. Aquí siguen contados, con su motivo.</span></p></div>"""
    elif state == "none":
        foot = f"""<div class="clean"><p>{ic("info", size=13)}<span>No hay mensajes sin entregar en el chat.</span></p></div>"""
    else:
        cls = "new" if state == "where" else ""
        foot = f"""<div class="clean {cls}"><p>{ic("message-circle-x", size=13)}<span>Los 13 que no llegaron siguen en el chat como «No llegó».</span></p>
          {btn("Limpiar del chat (13)", "eraser", "sm outline")}</div>"""
    return f"""<section class="cc" aria-label="WhatsApp">
      <div class="cc-h"><span class="tile">{ic("message-circle", size=16)}</span><h2>WhatsApp</h2><span class="muted">18 de 25 tienen WhatsApp</span></div>
      <div class="funnel" style="--n:4"><div class="st"><b>18</b><span>Salieron</span></div><div class="st"><b>5</b><span>Entregados</span></div><div class="st"><b>3</b><span>Leídos</span></div><div class="st win"><b>1</b><span>Respondieron</span></div></div>
      <div class="fails"><span class="muted">No llegaron 13:</span>
        <span class="fail"><span class="n">8</span><span>El número no es celular</span></span>
        <span class="fail"><span class="n">3</span><span>Sin WhatsApp</span></span>
        <span class="fail"><span class="n">2</span><span>Tope de Meta</span></span></div>
      {foot}
    </section>"""


def email() -> str:
    return f"""<section class="cc" aria-label="Correo">
      <div class="cc-h"><span class="tile">{ic("mail", size=16)}</span><h2>Correo</h2><span class="muted">20 de 25 tienen correo</span></div>
      <p class="base"><b>20</b> salieron · <b>18</b> entregados</p>
      <div class="funnel" style="--n:4"><div class="st win"><b>1</b><span>Respondió</span></div><div class="st bad"><b>2</b><span>Rebotaron</span></div><div class="st"><b>0</b><span>Spam</span></div><div class="st"><b>7</b><span>Abrieron</span></div></div>
      <p class="base" style="font-size:12px">Un correo que rebotó no está en el chat: no hay nada que limpiar.</p>
    </section>"""


def confirm() -> str:
    return f"""<div class="confirm" role="group" aria-label="Confirmar limpieza">
      <h3>¿Quitamos del chat los 13 WhatsApp que no llegaron?</h3>
      <ul>
        <li>Solo los que no se entregaron. Lo que llegó, se leyó o tuvo respuesta no se toca.</li>
        <li>Si el chat de ese negocio queda vacío, también se quita del inbox (10 de los 13).</li>
        <li>Aquí siguen contados como «No llegó», con su motivo. Se puede volver a escribirles.</li>
      </ul>
      <div class="acts">{btn("Sí, quitar del chat", "eraser", "sm")}{btn("Ahora no", "", "sm ghost")}</div>
    </div>"""


def rows(after: bool) -> str:
    tag = f'<span class="tag">{ic("eraser", size=11)}Fuera del chat</span>' if after else ""
    return f"""<div class="list">
      <div class="lr"><div class="biz"><span class="tr" style="font-weight:500">Viajes Brisa Sur</span><span class="sub tr">Agencia de viajes · Bogotá</span></div>
        <div class="cs bad">{ic("message-circle", size=15)}<div class="lbl"><span>No llegó</span>{tag}</div><span class="why tr">El número no es celular: revisa su WhatsApp</span></div>
        <div class="cs">{ic("mail", size=15)}<div class="lbl"><span>Entregado</span></div><span class="why">Sin abrir</span></div>
        <div class="seqc"><span>Paso 2 de 4</span><span class="sub tr">Sigue por correo</span></div></div>
      <div class="lr"><div class="biz"><span class="tr" style="font-weight:500">Clínica Dermabella</span><span class="sub tr">Clínica estética · Bogotá</span></div>
        <div class="cs good">{ic("message-circle", size=15)}<div class="lbl"><span>Leído</span></div><span class="why">9:41</span></div>
        <div class="cs good">{ic("mail", size=15)}<div class="lbl"><span>Abrió · clic</span></div><span class="why tr">Clic en «Quiero la prueba gratis»</span></div>
        <div class="seqc"><span>Paso 2 de 4</span><span class="sub tr">Llamada · mié 25, 10:00</span></div></div>
    </div>"""


def page(state: str) -> str:
    wa = whatsapp("after" if state == "after" else ("where" if state == "where" else "plain"))
    extra = confirm() if state == "confirm" else ""
    return f"""<div class="page">{header()}<div class="chan">{wa}{email()}</div>{extra}{rows(state == "after")}</div>"""


def mobile() -> str:
    return f"""<div class="phone"><div class="page">{header()}<div class="chan">{whatsapp("plain")}</div>{confirm()}</div></div>"""


VIEWS = [
    ("donde", "1 · Dónde va", page("where"), "Pantalla «Seguimiento» (por secuencia, filtrable por búsqueda). El botón va al pie de la tarjeta de WhatsApp del resumen: ahí es donde se ve cuántos no llegaron y por qué. Solo aparece si hay mensajes sin entregar en el chat. El correo no lo necesita (un rebote no ensucia el chat). Recuadro punteado = lo nuevo."),
    ("confirmar", "2 · Confirmar", page("confirm"), "Confirmación en línea, con frase humana: qué se toca, qué no y qué pasa con los chats que quedan vacíos."),
    ("despues", "3 · Después", page("after"), "Queda dicho en la tarjeta, y cada negocio afectado lleva «Fuera del chat» junto a su «No llegó». El seguimiento no pierde nada."),
    ("movil", "4 · Móvil", mobile(), "A 390 px el botón baja bajo la frase y la confirmación ocupa el ancho."),
]

if __name__ == "__main__":
    K.build_html("Limpiar lo no entregado", "Mockup · no es producto", "Seguimiento del lote · quitar del chat los WhatsApp que no llegaron", VIEWS)
