interface InsightRow {
  readonly index: string;
  readonly title: string;
  readonly description: string;
}

const INSIGHT_ROWS: readonly InsightRow[] = [
  {
    index: '01',
    title: 'Commits',
    description: "We don't count them. We read the narrative of problem-solving encoded within them.",
  },
  {
    index: '02',
    title: 'Reviews',
    description: 'Identifying mentorship patterns and architectural guardianship across your team.',
  },
  {
    index: '03',
    title: 'Architecture',
    description: 'Mapping the evolution of systems from initial draft to mature infrastructure.',
  },
] as const;

/**
 * Section 4 — the insight: three ways Credence AI reads a codebase.
 * Fully server-rendered; row emphasis on hover (heading color + shift,
 * description color, background tint) is plain Tailwind `group`/
 * `group-hover`.
 *
 * Rows are not focusable: they have no click/navigate destination (matching
 * the source design, which gives them no `href` either), so the hover
 * recoloring is decorative emphasis on content that's already fully visible
 * — not hover-revealed content — meaning there is nothing for a keyboard
 * equivalent to expose. Adding `tabIndex` here would create a focus stop
 * with no action, which is itself an accessibility anti-pattern
 * (jsx-a11y/no-noninteractive-tabindex).
 */
export function InsightRows() {
  return (
    <section id="how-it-works" className="mx-auto max-w-5xl px-6 py-24">
      <span className="text-caption text-primary border-primary/20 mb-12 block max-w-[120px] border-b pb-2 tracking-widest uppercase">
        The Insight
      </span>

      <div className="border-border/60 flex flex-col border-t">
        {INSIGHT_ROWS.map((row) => (
          <div
            key={row.title}
            className="group border-border/60 hover:bg-muted/40 -mx-4 flex flex-col items-start justify-between gap-2 border-b px-4 py-8 transition-colors duration-300 md:flex-row md:items-center md:gap-0"
          >
            <div className="mb-2 flex items-center gap-6 md:mb-0">
              <span className="text-caption text-muted-foreground">{row.index}</span>
              <h3 className="text-h3 group-hover:text-primary transition-all duration-300 group-hover:translate-x-2">
                {row.title}
              </h3>
            </div>
            <p className="text-body text-muted-foreground group-hover:text-foreground max-w-md text-left transition-colors md:text-right">
              {row.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
