#!/usr/bin/env python3
"""Prototipo navegable de la película (apertura, nicho, chat, meta y cierre) con GSAP + Lenis.

Rellena `prototype.template.html` con Nexa en base64, el isotipo, iconos lucide y la carretera
del mapa (la misma de `storyboard.build.py`). Salida: `AXI_PROTO_OUT` (por defecto `_out/prototype.html`).
"""
from __future__ import annotations

import base64
import os
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
import importlib.util  # noqa: E402

_spec = importlib.util.spec_from_file_location("storyboard", HERE / "storyboard.build.py")
sb = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(sb)

FONTS = pathlib.Path("/root/axi/axi-client/public/fonts/nexa")


def ic(name: str, size: int = 16) -> str:
    return sb.IC(name, size=size)


def main() -> None:
    t = (HERE / "prototype.template.html").read_text()
    subs = {
        "__NEXA700__": base64.b64encode((FONTS / "Nexa-Heavy.woff2").read_bytes()).decode(),
        "__NEXA200__": base64.b64encode((FONTS / "Nexa-ExtraLight.woff2").read_bytes()).decode(),
        "__ISO30__": sb.isotype(30, "p30"),
        "__ISOBIG__": sb.isotype(420, "pbig").replace('width="420" height="420"', 'width="100%" height="100%"'),
        "__ISOCTA__": sb.isotype(220, "pcta").replace('width="220" height="220"', 'width="100%" height="100%"'),
        "__IC_UTENSILS__": ic("utensils-crossed", 19),
        "__IC_PHONE__": ic("smartphone", 19),
        "__IC_SPARKLES__": ic("sparkles", 19),
        "__IC_BRIEF__": ic("briefcase-business", 19),
        "__IC_PROD__": ic("package", 34),
        "__IC_NAV__": ic("navigation", 14),
        "__IC_FLAG__": ic("flag", 18),
        "__IC_UR__": ic("corner-up-right", 15),
        "__IC_UL__": ic("corner-up-left", 15),
        "__IC_UP__": ic("arrow-up", 15),
        "__ROAD__": sb.road_d(),
    }
    for k, v in subs.items():
        t = t.replace(k, v)
    assert "__" not in "".join(x for x in subs if x in t), "marcador sin reemplazar"
    out = pathlib.Path(os.environ.get("AXI_PROTO_OUT", HERE / "_out" / "prototype.html"))
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(t)
    sb.IC.save()
    print(f"{out} · {out.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
