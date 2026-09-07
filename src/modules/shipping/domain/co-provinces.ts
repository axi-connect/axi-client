/**
 * Departamentos de Colombia por código ISO 3166-2:CO (plan envíos+promos, E8).
 * Espejo de `core/system/kernel/geo/co_provinces.ts` del servidor: lista
 * cerrada y estable, y son exactamente los `provinceCode` de Shopify. Las
 * ciudades NO viven aquí: la zona se decide por departamento.
 */
export interface CoProvince {
  code: string;
  name: string;
}

export const CO_PROVINCES: readonly CoProvince[] = [
  { code: "CO-AMA", name: "Amazonas" },
  { code: "CO-ANT", name: "Antioquia" },
  { code: "CO-ARA", name: "Arauca" },
  { code: "CO-ATL", name: "Atlántico" },
  { code: "CO-BOL", name: "Bolívar" },
  { code: "CO-BOY", name: "Boyacá" },
  { code: "CO-CAL", name: "Caldas" },
  { code: "CO-CAQ", name: "Caquetá" },
  { code: "CO-CAS", name: "Casanare" },
  { code: "CO-CAU", name: "Cauca" },
  { code: "CO-CES", name: "Cesar" },
  { code: "CO-CHO", name: "Chocó" },
  { code: "CO-COR", name: "Córdoba" },
  { code: "CO-CUN", name: "Cundinamarca" },
  { code: "CO-DC", name: "Bogotá D.C." },
  { code: "CO-GUA", name: "Guainía" },
  { code: "CO-GUV", name: "Guaviare" },
  { code: "CO-HUI", name: "Huila" },
  { code: "CO-LAG", name: "La Guajira" },
  { code: "CO-MAG", name: "Magdalena" },
  { code: "CO-MET", name: "Meta" },
  { code: "CO-NAR", name: "Nariño" },
  { code: "CO-NSA", name: "Norte de Santander" },
  { code: "CO-PUT", name: "Putumayo" },
  { code: "CO-QUI", name: "Quindío" },
  { code: "CO-RIS", name: "Risaralda" },
  { code: "CO-SAP", name: "San Andrés y Providencia" },
  { code: "CO-SAN", name: "Santander" },
  { code: "CO-SUC", name: "Sucre" },
  { code: "CO-TOL", name: "Tolima" },
  { code: "CO-VAC", name: "Valle del Cauca" },
  { code: "CO-VAU", name: "Vaupés" },
  { code: "CO-VID", name: "Vichada" },
];

const BY_CODE = new Map(CO_PROVINCES.map((province) => [province.code, province]));

export function coProvinceName(code: string): string {
  return BY_CODE.get(code)?.name ?? code;
}
