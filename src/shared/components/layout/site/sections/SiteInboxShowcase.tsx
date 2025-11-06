'use client';

import { ArrowRight, Coins } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

const features = [
  "Califica Leads",
  // "Cobro de Cartera",
  "Cierra Ventas",
  "Retiene Clientes",
  "Gestiona Riesgos",
  "Programa Reuniones",
  "Soporte al Cliente PQRS",
]

export default function SiteInboxShowcase() {
  return (
    <div className="min-h-screen py-6 sm:py-14">
      <div className="pointer-events-none absolute inset-0 top-0 z-0 overflow-hidden">
        <div className="absolute -top-20 -left-20 h-[600px] w-[600px] rounded-full bg-gradient-to-br from-primary/30 via-primary/20 to-transparent opacity-50 blur-[100px]" />
        <div className="absolute -top-40 -right-20 h-[500px] w-[500px] rounded-full bg-gradient-to-bl from-primary/30 via-primary/20 to-transparent opacity-50 blur-[100px]" />
        <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-gradient-to-tr from-primary/20 via-primary/10 to-transparent opacity-30 blur-[80px]" />
      </div>

      <main className="relative container mt-4 max-w-[1100px] px-2 py-4 lg:py-8 mx-auto">
        <div className="relative sm:overflow-hidden">
          <div className="border-primary/20 bg-background/70 shadow-primary/10 relative flex flex-col items-start justify-start rounded-xl border px-4 pt-12 shadow-xl backdrop-blur-md max-md:text-center md:px-12 md:pt-16">
            <div
              className="animate-gradient-x absolute inset-0 top-32 z-0 hidden blur-2xl dark:block"
              style={{
                maskImage:
                  'linear-gradient(to bottom, transparent, white, transparent)',
                background:
                  'repeating-linear-gradient(65deg, hsl(var(--primary)), hsl(var(--primary)/0.8) 12px, color-mix(in oklab, hsl(var(--primary)) 30%, transparent) 20px, transparent 200px)',
                backgroundSize: '200% 100%',
              }}
            />
            <div
              className="animate-gradient-x absolute inset-0 top-32 z-0 text-left blur-2xl dark:hidden"
              style={{
                maskImage:
                  'linear-gradient(to bottom, transparent, white, transparent)',
                background:
                  'repeating-linear-gradient(65deg, hsl(var(--primary)/0.9), hsl(var(--primary)/0.7) 12px, color-mix(in oklab, hsl(var(--primary)) 30%, transparent) 20px, transparent 200px)',
                backgroundSize: '200% 100%',
              }}
            />
            <h2 className="text-3xl font-bold tracking-tighter mb-4 flex flex-wrap gap-2 leading-tight md:text-5xl">
              Todo empieza con una <span className="text-primary">conversación</span>
            </h2>
            <p className="text-muted-foreground mb-8 text-left md:max-w-[80%]">
              Un panel que une canales, clientes y agentes en una sola vista para que puedas dirigir tu empresa con precisión, sin perder ni un segundo ni una venta.
            </p>
            <div className="mb-6 flex flex-wrap gap-4 md:flex-row">
              {
                features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <svg
                      className="text-primary h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      ></path>
                    </svg>
                    <span>{feature}</span>
                  </div>
                ))
              }
            </div>

            <div className="z-10 mt-2 inline-flex items-center justify-start gap-3">
              <Button 
                size="lg" 
                variant="default">
                Da el primer paso <ArrowRight className="size-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
              >
                Precios y planes
                <Coins className="size-4" />
              </Button>
            </div>

            <div className="relative z-10 mt-12 w-full">
              <img
                // src="https://i.postimg.cc/KjvHrBH0/bg.webp"
                src="https://res.cloudinary.com/dpfnxj52w/image/upload/v1762256600/screencapture-axi-connect-local-workspace-inbox_c3voug.png"
                alt="MVPBlocks component library preview"
                width={1000}
                height={600}
                className="animate-in fade-in slide-in-from-bottom-12 z-10 mx-auto -mb-60 w-full rounded-lg border-6 border-neutral-100 object-cover shadow-2xl duration-1000 select-none lg:-mb-40 dark:border-neutral-600"
              />

              <div className="animate-in fade-in slide-in-from-left-4 absolute -top-6 -right-6 rotate-6 transform rounded-lg bg-white p-3 shadow-lg dark:bg-neutral-900">
                <div className="flex items-center gap-2">
                  <svg
                    className="h-5 w-5 text-green-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fillRule="evenodd"
                      d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    ></path>
                  </svg>
                  <span className="font-medium">Prospectar y Cualificar Clientes</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
