"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * Fondo gradiente "con vida" de la landing (hero y CTA final): shader WebGL
 * de ruido simplex con los colores de marca fundiéndose en movimiento, brillo
 * central y grano fílmico — la referencia visual es el gradiente de la
 * plantilla v2 (Velaris/Auralis).
 *
 * - Los colores se resuelven desde tokens CSS en runtime (nunca hex aquí) y
 *   se re-resuelven al cambiar el tema (MutationObserver sobre `<html>`);
 *   el fondo base es `--background`, así la viñeta funde hacia la página en
 *   light Y dark.
 * - El loop se pausa fuera de viewport (IntersectionObserver). Con
 *   `prefers-reduced-motion` pinta un solo frame estático.
 * - Si WebGL no está disponible o el shader no compila, no pinta nada: las
 *   secciones mantienen su glow radial CSS de respaldo detrás.
 * - Decorativo: `aria-hidden` y `pointer-events: none`.
 */

const VERTEX_SHADER = `
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision highp float;
varying vec2 vUv;

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_grain;
uniform vec3  u_colors[3];
uniform vec3  u_bg;

vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
           -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
  + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
    dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void main() {
  vec2 uv = vUv;
  float ratio = u_resolution.x / u_resolution.y;
  vec2 p = uv - 0.5;
  p.x *= ratio;

  float t = u_time * 0.14;

  // Remolino lento: el dominio del ruido rota, así los colores giran
  // además de derivar (movimiento orgánico, no un simple desplazamiento)
  float a = t * 0.12;
  mat2 swirl = mat2(cos(a), -sin(a), sin(a), cos(a));
  vec2 q = swirl * p;

  // Tres campos de ruido encadenados con advección fuerte entre capas
  float n1 = snoise(q * 0.45 + vec2(t * 0.42, -t * 0.55));
  float n2 = snoise(q * 0.6 + vec2(-t * 0.34, t * 0.48) + n1 * 0.4);
  float n3 = snoise(q * 0.8 + vec2(t * 0.26, -t * 0.4) + n2 * 0.35);

  vec3 col = u_bg;

  float dist = length(p) * 1.5;
  float vignette = 1.0 - smoothstep(0.3, 1.2, dist);

  // coral manda; violeta y ámbar como acentos — los pesos "respiran"
  // en desfase para que cada color gane y ceda protagonismo
  float w1 = 0.85 + 0.1 * sin(t * 0.9);
  float w2 = 0.7 + 0.12 * sin(t * 0.7 + 2.1);
  float w3 = 0.6 + 0.12 * sin(t * 0.8 + 4.2);
  col = mix(col, u_colors[0], smoothstep(-0.2, 0.5, n1) * w1);
  col = mix(col, u_colors[1], smoothstep(-0.1, 0.6, n2) * w2);
  col = mix(col, u_colors[2], smoothstep(-0.3, 0.4, n3) * w3);

  // brillo suave hacia el centro, con un latido apenas perceptible
  float glow = smoothstep(0.8, 0.0, dist) * (0.3 + 0.06 * sin(t * 0.6 + 1.3));
  col = mix(col, u_colors[1], glow * 0.5);

  // la viñeta funde hacia el fondo de la página (no hacia negro): light + dark
  col = mix(u_bg, col, vignette);

  // grano fílmico animado
  float grain = fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453 + u_time);
  col += (grain - 0.5) * u_grain * 0.1;

  gl_FragColor = vec4(col, 1.0);
}
`;

function hexToRgb(hex: string): [number, number, number] | null {
  const h = hex.replace("#", "").trim();
  if (h.length === 3) {
    return [
      parseInt(h[0] + h[0], 16) / 255,
      parseInt(h[1] + h[1], 16) / 255,
      parseInt(h[2] + h[2], 16) / 255,
    ];
  }
  if (h.length === 6) {
    return [
      parseInt(h.slice(0, 2), 16) / 255,
      parseInt(h.slice(2, 4), 16) / 255,
      parseInt(h.slice(4, 6), 16) / 255,
    ];
  }
  return null;
}

export function BrandGradientCanvas({
  colorVars = ["--axi-brand", "--axi-violet", "--axi-amber"],
  speed = 0.5,
  grain = 0.6,
  opacity = 0.5,
  className,
}: {
  /** Variables CSS de color de marca (hex en globals.css), en orden de peso. */
  colorVars?: string[];
  /** Velocidad de deriva (0.1–1.5, como la plantilla). */
  speed?: number;
  /** Intensidad del grano (0–1.2). */
  grain?: number;
  /** Opacidad global del lienzo sobre la página. */
  opacity?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: true, alpha: true });
    if (!gl) return;

    const compile = (type: number, src: string): WebGLShader | null => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn("BrandGradientCanvas shader:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vs = compile(gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vs || !fs) return;
    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const locs = {
      res: gl.getUniformLocation(program, "u_resolution"),
      time: gl.getUniformLocation(program, "u_time"),
      grain: gl.getUniformLocation(program, "u_grain"),
      colors: gl.getUniformLocation(program, "u_colors"),
      bg: gl.getUniformLocation(program, "u_bg"),
    };

    /* Tokens → uniforms (re-resueltos al cambiar el tema). */
    let colorData = new Float32Array(9);
    let bgData: [number, number, number] = [1, 1, 1];
    const resolveColors = () => {
      const styles = getComputedStyle(document.documentElement);
      const rgb = colorVars.map(
        (v) => hexToRgb(styles.getPropertyValue(v)) ?? ([0, 0, 0] as [number, number, number]),
      );
      colorData = new Float32Array(rgb.slice(0, 3).flat());
      bgData = hexToRgb(styles.getPropertyValue("--background")) ?? bgData;
    };
    resolveColors();

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const resize = () => {
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();

    const draw = (tSeconds: number) => {
      gl.uniform2f(locs.res, canvas.width, canvas.height);
      gl.uniform1f(locs.time, tSeconds * speed);
      gl.uniform1f(locs.grain, grain);
      gl.uniform3fv(locs.colors, colorData);
      gl.uniform3f(locs.bg, bgData[0], bgData[1], bgData[2]);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    let raf = 0;
    let visible = true;
    const loop = (now: number) => {
      draw(now / 1000);
      raf = visible && !reduced ? requestAnimationFrame(loop) : 0;
    };
    const start = () => {
      if (!raf) raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    if (reduced) {
      draw(40); // frame único con composición estable
    } else {
      start();
    }

    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? true;
        if (reduced) return;
        if (visible) start();
        else stop();
      },
      { threshold: 0 },
    );
    io.observe(canvas);

    const ro = new ResizeObserver(() => {
      resize();
      if (reduced) draw(40);
    });
    ro.observe(canvas);

    const mo = new MutationObserver(() => {
      resolveColors();
      if (reduced) draw(40);
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      mo.disconnect();
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buffer);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [colorVars, speed, grain, reduced]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={className}
      style={{ opacity, pointerEvents: "none" }}
    />
  );
}
