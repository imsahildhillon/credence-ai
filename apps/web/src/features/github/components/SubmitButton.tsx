'use client';

import { useFormStatus } from 'react-dom';

import { Button, type ButtonProps } from '@/components/ui/button';

/**
 * Submit button that reflects its parent `<form>`'s pending state via
 * `useFormStatus` — so progressive-enhancement form actions still show a
 * loading state (CLAUDE.md §8.7). Must be rendered inside the `<form>`.
 */
export function SubmitButton({
  children,
  pendingLabel,
  ...props
}: ButtonProps & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} {...props}>
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}
