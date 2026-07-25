'use client';

import { setCandidateStatusAction } from '@/features/recruiter/server/actions';

import type { CandidateStatus } from '../types';

const STATUS_OPTIONS: readonly { readonly value: CandidateStatus; readonly label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'reviewing', label: 'Reviewing' },
  { value: 'interviewing', label: 'Interviewing' },
  { value: 'archived', label: 'Archived' },
];

export interface CandidateStatusSelectProps {
  readonly profileId: string;
  readonly status: CandidateStatus;
}

/**
 * A recruiter's private pipeline stage for this candidate (spec: "Candidate
 * status: New/Reviewing/Interviewing/Archived"). Submits on change via the
 * wrapping form's `requestSubmit()` — the one bit of client JS this needs;
 * without it the form still works via a manual submit, so nothing breaks
 * if JS fails to load (progressive enhancement, matching this app's other
 * forms).
 */
export function CandidateStatusSelect({ profileId, status }: CandidateStatusSelectProps) {
  return (
    <form action={setCandidateStatusAction} className="flex items-center gap-2">
      <input type="hidden" name="profileId" value={profileId} />
      <label htmlFor="candidate-status" className="text-caption font-medium">
        Status
      </label>
      <select
        id="candidate-status"
        name="status"
        defaultValue={status}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="border-input bg-background text-body rounded-md border px-2 py-1"
      >
        {STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </form>
  );
}
