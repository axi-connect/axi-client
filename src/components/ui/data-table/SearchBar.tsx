"use client"

import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronDown, Search, X } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

type SearchBarProps = {
  fields: { key: string; label: string }[]
  field: string
  value: string
  trigger: "debounced" | "submit"
  messages: {
    searchPlaceholder?: (label: string) => string
    searchButton?: string
    clearButton?: string
    fieldLabelFallback?: string
  }
  onFieldChange: (key: string) => void
  onValueChange: (value: string) => void
  onSubmit?: () => void
  onClear?: () => void
}

export function SearchBar({ fields, field, value, trigger, messages, onFieldChange, onValueChange, onSubmit, onClear }: SearchBarProps) {
  const fieldLabelMap = useMemo(() => Object.fromEntries(fields.map((f) => [f.key, f.label])), [fields])
  const placeholder = messages.searchPlaceholder?.(fieldLabelMap[field] || messages.fieldLabelFallback || "campo")

  return (
    <div className="flex items-center gap-2">
      <form
        className="relative flex w-full items-center gap-2"
        onSubmit={(e) => {
          if (trigger !== "submit") return
          e.preventDefault()
          onSubmit?.()
        }}
      >
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          className="flex-1"
          aria-label={placeholder}
        />
        {Boolean(value) && (
          <Button
            type="button"
            variant="ghost"
            className="h-8 px-2 text-muted-foreground"
            onClick={onClear}
            title={messages.clearButton || "Limpiar"}
            aria-label={messages.clearButton || "Limpiar"}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        {trigger === "submit" && (
          <Button type="submit" className="h-8 gap-2 px-3" title={messages.searchButton || "Buscar"} aria-label={messages.searchButton || "Buscar"}>
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">{messages.searchButton || "Buscar"}</span>
          </Button>
        )}
      </form>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2" aria-label="Seleccionar campo">
            {fieldLabelMap[field] || messages.fieldLabelFallback || "Campo"}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" aria-label="Opciones de campo">
          {fields.map((f) => (
            <DropdownMenuItem key={f.key} onClick={() => onFieldChange(f.key)}>
              {f.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}