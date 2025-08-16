'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';

export default function MarketplaceHero() {
	const gradientRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		// Animate words
		const words = document.querySelectorAll<HTMLElement>('.word');
		words.forEach((word) => {
			const delay = parseInt(word.getAttribute('data-delay') || '0', 10);
			setTimeout(() => {
				word.style.animation = 'word-appear 0.8s ease-out forwards';
			}, delay);
		});

		// Mouse gradient
		const gradient = gradientRef.current;
		function onMouseMove(e: MouseEvent) {
			if (gradient) {
				gradient.style.left = e.clientX - 192 + 'px';
				gradient.style.top = e.clientY - 192 + 'px';
				gradient.style.opacity = '1';
			}
		}
		function onMouseLeave() {
			if (gradient) gradient.style.opacity = '0';
		}
		document.addEventListener('mousemove', onMouseMove);
		document.addEventListener('mouseleave', onMouseLeave);

		// Word hover effects
		words.forEach((word) => {
			word.addEventListener('mouseenter', () => {
				word.style.textShadow = '0 0 20px color-mix(in srgb, var(--axi-brand) 55%, transparent)';
			});
			word.addEventListener('mouseleave', () => {
				word.style.textShadow = 'none';
			});
		});

		// Click ripple effect
		function onClick(e: MouseEvent) {
			const ripple = document.createElement('div');
			ripple.style.position = 'fixed';
			ripple.style.left = e.clientX + 'px';
			ripple.style.top = e.clientY + 'px';
			ripple.style.width = '4px';
			ripple.style.height = '4px';
			ripple.style.background = 'color-mix(in srgb, var(--axi-brand) 60%, transparent)';
			ripple.style.borderRadius = '50%';
			ripple.style.transform = 'translate(-50%, -50%)';
			ripple.style.pointerEvents = 'none';
			ripple.style.animation = 'pulse-glow 1s ease-out forwards';
			document.body.appendChild(ripple);
			setTimeout(() => ripple.remove(), 1000);
		}
		document.addEventListener('click', onClick);

		// Floating elements on scroll
		let scrolled = false;
		function onScroll() {
			if (!scrolled) {
				scrolled = true;
				document
					.querySelectorAll<HTMLElement>('.floating-element')
					.forEach((el, index) => {
						setTimeout(() => {
							el.style.animationPlayState = 'running';
						}, index * 200);
					});
			}
		}
		window.addEventListener('scroll', onScroll);

		return () => {
			document.removeEventListener('mousemove', onMouseMove);
			document.removeEventListener('mouseleave', onMouseLeave);
			document.removeEventListener('click', onClick);
			window.removeEventListener('scroll', onScroll);
		};
	}, []);

	return (
		<div
			className="font-primary relative min-h-screen w-full overflow-hidden bg-background text-foreground"
			style={{
				background:
					'linear-gradient(135deg, color-mix(in srgb, var(--background) 96%, var(--axi-brand) 4%) 0%, var(--background) 35%, color-mix(in srgb, var(--background) 92%, var(--axi-brand-2) 8%) 100%)',
			}}
		>
			<style jsx global>{`
				/* Words fade/slide in sequence */
				.word { opacity: 0; transform: translateY(8px); }
				@keyframes word-appear { to { opacity: 1; transform: translateY(0); } }
				/* Auto space between animated words */
				.word + .word::before { content: ' '; }

				/* SVG grid lines draw in */
				.grid-line {
					stroke: color-mix(in srgb, var(--foreground) 20%, transparent);
					stroke-width: 1;
					stroke-dasharray: 400;
					stroke-dashoffset: 400;
					animation: draw-line 1.2s ease-out forwards;
				}
				@keyframes draw-line { to { stroke-dashoffset: 0; } }

				/* Dots pop in */
				.detail-dot {
					fill: color-mix(in srgb, var(--foreground) 30%, transparent);
					transform: scale(0.6);
					opacity: 0;
					animation: dot-pop 0.6s ease-out forwards;
				}
				@keyframes dot-pop { to { transform: scale(1); opacity: 1; } }

				/* Corner elements subtly appear */
				.corner-element { position: absolute; width: 64px; height: 64px; opacity: 0; animation: word-appear 0.8s ease-out forwards; }

				/* Floating ambient particles */
				.floating-element {
					position: absolute;
					width: 8px;
					height: 8px;
					border-radius: 9999px;
					background: color-mix(in srgb, var(--axi-brand) 20%, transparent);
					filter: blur(1px);
					animation: float 8s ease-in-out infinite;
					animation-play-state: paused; /* enabled on first scroll */
				}
				@keyframes float {
					0%, 100% { transform: translateY(0); }
					50% { transform: translateY(-12px); }
				}

				/* Click ripple */
				@keyframes pulse-glow {
					0% { opacity: 0.6; transform: translate(-50%, -50%) scale(1); }
					100% { opacity: 0; transform: translate(-50%, -50%) scale(18); }
				}
			`}</style>
			<svg className="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
				<defs>
					<pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
						<path d="M 60 0 L 0 0 0 60" fill="none" stroke="color-mix(in srgb, var(--foreground) 8%, transparent)" strokeWidth="0.5" />
					</pattern>
				</defs>
				<rect width="100%" height="100%" fill="url(#grid)" />
				<line x1="0" y1="20%" x2="100%" y2="20%" className="grid-line" style={{ animationDelay: '0.5s' }} />
				<line x1="0" y1="80%" x2="100%" y2="80%" className="grid-line" style={{ animationDelay: '1s' }} />
				<line x1="20%" y1="0" x2="20%" y2="100%" className="grid-line" style={{ animationDelay: '1.5s' }} />
				<line x1="80%" y1="0" x2="80%" y2="100%" className="grid-line" style={{ animationDelay: '2s' }} />
				<line x1="50%" y1="0" x2="50%" y2="100%" className="grid-line" style={{ animationDelay: '2.5s', opacity: 0.05 }} />
				<line x1="0" y1="50%" x2="100%" y2="50%" className="grid-line" style={{ animationDelay: '3s', opacity: 0.05 }} />
				<circle cx="20%" cy="20%" r="2" className="detail-dot" style={{ animationDelay: '3s' }} />
				<circle cx="80%" cy="20%" r="2" className="detail-dot" style={{ animationDelay: '3.2s' }} />
				<circle cx="20%" cy="80%" r="2" className="detail-dot" style={{ animationDelay: '3.4s' }} />
				<circle cx="80%" cy="80%" r="2" className="detail-dot" style={{ animationDelay: '3.6s' }} />
				<circle cx="50%" cy="50%" r="1.5" className="detail-dot" style={{ animationDelay: '4s' }} />
			</svg>

			{/* Corner elements */}
			<div className="corner-element top-8 left-8" style={{ animationDelay: '4s' }}>
				<div className="absolute top-0 left-0 h-2 w-2 opacity-30" style={{ background: 'color-mix(in srgb, var(--foreground) 60%, transparent)' }} />
			</div>
			<div className="corner-element top-8 right-8" style={{ animationDelay: '4.2s' }}>
				<div className="absolute top-0 right-0 h-2 w-2 opacity-30" style={{ background: 'color-mix(in srgb, var(--foreground) 60%, transparent)' }} />
			</div>
			<div className="corner-element bottom-8 left-8" style={{ animationDelay: '4.4s' }}>
				<div className="absolute bottom-0 left-0 h-2 w-2 opacity-30" style={{ background: 'color-mix(in srgb, var(--foreground) 60%, transparent)' }} />
			</div>
			<div className="corner-element right-8 bottom-8" style={{ animationDelay: '4.6s' }}>
				<div className="absolute right-0 bottom-0 h-2 w-2 opacity-30" style={{ background: 'color-mix(in srgb, var(--foreground) 60%, transparent)' }} />
			</div>

			{/* Floating elements */}
			<div className="floating-element" style={{ top: '25%', left: '15%', animationDelay: '5s' }} />
			<div className="floating-element" style={{ top: '60%', left: '85%', animationDelay: '5.5s' }} />
			<div className="floating-element" style={{ top: '40%', left: '10%', animationDelay: '6s' }} />
			<div className="floating-element" style={{ top: '75%', left: '90%', animationDelay: '6.5s' }} />

			<div className="relative z-10 flex min-h-screen flex-col items-center justify-between px-8 py-12 md:px-16 md:py-20">
				{/* Top tagline */}
				<div className="text-center">
					<h2 className="text-xs font-light tracking-[0.2em] uppercase opacity-80 md:text-sm" style={{ color: 'color-mix(in srgb, var(--foreground) 75%, transparent)' }}>
						<span className="word" data-delay="0">Marketplace</span>
						<span className="word" data-delay="200">de</span>
						<span className="word" data-delay="400">Influencia</span>
						<span className="word" data-delay="600">de</span>
						<span className="word" data-delay="800"><b>Axi Connect</b></span>
						<span className="word" data-delay="1000">—</span>
						<span className="word" data-delay="1200">Conexiones</span>
						<span className="word" data-delay="1400">estratégicas</span>
						<span className="word" data-delay="1600">con</span>
						<span className="word" data-delay="1800">impacto</span>
						<span className="word" data-delay="2000">real.</span>
					</h2>
					<div className="mt-4 h-px w-16 opacity-30" style={{ background: 'linear-gradient(to right, transparent, color-mix(in srgb, var(--foreground) 60%, transparent), transparent)' }} />
				</div>

				{/* Main headline */}
				<div className="mx-auto max-w-5xl text-center">
					<h1 className="text-decoration text-3xl leading-tight font-extralight tracking-tight md:text-5xl lg:text-6xl" style={{ color: 'var(--foreground)' }}>
						<div className="mb-4 md:mb-6">
							<span className="word" data-delay="2200">Conecta</span>
							<span className="word" data-delay="2350">marcas</span>
							<span className="word" data-delay="2500">e</span>
							<span className="word" data-delay="2650">influencers</span>
							<span className="word" data-delay="2800">de</span>
							<span className="word" data-delay="2950">alto</span>
							<span className="word" data-delay="3100">impacto.</span>
						</div>
						<div className="text-2xl leading-relaxed font-thin md:text-3xl lg:text-4xl" style={{ color: 'color-mix(in srgb, var(--foreground) 75%, transparent)' }}>
							<span className="word" data-delay="3300">Filtra</span>
							<span className="word" data-delay="3450">por</span>
							<span className="word" data-delay="3600">industria,</span>
							<span className="word" data-delay="3750">alcance</span>
							<span className="word" data-delay="3900">y</span>
							<span className="word" data-delay="4050">audiencia;</span>
							<span className="word" data-delay="4200">gestiona</span>
							<span className="word" data-delay="4350">la</span>
							<span className="word" data-delay="4500">relación</span>
							<span className="word" data-delay="4650">end‑to‑end</span>
							<span className="word" data-delay="4800">y</span>
							<span className="word" data-delay="4950">mide</span>
							<span className="word" data-delay="5100">el</span>
							<span className="word" data-delay="5250">ROI.</span>
						</div>
					</h1>
					<div className="absolute top-1/2 -left-8 h-px w-4 opacity-20" style={{ background: 'var(--foreground)', animation: 'word-appear 1s ease-out forwards', animationDelay: '3.5s' }} />
					<div className="absolute top-1/2 -right-8 h-px w-4 opacity-20" style={{ background: 'var(--foreground)', animation: 'word-appear 1s ease-out forwards', animationDelay: '3.7s' }} />
				</div>

				{/* Bottom tagline */}
				<div className="text-center">
					<div className="mb-4 h-px w-16 opacity-30" style={{ background: 'linear-gradient(to right, transparent, color-mix(in srgb, var(--foreground) 60%, transparent), transparent)' }} />
					<h2 className="font-mono text-xs font-light tracking-[0.2em] uppercase opacity-80 md:text-sm" style={{ color: 'color-mix(in srgb, var(--foreground) 75%, transparent)' }}>
						<span className="word" data-delay="5600">ROI</span>
						<span className="word" data-delay="5750">claro,</span>
						<span className="word" data-delay="5900">integraciones</span>
						<span className="word" data-delay="6050">seguras</span>
						<span className="word" data-delay="6200">y</span>
						<span className="word" data-delay="6350">métricas</span>
						<span className="word" data-delay="6500">en</span>
						<span className="word" data-delay="6650">tiempo</span>
						<span className="word" data-delay="6800">real.</span>
					</h2>
					<div className="mt-8 flex justify-center gap-3 opacity-0" style={{ animation: 'word-appear 1s ease-out forwards', animationDelay: '6900ms' }}>
						<Link prefetch={false} href="/signup" className="inline-flex items-center rounded-full bg-brand-gradient px-6 py-2.5 text-sm font-medium text-white transition-all hover:shadow-lg">Comenzar ahora</Link>
						<Link prefetch={false} href="/marketplace/browse" className="inline-flex items-center rounded-full border border-border px-6 py-2.5 text-sm font-medium transition-colors hover:text-brand">Explorar talentos</Link>
					</div>
				</div>
			</div>

			<div
				id="mouse-gradient"
				ref={gradientRef}
				className="pointer-events-none fixed h-96 w-96 rounded-full opacity-0 blur-3xl transition-all duration-500 ease-out"
				style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--axi-brand) 20%, transparent) 0%, transparent 100%)' }}
			/>
		</div>
	);
}