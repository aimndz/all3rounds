# Project Plan: FlipTop Directory (Dataverse)

**Goal**: Build a searchable directory for FlipTop battles where users can search for specific lines, verses, or rhymes. The system will index automated transcriptions, linking text directly to the timestamped YouTube video.

## 1. Tech Stack

### Web Application (Frontend)

- **Framework**: Next.js 14+ (App Router)
  - _Why_: Excellent SEO (crucial for a public directory), fast server-side rendering.
- **Styling**: TailwindCSS
  - _Why_: Rapid UI development.
- **Hosting**: Vercel (or similar).

### Backend & Database

- **Platform**: Supabase
- **Database**: PostgreSQL
  - _Feature_: `pg_trgm` extension for "Fuzzy Search" (handling typos in Taglish).
  - _Feature_: `pg_vector` (Optional future proofing for semantic search like "verses about poverty").
- **Storage**: Supabase Storage (if we decide to cache audio snippets, though linking to YT is preferred).

### AI & Data Pipeline (The Core)

- **Language**: Python 3.10+
- **Audio Processing**: `yt-dlp` (Download audio from YouTube).
- **Transcription & Diarization**: `whisperX`
  - _Why_: Standard Whisper lacks efficient alignment. WhisperX aligns timestamps to the word level and includes Pyannote integration to distinguish "Speaker 1" from "Speaker 2".
- **Environment**: Local GPU or Cloud GPU (RunPod/Modal) for batch processing.

---

## 2. Database Schema (Supabase)

We need a relational structure to link lines back to battles and specific emcees.

**1. Emcees**

- `id` (UUID)
- `name` (Text) - e.g., "Loonie"

**2. Battles**

- `id` (UUID)
- `title` (Text) - e.g., "FlipTop - Loonie vs Abra"
- `youtube_id` (Text)
- `event_date` (Date)
- `event_name` (Text) - e.g., "Ahon 13"
- `url` (Text)

**3. Battle_Participants** (Join Table)

- `battle_id`
- `emcee_id`
- `label` (Text) - e.g., "Speaker 0" or "Speaker 1" (Used to map AI diarization output to real humans).

**4. Lines** ( The "Searchable" Core)

- `id` (BigInt)
- `battle_id` (FK)
- `emcee_id` (FK) - Nullable initially until manually tagged.
- `round_number` (Int) - 1, 2, or 3 (Manually tagged or inferred).
- `speaker_label` (Text) - "SPEAKER_00", "SPEAKER_01" (Raw output).
- `content` (Text) - The actual verse.
- `start_time` (Float) - Seconds.
- `end_time` (Float) - Seconds.
- `search_vector` (tsvector) - Calculated column for fast searching.

---

## 3. Implementation Phases

### Phase 1: Foundation & Schema `[apps/web]`

1.  Initialize Next.js project.
2.  Set up Supabase project.
3.  Execute SQL migrations to create the tables listed above.
4.  Enable `pg_trgm` extension in Supabase for fuzzy text search.

### Phase 2: Python Extraction Pipeline `[apps/pipeline]`

1.  **Mass Downloader & Sync**:
    - Use `yt-dlp` to extract the entire FlipTop channel video list (`https://www.youtube.com/@fliptopbattles`).
    - **Deduplication Check**: Before downloading, query Supabase (`SELECT youtube_id FROM battles`). If the video exists, skip it. This makes the script idempotent and perfect for Google Colab restarts.
2.  **Transcription & Diarization**:
    - Load `whisperX`. Use `--batch_size 16` and `--compute_type float16` (fp16) to maximize Colab's T4 GPU memory. Use `large-v3` or `large-v2` to maintain Taglish accuracy.
    - Run transcription and Alignment.
    - Run Diarization (assigns `SPEAKER_01` labels).
3.  **Ingestion**:
    - Parse the JSON output from WhisperX.
    - Insert `Battle` record.
    - Bulk insert `Lines` into Supabase.

### Phase 3: The User Experience (Search & Browsing)

1.  **Home Page (Page 1)**:
    - Simple, Google-like minimal interface.
    - Large Search Bar: "Search for a line, verse, or word..."
    - No login required to search.
2.  **Results Page**:
    - Input: `line/verse/word`
    - Output: List of results cards containing:
      - **Content**: The matching line(s).
      - **Emcee**: Who said it (if identified).
      - **Battle**: Name (e.g., "Loonie vs Abra").
      - **Round**: Round number (e.g., "Round 1").
      - **Event**: Event Name & Date.
      - **Action**: "Play on YouTube" link (Deep linked to specific timestamp).
3.  **Battles Directory Page (`/battles`)**:
    - A dedicated route listing all 1000+ available battles in the database.
    - Simple grid layout with YouTube thumbnails, event names, and dates.
    - Includes a filter/search specifically for battles (e.g., "Loonie battles").
4.  **Community Features (Login Required)**:
    - Integrate Supabase Auth (Google/Facebook login).
    - **"Edit This Line"**: Logged-in users can click a pencil icon on a result to:
      - Correct the text (fix AI typos).
      - Tag the Emcee (if "Unknown").
      - Tag the Round Number.

### Phase 4: Admin & Clean Up (The "Human in the Loop")

- _Problem_: The AI will verify "Speaker 0" took a turn, but it doesn't know "Speaker 0" is "Loonie".
- _Solution_: Create a simple Admin Admin page where you see a battle and a dropdown to map:
  - "Speaker 0" -> Select Emcee -> [Loonie]
  - "Speaker 1" -> Select Emcee -> [Abra]
- Once mapped, run a script to update all `Lines` rows for that battle with the correct `emcee_id`.

---

## 4. Rate Limiting

Protect the app from abuse while keeping it free and open.

| User Type          | Limit                         | Implementation                       |
| :----------------- | :---------------------------- | :----------------------------------- |
| **Anonymous**      | 20 searches / minute per IP   | Next.js Middleware + in-memory store |
| **Logged-in User** | 60 searches / minute per user | Supabase RLS + API route check       |
| **Edit Actions**   | 10 edits / hour per user      | Server-side check before DB write    |

- Rate limit is enforced in Next.js API routes using `next-rate-limit` (lightweight, no Redis needed).
- Anonymous users are tracked by IP address via `x-forwarded-for` header.
- If a user hits the limit, return `429 Too Many Requests` with a friendly message.

---

## 5. Community Edit System

- All edits create a new row in an `edit_history` table (audit trail).
- Edits are applied immediately (trust-based for now).
- Future: Add a moderation queue or "revert" button for admins.

**5. Edit_History** (New Table)

- `id` (UUID)
- `line_id` (FK -> Lines)
- `user_id` (FK -> auth.users)
- `field_changed` (Text) - "content", "emcee_id", "round_number"
- `old_value` (Text)
- `new_value` (Text)
- `created_at` (Timestamptz)

---

## 6. Costing Breakdown (Free Tier Target)

Goal: **$0/month** for launch, scaling only when traffic demands it.

| Service           | Free Tier                             | What We Use It For          | Cost If Exceeded       |
| :---------------- | :------------------------------------ | :-------------------------- | :--------------------- |
| **Vercel**        | 100GB bandwidth, 1M fn calls/mo       | Next.js hosting             | $20/mo (Pro)           |
| **Supabase**      | 500MB DB, 50k auth users, 1GB storage | DB, Auth, API               | $25/mo (Pro)           |
| **YouTube Embed** | Unlimited                             | Video playback              | Free forever           |
| **Google Colab**  | Free GPU (T4, limited hours)          | WhisperX transcription      | $0 (or $10/mo for Pro) |
| **yt-dlp**        | Open source                           | Audio download              | Free forever           |
| **WhisperX**      | Open source                           | Transcription + diarization | Free (self-hosted)     |
| **Domain**        | —                                     | Custom domain (optional)    | ~$10/year              |
| **Total**         |                                       |                             | **$0/mo** (free tier)  |

### Cost Notes

- **Supabase Free Tier** is generous: 500MB can hold ~500k+ lines of text easily.
- **Vercel Free Tier** is sufficient for a low-to-medium traffic directory site.
- **Transcription** is the only compute-heavy task. Use Google Colab free tier or your own GPU. A 30-min battle takes ~5-10 min to transcribe on a T4.
- **No Redis, no Elasticsearch, no extra infra.** We use PostgreSQL for everything.

---

## 7. Setup Guide

### 7.1 Supabase Setup

1.  Go to [supabase.com](https://supabase.com) → Create a new project (free tier).
2.  Go to **SQL Editor** → Run the migration file (`supabase/migration.sql`).
3.  Go to **Authentication → Providers** → Enable **Google** (and/or Facebook).
    - You will need a Google OAuth Client ID from [console.cloud.google.com](https://console.cloud.google.com).
4.  Go to **Settings → API** → Copy your `Project URL` and `anon` public key.
5.  Go to **Database → Extensions** → Enable `pg_trgm`.

### 7.2 Vercel / Local Setup

1.  Clone the repo.
2.  Copy `.env.example` → `.env.local` and fill in Supabase keys.
3.  `npm install` → `npm run dev`.

### 7.3 Python Pipeline Setup

1.  Install Python 3.10+.
2.  `pip install whisperx yt-dlp supabase` (or use the `requirements.txt`).
3.  For GPU: Use Google Colab or a local NVIDIA GPU with CUDA.
4.  Run: `python pipeline/transcribe.py --url <youtube_url> --battle-title "Loonie vs Abra"`.

---

## 8. Risks & Mitigations

| Challenge             | Solution                                                                                                           |
| :-------------------- | :----------------------------------------------------------------------------------------------------------------- |
| **Taglish/Slang**     | Whisper Large-v3 is good, but not perfect. Community edits fix the gaps.                                           |
| **Hallucinations**    | Whisper sometimes repeats text in silence. Filter out segments with low confidence scores or excessive repetition. |
| **Cost**              | Stay on free tiers. Only upgrade Supabase/Vercel if traffic exceeds limits.                                        |
| **Abuse/Spam Edits**  | Rate limiting + edit history table. Admins can revert bad edits.                                                   |
| **Rate Limit Bypass** | IP-based limiting isn't perfect. If needed, add CAPTCHA for anonymous searches.                                    |
