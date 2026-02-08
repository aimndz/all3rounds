# Setup Guide — Talasalita

Step-by-step instructions to get the project running from zero.

---

## 1. Supabase Setup (Free Tier — $0/mo)

### 1.1 Create Project

1. Go to [supabase.com](https://supabase.com) → Sign up (GitHub login works).
2. Click **"New Project"**.
3. Name: `talasalita`, Region: pick closest to you, set a DB password.
4. Wait for provisioning (~2 minutes).

### 1.2 Run Database Migration

1. Go to **SQL Editor** (left sidebar).
2. Click **"New query"**.
3. Copy-paste the entire contents of [`supabase/migration.sql`](../supabase/migration.sql).
4. Click **"Run"** (or Ctrl+Enter).
5. You should see: `Success. No rows returned.`

### 1.3 Enable pg_trgm Extension

1. Go to **Database → Extensions** (left sidebar).
2. Search for `pg_trgm`.
3. Click **Enable**.
   - _This is already in the migration SQL, but verify it's active._

### 1.4 Set Up Google OAuth (for Login)

1. Go to [console.cloud.google.com](https://console.cloud.google.com).
2. Create a new project (or use existing).
3. Go to **APIs & Services → Credentials → Create Credentials → OAuth Client ID**.
4. Application type: **Web application**.
5. Authorized redirect URIs: Add:
   ```
   https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback
   ```
   _(Find your project ref in Supabase → Settings → General)_
6. Copy the **Client ID** and **Client Secret**.
7. In Supabase, go to **Authentication → Providers → Google**.
8. Toggle **Enable**, paste your Client ID and Secret. Save.

### 1.5 Copy Your API Keys

1. Go to **Settings → API**.
2. Copy:
   - **Project URL** (e.g., `https://abcdef.supabase.co`)
   - **anon public key** (safe for browser)
   - **service_role key** (⚠️ server/pipeline only, never expose to browser)

---

## 2. Web App Setup (Next.js)

```bash
cd apps/web

# 1. Install dependencies
npm install

# 2. Create your .env.local file
cp .env.example .env.local

# 3. Edit .env.local with your Supabase keys:
#    NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
#    NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# 4. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 3. Python Pipeline Setup (Transcription)

### 3.1 Prerequisites

- **Python 3.10+**
- **NVIDIA GPU with CUDA** (for fast transcription)
  - _No GPU? Use Google Colab (free) — see section 3.3_
- **ffmpeg** installed and on your PATH
  - Windows: `winget install ffmpeg` or download from [ffmpeg.org](https://ffmpeg.org)

### 3.2 Local Setup

```bash
cd apps/pipeline

# 1. Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

# 2. Install dependencies
pip install -r requirements.txt

# 3. Create your .env file
cp .env.example .env

# 4. Edit .env:
#    SUPABASE_URL=https://your-project.supabase.co
#    SUPABASE_SERVICE_KEY=your-service-role-key
#    HF_TOKEN=your-huggingface-token

# 5. Run a transcription
python transcribe.py \
  --url "https://www.youtube.com/watch?v=VIDEO_ID" \
  --title "Loonie vs Abra" \
  --event "Ahon 13" \
  --date 2024-06-15 \
  --save-json output.json
```

### 3.3 HuggingFace Token (Required for Diarization)

1. Go to [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens).
2. Create a new token (read access is fine).
3. Accept the user agreement for **pyannote/speaker-diarization-3.1**:
   [https://huggingface.co/pyannote/speaker-diarization-3.1](https://huggingface.co/pyannote/speaker-diarization-3.1)
4. Paste the token in your `.env` file as `HF_TOKEN`.

### 3.4 Google Colab (Free GPU — No Local GPU Needed)

> ⚠️ **Note:** Colab sessions are ephemeral — files and packages are lost when your session ends.
> Use Google Drive mounting (see below) to avoid re-uploading files every time.

#### First-Time Setup

1. Open [colab.research.google.com](https://colab.research.google.com).
2. Create a new notebook.
3. Set runtime to **GPU** (Runtime → Change runtime type → T4 GPU).
4. Upload `colab_setup.py`, `transcribe.py`, and `.env` to your **Google Drive** (e.g., in a folder called `talasalita`).

#### Each Session — Run This First

```python
# Cell 1: Mount Google Drive & copy files
from google.colab import drive
drive.mount('/content/drive')

# Copy files from Drive (adjust path if needed)
!cp /content/drive/MyDrive/talasalita/colab_setup.py .
!cp /content/drive/MyDrive/talasalita/transcribe.py .
!cp /content/drive/MyDrive/talasalita/.env .
```

```python
# Cell 2: Install dependencies (handles version compatibility)
!python colab_setup.py
```

```python
# Cell 3: Restart runtime (required after installing torch)
# Go to Runtime → Restart runtime, then skip to Cell 4
```

```python
# Cell 4: Run transcription
!python transcribe.py --url "https://..." --title "..." --event "..."
```

#### Troubleshooting

- **"torchvision::nms does not exist"** — Run `colab_setup.py` to fix version conflicts.
- **CUDA out of memory** — The T4 GPU has 16GB VRAM. Try shorter videos or use `--device cpu` (slower).
- **Session disconnected** — Colab has ~12h GPU limit per day. Your work is saved if using Google Drive.

---

## 4. Deploying to Vercel (Free Tier — $0/mo)

```bash
cd apps/web

# 1. Install Vercel CLI
npm i -g vercel

# 2. Deploy
vercel

# 3. Set environment variables in Vercel dashboard:
#    NEXT_PUBLIC_SUPABASE_URL
#    NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Or connect the GitHub repo to Vercel for automatic deploys on push.

---

## 5. After First Transcription — Admin Tasks

After the pipeline uploads lines, you need to:

1. **Map speakers to emcees:**
   - The pipeline assigns `SPEAKER_00`, `SPEAKER_01` labels.
   - In Supabase → Table Editor → `emcees`: Add the emcee names.
   - In `battle_participants`: Link the battle to emcees with the correct `label`.
   - Update `lines` table: Set `emcee_id` based on `speaker_label` mapping.

2. **Tag round numbers:**
   - The AI doesn't know where rounds start/end.
   - Community users can tag them, or you can bulk-update in Supabase SQL Editor.

---

## Quick Reference: All Free Tier Limits

| Service       | Limit                       | Enough For            |
| :------------ | :-------------------------- | :-------------------- |
| Supabase DB   | 500 MB                      | ~500k+ lines          |
| Supabase Auth | 50,000 monthly active users | More than enough      |
| Vercel        | 100 GB bandwidth/mo         | ~1M page views        |
| Google Colab  | ~12h GPU/day (T4)           | ~50 battles/day       |
| HuggingFace   | Free token                  | Unlimited diarization |
