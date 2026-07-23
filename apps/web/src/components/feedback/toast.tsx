'use client';

import { useEffect, useState, type ComponentProps } from 'react';
import { Toaster as Sonner, toast } from 'sonner';

type ToasterProps = ComponentProps<typeof Sonner>;

/**
 * Tracks whether the `dark` class is present on `<html>` — our theme is
 * class-based (see `src/styles/globals.css`), and Sonner otherwise falls
 * back to the OS color-scheme preference, which can visibly mismatch the
 * app's actual theme (a light-styled toast on a dark page, or vice versa).
 */
function useIsDarkMode() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const update = () => setIsDark(root.classList.contains('dark'));
    update();

    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}

/**
 * Usage: mount `<Toaster />` once near the app root, then call `toast(...)`
 * / `toast.success(...)` / `toast.error(...)` / `toast.warning(...)` from
 * anywhere (re-exported below — no need to import from `sonner` directly).
 *
 * Severity classes are mapped to our reserved semantic tokens: `success`
 * uses `strength`, `warning` uses `growth`, `error` uses `alert`, `info`
 * uses `ai` — the same colors and meanings as everywhere else in the
 * product (Brand Guidelines §7).
 *
 * Accessibility: Sonner renders toasts in a `[role="status"]`/`aria-live`
 * region and manages focus/dismissal via keyboard automatically.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const isDark = useIsDarkMode();

  return (
    <Sonner
      theme={isDark ? 'dark' : 'light'}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
          success:
            'group-[.toaster]:border-strength group-[.toaster]:[&_[data-icon]]:text-strength',
          warning: 'group-[.toaster]:border-growth group-[.toaster]:[&_[data-icon]]:text-growth',
          error: 'group-[.toaster]:border-alert group-[.toaster]:[&_[data-icon]]:text-alert',
          info: 'group-[.toaster]:border-ai group-[.toaster]:[&_[data-icon]]:text-ai',
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
