'use server';

import { revalidatePath } from 'next/cache';

import {
  SetCandidateStatusInputSchema,
  ToggleBookmarkInputSchema,
  UpdateNoteInputSchema,
} from '../schemas';

import { setBookmark, setCandidateNote, setCandidateStatus } from './service';

/**
 * Server Actions for the recruiter's private candidate tracking (notes,
 * status, bookmark). Each validates its `FormData` with the same Zod
 * schema an equivalent API route would use (CLAUDE.md §9.4) and delegates
 * to `service.ts`, which re-derives the recruiter from the session and
 * relies on RLS as the authorization backstop — never a client-supplied
 * recruiter id.
 */

function candidatePath(profileId: string): string {
  return `/recruiter/candidate/${profileId}`;
}

export async function updateNoteAction(formData: FormData): Promise<void> {
  const parsed = UpdateNoteInputSchema.safeParse({
    profileId: formData.get('profileId'),
    note: formData.get('note'),
  });
  if (!parsed.success) {
    return;
  }
  await setCandidateNote(parsed.data.profileId, parsed.data.note);
  revalidatePath(candidatePath(parsed.data.profileId));
}

export async function setCandidateStatusAction(formData: FormData): Promise<void> {
  const parsed = SetCandidateStatusInputSchema.safeParse({
    profileId: formData.get('profileId'),
    status: formData.get('status'),
  });
  if (!parsed.success) {
    return;
  }
  await setCandidateStatus(parsed.data.profileId, parsed.data.status);
  revalidatePath(candidatePath(parsed.data.profileId));
  revalidatePath('/recruiter/candidates');
}

export async function toggleBookmarkAction(formData: FormData): Promise<void> {
  const parsed = ToggleBookmarkInputSchema.safeParse({
    profileId: formData.get('profileId'),
    bookmarked: formData.get('bookmarked') === 'true',
  });
  if (!parsed.success) {
    return;
  }
  await setBookmark(parsed.data.profileId, parsed.data.bookmarked);
  revalidatePath(candidatePath(parsed.data.profileId));
  revalidatePath('/recruiter/candidates');
}
