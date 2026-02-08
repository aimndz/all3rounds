"""
Talasalita — FlipTop Transcription Pipeline

Downloads audio from YouTube, transcribes it with WhisperX
(with speaker diarization), and uploads lines to Supabase.

Usage:
  # Auto-detect title, event, and date from YouTube:
  python transcribe.py --url <YOUTUBE_URL>
  
  # Or specify manually:
  python transcribe.py --url <YOUTUBE_URL> --title "Loonie vs Abra" --event "Ahon 13" --date 2024-06-15

Requirements:
  - NVIDIA GPU with CUDA (or use Google Colab free tier)
  - pip install whisperx yt-dlp supabase python-dotenv
  - HuggingFace token for pyannote (free account): https://huggingface.co/settings/tokens
    Accept the user agreement at: https://huggingface.co/pyannote/speaker-diarization-3.1
"""

import argparse
import os
import json
import re
import subprocess
import tempfile
import warnings
import logging
from datetime import datetime
from pathlib import Path

# Suppress noisy torchaudio deprecation warnings and speechbrain debug logs
warnings.filterwarnings("ignore", message=".*torchaudio.*deprecated.*")
warnings.filterwarnings("ignore", message=".*std\\(\\).*degrees of freedom.*")
warnings.filterwarnings("ignore", message=".*In 2.9.*torchcodec.*")
logging.getLogger("speechbrain").setLevel(logging.WARNING)

# ---- PyTorch 2.6+ fix ----
# pyannote models use omegaconf objects in their checkpoints.
# torch.load now defaults to weights_only=True which blocks these.
# lightning_fabric also explicitly passes weights_only=True,
# so we must force it to False.
import torch
_original_torch_load = torch.load
def _patched_torch_load(*args, **kwargs):
    kwargs["weights_only"] = False
    return _original_torch_load(*args, **kwargs)
torch.load = _patched_torch_load
# ---- End fix ----

import whisperx
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
HF_TOKEN = os.environ["HF_TOKEN"]

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


def extract_youtube_id(url: str) -> str:
    """Extract YouTube video ID from various URL formats."""
    if "youtu.be/" in url:
        return url.split("youtu.be/")[1].split("?")[0]
    if "v=" in url:
        return url.split("v=")[1].split("&")[0]
    return url


def fetch_video_metadata(url: str) -> dict:
    """
    Fetch video metadata from YouTube using yt-dlp.
    Returns dict with: title, description, upload_date, channel
    """
    print("[0/4] Fetching video metadata...")
    cmd = [
        "yt-dlp",
        "--dump-json",
        "--no-download",
        url,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    data = json.loads(result.stdout)
    
    return {
        "title": data.get("title", ""),
        "description": data.get("description", ""),
        "upload_date": data.get("upload_date", ""),  # Format: YYYYMMDD
        "channel": data.get("channel", ""),
    }


def parse_fliptop_metadata(metadata: dict) -> dict:
    """
    Parse FlipTop-specific metadata from video title and description.
    
    FlipTop video titles follow the pattern:
    - "FlipTop - CripLi vs Zaki"
    - "FlipTop - LOONIE vs ABRA"
    
    FlipTop descriptions follow the pattern:
    - "FlipTop presents: Ahon 16 @ The Tent, Las Pinas City... December 13-14, 2025."
    
    Returns dict with: battle_title, event_name, event_date
    """
    video_title = metadata.get("title", "")
    description = metadata.get("description", "")
    
    # Default values
    battle_title = video_title
    event_name = None
    event_date = None
    
    # ---- Parse battle title ----
    # Remove "FlipTop - " or "FlipTop -" prefix from title
    fliptop_prefixes = ["FlipTop - ", "FlipTop -", "FLIPTOP - ", "FLIPTOP -"]
    for prefix in fliptop_prefixes:
        if video_title.startswith(prefix):
            battle_title = video_title[len(prefix):].strip()
            break
    
    # Also handle " | " or " - " separators if present after removing prefix
    # e.g., "LOONIE vs ABRA | Ahon 13" -> just keep "LOONIE vs ABRA"
    separators = [" | ", " – ", " — "]
    for sep in separators:
        if sep in battle_title:
            parts = battle_title.split(sep, 1)
            battle_title = parts[0].strip()
            # Don't extract event from title - we'll get it from description
            break
    
    # ---- Parse event name from description ----
    # Pattern: "FlipTop presents: [EVENT_NAME] @"
    if description:
        presents_match = re.search(
            r"FlipTop presents:\s*([^@]+)@",
            description,
            re.IGNORECASE
        )
        if presents_match:
            event_name = presents_match.group(1).strip()
        else:
            # Fallback: look for common event patterns anywhere in description
            event_patterns = [
                r"(Ahon \d+)",
                r"(Isabuhay \d+)",
                r"(FlipTop Festival \d+)",
                r"(Dos Por Dos \d+)",
                r"(Grain Assault \d+)",
                r"(Sunugan \d+)",
                r"(Bolilan \d+)",
            ]
            for pattern in event_patterns:
                match = re.search(pattern, description, re.IGNORECASE)
                if match:
                    event_name = match.group(1)
                    break
    
    # ---- Parse event date from description ----
    # Look for date patterns like "December 13-14, 2025" or "June 15, 2024"
    if description:
        # Month patterns
        months = (
            r"(?:January|February|March|April|May|June|July|August|"
            r"September|October|November|December)"
        )
        
        # Pattern: "Month DD-DD, YYYY" or "Month DD, YYYY"
        date_match = re.search(
            rf"({months})\s+(\d{{1,2}})(?:-\d{{1,2}})?,\s*(\d{{4}})",
            description,
            re.IGNORECASE
        )
        
        if date_match:
            month_str = date_match.group(1)
            day_str = date_match.group(2)
            year_str = date_match.group(3)
            
            try:
                # Parse the date (use first day if range like "13-14")
                parsed = datetime.strptime(
                    f"{month_str} {day_str}, {year_str}",
                    "%B %d, %Y"
                )
                event_date = parsed.strftime("%Y-%m-%d")
            except ValueError:
                pass
    
    # ---- Parse battle participants from title ----
    battle_info = parse_battle_participants(battle_title)
    
    return {
        "battle_title": battle_title,
        "event_name": event_name,
        "event_date": event_date,
        "battle_format": battle_info["format"],
        "participants": battle_info["participants"],
        "teams": battle_info["teams"],
    }


def parse_battle_participants(battle_title: str) -> dict:
    """
    Parse emcee names and battle format from battle title.
    
    Formats:
    - 1v1: "CripLi vs Zaki" → 2 participants, no teams
    - 2v2: "Loonie/Abra vs Shehyee/Smugglaz" → 4 participants, 2 teams
    - Royal Rumble: "Zaito vs C-Quence vs CNine vs ..." → 3+ participants, no teams
    
    Returns dict with:
    - format: "1v1", "2v2", or "royal_rumble"
    - participants: list of all emcee names
    - teams: list of teams (each team is a list of emcee names), empty for 1v1/rumble
    """
    # Split by " vs " (case insensitive)
    vs_pattern = re.compile(r"\s+vs\.?\s+", re.IGNORECASE)
    sides = vs_pattern.split(battle_title)
    
    # Clean up each side
    sides = [s.strip() for s in sides if s.strip()]
    
    if len(sides) == 0:
        return {
            "format": "unknown",
            "participants": [],
            "teams": [],
        }
    
    # Check if it's a royal rumble (3+ sides, each with single emcee)
    if len(sides) >= 3:
        # Royal rumble - each side is one emcee
        participants = sides
        return {
            "format": "royal_rumble",
            "participants": participants,
            "teams": [],
        }
    
    # For 2-sided battles, check if either side has multiple emcees (2v2)
    # Team members are separated by "/" or " and " or " & "
    team_separator = re.compile(r"\s*/\s*|\s+and\s+|\s*&\s*", re.IGNORECASE)
    
    teams = []
    all_participants = []
    
    for side in sides:
        members = team_separator.split(side)
        members = [m.strip() for m in members if m.strip()]
        teams.append(members)
        all_participants.extend(members)
    
    # Determine format based on team sizes
    if len(teams) == 2:
        team_a_size = len(teams[0])
        team_b_size = len(teams[1])
        
        if team_a_size == 1 and team_b_size == 1:
            # 1v1
            return {
                "format": "1v1",
                "participants": all_participants,
                "teams": [],  # No teams for 1v1
            }
        elif team_a_size == 2 and team_b_size == 2:
            # 2v2
            return {
                "format": "2v2",
                "participants": all_participants,
                "teams": teams,
            }
        elif team_a_size >= 2 or team_b_size >= 2:
            # Mixed team sizes (e.g., 2v1 or 3v2)
            return {
                "format": f"{team_a_size}v{team_b_size}",
                "participants": all_participants,
                "teams": teams,
            }
    
    # Fallback
    return {
        "format": "unknown",
        "participants": all_participants,
        "teams": teams if any(len(t) > 1 for t in teams) else [],
    }


def download_audio(url: str, output_dir: str) -> str:
    """Download audio from YouTube using yt-dlp."""
    output_path = os.path.join(output_dir, "audio.wav")
    cmd = [
        "yt-dlp",
        "-x",
        "--audio-format", "wav",
        "--audio-quality", "0",
        "-o", output_path,
        url,
    ]
    print(f"[1/4] Downloading audio from: {url}")
    subprocess.run(cmd, check=True)
    return output_path


def transcribe_and_diarize(audio_path: str, device: str = "cuda") -> list[dict]:
    """
    Run WhisperX transcription + alignment + diarization.
    Returns a list of segments with speaker labels and timestamps.
    """
    compute_type = "float16" if device == "cuda" else "int8"

    # Step 1: Transcribe
    print("[2/4] Transcribing audio with Whisper Large-v3...")
    model = whisperx.load_model(
        "large-v3", device, compute_type=compute_type, language="tl"
    )
    audio = whisperx.load_audio(audio_path)
    result = model.transcribe(audio, batch_size=16)

    # Step 2: Align (improves word-level timestamps)
    print("[3/4] Aligning timestamps...")
    model_a, metadata = whisperx.load_align_model(
        language_code=result["language"], device=device
    )
    result = whisperx.align(
        result["segments"], model_a, metadata, audio, device,
        return_char_alignments=False,
    )

    # Step 3: Diarize (Speaker 0 vs Speaker 1)
    print("[4/4] Identifying speakers (diarization)...")
    import pandas as pd
    from pyannote.audio import Pipeline as PyannotePipeline
    diarize_model = PyannotePipeline.from_pretrained(
        "pyannote/speaker-diarization-3.1",
        use_auth_token=HF_TOKEN,
    ).to(torch.device(device))
    diarize_annotation = diarize_model(audio_path)

    # Convert pyannote Annotation → DataFrame (what whisperx expects)
    diarize_df = pd.DataFrame(
        [
            {"start": turn.start, "end": turn.end, "speaker": speaker}
            for turn, _, speaker in diarize_annotation.itertracks(yield_label=True)
        ]
    )
    result = whisperx.assign_word_speakers(diarize_df, result)

    return result["segments"]


def upload_to_supabase(
    segments: list[dict],
    youtube_id: str,
    title: str,
    event_name: str | None = None,
    event_date: str | None = None,
    battle_format: str | None = None,
    participants: list[str] | None = None,
):
    """Insert battle + lines + emcees into Supabase."""
    print(f"\nUploading {len(segments)} lines to Supabase...")

    # Upsert battle (format not stored in DB, just used for display)
    battle_data = {
        "youtube_id": youtube_id,
        "title": title,
        "event_name": event_name,
        "event_date": event_date,
    }
    battle_res = (
        supabase.table("battles")
        .upsert(battle_data, on_conflict="youtube_id")
        .execute()
    )
    battle_id = battle_res.data[0]["id"]

    # Insert lines
    lines = []
    for seg in segments:
        text = seg.get("text", "").strip()
        if not text:
            continue
        lines.append({
            "battle_id": battle_id,
            "speaker_label": seg.get("speaker", "UNKNOWN"),
            "content": text,
            "start_time": round(seg.get("start", 0), 2),
            "end_time": round(seg.get("end", 0), 2),
        })

    if lines:
        supabase.table("lines").insert(lines).execute()

    # Create emcees and link to battle
    if participants:
        print(f"  Creating/linking {len(participants)} emcees...")
        for emcee_name in participants:
            # Upsert emcee (insert if not exists)
            emcee_res = (
                supabase.table("emcees")
                .upsert({"name": emcee_name}, on_conflict="name")
                .execute()
            )
            emcee_id = emcee_res.data[0]["id"]
            
            # Link to battle (ignore if already linked)
            try:
                supabase.table("battle_participants").upsert(
                    {"battle_id": battle_id, "emcee_id": emcee_id},
                    on_conflict="battle_id,emcee_id"
                ).execute()
            except Exception:
                pass  # Already linked, ignore

    print(f"✓ Uploaded {len(lines)} lines for battle: {title}")
    print(f"  Battle ID: {battle_id}")
    if battle_format:
        print(f"  Format: {battle_format}")
    if participants:
        print(f"  Emcees: {', '.join(participants)}")

    # Show speaker summary
    speakers = set(l["speaker_label"] for l in lines)
    print(f"  Speakers detected: {', '.join(speakers)}")
    print(
        "\n  NOTE: Go to the admin panel to map speaker labels to emcee names."
    )


def save_transcript_json(segments: list[dict], output_path: str):
    """Save raw transcript to a JSON file for backup / review."""
    clean = []
    for seg in segments:
        clean.append({
            "speaker": seg.get("speaker", "UNKNOWN"),
            "text": seg.get("text", "").strip(),
            "start": round(seg.get("start", 0), 2),
            "end": round(seg.get("end", 0), 2),
        })
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(clean, f, ensure_ascii=False, indent=2)
    print(f"  Transcript saved: {output_path}")


def load_transcript_json(json_path: str) -> list[dict]:
    """Load transcript from a previously saved JSON file."""
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    # Convert our saved format back to segment format
    segments = []
    for item in data:
        segments.append({
            "speaker": item.get("speaker", "UNKNOWN"),
            "text": item.get("text", ""),
            "start": item.get("start", 0),
            "end": item.get("end", 0),
        })
    return segments


def main():
    parser = argparse.ArgumentParser(
        description="Talasalita — Transcribe a FlipTop battle from YouTube"
    )
    parser.add_argument("--url", required=True, help="YouTube video URL")
    parser.add_argument("--title", default=None, help='Battle title (auto-detected from YouTube if not specified)')
    parser.add_argument("--event", default=None, help='Event name (auto-detected from YouTube if not specified)')
    parser.add_argument("--date", default=None, help="Event date (uses upload date if not specified)")
    parser.add_argument("--device", default="cuda", choices=["cuda", "cpu"], help="Device to use")
    parser.add_argument("--save-json", default=None, help="Path to save raw transcript JSON")
    parser.add_argument(
        "--upload-only", 
        default=None, 
        metavar="JSON_FILE",
        help="Skip transcription and upload from existing JSON file (e.g. output.json)"
    )
    parser.add_argument(
        "--no-auto-metadata",
        action="store_true",
        help="Disable automatic metadata detection from YouTube"
    )
    args = parser.parse_args()

    youtube_id = extract_youtube_id(args.url)
    
    # Fetch metadata from YouTube if title not provided
    title = args.title
    event_name = args.event
    event_date = args.date
    battle_format = None
    participants = []
    
    if not args.no_auto_metadata and (not title or not event_name or not event_date):
        try:
            video_meta = fetch_video_metadata(args.url)
            parsed = parse_fliptop_metadata(video_meta)
            
            if not title:
                title = parsed["battle_title"]
            if not event_name:
                event_name = parsed["event_name"]
            if not event_date:
                event_date = parsed["event_date"]
            
            # Always get format and participants from parsed metadata
            battle_format = parsed.get("battle_format")
            participants = parsed.get("participants", [])
            
            print(f"  Auto-detected:")
            print(f"    Title:   {title}")
            print(f"    Event:   {event_name or '(not detected)'}")
            print(f"    Date:    {event_date or '(not detected)'}")
            print(f"    Format:  {battle_format or '(not detected)'}")
            print(f"    Emcees:  {', '.join(participants) if participants else '(not detected)'}")
        except Exception as e:
            print(f"  Warning: Could not fetch metadata: {e}")
            if not title:
                print("  Error: --title is required when metadata fetch fails")
                return
    
    # If we have a title but didn't fetch metadata, try to parse participants from title
    if title and not participants:
        battle_info = parse_battle_participants(title)
        battle_format = battle_info.get("format")
        participants = battle_info.get("participants", [])
    
    if not title:
        print("Error: --title is required")
        return

    # Upload-only mode: skip transcription, just upload existing JSON
    if args.upload_only:
        print(f"[Upload Only] Loading transcript from: {args.upload_only}")
        segments = load_transcript_json(args.upload_only)
        print(f"  Loaded {len(segments)} segments")
        upload_to_supabase(
            segments=segments,
            youtube_id=youtube_id,
            title=title,
            event_name=event_name,
            event_date=event_date,
            battle_format=battle_format,
            participants=participants,
        )
        return

    # Full pipeline: download, transcribe, upload
    with tempfile.TemporaryDirectory() as tmpdir:
        audio_path = download_audio(args.url, tmpdir)
        segments = transcribe_and_diarize(audio_path, device=args.device)

        if args.save_json:
            save_transcript_json(segments, args.save_json)

        upload_to_supabase(
            segments=segments,
            youtube_id=youtube_id,
            title=title,
            event_name=event_name,
            event_date=event_date,
            battle_format=battle_format,
            participants=participants,
        )


if __name__ == "__main__":
    main()
