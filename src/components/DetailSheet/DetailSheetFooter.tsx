"use client"

import React from "react"
import { cn } from "@/lib/utils"

export interface DetailSheetFooterProps extends React.ComponentProps<"div"> {}

export function DetailSheetFooter({ className, ...rest }: DetailSheetFooterProps) {
  return (
    <div className={cn("mt-auto p-4 border-t border-border", className)} {...rest} />
  )
}