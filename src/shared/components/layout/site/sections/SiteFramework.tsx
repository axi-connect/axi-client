'use client';

import { cn } from '@/core/lib/utils';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, Cable, Brain, Waypoints } from 'lucide-react';

const IMG_TEST = "https://res.cloudinary.com/dpfnxj52w/image/upload/v1762377358/notification-cover_ghfqa5.png"

const features = [
  {
    step: 'Todo en uno',
    title: 'Conecta',
    icon: <Cable className="text-primary h-6 w-6" />,
    content: '🧩 Unifica tus puntos de contacto en un ecosistema comercial coherente.',
    image: 'https://res.cloudinary.com/dpfnxj52w/image/upload/v1762278699/agents-cover_v9gbrg.png'
  },
  {
    title: 'Aprende',
    step: 'Aprende de tus datos',
    content: '💡 De la atención al cliente… al conocimiento del cliente.',
    icon: <Brain className="text-primary h-6 w-6" />,
    image: "https://res.cloudinary.com/dpfnxj52w/image/upload/v1762284864/conversation-cover_rghzsm.png"
  },
  {
    title: 'Actúa',
    step: 'Acelera tus ventas',
    content: '⚙️ Menos esfuerzo. Más impacto. Automatiza tareas repetitivas, ejecuta seguimientos y distribuye conversaciones a tu equipo de agentes.',
    icon: <Waypoints className="text-primary h-6 w-6" />,
    image:
      IMG_TEST,
  },
  {
    title: 'Escala',
    step: 'Escala con confianza',
    content: '🚀 Cada acción genera información útil: rendimiento, tiempos, conversiones y experiencias. Escalar no significa tener más conversaciones, sino que cada conversación valga más.',
    icon: <Rocket className="text-primary h-6 w-6" />,
    image:
      IMG_TEST,
      // 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop',
  },
];

// Axi Connect es el cerebro comercial de tu negocio.
// Axi une tecnología y empatía para que cada conversación impulse ventas, fidelidad y propósito.
// No automatices la atención, eleva la experiencia.

export default function SiteFramework() {
  const [progress, setProgress] = useState(0);
  const [currentFeature, setCurrentFeature] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      if (progress < 100) {
        setProgress((prev) => prev + 100 / (8000 / 100)); // 8000ms = 8 segundos
      } else {
        setCurrentFeature((prev) => (prev + 1) % features.length);
        setProgress(0);
      }
    }, 100);

    return () => clearInterval(timer);
  }, [progress]);

  return (
    <div className={'p-8 md:p-12'}>
      <div className="mx-auto w-full max-w-7xl">
        <div className="relative mx-auto mb-12 max-w-2xl sm:text-center">
          <div className="relative z-10">
            <h2 className="text-3xl font-bold tracking-tighter md:text-4xl lg:text-5xl">
              La comunicación es la base de todo negocio.
            </h2>
            <p className="text-foreground/60 mt-3">
              Una empresa no crece por lo que dice, sino por lo que entiende. <br />
              Aprende de tus conversaciones, optimiza tus procesos y atiende a tus clientes de forma eficiente. Haz que cada conversación impulse ventas, fidelidad y propósito.
            </p>
          </div>
          <div
            className="absolute inset-0 mx-auto h-44 max-w-xs blur-[118px]"
            style={{
              background:
                'linear-gradient(152.92deg, rgba(192, 15, 102, 0.2) 4.54%, rgba(192, 11, 109, 0.26) 34.2%, rgba(192, 15, 102, 0.1) 77.55%)',
            }}
          ></div>
        </div>
        <hr className="bg-foreground/30 mx-auto mb-10 h-px w-1/2" />

        <div className="flex flex-col gap-6 md:grid md:grid-cols-2 md:gap-10">
          <div className="order-2 space-y-8 md:order-1">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className="flex items-center gap-6 md:gap-8"
                initial={{ opacity: 0.3, x: -20 }}
                animate={{
                  opacity: index === currentFeature ? 1 : 0.3,
                  x: 0,
                  scale: index === currentFeature ? 1.05 : 1,
                }}
                transition={{ duration: 0.5 }}
              >
                <motion.div
                  className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-full border-2 md:h-14 md:w-14',
                    index === currentFeature
                      ? 'border-primary bg-primary/10 text-primary scale-110 [box-shadow:0_0_15px_rgba(192,15,102,0.3)]'
                      : 'border-muted-foreground bg-muted',
                  )}
                >
                  {feature.icon}
                </motion.div>

                <div className="flex-1">
                  <h3 className="text-xl font-semibold md:text-2xl">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground text-sm md:text-base">
                    {feature.content}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="self-center border-primary/20 relative order-1 h-[200px] overflow-hidden rounded-xl border [box-shadow:0_5px_30px_-15px_rgba(192,15,102,0.3)] md:order-2 md:h-[300px] lg:h-[400px]">
            <AnimatePresence mode="wait">
              {features.map(
                (feature, index) =>
                  index === currentFeature && (
                    <motion.div
                      key={index}
                      className="absolute inset-0 overflow-hidden rounded-lg"
                      initial={{ y: 100, opacity: 0, rotateX: -20 }}
                      animate={{ y: 0, opacity: 1, rotateX: 0 }}
                      exit={{ y: -100, opacity: 0, rotateX: 20 }}
                      transition={{ duration: 0.5, ease: 'easeInOut' }}
                    >
                      <img
                        src={feature.image}
                        alt={feature.title}
                        className="h-full w-full transform object-cover transition-transform hover:scale-105"
                        width={1000}
                        height={500}
                      />
                      <div className="from-background via-background/50 absolute right-0 bottom-0 left-0 h-2/3 bg-gradient-to-t to-transparent" />

                      <div className="bg-background/80 absolute bottom-4 left-4 rounded-lg p-2 backdrop-blur-sm">
                        <span className="text-primary text-xs font-medium">
                          {feature.step}
                        </span>
                      </div>
                    </motion.div>
                  ),
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
