import type { RoadLayout } from "@/modules/commercial/domain/route-map";

/**
 * El plano bajo la carretera de la meta: manzanas de tamaños distintos, calles,
 * dos avenidas, un parque y un río. Es DECORADO (aria-hidden por el SVG que lo
 * contiene): no dice nada que no diga la carretera. Se genera una vez por
 * trazado con una semilla fija, así el mapa es el mismo en cada visita, y se
 * pinta con los tokens del tema, así vale igual en claro y en oscuro.
 */

interface Block {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Scene {
  blocks: Block[];
  /** Huellas de edificios dentro de las manzanas: dan textura de ciudad. */
  buildings: Block[];
  avenues: { d: string; width: number }[];
  parks: string[];
  trees: { x: number; y: number; r: number }[];
  river: string;
}

/** Un generador pseudoaleatorio con semilla (mulberry32): el mismo plano siempre. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CELL_W = 96;
const CELL_H = 76;
const GAP = 14;

function buildScene(layout: RoadLayout, seed: number): Scene {
  const rnd = seeded(seed);
  const { width, height } = layout;
  const cols = Math.ceil(width / (CELL_W + GAP)) + 1;
  const rows = Math.ceil(height / (CELL_H + GAP)) + 1;
  const taken = new Set<string>();
  const blocks: Block[] = [];
  const buildings: Block[] = [];
  for (let r = 0; r < rows; r += 1) {
    // Cada fila corre un poco: el plano no es una cuadrícula perfecta.
    const shift = (r % 2) * 28 - 20;
    for (let c = 0; c < cols; c += 1) {
      const key = `${String(c)}:${String(r)}`;
      if (taken.has(key)) continue;
      const roll = rnd();
      if (roll < 0.1) continue; // una plaza: la cuadra vacía
      // Algunas manzanas ocupan dos celdas, a lo ancho o a lo alto.
      const wide = roll > 0.78 && !taken.has(`${String(c + 1)}:${String(r)}`);
      const tall = !wide && roll > 0.66 && roll <= 0.78;
      if (wide) taken.add(`${String(c + 1)}:${String(r)}`);
      if (tall) taken.add(`${String(c)}:${String(r + 1)}`);
      const w = (wide ? CELL_W * 2 + GAP : CELL_W) - Math.round(rnd() * 18);
      const h = (tall ? CELL_H * 2 + GAP : CELL_H) - Math.round(rnd() * 14);
      const block = { x: c * (CELL_W + GAP) + shift, y: r * (CELL_H + GAP) - 10, w, h };
      blocks.push(block);
      // Dos o tres edificios dentro, a lo largo del borde de la manzana.
      if (rnd() < 0.55) {
        const count = 2 + Math.floor(rnd() * 2);
        const bw = (block.w - 10 - (count - 1) * 6) / count;
        for (let i = 0; i < count; i += 1) {
          const bh = block.h * (0.34 + rnd() * 0.22);
          buildings.push({ x: block.x + 5 + i * (bw + 6), y: rnd() < 0.5 ? block.y + 5 : block.y + block.h - 5 - bh, w: bw, h: bh });
        }
      }
    }
  }
  // Dos avenidas que cruzan el plano y una tercera, más fina.
  const avenues = [
    { d: `M -40 ${String(height * 0.72)} C ${String(width * 0.25)} ${String(height * 0.6)}, ${String(width * 0.45)} ${String(height * 0.86)}, ${String(width * 0.7)} ${String(height * 0.66)} S ${String(width + 40)} ${String(height * 0.5)}, ${String(width + 60)} ${String(height * 0.54)}`, width: 24 },
    { d: `M ${String(width * 0.3)} -40 C ${String(width * 0.34)} ${String(height * 0.3)}, ${String(width * 0.22)} ${String(height * 0.6)}, ${String(width * 0.3)} ${String(height + 40)}`, width: 20 },
    { d: `M ${String(width * 0.58)} -40 C ${String(width * 0.64)} ${String(height * 0.2)}, ${String(width * 0.9)} ${String(height * 0.18)}, ${String(width + 40)} ${String(height * 0.12)}`, width: 14 },
  ];
  // El parque, a la vista: a la derecha del tramo medio de la carretera.
  const px = width * 0.74;
  const py = height * 0.46;
  const parks = [
    `M ${String(px)} ${String(py)} c ${String(width * 0.06)} -${String(height * 0.08)}, ${String(width * 0.16)} -${String(height * 0.02)}, ${String(width * 0.15)} ${String(height * 0.08)} s -${String(width * 0.08)} ${String(height * 0.14)}, -${String(width * 0.14)} ${String(height * 0.1)} z`,
  ];
  const trees = Array.from({ length: 9 }, (_, i) => ({
    x: px + width * (0.02 + ((i * 37) % 11) / 100),
    y: py + height * (0.0 + ((i * 53) % 13) / 100),
    r: 5 + (i % 3),
  }));
  const river = `M ${String(width + 40)} ${String(height * 0.86)} C ${String(width * 0.8)} ${String(height * 0.8)}, ${String(width * 0.72)} ${String(height * 1.02)}, ${String(width * 0.5)} ${String(height + 60)}`;
  return { blocks, buildings, avenues, parks, trees, river };
}

const cache = new Map<RoadLayout, Scene>();

function sceneFor(layout: RoadLayout, seed: number): Scene {
  const hit = cache.get(layout);
  if (hit !== undefined) return hit;
  const scene = buildScene(layout, seed);
  cache.set(layout, scene);
  return scene;
}

const BLOCK = "color-mix(in srgb, var(--color-foreground) 5%, var(--color-muted))";
const BUILDING = "color-mix(in srgb, var(--color-foreground) 10%, var(--color-muted))";
const PARK = "color-mix(in srgb, var(--color-success) 16%, var(--color-muted))";
const TREE = "color-mix(in srgb, var(--color-success) 30%, var(--color-muted))";
const WATER = "color-mix(in srgb, var(--color-info) 18%, var(--color-muted))";

/** El plano entero: fondo, río, manzanas, parque y avenidas, en ese orden. */
export function CityScene({ layout, seed = 7 }: { layout: RoadLayout; seed?: number }) {
  const scene = sceneFor(layout, seed);
  return (
    <g aria-hidden>
      <rect width={layout.width} height={layout.height} fill="var(--color-muted)" />
      <path d={scene.river} fill="none" stroke={WATER} strokeWidth={46} strokeLinecap="round" />
      {scene.blocks.map((block) => (
        <rect key={`${String(block.x)}:${String(block.y)}`} x={block.x} y={block.y} width={block.w} height={block.h} rx={11} fill={BLOCK} />
      ))}
      {scene.buildings.map((building) => (
        <rect key={`b${String(building.x)}:${String(building.y)}`} x={building.x} y={building.y} width={building.w} height={building.h} rx={5} fill={BUILDING} />
      ))}
      {scene.parks.map((d) => (
        <path key={d} d={d} fill={PARK} />
      ))}
      {scene.trees.map((tree) => (
        <circle key={`${String(tree.x)}:${String(tree.y)}`} cx={tree.x} cy={tree.y} r={tree.r} fill={TREE} />
      ))}
      {scene.avenues.map((avenue) => (
        <path key={avenue.d} d={avenue.d} fill="none" stroke="var(--color-background)" strokeWidth={avenue.width} strokeLinecap="round" />
      ))}
    </g>
  );
}
