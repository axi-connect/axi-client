/**
 * Los rótulos de la meta (plan §16.1). Las cifras y las indicaciones salen de
 * `film-content.ts` (`route`, por nicho) a través de `routeScenario`; aquí solo
 * van las palabras fijas del mapa y del panel.
 */
export const GOAL_COPY = {
  eyebrow: "Crecer",
  title: "Tú pones la meta.",
  titleThin: "Axi traza la ruta.",
  lead: "Tu meta del mes se vuelve un camino con indicaciones para hoy. Si vas lento, Axi te prepara otra ruta.",
  start: "Salida · 1 oct",
  here: "Vas aquí",
  /** «Tramo lento · vas $ 2,6 M por debajo». */
  slow: (behind: string) => `Tramo lento · vas ${behind} por debajo`,
  arriveNow: "Si sigues así llegas a",
  arriveAxi: "Con la ruta de Axi llegas a",
  /** La etiqueta del anillo en móvil: «91 % · llegada». */
  arriveShort: "llegada",
  flag: (goal: string) => `Meta · ${goal}`,
  recalc: "Axi recalculó tu ruta",
  recalcDone: "Ruta nueva aprobada",
  destination: "Destino · octubre",
  /** «Vender $ 30.000.000». */
  sell: (goal: string) => `Vender ${goal}`,
  slowChip: "Ritmo bajo",
  /** «Faltan $ 11,1 M en 6 días hábiles». */
  remaining: (amount: string, days: number) => `Faltan ${amount} en ${days} días hábiles`,
  then: "Luego:",
  reached: "Vas en",
  eta: "Llegada estimada",
  routes: "Rutas · las prepara Axi",
  routeNow: "Seguir al ritmo de hoy",
  approve: "Aprobar ruta",
  approved: "Ruta aprobada ✓",
  note: "Axi propone; tú apruebas. Nada se envía sin tu aprobación.",
} as const;
