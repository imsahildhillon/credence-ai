import { cn } from '@/lib/utils';

export type OnboardingStep = 'welcome' | 'repositories' | 'review';

const STEPS: ReadonlyArray<{ id: OnboardingStep; label: string }> = [
  { id: 'welcome', label: 'Welcome' },
  { id: 'repositories', label: 'Choose repositories' },
  { id: 'review', label: 'Review & start' },
];

/**
 * Presentational step indicator for the onboarding flow. Server-safe (no
 * hooks). Color is never the sole signal — the current step carries
 * `aria-current="step"` and completed steps are marked in text
 * (CLAUDE.md §13.5).
 */
export function OnboardingProgress({ current }: { current: OnboardingStep }) {
  const currentIndex = STEPS.findIndex((step) => step.id === current);

  return (
    <nav aria-label="Onboarding progress">
      <ol className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {STEPS.map((step, index) => {
          const isCurrent = step.id === current;
          const isComplete = index < currentIndex;
          return (
            <li key={step.id} className="flex items-center gap-3">
              <span
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'flex items-center gap-2 text-caption',
                  isCurrent ? 'text-foreground font-medium' : 'text-muted-foreground',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex h-5 w-5 items-center justify-center rounded-full border text-xs',
                    isCurrent && 'border-primary bg-primary text-primary-foreground',
                    isComplete && 'border-primary bg-primary/10 text-primary',
                    !isCurrent && !isComplete && 'border-border',
                  )}
                >
                  {index + 1}
                </span>
                {step.label}
                {isComplete ? <span className="sr-only"> (completed)</span> : null}
              </span>
              {index < STEPS.length - 1 ? (
                <span aria-hidden="true" className="h-px w-6 bg-border" />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
