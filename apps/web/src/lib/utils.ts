import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges conditional class names (clsx) and resolves conflicting Tailwind
 * utility classes in favor of the last one (tailwind-merge). Standard
 * shadcn/ui helper — used by every component variant.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
