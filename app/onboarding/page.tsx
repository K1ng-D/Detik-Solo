import { Suspense } from "react";
import OnboardingClient from "./OnboardingClient";

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="p-8">Memuat onboarding...</div>}>
      <OnboardingClient />
    </Suspense>
  );
}
