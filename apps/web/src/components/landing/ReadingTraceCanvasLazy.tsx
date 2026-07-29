'use client';

import dynamic from 'next/dynamic';

/**
 * `ssr: false` is only valid inside a Client Component, hence this thin
 * wrapper — see `HeroShaderBackgroundLazy.tsx` for the full rationale.
 * Shared by both `HeroSection` and `WatchItThink`, which each render their
 * own instance of the underlying `ReadingTraceCanvas`.
 */
export const ReadingTraceCanvasLazy = dynamic(
  () => import('./ReadingTraceCanvas').then((mod) => mod.ReadingTraceCanvas),
  { ssr: false },
);
