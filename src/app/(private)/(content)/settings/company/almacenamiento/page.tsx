import { StorageView } from "@/modules/storage/public";

export const metadata = { title: "Almacenamiento · Mi empresa" };

/**
 * Pestaña «Almacenamiento» de Mi empresa (T1 del control de almacenamiento):
 * lo que queda, en qué se va y a qué ritmo crece. Solo owner/admin
 * (`storage:read`); la vista explica quién lo ve si llega alguien más.
 */
export default function CompanyStoragePage() {
  return <StorageView />;
}
