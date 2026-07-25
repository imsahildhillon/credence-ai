import ReactMarkdown from 'react-markdown';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SubmitButton } from '@/features/github/components/SubmitButton';
import { updateNoteAction } from '@/features/recruiter/server/actions';

export interface RecruiterNotesProps {
  readonly profileId: string;
  readonly note: string | null;
}

/**
 * Private, recruiter-only markdown notes (spec: "Private to the recruiter.
 * No AI. Markdown supported."). Rendered with `react-markdown` — it never
 * parses raw HTML unless `rehype-raw` is added (it isn't), so this is safe
 * against a recruiter pasting `<script>`-bearing text without any
 * `dangerouslySetInnerHTML` (CLAUDE.md §18.3). Deliberately outside
 * `AiContentMarker`: this is human-authored text, and marking it as
 * AI-generated would be dishonest in the other direction.
 */
export function RecruiterNotes({ profileId, note }: RecruiterNotesProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your notes</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {note ? (
          // No typography plugin in this project — these child-element
          // selectors are the minimal styling `react-markdown`'s plain
          // <p>/<ul>/<strong>/<a> output needs to read as formatted text.
          <div className="text-body flex flex-col gap-2 [&_a]:text-primary [&_a]:underline [&_code]:text-code [&_li]:ml-5 [&_ol]:list-decimal [&_strong]:font-semibold [&_ul]:list-disc">
            <ReactMarkdown>{note}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-caption">No notes yet — private to you, never shared with the candidate.</p>
        )}

        <form action={updateNoteAction} className="flex flex-col gap-2">
          <input type="hidden" name="profileId" value={profileId} />
          <label htmlFor="recruiter-note" className="text-caption font-medium">
            Edit notes (Markdown supported)
          </label>
          <textarea
            id="recruiter-note"
            name="note"
            defaultValue={note ?? ''}
            rows={5}
            maxLength={10_000}
            className="border-input bg-background text-body w-full resize-y rounded-md border px-3 py-2"
            placeholder="Interview impressions, follow-ups, anything worth remembering — only you can see this."
          />
          <SubmitButton pendingLabel="Saving…" size="sm" className="self-end">
            Save notes
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
