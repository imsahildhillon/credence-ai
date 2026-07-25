import { z } from 'zod';

/** Bounded — a recruiter note is a private annotation, not a document (CLAUDE.md §6.6). */
export const NOTE_MAX_LENGTH = 10_000;

export const UpdateNoteInputSchema = z.object({
  profileId: z.string().uuid(),
  note: z.string().max(NOTE_MAX_LENGTH),
});

export const SetCandidateStatusInputSchema = z.object({
  profileId: z.string().uuid(),
  status: z.enum(['new', 'reviewing', 'interviewing', 'archived']),
});

export const ToggleBookmarkInputSchema = z.object({
  profileId: z.string().uuid(),
  bookmarked: z.boolean(),
});

export const CandidateListSearchParamsSchema = z.object({
  sort: z.enum(['recent', 'alphabetical']).default('recent'),
});

export type CandidateListSearchParams = z.infer<typeof CandidateListSearchParamsSchema>;
