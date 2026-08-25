"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/core/lib/utils"
import {
  SegmentedPill,
  segmentedItemVariants,
  segmentedListVariants,
  type SegmentedSize,
} from "@/shared/components/ui/segmented"

/**
 * Pestañas con panel (Radix). El aspecto por defecto es la **pastilla** de
 * `segmented.tsx`: es el lenguaje único de todas las pestañas del panel
 * (DESIGN-SYSTEM §9.3). La variante `boxed` conserva el rectángulo gris de
 * shadcn para los casos que aún lo necesiten — hoy ninguno lo usa.
 *
 * La semántica no cambia: sigue siendo `role="tab"` con su `tabpanel`, y las
 * flechas las aporta el primitivo. Lo único que se añade es la pastilla, que se
 * posiciona midiendo el `data-state="active"` que Radix ya escribe, así que
 * `TabsList` no necesita conocer el valor activo.
 */

type TabsVariant = "pill" | "boxed"

const TabsListContext = React.createContext<{ variant: TabsVariant; size: SegmentedSize }>({
  variant: "pill",
  size: "default",
})

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function TabsList({
  className,
  children,
  variant = "pill",
  size = "default",
  surface = "raised",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & {
  variant?: TabsVariant
  size?: SegmentedSize
  surface?: "raised" | "inline"
}) {
  const listRef = React.useRef<HTMLDivElement>(null)

  if (variant === "boxed") {
    return (
      <TabsListContext.Provider value={{ variant, size }}>
        <TabsPrimitive.List
          data-slot="tabs-list"
          className={cn(
            "bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]",
            className
          )}
          {...props}
        >
          {children}
        </TabsPrimitive.List>
      </TabsListContext.Provider>
    )
  }

  return (
    <TabsListContext.Provider value={{ variant, size }}>
      <TabsPrimitive.List
        ref={listRef}
        data-slot="tabs-list"
        className={cn(segmentedListVariants({ size, surface }), className)}
        {...props}
      >
        <SegmentedPill listRef={listRef} size={size} />
        {children}
      </TabsPrimitive.List>
    </TabsListContext.Provider>
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const { variant, size } = React.useContext(TabsListContext)

  if (variant === "boxed") {
    return (
      <TabsPrimitive.Trigger
        data-slot="tabs-trigger"
        className={cn(
          "cursor-pointer data-[state=active]:bg-background dark:data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
          className
        )}
        {...props}
      />
    )
  }

  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(segmentedItemVariants({ size }), "[&_svg]:pointer-events-none", className)}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
