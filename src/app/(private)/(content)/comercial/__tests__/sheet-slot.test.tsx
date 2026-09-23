import { existsSync } from "node:fs";
import { join } from "node:path";

import ComercialSheetCatchAll from "../@sheet/[...catchAll]/page";
import ComercialSheetDefault from "../@sheet/default";

/**
 * C1 (auditoría F6/F7): el slot `@sheet` NO se queda con el panel abierto al
 * navegar en suave a otra ruta de `/comercial/*` («Corregir» → `/comercial/meta`).
 * Next conserva el estado de un slot que no casa con la URL nueva; el
 * catch-all hace que siempre case y no pinte nada. Las interceptadas siguen
 * existiendo al lado (ganan por especificidad).
 */
describe("slot @sheet de /comercial", () => {
  const slot = join(__dirname, "..", "@sheet");

  it("el catch-all casa con cualquier otra ruta del segmento y no pinta nada", () => {
    expect(existsSync(join(slot, "[...catchAll]", "page.tsx"))).toBe(true);
    expect(ComercialSheetCatchAll()).toBeNull();
    expect(ComercialSheetDefault()).toBeNull();
  });

  it("las dos rutas interceptadas siguen al lado del catch-all", () => {
    expect(existsSync(join(slot, "(.)acciones", "[id]", "page.tsx"))).toBe(true);
    expect(existsSync(join(slot, "(.)resultados", "[key]", "page.tsx"))).toBe(true);
  });
});
