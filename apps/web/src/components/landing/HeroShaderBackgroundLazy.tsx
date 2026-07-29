'use client';

import dynamic from 'next/dynamic';

/**
 * `ssr: false` is only valid inside a Client Component (the App Router
 * rejects it from Server Components), which is the reason this thin
 * wrapper exists rather than calling `dynamic()` directly in
 * `HeroSection.tsx`. `ssr: false` is what actually excludes three.js from
 * the route's initial JS payload — `dynamic()` alone still bundles the
 * module eagerly since it's rendered unconditionally on mount.
 */
export const HeroShaderBackgroundLazy = dynamic(
  () => import('./HeroShaderBackground').then((mod) => mod.HeroShaderBackground),
  { ssr: false },
);
