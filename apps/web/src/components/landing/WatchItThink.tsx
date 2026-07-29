import { ReadingTraceCanvasLazy } from './ReadingTraceCanvasLazy';

/**
 * Section 5 — "Watch it think." Atmospheric, not a product simulation: no
 * fabricated commit hashes, confidence percentages, or reasoning strings
 * (the original mockup's evidence ledger and "Signal 01/02" callouts were
 * exactly that). The reused `ReadingTraceCanvas` is the one moving element —
 * restrained motion, secondary to the copy — rather than three separately
 * animating pieces competing for attention.
 *
 * Fully server-rendered apart from that one reused client leaf; the heading
 * and copy stand on their own with JavaScript disabled, since the canvas is
 * purely decorative (`aria-hidden`).
 */
export function WatchItThink() {
  return (
    <section className="border-border/60 bg-primary/5 border-y px-6 py-24">
      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <h2 className="text-h2">Watch it think.</h2>
        <p className="text-body text-muted-foreground mt-4 max-w-xl">
          Every commit, review, and architectural decision becomes a traceable thread — followed,
          weighed, and woven into a single line of evidence.
        </p>

        <div className="mt-16 h-24 w-full max-w-[720px]">
          <ReadingTraceCanvasLazy />
        </div>

        <p className="text-body text-muted-foreground border-border/60 mt-16 max-w-2xl border-t pt-8">
          Every assessment is backed by evidence. No hidden scores. Every conclusion can be traced
          back to repositories, pull requests, reviews, commits, and engineering decisions.
        </p>
      </div>
    </section>
  );
}
