'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Monitor, Moon, Sun } from 'lucide-react';

const OPTIONS = [
    { value: 'light', label: 'Tema claro', icon: Sun },
    { value: 'system', label: 'Tema del sistema', icon: Monitor },
    { value: 'dark', label: 'Tema oscuro', icon: Moon },
] as const;

/**
 * El selector de tema del nav en isla (§18.1): tres botones de radio de cristal.
 * `vertical` es la píldora fija del borde derecho en escritorio; si no, va en
 * fila dentro de la hoja móvil. El activo se pinta tras el montaje (next-themes
 * no conoce el tema en el servidor).
 */
export function SiteThemeChoice({ className, label }: { className: string; label: string }) {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    // Un radiogroup se recorre con flechas y es UNA parada de tabulación (m10):
    // la opción activa lleva tabIndex 0 y las demás -1.
    const active = Math.max(0, OPTIONS.findIndex((o) => mounted && o.value === theme));
    const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
        if (!step) return;
        e.preventDefault();
        const next = (active + step + OPTIONS.length) % OPTIONS.length;
        setTheme(OPTIONS[next].value);
        e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus();
    };
    return (
        <div role="radiogroup" aria-label={label} className={className} onKeyDown={onKeyDown}>
            {OPTIONS.map(({ value, label: name, icon: Icon }, i) => (
                <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={mounted && theme === value}
                    tabIndex={i === active ? 0 : -1}
                    aria-label={name}
                    title={name}
                    className="site-btn"
                    onClick={() => setTheme(value)}
                >
                    <Icon className="size-4" strokeWidth={1.9} aria-hidden="true" />
                </button>
            ))}
        </div>
    );
}
