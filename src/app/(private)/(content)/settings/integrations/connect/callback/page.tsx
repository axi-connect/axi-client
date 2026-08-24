import { Suspense } from "react";

import { OAuthCallbackView } from "@/modules/integrations/ui/components/connect/OAuthCallbackView";

/** `useSearchParams` exige Suspense en el App Router (lee ?provider=&status=). */
export default function IntegrationOAuthCallbackPage() {
  return (
    <Suspense>
      <OAuthCallbackView />
    </Suspense>
  );
}
