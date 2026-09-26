"use client"

import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"

import { cn } from "@/core/lib/utils"

/**
 * `size="lg"`: 24 px de alto, el objetivo mínimo de §10/§12 — para los
 * interruptores que son LA acción de una ficha (Cobros premium). El tamaño por
 * defecto no cambia: lo usan formularios densos de todo el panel.
 */
function Switch({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & { size?: "default" | "lg" }) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:border-ring focus-visible:ring-ring/50 inline-flex shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        size === "lg" ? "h-6 w-11" : "h-[1.15rem] w-8",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "bg-background pointer-events-none block rounded-full ring-0 transition-transform data-[state=unchecked]:translate-x-0",
          size === "lg"
            ? "size-5 data-[state=checked]:translate-x-[calc(100%+2px)]"
            : "size-4 data-[state=checked]:translate-x-[calc(100%-2px)]"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
