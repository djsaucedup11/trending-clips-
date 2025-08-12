# Trend Radar + Clipgen (MVP)

Free starter to deploy on **Vercel + Supabase**. It:
- Saves your whitelist (YouTube channels + Subreddits) in Supabase
- Scans for fresh posts/videos and ranks with a simple HypeScore
- Lets you click **Generate Clips** (creates demo rows now)

## 1) Create Supabase tables
Run this in Supabase → SQL editor:

```
create table if not exists sources(
  id uuid primary key default gen_random_uuid(),
  platform text check(platform in ('youtube','reddit')),
  handle text, channel_url text, subreddit text,
  created_at timestamptz default now()
);
create table if not exists candidates(
  id uuid primary key default gen_random_uuid(),
  platform text, title text, url text, published_at timestamptz,
  views_per_min numeric, accel numeric, engagement_pct numeric,
  hype_score numeric, cc_ok boolean default false,
  created_at timestamptz default now()
);
create unique index if not exists candidates_url_key on candidates(url);
create table if not exists jobs(
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references candidates(id) on delete cascade,
  status text check(status in ('pending','processing','done','error')) default 'pending',
  created_at timestamptz default now()
);
create table if not exists clips(
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs(id) on delete cascade,
  start_s integer, end_s integer, srt_url text, mp4_url text,
  created_at timestamptz default now()
);
```

## 2) Deploy on Vercel
- Import this repo (or upload ZIP).
- Add **Environment Variables** (Project → Settings → Environment Variables):

```
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE=...   # server only
YOUTUBE_API_KEY=...
REDDIT_CLIENT_ID=...
REDDIT_CLIENT_SECRET=...
REDDIT_USERNAME=...
REDDIT_PASSWORD=...
REDDIT_USER_AGENT=TrendRadar/1.0 (by u/YourUsername)
```

## 3) Use
- Open `/whitelist` to add channels + subreddits.
- Open `/` and press **Scan Now**.
- Press **Generate Clips** to create demo clips.
