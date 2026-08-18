import { Suspense } from "react";

import { ConnectIntegrationView } from "@/modules/integrations/ui/components/connect/ConnectIntegrationView";

/** `useSearchParams` exige Suspense en el App Router (lee ?provider=). */
export default function ConnectIntegrationPage() {
  return (
    <Suspense>
      <ConnectIntegrationView />
    </Suspense>
  );
}
