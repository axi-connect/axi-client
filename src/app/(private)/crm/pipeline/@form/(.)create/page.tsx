"use client";

import { Suspense } from "react";
import { CreateDealModal } from "@/modules/crm/ui/forms/CreateDealModal";

/** Modal interceptado de creación: se abre sobre el board sin salir de él. */
export default function CrmDealsInterceptCreate() {
  return (
    <Suspense fallback={null}>
      <CreateDealModal />
    </Suspense>
  );
}
