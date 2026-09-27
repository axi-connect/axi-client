import os, json
R = os.path.dirname(os.path.abspath(__file__)) + '/..'
B = os.path.dirname(os.path.abspath(__file__))
H = open(B + '/helmet.txt').read()
ROW = open(B + '/rowtpl.txt').read().replace('<button type="button" class="row" aria-label="{{r.aria}}">', '<button type="button" class="row" style="{{r.sel}}" aria-label="{{r.aria}}">')
JS = open(B + '/rows.js').read()

CSS = '''
.sk{background:var(--track);border-radius:8px;display:block}
.rail{width:64px;flex-shrink:0;box-sizing:border-box;padding:14px 0;display:flex;flex-direction:column;align-items:center;gap:6px;border-right:1px solid var(--line);background:var(--side)}
.rb{position:relative;width:40px;height:40px;border-radius:12px;border:0;background:transparent;color:var(--fg2);display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
.rb-on{background:var(--chip);color:var(--fg)}
.rb .c{position:absolute;top:2px;right:0;min-width:16px;height:16px;padding:0 4px;box-sizing:border-box;border-radius:999px;background:var(--fg);color:var(--bg);font:600 10px Poppins,sans-serif;display:inline-flex;align-items:center;justify-content:center}
.rb .s{position:absolute;right:5px;bottom:5px;width:8px;height:8px;border-radius:9px;box-shadow:0 0 0 2px var(--side)}
.conv{flex-grow:1;min-width:0;display:flex;flex-direction:column;background:var(--bg);position:relative}
.chead{height:64px;flex-shrink:0;display:flex;align-items:center;gap:10px;padding:0 12px 0 18px;border-bottom:1px solid var(--line);background:var(--card)}
.thread{flex-grow:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:4px 22px 18px}
.thread::-webkit-scrollbar{width:6px}.thread::-webkit-scrollbar-thumb{border-radius:9px;background:radial-gradient(circle at 50% 30%,#F08A8C,#E65759)}
.msg{display:flex;margin-top:3px}
.msg.in{justify-content:flex-start}.msg.out{justify-content:flex-end}
.msg.gap{margin-top:12px}
.b{max-width:72%;padding:8px 12px 6px;border-radius:18px;font-size:13.5px;line-height:1.45;box-sizing:border-box}
.in .b{background:var(--card);border:1px solid var(--line);color:var(--fg)}
.in.last .b{border-bottom-left-radius:6px}
.out.last .b{border-bottom-right-radius:6px}
.bub-coral .out .b{background:var(--brand);color:#fff}
.bub-tinta .out .b{background:var(--fg);color:var(--bg)}
.bub-neutra .out .b{background:#E4E4EA;color:var(--fg)}
.dk.bub-neutra .out .b,.dk .bub-neutra .out .b{background:rgba(255,255,255,.13)}
.mt{display:flex;justify-content:flex-end;align-items:center;gap:4px;font-size:10.5px;margin-top:2px;white-space:nowrap}
.mt>*{opacity:.72}
.who{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--mut);margin:14px 6px 3px}
.who.r{justify-content:flex-end}
.ev{display:flex;justify-content:center;margin:16px 0 10px}
.evp{display:inline-flex;align-items:center;gap:7px;font-size:12px;color:var(--mut);max-width:78%;text-align:center;line-height:1.4}
.day{position:sticky;top:0;display:flex;justify-content:center;padding:10px 0 4px;z-index:2}
.dayp{background:var(--card);border:1px solid var(--line);border-radius:999px;padding:3px 12px;font-size:11.5px;font-weight:500;box-shadow:var(--sh)}
.comp{flex-shrink:0;padding:10px 16px 14px;border-top:1px solid var(--line);background:var(--card)}
.cbox{display:flex;align-items:flex-end;gap:4px;border:1px solid var(--line2);border-radius:20px;padding:5px 5px 5px 6px;background:var(--card)}
.cin{flex-grow:1;min-height:36px;display:flex;align-items:center;font-size:13.5px;color:var(--mut);padding:0 6px}
.send{width:36px;height:36px;border-radius:999px;border:0;background:var(--brand);color:#fff;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0}
.lock{display:flex;align-items:center;gap:14px;padding:10px 10px 10px 16px;border-radius:18px;background:var(--chip);font-size:13px;color:var(--fg2)}
.ctx{width:52px;flex-shrink:0;border-left:1px solid var(--line);display:flex;flex-direction:column;align-items:center;gap:4px;padding:12px 0;background:var(--card)}
.hpill{display:inline-flex;align-items:center;gap:6px;height:26px;padding:0 10px;border-radius:999px;background:var(--chip);font-size:12px;font-weight:500;white-space:nowrap;flex-shrink:0}
.retry{display:inline-flex;align-items:center;gap:5px;height:26px;padding:0 10px;border-radius:999px;border:1px solid rgba(220,38,38,.35);background:var(--card);color:var(--bad);font:500 11.5px Poppins,sans-serif;cursor:pointer}
.isl-ai{color:#0B0B0E;--mut:#5F5F68;--fg2:#3A3A40;--chip:rgba(11,11,14,.06);background:radial-gradient(circle 18rem at 92% 0%,rgba(124,58,237,.20),transparent 70%),radial-gradient(circle 14rem at 8% 120%,rgba(230,87,89,.14),transparent 70%),linear-gradient(160deg,rgba(255,255,255,.88),rgba(247,244,254,.70));-webkit-backdrop-filter:blur(20px) saturate(180%);backdrop-filter:blur(20px) saturate(180%);box-shadow:inset 0 2px 2px rgba(11,11,14,.05),inset 0 -2px 2px rgba(255,255,255,.5),0 4px 2px -2px rgba(11,11,14,.12),0 24px 60px -34px rgba(124,58,237,.45)}
.isl-ai-dark{color:#EDEDED;--mut:#A1A1AA;--fg2:#D4D4D8;--chip:rgba(255,255,255,.08);background:radial-gradient(circle 18rem at 92% 0%,rgba(167,139,250,.28),transparent 70%),linear-gradient(160deg,rgba(38,36,46,.94),rgba(28,26,36,.95));box-shadow:inset 0 2px 2px rgba(255,255,255,.10),0 24px 60px -30px rgba(124,58,237,.6)}
.isl-ai::before,.isl-ai-dark::before{content:"";position:absolute;inset:0;z-index:1;padding:1.5px;border-radius:inherit;pointer-events:none;-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask:linear-gradient(#000 0 0) content-box exclude,linear-gradient(#000 0 0)}
.isl-ai::before{background:conic-gradient(from -75deg at 50% 50%,rgba(11,11,14,.30) 0%,transparent 6% 40%,rgba(11,11,14,.30) 50%,transparent 56% 94%,rgba(11,11,14,.30) 100%),linear-gradient(rgba(255,255,255,.85),rgba(255,255,255,.85))}
.isl-ai-dark::before{background:conic-gradient(from -75deg at 50% 50%,rgba(255,255,255,.7) 0%,transparent 6% 40%,rgba(255,255,255,.7) 50%,transparent 56% 94%,rgba(255,255,255,.7) 100%),linear-gradient(rgba(255,255,255,.12),rgba(255,255,255,.12))}
.isl-ai-dark .btn-ink{background:#EDEDED;color:#0B0B0E}.isl-ai-dark .btn-glass{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.14)}
.claim{display:inline-flex;align-items:center;gap:10px;border-radius:999px;overflow:visible;padding:4px 4px 4px 12px;flex-shrink:0;animation:claimIn .7s cubic-bezier(.2,.9,.3,1.25) both}
.claim::after{content:"";position:absolute;inset:-3px;border-radius:inherit;pointer-events:none;box-shadow:0 0 0 0 rgba(124,58,237,.45);animation:claimGlow 1.8s ease-out .55s 2}
.claim-t{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:500;white-space:nowrap}
@keyframes claimIn{0%{opacity:0;transform:translateY(-8px) scale(.9)}60%{opacity:1;transform:translateY(0) scale(1.04)}100%{opacity:1;transform:none}}
@keyframes claimGlow{0%{box-shadow:0 0 0 0 rgba(124,58,237,.45)}100%{box-shadow:0 0 0 12px rgba(124,58,237,0)}}
@media (prefers-reduced-motion: reduce){.claim,.claim::after{animation:none}}
.fold{display:flex;align-items:center;gap:8px;padding:8px 14px;margin:10px 18px 0;border-radius:14px;background:var(--card);border:1px solid var(--line);font-size:12.5px;color:var(--fg2)}
.typing{display:inline-flex;gap:4px;align-items:center;padding:10px 14px;border-radius:18px;border-bottom-left-radius:6px;background:var(--card);border:1px solid var(--line)}
.typing span{width:6px;height:6px;border-radius:9px;background:var(--mut);opacity:.6}
'''
H = H.replace('</style>', CSS + '</style>')

I = {
 'q': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="13" r="8"></circle><path d="M12 9v4l2.5 2.5M9 2h6"></path></svg>',
 'm': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="8" r="4"></circle><path d="M4 21a8 8 0 0 1 16 0"></path></svg>',
 'bot': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ai)" stroke-width="1.8" aria-hidden="true"><rect x="4" y="8" width="16" height="12" rx="3"></rect><path d="M12 4v4M9 13h0M15 13h0"></path></svg>',
 'o': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 13h5l2 3h4l2-3h5"></path><path d="M5.5 5h13L21 13v6H3v-6z"></path></svg>',
 'c': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m2 13 4 4 8-9M10 16l1 1 8-9"></path></svg>',
 'wa': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 21l1.6-4.6A8.5 8.5 0 1 1 8 19.6z"></path></svg>',
 'ig': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"></rect><circle cx="12" cy="12" r="4"></circle></svg>',
 'ms': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 3C6.9 3 3 6.7 3 11.4c0 2.6 1.2 4.9 3.2 6.4V21l3-1.6c.9.2 1.8.4 2.8.4 5.1 0 9-3.7 9-8.4S17.1 3 12 3z"></path></svg>',
 'spark': '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--ai)" stroke-width="2" aria-hidden="true"><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"></path><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"></path></svg>',
 'hand': '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><path d="M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v6M10 10.5V6a2 2 0 0 0-4 0v8"></path><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-6-2.4l-3.6-3.6a2 2 0 0 1 2.8-2.8L7 15"></path></svg>',
 'check': '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>',
 'dots': '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="1.6"></circle><circle cx="12" cy="12" r="1.6"></circle><circle cx="12" cy="19" r="1.6"></circle></svg>',
 'back': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><path d="M15 18l-6-6 6-6"></path></svg>',
 'user': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="8" r="4"></circle><path d="M4 21a8 8 0 0 1 16 0"></path></svg>',
 'clip': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m21 11-8.5 8.5a5 5 0 0 1-7-7L14 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L15 7"></path></svg>',
 'hist': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"></path><path d="M3 3v5h5M12 7v5l3 2"></path></svg>',
 'phone': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"></path></svg>',
 'zap': '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M13 2 3 14h9l-1 8 10-12h-9z"></path></svg>',
 'mic': '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3"></rect><path d="M5 11a7 7 0 0 0 14 0M12 18v3"></path></svg>',
 'sendi': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6"></path></svg>',
 'ck1': '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>',
 'ck2': '<svg width="15" height="13" viewBox="0 0 28 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="m2 13 4 4 8-9M12 16l1 1 8-9"></path></svg>',
 'mobile': '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="7" y="2" width="10" height="20" rx="2"></rect><path d="M11 18h2"></path></svg>',
 'alert': '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--bad)" stroke-width="2.2" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 8v5M12 16h0"></path></svg>',
 'retry': '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5"></path></svg>',
 'plus': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg>',
 'panel': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"></rect><path d="M9 4v16M15 10l-2 2 2 2"></path></svg>',
 'panelo': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"></rect><path d="M9 4v16M13 10l2 2-2 2"></path></svg>',
 'chev': '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg>',
 'warn': '<span class="dot" style="background:var(--warn)"></span>',
}

NAV_SRC = open(R + '/../inboxf1/project/Main.dc.html').read()
a = NAV_SRC.index('<aside class="side"'); b = NAV_SRC.index('</aside>') + len('</aside>')
NAV = NAV_SRC[a:b].replace('{{unreadTotal}}', '7')


def expanded_col(active='queued'):
    def v(k, icon, label, n):
        on = ' vw-on' if k == active else ''
        cnt = f'<span class="n">{n}</span>' if n else ''
        return f'<button type="button" class="vw{on}" aria-pressed="{"true" if on else "false"}">{I[icon]}<span>{label}</span>{cnt}</button>'
    def ch(icon, name, color, sub=''):
        s = f'<span style="font-size:11.5px;color:var(--mut)">{sub}</span>' if sub else ''
        return f'<a class="chn" href="#">{I[icon]}<span style="flex:1;min-width:0;display:flex;flex-direction:column"><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{name}</span>{s}</span><span class="dot" style="background:{color}"></span></a>'
    return f'''<nav class="cols" aria-label="Vistas y canales" style="width:232px">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:0 0 6px 10px"><span class="kick">Bandeja</span><button type="button" class="icb" aria-label="Plegar el panel">{I['panel']}</button></div>
      {v('queued','q','En cola','3')}{v('mine','m','Contigo','5')}{v('ai','bot','Axi atiende','12')}{v('all_open','o','Todas abiertas','24')}{v('closed','c','Cerradas','')}
      <div style="height:14px"></div><span class="kick" style="padding:4px 10px 6px">Canales · 4</span>
      {ch('wa','WhatsApp Ventas','var(--ok)')}{ch('ig','Instagram @juanitoxpeditions','var(--ok)')}{ch('wa','WhatsApp Soporte','var(--mut)','Pendiente de configurar')}{ch('ms','Messenger','var(--mut)','Desconectado')}
    </nav>'''


def rail(active='queued'):
    def rb(icon, label, key=None, count=None, status=None):
        on = ' rb-on' if key == active else ''
        c = f'<span class="c">{count}</span>' if count else ''
        s = f'<span class="s" style="background:{status}"></span>' if status else ''
        return f'<button type="button" class="rb{on}" aria-label="{label}" title="{label}">{I[icon]}{c}{s}</button>'
    return f'''<nav class="rail" aria-label="Vistas y canales">
      <button type="button" class="rb" aria-label="Desplegar el panel">{I['panelo']}</button>
      {rb('q','En cola, 3','queued','3')}{rb('m','Contigo, 5','mine','5')}{rb('bot','Axi atiende, 12','ai')}{rb('o','Todas abiertas, 24','all_open')}{rb('c','Cerradas','closed')}
      <span style="width:28px;height:1px;background:var(--line2);margin:6px 0"></span>
      {rb('wa','WhatsApp Ventas · conectado',status='var(--ok)')}{rb('ig','Instagram · conectado',status='var(--ok)')}{rb('wa','WhatsApp Soporte · pendiente',status='var(--mut)')}{rb('ms','Messenger · desconectado',status='var(--mut)')}
    </nav>'''


def list_col(title, sub, listname, dot=True):
    d = '<span class="dot" style="background:var(--warn)"></span>' if dot else ''
    return f'''<section class="list" style="width:320px" aria-label="Conversaciones">
      <div style="padding:18px 16px 12px;display:flex;flex-direction:column;gap:12px;border-bottom:1px solid var(--line)">
        <div style="min-width:0"><h1 class="d" style="margin:0;font-size:26px;font-weight:700;letter-spacing:-.02em;line-height:1.1">{title}</h1>
        <p style="margin:4px 0 0;font-size:12.5px;color:var(--fg2);display:flex;align-items:center;gap:7px">{d}<span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{sub}</span></p></div>
        <div class="srch"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>Buscar por nombre o teléfono</div>
      </div>
      <div class="scr" style="flex-grow:1;min-height:0;padding:6px 6px 10px">{ROW.replace('{{rows}}', listname)}</div>
    </section>'''


def ctx_rail():
    return f'''<aside class="ctx" aria-label="Contexto de la conversación">
      <button type="button" class="icb" aria-label="Contacto">{I['user']}</button><button type="button" class="icb" aria-label="Adjuntos">{I['clip']}</button><button type="button" class="icb" aria-label="Historial">{I['hist']}</button><button type="button" class="icb" aria-label="Llamadas">{I['phone']}</button>
    </aside>'''


def head(name, ini, sub, pill, actions, mobile=False):
    back = f'<button type="button" class="icb" aria-label="Volver a la lista" style="width:40px;height:40px;margin-left:-8px">{I["back"]}</button>' if mobile else ''
    return f'''<header class="chead"{' style="padding:0 8px 0 12px;gap:6px"' if mobile else ''}>
      {back}
      <a href="#" style="display:flex;align-items:center;gap:10px;min-width:0;text-decoration:none;border-radius:12px;padding:4px 6px 4px 0">
        <span class="av" style="width:38px;height:38px">{ini}</span>
        <span style="display:flex;flex-direction:column;min-width:0"><span style="font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{name}</span><span style="font-size:12px;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{sub}</span></span>
      </a>
      <span style="flex-grow:1"></span>
      {pill}
      {actions}
    </header>'''


def pill(kind, text):
    lead = {'queued': '<span class="dot" style="background:var(--warn)"></span>', 'mine': '<span class="dot" style="background:var(--fg)"></span>', 'ai': I['spark'], 'done': '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--mut)" stroke-width="2" aria-hidden="true"><path d="m2 13 4 4 8-9M10 16l1 1 8-9"></path></svg>'}[kind]
    return f'<span class="hpill">{lead}{text}</span>'


def owner_btn(ini=None):
    inner = f'<span class="av" style="width:26px;height:26px;font-size:10.5px">{ini}</span>' if ini else f'<span class="av" style="width:26px;height:26px;background:transparent;border:1.5px dashed var(--line2);color:var(--mut)">{I["user"]}</span>'
    return f'<button type="button" class="btn btn-g" aria-label="Responsable: {"Owner Demo" if ini else "sin asignar"}" style="height:36px;padding:0 6px;gap:4px">{inner}{I["chev"]}</button>'


def more():
    return f'<button type="button" class="icb" aria-label="Más acciones">{I["dots"]}</button>'


def ev(icon_html, text, time):
    return f'<div class="ev"><span class="evp">{icon_html}<span>{text} · <span style="font-variant-numeric:tabular-nums">{time}</span></span></span></div>'


def day(label):
    return f'<div class="day"><span class="dayp">{label}</span></div>'


def who(text, right=False, ai=False):
    ic = I['spark'] if ai else ''
    return f'<div class="who{" r" if right else ""}">{ic}<span>{text}</span></div>'


def msg(direction, text, time='', status=None, last=True, gap=False, extra='', fail=False):
    cls = f'msg {direction}' + (' last' if last else '') + (' gap' if gap else '')
    st = ''
    if direction == 'out' and last:
        st = {'read': f'<span title="Leído" aria-label="Leído">{I["ck2"]}</span>', 'delivered': f'<span title="Entregado" aria-label="Entregado">{I["ck2"]}</span>', 'sent': f'<span title="Enviado" aria-label="Enviado">{I["ck1"]}</span>', None: ''}[status] if not fail else ''
    meta = f'<div class="mt">{extra}<span style="font-variant-numeric:tabular-nums">{time}</span>{st}</div>' if last and time else ''
    body = f'<div class="b" style="{"box-shadow:0 0 0 1.5px var(--bad) inset;opacity:.85" if fail else ""}"><div style="white-space:pre-wrap;overflow-wrap:anywhere">{text}</div>{meta}</div>'
    out = f'<div class="{cls}">{body}</div>'
    if fail:
        out += f'<div style="display:flex;justify-content:flex-end;align-items:center;gap:8px;margin-top:5px;font-size:11.5px;color:var(--bad)">{I["alert"]}<span>No se envió</span><button type="button" class="retry">{I["retry"]}Reintentar</button></div>'
    return out


def composer(lock_html=None, placeholder='Escribe un mensaje…'):
    if lock_html:
        return f'<div class="comp">{lock_html}</div>'
    return f'''<div class="comp"><div class="cbox">
      <button type="button" class="icb" aria-label="Adjuntar archivo">{I['clip']}</button>
      <button type="button" class="icb" aria-label="Acciones rápidas">{I['zap']}</button>
      <div class="cin">{placeholder}</div>
      <button type="button" class="icb" aria-label="Grabar nota de voz">{I['mic']}</button>
      <button type="button" class="send" aria-label="Enviar mensaje">{I['sendi']}</button>
    </div></div>'''


def page(title, w, h, body, script, props='"dark":{"editor":"boolean","default":false}'):
    return f'''<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>{title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
{H}
{body}
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{{props},"$preview":{{"width":{w},"height":{h}}}}}'>
class Component extends DCLogic {{
{script}
}}
</script>
</body>
</html>
'''

SEL = "background:var(--chip);box-shadow:inset 0 0 0 1.5px var(--fg)"
EXTRA_PEOPLE = '''
    PEOPLE.laura.kind = 'mine';
'''

# ------------------------------ hilo de Mariana (en cola) ------------------------------
MARIANA_THREAD = (
    day('Hoy')
    + msg('in', 'Hola, buenas. Quiero saber del reembolso del viaje a Cartagena que cancelé.', '9:14 a. m.', gap=True)
    + who('Axi', right=True, ai=True)
    + msg('out', '¡Hola, Mariana! Claro, te ayudo. ¿Me compartes el número de la reserva?', '9:14 a. m.', 'read')
    + msg('in', 'Es la AX-20931', '9:15 a. m.', gap=True)
    + who('Axi', right=True, ai=True)
    + msg('out', 'Gracias. Veo la reserva AX-20931: Cartagena del 3 al 7 de octubre, cancelada el 22 de septiembre.', last=False)
    + msg('out', 'Los reembolsos los aprueba una persona del equipo. ¿Quieres que te comunique?', '9:15 a. m.', 'read')
    + msg('in', 'Hola, ¿me pueden pasar con una persona? Es por el reembolso del viaje a Cartagena', '9:28 a. m.', gap=True)
    + ev(I['spark'], 'Axi pasó la conversación al equipo: el cliente pidió hablar con una persona', '9:28 a. m.')
    + ev(I['warn'], 'Pasó 5 min en cola y la prioridad subió a Alta', '9:33 a. m.')
)


def mariana_conv(interactive=True, mobile=False, narrow_island=False):
    island_q = f'''<article class="isl {{{{islCls}}}}" style="margin:12px 18px 0;padding:16px 18px;display:flex;{"flex-direction:column;align-items:stretch" if mobile else "align-items:center"};gap:14px;flex-shrink:0" aria-label="Por qué está aquí">
        <div style="display:flex;flex-direction:column;gap:5px;min-width:0;flex:1">
          <span class="kick" style="display:inline-flex;align-items:center;gap:6px">{I['spark']}Axi te la pasó · hace 14 min</span>
          <span class="d" style="font-size:{'19' if mobile else '21'}px;font-weight:700;line-height:1.2;letter-spacing:-.01em">El cliente pidió hablar con una persona.</span>
          <span style="font-size:12.5px;color:var(--fg2);line-height:1.45">Espera desde las 9:28 a. m. · la prioridad subió a Alta a los 5 min.</span>
        </div>
        <div style="display:flex;gap:8px;flex-shrink:0;{"" if mobile else "flex-direction:column"}">
          <button type="button" class="btn btn-ink" onClick="{{{{claim}}}}" style="{"flex:1;height:44px" if mobile else ""}">{I['hand']}Atender</button>
          <button type="button" class="btn btn-glass" style="{"flex:1;height:44px" if mobile else ""}">Devolver a Axi</button>
        </div>
      </article>'''
    fold = f'''<div class="fold">{I['spark']}<span style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Axi te la pasó: el cliente pidió hablar con una persona.</span><span style="font-size:11.5px;color:var(--mut);white-space:nowrap">9:28 a. m.</span></div>'''
    claim_isl = f'''<div class="isl {{{{islCls}}}} claim" role="group" aria-label="Axi te la pasó: el cliente pidió hablar con una persona" title="El cliente pidió hablar con una persona · espera desde las 9:28 a. m.">
        <span class="claim-t">{I['spark']}<span>{'14 min' if mobile else 'Axi te la pasó · 14 min'}</span></span>
        <button type="button" class="btn btn-ink" onClick="{{{{claim}}}}" style="height:{'36' if mobile else '32'}px;padding:0 14px">{I['hand']}Atender</button>
      </div>'''
    pill_q = ''
    pill_m = pill('mine', 'Contigo')
    act_q = owner_btn() + claim_isl + more()
    act_m = owner_btn('OD') + f'<button type="button" class="btn btn-ink" style="height:36px">{I["check"]}Cerrar</button>' + more()
    if mobile:
        act_q = claim_isl + more()
        act_m = f'<button type="button" class="btn btn-ink" style="height:40px;padding:0 14px">{I["check"]}Cerrar</button>' + more()
        pill_q = ''
        pill_m = ''
    sub_q = 'WhatsApp Ventas · esperando hace 14 min' if not mobile else 'En cola · 14 min'
    sub_m = 'WhatsApp Ventas · +57 300 412 7788' if not mobile else 'Contigo · WhatsApp'
    lock_q = f'''<div class="lock"><span style="flex:1;min-width:0">Atiéndela para responder. Axi ya no le escribe.</span><button type="button" class="btn btn-ink" onClick="{{{{claim}}}}" style="height:36px">Atender</button></div>'''
    return f'''<section class="conv" aria-label="Conversación con Mariana Restrepo Villegas">
      <sc-if value="{{{{queued}}}}" hint-placeholder-val="{{{{ true }}}}">{head('Mariana Restrepo Villegas','MR',sub_q,pill_q,act_q,mobile)}</sc-if>
      <sc-if value="{{{{mine}}}}" hint-placeholder-val="{{{{ false }}}}">{head('Mariana Restrepo Villegas','MR',sub_m,pill_m,act_m,mobile)}</sc-if>
      <div class="thread" aria-live="polite">
        {MARIANA_THREAD}
        <sc-if value="{{{{mine}}}}" hint-placeholder-val="{{{{ false }}}}">{ev('<span class="dot" style="background:var(--fg)"></span>','Atendiste la conversación','9:43 a. m.')}</sc-if>
      </div>
      <sc-if value="{{{{queued}}}}" hint-placeholder-val="{{{{ true }}}}">{composer(lock_q)}</sc-if>
      <sc-if value="{{{{mine}}}}" hint-placeholder-val="{{{{ false }}}}">{composer(None, 'Escribe a Mariana…')}</sc-if>
    </section>'''


def desktop(body_cols, bub_hole='{{bubCls}}'):
    return f'''<div class="app {{{{themeCls}}}} {bub_hole}">
  {NAV}
  <main style="flex-grow:1;display:flex;flex-direction:column;min-width:0;min-height:0">
    <header style="height:52px;display:flex;align-items:center;gap:12px;padding:0 20px 0 24px;flex-shrink:0;border-bottom:1px solid var(--line)"><span style="font-size:13px;color:var(--mut)">Workspace</span><span style="font-size:13px;color:var(--mut)">/</span><span style="font-size:13px;font-weight:500">Inbox</span></header>
    <div style="display:flex;flex-grow:1;min-height:0">{body_cols}</div>
  </main>
</div>'''


# ------------------------------ 1 · Main ------------------------------
main_body = desktop(
    f'''<sc-if value="{{{{colExp}}}}" hint-placeholder-val="{{{{ true }}}}">{expanded_col('queued')}</sc-if><sc-if value="{{{{colRail}}}}" hint-placeholder-val="{{{{ false }}}}">{rail('queued')}</sc-if>'''
    + list_col('En cola', '{{listSub}}', '{{rows}}') + mariana_conv() + ctx_rail())
main_js = '''  constructor(props) { super(props); this.state = { claimed: false }; }
  renderVals() {
    const dark = this.props.dark === true;
''' + JS + '''
    const claimed = this.state.claimed;
    const sel = (k, active) => Object.assign(mkRow(k, false, false), { sel: active ? "''' + SEL + '''" : '' });
    if (claimed) PEOPLE.mariana = Object.assign({}, PEOPLE.mariana, { kind: 'mine', unread: 0 });
    const rows = claimed ? [sel('hotel', false), sel('julian', false)] : [sel('hotel', false), sel('julian', false), sel('mariana', true)];
    const bub = this.props.burbuja ?? 'tinta';
    return {
      themeCls: dark ? 'dk' : 'lt', islCls: dark ? 'isl-ai-dark' : 'isl-ai', bubCls: 'bub-' + bub,
      colExp: this.props.columna !== 'plegada', colRail: this.props.columna === 'plegada',
      rows, listSub: claimed ? '2 esperan · la más antigua hace 8 min' : '3 esperan · la más antigua hace 14 min',
      queued: !claimed, mine: claimed,
      claim: () => this.setState({ claimed: true })
    };
  }'''
PROPS_MAIN = '"dark":{"editor":"boolean","default":false},"burbuja":{"editor":"enum","options":["tinta","coral","neutra"],"default":"tinta"},"columna":{"editor":"enum","options":["desplegada","plegada"],"default":"desplegada"}'
open(R + '/project/Main.dc.html', 'w').write(page('Inbox · En cola', 1440, 1000, main_body, main_js, PROPS_MAIN))
open(R + '/project/Oscuro.dc.html', 'w').write(page('Inbox · En cola · oscuro', 1440, 1000, main_body, main_js.replace("const dark = this.props.dark === true;", "const dark = this.props.dark !== false;"), PROPS_MAIN.replace('"dark":{"editor":"boolean","default":false}', '"dark":{"editor":"boolean","default":true}')).replace('background:#F5F5F7}', 'background:#0A0A0A}', 1))

# ------------------------------ 2 · Contigo ------------------------------
laura_thread = (
    day('Ayer')
    + msg('in', 'Hola, quiero cotizar el paquete a Santa Marta para dos personas en noviembre.', '4:12 p. m.', gap=True)
    + who('Axi', right=True, ai=True)
    + msg('out', '¡Hola, Laura! Con gusto. ¿Qué fechas tienes en mente?', '4:12 p. m.', 'read')
    + msg('in', 'Del 14 al 18, con traslados desde el aeropuerto si se puede', '4:18 p. m.', gap=True)
    + ev(I['spark'], 'Axi pasó la conversación al equipo: decidió que esta la atienda una persona', '4:18 p. m.')
    + ev('<span class="dot" style="background:var(--fg)"></span>', 'Atendiste la conversación', '4:31 p. m.')
    + day('Hoy')
    + who('Tú', right=True)
    + msg('out', 'Buenos días, Laura. Te preparé la cotización con traslados incluidos.', last=False)
    + msg('out', 'Total para dos personas: $ 4.380.000. El link de pago vence mañana a las 6:00 p. m.', '9:02 a. m.', 'read')
    + msg('in', 'Perfecto, quedo atenta al link de pago', '9:40 a. m.', gap=True)
    + who('Tú · desde el celular del negocio', right=True)
    + msg('out', 'Te lo envío ya mismo', '9:41 a. m.', 'delivered', extra=f'<span style="display:inline-flex;align-items:center;gap:3px">{I["mobile"]}Celular</span>')
    + who('Tú', right=True)
    + msg('out', 'https://pagos.juanitoxpeditions.co/AX-3391', '9:41 a. m.', fail=True)
    + '<div class="msg in last gap"><span class="typing" aria-label="Laura está escribiendo"><span></span><span></span><span></span></span></div>'
)
contigo_conv = f'''<section class="conv" aria-label="Conversación con Laura Gómez">
  {head('Laura Gómez','LG','WhatsApp Ventas · +57 301 555 0142',pill('mine','Contigo'),owner_btn('OD') + f'<button type="button" class="btn btn-ink" style="height:36px">{I["check"]}Cerrar</button>' + more())}
  <div class="thread">{laura_thread}</div>
  {composer(None, 'Escribe a Laura…')}
</section>'''
contigo_body = desktop(rail('mine') + list_col('Contigo', '5 contigo', '{{rows}}', dot=False) + contigo_conv + ctx_rail(), 'bub-tinta')
contigo_js = '''  renderVals() {
    const dark = this.props.dark === true;
''' + JS + '''
    const sel = (k, active) => Object.assign(mkRow(k, false, false), { sel: active ? "''' + SEL + '''" : '' });
    PEOPLE.laura.prev = 'Perfecto, quedo atenta al link de pago';
    return { themeCls: dark ? 'dk' : 'lt', rows: [sel('laura', true), sel('andres', false)] };
  }'''
open(R + '/project/Contigo.dc.html', 'w').write(page('Inbox · Contigo', 1440, 1000, contigo_body, contigo_js))

# ------------------------------ 3 · Axi atiende ------------------------------
valen_thread = (
    day('Hoy')
    + msg('in', 'Hola, ¿tienen planes a San Andrés en diciembre?', '9:31 a. m.', gap=True)
    + who('Axi', right=True, ai=True)
    + msg('out', '¡Hola, Valentina! Sí, tenemos tres planes para diciembre con vuelo y hotel. ¿Para cuántas personas y qué fechas?', '9:31 a. m.', 'read')
    + msg('in', 'Sí, somos dos adultos y un niño de 6 años', '9:39 a. m.', gap=True)
    + who('Axi', right=True, ai=True)
    + msg('out', 'Perfecto. Para dos adultos y un niño, del 20 al 27 de diciembre, el plan Todo Incluido Sunrise queda en $ 7.940.000.', last=False)
    + msg('out', '¿Quieres que te envíe el detalle y las fotos del hotel?', '9:39 a. m.', 'delivered')
)
lock_ai = f'''<div class="lock">{I['spark']}<span style="flex:1;min-width:0">Axi está atendiendo. Si intervienes, Axi se pausa en esta conversación hasta que se la devuelvas.</span><button type="button" class="btn btn-ink" style="height:36px">{I['hand']}Intervenir</button></div>'''
axi_conv = f'''<section class="conv" aria-label="Conversación con Valentina Herrera">
  {head('Valentina Herrera','VH','WhatsApp Ventas · +57 315 220 9031',pill('ai','Axi atiende'),owner_btn() + f'<button type="button" class="btn btn-ink" style="height:36px">{I["hand"]}Intervenir</button>' + more())}
  <div class="thread">{valen_thread}</div>
  {composer(lock_ai)}
</section>'''
axi_body = desktop(expanded_col('ai') + list_col('Axi atiende', '12 con Axi · puedes intervenir en cualquiera', '{{rows}}', dot=False) + axi_conv + ctx_rail(), 'bub-tinta')
axi_js = '''  renderVals() {
    const dark = this.props.dark === true;
''' + JS + '''
    const sel = (k, active) => Object.assign(mkRow(k, false, false), { sel: active ? "''' + SEL + '''" : '' });
    return { themeCls: dark ? 'dk' : 'lt', rows: [sel('valen', true), sel('pedro', false), sel('dani', false)] };
  }'''
open(R + '/project/AxiAtiende.dc.html', 'w').write(page('Inbox · Axi atiende', 1440, 1000, axi_body, axi_js))

# ------------------------------ 4 · Burbuja (D1) ------------------------------
def snippet():
    return (msg('in', 'Hola, ¿me pueden pasar con una persona?', '9:28 a. m.', gap=True)
            + who('Axi', right=True, ai=True)
            + msg('out', 'Claro, Mariana. Te comunico con el equipo.', '9:28 a. m.', 'read')
            + who('Tú', right=True)
            + msg('out', 'Hola, Mariana. Ya reviso tu reembolso.', last=False)
            + msg('out', 'Te confirmo en 10 minutos.', '9:43 a. m.', 'delivered')
            + f'<div class="comp" style="margin:14px -22px -18px;border-top:1px solid var(--line)"><div class="cbox"><div class="cin">Escribe a Mariana…</div><button type="button" class="send" aria-label="Enviar mensaje">{I["sendi"]}</button></div></div>')
def cell(theme, bub, label, note):
    return f'''<div style="display:flex;flex-direction:column;gap:8px;min-width:0"><span class="lbl" style="color:#6B6B73">{label}</span>
      <div class="{theme} bub-{bub}" style="border-radius:24px;overflow:hidden;border:1px solid var(--line);background:var(--bg);color:var(--fg)"><div class="thread" style="overflow:visible;padding:4px 22px 18px">{snippet()}</div></div>
      <span style="font-size:12px;color:#6B6B73;line-height:1.45">{note}</span></div>'''
bub_body = f'''<div style="width:1440px;height:1000px;box-sizing:border-box;padding:40px 48px;background:#F5F5F7;color:#0B0B0E;font-family:Poppins,system-ui,sans-serif;display:flex;flex-direction:column;gap:22px">
  <div><span class="kick" style="color:#6B6B73">D1 · La burbuja que sale</span><h1 class="d" style="margin:6px 0 0;font-size:30px;font-weight:700;letter-spacing:-.02em">Escribir o actuar</h1></div>
  <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px">
    {cell('lt','tinta','Tinta · recomendada','El coral queda solo para Enviar, Atender e Intervenir.')}
    {cell('lt','coral','Coral · como hoy','La burbuja y el botón Enviar compiten por el mismo color.')}
    {cell('lt','neutra','Neutra','La más tranquila; entrante y saliente se parecen más.')}
  </div>
  <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px">
    {cell('dk','tinta','Tinta · oscuro','')}
    {cell('dk','coral','Coral · oscuro','')}
    {cell('dk','neutra','Neutra · oscuro','')}
  </div>
</div>'''
open(R + '/project/Burbuja.dc.html', 'w').write(page('Inbox · La burbuja', 1440, 1000, bub_body, '  renderVals() { return {}; }', '"dark":{"editor":"boolean","default":false}').replace(',"$preview"', ',"$preview"'))

# ------------------------------ 5 · Cerrada ------------------------------
jp_thread = (
    day('Miércoles 24 de septiembre')
    + msg('in', '¿Ya aprobaron el reembolso del abono?', '11:20 a. m.', gap=True)
    + who('Tú', right=True)
    + msg('out', 'Sí, Juan Pablo: quedó aprobado. Te lo confirmará Axi con la fecha.', '2:48 p. m.', 'read')
    + ev('<span class="dot" style="background:var(--fg)"></span>', 'Devolviste la conversación a Axi', '2:49 p. m.')
    + f'<div style="display:flex;justify-content:center;margin:-2px 0 10px"><div style="max-width:70%;padding:10px 14px;border-radius:16px;background:var(--card);border:1px dashed var(--line2);font-size:12.5px;line-height:1.45;color:var(--fg2)"><span style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--mut);margin-bottom:3px">{I["spark"]}Nota para Axi · solo la ve el agente</span>Ya se aprobó el reembolso; confírmale que el abono llega el viernes 26.</div></div>'
    + who('Axi', right=True, ai=True)
    + msg('out', 'Juan Pablo, te confirmo: el reembolso llega a tu cuenta el viernes 26 de septiembre.', '2:50 p. m.', 'read')
    + msg('in', 'Muchas gracias por todo, nos vemos en el aeropuerto', '3:08 p. m.', gap=True)
    + ev('<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--mut)" stroke-width="2" aria-hidden="true"><path d="m2 13 4 4 8-9M10 16l1 1 8-9"></path></svg>', 'Axi resolvió la conversación', '3:10 p. m.')
)
closed_foot = f'''<div role="status" style="flex-shrink:0;display:flex;align-items:center;justify-content:center;gap:8px;padding:14px 16px;border-top:1px solid var(--line);background:var(--card);font-size:12.5px;color:var(--fg2)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m2 13 4 4 8-9M10 16l1 1 8-9"></path></svg><span>Resuelta el 24 sep a las 3:10 p. m. · por Axi · el historial se consulta, no se continúa</span></div>'''
closed_conv = f'''<section class="conv" aria-label="Conversación con Juan Pablo Mesa">
  {head('Juan Pablo Mesa','JM','WhatsApp Ventas · +57 300 118 2204',pill('done','Resuelta'),more())}
  <div class="thread">{jp_thread}</div>
  {closed_foot}
</section>'''
closed_body = desktop(expanded_col('closed') + list_col('Cerradas', 'Solo lectura · el historial se consulta, no se continúa', '{{rows}}', dot=False) + closed_conv + ctx_rail(), 'bub-tinta')
closed_js = '''  renderVals() {
    const dark = this.props.dark === true;
''' + JS + '''
    const sel = (k, active) => Object.assign(mkRow(k, false, false), { sel: active ? "''' + SEL + '''" : '' });
    return { themeCls: dark ? 'dk' : 'lt', rows: [sel('jp', true)] };
  }'''
open(R + '/project/Cerrada.dc.html', 'w').write(page('Inbox · Cerrada', 1440, 1000, closed_body, closed_js))

# ------------------------------ 6 · Movil ------------------------------
mob_body = f'''<div class="{{{{themeCls}}}} bub-{{{{bub}}}}" style="width:390px;height:844px;overflow:hidden;display:flex;flex-direction:column;font-family:Poppins,system-ui,sans-serif;color:var(--fg);background:var(--bg)">
  {mariana_conv(mobile=True)}
</div>'''
mob_js = '''  constructor(props) { super(props); this.state = { claimed: false }; }
  renderVals() {
    const dark = this.props.dark === true;
    const claimed = this.state.claimed;
    return { themeCls: dark ? 'dk' : 'lt', islCls: dark ? 'isl-ai-dark' : 'isl-ai', bub: 'tinta', queued: !claimed, mine: claimed, claim: () => this.setState({ claimed: true }) };
  }'''
open(R + '/project/Movil.dc.html', 'w').write(page('Inbox · Celular · en cola', 390, 844, mob_body, mob_js))

# ------------------------------ 8 · Estados ------------------------------
def stcell(label, inner):
    return f'<div style="display:flex;flex-direction:column;gap:8px;min-height:0"><span class="lbl">{label}</span><section class="card" style="height:400px;display:flex;flex-direction:column;overflow:hidden;background:var(--bg)">{inner}</section></div>'
def mini_head(name, ini, sub, pl, act=''):
    return f'<header class="chead" style="padding:0 10px 0 16px">{"<span class=\"av\" style=\"width:36px;height:36px\">" + ini + "</span>" if ini else "<span class=\"sk\" style=\"width:36px;height:36px;border-radius:999px\"></span>"}<span style="display:flex;flex-direction:column;min-width:0;gap:4px">{name}{sub}</span><span style="flex-grow:1"></span>{pl}{act}</header>'
empty = lambda title, text, btn, icon: f'<div style="flex-grow:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:24px;text-align:center"><span style="width:60px;height:60px;border-radius:20px;background:var(--chip);display:inline-flex;align-items:center;justify-content:center;color:var(--mut)">{icon}</span><span style="font-size:14px;font-weight:600">{title}</span><span style="font-size:12.5px;color:var(--mut);max-width:260px;line-height:1.45">{text}</span>{btn}</div>'
big = lambda k: I[k].replace('width="16" height="16"', 'width="26" height="26"')
warnic = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 3 2 20h20z"></path><path d="M12 10v4M12 17h0"></path></svg>'
chat = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 5h16v11H8l-4 4z"></path></svg>'
noperm_island = f'''<article class="isl {{{{islCls}}}}" style="margin:12px 14px 0;padding:14px 16px;display:flex;flex-direction:column;gap:5px" aria-label="Por qué está aquí"><span class="kick" style="display:inline-flex;align-items:center;gap:6px">{I['spark']}Axi la pasó al equipo · hace 6 min</span><span class="d" style="font-size:18px;font-weight:700;line-height:1.25">Axi no pudo responder varias veces seguidas.</span><span style="font-size:12px;color:var(--fg2)">La atiende quien tenga permiso de atender conversaciones.</span></article>'''
est_body = f'''<div class="{{{{themeCls}}}} bub-tinta" style="width:1440px;height:1000px;box-sizing:border-box;padding:40px 48px;background:var(--bg);color:var(--fg);font-family:Poppins,system-ui,sans-serif;display:flex;flex-direction:column;gap:22px">
  <div><span class="kick">Estados</span><h1 class="d" style="margin:6px 0 0;font-size:30px;font-weight:700;letter-spacing:-.02em">La conversación nunca se abre muda</h1></div>
  <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px">
    {stcell('Abriendo · la silueta del hilo, no «Tu día» parpadeando', mini_head('<span class="sk" style="width:150px;height:13px"></span>', None, '<span class="sk" style="width:96px;height:10px"></span>', '') + '<div style="padding:18px 22px;display:flex;flex-direction:column;gap:12px" role="status" aria-label="Abriendo la conversación"><span class="sk" style="width:58%;height:42px;border-radius:18px"></span><span class="sk" style="width:46%;height:56px;border-radius:18px;align-self:flex-end"></span><span class="sk" style="width:38%;height:42px;border-radius:18px"></span><span class="sk" style="width:52%;height:42px;border-radius:18px;align-self:flex-end"></span></div>')}
    {stcell('Error al leer el hilo', mini_head('<span style="font-size:14px;font-weight:600">Pedro Luis Arango</span>', 'PA', '<span style="font-size:12px;color:var(--mut)">Instagram</span>', pill('ai','Axi atiende')) + empty('No pudimos leer la conversación', 'Se perdió la conexión con el servidor. Lo que ya se envió está a salvo.', '<button type="button" class="btn" style="margin-top:4px">Reintentar</button>', warnic))}
    {stcell('Sin mensajes todavía', mini_head('<span style="font-size:14px;font-weight:600">Teo Salazar</span>', 'TS', '<span style="font-size:12px;color:var(--mut)">WhatsApp Ventas</span>', pill('ai','Axi atiende')) + empty('Aún no hay mensajes', 'Cuando Teo escriba, Axi le responde y lo verás aquí.', '', chat))}
    {stcell('En cola, sin permiso para atender · la cabecera no ofrece «Atender»; el motivo está en el hilo', mini_head('<span style="font-size:14px;font-weight:600">Julián Ortiz</span>', 'JO', '<span style="font-size:12px;color:var(--mut)">Instagram · esperando hace 6 min</span>', pill('queued','En cola · 6 min')) + ev(I['spark'], 'Axi pasó la conversación al equipo: no pudo responder varias veces seguidas', '9:36 a. m.') + '<div class="thread" style="padding-top:8px">' + day('Hoy') + msg('in', 'Hola, ¿siguen con la promo de Medellín?', '9:36 a. m.', gap=True) + '</div>')}
  </div>
</div>'''
est_js = '''  renderVals() {
    const dark = this.props.dark === true;
    return { themeCls: dark ? 'dk' : 'lt', islCls: dark ? 'isl-ai-dark' : 'isl-ai' };
  }'''
open(R + '/project/Estados.dc.html', 'w').write(page('Inbox · Estados de la conversación', 1440, 1000, est_body, est_js))
print('ok')
