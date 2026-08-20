# Cerebrum

> OpenWolf's learning memory. Updated automatically as the AI learns from interactions.
> Do not edit manually unless correcting an error.
> Last updated: 2026-08-20

## User Preferences

<!-- How the user likes things done. Code style, tools, patterns, communication. -->

## Key Learnings

- **Project:** worktime-scheduler
- **Description:** A personal worktime tracker: register with an email and password, log time

- **Supabase dashboard (2025+ layout):** Project URL and API keys live on TWO
  different pages, not the old single "Project Settings -> API" page.
  URL = Project Settings -> Data API -> Project URL (`https://<project-ref>.supabase.co`,
  the ref is in the dashboard address bar). Keys = Project Settings -> API Keys,
  which has an "API keys" tab (`sb_publishable_...` / `sb_secret_...`) and a
  "Legacy API keys" tab (the `eyJ...` anon public JWT). Either browser-safe key
  works with @supabase/supabase-js ^2.112 for VITE_SUPABASE_ANON_KEY; a secret key
  must never be used because Vite inlines VITE_* into the client bundle.

## Do-Not-Repeat

<!-- Mistakes made and corrected. Each entry prevents the same mistake recurring. -->
<!-- Format: [YYYY-MM-DD] Description of what went wrong and what to do instead. -->

## Decision Log

<!-- Significant technical decisions with rationale. Why X was chosen over Y. -->
