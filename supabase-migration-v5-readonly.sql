-- V5: read-only public access.
-- Run once in the Supabase SQL editor AFTER deploying V5 and setting
-- SUPABASE_SECRET_KEY and EDIT_PASSCODE in Vercel.
--
-- The public (publishable) key can now only read. Adding, closing,
-- reopening and deleting cases go through the app's server routes,
-- which check the club passcode and use the secret key.

drop policy if exists "Anyone can add documentary requests" on public.documentary_requests;
drop policy if exists "Anyone can update documentary requests" on public.documentary_requests;
drop policy if exists "Anyone can delete documentary requests" on public.documentary_requests;

-- Reading stays open to everyone, including the /view page.
drop policy if exists "Anyone can read documentary requests" on public.documentary_requests;
create policy "Anyone can read documentary requests"
on public.documentary_requests for select
to anon, authenticated
using (true);
