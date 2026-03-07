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
import json
import argparse
import subprocess
import socket
import uuid
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Reuse core logic from transcribe.py
from transcribe import (
    supabase,
    SUPABASE_KEY,
    HF_TOKEN,
    get_yt_dlp_cookies,
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

# Common yt-dlp arguments for solving YouTube JS challenges
YT_DLP_COMMON_ARGS = [
    "--remote-components", "ejs:github",
    "--extractor-args", "youtube:player-client=web",
]


# ============================================================================
# Distributed Locking & Deduplication
# ============================================================================

# Unique identifier for this worker (e.g., 'colab-1234')
WORKER_ID = f"{socket.gethostname()}-{str(uuid.uuid4())[:8]}"


def get_existing_ids() -> set[str]:
    """
    Fetch all youtube_ids that are either:
      1. Already in the 'battles' table (completed)
      2. Currently being processed or marked as completed in 'video_processing_status'
    Used to skip videos that don't need work.
    """
    if not supabase:
        return set()

    print(f"[1] Fetching existing work (Worker: {WORKER_ID})...")
    existing_ids = set()
    
    # ── 1. Fetch from 'battles' table ──
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
            if not response.data: break
            for row in response.data:
                existing_ids.add(row["youtube_id"])
            page += 1
        except Exception: break

    # ── 2. Fetch from 'video_processing_status' table ──
    # Skip videos that are currently 'processing' or 'completed'
    try:
        response = (
            supabase.table("video_processing_status")
            .select("youtube_id, status")
            .in_("status", ["processing", "completed"])
            .execute()
        )
        for row in response.data:
            existing_ids.add(row["youtube_id"])
    except Exception as e:
        print(f"    Warning: Could not fetch processing status: {e}")

    print(f"    Found {len(existing_ids)} active/completed tasks.")
    return existing_ids


def claim_video(yt_id: str) -> bool:
    """
    Attempt to claim a video for this worker.
    Returns True if claimed successfully, False otherwise.
    """
    try:
        # Step 1: Check if already in battles (safety double-check)
        battles_res = supabase.table("battles").select("id").eq("youtube_id", yt_id).execute()
        if battles_res.data:
            return False

        # Step 2: Atomic UPSERT with worker_id claim
        # We use a trick: only allow claim if status is 'failed' or record doesn't exist.
        # But for simplicity here, we'll try to insert first.
        data = {
            "youtube_id": yt_id,
            "status": "processing",
            "worker_id": WORKER_ID,
            "updated_at": "now()"
        }
        
        # Check if it exists first to handle 'failed' retries
        existing = supabase.table("video_processing_status").select("status").eq("youtube_id", yt_id).execute()
        
        if not existing.data:
            # New task
            supabase.table("video_processing_status").insert(data).execute()
            return True
        else:
            status = existing.data[0]["status"]
            if status == "failed":
                # Retry a failed task
                supabase.table("video_processing_status").update(data).eq("youtube_id", yt_id).execute()
                return True
            return False # Already processing or completed
            
    except Exception as e:
        # print(f"    DEBUG: Claim failed for {yt_id}: {e}")
        return False


def mark_completed(yt_id: str):
    """Mark a video as completed in the locking table."""
    try:
        supabase.table("video_processing_status").update({
            "status": "completed",
            "updated_at": "now()"
        }).eq("youtube_id", yt_id).execute()
    except Exception as e:
        print(f"    Warning: Could not mark {yt_id} as completed: {e}")


def mark_failed(yt_id: str):
    """Mark a video as failed in the locking table."""
    try:
        supabase.table("video_processing_status").update({
            "status": "failed",
            "updated_at": "now()"
        }).eq("youtube_id", yt_id).execute()
    except Exception as e:
        print(f"    Warning: Could not mark {yt_id} as failed: {e}")


def cleanup_stale_locks():
    """
    Reset locks for tasks that have been in 'processing' status for too long (e.g., 4 hours).
    This handles cases where a Colab instance crashed or was disconnected.
    """
    stale_threshold = (datetime.now() - timedelta(hours=4)).isoformat()
    try:
        print("[0] Cleaning up stale locks (older than 4 hours)...")
        # Find stale records
        res = (
            supabase.table("video_processing_status")
            .select("youtube_id")
            .eq("status", "processing")
            .lt("updated_at", stale_threshold)
            .execute()
        )
        if res.data:
            ids = [r["youtube_id"] for r in res.data]
            print(f"    Found {len(ids)} stale tasks. Resetting to 'failed'...")
            supabase.table("video_processing_status").update({
                "status": "failed",
                "updated_at": "now()"
            }).in_("youtube_id", ids).execute()
    except Exception as e:
        print(f"    Warning: Stale lock cleanup failed: {e}")


# ============================================================================
# Deduplication (DEPRECATED - Replaced by Distributed Locking)
# ============================================================================

def get_existing_youtube_ids() -> set[str]:
    return get_existing_ids()


# ============================================================================
# yt-dlp Helpers (using subprocess for full CLI flag support)
# ============================================================================

def fetch_channel_videos(channel_url: str) -> list[dict]:
    """Fetch flat video list from a YouTube channel using yt-dlp CLI."""
    cmd = [
        "yt-dlp",
        "--flat-playlist",
        "--dump-json",
        "--quiet",
    ] + get_yt_dlp_cookies() + [channel_url]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"  Warning: yt-dlp returned code {result.returncode}")
        if result.stderr:
            print(f"  {result.stderr[:300]}")

    entries = []
    for line in result.stdout.strip().split("\n"):
        if line.strip():
            try:
                entries.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return entries


def download_audio_and_metadata(yt_id: str, output_dir: str) -> dict | None:
    """
    Download audio from YouTube and return metadata, using subprocess.
    Returns the video info dict or None on failure.
    """
    youtube_url = f"https://www.youtube.com/watch?v={yt_id}"
    output_template = os.path.join(output_dir, f"{yt_id}.%(ext)s")

    cmd = [
        "yt-dlp",
        "-x",
        "--audio-format", "mp3",
        "--audio-quality", "192K",
        "--print-json",
        "-o", output_template,
    ] + YT_DLP_COMMON_ARGS + get_yt_dlp_cookies() + [youtube_url]

    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        stderr_snippet = result.stderr[:500] if result.stderr else "No error output"
        print(f"  ⚠️ yt-dlp error: {stderr_snippet}")
        return None

    # Parse the JSON metadata from stdout
    for line in reversed(result.stdout.strip().split("\n")):
        if line.strip():
            try:
                return json.loads(line)
            except json.JSONDecodeError:
                continue
    return None


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
         a. Download audio + metadata via yt-dlp CLI
         b. (Optional) Crop to 180s for fast testing
         c. Parse metadata (title, event, date, emcees)
         d. Transcribe + diarize with WhisperX
         e. Upload to Supabase
         f. Clean up audio file
    """
    if not SUPABASE_KEY or not HF_TOKEN:
        print("ERROR: Missing SUPABASE_SERVICE_KEY or HF_TOKEN in environment variables.")
        return

    # Cleanup stale locks before starting
    cleanup_stale_locks()

    existing_ids = get_existing_ids()

    # ── Fetch channel video list ──
    print(f"\n[2] Fetching video list from {CHANNEL_URL}...")
    entries = fetch_channel_videos(CHANNEL_URL)
    print(f"    Found {len(entries)} videos on channel.")

    if not entries:
        print("ERROR: Could not fetch any videos. Check cookies and network.")
        return

    # ── Process each video ──
    processed_count = 0

    for idx, entry in enumerate(entries):
        yt_id = entry.get("id", entry.get("url", ""))
        flat_title = entry.get("title", "Unknown Title")

        # Skip: already in database or currently processing
        if yt_id in existing_ids:
            # (Silently skip to keep output clean, but occasionally log progress)
            if idx % 50 == 0:
                print(f"[-] Still scanning channel list... ({idx}/{len(entries)})")
            continue

        # Skip: not a battle video (no "vs" in title)
        if not is_battle_video(flat_title):
            # Mark it as 'completed' in locking table so we never scan it again
            # mark_completed(yt_id) # Optional: could help speed up future scans
            continue

        # ── CLAIM VIDEO (DISTRIBUTED LOCK) ──
        if not claim_video(yt_id):
            print(f"[-] Skipping (Currently being processed by another worker): {flat_title}")
            continue

        # Stop: reached test limit
        if limit and processed_count >= limit:
            print(f"\nReached test limit of {limit} videos.")
            break

        processed_count += 1
        print(f"\n{'='*60}")
        print(f"Processing [{processed_count}] Video {idx+1}/{len(entries)}: {flat_title}")
        print(f"{'='*60}")

        audio_path = os.path.join(DOWNLOAD_DIR, f"{yt_id}.mp3")

        try:
            # ── Download audio & fetch full metadata via CLI ──
            print("  ⬇ Downloading audio...")
            video_meta = download_audio_and_metadata(yt_id, DOWNLOAD_DIR)

            if video_meta is None:
                print(f"  ❌ Failed to download {yt_id}, skipping.")
                continue

            # ── Fast test mode: crop audio to 180 seconds ──
            if fast_test:
                print("  ✂ [FAST TEST] Cropping audio to 180 seconds...")
                cropped = audio_path.replace(".mp3", "_cropped.mp3")
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

            # ── Mark as Completed ──
            mark_completed(yt_id)

            # ── Cleanup ──
            if os.path.exists(audio_path):
                os.remove(audio_path)

        except Exception as e:
            print(f"  ❌ ERROR processing {yt_id}: {e}")
            mark_failed(yt_id)

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
