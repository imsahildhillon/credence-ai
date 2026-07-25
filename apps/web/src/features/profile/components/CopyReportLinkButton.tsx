'use client';

import { Check, Link as LinkIcon } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

/**
 * Copies the current page URL — the one client-side action in the report
 * header. `useState` here holds transient UI feedback ("Copied"), not
 * synced-from-props data, so no `useEffect` is involved (CLAUDE.md §8.3).
 */
export function CopyReportLinkButton() {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => {
        void navigator.clipboard.writeText(window.location.href).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
    >
      {copied ? (
        <>
          <Check aria-hidden="true" />
          Link copied
        </>
      ) : (
        <>
          <LinkIcon aria-hidden="true" />
          Share
        </>
      )}
    </Button>
  );
}
