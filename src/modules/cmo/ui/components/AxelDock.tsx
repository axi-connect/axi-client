"use client";

import { useEffect, useState } from "react";

import { AxelHeroAvatar } from "./AxelHeroAvatar";

interface AxelDockProps {
  ownerTyping: boolean;
}

/**
 * La barra de Axel: sticky, transparente en reposo y cristal al acoplarse.
 *
 * Aquí vive **la única instancia viva de Axel**. En estado hero cuelga de la
 * barra a tamaño completo, centrado; al bajar (`data-docked` en la raíz del
 * chat, lo pone `useDockedHero`) el CSS lo lleva a la esquina a 40 px con un
 * `transform` y encienden por `opacity` el cristal, el nombre y la fecha. Ni un
 * segundo componente ni un solo render de React: el rig, la mirada y la
 * respiración componen con el `transform` del contenedor.
 */
export function AxelDock({ ownerTyping }: AxelDockProps) {
  const today = useTodayLabel();

  return (
    <header className="axel-dock">
      <div className="axel-dock__bar">
        <div className="axel-dock__hero">
          <AxelHeroAvatar ownerTyping={ownerTyping} />
        </div>
        <span className="axel-dock__title font-heading" aria-hidden="true">
          Axel
        </span>
        {today === null ? null : (
          <span className="axel-dock__day" aria-hidden="true">
            {today}
          </span>
        )}
      </div>
    </header>
  );
}

/**
 * «mié 15 sep». Se calcula DESPUÉS de montar y no en el render: servidor y
 * navegador pueden estar en husos distintos, y una fecha formateada en el HTML
 * del servidor que no coincide con la del cliente es un error de hidratación.
 */
function useTodayLabel(): string | null {
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    setLabel(
      new Intl.DateTimeFormat("es-CO", { weekday: "short", day: "numeric", month: "short" })
        .format(new Date())
        .replace(" de ", " ")
        .replace(/\./g, ""),
    );
  }, []);
  return label;
}
