-- Private bucket for uploaded resume files (PRD FR-2: PDF/DOCX, <=10MB).
-- No other bucket is created in this pass: certificate/deployment
-- evidence types use `evidence_items.external_url`, not file storage, and
-- avatars/photos are deliberately excluded from the product entirely
-- (fairness constraint, PRD FR-3.6, FR-9.3).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resumes',
  'resumes',
  false,
  10485760,
  array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
on conflict (id) do nothing;

-- Path convention: {profile_id}/{filename} — the leading path segment is
-- the owner's own auth uid. No recruiter policy exists on this bucket at
-- all: raw resume files are never recruiter-facing (PRD data
-- minimization — recruiters see extracted, structured evidence_items
-- rows, never the source file).
create policy "resumes_owner_select"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "resumes_owner_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "resumes_owner_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "resumes_owner_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);
