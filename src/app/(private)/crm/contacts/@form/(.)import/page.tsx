"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/shared/components/ui/modal";
import {
  ContactImportWizard,
  IMPORT_STEP_COPY,
  type ImportWizardStep,
} from "@/modules/crm/ui/components/imports/ContactImportWizard";

/**
 * Modal interceptado de importación (URL compartible; back cierra). El diálogo
 * pone título y descripción según el paso; el asistente pinta su propio pie,
 * así que aquí no hay `actions` (y no aplica la regla de `keepOpen`).
 */
export default function CrmContactsInterceptImport() {
  const router = useRouter();
  const [step, setStep] = useState<ImportWizardStep>("guide");
  const copy = IMPORT_STEP_COPY[step];

  return (
    <Modal
      open={true}
      onOpenChange={(open) => {
        if (!open) router.back();
      }}
      config={{ title: copy.title, description: copy.description, className: "sm:max-w-2xl" }}
    >
      <ContactImportWizard
        variant="modal"
        onStepChange={setStep}
        onClose={() => router.back()}
      />
    </Modal>
  );
}
