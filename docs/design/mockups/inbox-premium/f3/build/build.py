"""Lienzo Inbox premium · F3 Escribir y medios. Reutiliza el kit de F2 (helmet, nav, cabecera, hilo)."""
import os, json
F3 = os.path.dirname(os.path.abspath(__file__)) + '/..'
F2B = os.path.abspath(F3 + '/../inboxf2/build/build.py')
src = open(F2B).read()
src = src[:src.index('# ------------------------------ 1 · Main')]
g = {'__file__': F2B}
exec(src, g)
I, H, page, head, pill, owner_btn, more, ev, day, who, msg, rail, list_col, ctx_rail, desktop, JS, SEL = (
    g[k] for k in ['I', 'H', 'page', 'head', 'pill', 'owner_btn', 'more', 'ev', 'day', 'who', 'msg', 'rail', 'list_col', 'ctx_rail', 'desktop', 'JS', 'SEL'])
OUT = F3 + '/project'
os.makedirs(OUT, exist_ok=True)

CSS = '''
.comp3{flex-shrink:0;padding:8px 16px 14px;background:var(--bg);display:flex;flex-direction:column;gap:8px}
.cmeta{display:flex;align-items:center;flex-wrap:wrap;gap:6px 8px;min-height:24px;padding:0 4px}
.spill{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 10px;border-radius:999px;background:var(--chip);font-size:11.5px;font-weight:500;color:var(--fg2);white-space:nowrap}
.spill b{font-weight:600;color:var(--fg);font-variant-numeric:tabular-nums}
.hint{margin-left:auto;font-size:11px;color:var(--mut);white-space:nowrap}
.kbd{display:inline-flex;align-items:center;height:18px;padding:0 5px;border-radius:5px;border:1px solid var(--line2);font:500 10.5px Poppins,sans-serif;color:var(--fg2);background:var(--card)}
.cblock{border:1px solid var(--line2);border-radius:20px;background:var(--card);box-shadow:var(--sh);display:flex;flex-direction:column;transition:box-shadow .2s}
.cblock.focus{box-shadow:0 0 0 3px rgba(11,11,14,.08),var(--sh);border-color:var(--fg)}
.dk .cblock.focus{box-shadow:0 0 0 3px rgba(255,255,255,.10)}
.ctext{padding:12px 16px 4px;font-size:13.5px;line-height:1.5;min-height:22px;color:var(--fg)}
.ctext.ph{color:var(--mut)}
.caret{display:inline-block;width:1.5px;height:17px;background:var(--fg);vertical-align:-3px;margin-left:1px;animation:blink 1.1s steps(1) infinite}
@keyframes blink{50%{opacity:0}}
.ctools{display:flex;align-items:center;gap:2px;padding:4px 6px 6px}
.tb{width:36px;height:36px;border-radius:999px;border:0;background:transparent;color:var(--fg2);display:inline-flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.tb:hover,.tb-on{background:var(--chip);color:var(--fg)}
.send3{height:36px;min-width:36px;padding:0 14px 0 12px;border-radius:999px;border:0;background:var(--brand);color:#fff;display:inline-flex;align-items:center;justify-content:center;gap:6px;font:500 13px Poppins,sans-serif;flex-shrink:0;cursor:pointer}
.dk .send3{color:var(--onbrand)}
.send3.off{background:var(--chip);color:var(--mut);cursor:default}
.tray{display:flex;gap:8px;padding:10px 12px 2px;overflow-x:auto}
.ti{position:relative;width:56px;height:56px;border-radius:14px;flex-shrink:0;overflow:hidden;background:var(--chip);display:flex;align-items:center;justify-content:center;color:var(--fg2)}
.ti.doc{width:228px;justify-content:flex-start;gap:9px;padding:0 10px 0 8px;box-sizing:border-box;border:1px solid var(--line)}
.ti.err{box-shadow:inset 0 0 0 1.5px var(--bad)}
.ti .x{position:absolute;top:3px;right:3px;width:24px;height:24px;border-radius:999px;border:0;background:rgba(11,11,14,.62);color:#fff;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}
.ti.doc .x{position:static;margin-left:auto;background:var(--card);color:var(--fg2);box-shadow:inset 0 0 0 1px var(--line2)}
.ti .ok{position:absolute;left:4px;bottom:4px;width:18px;height:18px;border-radius:999px;background:var(--card);color:var(--ok);display:inline-flex;align-items:center;justify-content:center}
.ring{width:22px;height:22px;border-radius:999px;border:2.5px solid rgba(255,255,255,.35);border-top-color:#fff;animation:spin .9s linear infinite;box-sizing:border-box}
.doc .ring{border-color:var(--line2);border-top-color:var(--fg)}
@keyframes spin{to{transform:rotate(360deg)}}
.veil{position:absolute;inset:0;background:rgba(11,11,14,.38);display:flex;align-items:center;justify-content:center}
.ext{width:36px;height:40px;border-radius:9px;background:var(--card);box-shadow:inset 0 0 0 1px var(--line2);display:inline-flex;align-items:flex-end;justify-content:center;padding-bottom:6px;box-sizing:border-box;font:700 9.5px Poppins,sans-serif;letter-spacing:.04em;color:var(--fg2);flex-shrink:0}
.ext.pdf{color:var(--brand)}
.photo{background:linear-gradient(180deg,#8FC9E8 0%,#BFE3F2 42%,#F2E3C4 43%,#E9D2A6 70%,#D9BC8A 100%)}
.photo2{background:radial-gradient(circle at 30% 30%,#FFE9B8 0 12%,transparent 13%),linear-gradient(160deg,#2F7C8F,#5DB3B8 55%,#E7D6A9 56%,#D8C08E)}
.photo3{background:linear-gradient(200deg,#F6C7A6,#E98E7C 45%,#6D5A8C)}
.photo4{background:linear-gradient(180deg,#9FB7C9,#DCE4EA 50%,#6E8B5E 51%,#4F6B45)}
.recbar{display:flex;align-items:center;gap:12px;padding:10px 8px 10px 10px}
.rdot{width:10px;height:10px;border-radius:9px;background:var(--bad);animation:pulse 1.2s ease-in-out infinite;flex-shrink:0}
@keyframes pulse{50%{opacity:.35}}
.lvl{flex:1;min-width:0;display:flex;align-items:center;gap:3px;height:28px;overflow:hidden}
.lvl i{display:block;width:3px;border-radius:3px;background:var(--fg);opacity:.85;flex-shrink:0}
.lvl i.old{opacity:.28}
.tnum{font-variant-numeric:tabular-nums}
.ap{display:flex;align-items:center;gap:10px;width:248px;max-width:100%}
.apb{width:36px;height:36px;border-radius:999px;border:0;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;cursor:pointer;background:var(--fg);color:var(--bg)}
.out .apb{background:var(--bg);color:var(--fg)}
.aptr{position:relative;height:4px;border-radius:9px;background:var(--track)}
.out .aptr{background:color-mix(in srgb,var(--bg) 28%,transparent)}
.aptr span{position:absolute;left:0;top:0;bottom:0;border-radius:9px;background:currentColor}
.aptr em{position:absolute;top:50%;width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:9px;background:currentColor}
.apm{display:flex;justify-content:space-between;margin-top:6px;font-size:10.5px;opacity:.72}
.rate{height:20px;padding:0 7px;border-radius:999px;border:0;background:color-mix(in srgb,currentColor 12%,transparent);color:inherit;font:600 10.5px Poppins,sans-serif;opacity:1}
.tr{margin-top:8px;padding-top:7px;border-top:1px solid color-mix(in srgb,currentColor 14%,transparent);font-size:12.5px;line-height:1.45}
.trh{display:flex;align-items:center;gap:5px;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;opacity:.72;margin-bottom:3px;background:none;border:0;color:inherit;padding:0;cursor:pointer;font-family:inherit}
.bm{padding:3px!important;overflow:hidden}
.bm .img{display:block;border-radius:15px;overflow:hidden;position:relative}
.bm .cap{padding:6px 9px 3px}
.dur{position:absolute;left:8px;bottom:8px;white-space:nowrap;height:22px;padding:0 8px;border-radius:999px;background:rgba(11,11,14,.55);color:#fff;font-size:11px;display:inline-flex;align-items:center;gap:5px;-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
.playg{position:absolute;left:50%;top:50%;width:52px;height:52px;margin:-26px 0 0 -26px;border-radius:999px;background:rgba(255,255,255,.28);border:1px solid rgba(255,255,255,.5);color:#fff;display:inline-flex;align-items:center;justify-content:center;-webkit-backdrop-filter:blur(14px) saturate(160%);backdrop-filter:blur(14px) saturate(160%)}
.docc{display:flex;align-items:center;gap:11px;width:268px;max-width:100%;padding:8px 6px 8px 8px;border-radius:14px;background:color-mix(in srgb,currentColor 6%,transparent)}
.dlb{width:36px;height:36px;border-radius:999px;border:0;background:transparent;color:inherit;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;cursor:pointer}
.dlb:hover{background:color-mix(in srgb,currentColor 10%,transparent)}
.loc{width:268px;max-width:100%;border-radius:14px;overflow:hidden;background:color-mix(in srgb,currentColor 6%,transparent)}
.chipm{display:inline-flex;align-items:center;gap:5px;height:22px;padding:0 9px;border-radius:999px;background:var(--chip);font-size:11px;color:var(--fg2)}
.recog{width:300px;max-width:100%;border-radius:16px;border:1px solid var(--line);background:var(--card);font-size:12px;overflow:hidden}
.recog .rh{display:flex;align-items:center;gap:6px;padding:8px 12px;border-bottom:1px solid var(--line);font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--mut)}
.recog .rr{display:grid;grid-template-columns:1fr auto;gap:4px 10px;padding:8px 12px}
.bar{height:4px;border-radius:9px;background:var(--track);overflow:hidden}.bar span{display:block;height:100%;background:var(--ai);border-radius:9px}
.qa{position:absolute;left:16px;bottom:128px;width:620px;height:420px;border-radius:24px;display:flex;overflow:hidden;z-index:5;animation:pop .22s cubic-bezier(.2,.9,.3,1.1) both}
@keyframes pop{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:none}}
.glass{color:var(--fg);background:linear-gradient(160deg,rgba(255,255,255,.90),rgba(250,250,252,.80));-webkit-backdrop-filter:blur(24px) saturate(180%);backdrop-filter:blur(24px) saturate(180%);box-shadow:inset 0 1px 1px rgba(255,255,255,.8),0 0 0 1px rgba(11,11,14,.08),0 30px 70px -28px rgba(16,16,24,.45)}
.dk .glass{background:linear-gradient(160deg,rgba(34,34,40,.92),rgba(24,24,28,.90));box-shadow:inset 0 1px 1px rgba(255,255,255,.08),0 0 0 1px rgba(255,255,255,.10),0 30px 70px -28px rgba(0,0,0,.8)}
.qal{width:270px;flex-shrink:0;border-right:1px solid var(--line);display:flex;flex-direction:column;min-height:0}
.qas{margin:12px;display:flex;align-items:center;gap:8px;height:38px;border-radius:999px;background:var(--chip);padding:0 12px;font-size:13px;color:var(--fg)}
.qag{font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--mut);padding:10px 16px 4px}
.qai{display:flex;align-items:center;gap:10px;margin:0 6px;padding:8px 10px;border-radius:12px;font-size:13px;cursor:pointer}
.qai .ds{font-size:11.5px;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.qai-on{background:var(--fg);color:var(--bg)}.qai-on .ds{color:color-mix(in srgb,var(--bg) 70%,transparent)}
.qai-off{opacity:.42;cursor:default}
.qap{flex:1;min-width:0;display:flex;flex-direction:column;padding:16px 18px 14px;gap:10px}
.lbx{position:absolute;inset:0;z-index:9;display:flex;flex-direction:column;color:#fff;background:rgba(8,8,10,.78);-webkit-backdrop-filter:blur(26px) saturate(140%);backdrop-filter:blur(26px) saturate(140%)}
.lbb{width:44px;height:44px;border-radius:999px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.10);color:#fff;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.lbt{height:40px;padding:0 16px;border-radius:999px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.10);color:#fff;display:inline-flex;align-items:center;gap:8px;font:500 13px Poppins,sans-serif;cursor:pointer}
.film{display:flex;gap:8px;justify-content:center;padding:14px 0 22px}
.film span{width:56px;height:56px;border-radius:12px;opacity:.5}
.film span.on{opacity:1;box-shadow:0 0 0 2px #fff}
.drop{position:absolute;inset:12px;z-index:6;border-radius:24px;border:2px dashed var(--fg);background:color-mix(in srgb,var(--bg) 88%,transparent);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
.note{display:flex;align-items:flex-start;gap:8px;padding:8px 12px;border-radius:14px;background:var(--chip);font-size:12px;color:var(--fg2);line-height:1.4}
.lockw{display:flex;align-items:center;flex-wrap:wrap;gap:12px 14px;padding:12px 10px 12px 16px;border-radius:20px;background:var(--card);border:1px solid var(--line2);font-size:13px;color:var(--fg2);line-height:1.45}
.ico-t{width:36px;height:36px;border-radius:12px;background:var(--chip);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--fg2)}
.bsheet{position:absolute;left:0;right:0;bottom:0;z-index:7;border-radius:28px 28px 0 0;padding:8px 0 20px;display:flex;flex-direction:column;max-height:72%}
.grab{width:40px;height:5px;border-radius:9px;background:var(--line2);align-self:center;margin:4px 0 8px}
.scrim{position:absolute;inset:0;z-index:6;background:rgba(11,11,14,.32)}
'''
H = H.replace('</style>', CSS + '</style>')
g['H'] = H

X = {
 'x': '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"></path></svg>',
 'x16': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"></path></svg>',
 'play': '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15a1 1 0 0 0 1.5.9l12-7.5a1 1 0 0 0 0-1.8l-12-7.5A1 1 0 0 0 7 4.5z"></path></svg>',
 'play22': '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15a1 1 0 0 0 1.5.9l12-7.5a1 1 0 0 0 0-1.8l-12-7.5A1 1 0 0 0 7 4.5z"></path></svg>',
 'pause': '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="4" width="4" height="16" rx="1"></rect><rect x="14" y="4" width="4" height="16" rx="1"></rect></svg>',
 'stop': '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="3"></rect></svg>',
 'trash': '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"></path></svg>',
 'dl': '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"></path></svg>',
 'pin': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"></path><circle cx="12" cy="9.5" r="2.5"></circle></svg>',
 'ext': '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"></path></svg>',
 'left': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M15 18l-6-6 6-6"></path></svg>',
 'right': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 18l6-6-6-6"></path></svg>',
 'search': '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>',
 'file': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M14 3H6v18h12V7z"></path><path d="M14 3v4h4M9 13h6M9 17h4"></path></svg>',
 'msg': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 5h16v11H8l-4 4z"></path><path d="M8 9h8M8 12h5"></path></svg>',
 'tap': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M9 11V5a2 2 0 0 1 4 0v5l4.5 1a2 2 0 0 1 1.5 2.3L18 19a2 2 0 0 1-2 1.7h-4.4a2 2 0 0 1-1.6-.8L6 15"></path></svg>',
 'tpl': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3"></rect><path d="M8 9h8M8 13h8M8 17h5"></path></svg>',
 'img': '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"></rect><circle cx="9" cy="10" r="2"></circle><path d="m21 16-5-5-9 9"></path></svg>',
 'up': '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M5 20h14"></path></svg>',
 'wifi': '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M2 2l20 20M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 5.2-2.8M19 13a10 10 0 0 0-2.5-1.8M12 20h0"></path></svg>',
 'micoff': '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M2 2l20 20M9 9v2a3 3 0 0 0 5 2.2M15 9.3V6a3 3 0 0 0-5.7-1.3M19 11a7 7 0 0 1-1.1 3.8M5 11a7 7 0 0 0 11 5.7M12 18v3"></path></svg>',
 'lockc': '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>',
 'plug': '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M9 7V3M15 7V3M7 7h10v4a5 5 0 0 1-10 0zM12 16v5"></path></svg>',
 'chevr': '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="m9 6 6 6-6 6"></path></svg>',
 'chevd': '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg>',
 'scan': '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--ai)" stroke-width="2" aria-hidden="true"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"></path><circle cx="11" cy="11" r="3.5"></circle><path d="m16 16-2.5-2.5"></path></svg>',
 'pkg': '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 8 12 3 3 8v8l9 5 9-5z"></path><path d="M3 8l9 5 9-5M12 13v8"></path></svg>',
 'cam': '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M23 7 16 12l7 5z"></path><rect x="1" y="5" width="15" height="14" rx="2"></rect></svg>',
}
I.update(X)

# ------------------------------ composer ------------------------------
def spill_window(state):
    return {
        'open': '<span class="spill"><span class="dot" style="background:var(--ok)"></span>Ventana de 24 h · quedan <b>21 h</b></span>',
        'soon': '<span class="spill"><span class="dot" style="background:var(--warn)"></span>Se cierra en <b>38 min</b> · después, solo plantilla</span>',
        'none': '',
    }[state]


def hint():
    return '<span class="hint"><span class="kbd">Enter</span> envía · <span class="kbd">Shift</span>+<span class="kbd">Enter</span> salto de línea</span>'


def tools(text_mode, zap_on=False, recording_ok=True):
    right = (f'<button type="button" class="send3" aria-label="Enviar mensaje">Enviar{I["sendi"]}</button>' if text_mode == 'send'
             else f'<button type="button" class="tb" aria-label="Grabar nota de voz">{I["mic"]}</button><button type="button" class="send3 off" aria-label="Enviar mensaje" aria-disabled="true">{I["sendi"]}</button>')
    return f'''<div class="ctools">
      <button type="button" class="tb" aria-label="Adjuntar archivo" title="Adjuntar · también puedes arrastrar o pegar">{I['clip']}</button>
      <button type="button" class="tb{' tb-on' if zap_on else ''}" aria-label="Acciones rápidas" aria-expanded="{'true' if zap_on else 'false'}" title="Acciones rápidas · /">{I['zap']}</button>
      <span style="flex:1"></span>{right}
    </div>'''


def tray_items(kind='mix'):
    photo = f'<div class="ti photo" role="listitem" aria-label="playa-rodadero.jpg, listo"><span class="ok">{I["ck1"]}</span><button type="button" class="x" aria-label="Quitar playa-rodadero.jpg">{I["x"]}</button></div>'
    up = f'<div class="ti photo3" role="listitem" aria-label="atardecer.jpg, subiendo"><div class="veil"><span class="ring" role="progressbar" aria-label="Subiendo"></span></div><button type="button" class="x" aria-label="Quitar atardecer.jpg">{I["x"]}</button></div>'
    doc = f'<div class="ti doc" role="listitem" aria-label="Itinerario Santa Marta.pdf, subiendo"><span class="ext pdf">PDF</span><span style="display:flex;flex-direction:column;min-width:0;gap:1px"><span style="font-size:12px;font-weight:500;color:var(--fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Itinerario Santa Marta.pdf</span><span style="font-size:11px;color:var(--mut);display:inline-flex;align-items:center;gap:6px;white-space:nowrap" class="tnum"><span class="ring" style="width:12px;height:12px;border-width:2px"></span>2,4 MB · subiendo</span></span><button type="button" class="x" aria-label="Quitar Itinerario Santa Marta.pdf">{I["x"]}</button></div>'
    err = f'<div class="ti err photo4" role="listitem" aria-label="video-hotel.mp4, no se subió"><div class="veil" style="background:color-mix(in srgb,var(--bad) 55%,rgba(11,11,14,.4))"><button type="button" class="x" style="position:static;width:32px;height:32px;background:#fff;color:var(--bad)" aria-label="Reintentar la subida de video-hotel.mp4" title="No se subió · Reintentar">{I["retry"]}</button></div><button type="button" class="x" aria-label="Quitar video-hotel.mp4">{I["x"]}</button></div>'
    return photo + up + doc + err if kind == 'mix' else photo


def composer3(mode='empty', window='open', zap_on=False, name='Laura'):
    """mode: empty | typing | attach | rec | preview | long"""
    meta = f'<div class="cmeta">{spill_window(window)}{hint() if mode in ("typing", "long", "attach") else ""}</div>'
    if mode == 'rec':
        bars = ''.join(f'<i class="{"old" if n < 22 else ""}" style="height:{h}px"></i>' for n, h in enumerate([4,6,9,5,12,16,10,7,14,20,24,18,12,8,6,10,15,22,26,20,14,9,6,8,12,18,24,28,22,16,11,8,13,19,23,17,12,9,6,5,7,10,14,18]))
        block = f'''<div class="cblock"><div class="recbar" role="group" aria-label="Grabando nota de voz">
          <button type="button" class="tb" aria-label="Descartar la grabación" style="color:var(--bad)">{I['trash']}</button>
          <span class="rdot" aria-hidden="true"></span><span class="tnum" style="font-size:14px;font-weight:600;min-width:38px" aria-live="off">0:14</span>
          <div class="lvl" aria-hidden="true">{bars}</div>
          <span style="font-size:12px;color:var(--mut);white-space:nowrap">Grabando · máx. 15 min</span>
          <button type="button" class="send3" aria-label="Detener y escuchar" style="background:var(--fg);color:var(--bg);padding:0 14px">{I['stop']}Detener</button>
        </div></div>'''
        return f'<div class="comp3">{meta}{block}</div>'
    if mode == 'preview':
        block = f'''<div class="cblock"><div class="recbar" role="group" aria-label="Nota de voz lista">
          <button type="button" class="tb" aria-label="Descartar la nota de voz" style="color:var(--bad)">{I['trash']}</button>
          <div class="ap" style="flex:1;width:auto"><button type="button" class="apb" aria-label="Escuchar la nota">{I['play']}</button><div style="flex:1;min-width:0"><div class="aptr" style="color:var(--fg)"><span style="width:0%"></span><em style="left:0%"></em></div><div class="apm tnum"><span>0:00 / 0:14</span><span>Escúchala antes de enviarla</span></div></div></div>
          <button type="button" class="send3" aria-label="Enviar nota de voz">Enviar{I['sendi']}</button>
        </div></div>'''
        return f'<div class="comp3">{meta}{block}</div>'
    tray = f'<div class="tray" role="list" aria-label="Adjuntos por enviar">{tray_items()}</div>' if mode == 'attach' else ''
    if mode == 'empty':
        text = f'<div class="ctext ph">Escribe a {name}…</div>'
    elif mode == 'typing':
        text = '<div class="ctext">Hola, Laura. Te dejo el link de pago actualizado<span class="caret"></span></div>'
    elif mode == 'attach':
        text = '<div class="ctext">Aquí va el itinerario día por día y las fotos del hotel<span class="caret"></span></div>'
    else:
        text = '<div class="ctext scr" style="max-height:180px;overflow-y:auto">Hola, Laura. Te resumo lo que incluye el paquete:<br>· Vuelos Bogotá – Santa Marta ida y regreso<br>· 4 noches en el Hotel Irotama, habitación doble<br>· Traslados aeropuerto – hotel – aeropuerto<br>· Desayunos y una cena de bienvenida<br>· Seguro de viaje<br>El total para dos personas es $ 4.380.000 y el link vence mañana a las 6:00 p. m.<span class="caret"></span></div>'
    footer = ''
    if mode == 'attach':
        footer = '<div style="padding:0 16px 2px;font-size:11px;color:var(--mut)">4 archivos · se envían como 4 mensajes y el texto va con el primero</div>'
    block = f'<div class="cblock{" focus" if mode in ("typing", "attach", "long") else ""}">{tray}{text}{footer}{tools("send" if mode in ("typing", "attach", "long") else "mic", zap_on)}</div>'
    return f'<div class="comp3">{meta}{block}</div>'


def lock_window(kind, name='Laura'):
    if kind == 'closed_cloud':
        return f'''<div class="comp3"><div class="lockw" role="status"><span class="ico-t">{I['lockc']}</span><span style="flex:1 1 240px;min-width:0"><b style="color:var(--fg);font-weight:600">La ventana de 24 h se cerró hace 2 h.</b> WhatsApp solo deja escribirle a {name} con una plantilla aprobada. Cuando responda, se abre de nuevo.</span><button type="button" class="btn btn-ink" style="height:38px;flex-shrink:0">{I['tpl']}Enviar plantilla</button></div></div>'''
    if kind == 'closed_ig':
        return f'''<div class="comp3"><div class="lockw" role="status"><span class="ico-t">{I['lockc']}</span><span style="flex:1;min-width:0"><b style="color:var(--fg);font-weight:600">Instagram solo deja responder durante las 24 h siguientes al último mensaje del cliente.</b> Esa ventana se cerró ayer a las 6:12 p. m.; cuando Julián vuelva a escribir, se abre.</span></div></div>'''
    if kind == 'disconnected':
        return f'''<div class="comp3"><div class="lockw" role="status"><span class="ico-t" style="color:var(--bad)">{I['plug']}</span><span style="flex:1 1 220px;min-width:0"><b style="color:var(--fg);font-weight:600">WhatsApp Ventas está desconectado.</b> Lo que escribas no saldrá hasta reconectarlo.</span><a class="btn" href="#" style="height:38px;flex-shrink:0">Ver el canal</a></div></div>'''


# ------------------------------ burbujas de media ------------------------------
def bmsg(direction, inner, time, status=None, last=True, gap=False, media=False, extra_after='', width=None):
    cls = f'msg {direction}' + (' last' if last else '') + (' gap' if gap else '')
    st = {'read': f'<span aria-label="Leído">{I["ck2"]}</span>', 'delivered': f'<span aria-label="Entregado">{I["ck2"]}</span>', None: ''}[status] if direction == 'out' else ''
    meta = f'<div class="mt" style="{"padding:0 7px 2px" if media else ""}"><span class="tnum">{time}</span>{st}</div>' if time else ''
    return f'<div class="{cls}"><div style="display:flex;flex-direction:column;gap:6px;max-width:72%;align-items:{"flex-end" if direction == "out" else "flex-start"}"><div class="b{" bm" if media else ""}" style="max-width:100%;{f"width:{width}px;box-sizing:border-box" if width else ""}">{inner}{meta}</div>{extra_after}</div></div>'


def img_in(cls='photo', w=240, ratio='4/3', label='Foto de Laura'):
    return f'<button type="button" class="img {cls}" aria-label="Ver {label}" style="width:{w}px;aspect-ratio:{ratio};border:0;padding:0;cursor:zoom-in"></button>'


def audio(direction, pos=38, playing=False, t='0:16 / 0:42'):
    return f'''<div class="ap" role="group" aria-label="Nota de voz, 0:42"><button type="button" class="apb" aria-label="{"Pausar" if playing else "Reproducir"} la nota de voz">{I["pause" if playing else "play"]}</button><div style="flex:1;min-width:0"><div class="aptr"><span style="width:{pos}%"></span><em style="left:{pos}%"></em></div><div class="apm tnum"><span>{t}</span><button type="button" class="rate" aria-label="Velocidad 1,5 x">1,5×</button></div></div></div>'''


def transcript(open_=True):
    if open_:
        return f'<div class="tr"><button type="button" class="trh" aria-expanded="true">{I["spark"]}Transcripción{I["chevd"]}</button><div>Hola, Laura. Ya vi las fotos del hotel, me encantó. Una pregunta: ¿el traslado del aeropuerto también aplica el día de regreso? Y si podemos pagar la mitad ahora y la otra mitad en octubre.</div></div>'
    return f'<div class="tr"><button type="button" class="trh" aria-expanded="false">{I["spark"]}Transcripción · 3 líneas{I["chevr"]}</button></div>'


def doc_card(name='Itinerario Santa Marta · Laura Gómez · noviembre 2026.pdf', meta='PDF · 2,4 MB · 6 páginas', ext='PDF'):
    return f'''<div class="docc"><span class="ext {"pdf" if ext == "PDF" else ""}">{ext}</span><span style="display:flex;flex-direction:column;min-width:0;flex:1;gap:2px"><span style="font-size:12.5px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="{name}">{name}</span><span class="tnum" style="font-size:11px;opacity:.72">{meta}</span></span><button type="button" class="dlb" aria-label="Descargar {name}">{I["dl"]}</button></div>'''


def location():
    return f'''<div class="loc"><div style="height:92px;position:relative;background:repeating-linear-gradient(0deg,transparent 0 22px,color-mix(in srgb,currentColor 7%,transparent) 22px 23px),repeating-linear-gradient(90deg,transparent 0 22px,color-mix(in srgb,currentColor 7%,transparent) 22px 23px);display:flex;align-items:center;justify-content:center"><span style="width:40px;height:40px;border-radius:999px;background:var(--brand);color:#fff;display:inline-flex;align-items:center;justify-content:center;box-shadow:0 8px 18px -8px rgba(209,63,66,.7)">{I["pin"]}</span></div>
      <div style="padding:9px 12px 10px;display:flex;flex-direction:column;gap:2px"><span style="font-size:12.5px;font-weight:600">Hotel Irotama Resort</span><span style="font-size:11.5px;opacity:.72">Km 14 vía Ciénaga, Santa Marta</span><a href="#" style="margin-top:4px;display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:500;text-decoration:underline;text-underline-offset:2px">Abrir en Google Maps{I["ext"]}</a></div></div>'''


def recog():
    rows = ''
    for name, sku, price, pct, conf, dotc in [('Plan Todo Incluido Irotama', 'SM-IRO-4N', '$ 2.190.000', 91, 'Alta', 'var(--ok)'), ('Plan Rodadero Sea Club', 'SM-ROD-4N', '$ 1.840.000', 64, 'Media', 'var(--warn)')]:
        rows += f'<div class="rr"><span style="font-weight:500">{name} <span style="font:400 11px ui-monospace,monospace;color:var(--mut)">{sku}</span></span><span class="tnum" style="color:var(--mut)">{price}</span><div style="grid-column:span 2;display:flex;align-items:center;gap:8px"><div class="bar" style="flex:1"><span style="width:{pct}%"></span></div><span class="pill" style="height:20px;font-size:10.5px"><span class="dot" style="width:6px;height:6px;background:{dotc}"></span>{conf} · 0,{pct}</span></div></div>'
    return f'<div class="recog" aria-label="Producto reconocido"><div class="rh">{I["scan"]}Producto reconocido</div><p style="margin:0;padding:8px 12px 0;color:var(--fg)">Piscina de hotel frente al mar con palmeras; parece el Irotama.</p>{rows}</div>'


def media_a():
    return (
        day('Hoy')
        + bmsg('in', img_in('photo', 240, '4/3', 'la foto de Laura') + '<div class="cap">¿Este es el hotel? Me lo mandó mi hermana 😍</div>', '9:12 a. m.', gap=True, media=True, extra_after=recog(), width=246)
        + who('Tú', right=True)
        + bmsg('out', img_in('photo2', 260, '16/10', 'la foto que enviaste') + '<div class="cap">Sí, es el Irotama. Así se ve la piscina principal.</div>', '9:14 a. m.', 'read', last=False, media=True, width=266)
        + bmsg('out', f'<div class="img photo4" style="width:260px;aspect-ratio:16/9"><span class="playg" aria-hidden="true">{I["play22"]}</span><span class="dur">{I["cam"]}<span class="tnum">0:32</span></span></div>', '9:14 a. m.', 'read', media=True, width=266)
    )


def media_b():
    return (
        bmsg('in', audio('in') + transcript(True), '9:20 a. m.', gap=True)
        + who('Tú', right=True)
        + bmsg('out', doc_card(), '9:24 a. m.', 'delivered', last=False)
        + bmsg('out', location(), '9:24 a. m.', 'delivered')
        + bmsg('in', audio('in', 0, False, '0:00 / 0:08') + transcript(False), '9:31 a. m.', gap=True)
    )


def media_thread(dark=False):
    return media_a() + media_b()


def recent_thread():
    return '<div style="margin-top:auto"></div>' + day('Hoy') + media_b()


def laura_conv(composer_html, overlay='', thread=None, dark=False):
    th = thread if thread is not None else recent_thread()
    return f'''<section class="conv" aria-label="Conversación con Laura Gómez">
      {head('Laura Gómez','LG','WhatsApp Ventas · +57 301 555 0142',pill('mine','Contigo'),owner_btn('OD') + f'<button type="button" class="btn btn-ink" style="height:36px">{I["check"]}Cerrar</button>' + more())}
      <div class="thread" style="display:flex;flex-direction:column">{th}</div>
      {composer_html}
      {overlay}
    </section>'''


def rows_js(keys):
    return '''  renderVals() {
    const dark = this.props.dark === true;
''' + JS + '''
    const sel = (k, active) => Object.assign(mkRow(k, false, false), { sel: active ? "''' + SEL + '''" : '' });
    PEOPLE.laura.prev = 'Nota de voz · 0:08'; PEOPLE.laura.media = 'voice'; PEOPLE.laura.time = '9:31 a. m.';
    return { themeCls: dark ? 'dk' : 'lt', rows: [''' + ','.join(f"sel('{k}', {'true' if i == 0 else 'false'})" for i, k in enumerate(keys)) + '''] };
  }'''


# ------------------------------ quick actions popover ------------------------------
def qa_popover(outside=False, cls='qa glass'):
    def item(icon, name, desc, on=False, off=False, tag=''):
        t = f'<span style="margin-left:auto;font-size:10.5px;opacity:.7;white-space:nowrap">{tag}</span>' if tag else ''
        return f'<div class="qai{" qai-on" if on else ""}{" qai-off" if off else ""}" role="option" aria-selected="{"true" if on else "false"}"{" aria-disabled=\"true\"" if off else ""}>{I[icon]}<span style="display:flex;flex-direction:column;min-width:0;flex:1"><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{name}</span><span class="ds">{desc}</span></span>{t}</div>'
    off = outside
    lst = (f'<div class="qas">{I["search"]}<span style="color:var(--mut)">{"Buscar plantilla…" if outside else "Buscar acción…"}</span></div>'
           + '<div class="scr" style="flex:1;min-height:0;overflow-y:auto;padding-bottom:8px">'
           + ('' if outside else '<div class="qag">Respuestas rápidas</div>' + item('msg', 'Link de pago', 'Te comparto el link de pago de tu reserva…', on=True) + item('msg', 'Datos para transferencia', 'Bancolombia · cuenta de ahorros…'))
           + ('' if outside else '<div class="qag">Recursos</div>' + item('file', 'Catálogo Santa Marta 2026', 'PDF con planes y precios', tag='3 archivos'))
           + ('' if outside else '<div class="qag">Interactivos</div>' + item('tap', '¿Cómo quieres pagar?', 'Tres botones: tarjeta, PSE, transferencia'))
           + '<div class="qag">Plantillas de WhatsApp</div>' + item('tpl', 'seguimiento_cotizacion', 'es_CO · aprobada por Meta', on=outside) + item('tpl', 'recordatorio_pago', 'es_CO · aprobada por Meta')
           + ('<div class="qag">Fuera de la ventana</div>' + item('msg', 'Link de pago', 'Solo dentro de las 24 h', off=True) + item('file', 'Catálogo Santa Marta 2026', 'Solo dentro de las 24 h', off=True) if outside else '')
           + '</div>')
    if outside:
        preview = f'''<span class="kick">Vista previa · plantilla</span>
          <div style="display:flex;align-items:center;gap:12px;padding:14px;border-radius:18px;background:var(--card);border:1px solid var(--line)"><span class="ico-t">{I["tpl"]}</span><span style="display:flex;flex-direction:column;gap:2px;min-width:0"><span style="font-size:14px;font-weight:600">seguimiento_cotizacion</span><span style="font-size:12px;color:var(--mut)">Plantilla aprobada por Meta · español (Colombia)</span></span></div>
          <div class="note">{I["spark"]}<span>El texto de la plantilla lo guarda Meta; aquí se ve su nombre y su idioma, como hoy. Meta cobra cada plantilla enviada. Cuando Laura responda, la ventana se abre y puedes escribir libremente.</span></div>'''
    else:
        preview = f'''<span class="kick">Vista previa · así le llega a Laura</span>
          <div style="display:flex;justify-content:flex-end"><div class="b" style="max-width:92%;background:var(--fg);color:var(--bg);border-radius:18px;border-bottom-right-radius:6px;padding:10px 13px 8px;font-size:13px;line-height:1.45">Te comparto el link de pago de tu reserva a Santa Marta: https://pagos.juanitoxpeditions.co/AX-3391. Vence mañana a las 6:00 p. m.</div></div>
          <span style="font-size:11.5px;color:var(--mut)">Respuesta rápida · texto · la puedes editar en Ajustes</span>'''
    return f'''<div class="{cls}" role="dialog" aria-label="Acciones rápidas">
      <div class="qal"><div role="listbox" aria-label="Acciones" style="display:contents">{lst}</div>
        <a href="#" style="display:flex;align-items:center;gap:8px;padding:10px 16px;border-top:1px solid var(--line);font-size:12px;color:var(--mut);text-decoration:none">{I["zap"]}Configurar acciones rápidas…</a></div>
      <div class="qap">{preview}<span style="flex:1"></span>
        <div style="display:flex;align-items:center;gap:10px"><span style="font-size:11px;color:var(--mut)"><span class="kbd">↑</span> <span class="kbd">↓</span> elegir · <span class="kbd">Esc</span> cerrar</span><span style="flex:1"></span><button type="button" class="send3" style="height:38px">Enviar a Laura{I["sendi"]}</button></div>
      </div>
    </div>'''


# ------------------------------ 1 · Main (interactivo) ------------------------------
modes = ['empty', 'typing', 'attach', 'rec', 'preview', 'long']
main_parts = ''.join(f'<sc-if value="{{{{m_{m}}}}}" hint-placeholder-val="{{{{ {"true" if m == "typing" else "false"} }}}}">{composer3(m, "open", False)}</sc-if>' for m in modes)
main_parts += f'<sc-if value="{{{{m_qa}}}}" hint-placeholder-val="{{{{ false }}}}">{composer3("empty", "open", True)}</sc-if>'
main_overlay = f'<sc-if value="{{{{m_qa}}}}" hint-placeholder-val="{{{{ false }}}}">{qa_popover()}</sc-if>'
main_body = desktop(rail('mine') + list_col('Contigo', '5 contigo', '{{rows}}', dot=False) + laura_conv(main_parts, main_overlay) + ctx_rail(), 'bub-tinta')
main_js = rows_js(['laura', 'andres']).replace("return { themeCls", '''const m = this.props.composer ?? 'escribiendo';
    const map = { 'vacío': 'empty', 'escribiendo': 'typing', 'adjuntos': 'attach', 'grabando': 'rec', 'nota lista': 'preview', 'texto largo': 'long', 'acciones rápidas': 'qa' };
    const k = map[m] || 'typing';
    const flags = {}; ['empty','typing','attach','rec','preview','long','qa'].forEach(x => flags['m_' + x] = x === k);
    return { ...flags, themeCls''')
PROPS = '"dark":{"editor":"boolean","default":false},"composer":{"editor":"enum","options":["vacío","escribiendo","texto largo","adjuntos","grabando","nota lista","acciones rápidas"],"default":"escribiendo"}'
open(OUT + '/Main.dc.html', 'w').write(page('Inbox · Escribir', 1440, 1000, main_body, main_js, PROPS))
open(OUT + '/Oscuro.dc.html', 'w').write(page('Inbox · Escribir · oscuro', 1440, 1000, main_body, main_js.replace("const dark = this.props.dark === true;", "const dark = this.props.dark !== false;"), PROPS.replace('"dark":{"editor":"boolean","default":false}', '"dark":{"editor":"boolean","default":true}').replace('"default":"escribiendo"', '"default":"adjuntos"')))

# ------------------------------ 2 · Ventana de 24 h ------------------------------
def wcell(label, note, inner, last_in):
    return f'''<div style="display:flex;flex-direction:column;gap:8px;min-width:0"><span class="lbl">{label}</span>
      <section class="card" style="display:flex;flex-direction:column;overflow:hidden;background:var(--bg)"><div class="thread" style="overflow:visible;padding:4px 18px 6px">{last_in}</div>{inner}</section>
      <span style="font-size:12px;color:var(--mut);line-height:1.45">{note}</span></div>'''
last = lambda t, time: msg('in', t, time, gap=True)
win_body = f'''<div class="{{{{themeCls}}}} bub-tinta" style="width:1440px;height:1000px;box-sizing:border-box;padding:40px 48px;background:var(--bg);color:var(--fg);font-family:Poppins,system-ui,sans-serif;display:flex;flex-direction:column;gap:22px">
  <div><span class="kick">La ventana de 24 h</span><h1 class="d" style="margin:6px 0 0;font-size:30px;font-weight:700;letter-spacing:-.02em">Saber antes de escribir si el mensaje va a salir</h1>
  <p style="margin:6px 0 0;font-size:13px;color:var(--fg2);max-width:900px;line-height:1.5">Se calcula con la misma regla del motor: el canal de la conversación y su último mensaje entrante (24 h en WhatsApp Cloud, Instagram y Messenger; WhatsApp Web no tiene ventana). No hace falta pedir nada al servidor por fila, y el reloj corre con el tick de un minuto.</p></div>
  <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px">
    {wcell('Abierta · WhatsApp Cloud', 'Una línea discreta, en StatePill. Cuenta lo que queda, no lo que pasó.', composer3('empty', 'open'), last('Perfecto, quedo atenta al link de pago', '9:40 a. m.'))}
    {wcell('Por cerrar · menos de 1 h', 'El punto pasa a ámbar y dice qué pasa después. No bloquea.', composer3('typing', 'soon'), last('Listo, mañana te confirmo', 'Ayer 10:02 a. m.'))}
    {wcell('Cerrada · WhatsApp Cloud', 'La caja se cambia por la razón y la salida: «Enviar plantilla» abre las acciones rápidas en Plantillas.', lock_window('closed_cloud'), last('Gracias, lo pienso y te escribo', 'Anteayer 7:40 a. m.'))}
    {wcell('Cerrada · Instagram o Messenger', 'Sin plantillas en estos canales: lo dice y no ofrece un botón que no sirve.', lock_window('closed_ig'), last('¿Siguen con la promo de Medellín?', 'Ayer 6:12 p. m.'))}
    {wcell('Canal desconectado', 'Sale del estado del canal que ya pinta la columna. Lleva al canal, no a un error al enviar.', lock_window('disconnected'), last('Hola, ¿tienen planes a San Andrés?', '9:31 a. m.'))}
    {wcell('WhatsApp Web · sin ventana', 'No hay línea: nada que avisar.', composer3('empty', 'none'), last('Te mando la foto del pasaporte', '9:05 a. m.'))}
  </div>
</div>'''
win_js = '''  renderVals() { const dark = this.props.dark === true; return { themeCls: dark ? 'dk' : 'lt' }; }'''
open(OUT + '/Ventana.dc.html', 'w').write(page('Inbox · La ventana de 24 h', 1440, 1000, win_body, win_js))

# ------------------------------ 3 · Adjuntos ------------------------------
drop = f'''<div class="drop" role="status" aria-live="polite"><span style="color:var(--fg)">{I["up"]}</span><span class="d" style="font-size:22px;font-weight:700">Suelta para adjuntar a Laura</span><span style="font-size:12.5px;color:var(--fg2)">Fotos hasta 5 MB · videos y audios hasta 16 MB · documentos hasta 26 MB</span></div>'''
rej = f'''<div class="note" role="alert" style="margin:0 4px;background:color-mix(in srgb,var(--bad) 10%,var(--card));color:var(--fg)"><span style="color:var(--bad);display:inline-flex">{I["alert"]}</span><span style="flex:1"><b>cotizacion-grupo.zip</b> no se puede enviar por WhatsApp. <b>video-drone.mov</b> pesa 48 MB y el máximo para videos es 16 MB.</span><button type="button" class="dlb" style="width:24px;height:24px" aria-label="Cerrar el aviso">{I["x"]}</button></div>'''
def acell(label, note, inner):
    return f'<div style="display:flex;flex-direction:column;gap:8px;min-width:0"><span class="lbl">{label}</span><section class="card" style="position:relative;height:330px;display:flex;flex-direction:column;justify-content:flex-end;overflow:hidden;background:var(--bg)">{inner}</section><span style="font-size:12px;color:var(--mut);line-height:1.45">{note}</span></div>'
att_body = f'''<div class="{{{{themeCls}}}} bub-tinta" style="width:1440px;height:1000px;box-sizing:border-box;padding:40px 48px;background:var(--bg);color:var(--fg);font-family:Poppins,system-ui,sans-serif;display:flex;flex-direction:column;gap:22px">
  <div><span class="kick">Adjuntos</span><h1 class="d" style="margin:6px 0 0;font-size:30px;font-weight:700;letter-spacing:-.02em">Lo que vas a enviar, a la vista y dentro de la caja</h1></div>
  <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px">
    {acell('Miniaturas de 56 px dentro de la caja · listo, subiendo, documento y fallo con reintento', 'La subida no promete porcentaje: el cliente HTTP no lo reporta, así que el anillo es indeterminado. Quitar y reintentar son objetivos de 24 px o más.', composer3('attach'))}
    {acell('Arrastrar un archivo sobre la conversación', 'Arrastrar y pegar una captura (Ctrl+V) entran por la misma cola que el clip. El velo dice los límites antes de soltar.', '<div class="thread" style="flex:1;overflow:hidden">' + msg('in', 'Perfecto, quedo atenta al link de pago', '9:40 a. m.', gap=True) + '</div>' + composer3('empty') + drop)}
    {acell('Lo que no se puede enviar se dice en la caja, junto al resto', 'Hoy es un toast por archivo que se va solo. Aquí queda hasta cerrarlo y nombra el límite real (el mismo espejo de media_kinds del servidor).', '<div class="comp3" style="padding-bottom:0">' + rej + '</div>' + composer3('attach').replace('<div class="comp3">', '<div class="comp3" style="padding-top:4px">'))}
    {acell('Sin tiempo real', 'StatePill en vez del texto ámbar de 10 px. Enviar sigue funcionando por HTTP.', composer3('typing', 'open').replace('<span class="hint">', f'<span class="spill"><span style="display:inline-flex;color:var(--warn)">{I["wifi"]}</span>Sin tiempo real · se envía por HTTP</span><span class="hint">'))}
  </div>
</div>'''
open(OUT + '/Adjuntos.dc.html', 'w').write(page('Inbox · Adjuntos', 1440, 1000, att_body, win_js))

# ------------------------------ 4 · Nota de voz ------------------------------
voice_body = f'''<div class="{{{{themeCls}}}} bub-tinta" style="width:1440px;height:1000px;box-sizing:border-box;padding:40px 48px;background:var(--bg);color:var(--fg);font-family:Poppins,system-ui,sans-serif;display:flex;flex-direction:column;gap:22px">
  <div><span class="kick">Nota de voz</span><h1 class="d" style="margin:6px 0 0;font-size:30px;font-weight:700;letter-spacing:-.02em">Grabar, escuchar y enviar sin salir de la caja</h1></div>
  <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px">
    {acell('Grabando · el nivel es el del micrófono de verdad', 'Las barras salen de un AnalyserNode sobre el mismo stream que ya abre el grabador; no es una onda decorativa. Tiempo en tabular-nums y Descartar en rojo a la izquierda, lejos de Detener.', composer3('rec'))}
    {acell('Lista · escúchala antes de enviarla', 'El mismo reproductor de las burbujas. Enviar en coral; descartar pide nada más (se puede volver a grabar).', composer3('preview'))}
    {acell('Micrófono bloqueado', 'El micrófono se queda visible pero dice por qué no graba, en StatePill, no en 10 px ámbar.', composer3('empty').replace('<div class="cmeta">', f'<div class="cmeta"><span class="spill"><span style="display:inline-flex;color:var(--warn)">{I["micoff"]}</span>Micrófono bloqueado · permítelo en el candado de la barra de direcciones</span>'))}
    {acell('Enviándose · la burbuja optimista aparece al instante', 'La nota sale en el hilo con su duración mientras sube; si falla, «No se envió · Reintentar» como en F2.', '<div class="thread" style="flex:1;overflow:hidden;padding-top:18px">' + who('Tú', right=True) + bmsg('out', audio('out', 0, False, '0:00 / 0:14'), '9:44 a. m.') + '<div style="display:flex;justify-content:flex-end;margin-top:4px;font-size:11px;color:var(--mut)">Enviando…</div></div>' + composer3('empty'))}
  </div>
</div>'''
open(OUT + '/Voz.dc.html', 'w').write(page('Inbox · Nota de voz', 1440, 1000, voice_body, win_js))

# ------------------------------ 5 · Acciones rápidas ------------------------------
qa_body = f'''<div class="{{{{themeCls}}}} bub-tinta" style="width:1440px;height:1000px;box-sizing:border-box;padding:40px 48px;background:var(--bg);color:var(--fg);font-family:Poppins,system-ui,sans-serif;display:flex;flex-direction:column;gap:22px">
  <div><span class="kick">Acciones rápidas</span><h1 class="d" style="margin:6px 0 0;font-size:30px;font-weight:700;letter-spacing:-.02em">Buscar, ver lo que sale y enviarlo, en un solo lugar</h1>
  <p style="margin:6px 0 0;font-size:13px;color:var(--fg2);max-width:960px;line-height:1.5">El popover flota en cristal (flota sobre el hilo, por eso es cristal). A la izquierda, el buscador y los grupos; a la derecha, la vista previa con el mismo componente del hilo. Se abre con el rayo o con «/» al principio de la caja. Enviar sale del popover: desaparece el modal de confirmación de hoy.</p></div>
  <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px">
    <div style="display:flex;flex-direction:column;gap:8px"><span class="lbl">Dentro de la ventana</span><div style="position:relative;height:470px">{qa_popover(False, "qa glass").replace('class="qa glass"', 'class="qa glass" style="position:relative;left:0;bottom:0;width:100%;height:100%;animation:none"')}</div></div>
    <div style="display:flex;flex-direction:column;gap:8px"><span class="lbl">Fuera de la ventana · se abre en Plantillas y lo demás se explica</span><div style="position:relative;height:470px">{qa_popover(True, "qa glass").replace('class="qa glass"', 'class="qa glass" style="position:relative;left:0;bottom:0;width:100%;height:100%;animation:none"')}</div></div>
  </div>
</div>'''
open(OUT + '/Acciones.dc.html', 'w').write(page('Inbox · Acciones rápidas', 1440, 1000, qa_body, win_js))

# ------------------------------ 6 · Medios (claro y oscuro lado a lado) ------------------------------
def mcol(theme, label):
    return f'''<div style="display:flex;flex-direction:column;gap:8px;min-width:0;min-height:0"><span class="lbl" style="color:#6B6B73">{label}</span>
      <section class="{theme} bub-tinta" style="flex:1;min-height:0;border-radius:24px;overflow:hidden;border:1px solid var(--line);background:var(--bg);color:var(--fg);display:grid;grid-template-columns:1fr 1fr"><div class="thread" style="overflow:hidden;padding:4px 10px 18px 16px">{media_a()}</div><div class="thread" style="overflow:hidden;padding:4px 16px 18px 10px">{media_b()}</div></section></div>'''
med_body = f'''<div style="width:1440px;height:1300px;box-sizing:border-box;padding:40px 48px;background:#F5F5F7;color:#0B0B0E;font-family:Poppins,system-ui,sans-serif;display:flex;flex-direction:column;gap:18px">
  <div><span class="kick" style="color:#6B6B73">Burbujas de media</span><h1 class="d" style="margin:6px 0 0;font-size:30px;font-weight:700;letter-spacing:-.02em">Cada medio con su forma, y nada salta al cargar</h1>
  <p style="margin:6px 0 0;font-size:13px;color:#3A3A40;max-width:1000px;line-height:1.5">Foto y video reservan su proporción antes de cargar (la silueta tiene el mismo tamaño). El reproductor usa los colores de la burbuja: hoy es blanco fijo y en oscuro, con la burbuja en tinta clara, desaparece. La transcripción se pliega. El documento es una ficha con su extensión; la ubicación, una ficha que abre Maps (no hay proveedor de mapas estáticos, así que no se inventa uno).</p></div>
  <div style="flex:1;min-height:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px">{mcol("lt", "Claro")}{mcol("dk", "Oscuro")}</div>
</div>'''
open(OUT + '/Medios.dc.html', 'w').write(page('Inbox · Burbujas de media', 1440, 1300, med_body, '  renderVals() { return {}; }'))

# ------------------------------ 7 · Visor ------------------------------
lbx = f'''<div class="lbx" role="dialog" aria-modal="true" aria-label="Foto 2 de 4 · de Laura Gómez">
  <div style="display:flex;align-items:center;gap:12px;padding:18px 22px">
    <span class="av" style="width:36px;height:36px;background:rgba(255,255,255,.12);color:#fff">LG</span>
    <span style="display:flex;flex-direction:column;min-width:0"><span style="font-size:14px;font-weight:600">Laura Gómez</span><span style="font-size:12px;opacity:.7" class="tnum">Hoy 9:12 a. m. · IMG_4471.jpg · 1,8 MB</span></span>
    <span style="flex:1"></span><span class="tnum" style="font-size:13px;opacity:.8;margin-right:6px">2 de 4</span>
    <button type="button" class="lbt">{I["dl"]}Descargar</button>
    <button type="button" class="lbb" aria-label="Cerrar el visor (Esc)">{I["x16"]}</button>
  </div>
  <div style="flex:1;min-height:0;display:flex;align-items:center;gap:22px;padding:0 22px">
    <button type="button" class="lbb" aria-label="Foto anterior (←)">{I["left"]}</button>
    <div style="flex:1;min-height:0;height:100%;display:flex;align-items:center;justify-content:center"><div class="photo" style="height:100%;max-height:640px;aspect-ratio:4/3;border-radius:18px;box-shadow:0 40px 90px -40px rgba(0,0,0,.9)"></div></div>
    <button type="button" class="lbb" aria-label="Foto siguiente (→)">{I["right"]}</button>
  </div>
  <p style="margin:14px 0 0;text-align:center;font-size:13px;opacity:.85">¿Este es el hotel? Me lo mandó mi hermana 😍</p>
  <div class="film" role="group" aria-label="Fotos de la conversación"><span class="photo3"></span><span class="photo on"></span><span class="photo2"></span><span class="photo4"></span></div>
</div>'''
vis_body = desktop(rail('mine') + list_col('Contigo', '5 contigo', '{{rows}}', dot=False) + laura_conv(composer3('empty')) + ctx_rail() + lbx, 'bub-tinta').replace('<div class="app {{themeCls}} bub-tinta">', '<div class="app {{themeCls}} bub-tinta" style="position:relative">')
open(OUT + '/Visor.dc.html', 'w').write(page('Inbox · Visor de fotos', 1440, 1000, vis_body, rows_js(['laura', 'andres'])))

# ------------------------------ 8 · Celular ------------------------------
def mob(inner_comp, overlay='', thread=None):
    th = thread if thread is not None else recent_thread()
    return f'''<div class="{{{{themeCls}}}} bub-tinta" style="width:390px;height:844px;overflow:hidden;display:flex;flex-direction:column;font-family:Poppins,system-ui,sans-serif;color:var(--fg);background:var(--bg);position:relative">
  <section class="conv" style="min-height:0">{head('Laura Gómez','LG','Contigo · WhatsApp','',f'<button type="button" class="btn btn-ink" style="height:40px;padding:0 14px">{I["check"]}Cerrar</button>' + more(), True)}
  <div class="thread" style="padding:4px 12px 12px;display:flex;flex-direction:column">{th}</div>{inner_comp}</section>{overlay}</div>'''
mob_comp = lambda m: composer3(m).replace('<div class="comp3">', '<div class="comp3" style="padding:6px 10px 12px">').replace(hint(), '')
sheet = f'''<div class="scrim"></div><div class="bsheet glass" role="dialog" aria-label="Acciones rápidas"><span class="grab" aria-hidden="true"></span>
  <div class="qas" style="margin:4px 14px 6px">{I["search"]}<span style="color:var(--mut)">Buscar acción…</span></div>
  <div style="overflow-y:auto;min-height:0">
  <div class="qag">Respuestas rápidas</div>
  <div class="qai" style="min-height:44px">{I["msg"]}<span style="display:flex;flex-direction:column;min-width:0;flex:1"><span>Link de pago</span><span class="ds">Te comparto el link de pago de tu reserva…</span></span></div>
  <div class="qai" style="min-height:44px">{I["msg"]}<span style="display:flex;flex-direction:column;min-width:0;flex:1"><span>Datos para transferencia</span><span class="ds">Bancolombia · cuenta de ahorros…</span></span></div>
  <div class="qag">Recursos</div>
  <div class="qai" style="min-height:44px">{I["file"]}<span style="display:flex;flex-direction:column;min-width:0;flex:1"><span>Catálogo Santa Marta 2026</span><span class="ds">PDF con planes y precios · 3 archivos</span></span></div>
  <div class="qag">Plantillas de WhatsApp</div>
  <div class="qai" style="min-height:44px">{I["tpl"]}<span style="display:flex;flex-direction:column;min-width:0;flex:1"><span>seguimiento_cotizacion</span><span class="ds">es_CO · aprobada por Meta</span></span></div>
  </div><p style="margin:10px 16px 0;font-size:11.5px;color:var(--mut)">Tocar una acción muestra su vista previa antes de enviar.</p></div>'''
cel_js = '''  renderVals() { const dark = this.props.dark === true; return { themeCls: dark ? 'dk' : 'lt' }; }'''
open(OUT + '/Movil.dc.html', 'w').write(page('Inbox · Celular · escribir', 390, 844, mob(mob_comp('attach')), cel_js))
open(OUT + '/MovilAcciones.dc.html', 'w').write(page('Inbox · Celular · acciones rápidas', 390, 844, mob(mob_comp('empty'), sheet), cel_js))

# ------------------------------ canvas ------------------------------
boards = [
    ('Main.dc.html', '1 · Escribir — un solo bloque, la ventana arriba y el envío en coral (interactivo: estados del composer)', 1440, 1000, 0, 0, True),
    ('Ventana.dc.html', '2 · La ventana de 24 h — abierta, por cerrar, cerrada, Instagram, desconectado y WhatsApp Web', 1440, 1000, 1520, 0, False),
    ('Acciones.dc.html', '3 · Acciones rápidas — buscar, ver lo que sale y enviar en el mismo popover', 1440, 1000, 3040, 0, False),
    ('Adjuntos.dc.html', '4 · Adjuntos — miniaturas en la caja, arrastrar y pegar, y lo que no se puede enviar', 1440, 1000, 0, 1420, False),
    ('Voz.dc.html', '5 · Nota de voz — grabando con el nivel real, escuchar y enviar', 1440, 1000, 1520, 1420, False),
    ('Medios.dc.html', '6 · Burbujas de media — claro y oscuro, sin saltos al cargar', 1440, 1300, 3040, 1420, False),
    ('Visor.dc.html', '7 · Visor — cristal oscuro, flechas, tira de fotos y descarga', 1440, 1000, 0, 3140, False),
    ('Oscuro.dc.html', '8 · Escribir — oscuro (interactivo)', 1440, 1000, 1520, 3140, True),
    ('Movil.dc.html', '9 · Celular — escribir con adjuntos', 390, 844, 3040, 3140, False),
    ('MovilAcciones.dc.html', '10 · Celular — acciones rápidas en hoja inferior', 390, 844, 3510, 3140, False),
]
canvas = {
    'v': 3, 'attachments': {}, 'boards': {}, 'createdOnFiles': {'at': '2026-09-27T12:00:00Z', 'v': 1}, 'designSystems': [],
    'launch': {'view': 'canvas'},
    'notes': {
        'rowA': {'kind': 'title1', 'maxW': 4480, 'text': 'Escribir', 'w': 240, 'x': 0, 'y': -300},
        'rowB': {'kind': 'title1', 'maxW': 4480, 'text': 'Adjuntos, voz y medios', 'w': 240, 'x': 0, 'y': 1120},
        'rowC': {'kind': 'title1', 'maxW': 4480, 'text': 'Visor, oscuro y celular', 'w': 240, 'x': 0, 'y': 2840},
    },
    'order': [b[0] for b in boards], 'pages': [], 'title': 'Inbox premium · F3 Escribir y medios',
}
for f, t, w, h, x, y, inter in boards:
    canvas['boards'][f] = {'h': h, 'title': t, 'w': w, 'x': x, 'y': y, **({'is_interactive': True} if inter else {})}
json.dump(canvas, open(OUT + '/canvas.json', 'w'), ensure_ascii=False, indent=2)
print('ok', sorted(os.listdir(OUT)))
