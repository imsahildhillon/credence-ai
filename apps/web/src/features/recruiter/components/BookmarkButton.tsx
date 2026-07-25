import { Bookmark, BookmarkCheck } from 'lucide-react';

import { SubmitButton } from '@/features/github/components/SubmitButton';
import { toggleBookmarkAction } from '@/features/recruiter/server/actions';

export interface BookmarkButtonProps {
  readonly profileId: string;
  readonly bookmarked: boolean;
}

/**
 * The Shortlist feature's write side: bookmarking is a plain toggle, so
 * this needs no client state — the form always submits the *opposite* of
 * the current value, and the label/icon reflect the current value
 * (CLAUDE.md §8.1: server component unless interactivity requires
 * otherwise, and a same-page form post doesn't).
 */
export function BookmarkButton({ profileId, bookmarked }: BookmarkButtonProps) {
  return (
    <form action={toggleBookmarkAction}>
      <input type="hidden" name="profileId" value={profileId} />
      <input type="hidden" name="bookmarked" value={(!bookmarked).toString()} />
      <SubmitButton
        pendingLabel={bookmarked ? 'Removing…' : 'Saving…'}
        variant={bookmarked ? 'default' : 'outline'}
        size="sm"
      >
        {bookmarked ? (
          <>
            <BookmarkCheck aria-hidden="true" className="size-4" />
            Shortlisted
          </>
        ) : (
          <>
            <Bookmark aria-hidden="true" className="size-4" />
            Shortlist
          </>
        )}
      </SubmitButton>
    </form>
  );
}
