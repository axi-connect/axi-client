'use client';

import type React from 'react';
import Image from 'next/image';
import { cn } from '@/core/lib/utils';
import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';
import { Bricolage_Grotesque } from 'next/font/google';
import { motion, AnimatePresence } from 'framer-motion';
import { Spotlight } from '@/shared/components/layout/site/components/spotlight';
import { FaWhatsapp, FaInstagram, FaFacebookMessenger } from 'react-icons/fa';
import { Particles } from '@/shared/components/layout/site/components/particles';
import { ArrowRight, Sparkles, ChartNoAxesCombined, Wallet } from 'lucide-react';

const brico = Bricolage_Grotesque({
  subsets: ['latin'],
});

// Sample users for the waitlist display
const channelsIcons: React.ReactNode[] = [
  <FaWhatsapp key="whatsapp" className="text-white h-5 w-5" />,
  <FaInstagram key="instagram" className="text-white h-5 w-5" />,
  <FaFacebookMessenger key="messenger" className="text-white h-5 w-5" />,
];

export default function SiteHero() {
  const { resolvedTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [color, setColor] = useState('#ffffff');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setColor(resolvedTheme === 'dark' ? '#ffffff' : '#e60a64');
  }, [resolvedTheme]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Your form submission logic here
    // For now, let's just simulate a delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSubmitted(true);
    setIsSubmitting(false);
  };

  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden xl:h-screen">
      <Spotlight />

      <Particles
        refresh
        ease={80}
        color={color}
        quantity={100}
        className="absolute inset-0 z-0"
      />

      <div className="mt-16 mx-auto px-4 py-16 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="border-primary/10 from-primary/15 to-primary/5 mb-6 inline-flex items-center gap-2 rounded-full border bg-gradient-to-r px-4 py-2 backdrop-blur-sm"
        >
          <Image src="https://res.cloudinary.com/dpfnxj52w/image/upload/v1759421795/isotipo_we1obn.png" alt="Axi Connect isotype" width={32} height={32} priority style={{ width: 'auto', height: 'auto' }} className="animate-pulse" />

          <span className="text-sm font-medium">Axi Connect 1.0 — El futuro del servicio al cliente</span>
          <motion.div
            animate={{ x: [0, 5, 0] }}
            transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
          >
            <ArrowRight className="h-4 w-4" />
          </motion.div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          className={cn(
            'from-foreground via-foreground/80 to-foreground/40 mb-4 cursor-crosshair bg-gradient-to-b bg-clip-text text-3xl font-bold text-transparent sm:text-7xl',
            brico.className,
          )}
        >
          Habla menos {' '}
          <span className="bg-primary from-foreground to-primary via-rose-300 bg-clip-text text-transparent dark:bg-gradient-to-b">
            Logra más
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="text-muted-foreground mt-2 mb-12 sm:text-lg"
        >
          Donde la tecnología entiende a las personas y las empresas se vuelven más humanas.
          <br className="hidden sm:block" /> 
          Automatiza conversaciones, acelera ventas y crea experiencias que la gente nunca olvidará.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="mb-12 grid grid-cols-2 gap-6 sm:grid-cols-3"
        >
          <div className="border-primary/10 flex flex-col items-center justify-center rounded-xl border bg-background/5 p-4 backdrop-blur-md">
            <div className="flex -space-x-3">
            {
              channelsIcons.map((icon, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0, x: -10 }}
                  animate={{ scale: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 1 }}
                  className="border-background from-primary size-10 rounded-full border-2 bg-gradient-to-r to-rose-500 flex items-center justify-center"
                >
                  {icon}
                </motion.div>
              ))
            }
            </div>
            <span className="text-xl font-bold">Control</span>
            <span className="text-muted-foreground text-xs">Todo en un solo lugar</span>
          </div>

          <div className="border-primary/10 flex flex-col items-center justify-center rounded-xl border bg-background/5 p-4 backdrop-blur-md">
            <ChartNoAxesCombined className="text-primary mb-2 size-7 animate-pulse" />
            <span className="text-xl font-bold">Productividad</span>
            <span className="text-muted-foreground text-xs">Deja que la IA trabaje por ti</span>
          </div>

          <div className="border-primary/10 flex flex-col items-center justify-center rounded-xl border bg-background/5 p-4 backdrop-blur-md">
            <Wallet className="text-primary mb-2 size-7" />
            <span className="text-xl font-bold">Crecimiento</span>
            <span className="text-muted-foreground text-xs">Cada conversación vale</span>
          </div>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          onSubmit={handleSubmit}
          className="mx-auto flex flex-col gap-4 sm:flex-row"
        >
          <AnimatePresence mode="wait">
            {!submitted ? (
              <>
                <div className="relative flex-1">
                  <motion.input
                    id="email"
                    required
                    type="email"
                    name="email"
                    value={email}
                    key="email-input"
                    exit={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    initial={{ opacity: 0, y: 10 }}
                    placeholder="Ingresa tu correo electrónico"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                    className="border-primary/20 text-foreground placeholder:text-muted-foreground/70 focus:border-primary/50 focus:ring-primary/30 w-full rounded-xl border bg-white/5 px-6 py-4 backdrop-blur-md transition-all focus:ring-2 focus:outline-none"
                  />
                  {error && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-destructive/40 bg-destructive/10 text-destructive mt-2 rounded-xl border px-4 py-1 text-sm sm:absolute"
                    >
                      {error}
                    </motion.p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting || submitted}
                  className="group focus:ring-primary/50 relative overflow-hidden rounded-xl bg-gradient-to-b bg-brand-gradient px-8 py-4 font-semibold text-white shadow-[0px_2px_0px_0px_rgba(255,255,255,0.3)_inset] transition-all duration-300 hover:shadow-[0_0_20px_rgba(236,72,153,0.4)] focus:ring-2 focus:outline-none active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {isSubmitting ? 'Uniendo...' : 'Comenzar ahora'}
                    <Sparkles className="h-4 w-4 transition-all duration-300 group-hover:rotate-12" />
                  </span>
                  <span className="to-primary absolute inset-0 z-0 bg-gradient-to-r bg-brand-gradient opacity-0 transition-opacity duration-300 group-hover:opacity-100"></span>
                </button>
              </>
            ) : (
              <motion.div
                key="thank-you-message"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.6 }}
                className={cn(
                  'border-primary/20 from-primary/10 to-primary/10 text-primary flex-1 cursor-pointer rounded-xl border bg-gradient-to-r via-transparent px-6 py-4 font-medium backdrop-blur-md transition-all duration-300 hover:shadow-[0_0_20px_rgba(236,72,153,0.3)] active:brightness-125',
                )}
              >
                <span className="flex items-center justify-center gap-2">
                  Gracias por unirte!{' '}
                  <Sparkles className="h-4 w-4 animate-pulse" />
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.form>
      </div>

      <style jsx global>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0) translateX(0);
            opacity: 0.3;
          }
          25% {
            transform: translateY(-20px) translateX(10px);
            opacity: 0.8;
          }
          50% {
            transform: translateY(-40px) translateX(-10px);
            opacity: 0.4;
          }
          75% {
            transform: translateY(-20px) translateX(10px);
            opacity: 0.6;
          }
        }
      `}</style>
    </main>
  );
}