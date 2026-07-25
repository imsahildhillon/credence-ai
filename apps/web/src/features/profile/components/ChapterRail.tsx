'use client';

import { useEffect, useRef, useState } from 'react';

export interface ChapterRailSection {
  readonly id: string;
  readonly label: string;
}

export interface ChapterRailProps {
  readonly sections: readonly ChapterRailSection[];
}

/**
 * Persistent chapter navigation. Tracks which chapter is currently in view
 * via `IntersectionObserver` (a genuine external-system sync, so
 * `useEffect` is the correct tool — CLAUDE.md §8.3) and highlights it;
 * clicking a link scrolls smoothly unless the visitor has requested
 * reduced motion. Also expands every `<details>` disclosure just before
 * printing and restores their state after, so the exported PDF shows the
 * full report rather than a page of collapsed summaries.
 */
export function ChapterRail({ sections }: ChapterRailProps) {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? '');
  const openBeforePrintRef = useRef<HTMLDetailsElement[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) {
          setActiveId(visible.target.id);
        }
      },
      { rootMargin: '-15% 0px -70% 0px', threshold: 0 },
    );

    for (const section of sections) {
      const element = document.getElementById(section.id);
      if (element) {
        observer.observe(element);
      }
    }

    return () => observer.disconnect();
  }, [sections]);

  useEffect(() => {
    function expandForPrint() {
      const closed = [...document.querySelectorAll('details:not([open])')] as HTMLDetailsElement[];
      openBeforePrintRef.current = closed;
      for (const details of closed) {
        details.open = true;
      }
    }
    function restoreAfterPrint() {
      for (const details of openBeforePrintRef.current) {
        details.open = false;
      }
      openBeforePrintRef.current = [];
    }

    window.addEventListener('beforeprint', expandForPrint);
    window.addEventListener('afterprint', restoreAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', expandForPrint);
      window.removeEventListener('afterprint', restoreAfterPrint);
    };
  }, []);

  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <nav
      aria-label="Report chapters"
      className="bg-background/90 sticky top-0 z-10 flex flex-wrap gap-x-5 gap-y-1 border-b py-3 backdrop-blur print:hidden"
    >
      {sections.map((section) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          aria-current={activeId === section.id ? 'true' : undefined}
          className="text-caption hover:text-foreground aria-[current=true]:text-foreground aria-[current=true]:font-medium"
          onClick={(event) => {
            const target = document.getElementById(section.id);
            if (!target) {
              return;
            }
            event.preventDefault();
            target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
            history.replaceState(null, '', `#${section.id}`);
          }}
        >
          {section.label}
        </a>
      ))}
    </nav>
  );
}
