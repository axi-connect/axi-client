"use client"

import * as React from "react"
import { cn } from "@/core/lib/utils"

type DivProps = React.ComponentProps<"div">

export interface DetailSheetHeaderProps extends Omit<DivProps, "title"> {
  title?: React.ReactNode
  subtitle?: React.ReactNode
  onClose?: () => void
}

export function DetailSheetHeader({ title, subtitle, className, children, ...rest }: DetailSheetHeaderProps) {
  return (
    <div className={cn("flex items-start gap-3 p-4 border-b border-border", className)} {...rest}>
      <div className="min-w-0 flex-1">
        {title ? <h3 className="text-foreground font-semibold truncate">{title}</h3> : null}
        {subtitle ? <p className="text-muted-foreground text-sm truncate">{subtitle}</p> : null}
        {children}
      </div>
    </div>
  )
}