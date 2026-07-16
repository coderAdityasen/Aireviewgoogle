"use client";

export function OnboardingStepper({ currentStep, completedSteps }: { currentStep: number; completedSteps: number[] }) {
  const steps = ["Payment", "Business basics", "Google destination", "Review experience", "Branding", "Test & publish"];
  return <ol className="grid grid-cols-2 gap-3 sm:grid-cols-6" aria-label="Onboarding progress">{steps.map((label, index) => { const step = index + 1; const completed = completedSteps.includes(step); return <li key={label} className={`rounded-xl border p-3 text-xs ${currentStep === step ? "border-primary bg-primary/5" : ""}`}><span className="font-semibold">{completed ? "✓" : step}</span><span className="ml-2 text-muted-foreground">{label}</span></li>; })}</ol>;
}
