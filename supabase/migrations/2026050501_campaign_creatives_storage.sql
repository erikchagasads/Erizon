-- Storage para criativos enviados no setup de campanha.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'campaign-creatives',
  'campaign-creatives',
  false,
  104857600,
  array[
    'image/png',
    'image/jpeg',
    'image/webp',
    'video/mp4',
    'video/quicktime'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "campaign creatives insert own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'campaign-creatives'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "campaign creatives read own folder"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'campaign-creatives'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "campaign creatives update own folder"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'campaign-creatives'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'campaign-creatives'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "campaign creatives delete own folder"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'campaign-creatives'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
