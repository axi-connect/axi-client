'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';

type DialogSize = 'sm' | 'md' | 'lg' | 'xl' | { maxWidth: number | string };
type NotchSide = 'none' | 'left' | 'right' | 'both';

export type OverlayDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  size?: DialogSize;
  backdropBlur?: number; // px
  backdropOpacity?: number; // 0..1
  showClose?: boolean;
  notch?: NotchSide;
  className?: string;
  headerContentLeft?: React.ReactNode;
  headerContentRight?: React.ReactNode;
  initialFocusRef?: React.RefObject<HTMLElement>;
};

function usePortalContainer(): HTMLElement | null {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const node = document.createElement('div');
    node.setAttribute('data-overlay-root', '');
    document.body.appendChild(node);
    setContainer(node);
    return () => {
      document.body.removeChild(node);
    };
  }, []);
  return container;
}

function maxWidthClass(size: DialogSize): React.CSSProperties {
  if (typeof size === 'object') {
    const value = typeof size.maxWidth === 'number' ? `${size.maxWidth}px` : size.maxWidth;
    return { maxWidth: value };
  }
  switch (size) {
    case 'sm':
      return { maxWidth: '28rem' };
    case 'md':
      return { maxWidth: '36rem' };
    case 'lg':
      return { maxWidth: '48rem' };
    case 'xl':
      return { maxWidth: '64rem' };
    default:
      return { maxWidth: '36rem' };
  }
}

function Notch({ side }: { side: Exclude<NotchSide, 'none'> }) {
  // Approximate the Next.js overlay tail using a clipped block. Matches theme via currentColor trick on border.
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute -top-10 ${
        side === 'left' ? 'left-0' : 'right-0 rotate-180'
      } h-10 w-16`}
    >
      <svg width="100%" height="100%" viewBox="0 0 60 42" preserveAspectRatio="none">
        <path
          d="M1 0H8.08C15.77 0 22.78 4.41 26.11 11.35L34.89 29.65C38.22 36.59 45.23 41 52.92 41H60H1Z"
          fill="var(--background, rgba(255,255,255,0.8))"
        />
        <path
          d="M0 1.02H7.08C14.77 1.02 21.78 5.44 25.11 12.37L33.89 30.67C37.22 37.61 44.23 42.02 51.92 42.02H59H0Z"
          fill="var(--color-overlay-panel, rgba(255,255,255,0.85))"
        />
      </svg>
    </div>
  );
}

export function OverlayDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  actions,
  size = 'md',
  backdropBlur = 8,
  backdropOpacity = 0.45,
  showClose = true,
  notch = 'both',
  className = '',
  headerContentLeft,
  headerContentRight,
  initialFocusRef,
}: OverlayDialogProps) {
  const portal = usePortalContainer();
  const panelRef = useRef<HTMLDivElement>(null);

  // Close helpers
  const close = useCallback(() => onOpenChange(false), [onOpenChange]);
  const onBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        close();
      }
    },
    [close]
  );

  // Focus management
  useEffect(() => {
    if (!open) return;
    const target = initialFocusRef?.current || panelRef.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    target?.focus?.();

    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        ev.stopPropagation();
        close();
      }
      if (ev.key === 'Tab') {
        const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (ev.shiftKey && document.activeElement === first) {
          last.focus();
          ev.preventDefault();
        } else if (!ev.shiftKey && document.activeElement === last) {
          first.focus();
          ev.preventDefault();
        }
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, close, initialFocusRef]);

  const styleMax = useMemo(() => maxWidthClass(size), [size]);

  if (!portal) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="overlay-root"
          className="fixed inset-0 z-[1000]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onMouseDown={onBackdropClick}
          style={{
            backgroundColor: `rgba(0,0,0,${backdropOpacity})`,
            backdropFilter: `blur(${backdropBlur}px)`,
          }}
        >
          <div className="flex h-full w-full items-center justify-center p-4">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={typeof title === 'string' ? title : undefined}
              className={`relative w-full overflow-hidden rounded-2xl border border-black/10 bg-background/80 shadow-2xl backdrop-blur-xl dark:border-white/10 ${className}`}
              style={{ ...styleMax, ['--color-overlay-panel' as any]: 'var(--background)' }}
              ref={panelRef}
              onMouseDown={(e:any) => e.stopPropagation()}
              initial={{ y: 24, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 24, opacity: 0, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            >
              <div className="relative">
                {(notch === 'left' || notch === 'both') && <Notch side="left" />}
                {(notch === 'right' || notch === 'both') && <Notch side="right" />}
                <div className="flex items-center justify-between border-b border-black/10 px-4 py-2.5 dark:border-white/10">
                  <div className="flex min-h-6 items-center gap-2">
                    {headerContentLeft}
                    {title && (
                      <h2 className="text-sm font-semibold leading-none tracking-tight">
                        {title}
                      </h2>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {headerContentRight}
                    {showClose && (
                      <button
                        type="button"
                        onClick={close}
                        className="hover:bg-foreground/10 focus-visible:outline-ring/60 rounded-md p-1 transition"
                        aria-label="Close"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M3.5 3.5L12.5 12.5M12.5 3.5L3.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {description && (
                <div className="text-muted-foreground px-4 pt-3 text-sm">
                  {description}
                </div>
              )}

              <div className="px-4 py-4">{children}</div>

              {actions && (
                <div className="border-t border-black/10 px-4 py-3 dark:border-white/10">
                  <div className="flex items-center justify-end gap-2">{actions}</div>
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    portal
  );
}

export default OverlayDialog;