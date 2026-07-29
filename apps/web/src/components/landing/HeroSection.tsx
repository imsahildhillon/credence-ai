import Link from 'next/link';

import { Button } from '@/components/ui/button';

import styles from './HeroSection.module.css';
import { HeroShaderBackgroundLazy } from './HeroShaderBackgroundLazy';
import { ReadingTraceCanvasLazy } from './ReadingTraceCanvasLazy';

/**
 * The hero — headline, subhead, primary CTA, ambient background, and the
 * reading-trace centerpiece. Server-rendered typography; the canvas-based
 * pieces are lazily loaded, client-only, `ssr: false` leaves
 * (`HeroShaderBackgroundLazy`, `ReadingTraceCanvasLazy`) — both pull in
 * three.js, which is excluded from this route's initial JS payload rather
 * than bundled eagerly (CLAUDE.md §21 JS budget).
 *
 * The ambient glow is a real WebGL shader (`HeroShaderBackground`)
 * reproducing the original design's breathing radial gradient via
 * three.js. The plain-CSS `.heroGlow` gradient underneath it is kept as a
 * progressive-enhancement fallback — visible immediately (server-rendered)
 * and until the shader hydrates, or permanently if JS is disabled or a
 * WebGL context can't be created.
 */
export function HeroSection() {
  return (
    <section className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-6 pt-24 pb-16 text-center">
      <div
        aria-hidden="true"
        className={`${styles.heroGlow} pointer-events-none absolute inset-0 -z-10`}
        style={{
          background:
            'radial-gradient(ellipse 120% 55% at 50% 0%, color-mix(in oklch, var(--brand-primary) 18%, transparent), transparent 70%)',
        }}
      />
      <HeroShaderBackgroundLazy />

      <div className="mx-auto flex w-full max-w-4xl min-w-0 flex-col items-center">
        <h1 className="text-h1 md:text-display w-full">
          Ten years of engineering lives in your GitHub.
          <br className="hidden md:block" />{' '}
          <span className="text-muted-foreground">Nothing has ever read it.</span>
        </h1>

        <p className="text-body text-muted-foreground mt-6 max-w-2xl">
          Credence AI parses every commit, pull request, and architectural decision to construct a
          living intelligence graph of your engineering reality.
        </p>

        <Button asChild size="lg" className="mt-10 rounded-full">
          <Link href="/login">Analyze my engineering</Link>
        </Button>

        <p className="text-caption mt-4">
          Developer Intelligence is available today. Recruiter Intelligence launches soon.
        </p>

        <div className="mt-12 flex h-24 w-full max-w-[720px] justify-center">
          <ReadingTraceCanvasLazy />
        </div>
      </div>
    </section>
  );
}
