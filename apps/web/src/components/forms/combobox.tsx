'use client';

import { Check, ChevronsUpDown } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface ComboboxOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  /** Applied to the popover content; use to match trigger width, e.g. `w-(--radix-popover-trigger-width)`. */
  contentClassName?: string;
  'aria-label'?: string;
  'aria-invalid'?: boolean;
}

/**
 * Usage:
 * ```
 * <Combobox
 *   options={[{ value: 'react', label: 'React' }, { value: 'vue', label: 'Vue' }]}
 *   value={value}
 *   onValueChange={setValue}
 *   placeholder="Select a framework…"
 * />
 * ```
 *
 * A searchable single-select — the standard shadcn/ui pattern composing
 * `Popover` + `Command`, not a Radix primitive of its own. Reach for this
 * instead of `Select` once the option list is long enough that scanning
 * beats scrolling.
 *
 * Accessibility: trigger exposes `role="combobox"` and `aria-expanded`;
 * the option list inherits `Command`'s arrow-key navigation and
 * typeahead. Always provide `aria-label` when no visible `Label` element
 * describes the field.
 */
const Combobox = React.forwardRef<HTMLButtonElement, ComboboxProps>(
  (
    {
      options,
      value,
      onValueChange,
      placeholder = 'Select…',
      searchPlaceholder = 'Search…',
      emptyText = 'No results found.',
      disabled,
      className,
      contentClassName,
      'aria-label': ariaLabel,
      'aria-invalid': ariaInvalid,
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false);
    const selected = options.find((option) => option.value === value);

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label={ariaLabel}
            aria-invalid={ariaInvalid}
            disabled={disabled}
            className={cn(
              'w-full justify-between font-normal aria-invalid:border-alert aria-invalid:ring-alert',
              !selected && 'text-muted-foreground',
              className,
            )}
          >
            {selected ? selected.label : placeholder}
            <ChevronsUpDown className="opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className={cn('w-(--radix-popover-trigger-width) p-0', contentClassName)}>
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    disabled={Boolean(option.disabled)}
                    onSelect={() => {
                      onValueChange?.(option.value === value ? '' : option.value);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn(value === option.value ? 'opacity-100' : 'opacity-0')} />
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  },
);
Combobox.displayName = 'Combobox';

export { Combobox };
