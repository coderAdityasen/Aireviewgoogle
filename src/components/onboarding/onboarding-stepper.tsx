"use client";

export function OnboardingStepper({ currentStep, completedSteps }: { currentStep: number; completedSteps: number[] }) {
  const steps = ["Find business", "Confirm campaign", "Launch"];
  return <ol className="grid gap-2 sm:grid-cols-3" aria-label="Onboarding progress">{steps.map((label, index) => { const step = index + 1; const completed = completedSteps.includes(step); return <li key={label} aria-current={currentStep === step ? "step" : undefined} className={`rounded-xl border p-3 text-xs ${currentStep === step ? "border-primary bg-primary/5 text-primary" : ""}`}><span className="font-semibold">{completed ? "✓" : step}</span><span className="ml-2 text-muted-foreground">{label}</span></li>; })}</ol>;
}
