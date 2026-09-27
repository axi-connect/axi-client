import os
R=os.path.dirname(os.path.abspath(__file__))+'/..'
H=open(R+'/helmet.txt').read()
ROW=open(R+'/rowtpl.txt').read()
JS=open(R+'/build/rows.js').read()
EXTRA_CSS='''
.sk{background:var(--track);border-radius:8px;display:block}
.cell{display:flex;flex-direction:column;min-height:0;overflow:hidden}
.scrim{position:absolute;inset:0;background:rgba(0,0,0,.40)}
.drawer{color:#0B0B0E;--mut:#5F5F68;--fg2:#3A3A40;--chip:rgba(11,11,14,.06);background:linear-gradient(160deg,rgba(255,255,255,.90),rgba(248,248,250,.82));-webkit-backdrop-filter:blur(24px) saturate(180%);backdrop-filter:blur(24px) saturate(180%);box-shadow:0 1px 2px rgba(0,0,0,.06),0 16px 48px rgba(0,0,0,.16)}
.rail{width:64px;flex-shrink:0;box-sizing:border-box;padding:14px 0;display:flex;flex-direction:column;align-items:center;gap:6px;border-right:1px solid var(--line);background:var(--side)}
.rb{position:relative;width:40px;height:40px;border-radius:12px;border:0;background:transparent;color:var(--fg2);display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
.rb-on{background:var(--chip);color:var(--fg)}
.rb .c{position:absolute;top:2px;right:0;min-width:16px;height:16px;padding:0 4px;box-sizing:border-box;border-radius:999px;background:var(--fg);color:var(--bg);font:600 10px Poppins,sans-serif;display:inline-flex;align-items:center;justify-content:center;font-variant-numeric:tabular-nums}
.rb .s{position:absolute;right:5px;bottom:5px;width:8px;height:8px;border-radius:9px;box-shadow:0 0 0 2px var(--side)}
'''
H=H.replace('</style>',EXTRA_CSS+'</style>')
def rows(listname):
    return ROW.replace('{{rows}}',listname)
def page(title,w,h,body,script,props='{"dark":{"editor":"boolean","default":false}'):
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
<script type="text/x-dc" data-dc-script data-props='{props},"$preview":{{"width":{w},"height":{h}}}}}'>
class Component extends DCLogic {{
  renderVals() {{
    const dark = this.props.dark === true;
{JS}
{script}
  }}
}}
</script>
</body>
</html>
'''
ICON={
'q':'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="13" r="8"></circle><path d="M12 9v4l2.5 2.5M9 2h6"></path></svg>',
'm':'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="8" r="4"></circle><path d="M4 21a8 8 0 0 1 16 0"></path></svg>',
'a':'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ai)" stroke-width="1.8" aria-hidden="true"><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"></path></svg>',
'o':'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 13h5l2 3h4l2-3h5"></path><path d="M5.5 5h13L21 13v6H3v-6z"></path></svg>',
'c':'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m2 13 4 4 8-9M10 16l1 1 8-9"></path></svg>',
'wa':'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 21l1.6-4.6A8.5 8.5 0 1 1 8 19.6z"></path></svg>',
'ig':'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"></rect><circle cx="12" cy="12" r="4"></circle></svg>',
'ms':'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 3C6.9 3 3 6.7 3 11.4c0 2.6 1.2 4.9 3.2 6.4V21l3-1.6c.9.2 1.8.4 2.8.4 5.1 0 9-3.7 9-8.4S17.1 3 12 3z"></path></svg>',
'search':'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>',
'sort':'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M7 4v16M3 8l4-4 4 4M17 20V4M13 16l4 4 4-4"></path></svg>',
'filter':'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"></path><circle cx="16" cy="6" r="2"></circle><circle cx="10" cy="12" r="2"></circle><circle cx="18" cy="18" r="2"></circle></svg>',
'menu':'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"></rect><path d="M9 4v16"></path></svg>',
'plus':'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg>',
'x':'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"></path></svg>',
}
def listhead(title,sub,dot=True,pad='18px 16px 12px',seg=False):
    d='<span class="dot" style="background:var(--warn)"></span>' if dot else ''
    segm=''
    if seg:
        segm=('<div class="seg" role="radiogroup" aria-label="Vistas del inbox">'
          f'<button type="button" role="radio" aria-checked="true" class="sg sg-on">{ICON["q"]}<span>En cola</span></button>'
          f'<button type="button" role="radio" aria-checked="false" aria-label="Contigo" class="sg">{ICON["m"]}</button>'
          f'<button type="button" role="radio" aria-checked="false" aria-label="Axi atiende" class="sg">{ICON["a"]}</button>'
          f'<button type="button" role="radio" aria-checked="false" aria-label="Todas abiertas" class="sg">{ICON["o"]}</button>'
          f'<button type="button" role="radio" aria-checked="false" aria-label="Cerradas" class="sg">{ICON["c"]}</button></div>')
    return f'''<div style="padding:{pad};display:flex;flex-direction:column;gap:12px;border-bottom:1px solid var(--line)">
  <div style="display:flex;align-items:flex-start;gap:4px">
    <div style="min-width:0;flex:1"><h1 class="d" style="margin:0;font-size:26px;font-weight:700;letter-spacing:-.02em;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{title}</h1>
    <p style="margin:4px 0 0;font-size:12.5px;color:var(--fg2);display:flex;align-items:center;gap:7px;min-width:0">{d}<span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{sub}</span></p></div>
    <button type="button" class="icb" aria-label="Ordenar">{ICON["sort"]}</button><button type="button" class="icb" aria-label="Filtros">{ICON["filter"]}</button>
  </div>
  <div class="srch">{ICON["search"]}Buscar por nombre, teléfono o mensaje</div>
  {segm}
</div>'''
NAV=open(R+'/project/Main.dc.html').read()
a=NAV.index('<aside class="side"'); b=NAV.index('</aside>')+len('</aside>')
NAV=NAV[a:b].replace('{{unreadTotal}}','7')

# ---------- Filas ----------
def cellrow(label,listname):
    return f'<div style="display:flex;flex-direction:column;gap:8px;min-width:0"><span class="lbl">{label}</span><div class="card" style="padding:6px;border-radius:18px">{rows(listname)}</div></div>'
filas_body=f'''<div class="{{{{themeCls}}}}" style="width:1200px;height:1000px;box-sizing:border-box;padding:40px 48px;background:var(--bg);color:var(--fg);display:grid;grid-template-columns:340px minmax(0,1fr);gap:40px;font-family:Poppins,system-ui,sans-serif">
  <section class="card" style="display:flex;flex-direction:column;min-height:0;overflow:hidden" aria-label="Todas abiertas">
    {listhead("Todas abiertas","24 abiertas · 12 con Axi, 9 con el equipo, 3 en cola",dot=False)}
    <div class="scr" style="flex-grow:1;min-height:0;padding:6px">{rows("{{all}}")}</div>
  </section>
  <div style="display:flex;flex-direction:column;gap:22px;min-width:0">
    <div><span class="kick">La fila</span><h1 class="d" style="margin:6px 0 0;font-size:30px;font-weight:700;letter-spacing:-.02em">Quién la tiene, desde cuándo y cuánto falta leer</h1>
    <p style="margin:6px 0 0;font-size:13.5px;color:var(--mut);max-width:620px">La tercera línea solo aparece cuando dice algo: la espera en la cola, cuándo se cerró, o quién atiende cuando la vista mezcla. La prioridad es un punto antes del nombre.</p></div>
    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px 24px">
      <div style="display:flex;flex-direction:column;gap:8px;min-width:0"><span class="lbl">Seleccionada · anillo neutro</span><div class="card" style="padding:6px;border-radius:18px"><div style="border-radius:14px;background:var(--chip);box-shadow:inset 0 0 0 1.5px var(--fg)">{rows("{{one}}")}</div></div></div>
      <div style="display:flex;flex-direction:column;gap:8px;min-width:0"><span class="lbl">Con el foco del teclado</span><div class="card" style="padding:6px;border-radius:18px"><div style="border-radius:14px;box-shadow:0 0 0 3px rgba(230,87,89,.45)">{rows("{{one}}")}</div></div></div>
      {cellrow("Contador en tinta · recomendado (D2)","{{tinta}}")}
      {cellrow("Contador en coral · como hoy","{{coral}}")}
      {cellrow("Nombre y mensaje largos · se cortan con «…», el total en el título","{{long}}")}
      {cellrow("Cerrada · atenuada, con cuándo","{{closed}}")}
    </div>
    <div style="display:flex;flex-direction:column;gap:8px;min-width:0;max-width:420px"><span class="lbl">Hoy · para comparar</span>
      <div class="card" style="padding:6px;border-radius:18px"><div style="position:relative;display:flex;gap:12px;padding:11px 12px;border-radius:14px">
        <span style="position:absolute;left:0;top:12px;bottom:12px;width:2px;border-radius:2px;background:var(--bad)"></span>
        <span class="av">MR</span>
        <span style="display:flex;flex-direction:column;gap:3px;min-width:0;flex:1"><span style="display:flex;gap:6px"><span class="nm" style="font-weight:600;font-size:13.5px">Mariana Restrepo Villegas</span><span style="font-size:11px;color:var(--brand);font-weight:500">9:28 a. m.</span></span>
        <span style="display:flex;gap:6px;align-items:center"><span class="pv" style="color:var(--fg);font-size:12px">Hola, ¿me pueden pasar con una persona? Es por el reembolso</span><span class="ub ub-coral">3</span></span>
        <span style="font-size:11px;color:var(--warn)">En cola · 14 min</span></span></div></div>
    </div>
  </div>
</div>'''
filas_js='''    const coral = false;
    return {
      themeCls: dark ? 'dk' : 'lt',
      all: ['mariana', 'hotel', 'laura', 'valen', 'julian', 'pedro', 'ricardo', 'dani', 'andres'].map((k) => mkRow(k, true, coral)),
      one: [mkRow('laura', true, coral)],
      tinta: [mkRow('julian', false, false)],
      coral: [mkRow('julian', false, true)],
      long: [mkRow('hotel', false, coral)],
      closed: [mkRow('jp', false, coral)]
    };'''
open(R+'/project/Filas.dc.html','w').write(page('Inbox · La fila',1200,1000,filas_body,filas_js))

# ---------- Portatil 1024 ----------
def railbtn(icon,label,on=False,count=None,status=None):
    c=f'<span class="c">{count}</span>' if count else ''
    s=f'<span class="s" style="background:{status}"></span>' if status else ''
    return f'<button type="button" class="rb {"rb-on" if on else ""}" aria-label="{label}" title="{label}">{ICON[icon]}{c}{s}</button>'
nav1024=NAV.replace('width:248px','width:256px') if 'width:248px' in NAV else NAV
port_body=f'''<div class="app {{{{themeCls}}}}" style="width:1024px;height:768px">
  <aside class="side" aria-label="Menú principal" style="width:200px">
    <div style="display:flex;align-items:center;gap:10px;padding:4px 8px 14px"><svg width="26" height="26" viewBox="0 0 28 28" aria-hidden="true"><circle cx="11" cy="15" r="7.5" fill="none" stroke="#D13F42" stroke-width="4"></circle><path d="M16 5 L25 24" stroke="#F2A93B" stroke-width="4" stroke-linecap="round"></path><path d="M25 5 L17 20" stroke="#7B5CF0" stroke-width="4" stroke-linecap="round"></path></svg><span style="font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">JuanitoXpeditions</span></div>
    <a class="nav" href="#">Dashboard</a><a class="nav" href="#">CMO</a><a class="nav" href="#">CRM</a><a class="nav nav-on" href="#" aria-current="page">Inbox<span style="margin-left:auto;font-size:12px">7</span></a><a class="nav" href="#">Agenda</a><a class="nav" href="#">Ventas</a><a class="nav" href="#">Comercial</a>
  </aside>
  <main style="flex-grow:1;display:flex;flex-direction:column;min-width:0;min-height:0">
    <header style="height:52px;display:flex;align-items:center;gap:12px;padding:0 16px 0 20px;flex-shrink:0;border-bottom:1px solid var(--line)"><span style="font-size:13px;color:var(--mut)">Workspace</span><span style="font-size:13px;color:var(--mut)">/</span><span style="font-size:13px;font-weight:500">Inbox</span></header>
    <div style="display:flex;flex-grow:1;min-height:0">
      <nav class="rail" aria-label="Vistas y canales">
        {railbtn("q","En cola · 3",True,"3")}{railbtn("m","Contigo · 5",False,"5")}{railbtn("a","Axi atiende · 12")}{railbtn("o","Todas abiertas · 24")}{railbtn("c","Cerradas")}
        <span style="width:28px;height:1px;background:var(--line2);margin:6px 0"></span>
        {railbtn("wa","WhatsApp Ventas · conectado",status="var(--ok)")}{railbtn("ig","Instagram · conectado",status="var(--ok)")}{railbtn("wa","WhatsApp Soporte · escanea el QR",status="var(--warn)")}{railbtn("ms","Messenger · desconectado",status="var(--bad)")}
      </nav>
      <section class="list" style="width:300px" aria-label="Conversaciones">
        {listhead("En cola","3 esperan · la más antigua hace 14 min",pad="16px 14px 12px")}
        <div class="scr" style="flex-grow:1;min-height:0;padding:6px">{rows("{{queue}}")}</div>
      </section>
      <section class="scr" style="flex-grow:1;min-width:0;min-height:0;padding:24px 22px;box-sizing:border-box" aria-label="Tu día en el inbox">
        <div style="display:flex;flex-direction:column;gap:14px">
          <div><span class="kick">Hoy · viernes 26 sep</span><h2 class="d" style="margin:6px 0 0;font-size:26px;font-weight:700;letter-spacing:-.02em;line-height:1.05">Tu día en el inbox</h2></div>
          <article class="isl {{{{islCls}}}}" style="padding:18px 18px;display:flex;flex-direction:column;gap:12px" aria-label="Lo próximo">
            <div style="display:flex;flex-direction:column;gap:6px;min-width:0"><span class="kick">Lo próximo</span><span class="d" style="font-size:30px;font-weight:700;line-height:1">3 esperan</span><span style="font-size:12.5px;color:var(--fg2);line-height:1.45">La que más lleva: Mariana Restrepo Villegas · WhatsApp Ventas · hace 14 min.</span></div>
            <div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn btn-ink">Atender a Mariana</button><button type="button" class="btn btn-glass">Ver quién sigue</button></div>
          </article>
          <article class="card tile"><span class="lbl">Entraron hoy</span><div style="display:flex;align-items:baseline;gap:10px"><span class="fig" style="font-size:34px">42</span><span style="font-size:12.5px;color:var(--fg2)">conversaciones nuevas</span></div>
            <div style="display:flex;align-items:flex-end;gap:3px;height:44px" aria-hidden="true"><sc-for list="{{{{bars}}}}" as="b" hint-placeholder-count="24"><span style="flex:1;border-radius:3px;background:var(--fg);opacity:{{{{b.o}}}};height:{{{{b.h}}}}"></span></sc-for></div></article>
          <article class="card tile"><span class="lbl">Resueltas hoy</span><span class="fig" style="font-size:34px">31</span><div class="track" aria-hidden="true"><span style="width:74%;background:var(--fg)"></span><span style="width:26%;background:var(--fg);opacity:.3"></span></div><div style="display:flex;justify-content:space-between;font-size:12.5px;color:var(--fg2)"><span>Axi · 74 %</span><span>Equipo · 26 %</span></div></article>
          <article class="card tile"><span class="lbl">Abiertas ahora</span><span class="fig" style="font-size:34px">24</span><span style="font-size:12.5px;color:var(--fg2)">12 con Axi · 9 con el equipo · 3 en cola</span></article>
        </div>
      </section>
    </div>
  </main>
</div>'''
port_js='''    const series = [0, 0, 0, 0, 0, 1, 2, 4, 6, 9, 7, 5, 4, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    return {
      themeCls: dark ? 'dk' : 'lt', islCls: dark ? 'isl-dark' : 'isl-glass',
      queue: ['mariana', 'julian', 'hotel'].map((k) => mkRow(k, false, false)),
      bars: series.map((n, i) => ({ h: Math.max(3, Math.round((n / 9) * 44)) + 'px', o: i === 9 ? 1 : i > 9 ? 0.08 : 0.28 }))
    };'''
open(R+'/project/Portatil.dc.html','w').write(page('Inbox · Portátil 1024',1024,768,port_body,port_js))

# ---------- Movil ----------
mobile_list=f'''<div style="display:flex;flex-direction:column;height:100%;min-height:0;background:var(--card)">
    <div style="padding:14px 14px 12px;display:flex;flex-direction:column;gap:12px;border-bottom:1px solid var(--line)">
      <div style="display:flex;align-items:center;gap:4px">
        <button type="button" class="icb" aria-label="Abrir vistas y canales" style="width:44px;height:44px;margin-left:-6px">{ICON["menu"]}</button>
        <div style="min-width:0;flex:1"><h1 class="d" style="margin:0;font-size:24px;font-weight:700;letter-spacing:-.02em;line-height:1.1">En cola</h1><p style="margin:2px 0 0;font-size:12.5px;color:var(--fg2);display:flex;align-items:center;gap:6px;min-width:0"><span class="dot" style="background:var(--warn)"></span><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">3 esperan · la más antigua hace 14 min</span></p></div>
        <button type="button" class="icb" aria-label="Filtros" style="width:44px;height:44px">{ICON["filter"]}</button>
      </div>
      <div class="srch" style="height:42px">{ICON["search"]}Buscar</div>
      <div class="seg" role="radiogroup" aria-label="Vistas del inbox" style="justify-content:space-between">
        <button type="button" role="radio" aria-checked="true" class="sg sg-on" style="height:36px">{ICON["q"]}<span>En cola · 3</span></button>
        <button type="button" role="radio" aria-checked="false" aria-label="Contigo, 5" class="sg" style="height:36px;min-width:44px">{ICON["m"]}</button>
        <button type="button" role="radio" aria-checked="false" aria-label="Axi atiende, 12" class="sg" style="height:36px;min-width:44px">{ICON["a"]}</button>
        <button type="button" role="radio" aria-checked="false" aria-label="Todas abiertas, 24" class="sg" style="height:36px;min-width:44px">{ICON["o"]}</button>
        <button type="button" role="radio" aria-checked="false" aria-label="Cerradas" class="sg" style="height:36px;min-width:44px">{ICON["c"]}</button>
      </div>
    </div>
    <div class="scr" style="flex-grow:1;min-height:0;padding:10px 8px">
      <article class="isl {{{{islCls}}}}" style="padding:14px 14px 14px 16px;display:flex;align-items:center;gap:12px;margin:0 2px 8px;border-radius:20px" aria-label="Lo próximo">
        <div style="min-width:0;flex:1;display:flex;flex-direction:column;gap:2px"><span class="kick" style="font-size:10.5px">Lo próximo</span><span style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Mariana · hace 14 min</span></div>
        <button type="button" class="btn btn-ink" style="height:44px">Atender</button>
      </article>
      {rows("{{queue}}")}
    </div>
  </div>'''
movil_body=f'''<div class="{{{{themeCls}}}}" style="width:390px;height:844px;overflow:hidden;font-family:Poppins,system-ui,sans-serif;color:var(--fg);background:var(--card)">
  {mobile_list}
</div>'''
movil_js='''    return {
      themeCls: dark ? 'dk' : 'lt', islCls: dark ? 'isl-dark' : 'isl-glass',
      queue: ['mariana', 'julian', 'hotel'].map((k) => mkRow(k, false, false))
    };'''
open(R+'/project/Movil.dc.html','w').write(page('Inbox · Celular',390,844,movil_body,movil_js))

def dvw(icon,label,count,on=False):
    return f'<button type="button" class="vw {"vw-on" if on else ""}" style="height:44px" aria-pressed="{"true" if on else "false"}">{ICON[icon]}<span>{label}</span><span class="n">{count}</span></button>'
def dch(icon,name,color,sub=None):
    s=f'<span style="font-size:11.5px;color:var(--mut)">{sub}</span>' if sub else ''
    return f'<a class="chn" href="#" style="min-height:44px">{ICON[icon]}<span style="flex:1;min-width:0;display:flex;flex-direction:column"><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{name}</span>{s}</span><span class="dot" style="background:{color}"></span></a>'
mc_body=f'''<div class="{{{{themeCls}}}}" style="position:relative;width:390px;height:844px;overflow:hidden;font-family:Poppins,system-ui,sans-serif;color:var(--fg);background:var(--card)">
  {mobile_list}
  <div class="scrim" aria-hidden="true"></div>
  <nav class="drawer scr" aria-label="Vistas y canales" style="position:absolute;left:0;top:0;bottom:0;width:304px;border-radius:0 24px 24px 0;padding:16px 12px;box-sizing:border-box;display:flex;flex-direction:column;gap:2px">
    <div style="display:flex;align-items:center;justify-content:space-between;padding:0 4px 10px 10px"><span class="d" style="font-size:20px;font-weight:700">Inbox</span><button type="button" class="icb" aria-label="Cerrar" style="width:44px;height:44px">{ICON["x"]}</button></div>
    <span class="kick" style="padding:4px 10px 6px">Bandeja</span>
    {dvw("q","En cola","3",True)}{dvw("m","Contigo","5")}{dvw("a","Axi atiende","12")}{dvw("o","Todas abiertas","24")}{dvw("c","Cerradas","")}
    <span class="kick" style="padding:18px 10px 6px">Canales · 4</span>
    {dch("wa","WhatsApp Ventas","var(--ok)")}{dch("ig","Instagram @juanitoxpeditions","var(--ok)")}{dch("wa","WhatsApp Soporte","var(--warn)","Escanea el QR para conectar")}{dch("ms","Messenger","var(--bad)","Desconectado · reconectar")}
    <a class="chn" href="#" style="min-height:44px;color:var(--mut)">{ICON["plus"]}Conectar canal</a>
  </nav>
</div>'''
open(R+'/project/MovilCanales.dc.html','w').write(page('Inbox · Celular · canales',390,844,mc_body,movil_js))

# ---------- Estados ----------
def skel_rows(n):
    out=''
    ws=['78%','62%','84%','56%','70%','64%']
    for i in range(n):
        out+=f'<div style="display:flex;gap:12px;padding:11px 12px"><span class="sk" style="width:40px;height:40px;border-radius:999px;flex-shrink:0"></span><span style="flex:1;display:flex;flex-direction:column;gap:7px;padding-top:3px"><span style="display:flex;justify-content:space-between"><span class="sk" style="width:120px;height:12px"></span><span class="sk" style="width:38px;height:10px"></span></span><span class="sk" style="width:{ws[i%6]};height:10px"></span></span></div>'
    return out
def emptycell(title,text,btn,glyph):
    return f'''<div style="flex-grow:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:24px;text-align:center">
      <span style="width:64px;height:64px;border-radius:20px;background:var(--chip);display:inline-flex;align-items:center;justify-content:center;color:var(--mut)">{glyph}</span>
      <span style="font-size:14px;font-weight:600">{title}</span><span style="font-size:12.5px;color:var(--mut);max-width:240px;line-height:1.45">{text}</span>{btn}</div>'''
big=lambda k: ICON[k].replace('width="16" height="16"','width="26" height="26"').replace('width="15" height="15"','width="26" height="26"')
warnic='<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 3 2 20h20z"></path><path d="M12 10v4M12 17h0"></path></svg>'
def lcell(label,inner):
    return f'<div style="display:flex;flex-direction:column;gap:8px;min-height:0"><span class="lbl">{label}</span><section class="card cell" style="height:420px">{inner}</section></div>'
est_body=f'''<div class="{{{{themeCls}}}}" style="width:1440px;height:1000px;box-sizing:border-box;padding:40px 48px;background:var(--bg);color:var(--fg);font-family:Poppins,system-ui,sans-serif;display:flex;flex-direction:column;gap:22px">
  <div><span class="kick">Estados</span><h1 class="d" style="margin:6px 0 0;font-size:30px;font-weight:700;letter-spacing:-.02em">Cada estado dice qué pasa y qué hacer</h1></div>
  <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px">
    {lcell("Cargando · la silueta de la fila nueva",'<div style="padding:18px 16px 12px;display:flex;flex-direction:column;gap:10px;border-bottom:1px solid var(--line)"><span class="sk" style="width:120px;height:22px"></span><span class="sk" style="width:190px;height:11px"></span><span class="sk" style="height:38px;border-radius:999px"></span></div><div style="padding:6px" role="status" aria-label="Cargando conversaciones">'+skel_rows(5)+'</div>')}
    {lcell("En cola vacía · nadie espera",listhead("En cola","Nadie espera",dot=False)+emptycell("Nadie espera","Axi atiende 12 conversaciones. Si pasa una al equipo, aparece aquí.",'<button type="button" class="btn" style="margin-top:4px">Ver lo que atiende Axi</button>',big("a")))}
    {lcell("Sin resultados",'<div style="padding:18px 16px 12px;display:flex;flex-direction:column;gap:12px;border-bottom:1px solid var(--line)"><h1 class="d" style="margin:0;font-size:26px;font-weight:700">Todas abiertas</h1><div class="srch" style="color:var(--fg)">'+ICON["search"]+'reembolso cartagena</div></div>'+emptycell("Ninguna coincide","No hay conversaciones abiertas con «reembolso cartagena». Prueba en Cerradas o quita los filtros.",'<button type="button" class="btn" style="margin-top:4px">Limpiar búsqueda</button>',big("search")))}
    {lcell("Error al leer la lista",listhead("En cola","—",dot=False)+emptycell("No pudimos leer el inbox","Se perdió la conexión con el servidor. Lo que ya estaba abierto sigue a salvo.",'<button type="button" class="btn" style="margin-top:4px">Reintentar</button>',warnic))}
  </div>
  <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px">
    <div style="display:flex;flex-direction:column;gap:8px"><span class="lbl">Tu día sin cifras · el servidor no las dio: queda la cola, que viene de otra lectura</span>
      <section class="card" style="padding:26px 28px;display:flex;flex-direction:column;gap:14px;height:340px;box-sizing:border-box">
        <div><span class="kick">Hoy · viernes 26 de septiembre</span><h2 class="d" style="margin:6px 0 0;font-size:28px;font-weight:700;letter-spacing:-.02em">Tu día en el inbox</h2></div>
        <article class="isl {{{{islCls}}}}" style="padding:18px 20px;display:flex;align-items:center;gap:18px"><div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:6px"><span class="kick">Lo próximo</span><span class="d" style="font-size:30px;font-weight:700;line-height:1">3 esperan</span><span style="font-size:12.5px;color:var(--fg2)">La que más lleva: Mariana Restrepo Villegas · hace 14 min.</span></div><button type="button" class="btn btn-ink">Atender a Mariana</button></article>
        <p style="margin:0;font-size:12.5px;color:var(--mut);display:flex;align-items:center;gap:10px;flex-wrap:wrap">Las cifras del día no están disponibles ahora. La cola sí está al día.<button type="button" class="btn" style="height:32px;padding:0 12px">Reintentar</button></p>
      </section></div>
    <div style="display:flex;flex-direction:column;gap:8px"><span class="lbl">Tu día sin movimiento · todavía no escribe nadie</span>
      <section class="card" style="padding:26px 28px;display:flex;flex-direction:column;gap:14px;height:340px;box-sizing:border-box">
        <div><span class="kick">Hoy · viernes 26 de septiembre</span><h2 class="d" style="margin:6px 0 0;font-size:28px;font-weight:700;letter-spacing:-.02em">Tu día en el inbox</h2></div>
        <article class="isl {{{{islCls}}}}" style="padding:18px 20px;display:flex;flex-direction:column;gap:6px"><span class="kick">Lo próximo</span><span class="d" style="font-size:30px;font-weight:700;line-height:1">Nadie espera</span><span style="font-size:12.5px;color:var(--fg2)">Axi responde apenas alguien escriba. Cuando pase una al equipo, la verás aquí.</span></article>
        <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px"><div class="card tile" style="padding:14px 16px;border-radius:18px"><span class="lbl">Entraron hoy</span><span class="fig" style="font-size:28px">0</span></div><div class="card tile" style="padding:14px 16px;border-radius:18px"><span class="lbl">Resueltas hoy</span><span class="fig" style="font-size:28px">0</span></div><div class="card tile" style="padding:14px 16px;border-radius:18px"><span class="lbl">Abiertas ahora</span><span class="fig" style="font-size:28px">0</span></div></div>
      </section></div>
  </div>
</div>'''
est_js='''    return { themeCls: dark ? 'dk' : 'lt', islCls: dark ? 'isl-dark' : 'isl-glass' };'''
open(R+'/project/Estados.dc.html','w').write(page('Inbox · Estados',1440,1000,est_body,est_js))
print('ok')
