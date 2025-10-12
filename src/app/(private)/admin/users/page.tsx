"use client"

import { Plus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { buildListParams } from "@/shared/query";
import { useEffect, useRef, useState } from "react";
import type { UserRow } from "@/modules/users/domain/user";
import { UserForm } from "@/modules/users/ui/form/UserForm";
import { AvatarPreview } from "@/modules/users/ui/components/AvatarPreview";
import { UserContextMenuItems } from "@/modules/users/ui/table/users.actions";
import { DataTable, type DataTableRef } from "@/components/features/data-table";
import { FloatingAlert, type FloatingAlertConfig } from "@/components/ui/floating-alert";
import { fetchUsers, userColumns, usersData } from "@/modules/users/ui/table/users.config";

export default function UsersPage() {
  const pageSize = 10;
  const tableRef = useRef<DataTableRef>(null)
  const [modalOpen, setModalOpen] = useState(false);
  const [rows, setRows] = useState<UserRow[]>(usersData);
  const [searchValue, setSearchValue] = useState<string>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [total, setTotal] = useState<number | undefined>(undefined);
  const [sortBy, setSortBy] = useState<keyof UserRow | undefined>();
  const [searchField, setSearchField] = useState<keyof UserRow>("name");

  async function load(
    p?: number,
    by = sortBy,
    dir: "asc" | "desc" = sortDir,
    field = searchField,
    value = searchValue
  ) {
    const current = p ?? tableRef.current?.getCurrentPage() ?? 1
    try {
      const params = buildListParams<keyof UserRow & string>({
        page: current,
        pageSize,
        sortBy: by as string | undefined,
        sortDir: dir,
        searchField: field as keyof UserRow & string,
        searchValue: value,
        extra: { view: "summary" },
      })
      const { rows, total: totalFromServer } = await fetchUsers(params as any);
      setRows(rows);
      setTotal(totalFromServer);
    } catch {
      const local = [...usersData];
      if (by) local.sort((a, b) => String(a[by as keyof UserRow] ?? "").localeCompare(String(b[by as keyof UserRow] ?? "")) * (dir === "asc" ? 1 : -1));
      const filtered = value && field ? local.filter((r) => String((r as any)[field] ?? "").toLowerCase().includes(String(value).toLowerCase())) : local
      setRows(filtered.slice((current - 1) * pageSize, current * pageSize));
      setTotal((value && field ? filtered.length : usersData.length));
    }
  }

  const handleSortChange = async (by: keyof UserRow, dir: "asc" | "desc") => {
    setSortBy(by); setSortDir(dir);
    await load(tableRef.current?.getCurrentPage(), by, dir);
  };

  const handleSearchChange = async ({ field, value }: { field: keyof UserRow; value: string }) => {
    setSearchField(field);
    setSearchValue(value);
    await load(1, sortBy, sortDir, field, value);
    tableRef.current?.goToPage(1)
  };

  useEffect(() => { load(1); tableRef.current?.goToPage(1) }, []);

  const [alertOpen, setAlertOpen] = useState(false);
  const [formDefaults, setFormDefaults] = useState<any | null>(null);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [alertConfig, setAlertConfig] = useState<FloatingAlertConfig | null>(null);

  const onModalSubmitClick = () => {
    const form = document.getElementById("user-form") as HTMLFormElement | null
    form?.requestSubmit()
  }
  
  const setAlert = (cfg: { variant: "default" | "destructive" | "success"; title: string; description?: string }) => {
    setAlertConfig(cfg)
    setAlertOpen(true)
  }

  useEffect(() => {
    const onDeleteSuccess = async (e: Event) => {
      const detail = (e as CustomEvent).detail as { id: string | number; message?: string }
      setAlert({ variant: "success", title: detail?.message || "Usuario eliminado correctamente" })
      const current = tableRef.current?.getCurrentPage() ?? 1
      await load(current)
    }

    const onError = (e: Event) => {
      const detail = (e as CustomEvent).detail as { message?: string; status?: number }
      setAlert({
        variant: "destructive",
        title: detail?.message || "No se pudo completar la acción",
        description: detail?.status ? `Código: ${detail.status}` : undefined,
      })
    }
    
    window.addEventListener("users:delete:success", onDeleteSuccess)
    window.addEventListener("users:error", onError)

    const onEditOpen = (e: Event) => {
      const { defaults } = (e as CustomEvent).detail as { defaults: any }
      setFormMode("edit")
      setFormDefaults(defaults)
      setModalOpen(true)
    }

    window.addEventListener("users:edit:open", onEditOpen)
    return () => {
      window.removeEventListener("users:delete:success", onDeleteSuccess)
      window.removeEventListener("users:error", onError)
      window.removeEventListener("users:edit:open", onEditOpen);
    }
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Usuarios</h1>
        </div>

        <p className="text-sm text-muted-foreground">
          Aquí puedes crear y gestionar los usuarios del sistema.
        </p>
        <Button style={{ borderRadius: "9999px" }} variant="default" onClick={() => { setFormMode("create"); setFormDefaults(null); setModalOpen(true); }}>
          <Plus className="h-4 w-4" />
          Crear usuario
        </Button>
      </div>

      <div className="rounded-xl border border-border-soft glass shadow-sm p-4 md:p-6">
        <DataTable
          data={rows}
          ref={tableRef}
          searchTrigger="submit"
          columns={userColumns}
          rowContextMenu={({ row }) => (
            <UserContextMenuItems
              user={row}
              onDeleteClick={() => window.dispatchEvent(new CustomEvent("users:delete:open", { detail: { user: row } }))}
              onEditClick={() => window.dispatchEvent(new CustomEvent("users:edit:open", { detail: { defaults: row } }))}
              onViewClick={() => window.dispatchEvent(new CustomEvent("users:view:open", { detail: { defaults: row } }))}
            />
          )}
          onSortChange={handleSortChange}
          onPageChange={(p) => { load(p); }}
          onSearchChange={handleSearchChange}
          pagination={{ pageSize, total }}
          search={{ field: searchField, value: searchValue }}
          sorting={{ by: sortBy as keyof UserRow, dir: sortDir }}
        />

        <FloatingAlert
          open={alertOpen}
          onOpenChange={setAlertOpen}
          config={{
            variant: alertConfig?.variant ?? "default",
            title: alertConfig?.title ?? "",
            description: alertConfig?.description,
            durationMs: 4000,
          }}
        />
      </div>

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        config={{
          title: formMode === "edit" ? "Editar Usuario" : "Crear Usuario",
          description: formMode === "edit"
            ? "Actualiza la información del usuario y guarda los cambios"
            : "Completa la información del usuario para registrarlo en el sistema",
          actions: [
            { label: "Cancelar", variant: "outline", asClose: true, id: "user-cancel" },
            { label: formMode === "edit" ? "Guardar cambios" : "Guardar", variant: "default", asClose: false, onClick: onModalSubmitClick, id: "user-save" },
          ],
        }}
      >
        <AvatarPreview defaults={formDefaults} />

        <UserForm
          host={{
            formMode,
            setAlert,
            closeModal: () => setModalOpen(false),
            defaultValues: formDefaults ?? undefined,
            refresh: () => load(tableRef.current?.getCurrentPage()),
          }}
        />
      </Modal>
    </div>
  );
}