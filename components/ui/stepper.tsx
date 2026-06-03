import { cn } from "@/lib/ui/cn";

export type BookingStepId = "duration" | "date" | "time" | "details";

export type StepperStep = {
  id: BookingStepId;
  label: string;
};

export type StepperProps = {
  steps: StepperStep[];
  currentStep: BookingStepId;
  completedSteps?: BookingStepId[];
  onStepClick?: (step: BookingStepId) => void;
};

export function Stepper({
  steps,
  currentStep,
  completedSteps = [],
  onStepClick,
}: StepperProps) {
  const currentIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <nav aria-label="Booking progress" className="mb-8">
      <ol className="flex items-center gap-2 sm:gap-4">
        {steps.map((step, index) => {
          const isCompleted =
            completedSteps.includes(step.id) || index < currentIndex;
          const isCurrent = step.id === currentStep;
          const isClickable = isCompleted && !isCurrent && !!onStepClick;

          const stepIndicator = (
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition",
                isCompleted && "bg-primary text-white",
                isCurrent && !isCompleted && "border-2 border-primary text-primary",
                !isCurrent && !isCompleted && "border border-border text-ink-muted",
                isClickable && "interactive cursor-pointer hover:bg-primary/90",
              )}
            >
              {isCompleted ? "✓" : index + 1}
            </span>
          );

          return (
            <li key={step.id} className="flex flex-1 items-center gap-2">
              <div className="flex min-w-0 flex-col items-center gap-1 sm:flex-row sm:gap-2">
                {isClickable ? (
                  <button
                    type="button"
                    aria-label={`Go to ${step.label}`}
                    onClick={() => onStepClick?.(step.id)}
                    className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
                  >
                    {stepIndicator}
                  </button>
                ) : (
                  stepIndicator
                )}
                <span
                  className={cn(
                    "truncate text-xs sm:text-sm",
                    isCurrent ? "font-medium text-ink" : "text-ink-muted",
                    isClickable && "interactive cursor-pointer",
                  )}
                  onClick={isClickable ? () => onStepClick?.(step.id) : undefined}
                  onKeyDown={
                    isClickable
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onStepClick?.(step.id);
                          }
                        }
                      : undefined
                  }
                  role={isClickable ? "button" : undefined}
                  tabIndex={isClickable ? 0 : undefined}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "hidden h-px flex-1 sm:block",
                    isCompleted ? "bg-primary" : "bg-border",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
