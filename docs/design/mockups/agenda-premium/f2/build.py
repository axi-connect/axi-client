"""Lienzo Agenda premium · F2 La cita.

Reutiliza el kit de la F1 (shell, datos, iconos, rejilla) y dibuja el detalle
de la cita y el formulario de crear / reagendar. Uso: python3 build.py <out>.
"""
import json
import os
import sys
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
F1 = os.path.join(HERE, '..', 'f1', 'build.py')
src = open(F1).read()
src = src[:src.index('# ------------------------------------------------------------------ escribir')]
g = {'__file__': F1, '__name__': 'f1kit'}
sys_argv = sys.argv
sys.argv = [F1, os.environ.get('F1_SINK', '/tmp/claude-0/-root-axi/31cc2885-d1dc-443b-bb50-0ef1772135c4/scratchpad/_f1sink')]
exec(src, g)
sys.argv = sys_argv
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'project')
os.makedirs(OUT, exist_ok=True)

ic, page, side, topbar, section_head, toolbar, week_card = (g[k] for k in ['ic', 'page', 'side', 'topbar', 'section_head', 'toolbar', 'week_card'])
STATUS, APPTS, DAYS, NOTES = g['STATUS'], g['APPTS'], g['DAYS'], g['NOTES']
P = g['P']
P.update({
    'edit': '<path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"></path>',
    'wa': '<path d="M3 21l1.6-4.6A8.5 8.5 0 1 1 8 19.6z"></path>',
    'user-link': '<circle cx="12" cy="8" r="4"></circle><path d="M4 21a8 8 0 0 1 16 0"></path>',
    'swap': '<path d="M7 7h11l-3-3M17 17H6l3 3"></path>',
    'lock': '<rect x="4" y="11" width="16" height="10" rx="2"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path>',
    'back': '<path d="m15 18-6-6 6-6"></path>',
})

CSS2 = '''
.sh2{position:absolute;top:12px;right:12px;bottom:12px;width:460px;z-index:21;background:var(--card);border-radius:24px;border:1px solid var(--line);box-shadow:var(--shf);display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box}
.sh2 .hd{display:flex;align-items:flex-start;gap:12px;padding:22px 16px 18px 26px}
.sh2 .bd{flex-grow:1;min-height:0;overflow:hidden;padding:0 26px 20px;display:flex;flex-direction:column;gap:14px}
.sh2 .ft{flex-shrink:0;display:flex;align-items:center;gap:8px;padding:14px 20px 18px;border-top:1px solid var(--line)}
.when{border-radius:20px;background:var(--bg);border:1px solid var(--line);padding:16px 18px;display:flex;flex-direction:column;gap:4px}
.when .big{font:700 22px Urbanist,Poppins,sans-serif;letter-spacing:-.01em;font-variant-numeric:tabular-nums}
.sec{display:flex;flex-direction:column;gap:8px}
.sec .h{display:flex;align-items:center;justify-content:space-between;gap:10px}
.sec .h span{font-size:12.5px;font-weight:600;color:var(--fg2)}
.rm{display:grid;grid-template-columns:8px minmax(0,1fr) auto;gap:10px;align-items:center;padding:9px 12px;border-radius:14px;border:1px solid var(--line);font-size:13px}
.rm .w{color:var(--mut);font-size:12px;white-space:nowrap}
.tlink{display:inline-flex;align-items:center;gap:6px;min-height:28px;font:500 12.5px Poppins,sans-serif;color:var(--fg);text-decoration:none;border:0;background:transparent;padding:0;cursor:pointer}
.note-box{border-radius:14px;border:1px solid var(--line);padding:11px 13px;font-size:13.5px;line-height:1.5;color:var(--fg2)}
.danger{border-radius:18px;border:1px solid color-mix(in srgb,var(--bad) 35%,transparent);background:color-mix(in srgb,var(--bad) 6%,transparent);padding:14px 16px;display:flex;flex-direction:column;gap:10px}
.btn-danger{border-color:transparent;background:var(--bad);color:#fff}
.m2{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:880px;z-index:21;background:var(--card);border-radius:24px;border:1px solid var(--line);box-shadow:var(--shf);display:flex;flex-direction:column;overflow:hidden}
.m2 .hd{display:flex;align-items:flex-start;gap:12px;padding:24px 18px 16px 30px}
.m2 .mcols{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:0;border-top:1px solid var(--line)}
.m2 .mcol{padding:20px 30px 22px;display:flex;flex-direction:column;gap:16px;min-width:0}
.m2 .mcol+.mcol{border-left:1px solid var(--line);background:var(--bg);padding:20px 24px 22px}
.m2 .ft{display:flex;align-items:center;gap:10px;padding:16px 22px 18px 30px;border-top:1px solid var(--line)}
.svc{display:flex;align-items:center;gap:12px;padding:11px 14px;border-radius:14px;border:1px solid var(--line2);background:var(--card);font-size:13.5px;text-align:left;width:100%;box-sizing:border-box;font-family:inherit;color:var(--fg)}
.svc .dur{margin-left:auto;color:var(--mut);font-size:12.5px;white-space:nowrap;font-variant-numeric:tabular-nums}
.svc-on{border-color:transparent;box-shadow:inset 0 0 0 1.5px var(--fg);background:var(--card)}
.radio{width:16px;height:16px;border-radius:99px;box-shadow:inset 0 0 0 1.5px var(--line2);flex-shrink:0}
.svc-on .radio{box-shadow:inset 0 0 0 5px var(--fg)}
.mpk{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));row-gap:2px;text-align:center}
.mpk .wd{font-size:11.5px;color:var(--mut);padding-bottom:4px}
.mpk button{border:0;background:transparent;height:40px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font:inherit;color:var(--fg);padding:0}
.mpk .n{width:32px;height:32px;border-radius:99px;display:inline-flex;align-items:center;justify-content:center;font:600 13.5px Urbanist,Poppins,sans-serif;font-variant-numeric:tabular-nums}
.mpk .off .n{color:var(--mut);font-weight:500}
.mpk .past .n{color:var(--mut);opacity:.55;font-weight:500}
.mpk .today .n{box-shadow:inset 0 0 0 1.5px var(--fg)}
.mpk .on .n{background:var(--fg);color:var(--bg)}
.mpk .av{width:4px;height:4px;border-radius:9px;background:var(--ok)}
.slots{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.sum{flex-grow:1;min-width:0;font-size:13.5px;color:var(--fg2);line-height:1.4}
.sum b{color:var(--fg);font-weight:600}
.pickc{display:flex;align-items:center;gap:10px;height:44px;padding:0 8px 0 12px;border-radius:14px;border:1px solid var(--line2);font-size:13.5px}
.av2{width:28px;height:28px;border-radius:99px;background:var(--chip);display:inline-flex;align-items:center;justify-content:center;font:600 11.5px Poppins,sans-serif;color:var(--fg2);flex-shrink:0}
.diff{display:grid;grid-template-columns:1fr 24px 1fr;gap:10px;align-items:center}
.diff .x{border-radius:16px;border:1px solid var(--line);padding:12px 14px;display:flex;flex-direction:column;gap:2px}
.diff .x .k{font-size:11.5px;color:var(--mut)}
.diff .x .v{font:700 16px Urbanist,Poppins,sans-serif}
.diff .old .v{color:var(--mut);text-decoration:line-through;text-decoration-thickness:1.5px}
.cell{display:flex;flex-direction:column;gap:10px;min-width:0}
.cell .lab{font-size:12px;color:var(--mut)}
.frame2{background:var(--bg);color:var(--fg);font-family:Poppins,system-ui,sans-serif;box-sizing:border-box}
'''
g['HELMET'] = f"<helmet>\n{g['FONTS']}\n<style>{g['CSS']}{CSS2}</style>\n</helmet>"

A9 = next(a for a in APPTS if a[0] == 'a9')


def pill(st):
    lab, color = STATUS[st]
    return f'<span class="pill" style="height:28px;padding:0 12px;font-size:13px"><span class="dot" style="background:{color};width:7px;height:7px"></span>{lab}</span>'


def reminders(st):
    if st in ('completed', 'no_show', 'cancelled'):
        return ('<div class="sec"><div class="h"><span>Recordatorios</span></div>'
                '<p style="margin:0;font-size:12.5px;color:var(--mut)">'
                + ('Ya no se envían: la cita se canceló.' if st == 'cancelled' else 'Ya se enviaron los dos recordatorios.') + '</p></div>')
    rows = [('Hoy, 9:00', '2 horas antes', 'var(--ok)', 'Enviado'), ('Hoy, 10:30', '30 minutos antes', 'var(--info)', 'Programado')]
    body = ''.join(f'<div class="rm"><span class="dot" style="background:{c};width:7px;height:7px"></span>'
                   f'<span style="min-width:0"><b style="font-weight:500">{w}</b> <span style="color:var(--mut)">· {k}</span></span>'
                   f'<span class="w">{s}</span></div>' for w, k, c, s in rows)
    return (f'<div class="sec"><div class="h"><span>Axi le recuerda por WhatsApp Ventas</span></div>{body}</div>')


def origin(org):
    if org == 'call':
        return (f'<div class="orig" style="align-items:flex-start"><span class="oglyph" style="color:var(--ai)">{ic("spark", 17)}</span>'
                '<div style="flex-grow:1;min-width:0;display:flex;flex-direction:column;gap:10px"><div><div style="font-size:13.5px;font-weight:600">Agendada por Axi en una llamada</div>'
                '<div style="font-size:12px;color:var(--mut);margin-top:2px">El 29 de septiembre, 4:12 p. m.</div></div>'
                f'<a class="olink" href="#" style="align-self:flex-start">{ic("phone", 14)}Ver llamada</a></div></div>')
    if org == 'chat':
        return (f'<div class="orig" style="align-items:flex-start"><span class="oglyph" style="color:var(--ai)">{ic("spark", 17)}</span>'
                '<div style="flex-grow:1;min-width:0;display:flex;flex-direction:column;gap:10px"><div><div style="font-size:13.5px;font-weight:600">Agendada por Axi en una conversación</div>'
                '<div style="font-size:12px;color:var(--mut);margin-top:2px">El 29 de septiembre, 4:12 p. m.</div></div>'
                f'<a class="olink" href="#" style="align-self:flex-start">{ic("chat", 14)}Ver conversación</a></div></div>')
    return (f'<div class="orig orig-m"><span class="oglyph" style="color:var(--fg2)">{ic("user", 17)}</span>'
            '<div style="flex-grow:1;min-width:0"><div style="font-size:13.5px;font-weight:600">Creada por ti</div>'
            '<div style="font-size:12px;color:var(--mut);margin-top:2px">Desde la agenda, el 29 de septiembre</div></div></div>')


def detail(st='confirmed', org='call', cancel=False, edit_note=False, width=460, top=12, bottom=12, right=12, mobile=False):
    note = NOTES['a9']
    note_block = (f'<div class="sec"><div class="h"><span>Notas</span><button type="button" class="tlink">{ic("edit", 13)}Editar</button></div>'
                  f'<div class="note-box">{note}</div></div>')
    if edit_note:
        note_block = ('<div class="sec"><div class="h"><span>Notas</span></div>'
                      f'<div class="note-box" style="box-shadow:inset 0 0 0 1.5px var(--fg);color:var(--fg);min-height:88px">{note}</div>'
                      '<div style="display:flex;justify-content:flex-end;gap:8px"><button type="button" class="btn btn-ghost">Descartar</button><button type="button" class="btn btn-ink">Guardar nota</button></div></div>')
    if st == 'cancelled':
        extra = ('<div class="danger" style="background:var(--bg);border-color:var(--line)"><div style="display:flex;align-items:center;gap:8px;font-size:13.5px;font-weight:600">'
                 '<span class="dot" style="background:var(--bad)"></span>Cancelada el 30 de septiembre, 9:12 a. m.</div>'
                 '<p style="margin:0;font-size:13px;color:var(--fg2)">«El cliente pidió moverla al mes siguiente.»</p></div>')
    else:
        extra = ''
    primary = {'scheduled': 'Confirmar', 'confirmed': 'Completar'}.get(st)
    foot = ''
    if cancel:
        foot = ('<div class="ft" style="flex-direction:column;align-items:stretch;gap:10px">'
                '<div class="danger"><div style="font-size:14px;font-weight:600">¿Cancelar la cita de Camila?</div>'
                '<p style="margin:0;font-size:12.5px;color:var(--fg2);line-height:1.45">Axi deja de enviarle los recordatorios. Si quieres, dile por qué: queda en la cita.</p>'
                '<div class="inp ph" style="height:64px;align-items:flex-start;padding-top:10px;background:var(--card)">Motivo (opcional)</div></div>'
                '<div style="display:flex;justify-content:flex-end;gap:8px"><button type="button" class="btn btn-ghost">Volver</button>'
                '<button type="button" class="btn btn-danger">Cancelar la cita</button></div></div>')
    elif primary:
        foot = (f'<div class="ft"><button type="button" class="btn btn-ink" style="height:40px">{ic("check", 15)}{primary}</button>'
                f'<button type="button" class="btn" style="height:40px">{ic("clock", 15)}Reagendar</button>'
                f'<button type="button" class="icb" aria-label="Más acciones de la cita" style="margin-left:auto;width:40px;height:40px">{ic("more", 16)}</button></div>')
    radius = '24px 24px 0 0' if mobile else '24px'
    pos = (f'left:0;right:0;bottom:0;top:auto;width:auto;max-height:{top}px;border-radius:{radius}' if mobile
           else f'top:{top}px;right:{right}px;bottom:{bottom}px;width:{width}px')
    grab = '<span style="width:40px;height:5px;border-radius:9px;background:var(--line2);align-self:center;margin:8px 0 0"></span>' if mobile else ''
    return (f'<aside class="sh2" style="{pos}" aria-label="Detalle de la cita">{grab}'
            '<div class="hd"><div style="flex-grow:1;min-width:0">'
            '<div class="d" style="font-size:28px;font-weight:700;letter-spacing:-.02em;line-height:1.1;overflow-wrap:anywhere">Camila Restrepo</div>'
            f'<div style="display:flex;align-items:center;gap:10px;margin-top:10px;flex-wrap:wrap">{pill(st)}'
            f'<a class="tlink" href="#">{ic("user-link", 14)}Ver contacto</a></div></div>'
            f'<button type="button" class="icb icb-q" aria-label="Cerrar" style="width:40px;height:40px">{ic("x", 18)}</button></div>'
            '<div class="bd">'
            '<div class="when"><span style="font-size:12px;color:var(--mut)">Hoy · Miércoles 30 de septiembre</span>'
            '<span class="big">11:00 – 11:45</span>'
            '<span style="font-size:13px;color:var(--fg2)">Asesoría de viaje · 45 min</span></div>'
            f'{extra}{reminders(st)}{note_block}{origin(org)}</div>{foot}</aside>')


def app_bg(inner_over, title='Calendario', dark=False):
    return (f'<div class="app {"dk" if dark else "lt"}" style="width:1440px;height:1000px">{side()}'
            '<main style="flex-grow:1;display:flex;flex-direction:column;min-width:0;min-height:0;position:relative">'
            f'{topbar(title)}'
            '<div style="padding:22px 32px 24px;display:flex;flex-direction:column;gap:18px;min-height:0;flex-grow:1">'
            f'{section_head()}{toolbar("28 sep – 4 oct 2026")}{week_card(False, link_slots=False)}</div>'
            f'<div class="scrim"></div>{inner_over}</main></div>')


# ------------------------------------------------------------------ 1 · Main (interactivo)
def main_board(dark=False):
    variants = {}
    for st in ['scheduled', 'confirmed', 'completed', 'cancelled']:
        for org in ['call', 'chat', 'user']:
            variants[f'{st}-{org}'] = detail(st, org)
    blocks = ''.join(f'<sc-if value="{{{{v_{k.replace("-", "_")}}}}}" hint-placeholder-val="{{{{ {"true" if k == "confirmed-call" else "false"} }}}}">{html}</sc-if>'
                     for k, html in variants.items())
    body = app_bg(blocks, dark=dark).replace(f'class="app {"dk" if dark else "lt"}"', 'class="app {{themeCls}}"', 1)
    keys = list(variants.keys())
    js = ('class Component extends DCLogic {\n  renderVals() {\n'
          '    const EST = {"agendada":"scheduled","confirmada":"confirmed","completada":"completed","cancelada":"cancelled"};\n'
          '    const ORG = {"llamada":"call","chat":"chat","equipo":"user"};\n'
          '    const k = (EST[this.props.estado] ?? "confirmed") + "-" + (ORG[this.props.origen] ?? "call");\n'
          f'    const r = {{ themeCls: this.props.dark ? "dk" : "lt" }};\n'
          f'    {json.dumps(keys)}.forEach((x) => {{ r["v_" + x.replace("-", "_")] = x === k; }});\n'
          '    return r;\n  }\n}')
    props = {'estado': {'editor': 'enum', 'options': ['agendada', 'confirmada', 'completada', 'cancelada'], 'default': 'confirmada'},
             'origen': {'editor': 'enum', 'options': ['llamada', 'chat', 'equipo'], 'default': 'llamada'},
             'dark': {'editor': 'boolean', 'default': dark}}
    return page('Agenda · La cita', 1440, 1000, body, js, props)


# ------------------------------------------------------------------ 2 · Cancelar y nota
def acciones_board():
    def cell(label, inner, h=900):
        return (f'<div class="cell"><span class="lab">{label}</span>'
                f'<div style="position:relative;height:{h}px">{inner}</div></div>')
    body = ('<div class="frame2 lt" style="width:1600px;height:1000px;padding:36px 48px;display:flex;flex-direction:column;gap:20px">'
            '<h1 class="d" style="margin:0;font-size:34px;font-weight:700;letter-spacing:-.02em">Actuar sobre la cita</h1>'
            '<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:28px;flex-grow:1">'
            + cell('«…» abierto: lo que no es la acción principal', detail('confirmed', 'call', width=460, top=0, bottom=0, right=0).replace(
                '<button type="button" class="icb" aria-label="Más acciones de la cita" style="margin-left:auto;width:40px;height:40px">',
                '<div style="margin-left:auto;position:relative"><div style="position:absolute;right:0;bottom:48px;width:220px;background:var(--card);border:1px solid var(--line2);border-radius:14px;box-shadow:var(--shf);padding:6px;display:flex;flex-direction:column;z-index:5">'
                f'<span style="display:flex;align-items:center;gap:10px;height:40px;padding:0 10px;border-radius:10px;font-size:13.5px">{ic("user", 15)}No asistió</span>'
                f'<span style="display:flex;align-items:center;gap:10px;height:40px;padding:0 10px;border-radius:10px;font-size:13.5px;color:var(--bad)">{ic("x", 15)}Cancelar la cita</span></div>'
                '<button type="button" class="icb" aria-label="Más acciones de la cita" style="width:40px;height:40px;box-shadow:inset 0 0 0 1.5px var(--fg)">').replace(
                f'{ic("more", 16)}</button></div></aside>', f'{ic("more", 16)}</button></div></div></aside>'))
            + cell('Cancelar: se confirma dentro del panel', detail('confirmed', 'call', cancel=True, width=460, top=0, bottom=0, right=0))
            + cell('Editar la nota sin salir del detalle', detail('confirmed', 'call', edit_note=True, width=460, top=0, bottom=0, right=0))
            + '</div></div>')
    return page('Agenda · Actuar sobre la cita', 1600, 1000, body)


# ------------------------------------------------------------------ 3 · Nueva cita
def month_picker(sel=1, today=30):
    # octubre 2026 empieza jueves; la vista arranca el lunes 28 de septiembre
    heads = ''.join(f'<span class="wd">{x}</span>' for x in 'LMXJVSD')
    cells = []
    days = [(28, 'off'), (29, 'off'), (30, 'off')] + [(d, '') for d in range(1, 32)] + [(1, 'off'), (2, 'off'), (3, 'off'), (4, 'off'), (5, 'off'), (6, 'off'), (7, 'off'), (8, 'off')]
    days = days[:35]
    for i, (d, cls) in enumerate(days):
        wd = i % 7
        klass = cls
        av = cls == '' and wd < 6 and d not in (12,)  # el lunes 12 es festivo: sin cupo
        if cls == 'off' and d == 30:
            klass = 'off today'
        if cls == '' and d == sel:
            klass = 'on'
        dot = '<span class="av"></span>' if av else '<span style="height:4px"></span>'
        label = f'{d} de octubre' if cls == '' else f'{d}'
        cells.append(f'<button type="button" class="{klass}" aria-pressed="{"true" if klass == "on" else "false"}" aria-label="{label}{", con horarios libres" if av else ""}">'
                     f'<span class="n">{d}</span>{dot}</button>')
    return (f'<div style="display:flex;align-items:center;justify-content:space-between"><span class="d" style="font-size:17px;font-weight:700">Octubre 2026</span>'
            f'<div style="display:flex;gap:6px"><button type="button" class="icb" aria-label="Mes anterior">{ic("left", 16)}</button><button type="button" class="icb" aria-label="Mes siguiente">{ic("right", 16)}</button></div></div>'
            f'<div class="mpk">{heads}{"".join(cells)}</div>'
            f'<div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--mut)"><span class="av" style="width:6px;height:6px;border-radius:9px;background:var(--ok)"></span>Con horarios libres</div>')


def slots(sel='10:00', times=('8:00', '8:30', '10:00', '10:30', '12:00', '13:30', '14:00', '16:00')):
    btns = ''.join(f'<button type="button" class="chipt{" chipt-on" if t == sel else ""}" aria-pressed="{"true" if t == sel else "false"}" style="min-width:0">{t}</button>' for t in times)
    return f'<div class="slots">{btns}</div>'


def services(sel=0):
    items = [('Asesoría de viaje', '45 min'), ('Cotización de grupo', '30 min'), ('Entrega de documentos', '20 min'), ('Sin servicio', 'Duración a mano')]
    return ''.join(f'<button type="button" class="svc{" svc-on" if i == sel else ""}" aria-pressed="{"true" if i == sel else "false"}"><span class="radio"></span>{n}<span class="dur">{d}</span></button>'
                   for i, (n, d) in enumerate(items))


def form_modal(kind='new', contact=True, chosen=True, state='ok'):
    title = 'Nueva cita' if kind == 'new' else 'Reagendar la cita'
    sub = ('Elige quién, qué y cuándo. La hora es la de Bogotá.' if kind == 'new'
           else 'Camila Restrepo · Asesoría de viaje · 45 min')
    if kind == 'new':
        who = (f'<div class="fld"><label>Contacto</label>'
               + (f'<div class="pickc"><span class="av2">CR</span><span style="flex-grow:1;min-width:0"><b style="font-weight:500">Camila Restrepo</b> <span style="color:var(--mut)">· +57 301 555 0187</span></span>'
                  f'<button type="button" class="icb icb-q" aria-label="Quitar el contacto">{ic("x", 15)}</button></div>' if contact else
                  f'<div class="inp ph" style="height:44px;border-radius:14px">{ic("search", 15)}Busca por nombre o teléfono</div>')
               + '</div>'
               f'<div class="fld"><label>Servicio</label><div style="display:flex;flex-direction:column;gap:8px">{services(0)}</div></div>')
    else:
        who = ('<div class="fld"><label>Cambia de</label><div class="diff">'
               '<div class="x old"><span class="k">Ahora</span><span class="v">Mié 30 · 11:00</span></div>'
               f'<span style="color:var(--mut);display:inline-flex;justify-content:center">{ic("arrow", 18)}</span>'
               '<div class="x" style="box-shadow:inset 0 0 0 1.5px var(--fg);border-color:transparent"><span class="k">Nueva</span><span class="v">Jue 1 · 10:00</span></div></div></div>'
               f'<div class="note">{ic("lock", 16)}<div>El servicio no cambia al reagendar: su duración (45 min) manda. Axi rehace los recordatorios de Camila para la nueva hora.</div></div>')
    notes = ('<div class="fld"><label>Notas <span style="font-weight:400;color:var(--mut)">(opcional)</span></label>'
             '<div class="inp ph" style="height:72px;align-items:flex-start;padding-top:10px;border-radius:14px">Lo que el equipo debe saber de la cita</div></div>') if kind == 'new' else ''
    if state == 'ok':
        when_slots = (f'<div style="display:flex;flex-direction:column;gap:10px"><span style="font-size:12.5px;font-weight:600;color:var(--fg2)">Jueves 1 · 8 horarios libres</span>{slots()}'
                      '<button type="button" class="tlink" style="align-self:flex-start">Otra hora…</button></div>')
    elif state == 'taken':
        when_slots = (f'<div class="note" style="border-color:color-mix(in srgb,var(--warn) 40%,transparent)">{ic("alert", 16)}<div><b style="font-weight:600;color:var(--fg)">Las 10:00 se acaban de ocupar.</b> Actualizamos los horarios: elige otro.</div></div>'
                      f'{slots(sel="", times=("8:00", "8:30", "10:30", "12:00", "13:30", "14:00", "16:00"))}')
    elif state == 'other':
        when_slots = (f'<div style="display:flex;flex-direction:column;gap:10px"><span style="font-size:12.5px;font-weight:600;color:var(--fg2)">Otra hora</span>'
                      f'<div class="inp" style="width:140px;font-variant-numeric:tabular-nums">{ic("clock", 15)}18:30</div>'
                      f'<div class="note">{ic("clock", 16)}<div><b style="font-weight:600;color:var(--fg)">18:30 está fuera de tu horario</b> (8:00 – 18:00). Puedes agendarla igual: Axi le envía sus recordatorios.</div></div>'
                      '<button type="button" class="tlink" style="align-self:flex-start">Volver a los horarios libres</button></div>')
    elif state == 'none':
        when_slots = (f'<div class="note">{ic("cal", 16)}<div><b style="font-weight:600;color:var(--fg)">El lunes 12 no hay cupo.</b> Todos los horarios están ocupados. Elige otro día o una hora a mano.</div></div>'
                      '<button type="button" class="tlink" style="align-self:flex-start">Otra hora…</button>')
    elif state == 'noschedule':
        when_slots = (f'<div class="note">{ic("clock", 16)}<div><b style="font-weight:600;color:var(--fg)">Aún no tienes horario de atención.</b> Sin él no hay horarios sugeridos, pero puedes poner la hora a mano.</div></div>'
                      f'<div class="inp" style="width:140px">{ic("clock", 15)}Elige la hora</div><a class="tlink" href="#">Configurar el horario{ic("arrow", 13)}</a>')
    else:
        when_slots = ''
    sel_day = 12 if state == 'none' else 1
    summary = ('<b>Jueves 1 de octubre · 10:00 – 10:45</b> con Camila Restrepo' if kind == 'new' and chosen and contact
               else ('<b>Jueves 1 · 10:00</b> en vez de miércoles 30 · 11:00' if kind == 'resched' else 'Elige un contacto y un horario.'))
    action = 'Agendar cita' if kind == 'new' else 'Reagendar'
    disabled = '' if (chosen and contact and state in ('ok', 'other')) else ' style="opacity:.45" disabled'
    return ('<div class="m2" role="dialog" aria-modal="true" aria-labelledby="m2t">'
            f'<div class="hd"><div style="flex-grow:1;min-width:0"><h2 id="m2t" class="d" style="margin:0;font-size:26px;font-weight:700;letter-spacing:-.02em">{title}</h2>'
            f'<p style="margin:4px 0 0;font-size:13px;color:var(--mut)">{sub}</p></div>'
            f'<button type="button" class="icb icb-q" aria-label="Cerrar" style="width:40px;height:40px">{ic("x", 18)}</button></div>'
            f'<div class="mcols"><div class="mcol">{who}{notes}</div>'
            f'<div class="mcol">{month_picker(sel_day).replace("30</span>", "30</span>")}{when_slots}</div></div>'
            f'<div class="ft"><p class="sum">{summary}</p><button type="button" class="btn btn-ghost">Cancelar</button>'
            f'<button type="button" class="btn btn-brand"{disabled}>{action}</button></div></div>')


def nueva_board():
    blocks = ''.join(f'<sc-if value="{{{{s_{k}}}}}" hint-placeholder-val="{{{{ {"true" if k == "ok" else "false"} }}}}">{form_modal("new", state=k, contact=(k != "empty"))}</sc-if>'
                     for k in ['ok', 'empty', 'other'])
    body = app_bg(blocks, title='Nueva cita').replace('class="app lt"', 'class="app {{themeCls}}"', 1)
    js = ('class Component extends DCLogic {\n  renderVals() {\n'
          '    const M = {"completa":"ok","vacía":"empty","otra hora":"other"};\n'
          '    const s = M[this.props.estado] ?? "ok";\n'
          '    return { themeCls: this.props.dark ? "dk" : "lt", s_ok: s === "ok", s_empty: s === "empty", s_other: s === "other" };\n  }\n}')
    props = {'estado': {'editor': 'enum', 'options': ['completa', 'vacía', 'otra hora'], 'default': 'completa'}, 'dark': {'editor': 'boolean', 'default': False}}
    return page('Agenda · Nueva cita', 1440, 1000, body, js, props)


def reagendar_board():
    return page('Agenda · Reagendar', 1440, 1000, app_bg(form_modal('resched'), title='Reagendar'))


def estados_board():
    def cell(label, inner):
        return f'<div class="cell"><span class="lab">{label}</span><div class="card" style="padding:20px 22px;display:flex;flex-direction:column;gap:14px;background:var(--bg)">{inner}</div></div>'
    def when_only(state, day):
        m = form_modal('new', state=state)
        return m[m.index('<div class="mcol">', m.index('<div class="mcols">') + 20) + len('<div class="mcol">'):m.index('</div></div><div class="ft">')]
    load = ('<div role="status" aria-label="Consultando horarios" style="display:flex;flex-direction:column;gap:10px">'
            '<span class="sk" style="height:16px;width:40%"></span><div class="slots">' + ''.join('<span class="sk" style="height:36px;border-radius:99px"></span>' for _ in range(8)) + '</div></div>')
    err = (f'<div class="note">{ic("alert", 16)}<div><b style="font-weight:600;color:var(--fg)">No pudimos consultar los horarios.</b> Tu cita no se ha guardado.</div></div>'
           f'<button type="button" class="btn" style="align-self:flex-start">{ic("refresh", 15)}Reintentar</button>')
    body = ('<div class="frame2 lt" style="width:1600px;height:1000px;padding:36px 48px;display:flex;flex-direction:column;gap:20px">'
            '<h1 class="d" style="margin:0;font-size:34px;font-weight:700;letter-spacing:-.02em">Cuándo: los estados</h1>'
            '<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;align-items:start">'
            + cell('Se ocupó mientras elegías (409)', when_only('taken', 1))
            + cell('El día no tiene cupo', when_only('none', 12))
            + cell('Sin horario de atención', when_only('noschedule', 1))
            + cell('Otra hora, fuera del horario', when_only('other', 1))
            + cell('Consultando horarios', load)
            + cell('No se pudo consultar', err)
            + '</div></div>')
    return page('Agenda · Estados del formulario', 1600, 1000, body)


# ------------------------------------------------------------------ celular
def movil_detalle():
    inner = ('<div style="position:relative;flex-grow:1;overflow:hidden">'
             + g['mob_tabs']('day') + g['week_strip']() + g['mob_day_grid'](560, 8.5)
             + '<div class="scrim" style="top:0"></div>'
             + detail('confirmed', 'call', mobile=True, top=760)
             + '</div>')
    return page('Agenda · Celular, la cita', 390, 844, g['mob_shell'](inner))


def movil_nueva():
    body = ('<div class="app lt" style="width:390px;height:844px;flex-direction:column">'
            f'<header style="height:56px;flex-shrink:0;display:flex;align-items:center;gap:8px;padding:0 8px;border-bottom:1px solid var(--line);background:var(--card)">'
            f'<button type="button" class="icb icb-q" aria-label="Cerrar" style="width:44px;height:44px">{ic("x", 20)}</button>'
            '<span class="d" style="font-size:19px;font-weight:700;flex-grow:1">Nueva cita</span></header>'
            '<div style="flex-grow:1;overflow:hidden;padding:16px;display:flex;flex-direction:column;gap:16px;background:var(--card)">'
            f'<div class="fld"><label>Contacto</label><div class="pickc"><span class="av2">CR</span><span style="flex-grow:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><b style="font-weight:500">Camila Restrepo</b></span><button type="button" class="icb icb-q" aria-label="Quitar el contacto">{ic("x", 15)}</button></div></div>'
            f'<div class="fld"><label>Servicio</label><button type="button" class="svc svc-on" aria-pressed="true"><span class="radio"></span>Asesoría de viaje<span class="dur">45 min</span></button>'
            '<button type="button" class="tlink" style="align-self:flex-start">Cambiar el servicio</button></div>'
            + month_picker(1)
            + f'<div style="display:flex;flex-direction:column;gap:10px"><span style="font-size:12.5px;font-weight:600;color:var(--fg2)">Jueves 1 · 8 horarios libres</span>{slots().replace("repeat(4", "repeat(4")}</div>'
            '</div>'
            '<div style="flex-shrink:0;padding:12px 16px 20px;border-top:1px solid var(--line);background:var(--card);display:flex;flex-direction:column;gap:10px">'
            '<p class="sum" style="margin:0">Jueves 1 de octubre · <b>10:00 – 10:45</b></p>'
            '<button type="button" class="btn btn-brand" style="height:48px;width:100%">Agendar cita</button></div></div>')
    return page('Agenda · Celular, nueva cita', 390, 844, body)


def oscuro_board():
    return main_board(dark=True)


BOARDS = [
    ('Main.dc.html', main_board(), 0, 0, 1440, 1000, '1 · La cita — cuándo, recordatorios, notas y de dónde viene; controles: estado y origen (interactivo)', True),
    ('Oscuro.dc.html', oscuro_board(), 1520, 0, 1440, 1000, '2 · La cita en oscuro (interactivo)', True),
    ('Acciones.dc.html', acciones_board(), 3040, 0, 1600, 1000, '3 · Actuar — el menú «…», cancelar dentro del panel y editar la nota', False),
    ('Nueva.dc.html', nueva_board(), 0, 1420, 1440, 1000, '4 · Nueva cita — quién y qué a la izquierda, cuándo a la derecha; control: completa, vacía, otra hora (interactivo)', True),
    ('Reagendar.dc.html', reagendar_board(), 1520, 1420, 1440, 1000, '5 · Reagendar — el antes y el después, el servicio fijo', False),
    ('Estados.dc.html', estados_board(), 3040, 1420, 1600, 1000, '6 · Cuándo: se ocupó, sin cupo, sin horario, otra hora, cargando y error', False),
    ('MovilCita.dc.html', movil_detalle(), 0, 2840, 390, 844, '7 · Celular — la cita sube desde abajo', False),
    ('MovilNueva.dc.html', movil_nueva(), 470, 2840, 390, 844, '8 · Celular — nueva cita a pantalla completa, un solo paso', False),
]

canvas = {
    'v': 3,
    'createdOnFiles': {'v': 1, 'at': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')},
    'title': 'Agenda premium · F2 La cita',
    'launch': {'view': 'canvas'},
    'pages': [],
    'boards': {},
    'order': [],
    'notes': {
        'rowA': {'x': 0, 'y': -300, 'text': 'El detalle de la cita', 'kind': 'title1', 'maxW': 4640},
        'rowB': {'x': 0, 'y': 1120, 'text': 'Crear y reagendar', 'kind': 'title1', 'maxW': 4640},
        'rowC': {'x': 0, 'y': 2540, 'text': 'Celular', 'kind': 'title1', 'maxW': 860},
    },
    'designSystems': [],
}
for name, html, x, y, w, h, title, inter in BOARDS:
    entry = {'x': x, 'y': y, 'w': w, 'h': h, 'title': title}
    if inter:
        entry['is_interactive'] = True
    canvas['boards'][name] = entry
    canvas['order'].append(name)
    with open(os.path.join(OUT, name), 'w') as f:
        f.write(html)
with open(os.path.join(OUT, 'canvas.json'), 'w') as f:
    json.dump(canvas, f, ensure_ascii=False, indent=2)
print('ok', len(BOARDS), OUT)
