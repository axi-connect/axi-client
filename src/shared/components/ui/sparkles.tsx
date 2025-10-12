'use client';

import React from 'react';

type SparklesProps = {
  id?: string;
  background?: string;
  particleDensity?: number; // approx number of particles
  className?: string;
  // Optional override color in hex/rgb(a). If not provided, uses CSS var --foreground
  color?: string;
};

export function SparklesCore({ id, background = 'transparent', particleDensity = 200, className, color }: SparklesProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = container.clientWidth);
    let height = (canvas.height = container.clientHeight);

    // Resolve particle base color from CSS var --foreground or prop
    function getCssVarForeground(): string {
      const root = document.documentElement;
      const val = getComputedStyle(root).getPropertyValue('--foreground').trim();
      return val || '#171717';
    }

    function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
      const h = hex.replace('#', '').trim();
      if (h.length === 3) {
        const r = parseInt(h[0] + h[0], 16);
        const g = parseInt(h[1] + h[1], 16);
        const b = parseInt(h[2] + h[2], 16);
        return { r, g, b };
      }
      if (h.length === 6) {
        const r = parseInt(h.slice(0, 2), 16);
        const g = parseInt(h.slice(2, 4), 16);
        const b = parseInt(h.slice(4, 6), 16);
        return { r, g, b };
      }
      return null;
    }

    function resolveCssVar(varExpr: string): string | null {
      const match = varExpr.match(/var\((--[A-Za-z0-9-_]+)\)/);
      if (!match) return null;
      const varName = match[1];
      const root = document.documentElement;
      const v = getComputedStyle(root).getPropertyValue(varName).trim();
      return v || null;
    }

    function parseColor(input: string): { r: number; g: number; b: number } {
      const trimmed = input.trim();
      if (trimmed.startsWith('var(')) {
        const resolved = resolveCssVar(trimmed);
        if (resolved) return parseColor(resolved);
      }
      if (trimmed.startsWith('#')) {
        const rgb = hexToRgb(trimmed);
        return rgb || { r: 255, g: 255, b: 255 };
      }
      if (trimmed.startsWith('rgb')) {
        const nums = trimmed
          .replace(/rgba?\(/, '')
          .replace(')', '')
          .split(',')
          .map((n) => parseFloat(n.trim()));
        return { r: nums[0] || 255, g: nums[1] || 255, b: nums[2] || 255 };
      }
      return { r: 255, g: 255, b: 255 };
    }

    const baseColorRef = { current: parseColor(color || getCssVarForeground()) } as React.MutableRefObject<{ r: number; g: number; b: number }>;

    const recomputeBaseColor = () => {
      baseColorRef.current = parseColor(color || getCssVarForeground());
    };

    type Particle = { x: number; y: number; r: number; vx: number; vy: number; a: number; da: number };
    const num = Math.min(600, Math.max(50, particleDensity));
    const particles: Particle[] = new Array(num).fill(0).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.8 + 0.2,
      vx: (Math.random() - 0.5) * 0.1,
      vy: (Math.random() - 0.5) * 0.1,
      a: Math.random() * 0.9 + 0.1,
      da: (Math.random() - 0.5) * 0.01,
    }));

    let rafId = 0;
    const render = () => {
      ctx.clearRect(0, 0, width, height);
      for (let p of particles) {
        p.x += p.vx; p.y += p.vy; p.a += p.da;
        if (p.x < 0) p.x = width; if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height; if (p.y > height) p.y = 0;
        if (p.a < 0.05 || p.a > 0.9) p.da *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        const c = baseColorRef.current;
        ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},${p.a})`;
        ctx.fill();
      }
      rafId = requestAnimationFrame(render);
    };
    rafId = requestAnimationFrame(render);

    // React to theme/class changes (next-themes toggles class on <html>)
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'attributes' && (m.attributeName === 'class' || m.attributeName === 'style')) {
          recomputeBaseColor();
        }
      }
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style'] });

    // React to system theme changes as a fallback
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onMqlChange = () => recomputeBaseColor();
    mql.addEventListener?.('change', onMqlChange);

    const ro = new ResizeObserver(() => {
      width = canvas.width = container.clientWidth;
      height = canvas.height = container.clientHeight;
    });
    ro.observe(container);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      mo.disconnect();
      mql.removeEventListener?.('change', onMqlChange);
    };
  }, [particleDensity, color]);

  return (
    <div ref={containerRef} id={id} className={className} style={{ background }}>
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}


