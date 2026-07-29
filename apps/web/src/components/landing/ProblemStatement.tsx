import { Reveal } from './Reveal';

const BUILD_UP_LINES = [
  'Every architecture decision.',
  'Every review.',
  'Every late-night fix.',
  'Every rollback.',
  'Every difficult migration.',
] as const;

const STAGGER_STEP_MS = 100;

/**
 * Section 3 — the problem. A short, rhythmic build-up of what GitHub
 * already holds, then the two-line turn framing why none of it is
 * understood. These are one continuous thought paced across lines, not a
 * list of discrete enumerable items, so this is stacked `<p>` elements
 * inside a `<section>` — not a `<ul>` imposed where the design doesn't
 * call for one.
 *
 * Server-rendered; `Reveal` is the only client leaf, and every line is
 * fully present and readable in the server-rendered HTML regardless of
 * whether that leaf's effect ever runs.
 */
export function ProblemStatement() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-24 text-center">
      <div className="text-h2 flex flex-col gap-1">
        {BUILD_UP_LINES.map((line, index) => (
          <Reveal key={line} delayMs={index * STAGGER_STEP_MS}>
            <p>{line}</p>
          </Reveal>
        ))}
        <Reveal delayMs={BUILD_UP_LINES.length * STAGGER_STEP_MS}>
          <p className="text-muted-foreground mt-4">GitHub remembers all of it.</p>
        </Reveal>
        <Reveal delayMs={(BUILD_UP_LINES.length + 1) * STAGGER_STEP_MS}>
          <p className="text-muted-foreground">Nothing understands it.</p>
        </Reveal>
      </div>

      <Reveal delayMs={(BUILD_UP_LINES.length + 2) * STAGGER_STEP_MS} className="mt-12">
        <p className="text-code bg-foreground text-background inline-block rounded-lg px-6 py-3 shadow-inner">
          {"> Select * from engineering_impact where metric = 'truth';"}{' '}
          <span aria-hidden="true" className="animate-pulse">
            _
          </span>
        </p>
      </Reveal>
    </section>
  );
}
