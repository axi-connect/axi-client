'use client';

import Link from 'next/link';
import { MessageCircle } from 'lucide-react';

import { salesWhatsAppUrl } from '@/core/config/env';
import { INTENT_OF, IntentIcon } from '@/shared/components/layout/site/IntentIcon';
import {
    SITE_INTENTS,
    SITE_ISLAND,
    SITE_MENU_FOOT,
    SITE_MENU_LINKS,
    SITE_MENU_SIDE,
    type SiteIntent,
} from '@/shared/components/layout/site/site-nav.content';

/** «**7 días de prueba** con…»: el fragmento entre `**` en peso fuerte. */
export function Claim({ text }: { text: string }) {
    return (
        <>
            {text.split('**').map((part, i) => (i % 2 ? <b key={i}>{part}</b> : <span key={i}>{part}</span>))}
        </>
    );
}

/**
 * El panel del menú por intención (escritorio): a la izquierda «¿Qué quieres
 * hacer?», al centro las tarjetas de la intención elegida, a la derecha tipo de
 * negocio, canales, Casos e Integraciones, y abajo la prueba, WhatsApp y el CTA.
 * No es modal: Esc, un clic fuera o un enlace lo cierran (SiteHeader).
 */
export function SiteMenuPanel({
    id,
    active,
    onPick,
    onNavigate,
    ctaHref,
    ctaLabel,
}: {
    id: string;
    active: SiteIntent;
    onPick: (intent: SiteIntent['id']) => void;
    onNavigate: () => void;
    ctaHref: string;
    ctaLabel: string;
}) {
    return (
        <div id={id} role="region" aria-label={active.name} className="site-panel site-glass site-glass-deep">
            <div>
                <p className="site-panel-k">{SITE_ISLAND.ask}</p>
                {SITE_INTENTS.map((it) => (
                    <button
                        key={it.id}
                        type="button"
                        className="site-btn site-intent"
                        data-tone={it.tone}
                        aria-pressed={it.id === active.id}
                        onClick={() => onPick(it.id)}
                    >
                        <IntentIcon intent={INTENT_OF[it.id]} size="lg" />
                        <span>
                            <span className="site-intent-name">{it.name}</span>
                            <span className="site-intent-promise">{it.promise}</span>
                        </span>
                    </button>
                ))}
            </div>

            <div className="site-panel-mid">
                <p className="site-panel-head">
                    <b>{active.pillar}</b>
                    <span>{active.promise}</span>
                </p>
                {active.cards.map((c) => {
                    const Icon = c.icon;
                    return (
                        <Link key={c.name} prefetch={false} href={c.href} className="site-card" onClick={onNavigate}>
                            <span className="site-card-icon" aria-hidden="true">
                                <Icon className="size-[19px]" strokeWidth={1.7} />
                            </span>
                            <span>
                                <span className="site-card-name">{c.name}</span>
                                <span className="site-card-desc">{c.description}</span>
                            </span>
                        </Link>
                    );
                })}
            </div>

            <div className="site-panel-side">
                {SITE_MENU_SIDE.map((s) => (
                    <div key={s.title}>
                        <p className="site-panel-k">{s.title}</p>
                        <ul>
                            {s.rows.map((r) => (
                                <li key={r.href}>
                                    <Link prefetch={false} href={r.href} className="site-link" onClick={onNavigate}>
                                        {r.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
                <ul>
                    {SITE_MENU_LINKS.more.map((l) => (
                        <li key={l.href}>
                            <Link prefetch={false} href={l.href} className="site-link" onClick={onNavigate}>
                                {l.name}
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>

            <div className="site-panel-foot">
                <p>
                    <Claim text={SITE_MENU_FOOT.claim} />
                </p>
                <a href={salesWhatsAppUrl(SITE_MENU_FOOT.whatsapp.message)} target="_blank" rel="noopener noreferrer" className="site-wa">
                    <MessageCircle className="size-4" aria-hidden="true" />
                    {SITE_MENU_FOOT.whatsapp.name}
                </a>
                <Link prefetch={false} href={ctaHref} className="site-cta site-cta-light" onClick={onNavigate}>
                    {ctaLabel}
                </Link>
            </div>
        </div>
    );
}
