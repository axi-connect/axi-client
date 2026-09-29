import { stashPreset, takePreset } from "../preset-handoff";

function fakeStorage() {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
  };
}

describe("preset-handoff — la audiencia viaja por sessionStorage, no por la URL (C2)", () => {
  it("una lista de 5000 contactos deja en la URL solo una clave corta y vuelve entera", () => {
    const storage = fakeStorage();
    const contactIds = Array.from({ length: 5000 }, (_, i) => `0199a0a0-0000-7000-8000-${String(i).padStart(12, "0")}`);
    const key = stashPreset(storage, { mode: "contacts", contactIds, label: "5000 contactos que marcaste" });

    expect(key.length).toBeLessThan(64);
    const back = takePreset(storage, key);
    expect(back).toEqual({ mode: "contacts", contactIds, label: "5000 contactos que marcaste" });
  });

  it("la clave es de un solo uso", () => {
    const storage = fakeStorage();
    const key = stashPreset(storage, { mode: "import", importJobId: "job-1", label: "Del import" });
    expect(takePreset(storage, key)).not.toBeNull();
    expect(takePreset(storage, key)).toBeNull();
    expect(storage.map.size).toBe(0);
  });

  it("una clave desconocida o un valor corrupto devuelven null, nunca revientan", () => {
    const storage = fakeStorage();
    expect(takePreset(storage, "nada")).toBeNull();
    storage.setItem("axi:campaign-preset:rota", "{no es json");
    expect(takePreset(storage, "rota")).toBeNull();
    storage.setItem("axi:campaign-preset:forma", JSON.stringify({ mode: "contacts", label: "x" }));
    expect(takePreset(storage, "forma")).toBeNull();
  });
});
