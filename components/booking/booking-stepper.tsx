import { Stepper as UIStepper } from "@/components/ui/stepper";
import { cn } from "@/lib/ui/cn";
import type { BookingStepId } from "@/components/ui/stepper";

const STEPS: Array<{ id: BookingStepId; label: string }> = [
  { id: "duration", label: "Duration" },
  { id: "date", label: "Date" },
  { id: "time", label: "Time" },
  { id: "details", label: "Details" },
];

type BookingStepperProps = {
  currentStep: BookingStepId;
  onStepClick?: (step: BookingStepId) => void;
};

function VerticalStepper({
  currentStep,
  onStepClick,
}: BookingStepperProps) {
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <nav aria-label="Booking progress" className="hidden md:block">
      <ol className="flex flex-col gap-1">
        {STEPS.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = step.id === currentStep;
          const isClickable = isCompleted && !!onStepClick;

          const indicator = (
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
            <li key={step.id} className="flex items-start gap-3 py-2">
              {isClickable ? (
                <button
                  type="button"
                  aria-label={`Go to ${step.label}`}
                  onClick={() => onStepClick?.(step.id)}
                  className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
                >
                  {indicator}
                </button>
              ) : (
                indicator
              )}
              <div className="min-w-0 pt-0.5">
                {isClickable ? (
                  <button
                    type="button"
                    onClick={() => onStepClick?.(step.id)}
                    className={cn(
                      "interactive text-left text-sm font-medium text-ink-muted transition-colors hover:text-ink",
                    )}
                  >
                    {step.label}
                  </button>
                ) : (
                  <span
                    className={cn(
                      "text-sm",
                      isCurrent ? "font-medium text-ink" : "text-ink-muted",
                    )}
                  >
                    {step.label}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function BookingStepper({
  currentStep,
  onStepClick,
}: BookingStepperProps) {
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);
  const completedSteps = STEPS.slice(0, currentIndex).map((s) => s.id);

  return (
    <>
      <div className="md:hidden">
        <UIStepper
          steps={STEPS}
          currentStep={currentStep}
          completedSteps={completedSteps}
          onStepClick={onStepClick}
        />
      </div>
      <VerticalStepper currentStep={currentStep} onStepClick={onStepClick} />
    </>
  );
}
