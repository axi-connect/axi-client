import { Suspense } from "react";

import { OnboardingView } from "@/modules/onboarding/ui/onboarding/OnboardingView";
import { OnboardingSkeleton } from "@/modules/onboarding/ui/onboarding/OnboardingSkeleton";

/** `Suspense` obligatorio: la vista lee `useSearchParams` (`?step=`). */
export default function OnboardingPage() {
  return (
    <Suspense fallback={<OnboardingSkeleton />}>
      <OnboardingView />
    </Suspense>
  );
}
