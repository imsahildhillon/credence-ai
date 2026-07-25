import type { ReactNode } from 'react';

export interface ChapterProps {
  readonly number: number;
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly children: ReactNode;
}

/**
 * The report's one layout primitive: a numbered chapter, not a card. No
 * border-box, no shadow — chapters are separated by a single rule and
 * generous whitespace, the way a printed document separates sections
 * (mission: "should feel comfortable to export as PDF without changing its
 * layout"). `scroll-mt` accounts for the sticky ChapterRail so an anchor
 * jump doesn't tuck the heading underneath it.
 */
export function Chapter({ number, id, title, description, children }: ChapterProps) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="flex scroll-mt-20 flex-col gap-6 border-t pt-10 first:border-t-0 first:pt-0"
    >
      <div className="flex flex-col gap-1.5">
        <span className="text-caption font-mono">
          {String(number).padStart(2, '0')}
        </span>
        <h2 id={`${id}-heading`} className="text-h2">
          {title}
        </h2>
        {description ? <p className="text-body text-muted-foreground max-w-2xl">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
