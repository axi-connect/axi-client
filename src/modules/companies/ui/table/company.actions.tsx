"use client"

import { useState } from "react"
import { Modal } from "@/shared/components/ui/modal"
import { parseHttpError } from "@/core/services/api"
import { Button } from "@/shared/components/ui/button"
import { Copy, Eye, MoreHorizontal, Pencil, Trash } from "lucide-react"
import type { DataRow } from "@/shared/components/features/data-table/types"
import { deleteCompany, getCompanyById } from "@/modules/companies/infrastructure/company-service.adapter"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu"

export function CompanyRowActions({ company }: { company: DataRow }) {
  const [submitting, setSubmitting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const onDeleteClick = () => setConfirmOpen(true)

  const onEditClick = async () => {
    try {
      document.body.style.cursor = "wait";
      const id = company.id as string | number
      const res = await getCompanyById(id)
      const payload = res.data
      document.body.style.cursor = "default";
      window.dispatchEvent(new CustomEvent("companies:edit:open", { detail: { defaults: payload } }))
    } catch (err) {
      document.body.style.cursor = "default";
      window.dispatchEvent(new CustomEvent("companies:error", { detail: { message: "No se pudo cargar el detalle de la empresa" } }))
    }
  }

  const onViewClick = async () => {
    try {
      const id = company.id as string | number
      const res = await getCompanyById(id)
      const payload = res.data
      document.body.style.cursor = "default";
      window.dispatchEvent(new CustomEvent("companies:view:open", { detail: { defaults: payload } }))
    } catch (err) {
      document.body.style.cursor = "default";
      window.dispatchEvent(new CustomEvent("companies:error", { detail: { message: "No se pudo cargar el detalle de la empresa" } }))
    }
  }

  const handleConfirmDelete = async () => {
    if (submitting) return
    try {
      setSubmitting(true)
      const id = company.id as string | number
      const res = await deleteCompany(id)
      if (res.successful) {
        window.dispatchEvent(new CustomEvent("companies:delete:success", { detail: { id, message: res.message } }))
        setConfirmOpen(false)
      } else {
        window.dispatchEvent(new CustomEvent("companies:delete:error", { detail: { id, message: res.message } }))
      }
    } catch (err) {
      const { status, message } = parseHttpError(err)
      window.dispatchEvent(new CustomEvent("companies:delete:error", { detail: { id: (company as any).id, status, message } }))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Abrir menú de acciones</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <CompanyContextMenuItems
            company={company}
            onDeleteClick={onDeleteClick}
            onEditClick={onEditClick}
            onViewClick={onViewClick}
            kind="dropdown"
          />
        </DropdownMenuContent>
      </DropdownMenu>

      <Modal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        config={{
          title: "Eliminar empresa",
          description: `¿Seguro que deseas eliminar la empresa “${String(company.name ?? "")}”? Esta acción es permanente.`,
          actions: [
            { label: "Cancelar", variant: "outline", asClose: true, id: "company-delete-cancel" },
            { label: submitting ? "Eliminando..." : "Eliminar", variant: "destructive", asClose: false, onClick: handleConfirmDelete, id: "company-delete-confirm" },
          ],
          className: "sm:max-w-md",
        }}
      >
        <div className="text-sm text-muted-foreground">
          Esta acción no se puede deshacer. Se eliminarán de forma permanente los datos asociados a esta empresa.
        </div>
      </Modal>
    </div>
  )
}

export function CompanyContextMenuItems({ company, onDeleteClick, onEditClick, onViewClick, kind = "dropdown" }: {
  company: DataRow
  onDeleteClick: () => void
  onEditClick: () => void
  onViewClick: () => void
  kind?: "dropdown" | "context"
}) {
  const Label = kind === "dropdown" ? DropdownMenuLabel : (props: any) => <div className={props.className}>{props.children}</div>
  const Separator = kind === "dropdown" ? DropdownMenuSeparator : (() => <div className="my-1 h-px w-full bg-border" />)
  const Item = kind === "dropdown" ? DropdownMenuItem : (({ className, onClick, children }: any) => (
    <button
      role="menuitem"
      className={`block w-full rounded-sm px-3 py-2 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground ${className ?? ""}`}
      onClick={onClick}
    >{children}</button>
  ))

  return (
    <>
      <Label>Acciones</Label>
      <Item className="flex items-center gap-2" onClick={() => navigator.clipboard.writeText(JSON.stringify(company))}>
        <Copy className="h-4 w-4" />
        Copiar Objeto
      </Item>
      <Separator />
      <Item className="flex items-center gap-2" onClick={onViewClick}>
        <Eye className="h-4 w-4" />
        <span>Ver empresa</span>
      </Item>
      <Item className="flex items-center gap-2" onClick={onEditClick}>
        <Pencil className="h-4 w-4" />
        <span>Editar</span>
      </Item>
      <Item className="flex items-center gap-2 text-red-500" onClick={onDeleteClick}>
        <Trash className="h-4 w-4" />
        <span>Eliminar</span>
      </Item>
    </>
  )
}