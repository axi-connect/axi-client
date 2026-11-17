import base64, json, re, sys, pathlib
S = pathlib.Path(__file__).parent; OUT = S / "index.html"
F = pathlib.Path("/home/davela/dev/inteligencia-empresarial/axi/axi-video/02-recursos/marca/fuentes")
ISO = pathlib.Path("/home/davela/dev/inteligencia-empresarial/axi/axi-client/public/brand/isologo-axi-connect.svg").read_text()
def ff(fam, w, path, fmt):
    b = base64.b64encode((F / path).read_bytes()).decode()
    return f'@font-face{{font-family:"{fam}";font-weight:{w};font-display:block;src:url(data:font/{fmt};base64,{b}) format("{ "woff2" if fmt=="woff2" else "truetype"}")}}'
fonts = "\n".join([ff("Inter Tight", "100 900", "inter-tight-variable.woff2", "woff2"),
  ff("Poppins", 400, "poppins-400.woff2", "woff2"), ff("Poppins", 500, "poppins-500.woff2", "woff2"),
  ff("Poppins", 600, "poppins-600.woff2", "woff2"), ff("Poppins", 700, "poppins-700.woff2", "woff2"),
  ff("Nexa", 700, "Nexa-Heavy.ttf", "ttf")])
n = [0]
def iso(cls="", label=None):
    n[0] += 1; k = n[0]
    s = ISO.replace('width="500" height="500" ', "")
    s = re.sub(r'paint(\d)_linear_75_19', lambda m: f'g{k}_{m.group(1)}', s)
    attrs = f' class="{cls}"' if cls else ""
    attrs += f' role="img" aria-label="{label}"' if label else ' aria-hidden="true"'
    return s.replace("<svg ", f"<svg{attrs} ", 1)
icons = json.loads((S / "icons.json").read_text())
def ic(name): return re.sub(r' (stroke|stroke-width|height|width)="[^"]*"', "", icons[name]).replace(' fill="currentColor"', "")
html = (S / "deck.src.html").read_text()
html = html.replace("{{FONTS}}", fonts)
for key, name in [("{{WA}}", "FaWhatsapp"), ("{{IG}}", "FaInstagram"), ("{{MS}}", "FaFacebookMessenger"), ("{{SH}}", "FaShopify")]:
    html = html.replace(key, ic(name))
while "{{ISO_BIG}}" in html: html = html.replace("{{ISO_BIG}}", iso("iso", "Axi Connect"), 1)
while "{{ISO_PILLARS}}" in html: html = html.replace("{{ISO_PILLARS}}", iso("iso"), 1)
while "{{ISO}}" in html: html = html.replace("{{ISO}}", iso(), 1)
assert "{{" not in html, re.findall(r"\{\{\w+\}\}", html)
OUT.write_text(html); print(OUT, len(html)//1024, "KB")
