"""Lienzo Agenda premium · F1 El calendario.

Genera los artboards .dc.html y canvas.json en OUT (por defecto ./project).
Continuidad con Inbox F2–F4 y CRM F1–F4: superficies sólidas, tinta en la
selección, el estado en el punto, coral solo como acción.
"""
import json
import os
import sys
from datetime import datetime, timezone

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), 'project')
os.makedirs(OUT, exist_ok=True)

# ------------------------------------------------------------------ iconos
def svg(paths, size=16, stroke='currentColor', sw='1.8', extra=''):
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{stroke}" '
            f'stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"{extra}>{paths}</svg>')

P = {
    'left': '<path d="m15 18-6-6 6-6"></path>',
    'right': '<path d="m9 18 6-6-6-6"></path>',
    'plus': '<path d="M12 5v14M5 12h14"></path>',
    'x': '<path d="M18 6 6 18M6 6l12 12"></path>',
    'cal': '<rect x="3" y="4" width="18" height="18" rx="3"></rect><path d="M16 2v4M8 2v4M3 10h18"></path>',
    'bell': '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path>',
    'gear': '<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"></path>',
    'phone': '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"></path>',
    'chat': '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path><path d="M8 9h8M8 13h5"></path>',
    'spark': '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"></path><path d="M19 3v4M21 5h-4"></path>',
    'user': '<circle cx="12" cy="8" r="4"></circle><path d="M4 21a8 8 0 0 1 16 0"></path>',
    'clock': '<circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path>',
    'chev': '<path d="m6 9 6 6 6-6"></path>',
    'list': '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"></path>',
    'grid': '<rect x="3" y="4" width="18" height="17" rx="3"></rect><path d="M3 10h18M9 10v11M15 10v11"></path>',
    'week': '<rect x="3" y="4" width="18" height="17" rx="3"></rect><path d="M3 10h18M8 4v17M13 4v17"></path>',
    'day': '<rect x="3" y="4" width="18" height="17" rx="3"></rect><path d="M3 10h18"></path>',
    'menu': '<path d="M4 6h16M4 12h16M4 18h16"></path>',
    'check': '<path d="M20 6 9 17l-5-5"></path>',
    'refresh': '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"></path><path d="M21 3v5h-5"></path>',
    'more': '<circle cx="5" cy="12" r="1"></circle><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle>',
    'globe': '<circle cx="12" cy="12" r="9"></circle><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"></path>',
    'sun': '<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path>',
    'arrow': '<path d="M5 12h14M13 6l6 6-6 6"></path>',
    'alert': '<circle cx="12" cy="12" r="9"></circle><path d="M12 8v4M12 16h.01"></path>',
    'search': '<circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path>',
    'filter': '<path d="M3 5h18l-7 8v6l-4 2v-8z"></path>',
    'home': '<path d="M3 11 12 3l9 8"></path><path d="M5 10v10h14V10"></path>',
    'inbox': '<path d="M3 13h5l2 3h4l2-3h5"></path><path d="M5.5 5h13L21 13v6H3v-6z"></path>',
    'target': '<circle cx="12" cy="12" r="9"></circle><circle cx="12" cy="12" r="5"></circle><circle cx="12" cy="12" r="1"></circle>',
    'bag': '<path d="M6 7h12l1 14H5z"></path><path d="M9 7a3 3 0 0 1 6 0"></path>',
    'mega': '<path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z"></path><path d="M15 9a4 4 0 0 1 0 6"></path>',
    'chart': '<path d="M3 3v18h18"></path><path d="m7 15 4-4 3 3 5-6"></path>',
    'bill': '<rect x="5" y="3" width="14" height="18" rx="2"></rect><path d="M9 8h6M9 12h6M9 16h3"></path>',
    'people': '<circle cx="9" cy="8" r="3.5"></circle><path d="M2.5 20a6.5 6.5 0 0 1 13 0"></path><path d="M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6"></path>',
}
def ic(name, size=16, **kw):
    return svg(P[name], size, **kw)

# ------------------------------------------------------------------ helmet
FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com">\n'
         '<link href="https://fonts.googleapis.com/css2?family=Urbanist:wght@500;600;700;800&amp;family=Poppins:wght@400;500;600&amp;family=Geist+Mono:wght@400;500&amp;display=swap" rel="stylesheet">')

HOUR = 64
G0 = 7.5  # la rejilla visible arranca a las 7:30 (el scroll inicial del horario)

CSS = '''
body{margin:0;font-family:Poppins,system-ui,sans-serif;background:#F5F5F7}
.lt{--bg:#F5F5F7;--side:#FFFFFF;--card:#FFFFFF;--fg:#0B0B0E;--fg2:#3A3A40;--mut:#6B6B73;--line:rgba(0,0,0,.07);--line2:rgba(0,0,0,.12);--chip:#F0F0F2;--brand:#D13F42;--onbrand:#FFFFFF;--acc:rgba(230,87,89,.12);--track:#ECECEF;--ok:#1F9D5B;--warn:#D97706;--bad:#DC2626;--info:#2563EB;--ai:#7C3AED;--aibg:rgba(124,58,237,.07);--quiet:repeating-linear-gradient(135deg,rgba(0,0,0,.035) 0 6px,transparent 6px 12px);--sh:0 1px 0 rgba(0,0,0,.03),0 8px 20px -16px rgba(16,16,24,.25);--shf:0 24px 60px -24px rgba(16,16,24,.35),0 2px 6px rgba(16,16,24,.06);--scrim:rgba(11,11,14,.28)}
.dk{--bg:#0A0A0A;--side:#0F0F11;--card:#141416;--fg:#EDEDED;--fg2:#C4C4CC;--mut:#A1A1AA;--line:rgba(255,255,255,.08);--line2:rgba(255,255,255,.14);--chip:rgba(255,255,255,.08);--brand:#FB7185;--onbrand:#1A0508;--acc:rgba(251,113,133,.16);--track:rgba(255,255,255,.10);--ok:#4ADE80;--warn:#FBBF24;--bad:#F87171;--info:#60A5FA;--ai:#A78BFA;--aibg:rgba(167,139,250,.10);--quiet:repeating-linear-gradient(135deg,rgba(255,255,255,.035) 0 6px,transparent 6px 12px);--sh:none;--shf:0 24px 60px -20px rgba(0,0,0,.8);--scrim:rgba(0,0,0,.5)}
a{color:inherit}
.app{display:flex;background:var(--bg);color:var(--fg);overflow:hidden;font-family:Poppins,system-ui,sans-serif;position:relative}
.d{font-family:Urbanist,Poppins,sans-serif}
.side{width:248px;flex-shrink:0;padding:14px 10px;box-sizing:border-box;display:flex;flex-direction:column;gap:2px;border-right:1px solid var(--line);background:var(--side)}
.nav{display:flex;align-items:center;gap:10px;height:34px;padding:0 10px;border-radius:10px;font-size:13.5px;color:var(--fg2);text-decoration:none;white-space:nowrap}
.nav-on{background:var(--acc);color:var(--fg);font-weight:500}
.top{height:52px;display:flex;align-items:center;gap:8px;padding:0 20px 0 24px;flex-shrink:0;border-bottom:1px solid var(--line);font-size:13px}
.crumb{color:var(--mut);text-decoration:none}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;height:36px;padding:0 15px;border-radius:999px;font:500 13px Poppins,sans-serif;border:1px solid var(--line2);background:var(--card);color:var(--fg);cursor:pointer;text-decoration:none;white-space:nowrap;box-sizing:border-box}
.btn-ink{border-color:transparent;background:var(--fg);color:var(--bg)}
.btn-brand{border-color:transparent;background:var(--brand);color:var(--onbrand)}
.btn-ghost{border-color:transparent;background:transparent}
.btn-bad{color:var(--bad)}
.icb{width:36px;height:36px;border-radius:999px;border:1px solid var(--line2);background:var(--card);color:var(--fg);display:inline-flex;align-items:center;justify-content:center;cursor:pointer;padding:0;flex-shrink:0;box-sizing:border-box}
.icb-q{border-color:transparent;background:transparent;color:var(--mut)}
.seg{display:inline-flex;gap:2px;padding:3px;border-radius:999px;background:var(--chip)}
.sg{height:30px;padding:0 12px;border-radius:999px;border:0;background:transparent;color:var(--mut);display:inline-flex;align-items:center;justify-content:center;gap:6px;font:500 12.5px Poppins,sans-serif;cursor:pointer;white-space:nowrap;text-decoration:none}
.sg-on{background:var(--card);color:var(--fg);box-shadow:0 1px 2px rgba(0,0,0,.08)}
.dk .sg-on{background:rgba(255,255,255,.14)}
.sel{display:inline-flex;align-items:center;gap:8px;height:36px;padding:0 12px 0 14px;border-radius:999px;border:1px solid var(--line2);background:var(--card);font:500 13px Poppins,sans-serif;color:var(--fg);white-space:nowrap;box-sizing:border-box}
.pill{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 10px;border-radius:999px;font-size:12px;font-weight:500;background:var(--chip);color:var(--fg);white-space:nowrap;flex-shrink:0}
.dot{width:8px;height:8px;border-radius:9px;flex-shrink:0;display:inline-block}
.kick{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--mut);white-space:nowrap}
.card{background:var(--card);border-radius:24px;border:1px solid var(--line);box-shadow:var(--sh)}
.cal{display:flex;flex-direction:column;min-height:0;overflow:hidden}
.dh{display:grid;border-bottom:1px solid var(--line);flex-shrink:0}
.dhc{display:flex;align-items:center;gap:8px;height:52px;padding:0 12px;font-size:12.5px;color:var(--mut);border-left:1px solid var(--line);white-space:nowrap;min-width:0}
.dhc b{font:600 18px Urbanist,Poppins,sans-serif;color:var(--fg);letter-spacing:-.01em;min-width:28px;height:28px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center}
.dhc.today{color:var(--fg);font-weight:500}
.dhc.today b{background:var(--fg);color:var(--bg)}
.dhc .n{margin-left:auto;font-size:11.5px;color:var(--mut);font-variant-numeric:tabular-nums}
.body{position:relative;flex-grow:1;min-height:0;overflow:hidden}
.gut{position:absolute;left:0;top:0;bottom:0;width:60px}
.hl{position:absolute;right:10px;font-size:11.5px;color:var(--mut);transform:translateY(-50%);font-variant-numeric:tabular-nums;white-space:nowrap}
.col{position:absolute;top:0;bottom:0;border-left:1px solid var(--line)}
.hr{position:absolute;left:0;right:0;border-top:1px solid var(--line)}
.hh{position:absolute;left:0;right:0;border-top:1px dashed var(--line)}
.closed{position:absolute;left:0;right:0;background:var(--quiet)}
.slot{position:absolute;left:2px;right:2px;border-radius:10px;text-decoration:none;display:flex;align-items:flex-start;padding:5px 8px;box-sizing:border-box;font-size:12px;font-weight:500;color:var(--fg2)}
.slot:hover{background:var(--chip);box-shadow:inset 0 0 0 1.5px var(--fg)}
.slot:hover::after{content:attr(data-t)}
.slot-hint{background:var(--chip);box-shadow:inset 0 0 0 1.5px var(--fg)}
.now{position:absolute;left:-1px;right:0;height:0;border-top:2px solid var(--fg);z-index:4}
.now::before{content:"";position:absolute;left:-5px;top:-6px;width:10px;height:10px;border-radius:9px;background:var(--fg)}
.nowl{position:absolute;left:0;width:56px;text-align:right;transform:translateY(-50%);font:600 11px Poppins,sans-serif;color:var(--fg);z-index:4;font-variant-numeric:tabular-nums}
.ap{position:absolute;box-sizing:border-box;border-radius:12px;background:var(--card);border:1px solid var(--line2);box-shadow:0 1px 2px rgba(16,16,24,.06);padding:6px 9px;display:flex;flex-direction:column;gap:2px;overflow:hidden;text-align:left;font:inherit;color:var(--fg);cursor:pointer;z-index:2}
.ap:hover{border-color:var(--fg2);z-index:3}
.ap .t1{display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:600;line-height:1.25;min-width:0}
.ap .t1 span.nm{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.ap .t2{font-size:11.5px;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-variant-numeric:tabular-nums;line-height:1.3}
.ap-done{background:var(--bg);border-color:var(--line)}
.ap-done .t1{color:var(--fg2)}
.ap-cx{background:transparent;border-style:dashed;border-color:var(--line2)}
.ap-cx .t1 .nm{text-decoration:line-through;color:var(--mut)}
.ap-on{border-color:var(--fg);box-shadow:0 0 0 1px var(--fg),0 8px 18px -10px rgba(16,16,24,.35);z-index:3}
.aig{color:var(--ai);flex-shrink:0;display:inline-flex}
.scrim{position:absolute;inset:0;background:var(--scrim);z-index:20}
.sheet{position:absolute;top:12px;right:12px;bottom:12px;width:440px;z-index:21;background:var(--card);border-radius:24px;border:1px solid var(--line);box-shadow:var(--shf);display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box}
.shh{display:flex;align-items:flex-start;gap:12px;padding:20px 16px 16px 24px;border-bottom:1px solid var(--line)}
.shb{flex-grow:1;min-height:0;overflow:hidden;padding:20px 24px;display:flex;flex-direction:column;gap:18px}
.shf{flex-shrink:0;display:flex;flex-wrap:wrap;gap:8px;padding:14px 20px 18px;border-top:1px solid var(--line)}
.fl{display:grid;grid-template-columns:96px minmax(0,1fr);gap:12px 14px;margin:0;font-size:13.5px}
.fl dt{color:var(--mut)}.fl dd{margin:0;min-width:0;overflow-wrap:anywhere}
.orig{display:flex;align-items:center;gap:12px;padding:14px 14px 14px 16px;border-radius:18px;background:var(--aibg)}
.orig-m{background:var(--bg);border:1px solid var(--line)}
.oglyph{width:36px;height:36px;border-radius:999px;background:var(--card);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 0 0 1px var(--line)}
.olink{display:inline-flex;align-items:center;gap:7px;height:34px;padding:0 13px;border-radius:999px;background:var(--card);border:1px solid var(--line2);font:500 12.5px Poppins,sans-serif;color:var(--fg);text-decoration:none;white-space:nowrap;flex-shrink:0}
.modal{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:640px;z-index:21;background:var(--card);border-radius:24px;border:1px solid var(--line);box-shadow:var(--shf);display:flex;flex-direction:column;overflow:hidden}
.fld{display:flex;flex-direction:column;gap:6px;min-width:0}
.fld label{font-size:12.5px;font-weight:500;color:var(--fg2)}
.inp{height:40px;border-radius:12px;border:1px solid var(--line2);background:var(--card);display:flex;align-items:center;gap:8px;padding:0 12px;font-size:13.5px;color:var(--fg);box-sizing:border-box;min-width:0;white-space:nowrap;overflow:hidden}
.inp.ph{color:var(--mut)}
.chipt{height:36px;min-width:72px;padding:0 12px;border-radius:999px;border:1px solid var(--line2);background:var(--card);font:500 13px Poppins,sans-serif;color:var(--fg);font-variant-numeric:tabular-nums;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box}
.chipt-on{background:var(--fg);color:var(--bg);border-color:transparent}
.note{display:flex;gap:10px;align-items:flex-start;padding:11px 14px;border-radius:14px;background:var(--bg);border:1px solid var(--line);font-size:12.5px;line-height:1.45;color:var(--fg2)}
.sk{background:var(--track);border-radius:8px;display:block}
.mc{border-left:1px solid var(--line);border-top:1px solid var(--line);padding:8px 8px 6px;display:flex;flex-direction:column;gap:3px;min-width:0;box-sizing:border-box}
.mc .dn{font:600 13px Urbanist,Poppins,sans-serif;width:26px;height:26px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center}
.mc.out .dn{color:var(--mut);font-weight:500}
.mc.today .dn{background:var(--fg);color:var(--bg)}
.mchip{display:flex;align-items:center;gap:6px;height:22px;padding:0 6px;border-radius:8px;font-size:12px;min-width:0;color:var(--fg)}
.mchip .tm{font-variant-numeric:tabular-nums;color:var(--mut);flex-shrink:0}
.mchip .nm{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.more{font-size:12px;font-weight:500;color:var(--fg2);padding:0 6px}
.lrow{display:grid;grid-template-columns:110px 16px minmax(0,1fr) auto auto;gap:14px;align-items:center;padding:13px 22px;border-top:1px solid var(--line)}
.lday{display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding:14px 22px 10px;background:var(--card);border-top:1px solid var(--line)}
.tm2{font:500 13px 'Geist Mono',monospace;white-space:nowrap}
.ti{font-size:13.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.su{font-size:12px;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}
.src{display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--mut);white-space:nowrap}
.frame{background:var(--bg);color:var(--fg);font-family:Poppins,system-ui,sans-serif;box-sizing:border-box}
.cellh{font-size:12px;color:var(--mut);margin:0 0 10px}
'''

HELMET = f'<helmet>\n{FONTS}\n<style>{CSS}</style>\n</helmet>'


def page(title, w, h, body, script='', props=None, lang='es'):
    pr = {'$preview': {'width': w, 'height': h}}
    if props:
        pr.update(props)
    js = script or 'class Component extends DCLogic {\n  renderVals() { return {}; }\n}'
    return (f'<!doctype html>\n<html lang="{lang}">\n<head>\n<meta charset="utf-8">\n<title>{title}</title>\n'
            f'<script src="./support.js"></script>\n</head>\n<body>\n<x-dc>\n{HELMET}\n{body}\n</x-dc>\n'
            f"<script type=\"text/x-dc\" data-dc-script data-props='{json.dumps(pr, ensure_ascii=False)}'>\n{js}\n</script>\n</body>\n</html>\n")

# ------------------------------------------------------------------ datos
STATUS = {
    'scheduled': ('Agendada', 'var(--info)'),
    'confirmed': ('Confirmada', 'var(--ok)'),
    'completed': ('Completada', 'var(--mut)'),
    'cancelled': ('Cancelada', 'var(--bad)'),
    'no_show': ('No asistió', 'var(--warn)'),
}
DAYS = [  # (clave, corto, número, largo)
    ('lun', 'Lun', 28, 'Lunes 28 de septiembre'),
    ('mar', 'Mar', 29, 'Martes 29 de septiembre'),
    ('mie', 'Mié', 30, 'Miércoles 30 de septiembre'),
    ('jue', 'Jue', 1, 'Jueves 1 de octubre'),
    ('vie', 'Vie', 2, 'Viernes 2 de octubre'),
    ('sab', 'Sáb', 3, 'Sábado 3 de octubre'),
    ('dom', 'Dom', 4, 'Domingo 4 de octubre'),
]
TODAY = 2
NOW = (10, 40)
OPEN = {0: (8, 18), 1: (8, 18), 2: (8, 18), 3: (8, 18), 4: (8, 18), 5: (9, 13), 6: None}

# id, día, h, m, duración, nombre, servicio, estado, origen (call|chat|user)
APPTS = [
    ('a1', 0, 9, 0, 45, 'Mariana Ríos', 'Asesoría de viaje', 'completed', 'user'),
    ('a2', 0, 11, 30, 30, 'Carlos Gómez', 'Cotización de grupo', 'completed', 'chat'),
    ('a3', 0, 15, 0, 45, 'Laura Pérez', 'Asesoría de viaje', 'no_show', 'chat'),
    ('a4', 1, 8, 30, 30, 'Andrés Molina', 'Entrega de documentos', 'completed', 'call'),
    ('a5', 1, 10, 0, 45, 'Sofía Herrera', 'Asesoría de viaje', 'cancelled', 'chat'),
    ('a6', 1, 10, 0, 30, 'Julián Castro', 'Cotización de grupo', 'completed', 'user'),
    ('a7', 1, 16, 0, 45, 'Valentina Ortiz Montoya de la Espriella', 'Asesoría de viaje', 'completed', 'call'),
    ('a8', 2, 9, 0, 45, 'Diego Ramírez', 'Asesoría de viaje', 'completed', 'user'),
    ('a9', 2, 11, 0, 45, 'Camila Restrepo', 'Asesoría de viaje', 'confirmed', 'call'),
    ('a10', 2, 11, 0, 30, 'Tomás Vélez', 'Entrega de documentos', 'scheduled', 'chat'),
    ('a11', 2, 14, 0, 90, 'Colegio San José · 18 viajeros', 'Cotización de grupo', 'scheduled', 'user'),
    ('a12', 2, 17, 0, 30, 'Paula Andrade', 'Entrega de documentos', 'scheduled', 'chat'),
    ('a13', 3, 9, 30, 45, 'Esteban Quintero', 'Asesoría de viaje', 'confirmed', 'user'),
    ('a14', 3, 11, 0, 30, 'Natalia Suárez', 'Cotización de grupo', 'scheduled', 'call'),
    ('a15', 3, 15, 0, 45, 'Felipe Arango', 'Asesoría de viaje', 'scheduled', 'chat'),
    ('a16', 4, 8, 0, 30, 'Luisa Fernanda Mejía', 'Entrega de documentos', 'scheduled', 'user'),
    ('a17', 4, 12, 0, 45, 'Ricardo Salazar', 'Asesoría de viaje', 'confirmed', 'chat'),
    ('a18', 4, 16, 30, 60, 'Daniela Cardona', 'Cotización de grupo', 'scheduled', 'call'),
    ('a19', 5, 9, 0, 45, 'Martín Jaramillo', 'Asesoría de viaje', 'scheduled', 'user'),
    ('a20', 5, 11, 30, 30, 'Isabella Rendón', 'Entrega de documentos', 'scheduled', 'chat'),
]
NOTES = {
    'a9': 'Quiere ir a Guatapé con su familia (4 personas) la segunda semana de noviembre. Pregunta por transporte desde Envigado.',
    'a10': 'Trae pasaportes para la visa.',
    'a11': 'Salida pedagógica de grado 11. Llevar tres opciones de itinerario.',
}
ORIGIN_TEXT = {
    'call': ('Agendada por Axi en una llamada', 'phone', 'Ver llamada'),
    'chat': ('Agendada por Axi en una conversación', 'chat', 'Ver conversación'),
    'user': ('Creada por Isabel Pérez', 'user', None),
}


def hm(h, m):
    return f'{h}:{m:02d}'


def end(h, m, d):
    t = h * 60 + m + d
    return t // 60, t % 60


def ampm(h, m=0):
    suf = 'a. m.' if h < 12 else 'p. m.'
    hh = h if h <= 12 else h - 12
    return f'{hh}:{m:02d} {suf}' if m else f'{hh} {suf}'


def trange(a):
    _, _, h, m, d = a[:5]
    eh, em = end(h, m, d)
    return f'{hm(h, m)} – {hm(eh, em)}'


def layout(day):
    """Columnas de los solapes (igual que layoutDayEvents)."""
    items = sorted([a for a in APPTS if a[1] == day and a[7] != 'cancelled'], key=lambda a: (a[2] * 60 + a[3], -a[4]))
    res, cluster, cend = {}, [], -1
    def flush():
        cols = []
        for a in cluster:
            s = a[2] * 60 + a[3]
            for i, ce in enumerate(cols):
                if ce <= s:
                    cols[i] = s + a[4]; res[a[0]] = [i, 0]; break
            else:
                cols.append(s + a[4]); res[a[0]] = [len(cols) - 1, 0]
        for a in cluster:
            res[a[0]][1] = len(cols)
    for a in items:
        s = a[2] * 60 + a[3]
        if cluster and s >= cend:
            flush(); cluster = []
        cluster.append(a); cend = max(cend, s + a[4])
    if cluster:
        flush()
    return res


def ap_block(a, left, width, interactive, sel_hole=True, wide=False, narrow=False):
    aid, day, h, m, d, name, svc, st, org = a
    top = (h - G0) * HOUR + m / 60 * HOUR
    hgt = max(d / 60 * HOUR - 3, 24)
    cls = 'ap'
    if st == 'completed' or st == 'no_show':
        cls += ' ap-done'
    if st == 'cancelled':
        cls += ' ap-cx'
    color = STATUS[st][1]
    spark = f'<span class="aig" aria-label="Agendada por Axi">{ic("spark", 12)}</span>' if org != 'user' and not narrow else ''
    line2 = trange(a)
    if wide:
        line2 += f' · {svc}'
    body = (f'<span class="t1"><span class="dot" style="background:{color};width:7px;height:7px"></span>'
            f'<span class="nm">{name}</span>{spark}</span>')
    if hgt >= 38:
        body += f'<span class="t2">{line2}</span>'
    style = f'top:{top + 1:.0f}px;height:{hgt:.0f}px;left:{left};width:{width}'
    extra = f' style="{style}"'
    if interactive:
        cls_hole = f'{cls} {{{{on_{aid}}}}}' if sel_hole else cls
        return (f'<button type="button" class="{cls_hole}"{extra} onClick="{{{{open_{aid}}}}}" '
                f'aria-label="{name}, {trange(a)}, {STATUS[st][0]}">{body}</button>')
    return f'<button type="button" class="{cls}"{extra} aria-label="{name}, {trange(a)}, {STATUS[st][0]}">{body}</button>'


def grid_body(day_idxs, col_w, height, interactive=False, hint=None, wide=False, hours=(7, 19), link_slots=True):
    """Cuerpo de la rejilla: horas, franjas cerradas, huecos, citas y ahora."""
    out = ['<div class="body" style="height:%dpx">' % height]
    out.append('<div class="gut">')
    for hh in range(hours[0] + 1, hours[1]):
        out.append(f'<span class="hl" style="top:{(hh - G0) * HOUR}px">{ampm(hh)}</span>')
    out.append('</div>')
    for ci, di in enumerate(day_idxs):
        x = 60 + ci * col_w
        out.append(f'<div class="col" style="left:{x}px;width:{col_w}px">')
        for hh in range(hours[0] + 1, hours[1]):
            out.append(f'<div class="hr" style="top:{(hh - G0) * HOUR}px"></div>')
            out.append(f'<div class="hh" style="top:{(hh - G0) * HOUR - HOUR // 2}px"></div>')
        op = OPEN[di]
        if op is None:
            out.append(f'<div class="closed" style="top:0;height:{height}px"></div>')
        else:
            if op[0] > G0:
                out.append(f'<div class="closed" style="top:0;height:{(op[0] - G0) * HOUR}px"></div>')
            out.append(f'<div class="closed" style="top:{(op[1] - G0) * HOUR}px;height:{height}px"></div>')
        # huecos tocables: medias horas futuras dentro del horario (y fuera también, con aviso)
        if op is not None:
            busy = set()
            for a in APPTS:
                if a[1] == di and a[7] != 'cancelled':
                    s = a[2] * 60 + a[3]
                    for t in range(s, s + a[4], 30):
                        busy.add(t - t % 30)
            for t in range(int(G0 * 60), hours[1] * 60, 30):
                if di < TODAY or (di == TODAY and t < NOW[0] * 60 + NOW[1]):
                    continue
                if t in busy:
                    continue
                label = f'+ {hm(t // 60, t % 60)}'
                cls = 'slot'
                if hint == (di, t):
                    cls += ' slot-hint'
                    txt = f'{ic("plus", 13)}&#160;{hm(t // 60, t % 60)}'
                else:
                    txt = ''
                href = ' href="Hueco.dc.html"' if link_slots else ' href="#"'
                out.append(f'<a class="{cls}"{href} data-t="{label}" style="top:{(t / 60 - G0) * HOUR + 1:.0f}px;height:{HOUR / 2 - 2:.0f}px" '
                           f'aria-label="Nueva cita el {DAYS[di][3]} a las {hm(t // 60, t % 60)}">{txt}</a>')
        lay = layout(di)
        for a in APPTS:
            if a[1] != di or a[7] == 'cancelled':
                continue
            c, n = lay[a[0]]
            w = (col_w - 8) / n
            out.append(ap_block(a, f'{4 + c * w:.0f}px', f'{w - 3:.0f}px', interactive, wide=wide, narrow=w < 100))
        if di == TODAY:
            out.append(f'<div class="now" style="top:{(NOW[0] - G0) * HOUR + NOW[1] / 60 * HOUR:.0f}px"></div>')
        out.append('</div>')
    if TODAY in day_idxs:
        out.append(f'<span class="nowl" style="top:{(NOW[0] - G0) * HOUR + NOW[1] / 60 * HOUR:.0f}px">{hm(*NOW)}</span>')
    out.append('</div>')
    return ''.join(out)


def day_head(day_idxs, col_w, show_count=True):
    cols = f'60px repeat({len(day_idxs)},{col_w}px)'
    out = [f'<div class="dh" style="grid-template-columns:{cols}"><div style="display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--mut)" title="La agenda se muestra en la hora del negocio">GMT−5</div>']
    for di in day_idxs:
        k, short, num, _ = DAYS[di]
        n = len([a for a in APPTS if a[1] == di and a[7] != 'cancelled'])
        cls = 'dhc today' if di == TODAY else 'dhc'
        cnt = f'<span class="n">{n} citas</span>' if show_count and n and len(day_idxs) == 1 else (f'<span class="n">{n}</span>' if show_count and n else '')
        closed = '<span class="n">Cerrado</span>' if OPEN[di] is None else ''
        cur = ' aria-current="date"' if di == TODAY else ''
        out.append(f'<div class="{cls}"{cur}>{short} <b>{num}</b>{cnt or closed}</div>')
    out.append('</div>')
    return ''.join(out)

# ------------------------------------------------------------------ piezas del shell
NAV_ITEMS = [('home', 'Dashboard'), ('spark', 'CMO'), ('target', 'CRM'), ('inbox', 'Inbox'), ('cal', 'Agenda'),
             ('bag', 'Ventas'), ('phone', 'Llamadas'), ('mega', 'Marketing'), ('chart', 'Analítica'), ('bill', 'Facturación'), ('gear', 'Configuración')]


def side():
    out = ['<aside class="side" aria-label="Menú principal">',
           '<div style="display:flex;align-items:center;gap:10px;padding:4px 8px 14px">'
           '<svg width="26" height="26" viewBox="0 0 28 28" aria-hidden="true"><circle cx="11" cy="15" r="7.5" fill="none" stroke="#D13F42" stroke-width="4"></circle><path d="M16 5 L25 24" stroke="#F2A93B" stroke-width="4" stroke-linecap="round"></path><path d="M25 5 L17 20" stroke="#7B5CF0" stroke-width="4" stroke-linecap="round"></path></svg>'
           '<div style="display:flex;flex-direction:column;min-width:0"><span style="font-weight:600;font-size:13.5px">JuanitoXpeditions</span><span style="font-size:11.5px;color:var(--mut)">Owner</span></div></div>']
    for icn, label in NAV_ITEMS:
        on = label == 'Agenda'
        out.append(f'<a class="nav{" nav-on" if on else ""}" href="#"{" aria-current=\"page\"" if on else ""}>{ic(icn, 16)}{label}</a>')
    out.append('</aside>')
    return ''.join(out)


def topbar(last='Calendario'):
    return (f'<header class="top"><a class="crumb" href="#">Inicio</a><span style="color:var(--mut)">{ic("right", 14)}</span>'
            f'<a class="crumb" href="#">Agenda</a><span style="color:var(--mut)">{ic("right", 14)}</span><span style="font-weight:500">{last}</span></header>')


def section_head(summary=True):
    tabs = ('<nav class="seg" aria-label="Secciones de la agenda">'
            f'<a class="sg sg-on" href="#" aria-current="page">{ic("cal", 15)}Calendario</a>'
            f'<a class="sg" href="#">{ic("bell", 15)}Recordatorios</a>'
            f'<a class="sg" href="#">{ic("gear", 15)}Configuración</a></nav>')
    line = ('<p style="margin:6px 0 0;font-size:13.5px;color:var(--fg2)">Hoy tienes 5 citas; 3 esperan confirmación. '
            'La próxima, a las 11:00: <b style="font-weight:600;color:var(--fg)">Camila Restrepo</b>.</p>') if summary else ''
    return ('<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:20px;flex-wrap:wrap">'
            f'<div style="min-width:0"><h1 class="d" style="margin:0;font-size:34px;font-weight:700;letter-spacing:-.02em;line-height:1.1">Agenda</h1>{line}</div>'
            f'{tabs}</div>')


def view_seg(active, interactive):
    items = [('month', 'Mes', 'grid'), ('week', 'Semana', 'week'), ('day', 'Día', 'day'), ('list', 'Lista', 'list')]
    out = ['<div class="seg" role="group" aria-label="Vista del calendario">']
    for v, label, icn in items:
        if interactive:
            out.append(f'<button type="button" class="sg {{{{segcls_{v}}}}}" aria-pressed="{{{{pressed_{v}}}}}" onClick="{{{{go_{v}}}}}">{ic(icn, 15)}{label}</button>')
        else:
            on = v == active
            out.append(f'<button type="button" class="sg{" sg-on" if on else ""}" aria-pressed="{"true" if on else "false"}">{ic(icn, 15)}{label}</button>')
    out.append('</div>')
    return ''.join(out)


def toolbar(title, active='week', interactive=False, title_hole=None):
    t = f'{{{{{title_hole}}}}}' if title_hole else title
    return ('<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">'
            '<button type="button" class="btn">Hoy</button>'
            f'<div style="display:flex;gap:6px"><button type="button" class="icb" aria-label="Periodo anterior">{ic("left", 16)}</button>'
            f'<button type="button" class="icb" aria-label="Periodo siguiente">{ic("right", 16)}</button></div>'
            f'<h2 class="d" style="margin:0 0 0 4px;font-size:22px;font-weight:700;letter-spacing:-.01em;white-space:nowrap">{t}</h2>'
            '<div style="margin-left:auto;display:flex;align-items:center;gap:10px">'
            f'<button type="button" class="sel" aria-label="Filtrar por estado">{ic("filter", 14)}Todos los estados<span style="color:var(--mut);display:inline-flex">{ic("chev", 14)}</span></button>'
            f'{view_seg(active, interactive)}'
            f'<a class="btn btn-brand" href="Hueco.dc.html">{ic("plus", 16)}Nueva cita</a>'
            '</div></div>')

# ------------------------------------------------------------------ vistas
W_MAIN = 1440 - 248 - 64  # ancho útil del contenido
GRID_W = W_MAIN
WEEK_COL = (GRID_W - 62) // 7
GRID_H = 700


def week_card(interactive, hint=None, link_slots=True):
    return (f'<div class="card cal" style="height:{GRID_H + 54}px">{day_head(range(7), WEEK_COL)}'
            f'{grid_body(list(range(7)), WEEK_COL, GRID_H, interactive, hint=hint, link_slots=link_slots)}</div>')


def day_card(interactive):
    col = GRID_W - 62
    return (f'<div class="card cal" style="height:{GRID_H + 54}px">{day_head([TODAY], col)}'
            f'{grid_body([TODAY], col, GRID_H, interactive, wide=True, hint=None if interactive else (TODAY, 780))}</div>')


def month_card(interactive):
    # sep 2026: 1 = martes. Semanas desde lun 31 ago hasta dom 11 oct
    cells = []
    import datetime as dt
    start = dt.date(2026, 8, 31)
    per = {28: 0, 29: 1, 30: 2}
    oct_map = {1: 3, 2: 4, 3: 5, 4: 6}
    extra = {  # citas de otros días del mes (solo para pintar el mes)
        dt.date(2026, 9, 2): [('9:00', 'Juan Pablo Ortiz', 'completed'), ('15:30', 'Ana María Toro', 'completed')],
        dt.date(2026, 9, 4): [('10:00', 'Sergio Duque', 'no_show')],
        dt.date(2026, 9, 8): [('8:30', 'Lina Marcela Gil', 'completed'), ('11:00', 'Hernán Bedoya', 'completed'), ('14:00', 'Claudia Rojas', 'completed'), ('16:30', 'Óscar Patiño', 'completed')],
        dt.date(2026, 9, 10): [('9:30', 'Mónica Vargas', 'cancelled')],
        dt.date(2026, 9, 15): [('10:00', 'Grupo Rotarios', 'completed'), ('12:00', 'Pedro Álvarez', 'completed')],
        dt.date(2026, 9, 17): [('9:00', 'Carolina Zapata', 'completed')],
        dt.date(2026, 9, 22): [('11:30', 'Mateo Giraldo', 'completed'), ('15:00', 'Sara Londoño', 'no_show')],
        dt.date(2026, 9, 24): [('8:00', 'Fabián Muñoz', 'completed')],
        dt.date(2026, 10, 6): [('10:00', 'Verónica Cano', 'scheduled')],
        dt.date(2026, 10, 8): [('9:00', 'Alejandro Ruiz', 'scheduled'), ('11:00', 'Juliana Henao', 'confirmed')],
    }
    for i in range(42):
        d = start + dt.timedelta(days=i)
        items = []
        di = None
        if d.month == 9 and d.day in per:
            di = per[d.day]
        if d.month == 10 and d.day in oct_map:
            di = oct_map[d.day]
        if di is not None:
            items = [(hm(a[2], a[3]), a[5], a[7]) for a in sorted([a for a in APPTS if a[1] == di], key=lambda a: a[2] * 60 + a[3])]
        items += extra.get(d, [])
        cls = 'mc'
        if d.month != 9:
            cls += ' out'
        if d == dt.date(2026, 9, 30):
            cls += ' today'
        chips = ''
        for t, nm, st in items[:3]:
            deco = ' style="text-decoration:line-through;color:var(--mut)"' if st == 'cancelled' else ''
            chips += (f'<span class="mchip"><span class="dot" style="background:{STATUS[st][1]};width:6px;height:6px"></span>'
                      f'<span class="tm">{t}</span><span class="nm"{deco}>{nm}</span></span>')
        if len(items) > 3:
            chips += f'<a class="more" href="#">{len(items) - 3} más</a>'
        cur = ' aria-current="date"' if 'today' in cls else ''
        cells.append(f'<div class="{cls}"{cur}><span class="dn">{d.day}</span>{chips}</div>')
    heads = ''.join(f'<div style="padding:12px 12px 8px;font-size:12px;color:var(--mut);border-left:1px solid var(--line)">{x}</div>'
                    for x in ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'])
    return (f'<div class="card cal" style="height:{GRID_H + 54}px"><div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));margin-left:-1px">{heads}</div>'
            f'<div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));grid-auto-rows:1fr;flex-grow:1;margin-left:-1px">{"".join(cells)}</div></div>')


def list_card():
    out = [f'<div class="card cal" style="height:{GRID_H + 54}px"><div style="overflow:hidden;flex-grow:1">']
    for di in [TODAY, 3, 4]:
        items = sorted([a for a in APPTS if a[1] == di], key=lambda a: a[2] * 60 + a[3])
        n = len([a for a in items if a[7] != 'cancelled'])
        first = ' style="border-top:0"' if di == TODAY else ''
        lab = 'Hoy · ' if di == TODAY else ('Mañana · ' if di == 3 else '')
        out.append(f'<div class="lday"{first}><span class="d" style="font-size:17px;font-weight:700">{lab}{DAYS[di][3]}</span><span class="lbl" style="font-size:12px;color:var(--mut)">{n} citas</span></div>')
        for a in items:
            org = a[8]
            src = {'call': f'{ic("phone", 13)}Por llamada', 'chat': f'{ic("chat", 13)}Por chat', 'user': f'{ic("user", 13)}Isabel'}[org]
            deco = ' style="text-decoration:line-through;color:var(--mut)"' if a[7] == 'cancelled' else ''
            out.append(f'<div class="lrow"><span class="tm2">{trange(a)}</span><span class="dot" style="background:{STATUS[a[7]][1]}"></span>'
                       f'<div style="min-width:0"><div class="ti"{deco}>{a[5]}</div><div class="su">{a[6]}</div></div>'
                       f'<span class="src">{src}</span><span class="pill"><span class="dot" style="background:{STATUS[a[7]][1]};width:6px;height:6px"></span>{STATUS[a[7]][0]}</span></div>')
    out.append('</div></div>')
    return ''.join(out)

# ------------------------------------------------------------------ detalle (panel)
def origin_block(org):
    txt, icn, link = ORIGIN_TEXT[org]
    if org == 'user':
        return (f'<div class="orig orig-m"><span class="oglyph" style="color:var(--fg2)">{ic("user", 17)}</span>'
                f'<div style="flex-grow:1;min-width:0"><div style="font-size:13.5px;font-weight:600">{txt}</div>'
                '<div style="font-size:12px;color:var(--mut);margin-top:2px">Desde la agenda, el 29 de septiembre</div></div></div>')
    sub = 'Llamada entrante del 29 de septiembre, 4:12 p. m.' if org == 'call' else 'WhatsApp Ventas, el 29 de septiembre'
    return (f'<div class="orig" style="align-items:flex-start"><span class="oglyph" style="color:var(--ai)">{ic("spark", 17)}</span>'
            f'<div style="flex-grow:1;min-width:0;display:flex;flex-direction:column;gap:10px"><div><div style="font-size:13.5px;font-weight:600">{txt}</div>'
            f'<div style="font-size:12px;color:var(--mut);margin-top:2px">{sub}</div></div>'
            f'<a class="olink" href="#" style="align-self:flex-start">{ic(icn, 14)}{link}</a></div></div>')


def sheet_static(a, top=12, bottom=12, reagendar=False):
    aid, day, h, m, d, name, svc, st, org = a
    lab, color = STATUS[st]
    note = NOTES.get(aid, '—')
    actions = ('<button type="button" class="btn btn-ink">' + ic('check', 15) + 'Confirmar</button>'
               '<button type="button" class="btn">' + ic('clock', 15) + 'Reagendar</button>'
               '<button type="button" class="icb" aria-label="Más acciones: No asistió, Cancelar la cita" style="margin-left:auto">' + ic('more', 16) + '</button>')
    if st == 'confirmed':
        actions = ('<button type="button" class="btn btn-ink">' + ic('check', 15) + 'Completar</button>'
                   '<button type="button" class="btn">' + ic('clock', 15) + 'Reagendar</button>'
                   '<button type="button" class="icb" aria-label="Más acciones: No asistió, Cancelar la cita" style="margin-left:auto">' + ic('more', 16) + '</button>')
    if st in ('completed', 'cancelled', 'no_show'):
        actions = ''
    body = (f'<div style="display:flex;flex-direction:column;gap:10px"><span class="pill" style="align-self:flex-start"><span class="dot" style="background:{color};width:7px;height:7px"></span>{lab}</span></div>'
            f'<dl class="fl"><dt>Fecha</dt><dd>{DAYS[day][3]}</dd>'
            f'<dt>Hora</dt><dd style="font-variant-numeric:tabular-nums">{trange(a)} <span style="color:var(--mut)">· {d} min</span></dd>'
            f'<dt>Responsable</dt><dd>Isabel Pérez</dd>'
            f'<dt>Notas</dt><dd style="color:var(--fg2);line-height:1.5">{note}</dd></dl>'
            f'{origin_block(org)}')
    if reagendar:
        chips = ''.join(f'<button type="button" class="chipt{" chipt-on" if t == "15:30" else ""}"{" aria-pressed=\"true\"" if t == "15:30" else ""}>{t}</button>'
                        for t in ['12:00', '12:30', '13:00', '15:30', '16:00', '16:30', '17:30'])
        body += ('<div style="display:flex;flex-direction:column;gap:10px;padding-top:4px;border-top:1px solid var(--line)">'
                 '<div style="display:flex;justify-content:space-between;align-items:baseline;padding-top:14px"><span style="font-size:13.5px;font-weight:600">Reagendar · hoy</span>'
                 '<a href="#" style="font-size:12.5px;font-weight:500;text-decoration:none;display:inline-flex;align-items:center;gap:4px">Otro día' + ic('arrow', 13) + '</a></div>'
                 f'<div style="display:flex;flex-wrap:wrap;gap:8px">{chips}</div>'
                 '<p style="margin:0;font-size:12px;color:var(--mut)">Axi rehace los recordatorios de Camila para la nueva hora.</p></div>')
        actions = ('<button type="button" class="btn btn-ink">Mover a las 15:30</button>'
                   '<button type="button" class="btn btn-ghost">Volver</button>')
    foot = f'<div class="shf">{actions}</div>' if actions else ''
    return (f'<aside class="sheet" style="top:{top}px;bottom:{bottom}px" aria-label="Detalle de la cita">'
            f'<div class="shh"><div style="flex-grow:1;min-width:0"><div class="d" style="font-size:24px;font-weight:700;letter-spacing:-.01em;line-height:1.15;overflow-wrap:anywhere">{name}</div>'
            f'<div style="font-size:13px;color:var(--mut);margin-top:4px">{svc} · {d} min</div></div>'
            f'<button type="button" class="icb icb-q" aria-label="Cerrar">{ic("x", 18)}</button></div>'
            f'<div class="shb">{body}</div>{foot}</aside>')


def sheet_dynamic():
    """Panel del Main: lee la cita elegida del estado."""
    return ('<sc-if value="{{hasSel}}" hint-placeholder-val="{{ false }}">'
            '<div class="scrim" onClick="{{close}}"></div>'
            '<aside class="sheet" aria-label="Detalle de la cita">'
            '<div class="shh"><div style="flex-grow:1;min-width:0"><div class="d" style="font-size:24px;font-weight:700;letter-spacing:-.01em;line-height:1.15;overflow-wrap:anywhere">{{sel.name}}</div>'
            '<div style="font-size:13px;color:var(--mut);margin-top:4px">{{sel.svc}} · {{sel.dur}} min</div></div>'
            f'<button type="button" class="icb icb-q" aria-label="Cerrar" onClick="{{{{close}}}}">{ic("x", 18)}</button></div>'
            '<div class="shb"><span class="pill" style="align-self:flex-start"><span class="dot" style="{{sel.dot}}"></span>{{sel.status}}</span>'
            '<dl class="fl"><dt>Fecha</dt><dd>{{sel.day}}</dd><dt>Hora</dt><dd style="font-variant-numeric:tabular-nums">{{sel.range}} <span style="color:var(--mut)">· {{sel.dur}} min</span></dd>'
            '<dt>Responsable</dt><dd>Isabel Pérez</dd><dt>Notas</dt><dd style="color:var(--fg2);line-height:1.5">{{sel.note}}</dd></dl>'
            '<sc-if value="{{sel.isCall}}" hint-placeholder-val="{{ false }}">'
            f'<div class="orig" style="align-items:flex-start"><span class="oglyph" style="color:var(--ai)">{ic("spark", 17)}</span><div style="flex-grow:1;min-width:0;display:flex;flex-direction:column;gap:10px"><div><div style="font-size:13.5px;font-weight:600">Agendada por Axi en una llamada</div>'
            '<div style="font-size:12px;color:var(--mut);margin-top:2px">Llamada entrante del 29 de septiembre, 4:12 p. m.</div></div>'
            f'<a class="olink" href="#" style="align-self:flex-start">{ic("phone", 14)}Ver llamada</a></div></div></sc-if>'
            '<sc-if value="{{sel.isChat}}" hint-placeholder-val="{{ false }}">'
            f'<div class="orig" style="align-items:flex-start"><span class="oglyph" style="color:var(--ai)">{ic("spark", 17)}</span><div style="flex-grow:1;min-width:0;display:flex;flex-direction:column;gap:10px"><div><div style="font-size:13.5px;font-weight:600">Agendada por Axi en una conversación</div>'
            '<div style="font-size:12px;color:var(--mut);margin-top:2px">WhatsApp Ventas, el 29 de septiembre</div></div>'
            f'<a class="olink" href="#" style="align-self:flex-start">{ic("chat", 14)}Ver conversación</a></div></div></sc-if>'
            '<sc-if value="{{sel.isUser}}" hint-placeholder-val="{{ false }}">'
            f'<div class="orig orig-m"><span class="oglyph" style="color:var(--fg2)">{ic("user", 17)}</span><div style="flex-grow:1;min-width:0"><div style="font-size:13.5px;font-weight:600">Creada por Isabel Pérez</div>'
            '<div style="font-size:12px;color:var(--mut);margin-top:2px">Desde la agenda, el 29 de septiembre</div></div></div></sc-if>'
            '</div>'
            '<sc-if value="{{sel.open}}" hint-placeholder-val="{{ false }}"><div class="shf">'
            f'<button type="button" class="btn btn-ink">{ic("check", 15)}{{{{sel.primary}}}}</button>'
            f'<button type="button" class="btn">{ic("clock", 15)}Reagendar</button>'
            f'<button type="button" class="icb" aria-label="Más acciones: No asistió, Cancelar la cita" style="margin-left:auto">{ic("more", 16)}</button></div></sc-if>'
            '</aside></sc-if>')


def main_js(default_view='week'):
    data = {}
    for a in APPTS:
        aid, day, h, m, d, name, svc, st, org = a
        prim, sec = ('Completar', 'No asistió') if st == 'confirmed' else ('Confirmar', 'Completar')
        data[aid] = {
            'name': name, 'when': f'{DAYS[day][3].split(" ")[0]} {DAYS[day][2]} · {hm(h, m)}', 'day': DAYS[day][3],
            'range': trange(a), 'dur': d, 'svc': svc, 'note': NOTES.get(aid, '—'), 'status': STATUS[st][0],
            'dot': f'background:{STATUS[st][1]};width:7px;height:7px', 'isCall': org == 'call', 'isChat': org == 'chat',
            'isUser': org == 'user', 'open': st in ('scheduled', 'confirmed'), 'primary': prim, 'secondary': sec,
        }
    titles = {'week': '28 sep – 4 oct 2026', 'day': 'Miércoles 30 de septiembre', 'month': 'Septiembre 2026', 'list': 'Próximos 7 días'}
    ids = [a[0] for a in APPTS]
    return ('class Component extends DCLogic {\n'
            f'  constructor(p) {{ super(p); this.state = {{ view: "{default_view}", sel: null }}; }}\n'
            '  renderVals() {\n'
            f'    const D = {json.dumps(data, ensure_ascii=False)};\n'
            f'    const T = {json.dumps(titles, ensure_ascii=False)};\n'
            f'    const ids = {json.dumps(ids)};\n'
            '    const v = this.state.view; const s = this.state.sel;\n'
            '    const r = { themeCls: this.props.dark ? "dk" : "lt", title: T[v], hasSel: s !== null, sel: s ? D[s] : D.a9,\n'
            '      isWeek: v === "week", isDay: v === "day", isMonth: v === "month", isList: v === "list",\n'
            '      close: () => this.setState({ sel: null }) };\n'
            '    ["week","day","month","list"].forEach((k) => { r["segcls_" + k] = v === k ? "sg-on" : ""; r["pressed_" + k] = v === k ? "true" : "false"; r["go_" + k] = () => this.setState({ view: k, sel: null }); });\n'
            '    ids.forEach((id) => { r["open_" + id] = () => this.setState({ sel: id }); r["on_" + id] = s === id ? "ap-on" : ""; });\n'
            '    return r;\n  }\n}')


def main_board(fname, dark_default):
    body = (f'<div class="app {{{{themeCls}}}}" style="width:1440px;height:1000px">{side()}'
            '<main style="flex-grow:1;display:flex;flex-direction:column;min-width:0;min-height:0;position:relative">'
            f'{topbar()}'
            '<div style="padding:22px 32px 24px;display:flex;flex-direction:column;gap:18px;min-height:0;flex-grow:1">'
            f'{section_head()}{toolbar("", "week", True, "title")}'
            f'<sc-if value="{{{{isWeek}}}}" hint-placeholder-val="{{{{ true }}}}">{week_card(True)}</sc-if>'
            f'<sc-if value="{{{{isDay}}}}" hint-placeholder-val="{{{{ false }}}}">{day_card(True)}</sc-if>'
            f'<sc-if value="{{{{isMonth}}}}" hint-placeholder-val="{{{{ false }}}}">{month_card(True)}</sc-if>'
            f'<sc-if value="{{{{isList}}}}" hint-placeholder-val="{{{{ false }}}}">{list_card()}</sc-if>'
            '</div>'
            f'{sheet_dynamic()}'
            '</main></div>')
    props = {'dark': {'editor': 'boolean', 'default': dark_default}}
    return page('Agenda · Calendario', 1440, 1000, body, main_js(), props)

# ------------------------------------------------------------------ 2 · Tocar un hueco
def modal_new(fuera):
    when = 'Jueves 1 de octubre'
    t = '18:30' if fuera else '10:00'
    chips = ''.join(f'<button type="button" class="chipt{" chipt-on" if x == t else ""}"{" aria-pressed=\"true\"" if x == t else ""}>{x}</button>'
                    for x in ['8:00', '8:30', '10:00', '10:30', '12:00', '13:30', '16:00'])
    if fuera:
        slotzone = (f'<div class="note">{ic("clock", 16)}<div><b style="font-weight:600;color:var(--fg)">18:30 está fuera de tu horario</b> (8:00 – 18:00). '
                    'Puedes agendarla igual: la cita queda en la agenda y Axi le envía sus recordatorios.</div></div>')
    else:
        slotzone = (f'<div class="fld"><label>Horarios libres ese día</label><div style="display:flex;flex-wrap:wrap;gap:8px">{chips}</div>'
                    '<span style="font-size:12px;color:var(--mut)">Tocaste las 10:00 en el calendario. Elige otra hora si prefieres.</span></div>')
    return ('<div class="modal" role="dialog" aria-modal="true" aria-labelledby="nc-t">'
            '<div style="display:flex;align-items:flex-start;gap:12px;padding:22px 18px 6px 28px"><div style="flex-grow:1">'
            '<h2 id="nc-t" class="d" style="margin:0;font-size:24px;font-weight:700;letter-spacing:-.01em">Nueva cita</h2>'
            f'<p style="margin:4px 0 0;font-size:13px;color:var(--mut)">{when} · {t}</p></div>'
            f'<button type="button" class="icb icb-q" aria-label="Cerrar">{ic("x", 18)}</button></div>'
            '<div style="padding:16px 28px 8px;display:flex;flex-direction:column;gap:16px">'
            f'<div class="fld"><label>Contacto</label><div class="inp ph">{ic("search", 15)}Busca por nombre o teléfono</div></div>'
            '<div style="display:grid;grid-template-columns:minmax(0,1fr) 150px 120px;gap:12px">'
            f'<div class="fld"><label>Servicio</label><div class="inp">Asesoría de viaje · 45 min<span style="margin-left:auto;color:var(--mut);display:inline-flex">{ic("chev", 14)}</span></div></div>'
            f'<div class="fld"><label>Fecha</label><div class="inp">{ic("cal", 15)}1 oct 2026</div></div>'
            f'<div class="fld"><label>Hora</label><div class="inp" style="font-variant-numeric:tabular-nums">{ic("clock", 15)}{t}</div></div></div>'
            f'{slotzone}'
            '<div class="fld"><label>Notas <span style="font-weight:400;color:var(--mut)">(opcional)</span></label><div class="inp ph" style="height:64px;align-items:flex-start;padding-top:10px">Lo que el equipo debe saber de la cita</div></div>'
            '</div>'
            '<div style="display:flex;justify-content:flex-end;gap:8px;padding:14px 28px 22px">'
            '<button type="button" class="btn btn-ghost">Cancelar</button><button type="button" class="btn btn-brand">Agendar cita</button></div></div>')


def hueco_board():
    body = (f'<div class="app {{{{themeCls}}}}" style="width:1440px;height:1000px">{side()}'
            '<main style="flex-grow:1;display:flex;flex-direction:column;min-width:0;min-height:0;position:relative">'
            f'{topbar("Nueva cita")}'
            '<div style="padding:22px 32px 24px;display:flex;flex-direction:column;gap:18px;min-height:0;flex-grow:1">'
            f'{section_head()}{toolbar("28 sep – 4 oct 2026")}{week_card(False, link_slots=False)}</div>'
            '<div class="scrim"></div>'
            '<sc-if value="{{inHours}}" hint-placeholder-val="{{ true }}">' + modal_new(False) + '</sc-if>'
            '<sc-if value="{{outHours}}" hint-placeholder-val="{{ false }}">' + modal_new(True) + '</sc-if>'
            '</main></div>')
    js = ('class Component extends DCLogic {\n  renderVals() {\n    const f = this.props.hueco === "fuera de horario";\n'
          '    return { themeCls: this.props.dark ? "dk" : "lt", inHours: !f, outHours: f };\n  }\n}')
    props = {'hueco': {'editor': 'enum', 'options': ['dentro del horario', 'fuera de horario'], 'default': 'dentro del horario'},
             'dark': {'editor': 'boolean', 'default': False}}
    return page('Agenda · Tocar un hueco', 1440, 1000, body, js, props)

# ------------------------------------------------------------------ 3 · Origen
def origen_board():
    def panel(a, label, note):
        return (f'<div style="display:flex;flex-direction:column;gap:14px;min-width:0">'
                f'<div><div class="kick">{label}</div><p style="margin:6px 0 0;font-size:13px;color:var(--fg2);line-height:1.45">{note}</p></div>'
                f'<div style="position:relative;height:820px">{sheet_static(a, 0, 0).replace("width:440px", "width:100%").replace("right:12px", "right:0")}</div></div>')
    a9 = next(a for a in APPTS if a[0] == 'a9')
    a10 = next(a for a in APPTS if a[0] == 'a10')
    a11 = next(a for a in APPTS if a[0] == 'a11')
    body = ('<div class="frame lt" style="width:1440px;height:1000px;padding:36px 48px;display:flex;flex-direction:column;gap:22px">'
            '<div><h1 class="d" style="margin:0;font-size:34px;font-weight:700;letter-spacing:-.02em">De dónde viene la cita</h1>'
            '<p style="margin:6px 0 0;font-size:13.5px;color:var(--fg2)">El arreglo: cuando Axi agenda en una llamada, el detalle lleva a esa llamada.</p></div>'
            '<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:28px;flex-grow:1">'
            + panel(a9, 'Por llamada · el arreglo', 'Hoy dice «Ver conversación» y lleva a una conversación que no existe. Ahora: «Ver llamada», que abre la llamada donde se agendó.')
            + panel(a10, 'Por chat', 'Sin cambios de fondo: «Ver conversación» abre el hilo en el Inbox.')
            + panel(a11, 'Creada a mano', 'Sin enlace: dice quién la creó. Antes no se decía nada.')
            + '</div></div>')
    return page('Agenda · Origen de la cita', 1440, 1000, body)

# ------------------------------------------------------------------ 4 · Día y Mes
def vistas_board():
    col = 1440 - 248 - 64 - 62
    body = (f'<div class="app lt" style="width:1440px;height:1000px">{side()}'
            '<main style="flex-grow:1;display:flex;flex-direction:column;min-width:0;min-height:0;position:relative">'
            f'{topbar()}'
            '<div style="padding:22px 32px 24px;display:flex;flex-direction:column;gap:18px;min-height:0;flex-grow:1">'
            f'{section_head()}{toolbar("Miércoles 30 de septiembre", "day")}{day_card(False)}</div>'
            '</main></div>')
    return page('Agenda · Día', 1440, 1000, body)


def mes_board():
    body = (f'<div class="app lt" style="width:1440px;height:1000px">{side()}'
            '<main style="flex-grow:1;display:flex;flex-direction:column;min-width:0;min-height:0;position:relative">'
            f'{topbar()}'
            '<div style="padding:22px 32px 24px;display:flex;flex-direction:column;gap:18px;min-height:0;flex-grow:1">'
            f'{section_head()}{toolbar("Septiembre 2026", "month")}{month_card(False)}</div>'
            '</main></div>')
    return page('Agenda · Mes', 1440, 1000, body)

# ------------------------------------------------------------------ 5 · Estados
def estados_board():
    def cell(label, inner):
        return (f'<div style="display:flex;flex-direction:column;min-width:0"><p class="cellh">{label}</p>'
                f'<div class="card" style="height:340px;display:flex;flex-direction:column;overflow:hidden">{inner}</div></div>')
    loading = ('<div style="display:grid;grid-template-columns:48px repeat(5,minmax(0,1fr));border-bottom:1px solid var(--line);height:44px;align-items:center;gap:10px;padding:0 12px">'
               '<span></span>' + ''.join('<span class="sk" style="height:12px;width:60%"></span>' for _ in range(5)) + '</div>'
               '<div role="status" aria-label="Cargando citas" style="flex-grow:1;display:grid;grid-template-columns:48px repeat(5,minmax(0,1fr));gap:10px;padding:14px 12px">'
               '<span></span><span class="sk" style="height:46px;margin-top:20px"></span><span class="sk" style="height:70px;margin-top:80px"></span><span class="sk" style="height:46px"></span><span class="sk" style="height:46px;margin-top:120px"></span><span class="sk" style="height:60px;margin-top:40px"></span></div>')
    err = (f'<div style="margin:auto;display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center;max-width:320px">'
           f'<span class="oglyph" style="width:44px;height:44px;color:var(--fg2)">{ic("alert", 20)}</span>'
           '<div class="d" style="font-size:19px;font-weight:700">No pudimos cargar tus citas</div>'
           '<p style="margin:0;font-size:13px;color:var(--mut);line-height:1.45">Revisa tu conexión. Tus citas siguen guardadas.</p>'
           f'<button type="button" class="btn">{ic("refresh", 15)}Reintentar</button></div>')
    unconf = (f'<div style="padding:16px"><div class="note" style="align-items:center">{ic("clock", 16)}<div style="flex-grow:1"><b style="font-weight:600;color:var(--fg)">Configura tu horario de atención</b><br>'
              'Sin él, Axi no puede ofrecer horas a tus clientes.</div><a class="btn btn-ink" href="#">Configurar</a></div></div>'
              '<div style="flex-grow:1;margin:0 16px 16px;border-radius:16px;background:var(--quiet)"></div>')
    free = (f'<div style="margin:auto;display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center;max-width:320px">'
            f'<span class="oglyph" style="width:44px;height:44px;color:var(--fg2)">{ic("sun", 20)}</span>'
            '<div class="d" style="font-size:19px;font-weight:700">Día libre</div>'
            '<p style="margin:0;font-size:13px;color:var(--mut);line-height:1.45">No hay citas el jueves 8. Toca una hora del calendario para agendar.</p>'
            f'<a class="btn btn-brand" href="#">{ic("plus", 15)}Nueva cita</a></div>')
    week_empty = (f'<div style="margin:auto;display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center;max-width:340px">'
                  f'<span class="oglyph" style="width:44px;height:44px;color:var(--fg2)">{ic("cal", 20)}</span>'
                  '<div class="d" style="font-size:19px;font-weight:700">Sin citas en estos días</div>'
                  '<p style="margin:0;font-size:13px;color:var(--mut);line-height:1.45">Cuando Axi o tu equipo agenden, las verás aquí. La próxima es el lunes 12 a las 9:00.</p>'
                  f'<a class="btn" href="#">Ir a la próxima{ic("arrow", 15)}</a></div>')
    filt = (f'<div style="margin:auto;display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center;max-width:320px">'
            f'<span class="oglyph" style="width:44px;height:44px;color:var(--fg2)">{ic("filter", 20)}</span>'
            '<div class="d" style="font-size:19px;font-weight:700">Ninguna cita «No asistió»</div>'
            '<p style="margin:0;font-size:13px;color:var(--mut);line-height:1.45">Esta semana todos llegaron.</p>'
            '<button type="button" class="btn">Ver todos los estados</button></div>')
    body = ('<div class="frame lt" style="width:1440px;height:1000px;padding:36px 48px;display:flex;flex-direction:column;gap:22px">'
            '<h1 class="d" style="margin:0;font-size:34px;font-weight:700;letter-spacing:-.02em">Estados</h1>'
            '<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px">'
            + cell('Cargando', loading) + cell('Error', err) + cell('Sin horario configurado', unconf)
            + cell('Día libre (vista Día)', free) + cell('Semana vacía', week_empty) + cell('Filtro sin resultados', filt)
            + '</div></div>')
    return page('Agenda · Estados', 1440, 1000, body)

# ------------------------------------------------------------------ 6 · Celular
MOB_HOUR = 60


def mob_shell(inner, title='Agenda', dark=False):
    return (f'<div class="app {"dk" if dark else "lt"}" style="width:390px;height:844px;flex-direction:column">'
            f'<header style="height:56px;flex-shrink:0;display:flex;align-items:center;gap:8px;padding:0 12px;border-bottom:1px solid var(--line);background:var(--side)">'
            f'<button type="button" class="icb icb-q" aria-label="Abrir el menú">{ic("menu", 20)}</button>'
            f'<span class="d" style="font-size:20px;font-weight:700;flex-grow:1">{title}</span>'
            f'<a class="icb" href="#" aria-label="Nueva cita" style="background:var(--brand);color:var(--onbrand);border-color:transparent;width:40px;height:40px">{ic("plus", 18)}</a></header>'
            f'{inner}</div>')


def mob_tabs(active='day'):
    items = [('day', 'Día'), ('month', 'Mes'), ('list', 'Lista')]
    seg = ''.join(f'<button type="button" class="sg{" sg-on" if k == active else ""}" style="flex:1;height:34px" aria-pressed="{"true" if k == active else "false"}">{lab}</button>' for k, lab in items)
    return (f'<div style="padding:12px 16px 0;display:flex;gap:8px;align-items:center"><div class="seg" style="flex-grow:1">{seg}</div>'
            f'<button type="button" class="icb" aria-label="Filtrar por estado">{ic("filter", 16)}</button></div>')


def week_strip():
    out = ['<div style="display:flex;align-items:center;gap:4px;padding:12px 10px 10px">'
           f'<button type="button" class="icb icb-q" aria-label="Semana anterior" style="width:32px">{ic("left", 16)}</button>'
           '<div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));flex-grow:1">']
    for di, (k, short, num, long) in enumerate(DAYS):
        n = len([a for a in APPTS if a[1] == di and a[7] != 'cancelled'])
        on = di == TODAY
        dots = ''.join('<span style="width:4px;height:4px;border-radius:9px;background:var(--fg2)"></span>' for _ in range(min(n, 3)))
        numst = 'background:var(--fg);color:var(--bg)' if on else ''
        cur = ' aria-current="date" aria-pressed="true"' if on else ' aria-pressed="false"'
        out.append(f'<button type="button"{cur} aria-label="{long}, {n} citas" style="border:0;background:transparent;display:flex;flex-direction:column;align-items:center;gap:4px;padding:2px 0;color:var(--fg);font:inherit;min-height:56px">'
                   f'<span style="font-size:11.5px;color:var(--mut)">{short[0] if short != "Mié" else "X"}</span>'
                   f'<span class="d" style="width:34px;height:34px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;{numst}">{num}</span>'
                   f'<span style="display:flex;gap:3px;height:4px">{dots}</span></button>')
    out.append(f'</div><button type="button" class="icb icb-q" aria-label="Semana siguiente" style="width:32px">{ic("right", 16)}</button></div>')
    return ''.join(out)


def mob_day_grid(height=560, first=8.5):
    out = [f'<div style="position:relative;height:{height}px;overflow:hidden;border-top:1px solid var(--line)">']
    top0 = first
    for hh in range(9, int(first + height / MOB_HOUR) + 1):
        y = (hh - top0) * MOB_HOUR
        out.append(f'<span style="position:absolute;left:0;width:48px;text-align:right;top:{y}px;transform:translateY(-50%);font-size:11px;color:var(--mut)">{hh}:00</span>')
        out.append(f'<div style="position:absolute;left:56px;right:0;top:{y}px;border-top:1px solid var(--line)"></div>')
    op = OPEN[TODAY]
    out.append(f'<div class="closed" style="left:56px;top:{(op[1] - top0) * MOB_HOUR}px;height:{height}px"></div>')
    lay = layout(TODAY)
    colw = 390 - 56 - 12
    for a in APPTS:
        if a[1] != TODAY or a[7] == 'cancelled':
            continue
        c, n = lay[a[0]]
        w = colw / n
        top = (a[2] - top0) * MOB_HOUR + a[3] / 60 * MOB_HOUR
        if top + a[4] < 0 and top < -20:
            continue
        hgt = max(a[4] / 60 * MOB_HOUR - 3, 26)
        st = a[7]
        cls = 'ap' + (' ap-done' if st in ('completed', 'no_show') else '')
        spark = f'<span class="aig" aria-label="Agendada por Axi">{ic("spark", 12)}</span>' if a[8] != 'user' else ''
        two = f'<span class="t2">{trange(a)}</span>' if hgt >= 40 else ''
        out.append(f'<button type="button" class="{cls}" style="left:{60 + c * w:.0f}px;width:{w - 6:.0f}px;top:{top + 1:.0f}px;height:{hgt:.0f}px" aria-label="{a[5]}, {trange(a)}">'
                   f'<span class="t1"><span class="dot" style="background:{STATUS[st][1]};width:7px;height:7px"></span><span class="nm">{a[5]}</span>{spark}</span>{two}</button>')
    ny = (NOW[0] - top0) * MOB_HOUR + NOW[1] / 60 * MOB_HOUR
    out.append(f'<div class="now" style="left:56px;top:{ny:.0f}px"></div>')
    out.append('</div>')
    return ''.join(out)


def movil_board():
    inner = (mob_tabs('day') + week_strip()
             + '<div style="padding:4px 16px 12px;display:flex;justify-content:space-between;align-items:baseline"><span class="d" style="font-size:18px;font-weight:700">Hoy, miércoles 30</span><span style="font-size:12.5px;color:var(--mut)">5 citas · 3 por confirmar</span></div>'
             + mob_day_grid(560, 8.5))
    return page('Agenda · Celular', 390, 844, mob_shell(inner))


def movil_mes_board():
    import datetime as dt
    start = dt.date(2026, 8, 31)
    counts = {dt.date(2026, 9, 2): 2, dt.date(2026, 9, 4): 1, dt.date(2026, 9, 8): 4, dt.date(2026, 9, 10): 1, dt.date(2026, 9, 15): 2,
              dt.date(2026, 9, 17): 1, dt.date(2026, 9, 22): 2, dt.date(2026, 9, 24): 1, dt.date(2026, 9, 28): 3, dt.date(2026, 9, 29): 3,
              dt.date(2026, 9, 30): 5, dt.date(2026, 10, 1): 3, dt.date(2026, 10, 2): 3, dt.date(2026, 10, 3): 2}
    cells = []
    for i in range(42):
        d = start + dt.timedelta(days=i)
        n = counts.get(d, 0)
        out = d.month != 9
        today = d == dt.date(2026, 9, 30)
        sel = d == dt.date(2026, 10, 1)
        st = 'background:var(--fg);color:var(--bg)' if today else ('box-shadow:inset 0 0 0 1.5px var(--fg)' if sel else '')
        dots = ''.join('<span style="width:4px;height:4px;border-radius:9px;background:var(--fg2)"></span>' for _ in range(min(n, 3)))
        col = 'color:var(--mut)' if out else ''
        cur = ' aria-current="date"' if today else ''
        cells.append(f'<button type="button"{cur} aria-pressed="{"true" if sel else "false"}" aria-label="{d.day}, {n} citas" style="border:0;background:transparent;display:flex;flex-direction:column;align-items:center;gap:3px;height:50px;font:inherit;color:var(--fg);padding:0">'
                     f'<span class="d" style="width:34px;height:34px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;font-size:15px;font-weight:600;{st};{col}">{d.day}</span>'
                     f'<span style="display:flex;gap:3px;height:4px">{dots}</span></button>')
    heads = ''.join(f'<span style="text-align:center;font-size:11.5px;color:var(--mut)">{x}</span>' for x in 'LMXJVSD')
    rows = ''
    for a in sorted([a for a in APPTS if a[1] == 3], key=lambda a: a[2] * 60 + a[3]):
        src = {'call': ic('phone', 13), 'chat': ic('chat', 13), 'user': ic('user', 13)}[a[8]]
        rows += (f'<button type="button" style="display:grid;grid-template-columns:52px 10px minmax(0,1fr) auto;gap:10px;align-items:center;padding:12px 16px;border:0;border-top:1px solid var(--line);background:transparent;font:inherit;color:var(--fg);text-align:left;width:100%">'
                 f'<span class="tm2" style="font-size:12.5px">{hm(a[2], a[3])}</span><span class="dot" style="background:{STATUS[a[7]][1]}"></span>'
                 f'<span style="min-width:0"><span class="ti" style="display:block">{a[5]}</span><span class="su" style="display:block">{a[6]} · {a[4]} min</span></span>'
                 f'<span style="color:var(--mut);display:inline-flex">{src}</span></button>')
    inner = (mob_tabs('month')
             + f'<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px 6px"><span class="d" style="font-size:18px;font-weight:700">Septiembre 2026</span>'
               f'<div style="display:flex;gap:6px"><button type="button" class="icb" aria-label="Mes anterior">{ic("left", 16)}</button><button type="button" class="icb" aria-label="Mes siguiente">{ic("right", 16)}</button></div></div>'
             + f'<div style="padding:0 10px"><div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));padding:4px 0 6px">{heads}</div>'
               f'<div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));row-gap:2px">{"".join(cells)}</div></div>'
             + '<div style="margin-top:8px;border-top:1px solid var(--line);flex-grow:1;overflow:hidden;background:var(--card)">'
               '<div style="display:flex;justify-content:space-between;align-items:baseline;padding:14px 16px 10px"><span style="font-size:14px;font-weight:600">Jueves 1 de octubre</span><a href="#" style="font-size:12.5px;font-weight:500;text-decoration:none">Ver el día</a></div>'
             + rows.replace('border-top:1px solid var(--line);', 'border-top:1px solid var(--line);', 1) + '</div>')
    return page('Agenda · Celular, mes', 390, 844, mob_shell(inner))


def movil_detalle_board():
    a9 = next(a for a in APPTS if a[0] == 'a9')
    inner = (mob_tabs('day') + week_strip() + mob_day_grid(560, 8.5)
             + '<div class="scrim" style="top:0"></div>'
             '<div role="dialog" aria-modal="true" aria-label="Detalle de la cita" style="position:absolute;left:0;right:0;bottom:0;z-index:21;background:var(--card);border-radius:24px 24px 0 0;box-shadow:var(--shf);display:flex;flex-direction:column;max-height:640px">'
             '<span style="width:40px;height:5px;border-radius:9px;background:var(--line2);align-self:center;margin:8px 0 4px"></span>'
             f'<div style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px 12px 20px;border-bottom:1px solid var(--line)"><div style="flex-grow:1;min-width:0"><div class="d" style="font-size:22px;font-weight:700;line-height:1.15">Camila Restrepo</div><div style="font-size:12.5px;color:var(--mut);margin-top:3px">Miércoles 30 · 11:00</div></div><button type="button" class="icb icb-q" aria-label="Cerrar">{ic("x", 18)}</button></div>'
             '<div style="padding:16px 20px;display:flex;flex-direction:column;gap:16px">'
             f'<span class="pill" style="align-self:flex-start"><span class="dot" style="background:var(--ok);width:7px;height:7px"></span>Confirmada</span>'
             '<dl class="fl" style="grid-template-columns:84px minmax(0,1fr)"><dt>Hora</dt><dd style="font-variant-numeric:tabular-nums">11:00 – 11:45 <span style="color:var(--mut)">· 45 min</span></dd><dt>Servicio</dt><dd>Asesoría de viaje</dd><dt>Notas</dt><dd style="color:var(--fg2);line-height:1.5">Quiere ir a Guatapé con su familia (4 personas) la segunda semana de noviembre.</dd></dl>'
             f'<div class="orig" style="flex-wrap:wrap"><span class="oglyph" style="color:var(--ai)">{ic("spark", 17)}</span><div style="flex:1 1 180px;min-width:0"><div style="font-size:13.5px;font-weight:600">Agendada por Axi en una llamada</div><div style="font-size:12px;color:var(--mut);margin-top:2px">Entrante, 29 sep · 4:12 p. m.</div></div>'
             f'<a class="olink" href="#" style="height:40px">{ic("phone", 14)}Ver llamada</a></div></div>'
             f'<div style="display:grid;grid-template-columns:1fr 1fr 44px;gap:8px;padding:12px 16px 20px;border-top:1px solid var(--line)"><button type="button" class="btn btn-ink" style="height:44px">{ic("check", 15)}Completar</button><button type="button" class="btn" style="height:44px">{ic("clock", 15)}Reagendar</button><button type="button" class="icb" aria-label="Más acciones" style="width:44px;height:44px">{ic("more", 16)}</button></div>'
             '</div>')
    return page('Agenda · Celular, detalle', 390, 844, mob_shell(inner))

# ------------------------------------------------------------------ 7 · Reagendar rápido
def reagendar_board():
    a9 = next(a for a in APPTS if a[0] == 'a9')
    body = (f'<div class="app lt" style="width:1440px;height:1000px">{side()}'
            '<main style="flex-grow:1;display:flex;flex-direction:column;min-width:0;min-height:0;position:relative">'
            f'{topbar()}'
            '<div style="padding:22px 32px 24px;display:flex;flex-direction:column;gap:18px;min-height:0;flex-grow:1">'
            f'{section_head()}{toolbar("28 sep – 4 oct 2026")}{week_card(False, link_slots=False)}</div>'
            '<div class="scrim"></div>'
            f'{sheet_static(a9, reagendar=True)}'
            '</main></div>')
    return page('Agenda · Reagendar', 1440, 1000, body)

# ------------------------------------------------------------------ escribir
BOARDS = [
    ('Main.dc.html', main_board('Main', False), 0, 0, 1440, 1000, '1 · La semana — tinta en hoy y en la selección, el estado en el punto; toca una cita o cambia de vista (interactivo)', True),
    ('Oscuro.dc.html', main_board('Oscuro', True), 1520, 0, 1440, 1000, '2 · La semana en oscuro (interactivo)', True),
    ('Dia.dc.html', vistas_board(), 3040, 0, 1440, 1000, '3 · Día — la columna ancha dice el servicio', False),
    ('Mes.dc.html', mes_board(), 4560, 0, 1440, 1000, '4 · Mes — hasta tres citas por día y «N más»', False),
    ('Hueco.dc.html', hueco_board(), 0, 1420, 1440, 1000, '5 · Tocar un hueco — «Nueva cita» con el día y la hora puestos; control: dentro o fuera del horario', True),
    ('Origen.dc.html', origen_board(), 1520, 1420, 1440, 1000, '6 · De dónde viene — «Ver llamada», «Ver conversación» o quién la creó', False),
    ('Reagendar.dc.html', reagendar_board(), 3040, 1420, 1440, 1000, '7 · Reagendar rápido — los horarios libres del día, sin salir del detalle', False),
    ('Estados.dc.html', estados_board(), 4560, 1420, 1440, 1000, '8 · Estados — cargando, error, sin horario y vacíos', False),
    ('Movil.dc.html', movil_board(), 0, 2840, 390, 844, '9 · Celular — Día con la tira de la semana', False),
    ('MovilMes.dc.html', movil_mes_board(), 470, 2840, 390, 844, '10 · Celular — Mes en puntos y el día elegido', False),
    ('MovilDetalle.dc.html', movil_detalle_board(), 940, 2840, 390, 844, '11 · Celular — el detalle sube desde abajo, con «Ver llamada»', False),
]

canvas = {
    'v': 3,
    'createdOnFiles': {'v': 1, 'at': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')},
    'title': 'Agenda premium · F1 El calendario',
    'launch': {'view': 'canvas'},
    'pages': [],
    'boards': {},
    'order': [],
    'notes': {
        'rowA': {'x': 0, 'y': -300, 'text': 'El calendario', 'kind': 'title1', 'maxW': 6000},
        'rowB': {'x': 0, 'y': 1120, 'text': 'Crear, el origen y reagendar', 'kind': 'title1', 'maxW': 6000},
        'rowC': {'x': 0, 'y': 2540, 'text': 'Celular', 'kind': 'title1', 'maxW': 1330},
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
