"""Lienzo Inbox premium · F4 El contexto. Reutiliza el kit de F2 (helmet, nav, cabecera, hilo) y piezas de F3."""
import os, json
F4 = os.path.dirname(os.path.abspath(__file__)) + '/..'
F2B = os.path.abspath(F4 + '/../inboxf2/build/build.py')
src = open(F2B).read()
src = src[:src.index('# ------------------------------ 1 · Main')]
g = {'__file__': F2B}
exec(src, g)
I, H, page, head, pill, owner_btn, more, ev, day, who, msg, rail, list_col, expanded_col, desktop, JS, SEL, NAV = (
    g[k] for k in ['I', 'H', 'page', 'head', 'pill', 'owner_btn', 'more', 'ev', 'day', 'who', 'msg', 'rail', 'list_col', 'expanded_col', 'desktop', 'JS', 'SEL', 'NAV'])
OUT = F4 + '/project'
os.makedirs(OUT, exist_ok=True)

CSS = '''
.comp3{flex-shrink:0;padding:8px 16px 14px;background:var(--bg);display:flex;flex-direction:column;gap:8px}
.spill{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 10px;border-radius:999px;background:var(--chip);font-size:11.5px;font-weight:500;color:var(--fg2);white-space:nowrap}
.spill b{font-weight:600;color:var(--fg)}
.cblock{border:1px solid var(--line2);border-radius:20px;background:var(--card);box-shadow:var(--sh);display:flex;flex-direction:column}
.ctext{padding:12px 16px 4px;font-size:13.5px;color:var(--mut)}
.ctools{display:flex;align-items:center;gap:2px;padding:4px 6px 6px}
.tb{width:36px;height:36px;border-radius:999px;border:0;background:transparent;color:var(--fg2);display:inline-flex;align-items:center;justify-content:center}
.sendoff{width:36px;height:36px;border-radius:999px;border:0;background:var(--chip);color:var(--mut);display:inline-flex;align-items:center;justify-content:center}
.crail{width:52px;flex-shrink:0;border-left:1px solid var(--line);display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 0;background:var(--card)}
.cr{position:relative;width:36px;height:36px;border-radius:12px;border:0;background:transparent;color:var(--fg2);display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
.cr-on{background:var(--fg);color:var(--bg)}
.cr .c{position:absolute;top:-3px;right:-4px;min-width:16px;height:16px;padding:0 4px;box-sizing:border-box;border-radius:999px;background:var(--chip);color:var(--fg);box-shadow:0 0 0 2px var(--card);font:600 10px Poppins,sans-serif;display:inline-flex;align-items:center;justify-content:center}
.tip{position:absolute;right:48px;top:50%;transform:translateY(-50%);height:28px;padding:0 10px;border-radius:9px;background:var(--fg);color:var(--bg);font-size:12px;font-weight:500;display:inline-flex;align-items:center;white-space:nowrap;box-shadow:0 8px 20px -10px rgba(0,0,0,.4)}
.cpanel{width:340px;flex-shrink:0;display:flex;flex-direction:column;min-height:0;background:var(--card);border-left:1px solid var(--line)}
.cpanel.float{position:absolute;top:0;bottom:0;right:52px;z-index:6;box-shadow:-30px 0 60px -30px rgba(16,16,24,.35)}
.phead{display:flex;align-items:flex-start;gap:10px;padding:16px 12px 14px 18px;border-bottom:1px solid var(--line)}
.pbody{flex:1;min-height:0;overflow-y:auto;padding:16px 16px 18px;display:flex;flex-direction:column;gap:14px}
.pbody::-webkit-scrollbar{width:6px}.pbody::-webkit-scrollbar-thumb{border-radius:9px;background:radial-gradient(circle at 50% 30%,#F08A8C,#E65759)}
.pfoot{flex-shrink:0;display:flex;flex-direction:column;gap:8px;padding:12px 14px 14px;border-top:1px solid var(--line)}
.tile{border-radius:20px;background:var(--bg);border:1px solid var(--line);padding:14px 16px;display:flex;flex-direction:column;gap:8px}
.tl{font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--mut)}
.fig{font-family:Urbanist,Poppins,sans-serif;font-size:34px;font-weight:700;line-height:1;letter-spacing:-.02em}
.seg5{display:grid;grid-template-columns:repeat(5,1fr);gap:4px}.seg5 span{height:8px;border-radius:9px;background:var(--track)}.seg5 span.on{background:var(--fg)}
.st{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 10px;border-radius:999px;background:var(--chip);font-size:12px;font-weight:500;white-space:nowrap}
.fl{display:grid;grid-template-columns:92px 1fr;gap:9px 12px;font-size:12.5px}
.fl dt{color:var(--mut)}.fl dd{margin:0;color:var(--fg);min-width:0;overflow-wrap:anywhere}
.tag{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 10px;border-radius:999px;border:1px solid var(--line2);font-size:12px;background:var(--card)}
.dv{display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-radius:14px;background:var(--card);border:1px solid var(--line)}
.dv .k{font-size:11px;color:var(--mut)}.dv .v{font-size:13px;font-weight:500}
.mini{height:28px;padding:0 10px;border-radius:999px;border:1px solid var(--line2);background:var(--card);font:500 12px Poppins,sans-serif;color:var(--fg);display:inline-flex;align-items:center;gap:6px}
.pbtn{height:40px;border-radius:999px;border:1px solid var(--line2);background:var(--card);font:500 13px Poppins,sans-serif;color:var(--fg);display:inline-flex;align-items:center;justify-content:center;gap:8px}
.pbtn-ink{border-color:transparent;background:var(--fg);color:var(--bg)}
.segc{display:flex;gap:2px;padding:3px;border-radius:999px;background:var(--chip)}
.segc button{flex:1;height:30px;border-radius:999px;border:0;background:transparent;color:var(--mut);font:500 12px Poppins,sans-serif;white-space:nowrap;padding:0 6px}
.segc .on{background:var(--card);color:var(--fg);box-shadow:0 1px 2px rgba(0,0,0,.08)}
.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.th{aspect-ratio:1;border-radius:12px;position:relative;overflow:hidden}
.th .d{position:absolute;left:6px;bottom:6px;height:18px;padding:0 6px;border-radius:999px;background:rgba(11,11,14,.55);color:#fff;font-size:10px;display:inline-flex;align-items:center;gap:3px}
.photo{background:linear-gradient(180deg,#8FC9E8 0%,#BFE3F2 42%,#F2E3C4 43%,#E9D2A6 70%,#D9BC8A 100%)}
.photo2{background:radial-gradient(circle at 30% 30%,#FFE9B8 0 12%,transparent 13%),linear-gradient(160deg,#2F7C8F,#5DB3B8 55%,#E7D6A9 56%,#D8C08E)}
.photo3{background:linear-gradient(200deg,#F6C7A6,#E98E7C 45%,#6D5A8C)}
.photo4{background:linear-gradient(180deg,#9FB7C9,#DCE4EA 50%,#6E8B5E 51%,#4F6B45)}
.drow{display:flex;align-items:center;gap:10px;padding:8px 6px 8px 8px;border-radius:14px}
.ext{width:32px;height:36px;border-radius:8px;background:var(--card);box-shadow:inset 0 0 0 1px var(--line2);display:inline-flex;align-items:flex-end;justify-content:center;padding-bottom:5px;box-sizing:border-box;font:700 9px Poppins,sans-serif;color:var(--fg2);flex-shrink:0}
.tlx{position:relative;padding-left:22px;display:flex;flex-direction:column;gap:14px}
.tlx::before{content:"";position:absolute;left:7px;top:6px;bottom:6px;width:1.5px;background:var(--line2)}
.tli{position:relative;display:flex;flex-direction:column;gap:2px}
.tli::before{content:"";position:absolute;left:-19px;top:5px;width:9px;height:9px;border-radius:9px;background:var(--card);box-shadow:inset 0 0 0 2px var(--fg2)}
.tli.ai::before{box-shadow:inset 0 0 0 2px var(--ai)}
.tli .t{font-size:12.5px;line-height:1.4}.tli .m{font-size:11px;color:var(--mut)}
.chipf{height:28px;padding:0 11px;border-radius:999px;border:1px solid var(--line2);background:transparent;color:var(--mut);font:500 12px Poppins,sans-serif;white-space:nowrap;flex-shrink:0}
.chipf.on{background:var(--fg);color:var(--bg);border-color:transparent}
.call{display:flex;align-items:center;gap:10px;padding:10px 10px 10px 12px;border-radius:16px;border:1px solid var(--line);background:var(--bg)}
.pl{width:32px;height:32px;border-radius:999px;border:0;background:var(--fg);color:var(--bg);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0}
.ord{border-radius:18px;border:1px solid var(--line);background:var(--bg);padding:12px 14px;display:flex;flex-direction:column;gap:8px}
.obar{height:6px;border-radius:9px;background:var(--track);overflow:hidden}.obar span{display:block;height:100%;background:var(--fg);border-radius:9px}
.paper{width:26px;height:32px;border-radius:4px;background:#fff;box-shadow:0 0 0 1px rgba(0,0,0,.12),0 2px 4px rgba(0,0,0,.08);flex-shrink:0;position:relative}
.paper::before{content:"";position:absolute;left:5px;right:5px;top:8px;height:2px;background:#D13F42;border-radius:2px}
.paper::after{content:"";position:absolute;left:5px;right:8px;top:14px;height:2px;background:#DADADF;border-radius:2px;box-shadow:0 5px 0 #DADADF}
.scrim{position:absolute;inset:0;z-index:5;background:rgba(11,11,14,.32)}
.sk{background:var(--track);border-radius:8px;display:block}
'''
H = H.replace('</style>', CSS + '</style>')
g['H'] = H

X = {
 'x': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"></path></svg>',
 'ext': '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"></path></svg>',
 'dl': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"></path></svg>',
 'play': '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15a1 1 0 0 0 1.5.9l12-7.5a1 1 0 0 0 0-1.8l-12-7.5A1 1 0 0 0 7 4.5z"></path></svg>',
 'bag': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 8h14l-1 12H6z"></path><path d="M9 8V6a3 3 0 0 1 6 0v2"></path></svg>',
 'cal': '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"></rect><path d="M3 10h18M8 3v4M16 3v4"></path></svg>',
 'ok': '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" stroke-width="2.6" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>',
 'pen': '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"></path></svg>',
 'mic': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3"></rect><path d="M5 11a7 7 0 0 0 14 0M12 18v3"></path></svg>',
 'cam': '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M23 7 16 12l7 5z"></path><rect x="1" y="5" width="15" height="14" rx="2"></rect></svg>',
 'info': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 11v5M12 8h0"></path></svg>',
 'lock': '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"></rect><path d="M8 11V8a4 4 0 0 1 8 0v3"></path></svg>',
 'out': '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"></path></svg>',
 'inn': '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M17 7 7 17M15 17H7V9"></path></svg>',
}
I.update(X)

PANELS = [('contact', 'Contacto', 'user', None), ('attachments', 'Adjuntos', 'clip', '9'), ('history', 'Historial', 'hist', None), ('calls', 'Llamadas', 'phone', '2'), ('orders', 'Pedidos', 'bag', '1')]


def crail(active=None, tip=False, with_orders=True):
    out = ''
    for pid, label, icon, count in PANELS:
        if pid == 'orders' and not with_orders:
            continue
        on = pid == active
        c = f'<span class="c">{count}</span>' if count else ''
        t = f'<span class="tip" role="tooltip">{label}</span>' if (tip and on) else ''
        out += f'<button type="button" class="cr{" cr-on" if on else ""}" aria-label="{label}" aria-pressed="{"true" if on else "false"}">{I[icon]}{c}{t}</button>'
    return f'<aside class="crail" aria-label="Contexto de la conversación">{out}</aside>'


def phead(kicker, title, sub=''):
    s = f'<span style="font-size:12px;color:var(--mut)">{sub}</span>' if sub else ''
    return f'''<header class="phead"><div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:3px"><span class="kick">{kicker}</span>
      <h2 class="d" style="margin:0;font-size:20px;font-weight:700;letter-spacing:-.01em;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{title}</h2>{s}</div>
      <button type="button" class="icb" aria-label="Cerrar el panel" style="width:36px;height:36px;color:var(--fg2)">{I['x']}</button></header>'''


# ------------------------------ paneles ------------------------------
def contact_panel():
    return f'''{phead('Contacto', 'Laura Gómez', 'Cliente desde el 2 de septiembre · WhatsApp')}
    <div class="pbody">
      <div style="display:flex;align-items:center;gap:12px">
        <span class="av" style="width:48px;height:48px;font-size:15px">LG</span>
        <div style="display:flex;flex-direction:column;gap:6px;min-width:0">
          <span style="display:flex;gap:6px;flex-wrap:wrap"><span class="st"><span class="dot" style="background:var(--warn)"></span>Lead · evaluando</span><span class="st">{I['user']}Owner Demo</span></span>
        </div>
      </div>
      <section class="tile" aria-label="Qué tan cerca está">
        <span class="tl">Qué tan cerca está</span>
        <span style="display:flex;align-items:baseline;gap:6px"><span class="fig">62</span><span style="font-size:12px;color:var(--mut)">de 100</span></span>
        <div class="seg5" aria-label="Hitos del embudo"><span class="on" title="Habló"></span><span class="on" title="Se interesó"></span><span class="on" title="Recibió cotización"></span><span title="Compromiso"></span><span title="Conversión"></span></div>
        <span style="font-size:12px;color:var(--fg2);line-height:1.45">Habló, se interesó y recibió cotización. Falta: compromiso y conversión.</span>
      </section>
      <section style="display:flex;flex-direction:column;gap:10px"><span class="tl">Datos de contacto</span>
        <dl class="fl"><dt>Teléfono</dt><dd class="tnum">+57 301 555 0142</dd><dt>Correo</dt><dd>laura.gomez@gmail.com</dd><dt>Documento</dt><dd>CC 1.020.456.789</dd><dt>Ciudad</dt><dd>Bogotá</dd><dt>Canales</dt><dd style="display:flex;gap:6px;align-items:center">{I['wa']}<span>WhatsApp Ventas</span></dd></dl>
      </section>
      <section style="display:flex;flex-direction:column;gap:8px"><span class="tl">Etiquetas</span>
        <div style="display:flex;flex-wrap:wrap;gap:6px"><span class="tag"><span class="dot" style="background:#2563EB"></span>Santa Marta</span><span class="tag"><span class="dot" style="background:#16A34A"></span>Pareja</span><span class="tag"><span class="dot" style="background:#D97706"></span>Noviembre</span><span class="tag"><span class="dot" style="background:#9333EA"></span>Pagó abono</span></div>
      </section>
      <section style="display:flex;flex-direction:column;gap:8px"><span class="tl" style="display:flex;align-items:center;gap:6px">{I['spark']}Datos del cliente · los anotó Axi</span>
        <div class="dv"><div style="flex:1;min-width:0"><div class="k">Fechas del viaje</div><div class="v">14 al 18 de noviembre</div></div><span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;color:var(--ok)">{I['ok']}Confirmado</span></div>
        <div class="dv"><div style="flex:1;min-width:0"><div class="k">Personas</div><div class="v">2 adultos</div><div class="k" style="margin-top:2px">Lo dijo el cliente · ayer 4:18 p. m.</div></div><span style="display:flex;gap:6px"><button type="button" class="mini">{I['ok']}Confirmar</button></span></div>
        <div class="dv"><div style="flex:1;min-width:0"><div class="k">Presupuesto</div><div class="v tnum">$ 4.500.000</div><div class="k" style="margin-top:2px">Lo dedujo Axi · sin verificar</div></div><span style="display:flex;gap:6px"><button type="button" class="mini">{I['ok']}Confirmar</button><button type="button" class="mini" aria-label="Corregir">{I['pen']}</button></span></div>
      </section>
    </div>
    <div class="pfoot"><button type="button" class="pbtn">{I['spark']}Programar seguimiento</button><a href="#" class="pbtn" style="text-decoration:none">Ver ficha completa{I['ext']}</a></div>'''


def attachments_panel():
    th = lambda cls, dur='': f'<button type="button" class="th {cls}" style="border:0;padding:0" aria-label="Ver foto">{f"<span class=d>{I[chr(99)+chr(97)+chr(109)]}{dur}</span>" if dur else ""}</button>'
    return f'''{phead('Adjuntos', '9 archivos', 'En lo que llevas cargado de la conversación')}
    <div class="pbody">
      <div class="segc" role="radiogroup" aria-label="Tipo de adjunto"><button type="button" class="on" role="radio" aria-checked="true">Todo</button><button type="button" role="radio" aria-checked="false">Fotos</button><button type="button" role="radio" aria-checked="false">Videos</button><button type="button" role="radio" aria-checked="false">Audios</button><button type="button" role="radio" aria-checked="false">Docs</button></div>
      <span class="tl">Hoy</span>
      <div class="grid3">{th('photo')}{th('photo2')}{th('photo4', '0:32')}{th('photo3')}</div>
      <div style="display:flex;flex-direction:column;gap:2px">
        <div class="drow"><span class="ext" style="color:var(--brand)">PDF</span><span style="flex:1;min-width:0;display:flex;flex-direction:column"><span style="font-size:12.5px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Itinerario Santa Marta · Laura Gómez.pdf</span><span class="tnum" style="font-size:11px;color:var(--mut)">2,4 MB · 9:24 a. m.</span></span><button type="button" class="icb" aria-label="Descargar">{I['dl']}</button></div>
        <div class="drow"><span class="ext">{I['mic']}</span><span style="flex:1;min-width:0;display:flex;flex-direction:column"><span style="font-size:12.5px;font-weight:500">Nota de voz · 0:42</span><span class="tnum" style="font-size:11px;color:var(--mut)">De Laura · 9:20 a. m.</span></span><button type="button" class="icb" aria-label="Descargar">{I['dl']}</button></div>
      </div>
      <span class="tl">Ayer</span>
      <div class="grid3">{th('photo2')}{th('photo')}</div>
      <div class="drow"><span class="ext">XLS</span><span style="flex:1;min-width:0;display:flex;flex-direction:column"><span style="font-size:12.5px;font-weight:500">Cotización grupo.xlsx</span><span class="tnum" style="font-size:11px;color:var(--mut)">86 KB · 4:31 p. m.</span></span><button type="button" class="icb" aria-label="Descargar">{I['dl']}</button></div>
      <div style="margin-top:auto;display:flex;flex-direction:column;align-items:center;gap:8px;padding-top:6px;text-align:center"><span style="font-size:11.5px;color:var(--mut);line-height:1.45">Solo lo que ya se cargó del hilo. Más atrás puede haber otros.</span><button type="button" class="mini" style="height:32px">Cargar más de la conversación</button></div>
    </div>'''


def history_panel():
    items = [
        ('', 'Recibió la cotización Santa Marta · 2 personas', 'Pedido AX-3391 · hoy 9:02 a. m.'),
        ('ai', 'Axi pasó la conversación al equipo', 'Conversación · ayer 4:18 p. m.'),
        ('', 'Pasó de prospecto a lead', 'Etapa · ayer 4:12 p. m.'),
        ('', 'Nota: «Prefiere pagar en dos partes»', 'Owner Demo · 20 sep'),
        ('ai', 'Axi agendó una llamada de seguimiento', 'Cita · 18 sep 10:00 a. m.'),
        ('', 'Oportunidad «Luna de miel» creada · $ 4.380.000', 'Pipeline · 12 sep'),
        ('', 'Primer mensaje por WhatsApp Ventas', 'Conversación · 2 sep'),
    ]
    tl = ''.join(f'<div class="tli {c}"><span class="t">{t}</span><span class="m">{m}</span></div>' for c, t, m in items)
    chips = ''.join(f'<button type="button" class="chipf{" on" if i == 0 else ""}" aria-pressed="{"true" if i == 0 else "false"}">{x}</button>' for i, x in enumerate(['Todo', 'Actividades', 'Pedidos', 'Conversaciones', 'Citas']))
    return f'''{phead('Historial', 'Todo con Laura', 'La misma línea de tiempo de la ficha 360')}
    <div class="pbody">
      <div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:2px" class="scr">{chips}</div>
      <div class="tlx">{tl}</div>
      <button type="button" class="mini" style="align-self:center;height:32px">Cargar más</button>
    </div>'''


def calls_panel():
    return f'''{phead('Llamadas', '2 con Laura', 'Las hizo el agente de voz')}
    <div class="pbody">
      <div class="call"><button type="button" class="pl" aria-label="Escuchar la grabación">{I['play']}</button><span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px"><span style="font-size:13px;font-weight:500;display:flex;align-items:center;gap:6px">{I['out']}Seguimiento de cotización</span><span class="tnum" style="font-size:11px;color:var(--mut)">18 sep · 10:02 a. m. · 3:41</span></span><span class="st" style="height:22px;font-size:11px"><span class="dot" style="background:var(--ok)"></span>Interesada</span></div>
      <div class="call"><button type="button" class="pl" aria-label="Escuchar la grabación">{I['play']}</button><span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px"><span style="font-size:13px;font-weight:500;display:flex;align-items:center;gap:6px">{I['inn']}Consulta de fechas</span><span class="tnum" style="font-size:11px;color:var(--mut)">5 sep · 6:40 p. m. · 1:12</span></span><span class="st" style="height:22px;font-size:11px"><span class="dot" style="background:var(--mut)"></span>Sin resultado</span></div>
      <a href="#" style="align-self:center;font-size:12px;font-weight:500;display:inline-flex;align-items:center;gap:5px;min-height:24px">Ver todas en Llamadas{I['ext']}</a>
    </div>'''


def orders_panel():
    return f'''{phead('Pedidos', '1 con saldo', 'Con saldo primero')}
    <div class="pbody">
      <div class="ord">
        <div style="display:flex;align-items:center;gap:8px"><span style="font:600 13px Poppins,sans-serif;white-space:nowrap" class="tnum">AX-3391</span><span class="st" style="height:22px;font-size:11px"><span class="dot" style="background:var(--warn)"></span>Abonado</span><span style="flex:1"></span><span style="font-size:11px;color:var(--mut)" class="tnum">{I['cal']} 14 nov · en 48 días</span></div>
        <span style="font-size:12.5px;color:var(--fg2)">Santa Marta · 2 personas · 4 noches</span>
        <div class="obar"><span style="width:30%"></span></div>
        <div style="display:flex;justify-content:space-between;font-size:12px" class="tnum"><span><b style="font-weight:600">$ 1.314.000</b> de $ 4.380.000</span><span style="color:var(--mut)">Saldo $ 3.066.000</span></div>
        <div style="display:flex;align-items:center;gap:8px;padding-top:4px;border-top:1px solid var(--line)"><span class="paper" aria-hidden="true"></span><span style="flex:1;min-width:0;display:flex;flex-direction:column"><span style="font-size:12px;font-weight:500">Contrato de servicio</span><span style="font:400 11px ui-monospace,monospace;color:var(--mut)">CT-000184 · 22 sep</span></span><button type="button" class="mini">Ver</button></div>
        <a href="#" class="pbtn" style="height:36px;text-decoration:none;font-size:12.5px">Abrir el pedido{I['ext']}</a>
      </div>
      <div class="ord" style="opacity:.85">
        <div style="display:flex;align-items:center;gap:8px"><span style="font:600 13px Poppins,sans-serif;white-space:nowrap" class="tnum">AX-2210</span><span class="st" style="height:22px;font-size:11px"><span class="dot" style="background:var(--ok)"></span>Pagado</span><span style="flex:1"></span><span style="font-size:11px;color:var(--mut)">Viajó en marzo</span></div>
        <span style="font-size:12.5px;color:var(--fg2)">Cartagena · 2 personas</span>
      </div>
    </div>'''


PANEL_HTML = {'contact': contact_panel, 'attachments': attachments_panel, 'history': history_panel, 'calls': calls_panel, 'orders': orders_panel}


def composer():
    return f'''<div class="comp3"><div style="display:flex;padding:0 4px"><span class="spill"><span class="dot" style="background:var(--ok)"></span>Ventana de 24 h · quedan <b>21 h</b></span></div>
      <div class="cblock"><div class="ctext">Escribe a Laura…</div><div class="ctools"><button type="button" class="tb" aria-label="Adjuntar archivo">{I['clip']}</button><button type="button" class="tb" aria-label="Acciones rápidas">{I['zap']}</button><span style="flex:1"></span><button type="button" class="tb" aria-label="Grabar nota de voz">{I['mic']}</button><button type="button" class="sendoff" aria-label="Enviar mensaje">{I['sendi']}</button></div></div></div>'''


THREAD = (
    '<div style="margin-top:auto"></div>' + day('Hoy')
    + who('Tú', right=True)
    + msg('out', 'Buenos días, Laura. Te preparé la cotización con traslados incluidos.', last=False)
    + msg('out', 'Total para dos personas: $ 4.380.000. El link de pago vence mañana a las 6:00 p. m.', '9:02 a. m.', 'read')
    + msg('in', 'Perfecto, quedo atenta al link de pago', '9:40 a. m.', gap=True)
    + msg('in', '¿Y si pago la mitad ahora y la otra en octubre?', '9:41 a. m.')
)


def conv(narrow=False, info_btn=False):
    actions = owner_btn('OD') + f'<button type="button" class="btn btn-ink" style="height:36px">{I["check"]}Cerrar</button>' + more()
    if narrow:
        actions = f'<button type="button" class="btn btn-ink" style="height:36px;padding:0 12px">{I["check"]}Cerrar</button>' + more()
    return f'''<section class="conv" aria-label="Conversación con Laura Gómez">
      {head('Laura Gómez', 'LG', 'WhatsApp Ventas · +57 301 555 0142', '' if narrow else pill('mine', 'Contigo'), actions)}
      <div class="thread" style="display:flex;flex-direction:column">{THREAD}</div>
      {composer()}
    </section>'''


def workspace(cols, conv_html, panel_html, mode):
    """mode: inline | float"""
    if mode == 'float':
        panel = f'<div class="scrim" aria-hidden="true"></div><aside class="cpanel float" aria-label="Panel de contexto">{panel_html}</aside>'
        return f'<div style="display:flex;flex-grow:1;min-height:0;position:relative">{cols}{conv_html}{panel}{{{{crail}}}}</div>'
    return f'<div style="display:flex;flex-grow:1;min-height:0">{cols}{conv_html}<aside class="cpanel" aria-label="Panel de contexto">{panel_html}</aside>{{{{crail}}}}</div>'


def app(inner, width=1440, height=1000):
    return f'''<div class="app {{{{themeCls}}}} bub-tinta" style="width:{width}px;height:{height}px">
  {NAV}
  <main style="flex-grow:1;display:flex;flex-direction:column;min-width:0;min-height:0">
    <header style="height:52px;display:flex;align-items:center;gap:12px;padding:0 20px 0 24px;flex-shrink:0;border-bottom:1px solid var(--line)"><span style="font-size:13px;color:var(--mut)">Workspace</span><span style="font-size:13px;color:var(--mut)">/</span><span style="font-size:13px;font-weight:500">Inbox</span></header>
    {inner}
  </main>
</div>'''


# ------------------------------ 1 · Main (interactivo) ------------------------------
def panel_switch():
    return ''.join(f'<sc-if value="{{{{p_{pid}}}}}" hint-placeholder-val="{{{{ {"true" if pid == "contact" else "false"} }}}}">{PANEL_HTML[pid]()}</sc-if>' for pid, *_ in PANELS)


def crail_switch(tip=False):
    return ''.join(f'<sc-if value="{{{{p_{pid}}}}}" hint-placeholder-val="{{{{ {"true" if pid == "contact" else "false"} }}}}">{crail(pid, tip)}</sc-if>' for pid, *_ in PANELS)


main_float = workspace(expanded_col('mine') + list_col('Contigo', '5 contigo', '{{rows}}', dot=False), conv(), panel_switch(), 'float').replace('{{crail}}', crail_switch())
main_inline = workspace(rail('mine') + list_col('Contigo', '5 contigo', '{{rows}}', dot=False), conv(narrow=True), panel_switch(), 'inline').replace('{{crail}}', crail_switch())
main_body = app(f'<sc-if value="{{{{floatMode}}}}" hint-placeholder-val="{{{{ true }}}}">{main_float}</sc-if><sc-if value="{{{{inlineMode}}}}" hint-placeholder-val="{{{{ false }}}}">{main_inline}</sc-if>')
main_js = '''  renderVals() {
    const dark = this.props.dark === true;
''' + JS + '''
    const sel = (k, active) => Object.assign(mkRow(k, false, false), { sel: active ? "''' + SEL + '''" : '' });
    PEOPLE.laura.prev = '¿Y si pago la mitad ahora y la otra en octubre?';
    const map = { 'contacto': 'contact', 'adjuntos': 'attachments', 'historial': 'history', 'llamadas': 'calls', 'pedidos': 'orders' };
    const p = map[this.props.panel ?? 'contacto'] || 'contact';
    const flags = {}; ['contact','attachments','history','calls','orders'].forEach(x => flags['p_' + x] = x === p);
    const inline = this.props.d6 === 'empuja (columna a riel)';
    return { ...flags, floatMode: !inline, inlineMode: inline, themeCls: dark ? 'dk' : 'lt', rows: [sel('laura', true), sel('andres', false)] };
  }'''
PROPS = '"dark":{"editor":"boolean","default":false},"panel":{"editor":"enum","options":["contacto","adjuntos","historial","llamadas","pedidos"],"default":"contacto"},"d6":{"editor":"enum","options":["flota sobre el chat","empuja (columna a riel)"],"default":"flota sobre el chat"}'
open(OUT + '/Main.dc.html', 'w').write(page('Inbox · El contexto', 1440, 1000, main_body, main_js, PROPS))
open(OUT + '/Oscuro.dc.html', 'w').write(page('Inbox · El contexto · oscuro', 1440, 1000, main_body, main_js.replace("const dark = this.props.dark === true;", "const dark = this.props.dark !== false;"), PROPS.replace('"dark":{"editor":"boolean","default":false}', '"dark":{"editor":"boolean","default":true}').replace('"default":"contacto"', '"default":"adjuntos"')))

# ------------------------------ 2 · Ancha 1920 en línea ------------------------------
wide = app(workspace(expanded_col('mine') + list_col('Contigo', '5 contigo', '{{rows}}', dot=False), conv(), contact_panel(), 'inline').replace('{{crail}}', crail('contact', True)), 1920, 1080)
open(OUT + '/Ancha.dc.html', 'w').write(page('Inbox · Contexto en pantalla ancha', 1920, 1080, wide, main_js.split('const map')[0] + "return { themeCls: dark ? 'dk' : 'lt', rows: [sel('laura', true), sel('andres', false)] };\n  }"))

# ------------------------------ 3 · Los cinco paneles lado a lado ------------------------------
def pcard(label, html, note):
    return f'''<div style="display:flex;flex-direction:column;gap:8px;min-width:0"><span class="lbl">{label}</span>
      <div style="height:780px;border-radius:24px;overflow:hidden;border:1px solid var(--line);display:flex;box-shadow:var(--sh)"><aside class="cpanel" style="width:100%;border-left:0">{html}</aside></div>
      <span style="font-size:12px;color:var(--mut);line-height:1.45">{note}</span></div>'''
five = f'''<div class="{{{{themeCls}}}}" style="width:1880px;height:1000px;box-sizing:border-box;padding:40px 48px;background:var(--bg);color:var(--fg);font-family:Poppins,system-ui,sans-serif;display:flex;flex-direction:column;gap:22px">
  <div><span class="kick">Los paneles</span><h1 class="d" style="margin:6px 0 0;font-size:30px;font-weight:700;letter-spacing:-.02em">Una cabecera, un cuerpo, un pie: lo mismo en los cinco</h1></div>
  <div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:20px">
    {pcard('Contacto', contact_panel(), 'La 360 en pequeño: etapa en StatePill, «Qué tan cerca está» en tramos (scoreProgress del CRM F2), datos, etiquetas con su color y lo que anotó Axi para confirmar.')}
    {pcard('Adjuntos', attachments_panel(), 'Segmentado, miniaturas cuadradas uniformes por día y documentos como ficha. Dice que solo cubre lo cargado del hilo.')}
    {pcard('Historial', history_panel(), 'El mismo ContactTimelineFeed del CRM; los filtros pasan de coral (bg-accent) a tinta.')}
    {pcard('Llamadas', calls_panel(), 'ContactCallsList de Llamadas premium, con el resultado como punto y la grabación a un toque.')}
    {pcard('Pedidos · D5 (nuevo)', orders_panel(), 'Los pedidos del contacto con saldo primero, su barra de cobro y el documento; «Abrir el pedido» va a su rail.')}
  </div>
</div>'''
open(OUT + '/Paneles.dc.html', 'w').write(page('Inbox · Los paneles de contexto', 1880, 1000, five, "  renderVals() { const dark = this.props.dark === true; return { themeCls: dark ? 'dk' : 'lt' }; }"))

# ------------------------------ 4 · D6 comparación ------------------------------
def d6cell(label, note, body):
    return f'''<div style="display:flex;flex-direction:column;gap:8px;min-width:0"><span class="lbl" style="color:#6B6B73">{label}</span>
      <div style="height:400px;border-radius:24px;overflow:hidden;border:1px solid rgba(0,0,0,.08)"><div style="zoom:.4">{body}</div></div>
      <span style="font-size:12px;color:#6B6B73;line-height:1.45">{note}</span></div>'''
today_inline = app(workspace(expanded_col('mine') + list_col('Contigo', '5 contigo', '{{rows}}', dot=False), conv(narrow=True), contact_panel(), 'inline').replace('{{crail}}', crail('contact')), 1440, 1000)
opt_a = app(workspace(expanded_col('mine') + list_col('Contigo', '5 contigo', '{{rows}}', dot=False), conv(), contact_panel(), 'float').replace('{{crail}}', crail('contact')), 1440, 1000)
opt_b = app(workspace(rail('mine') + list_col('Contigo', '5 contigo', '{{rows}}', dot=False), conv(narrow=True), contact_panel(), 'inline').replace('{{crail}}', crail('contact')), 1440, 1000)
d6 = f'''<div style="width:1880px;height:1000px;box-sizing:border-box;padding:40px 48px;background:#F5F5F7;color:#0B0B0E;font-family:Poppins,system-ui,sans-serif;display:flex;flex-direction:column;gap:18px">
  <div><span class="kick" style="color:#6B6B73">D6 · Dónde abre el contexto a 1280–1535 px</span><h1 class="d" style="margin:6px 0 0;font-size:30px;font-weight:700;letter-spacing:-.02em">Hoy, a 1440 px, abrir el contacto deja el chat en 240 px</h1>
  <p style="margin:6px 0 0;font-size:13px;color:#3A3A40;max-width:1100px;line-height:1.5">Desde xl el panel entra en línea como cuarta columna. Con la columna de la bandeja de F1 desplegada ya no cabe: navegación 256 + bandeja 232 + lista 320 + panel 340 + riel 52. Desde 1536 px (2xl) sí cabe en línea, como hoy.</p></div>
  <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px">
    {d6cell('Hoy · en línea desde xl', 'El chat queda en unos 240 px: la conversación no se lee y la cabecera pierde el nombre.', today_inline)}
    {d6cell('(a) Flota sobre el chat hasta 2xl · recomendada', 'Nada se mueve: el panel entra desde la derecha con sombra, se cierra con Esc, tocando fuera o con la X. Desde 1536 px, en línea.', opt_a)}
    {d6cell('(b) Empuja y la columna pasa a riel', 'El panel queda en línea y la bandeja se pliega sola mientras está abierto; el chat queda en unos 410 px.', opt_b)}
  </div>
</div>'''
open(OUT + '/D6.dc.html', 'w').write(page('Inbox · D6 dónde abre el contexto', 1880, 1000, d6, main_js.split('const map')[0] + "return { themeCls: 'lt', rows: [sel('laura', true), sel('andres', false)] };\n  }"))

# ------------------------------ 5 · Celular ------------------------------
def mob(inner):
    return f'''<div class="{{{{themeCls}}}} bub-tinta" style="width:390px;height:844px;overflow:hidden;display:flex;flex-direction:column;font-family:Poppins,system-ui,sans-serif;color:var(--fg);background:var(--bg);position:relative">{inner}</div>'''
mob_head = f'''<header class="chead" style="padding:0 8px 0 4px;gap:4px"><button type="button" class="icb" aria-label="Volver a la lista" style="width:40px;height:40px">{I["back"]}</button>
  <span class="av" style="width:36px;height:36px">LG</span><span style="display:flex;flex-direction:column;min-width:0;flex:1"><span style="font-size:14px;font-weight:600">Laura Gómez</span><span style="font-size:12px;color:var(--mut)">Contigo · WhatsApp</span></span>
  <button type="button" class="icb" aria-label="Contexto: contacto, adjuntos, historial, llamadas y pedidos" style="width:40px;height:40px;color:var(--fg)">{I["info"]}</button>{more()}</header>'''
mob_conv = mob(f'<section class="conv" style="min-height:0">{mob_head}<div class="thread" style="display:flex;flex-direction:column;padding:4px 12px 12px">{THREAD}</div>{composer()}</section>')
mob_tabs = '<div style="display:flex;gap:6px;overflow-x:auto;padding:10px 14px;border-bottom:1px solid var(--line)" class="scr">' + ''.join(f'<button type="button" class="chipf{" on" if i == 0 else ""}" style="height:36px">{x}</button>' for i, x in enumerate(['Contacto', 'Adjuntos', 'Historial', 'Llamadas', 'Pedidos'])) + '</div>'
mob_panel = mob(f'<aside class="cpanel" style="width:100%;border-left:0;flex:1">{contact_panel().replace(phead("Contacto", "Laura Gómez", "Cliente desde el 2 de septiembre · WhatsApp"), phead("Contexto", "Laura Gómez", "Cliente desde el 2 de septiembre") + mob_tabs)}</aside>')
cel_js = "  renderVals() { const dark = this.props.dark === true; return { themeCls: dark ? 'dk' : 'lt' }; }"
open(OUT + '/Movil.dc.html', 'w').write(page('Inbox · Celular · conversación', 390, 844, mob_conv, cel_js))
open(OUT + '/MovilContexto.dc.html', 'w').write(page('Inbox · Celular · contexto', 390, 844, mob_panel, cel_js))

# ------------------------------ 6 · Estados ------------------------------
def stc(label, html):
    return f'<div style="display:flex;flex-direction:column;gap:8px;min-width:0"><span class="lbl">{label}</span><div style="height:560px;border-radius:24px;overflow:hidden;border:1px solid var(--line);display:flex"><aside class="cpanel" style="width:100%;border-left:0">{html}</aside></div></div>'
empty = lambda icon, t, d, b='': f'<div class="pbody" style="align-items:center;justify-content:center;text-align:center"><span style="width:56px;height:56px;border-radius:18px;background:var(--chip);display:inline-flex;align-items:center;justify-content:center;color:var(--mut)">{icon}</span><span style="font-size:14px;font-weight:600">{t}</span><span style="font-size:12.5px;color:var(--mut);max-width:240px;line-height:1.45">{d}</span>{b}</div>'
loading = phead('Contacto', '<span class="sk" style="width:150px;height:18px;display:inline-block"></span>') + '<div class="pbody" role="status" aria-label="Cargando"><span class="sk" style="height:48px;width:48px;border-radius:99px"></span><span class="sk" style="height:120px;border-radius:20px"></span><span class="sk" style="height:14px;width:80%"></span><span class="sk" style="height:14px;width:60%"></span><span class="sk" style="height:14px;width:70%"></span></div>'
big = lambda k: I[k].replace('width="16" height="16"', 'width="24" height="24"')
st_body = f'''<div class="{{{{themeCls}}}}" style="width:1440px;height:1000px;box-sizing:border-box;padding:40px 48px;background:var(--bg);color:var(--fg);font-family:Poppins,system-ui,sans-serif;display:flex;flex-direction:column;gap:22px">
  <div><span class="kick">Estados</span><h1 class="d" style="margin:6px 0 0;font-size:30px;font-weight:700;letter-spacing:-.02em">Cada panel dice qué pasa, con la misma voz</h1></div>
  <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px">
    {stc('Cargando · la silueta del panel', loading)}
    {stc('Error · reintentar sin cerrar el panel', phead('Historial', 'Todo con Laura') + empty(big('hist'), 'No pudimos traer el historial', 'Se perdió la conexión. Lo demás de la conversación sigue a salvo.', '<button type="button" class="mini" style="height:36px;margin-top:4px">Reintentar</button>'))}
    {stc('Vacío · Adjuntos', phead('Adjuntos', 'Sin archivos') + empty(big('clip'), 'Todavía no hay archivos', 'Las fotos, audios y documentos que se compartan en esta conversación aparecen aquí.'))}
    {stc('Vacío · Pedidos', phead('Pedidos', 'Sin pedidos') + empty(I['bag'].replace('width="16" height="16"', 'width="24" height="24"'), 'Laura aún no tiene pedidos', 'Cuando reserve, verás aquí su saldo y sus documentos.'))}
  </div>
  <p style="margin:0;font-size:12.5px;color:var(--fg2);max-width:1100px;line-height:1.5">Sin permiso para un panel (contacts:read, crm:read, calls:read, orders:read) su icono no se pinta, como hoy: no se muestra un panel para decir que no se puede ver.</p>
</div>'''
open(OUT + '/Estados.dc.html', 'w').write(page('Inbox · Estados del contexto', 1440, 1000, st_body, cel_js))

# ------------------------------ canvas ------------------------------
boards = [
    ('Main.dc.html', '1 · El contexto a 1440 — cinco paneles; controles: panel y D6 (interactivo)', 1440, 1000, 0, 0, True),
    ('D6.dc.html', '2 · D6 · Dónde abre el contexto entre 1280 y 1535 px', 1880, 1000, 1520, 0, False),
    ('Ancha.dc.html', '3 · Pantalla ancha 1920 — en línea, como cuarta columna', 1920, 1080, 3480, 0, False),
    ('Paneles.dc.html', '4 · Los cinco paneles — Contacto, Adjuntos, Historial, Llamadas y Pedidos (D5)', 1880, 1000, 0, 1500, False),
    ('Estados.dc.html', '5 · Estados — cargando, error y vacíos', 1440, 1000, 1960, 1500, False),
    ('Oscuro.dc.html', '6 · Oscuro (interactivo)', 1440, 1000, 0, 2920, True),
    ('Movil.dc.html', '7 · Celular — la conversación con el acceso al contexto', 390, 844, 1520, 2920, False),
    ('MovilContexto.dc.html', '8 · Celular — el contexto a pantalla completa', 390, 844, 1990, 2920, False),
]
canvas = {
    'v': 3, 'attachments': {}, 'boards': {}, 'createdOnFiles': {'at': '2026-09-27T21:00:00Z', 'v': 1}, 'designSystems': [],
    'launch': {'view': 'canvas'},
    'notes': {
        'rowA': {'kind': 'title1', 'maxW': 5400, 'text': 'El contexto y dónde abre', 'w': 240, 'x': 0, 'y': -300},
        'rowB': {'kind': 'title1', 'maxW': 3400, 'text': 'Los paneles y sus estados', 'w': 240, 'x': 0, 'y': 1200},
        'rowC': {'kind': 'title1', 'maxW': 2380, 'text': 'Oscuro y celular', 'w': 240, 'x': 0, 'y': 2620},
    },
    'order': [b[0] for b in boards], 'pages': [], 'title': 'Inbox premium · F4 El contexto',
}
for f, t, w, h, x, y, inter in boards:
    canvas['boards'][f] = {'h': h, 'title': t, 'w': w, 'x': x, 'y': y, **({'is_interactive': True} if inter else {})}
json.dump(canvas, open(OUT + '/canvas.json', 'w'), ensure_ascii=False, indent=2)
print('ok', sorted(os.listdir(OUT)))
