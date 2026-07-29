'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface RevealProps {
  readonly children: ReactNode;
  readonly className?: string;
  /** Stagger, in milliseconds, applied as a CSS `transition-delay`. */
  readonly delayMs?: number;
}

/**
 * Progressive-enhancement scroll reveal, built for the Problem Statement
 * section's seven-line stagger (the first real use — see the landing
 * migration's component-reuse rule).
 *
 * Content is visible by default: the initial render — which is also
 * exactly what a no-JS client sees, since nothing here depends on an
 * effect having run — is fully opaque. Only after mounting does it check
 * whether the element is already inside the viewport; if it's already
 * visible, nothing changes. If it's below the fold, it hides briefly and
 * re-reveals the first time `IntersectionObserver` reports it scrolling
 * into view, then disconnects (fires once, never re-hides).
 *
 * No separate `prefers-reduced-motion` handling is needed — the global
 * rule in `globals.css` already collapses every CSS transition's duration
 * app-wide, and this component's "hidden" state is itself skipped
 * whenever the content is already on screen at mount.
 */
export function Reveal({ children, className, delayMs = 0 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(true);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const alreadyVisible = element.getBoundingClientRect().top < window.innerHeight * 0.6;
    if (alreadyVisible) {
      return;
    }

    setRevealed(false);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
      className={cn(
        'transition-[opacity,transform] duration-700 ease-out',
        revealed ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
        className,
      )}
    >
      {children}
    </div>
  );
}
