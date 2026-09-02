import { Suspense } from "react";

import { SignupFunnelView, SignupSkeleton } from "@/modules/onboarding/ui/signup/SignupFunnelView";

/** `Suspense` obligatorio: la vista lee `useSearchParams` (preselección de oferta). */
export default function ComenzarPage() {
  return (
    <Suspense fallback={<SignupSkeleton />}>
      <SignupFunnelView />
    </Suspense>
  );
}
