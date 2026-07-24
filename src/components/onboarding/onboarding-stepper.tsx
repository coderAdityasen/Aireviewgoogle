"use client";

import { Check } from "lucide-react";

export function OnboardingStepper({ currentStep, completedSteps }: { currentStep: number; completedSteps: number[] }) {
  const steps = ["Business details", "Confirm campaign", "Launch"];
  const progress = Math.min(100, Math.max(0, ((currentStep - 1) / (steps.length - 1)) * 100));

  return <ol className="relative grid grid-cols-3 gap-3" aria-label="Onboarding progress">
    <span className="absolute left-[7%] right-[7%] top-4 h-1 rounded-full bg-[#edf1f7]" aria-hidden="true" />
    <span className="absolute left-[7%] top-4 h-1 rounded-full bg-primary transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${progress * 0.86}%` }} aria-hidden="true" />
    {steps.map((label, index) => {
      const step = index + 1;
      const completed = completedSteps.includes(step) || currentStep > step;
      return <li key={label} aria-current={currentStep === step ? "step" : undefined} className="relative flex min-w-0 flex-col items-center gap-2 text-center">
        <span className={`z-10 grid h-8 w-8 place-items-center rounded-full border-4 border-white text-xs font-extrabold shadow-sm ${completed || currentStep === step ? "bg-primary text-white" : "bg-[#edf1f7] text-muted-foreground"}`}>{completed ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : step}</span>
        <span className={`truncate text-[11px] font-extrabold uppercase tracking-[0.1em] sm:text-xs ${currentStep === step ? "text-primary" : completed ? "text-emerald-600" : "text-muted-foreground"}`}>{label}</span>
      </li>;
    })}
  </ol>;
}
