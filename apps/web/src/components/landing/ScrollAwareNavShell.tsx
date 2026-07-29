'use client';

import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

/**
 * Isolates the one browser-API-dependent behavior in the landing nav — a
 * subtle background/shadow shift once the page has scrolled past the top —
 * so the nav's actual content stays static and server-rendered as
 * `children` (CLAUDE.md §8.1: client boundary as deep in the tree as
 * possible, not a whole-nav client component for one scroll listener).
 */
export function ScrollAwareNavShell({ children }: { children: React.ReactNode }) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={cn(
        'bg-background/70 fixed top-0 z-50 w-full border-b backdrop-blur-xl transition-shadow duration-300',
        isScrolled && 'bg-background/90 shadow-lg',
      )}
    >
      {children}
    </nav>
  );
}
