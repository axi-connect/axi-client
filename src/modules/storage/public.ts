/**
 * SUPERFICIE PÚBLICA del slice `storage` (architecture.md §3.3; control de
 * almacenamiento, `docs/plans/storage_control_ui.md`).
 *
 * Consumidores:
 * - Mi empresa › Almacenamiento (`/settings/company/almacenamiento`) monta
 *   `StorageView`; la nav de `companies` usa `STORAGE_SETTINGS_PATH` y
 *   `STORAGE_READ_PERMISSION` para la pestaña.
 * - El layout privado monta `StorageQuotaWatcher` (WS `storage.quota_state`).
 * - Las subidas (inbox, catálogo, acciones rápidas, plantillas de marketing,
 *   imports de onboarding y CRM) usan `useStorageQuotaState` para apagarse con
 *   el espacio lleno y `useStorageQuotaNotice` para el 507.
 * - El inbox usa `formatStorageBytes` para la burbuja del adjunto depurado.
 * - El Panel monta `StorageWarningNotice` (aviso al 80 %, una vez por sesión).
 */
export {
  STORAGE_READ_PERMISSION,
  STORAGE_SETTINGS_PATH,
  formatStorageBytes,
  type StorageSummaryDTO,
} from "./domain/storage";
export {
  ATTACHMENT_PURGED,
  STORAGE_QUOTA_EXCEEDED,
  UPLOADS_BLOCKED_HINT,
  readQuotaExceeded,
  type QuotaExceededDetails,
} from "./domain/quota";
export { useStorageQuotaNotice, useStorageQuotaState } from "./infrastructure/hooks/use-storage-quota";
export { reportQuotaExceeded } from "./infrastructure/notices/report-quota-exceeded";
export { StorageQuotaWatcher } from "./ui/components/StorageQuotaWatcher";
export { StorageWarningNotice } from "./ui/components/StorageWarningNotice";
export { StorageSkeleton, StorageView } from "./ui/StorageView";
