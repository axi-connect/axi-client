/**
 * El haz de fibra óptica en WebGL 1: cientos de fibras finas en UNA llamada de
 * dibujo (`LINES`), más el brillo de la cabeza y las chispas (`POINTS`), con mezcla
 * aditiva. Referencia aprobada por la dueña el 2026-09-30.
 *
 * Coste: la geometría es estática y se sube una vez. Por frame solo viajan unos
 * uniforms, entre ellos la columna del haz (`SPINE` puntos × 4 floats). Toda la
 * forma (apertura, cruce de las fibras, el puntero que las aparta) la resuelve el
 * vertex shader.
 *
 * Robustez: si el navegador pierde el contexto (GPU reiniciada, pestaña en
 * segundo plano en móvil), el renderer deja de dibujar y reconstruye sus recursos
 * al recuperarlo. Si los shaders no compilan, `createGlRenderer` devuelve `null` y
 * el hilo cae al renderer 2D.
 */
import type { ThreadRenderer, ThreadFrame } from "./thread-renderer";

export const SPINE = 96;

/**
 * Niveles de calidad: fibras y chispas. El hilo baja de nivel solo si el frame se
 * alarga de verdad (`thread.ts`); nunca sube dentro de la misma visita.
 */
const TIERS = [
  { fibers: 220, sparks: 260 },
  { fibers: 140, sparks: 160 },
  { fibers: 80, sparks: 90 },
] as const;
const MOBILE_TIER = 1;
const GLOWS = 18;

const HEADER = `precision highp float;
uniform vec4 uSpine[${SPINE}];
uniform vec2 uRes;
uniform float uScroll;
uniform vec3 uPointer;
uniform float uHead;
vec4 spineAt(float t) {
  float f = t * ${SPINE - 1}.0;
  float i0 = floor(f);
  int a = int(i0);
  int b = int(min(i0 + 1.0, ${SPINE - 1}.0));
  return mix(uSpine[a], uSpine[b], f - i0);
}
vec2 tangentAt(float t) {
  float e = 1.0 / ${SPINE - 1}.0;
  vec2 v = spineAt(min(t + e, 1.0)).xy - spineAt(max(t - e, 0.0)).xy;
  float l = length(v);
  return l > 1e-3 ? v / l : vec2(0.0, 1.0);
}
vec3 palette(float o) {
  vec3 coral = vec3(0.984, 0.443, 0.522);
  vec3 amber = vec3(0.984, 0.749, 0.141);
  vec3 violet = vec3(0.655, 0.545, 0.980);
  return o < 0.0 ? mix(amber, coral, -o) : mix(amber, violet, o);
}
vec2 place(float t, float o, float seed, out vec4 s, out float fan) {
  s = spineAt(t);
  float d = s.w;
  vec2 tg = tangentAt(t);
  vec2 n = vec2(-tg.y, tg.x);
  // Apretado en la cabeza, abierto detrás, recogido en hilo lejos de ella.
  fan = smoothstep(0.0, 160.0, d) * (1.0 - smoothstep(uRes.y * 0.55, uRes.y * 1.1, d));
  float spread = mix(1.2, 5.0, s.z) + mix(24.0, 130.0, s.z) * fan * uHead;
  // Las fibras se cruzan con una onda que avanza con el scroll (nunca sola).
  float wave = sin(d * 0.0082 + seed * 6.2831 + uScroll * 0.0016);
  vec2 p = s.xy + n * (o * 0.66 + 0.34 * wave) * spread;
  vec2 dp = p - uPointer.xy;
  float m = exp(-dot(dp, dp) / (2.0 * 90.0 * 90.0)) * uPointer.z;
  return p + (dp / (length(dp) + 1e-3)) * m * 42.0;
}
vec4 toClip(vec2 p) {
  vec2 c = (p / uRes) * 2.0 - 1.0;
  return vec4(c.x, -c.y, 0.0, 1.0);
}`;

const VS_FIBERS = `${HEADER}
attribute float aT;
attribute float aO;
attribute float aSeed;
varying vec4 vColor;
void main() {
  vec4 s; float fan;
  vec2 p = place(aT, aO, aSeed, s, fan);
  float d = s.w;
  float core = 1.0 + 0.9 * (1.0 - smoothstep(0.0, 0.3, abs(aO)));
  float a = (0.04 + 0.62 * exp(-d / 260.0)) * core * (0.45 + 0.55 * fract(aSeed * 7.13));
  a *= 1.0 - smoothstep(uRes.y * 1.25, uRes.y * 1.6, d);
  a *= 0.18 + 0.82 * smoothstep(0.0, 46.0, d);
  vec3 c = mix(vec3(0.95, 0.95, 0.97), palette(aO), s.z * 0.92);
  c = mix(c, vec3(1.0), exp(-d / 80.0) * 0.75);
  vColor = vec4(c * a, a);
  gl_Position = toClip(p);
}`;

const VS_POINTS = `${HEADER}
attribute float aT;
attribute float aO;
attribute float aSeed;
attribute float aKind;
uniform float uDpr;
varying vec4 vColor;
void main() {
  vec4 s; float fan;
  vec2 p = place(aT, aO, aSeed, s, fan);
  float d = s.w;
  if (aKind < 0.5) {
    float k = exp(-d / 140.0) * uHead;
    gl_PointSize = (26.0 + 120.0 * k) * uDpr;
    vec3 c = mix(vec3(1.0, 0.93, 0.9), palette(aO * 0.5), s.z * 0.6);
    float a = 0.07 * k;
    vColor = vec4(c * a, a);
  } else {
    float tw = 0.5 + 0.5 * sin(aSeed * 41.0 + uScroll * 0.0045);
    float k = exp(-d / 520.0) * (0.3 + fan);
    gl_PointSize = (1.2 + 2.6 * fract(aSeed * 3.7)) * uDpr;
    vec3 c = mix(vec3(1.0), palette(aO), s.z * 0.8);
    float a = 0.75 * k * tw * tw;
    vColor = vec4(c * a, a);
  }
  gl_Position = toClip(p);
}`;

const FS_FIBERS = `precision mediump float;
varying vec4 vColor;
void main() { gl_FragColor = vColor; }`;

const FS_POINTS = `precision mediump float;
varying vec4 vColor;
void main() {
  vec2 q = gl_PointCoord - 0.5;
  gl_FragColor = vColor * exp(-dot(q, q) * 12.8);
}`;

/** Generador determinista (Park–Miller): el mismo haz en cada visita. */
function seeded(seed: number) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** Fibras ordenadas de modo que las primeras `n` sean un haz completo: bajar de nivel es dibujar menos. */
function fiberVertices(count: number): Float32Array {
  const rnd = seeded(7);
  const out = new Float32Array(count * (SPINE - 1) * 2 * 3);
  let i = 0;
  for (let f = 0; f < count; f++) {
    const u = rnd() * 2 - 1;
    const o = Math.sign(u) * Math.pow(Math.abs(u), 1.35);
    const seed = rnd();
    for (let k = 0; k < SPINE - 1; k++) {
      out.set([k / (SPINE - 1), o, seed, (k + 1) / (SPINE - 1), o, seed], i);
      i += 6;
    }
  }
  return out;
}

function pointVertices(sparks: number): Float32Array {
  const rnd = seeded(11);
  const out = new Float32Array((GLOWS + sparks) * 4);
  let i = 0;
  for (let g = 0; g < GLOWS; g++, i += 4) out.set([1 - g * 0.004, 0, rnd(), 0], i);
  for (let s = 0; s < sparks; s++, i += 4) out.set([Math.pow(rnd(), 0.6), (rnd() * 2 - 1) * 1.5, rnd(), 1], i);
  return out;
}

type Program = { program: WebGLProgram; uniforms: Record<string, WebGLUniformLocation | null>; attrs: number[] };

export function createGlRenderer(canvas: HTMLCanvasElement, opts: { mobile: boolean }): ThreadRenderer | null {
  const gl = canvas.getContext("webgl", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: true,
    depth: false,
    stencil: false,
    powerPreference: "high-performance",
  });
  if (!gl) return null;

  let tier = opts.mobile ? MOBILE_TIER : 0;
  let lost = false;
  let fibers: Program | null = null;
  let points: Program | null = null;
  let fiberBuf: WebGLBuffer | null = null;
  let pointBuf: WebGLBuffer | null = null;
  let width = 0;
  let height = 0;
  let dpr = 1;

  const compile = (vs: string, fs: string, attrs: string[], uniforms: string[]): Program => {
    const program = gl.createProgram();
    if (!program) throw new Error("hilo: sin programa WebGL");
    for (const [type, src] of [
      [gl.VERTEX_SHADER, vs],
      [gl.FRAGMENT_SHADER, fs],
    ] as const) {
      const sh = gl.createShader(type);
      if (!sh) throw new Error("hilo: sin shader");
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(`hilo: ${gl.getShaderInfoLog(sh)}`);
      gl.attachShader(program, sh);
      gl.deleteShader(sh);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(`hilo: ${gl.getProgramInfoLog(program)}`);
    return {
      program,
      uniforms: Object.fromEntries(uniforms.map((u) => [u, gl.getUniformLocation(program, u)])),
      attrs: attrs.map((a) => gl.getAttribLocation(program, a)),
    };
  };

  const setup = () => {
    const common = ["uSpine", "uRes", "uScroll", "uPointer", "uHead"];
    fibers = compile(VS_FIBERS, FS_FIBERS, ["aT", "aO", "aSeed"], common);
    points = compile(VS_POINTS, FS_POINTS, ["aT", "aO", "aSeed", "aKind"], [...common, "uDpr"]);
    fiberBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, fiberBuf);
    gl.bufferData(gl.ARRAY_BUFFER, fiberVertices(TIERS[0].fibers), gl.STATIC_DRAW);
    pointBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, pointBuf);
    gl.bufferData(gl.ARRAY_BUFFER, pointVertices(TIERS[0].sparks), gl.STATIC_DRAW);
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.clearColor(0, 0, 0, 0);
    gl.viewport(0, 0, canvas.width, canvas.height);
  };

  const release = () => {
    for (const p of [fibers, points]) if (p) gl.deleteProgram(p.program);
    for (const b of [fiberBuf, pointBuf]) if (b) gl.deleteBuffer(b);
    fibers = points = null;
    fiberBuf = pointBuf = null;
  };

  try {
    setup();
  } catch (e) {
    console.warn(e);
    release();
    return null;
  }

  const onLost = (e: Event) => {
    e.preventDefault(); // pide al navegador que lo restaure
    lost = true;
  };
  const onRestored = () => {
    try {
      setup();
      lost = false;
    } catch (e) {
      console.warn(e);
    }
  };
  canvas.addEventListener("webglcontextlost", onLost);
  canvas.addEventListener("webglcontextrestored", onRestored);

  const bind = (p: Program, buf: WebGLBuffer | null, stride: number) => {
    gl.useProgram(p.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    p.attrs.forEach((loc, k) => {
      if (loc < 0) return;
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 1, gl.FLOAT, false, stride * 4, k * 4);
    });
  };
  const unbind = (p: Program) => p.attrs.forEach((loc) => loc >= 0 && gl.disableVertexAttribArray(loc));
  const uniforms = (p: Program, f: ThreadFrame) => {
    gl.uniform4fv(p.uniforms.uSpine, f.spine);
    gl.uniform2f(p.uniforms.uRes, width, height);
    gl.uniform1f(p.uniforms.uScroll, f.scroll);
    gl.uniform3f(p.uniforms.uPointer, f.pointer.x, f.pointer.y, f.pointer.strength);
    gl.uniform1f(p.uniforms.uHead, f.head ? 1 : 0.25);
  };

  return {
    kind: "gl",
    resize(w, h, ratio) {
      width = w;
      height = h;
      dpr = ratio;
      canvas.width = Math.round(w * ratio);
      canvas.height = Math.round(h * ratio);
      if (!lost) gl.viewport(0, 0, canvas.width, canvas.height);
    },
    clear() {
      if (!lost) gl.clear(gl.COLOR_BUFFER_BIT);
    },
    draw(frame) {
      if (lost || !fibers || !points) return;
      gl.clear(gl.COLOR_BUFFER_BIT);
      if (!frame.spineLength) return;
      const t = TIERS[tier];
      bind(fibers, fiberBuf, 3);
      uniforms(fibers, frame);
      gl.drawArrays(gl.LINES, 0, t.fibers * (SPINE - 1) * 2);
      unbind(fibers);
      bind(points, pointBuf, 4);
      uniforms(points, frame);
      gl.uniform1f(points.uniforms.uDpr, dpr);
      gl.drawArrays(gl.POINTS, 0, GLOWS + t.sparks);
      unbind(points);
    },
    degrade() {
      if (tier >= TIERS.length - 1) return false;
      tier++;
      return true;
    },
    destroy() {
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      if (!lost) release();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
