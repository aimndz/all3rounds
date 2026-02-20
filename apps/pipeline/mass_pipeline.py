"""
Dataverse — FlipTop Mass Extraction Pipeline

Automatically transcribes all FlipTop battle videos from the official YouTube
channel and uploads structured data (battles, lines, emcees) to Supabase.

The pipeline is idempotent — it checks the database before processing and
skips videos that have already been transcribed.

Usage:
  python mass_pipeline.py                         # Process all battles
  python mass_pipeline.py --limit 5               # Process only 5 battles
  python mass_pipeline.py --limit 1 --fast-test   # Quick test (first 3 min only)
"""

# ============================================================================
# Imports
# ============================================================================

import os
import argparse
import subprocess
from datetime import datetime
from dotenv import load_dotenv
import yt_dlp

# Reuse core logic from transcribe.py
from transcribe import (
    supabase,
    SUPABASE_KEY,
    HF_TOKEN,
    parse_fliptop_metadata,
    transcribe_and_diarize,
    upload_to_supabase,
)

# ============================================================================
# Configuration
# ============================================================================

load_dotenv()

CHANNEL_URL  = "https://www.youtube.com/@fliptopbattles/videos"
DOWNLOAD_DIR = "audio_downloads"
os.makedirs(DOWNLOAD_DIR, exist_ok=True)


# ============================================================================
# Deduplication
# ============================================================================

def get_existing_youtube_ids() -> set[str]:
    """
    Fetch all youtube_ids currently in the database.
    Used to skip videos that have already been processed (idempotency).
    """
    if not supabase:
        return set()

    print("[1] Fetching existing battles from Supabase...")
    existing_ids = set()
    page = 0
    page_size = 1000

    while True:
        try:
            response = (
                supabase.table("battles")
                .select("youtube_id")
                .range(page * page_size, (page + 1) * page_size - 1)
                .execute()
            )
        except Exception:
            break

        if not response.data:
            break

        for row in response.data:
            existing_ids.add(row["youtube_id"])
        page += 1

    print(f"    Found {len(existing_ids)} existing battles.")
    return existing_ids


# ============================================================================
# Filtering
# ============================================================================

def is_battle_video(title: str) -> bool:
    """
    Check if a video title represents a battle.
    FlipTop battle titles always contain "vs" between emcee names.
    """
    title_lower = title.lower()
    return " vs " in title_lower or " vs." in title_lower


# ============================================================================
# Main Pipeline
# ============================================================================

def run_pipeline(limit: int | None = None, fast_test: bool = False):
    """
    Main pipeline loop:
      1. Fetch existing battles from Supabase (for deduplication)
      2. List all videos from the FlipTop channel
      3. For each new battle video:
         a. Download audio
         b. (Optional) Crop to 180s for fast testing
         c. Parse metadata (title, event, date, emcees)
         d. Transcribe + diarize with WhisperX
         e. Upload to Supabase
         f. Clean up audio file
    """
    if not SUPABASE_KEY or not HF_TOKEN:
        print("ERROR: Missing SUPABASE_SERVICE_KEY or HF_TOKEN in environment variables.")
        return

    existing_ids = get_existing_youtube_ids()

    # ── Fetch channel video list ──
    print(f"\n[2] Fetching video list from {CHANNEL_URL}...")
    with yt_dlp.YoutubeDL({"extract_flat": True, "quiet": True}) as ydl:
        info = ydl.extract_info(CHANNEL_URL, download=False)
        entries = info.get("entries", [])
    print(f"    Found {len(entries)} videos on channel.")

    # ── Process each video ──
    processed_count = 0

    for idx, entry in enumerate(entries):
        yt_id = entry["id"]
        flat_title = entry.get("title", "Unknown Title")

        # Skip: already in database
        if yt_id in existing_ids:
            print(f"[-] Skipping (Already in DB): {flat_title}")
            continue

        # Skip: not a battle video (no "vs" in title)
        if not is_battle_video(flat_title):
            print(f"[-] Skipping (Not a battle): {flat_title}")
            continue

        # Stop: reached test limit
        if limit and processed_count >= limit:
            print(f"\nReached test limit of {limit} videos.")
            break

        processed_count += 1
        print(f"\n{'='*60}")
        print(f"Processing [{processed_count}] Video {idx+1}/{len(entries)}: {flat_title}")
        print(f"{'='*60}")

        audio_path = os.path.join(DOWNLOAD_DIR, f"{yt_id}.wav")
        youtube_url = f"https://www.youtube.com/watch?v={yt_id}"

        try:
            # ── Download audio & fetch full metadata ──
            print("  ⬇ Downloading audio...")
            download_opts = {
                "format": "bestaudio/best",
                "postprocessors": [{
                    "key": "FFmpegExtractAudio",
                    "preferredcodec": "wav",
                    "preferredquality": "192",
                }],
                "outtmpl": os.path.join(DOWNLOAD_DIR, f"{yt_id}.%(ext)s"),
                "quiet": True,
            }
            with yt_dlp.YoutubeDL(download_opts) as ydl_dl:
                video_meta = ydl_dl.extract_info(youtube_url, download=True)

            # ── Fast test mode: crop audio to 180 seconds ──
            if fast_test:
                print("  ✂ [FAST TEST] Cropping audio to 180 seconds...")
                cropped = audio_path.replace(".wav", "_cropped.wav")
                subprocess.run(
                    ["ffmpeg", "-y", "-i", audio_path, "-t", "180", "-c", "copy", cropped],
                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                )
                os.replace(cropped, audio_path)

            # ── Parse metadata ──
            print("  🔍 Parsing metadata...")
            upload_date = video_meta.get("upload_date")
            formatted_date = (
                datetime.strptime(upload_date, "%Y%m%d").strftime("%Y-%m-%d")
                if upload_date else None
            )

            parsed = parse_fliptop_metadata(video_meta)
            battle_title  = parsed.get("battle_title") or flat_title
            event_name    = parsed.get("event_name")
            event_date    = parsed.get("event_date") or formatted_date
            battle_format = parsed.get("battle_format")
            participants  = parsed.get("participants", [])

            # ── Transcribe + Diarize ──
            segments = transcribe_and_diarize(audio_path, device="cuda")

            # ── Upload to Supabase ──
            upload_to_supabase(
                segments=segments,
                youtube_id=yt_id,
                title=battle_title,
                event_name=event_name,
                event_date=event_date,
                battle_format=battle_format,
                participants=participants,
            )

            # ── Cleanup ──
            if os.path.exists(audio_path):
                os.remove(audio_path)

        except Exception as e:
            print(f"  ❌ ERROR processing {yt_id}: {e}")

    print(f"\n{'='*60}")
    print(f"✅ Mass Pipeline Finished — Processed {processed_count} battles")
    print(f"{'='*60}")


# ============================================================================
# CLI Entry Point
# ============================================================================

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="FlipTop Mass Extraction Pipeline")
    parser.add_argument("--limit",     type=int, default=None,
                        help="Stop after processing N videos (for testing)")
    parser.add_argument("--fast-test", action="store_true",
                        help="Crop audio to 180 seconds for quick pipeline testing")
    args = parser.parse_args()

    run_pipeline(limit=args.limit, fast_test=args.fast_test)
