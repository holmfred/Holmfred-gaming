# Supabase setup

1. Create a project at [supabase.com](https://supabase.com/dashboard).
2. Open **SQL Editor**, paste and run `schema.sql`.
3. In **Project Settings → API**, copy:
   - Project URL → `VITE_SUPABASE_URL`
   - `anon` `public` key → `VITE_SUPABASE_ANON_KEY`
4. Put both in `Holmfred-Gaming/.env` (see `.env.example`).
5. Optional but easier for personal use: **Authentication → Providers → Email**
   - turn **off** “Confirm email” so new accounts can sign in immediately.
6. Restart `npm run dev`.
