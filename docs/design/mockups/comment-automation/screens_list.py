"""Pantallas 1 y 3 del lienzo: Redes (lista + embudo + «Lo próximo») y Detalle (DetailSheet con actividad)."""
from _shared import K, ic, btn, POSTS, PEOPLE, net, marketing_header, health, pill

K.extra_css += """
/* ── Lista: cabecera de la lista ── */
.auto .t b{white-space:nowrap;overflow:hidden;min-width:0}
.auto .t b.fade{-webkit-mask-image:linear-gradient(to right,#000 calc(100% - 40px),transparent);mask-image:linear-gradient(to right,#000 calc(100% - 40px),transparent)}
.auto .ctl{display:inline-flex;gap:6px;align-items:center}
.tile .tk{flex-wrap:wrap}
@container (max-width: 640px){.auto{align-items:start}}
.dsheet .meta .net{width:18px;height:18px;border-radius:5px;display:inline-grid;place-items:center;color:#fff;flex:none}
.lhead{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px}
.lhead h2{font-family:var(--font-body);font-size:16px;font-weight:600;letter-spacing:0}
.lhead .tools{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.global{display:inline-flex;gap:8px;align-items:center;font-size:12.5px;color:var(--muted-foreground)}

/* ── Detalle: hoja lateral de cristal sobre la lista ── */
.ov{position:relative}
.ov .scrim{position:absolute;inset:0;background:var(--scrim);z-index:20}
.dsheet{position:absolute;top:0;right:0;bottom:0;z-index:21;width:min(620px,100%);display:flex;flex-direction:column;overflow:auto;
  border-left:1px solid var(--border);background:color-mix(in srgb, var(--background) 90%, transparent);backdrop-filter:blur(22px) saturate(1.4);-webkit-backdrop-filter:blur(22px) saturate(1.4);box-shadow:var(--shadow-overlay);container-type:inline-size}
.dsheet .sh-head{display:grid;grid-template-columns:56px minmax(0,1fr) auto;gap:14px;align-items:center;padding:20px 22px 16px;border-bottom:1px solid var(--border-soft)}
.dsheet .sh-head img{width:56px;height:70px;border-radius:12px;object-fit:cover}
.dsheet .sh-head h2{font-size:20px;line-height:1.2}
.dsheet .sh-head .meta{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;margin-top:6px;font-size:12.5px;color:var(--muted-foreground)}
.dsheet .sh-body{padding:18px 22px 28px;display:flex;flex-direction:column;gap:18px}
.dsheet .sec h3{font-family:var(--font-body);font-size:13.5px;font-weight:600;letter-spacing:0;margin-bottom:10px;display:flex;justify-content:space-between;gap:8px;align-items:center}
.dsheet .sec h3 small{font-weight:400;color:var(--muted-foreground);font-size:12px}
.cfg{display:grid;grid-template-columns:auto minmax(0,1fr);gap:8px 14px;font-size:13px;padding:14px 16px;border:1px solid var(--border);border-radius:20px;background:var(--background)}
.cfg dt{color:var(--muted-foreground);font-size:12.5px;white-space:nowrap}
.cfg dd{margin:0;min-width:0;display:flex;flex-wrap:wrap;gap:4px 6px;align-items:center}

/* Actividad comentario por comentario */
.acts-list{display:flex;flex-direction:column;border:1px solid var(--border);border-radius:20px;background:var(--background);overflow:hidden}
.act{display:grid;grid-template-columns:32px minmax(0,1fr) auto;gap:4px 12px;padding:12px 14px;border-top:1px solid var(--border-soft);align-items:start}
.act:first-child{border-top:0}
.act .av{width:32px;height:32px;border-radius:50%;display:grid;place-items:center;font-size:12px;font-weight:600;background:var(--secondary)}
.act .who{display:flex;flex-wrap:wrap;gap:4px 8px;align-items:baseline;min-width:0}
.act .who b{font-weight:600;font-size:13px}
.act .who q{font-size:13px;quotes:"«" "»"}
.act .when{font-size:11.5px;color:var(--muted-foreground);white-space:nowrap}
.act .path{grid-column:2/-1;display:flex;flex-wrap:wrap;gap:4px;align-items:center;margin-top:4px}
.stepc{display:inline-flex;align-items:center;gap:5px;height:22px;padding:0 8px;border-radius:999px;font-size:11.5px;font-weight:500;background:var(--secondary);white-space:nowrap}
.stepc .ic{color:var(--muted-foreground)}
.stepc.done .ic{color:var(--axi-success)}
.stepc.wait .ic{color:var(--axi-warning)}
.stepc.stop .ic{color:var(--muted-foreground)}
.stepc.sale{background:color-mix(in srgb, var(--axi-brand) 12%, transparent)} .stepc.sale .ic{color:var(--axi-brand)}
.stepc.ai .ic{color:var(--axi-violet)}
.act .why{grid-column:2/-1;font-size:12px;color:var(--muted-foreground);margin-top:2px}
.act .why a{color:var(--foreground);font-weight:500;text-underline-offset:3px;text-decoration-color:var(--border)}
.arrow{color:var(--muted-foreground);display:inline-flex}
.sh-foot{position:sticky;bottom:0;margin-top:auto;padding:12px 22px;display:flex;gap:8px;justify-content:flex-end;border-top:1px solid var(--border-soft);background:color-mix(in srgb, var(--background) 92%, transparent)}
@container (max-width: 520px){.dsheet .sh-head{grid-template-columns:44px minmax(0,1fr) auto;padding:16px}.dsheet .sh-head img{width:44px;height:55px}.dsheet .sh-head h2{font-size:18px}.dsheet .sh-body{padding:16px 16px 24px}}

/* Móvil */
.mobile{width:390px;max-width:100%;margin:24px auto;border:1px solid var(--border);border-radius:32px;overflow:hidden;container-type:inline-size;background:var(--background)}
"""


# ----------------------------------------------------------------------------- datos de la lista
AUTOS = [
    dict(post="capsula", name="Colección Cápsula", kw=["INFO", "PRECIO", "LO QUIERO"], ai=True,
         n=(214, 198, 104, 61, 9), money="$ 1,7 M", state=("Activa", "on"), on=True, chans=["instagram"]),
    dict(post="tenis", name="Tenis Norte 01", kw=["TALLA", "INFO"], ai=False,
         n=(1284, 742, 296, 180, 21), money="$ 4,1 M", state=("En cola · ~8 min", "queue"), on=True, chans=["facebook", "instagram"]),
    dict(post="vestidos", name="Vestidos de lino", kw=["LINO"], ai=True,
         n=(37, 35, 12, 8, 0), money="", state=("Modo prueba", "test"), on=True, chans=["instagram"]),
    dict(post="gorras", name="Gorras de temporada · edición Feria de las Flores, colores de agosto", long=True, kw=["GORRA"], ai=False,
         n=(88, 81, 30, 19, 3), money="$ 270 mil", state=("En pausa", "off"), on=False, chans=["instagram"]),
]


def fmt(n):
    return f"{n:,}".replace(",", ".")


def auto_row(a):
    p = POSTS[a["post"]]
    kws = "".join(f'<span class="kw">{k}</span>' for k in a["kw"])
    ai = pill("Entiende la intención", "ai", "sparkles") if a["ai"] else ""
    c, r, o, cv, s = a["n"]
    sale = f'<span class="sale"><b>{s}</b> ventas · {a["money"]}</span>' if s else '<span><b>0</b> ventas aún</span>'
    chans = "".join(net(ch, 11) for ch in a["chans"])
    return f"""
<article class="auto">
  <img class="thumb" src="{p['thumb']}" alt="">
  <div class="main">
    <div class="t"><span class="netmini">{chans}</span><b class="{'fade' if a.get('long') else ''}">{a['name']}</b></div>
    <div class="meta"><span>{p['kind']} · publicado {p['when']}</span>{kws}{ai}</div>
    <div class="mini"><span><b>{fmt(c)}</b> comentarios</span><span><b>{fmt(r)}</b> respondidos</span><span><b>{fmt(o)}</b> tocaron «Envíamelo»</span>{sale}</div>
  </div>
  <div class="side">{pill(*a['state'])}<span class="ctl">{K.switch(a['on'], label='Encender ' + a['name'])}{btn('', 'ellipsis', 'ghost icon sm', 'aria-label="Más acciones"')}</span></div>
</article>"""


def funnel(nums, period="Últimos 7 días"):
    c, r, o, cv, s = nums
    rows = [
        ("Comentarios", "según Meta", c, ""),
        ("Respondidos", "en público y por privado", r, ""),
        ("Tocaron «Envíamelo»", "abrieron la conversación", o, ""),
        ("Conversaciones", "siguieron con el agente", cv, ""),
        ("Ventas", "pedidos pagados en 7 días", s, "sale"),
    ]
    out = []
    for lbl, src, n, cls in rows:
        w = max(2, round(100 * n / c))
        extra = '<small>$ 6,1 M</small>' if cls == "sale" else ""
        out.append(
            f'<div class="fstep {cls}"><span class="lbl">{lbl}<small>{src}</small></span>'
            f'<span class="track"><i style="width:{w}%"></i></span><span class="num">{f"{n:,}".replace(",", ".")}{extra}</span></div>'
        )
    seg = '<nav class="seg inline sm" aria-label="Periodo"><button role="radio" aria-checked="true">7 días</button><button role="radio" aria-checked="false">30 días</button></nav>'
    return f"""
<section class="tile" aria-label="De comentario a venta">
  <div class="tk"><span>De comentario a venta · {period}</span>{seg}</div>
  <div class="funnel">{''.join(out)}</div>
  <p class="next-line">{ic('arrow-right', size=16)}<span><b>131 personas tocaron «Envíamelo» y no han comprado.</b> Alba les escribe hoy con la talla y el envío. <a href="#" class="muted">Ver quiénes</a></span></p>
</section>"""


def next_up():
    return f"""
<aside class="island" aria-label="Lo próximo">
  <h3>Lo próximo</h3>
  <div class="item"><span class="ii">{ic('hourglass', size=15)}</span><div><b>Tenis Norte 01 va en cola.</b> Llegaron 1.284 comentarios desde ayer; se responden en orden en ~8 min y ninguno pasa de 7 días.</div></div>
  <div class="item"><span class="ii">{ic('flask-conical', size=15)}</span><div><b>Vestidos de lino sigue en modo prueba.</b> Ya respondió bien a tu equipo 12 veces.<div class="acts">{btn('Activar para todos', '', 'xs')}</div></div></div>
  <div class="item ai"><span class="ii">{ic('sparkles', size=15)}</span><div><span class="sig">{ic('sparkles', size=11)}Axi propone</span><br>Tu reel <b>Gorras de temporada</b> recibió 40 comentarios con «precio» esta semana y la automatización está en pausa. Reactívala con la palabra PRECIO.<div class="acts">{btn('Aprobar', '', 'xs')}{btn('Rechazar', '', 'outline xs')}</div></div></div>
</aside>"""


def list_page(narrow=False):
    total = (1623, 1056, 442, 268, 33)
    rows = "".join(auto_row(a) for a in AUTOS)
    return f"""
<div class="shell"><div class="page">
  {marketing_header(btn('Nueva automatización', 'plus'))}
  {health()}
  <div class="bento">{funnel(total)}{next_up()}</div>
  <section class="lhead"><h2>Tus automatizaciones <span class="muted small">· 4</span></h2>
    <div class="tools"><span class="global">Responder comentarios {K.switch(True, label='Responder comentarios en todas las cuentas')}</span></div>
  </section>
  <div class="autos">{rows}</div>
</div></div>"""


# ----------------------------------------------------------------------------- detalle
ACTIVITY = [
    (0, "INFO", "hace 2 min", [("done", "Respondido"), ("done", "Abrió"), ("done", "Entregado"), ("sale", "Compró · $ 189.000")], ""),
    (1, "precio porfa", "hace 6 min", [("done", "Respondido"), ("done", "Abrió"), ("done", "Entregado"), ("ai", "Alba le está escribiendo")], "Entró por la intención: no escribió la palabra exacta."),
    (2, "INFO", "hace 9 min", [("done", "Respondido"), ("wait", "Sin abrir")], "No sigue la cuenta: el mensaje está en sus solicitudes. Meta no deja escribirle de nuevo hasta que abra."),
    (3, "INFO INFO", "hace 12 min", [("stop", "Ignorado")], "Ya recibió la entrega hace 1 hora: una por persona en cada automatización."),
    (4, "me llegó con un hueco y nadie responde", "hace 20 min", [("stop", "Sin promoción"), ("done", "Avisado al equipo")], 'Parece una queja: no recibió la entrega. <a href="#">Responder en Instagram</a>'),
    (5, "lo quiero", "hace 31 min", [("done", "Respondido"), ("done", "Abrió"), ("wait", "Falta que siga la cuenta")], "Le pedimos que siga a @norte.studio y toque de nuevo."),
    (6, "INFO", "hace 3 h", [("stop", "No enviado")], 'El comentario se borró antes de responder.'),
]


def act_row(i, text, when, path, why):
    user, init = PEOPLE[i]
    icons = {"done": "circle-check", "wait": "clock", "stop": "circle-minus", "sale": "shopping-bag", "ai": "sparkles"}
    sep = f'<span class="arrow">{ic("chevron-right", size=12)}</span>'
    chips = sep.join(f'<span class="stepc {k}">{ic(icons[k], size=12)}{t}</span>' for k, t in path)
    w = f'<p class="why">{why}</p>' if why else ""
    return f"""
<div class="act"><span class="av" aria-hidden="true">{init}</span>
  <div class="who"><b>@{user}</b><q>{text}</q></div><span class="when">{when}</span>
  <div class="path">{chips}</div>{w}
</div>"""


def detail_sheet():
    p = POSTS["capsula"]
    a = AUTOS[0]
    filt = ('<nav class="seg inline sm" aria-label="Filtrar actividad">'
            '<button role="radio" aria-checked="true">Todos</button><button role="radio" aria-checked="false">Compraron</button>'
            '<button role="radio" aria-checked="false">Sin abrir</button><button role="radio" aria-checked="false">Ignorados</button></nav>')
    kws = "".join(f'<span class="kw">{k}</span>' for k in a["kw"])
    return f"""
<aside class="dsheet" role="dialog" aria-label="Colección Cápsula">
  <header class="sh-head">
    <img src="{p['thumb']}" alt="">
    <div><h2>Colección Cápsula</h2><div class="meta">{net('instagram', 11)} Reel · publicado {p['when']} {pill('Activa', 'on')}</div></div>
    {btn('', 'x', 'ghost icon sm x', 'aria-label="Cerrar"')}
  </header>
  <div class="sh-body">
    <section class="sec">{funnel(a['n'], 'desde que la activaste').replace('131 personas', '43 personas').replace('$ 6,1 M', '$ 1,7 M')}</section>
    <section class="sec"><h3>Así responde <a href="#" class="small muted">Editar</a></h3>
      <dl class="cfg">
        <dt>Cuando escriben</dt><dd>{kws}{pill('Entiende la intención', 'ai', 'sparkles')}</dd>
        <dt>En público</dt><dd>3 variantes que rotan · máximo 60 por hora</dd>
        <dt>Por privado</dt><dd>Apertura + botón «Envíamelo»</dd>
        <dt>Entrega</dt><dd>Texto, 3 fotos, Lookbook (PDF) y enlace a la colección</dd>
        <dt>Después</dt><dd>Sigue Alba · etiquetas <span class="kw">cápsula</span><span class="kw">vino-de-reel</span></dd>
      </dl>
    </section>
    <section class="sec"><h3>Comentario por comentario <small>en vivo</small></h3>
      <div style="margin-bottom:10px">{filt}</div>
      <div class="acts-list">{''.join(act_row(*r) for r in ACTIVITY)}</div>
    </section>
  </div>
  <footer class="sh-foot">{btn('Pausar', 'pause', 'outline sm')}{btn('Editar', 'pencil', 'sm')}</footer>
</aside>"""


def view_detalle():
    return f'<div class="ov">{list_page()}<div class="scrim"></div>{detail_sheet()}</div>'


def view_movil():
    return f'<div class="mobile">{list_page(narrow=True)}</div>'


def view_sheet_movil():
    return f'<div class="mobile" style="height:860px;position:relative"><div class="ov" style="height:100%">{detail_sheet()}</div></div>'


VIEWS = [
    ("redes", "Redes", list_page(), "La sección: salud de los canales, el embudo de comentario a venta con su procedencia, la isla «Lo próximo» con la propuesta de Axi, y una tarjeta por automatización con su estado, su embudo corto y su interruptor."),
    ("detalle", "Detalle", view_detalle(), "La hoja de una automatización: su embudo, cómo responde en una ficha, y la actividad comentario por comentario con el motivo de cada decisión (sin abrir, ignorado, queja, borrado)."),
    ("movil", "Redes · 390", view_movil(), "La lista en móvil: el embudo pasa a dos filas por paso y el estado y el interruptor bajan al pie de cada tarjeta."),
    ("detalle-movil", "Detalle · 390", view_sheet_movil(), "La hoja ocupa la pantalla completa en móvil."),
]
