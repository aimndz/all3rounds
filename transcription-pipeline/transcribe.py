"""
Dataverse — FlipTop Transcription Pipeline

Downloads audio from YouTube, transcribes with WhisperX (+ speaker diarization),
and uploads structured battle data to Supabase.

Usage:
  python transcribe.py --url <YOUTUBE_URL>
  python transcribe.py --url <YOUTUBE_URL> --title "Loonie vs Abra" --event "Ahon 13" --date 2024-06-15
  python transcribe.py --upload-only output.json --url <YOUTUBE_URL>

Requirements:
  - NVIDIA GPU with CUDA (or Google Colab free tier)
  - pip install whisperx yt-dlp supabase python-dotenv
  - HuggingFace token accepted at:
      https://huggingface.co/pyannote/speaker-diarization-3.1
      https://huggingface.co/pyannote/segmentation-3.0
      https://huggingface.co/pyannote/speaker-diarization-community-1
"""

# ============================================================================
# Imports
# ============================================================================

import argparse
import gc
import json
import logging
import os
import re
import subprocess
import tempfile
import warnings
from datetime import datetime

# Suppress noisy warnings from torchaudio, speechbrain, and torchcodec
warnings.filterwarnings("ignore", message=".*torchaudio.*deprecated.*")
warnings.filterwarnings("ignore", message=".*std\\(\\).*degrees of freedom.*")
warnings.filterwarnings("ignore", message=".*In 2.9.*torchcodec.*")
logging.getLogger("speechbrain").setLevel(logging.WARNING)

# ============================================================================
# PyTorch 2.6+ Compatibility Patch
# ============================================================================
# pyannote checkpoints contain omegaconf objects. torch.load defaults to
# weights_only=True which rejects them. We patch torch.load globally.

import torch

_original_torch_load = torch.load

def _patched_torch_load(*args, **kwargs):
    kwargs["weights_only"] = False
    return _original_torch_load(*args, **kwargs)

torch.load = _patched_torch_load

# ============================================================================
# Third-Party Imports & Environment
# ============================================================================

import whisperx
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
HF_TOKEN     = os.environ["HF_TOKEN"]

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


# ============================================================================
# YouTube Helpers
# ============================================================================

def extract_youtube_id(url: str) -> str:
    """Extract video ID from various YouTube URL formats."""
    if "youtu.be/" in url:
        return url.split("youtu.be/")[1].split("?")[0]
    if "v=" in url:
        return url.split("v=")[1].split("&")[0]
    return url


def get_yt_dlp_cookies() -> list[str]:
    """Return ['--cookies', 'cookies.txt'] if the file exists, otherwise empty list."""
    if os.path.exists("cookies.txt"):
        return ["--cookies", "cookies.txt"]
    return []


def fetch_video_metadata(url: str) -> dict:
    """
    Fetch video metadata from YouTube using yt-dlp.
    Returns dict with: title, description, upload_date, channel.
    """
    print("[0/4] Fetching video metadata...")
    cmd = [
        "yt-dlp", 
        "--dump-json", 
        "--no-download",
        "--remote-components", "ejs:github",
        "--extractor-args", "youtube:player-client=web",
    ] + get_yt_dlp_cookies() + [url]
    
    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    data = json.loads(result.stdout)

    return {
        "title":       data.get("title", ""),
        "description": data.get("description", ""),
        "upload_date": data.get("upload_date", ""),   # YYYYMMDD
        "channel":     data.get("channel", ""),
    }


def download_audio(url: str, output_dir: str) -> str:
    """Download audio from YouTube as MP3 using yt-dlp."""
    output_path = os.path.join(output_dir, "audio.mp3")
    cmd = [
        "yt-dlp", "-x",
        "--audio-format", "mp3",
        "--audio-quality", "192K",
        "--remote-components", "ejs:github",
        "--extractor-args", "youtube:player-client=web",
        "-o", output_path,
    ] + get_yt_dlp_cookies() + [url]
    print(f"[1/4] Downloading audio from: {url}")
    subprocess.run(cmd, check=True)
    return output_path


# ============================================================================
# FlipTop Metadata Parsing
# ============================================================================

def parse_fliptop_metadata(metadata: dict) -> dict:
    """
    Parse FlipTop-specific metadata from a video's title and description.

    Title patterns:
      "FlipTop - CripLi vs Zaki"
      "FlipTop - LOONIE vs ABRA | Ahon 13"

    Description patterns:
      "FlipTop presents: Ahon 16 @ The Tent, Las Pinas City... December 13-14, 2025."

    Returns: battle_title, event_name, event_date, battle_format, participants, teams
    """
    video_title = metadata.get("title", "")
    description = metadata.get("description", "")

    battle_title = video_title
    event_name = None
    event_date = None

    # --- Clean the title ---
    # Remove "FlipTop - " prefix
    for prefix in ["FlipTop - ", "FlipTop -", "FLIPTOP - ", "FLIPTOP -"]:
        if video_title.startswith(prefix):
            battle_title = video_title[len(prefix):].strip()
            break

    # Strip everything after common separators — these are event/extra info suffixes
    # e.g. "Davera vs Henz | Won Minutes Mindanao *FREESTYLE BATTLE*"
    #      "Onaks vs Karisma – Isabuhay 2022"
    for sep in [" | ", " – ", " — "]:
        if sep in battle_title:
            battle_title = battle_title.split(sep, 1)[0].strip()
            break

    # Handle " @ EventName" pattern
    # e.g. "Poison13 vs Plaridhel @ Isabuhay 2023" → just "Poison13 vs Plaridhel"
    if " @ " in battle_title:
        battle_title = battle_title.split(" @ ", 1)[0].strip()

    # Strip *LABEL* tags anywhere in battle title
    # e.g. "*FREESTYLE BATTLE*" or "*TITLE MATCH*"
    battle_title = re.sub(r"\*[^*]+\*", "", battle_title).strip()

    # --- Extract event name from description ---
    if description:
        # Primary: "FlipTop [REGION] presents: [EVENT] [@ or ,] [LOCATION]"
        match = re.search(r"FlipTop.*?presents:\s*([^@,]+)[@,]", description, re.IGNORECASE)
        if match:
            event_name = match.group(1).strip()
        else:
            # Fallback: known event name patterns
            for pattern in [
                r"(Ahon \d+)", r"(Isabuhay \d+)", r"(FlipTop Festival \d+)",
                r"(Dos Por Dos \d+)", r"(Grain Assault \d+)",
                r"(Sunugan \d+)", r"(Bolilan \d+)",
            ]:
                m = re.search(pattern, description, re.IGNORECASE)
                if m:
                    event_name = m.group(1)
                    break

    # --- Extract event date from description ---
    if description:
        months_re = (
            r"(?:January|February|March|April|May|June|July|August|"
            r"September|October|November|December)"
        )
        date_match = re.search(
            rf"({months_re})\s+(\d{{1,2}})(?:-\d{{1,2}})?,\s*(\d{{4}})",
            description, re.IGNORECASE,
        )
        if date_match:
            try:
                parsed = datetime.strptime(
                    f"{date_match.group(1)} {date_match.group(2)}, {date_match.group(3)}",
                    "%B %d, %Y",
                )
                event_date = parsed.strftime("%Y-%m-%d")
            except ValueError:
                pass

    # --- Parse participants from title ---
    battle_info = parse_battle_participants(battle_title)

    return {
        "battle_title":  battle_title,
        "event_name":    event_name,
        "event_date":    event_date,
        "battle_format": battle_info["format"],
        "participants":  battle_info["participants"],
        "teams":         battle_info["teams"],
    }


def parse_battle_participants(battle_title: str) -> dict:
    """
    Parse emcee names and battle format from a battle title.

    Supported formats:
      1v1:          "CripLi vs Zaki"           → 2 participants
      2v2:          "Loonie/Abra vs Sheh/Smug" → 4 participants, 2 teams
      Royal Rumble: "A vs B vs C vs ..."       → 3+ participants

    Returns: { format, participants, teams }
    """
    vs_pattern = re.compile(r"\s+vs\.?\s+", re.IGNORECASE)
    sides = [s.strip() for s in vs_pattern.split(battle_title) if s.strip()]

    if not sides:
        return {"format": "unknown", "participants": [], "teams": []}

    # Royal rumble: 3+ sides
    if len(sides) >= 3:
        return {"format": "royal_rumble", "participants": sides, "teams": []}

    # Split each side by team separators: "/", " and ", " & "
    team_sep = re.compile(r"\s*/\s*|\s+and\s+|\s*&\s*", re.IGNORECASE)
    teams = []
    all_participants = []

    for side in sides:
        members = [
            # Strip any lingering "@ Event" suffix from participant names
            m.split(" @ ")[0].strip()
            for m in team_sep.split(side)
            if m.strip()
        ]
        teams.append(members)
        all_participants.extend(members)

    if len(teams) == 2:
        a, b = len(teams[0]), len(teams[1])
        if a == 1 and b == 1:
            return {"format": "1v1", "participants": all_participants, "teams": []}
        elif a == 2 and b == 2:
            return {"format": "2v2", "participants": all_participants, "teams": teams}
        else:
            return {"format": f"{a}v{b}", "participants": all_participants, "teams": teams}

    return {
        "format": "unknown",
        "participants": all_participants,
        "teams": teams if any(len(t) > 1 for t in teams) else [],
    }


# ============================================================================
# Transcription & Diarization
# ============================================================================

def _free_gpu(device: str):
    """Force garbage collection and free CUDA VRAM."""
    gc.collect()
    if device == "cuda":
        torch.cuda.empty_cache()


def transcribe_and_diarize(audio_path: str, device: str = "cuda") -> list[dict]:
    """
    Full WhisperX pipeline: transcribe → align → diarize.

    Each model is loaded and freed sequentially to stay within GPU VRAM limits.
    Audio is passed in-memory to pyannote to bypass Colab's broken torchcodec.

    Returns a list of segments: { text, speaker, start, end }
    """
    import pandas as pd
    from pyannote.audio import Pipeline

    compute_type = "float16" if device == "cuda" else "int8"

    # ── Step 1: Transcribe ──
    print("[2/4] Transcribing audio with Whisper Large-v3...")
    model = whisperx.load_model("large-v3", device, compute_type=compute_type, language="tl")
    audio = whisperx.load_audio(audio_path)
    result = model.transcribe(audio, batch_size=32)  # T4 has 16GB — 32 is safe
    del model
    _free_gpu(device)

    # ── Step 2: Align timestamps ──
    print("[3/4] Aligning timestamps...")
    lang = result["language"]

    # WhisperX has no default alignment model for Tagalog ("tl") or some
    # other languages. Check if the language is supported; if not, fall back
    # to English which handles Tagalog/code-switched content well enough.
    try:
        from whisperx.alignment import DEFAULT_ALIGN_MODELS_TORCH, DEFAULT_ALIGN_MODELS_HF
        supported = set(DEFAULT_ALIGN_MODELS_TORCH.keys()) | set(DEFAULT_ALIGN_MODELS_HF.keys())
    except ImportError:
        supported = {"en", "fr", "de", "es", "it", "ja", "zh", "nl", "uk", "pt"}

    align_lang = lang if lang in supported else "en"
    if align_lang != lang:
        print(f"    ⚠ No alignment model for '{lang}', falling back to English...")

    model_a, metadata = whisperx.load_align_model(language_code=align_lang, device=device)
    result = whisperx.align(
        result["segments"], model_a, metadata, audio, device,
        return_char_alignments=False,
    )
    del model_a
    _free_gpu(device)

    # ── Step 3: Speaker diarization ──
    print("[4/4] Identifying speakers (diarization)...")
    diarize_model = Pipeline.from_pretrained(
        "pyannote/speaker-diarization-3.1", token=HF_TOKEN,
    ).to(torch.device(device))

    # Pass in-memory waveform to bypass pyannote's broken torchcodec in Colab
    waveform = torch.from_numpy(audio).unsqueeze(0).to(torch.device(device))
    diarize_output = diarize_model({"waveform": waveform, "sample_rate": 16000})
    del diarize_model, waveform
    _free_gpu(device)

    # Extract the Annotation from DiarizeOutput (pyannote 3.3.x compatibility)
    annotation = (
        getattr(diarize_output, "speaker_diarization", None)
        or getattr(diarize_output, "annotation", None)
        or (diarize_output[0] if isinstance(diarize_output, tuple) else None)
        or diarize_output
    )

    diarize_df = pd.DataFrame([
        {"start": turn.start, "end": turn.end, "speaker": speaker}
        for turn, _, speaker in annotation.itertracks(yield_label=True)
    ])
    print(f"    ✓ Extracted {len(diarize_df)} speaker segments")

    result = whisperx.assign_word_speakers(diarize_df, result)
    return result["segments"]


# ============================================================================
# Supabase Upload
# ============================================================================

def upload_to_supabase(
    segments: list[dict],
    youtube_id: str,
    title: str,
    event_name: str | None = None,
    event_date: str | None = None,
    battle_format: str | None = None,
    participants: list[str] | None = None,
):
    """
    Insert a battle record, its transcript lines, and linked emcees into Supabase.
    Uses upsert on youtube_id to support idempotent re-runs.
    """
    print(f"\nUploading {len(segments)} lines to Supabase...")

    # Upsert battle record
    battle_data = {
        "youtube_id": youtube_id,
        "title":      title,
        "event_name": event_name,
        "event_date": event_date,
    }
    battle_res = (
        supabase.table("battles")
        .upsert(battle_data, on_conflict="youtube_id")
        .execute()
    )
    battle_id = battle_res.data[0]["id"]

    # Build and insert transcript lines
    lines = [
        {
            "battle_id":     battle_id,
            "speaker_label": seg.get("speaker", "UNKNOWN"),
            "content":       seg.get("text", "").strip(),
            "start_time":    round(seg.get("start", 0), 2),
            "end_time":      round(seg.get("end", 0), 2),
        }
        for seg in segments
        if seg.get("text", "").strip()
    ]
    if lines:
        supabase.table("lines").insert(lines).execute()

    # Batch upsert emcees and link to battle (1 round-trip instead of N)
    if participants:
        print(f"  Creating/linking {len(participants)} emcees...")
        emcee_res = (
            supabase.table("emcees")
            .upsert([{"name": n} for n in participants], on_conflict="name")
            .execute()
        )
        participant_rows = [
            {"battle_id": battle_id, "emcee_id": e["id"]}
            for e in emcee_res.data
        ]
        if participant_rows:
            supabase.table("battle_participants").upsert(
                participant_rows, on_conflict="battle_id,emcee_id"
            ).execute()

    # Summary
    speakers = set(l["speaker_label"] for l in lines)
    print(f"✓ Uploaded {len(lines)} lines for battle: {title}")
    print(f"  Battle ID: {battle_id}")
    if battle_format:
        print(f"  Format:    {battle_format}")
    if participants:
        print(f"  Emcees:    {', '.join(participants)}")
    print(f"  Speakers:  {', '.join(speakers)}")
    print("\n  NOTE: Map speaker labels → emcee names in the admin panel.")


# ============================================================================
# JSON Backup Helpers
# ============================================================================

def save_transcript_json(segments: list[dict], output_path: str):
    """Save raw transcript segments to a JSON file for backup."""
    clean = [
        {
            "speaker": seg.get("speaker", "UNKNOWN"),
            "text":    seg.get("text", "").strip(),
            "start":   round(seg.get("start", 0), 2),
            "end":     round(seg.get("end", 0), 2),
        }
        for seg in segments
    ]
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(clean, f, ensure_ascii=False, indent=2)
    print(f"  Transcript saved: {output_path}")


def load_transcript_json(json_path: str) -> list[dict]:
    """Load transcript segments from a previously saved JSON file."""
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return [
        {
            "speaker": item.get("speaker", "UNKNOWN"),
            "text":    item.get("text", ""),
            "start":   item.get("start", 0),
            "end":     item.get("end", 0),
        }
        for item in data
    ]


# ============================================================================
# CLI Entry Point
# ============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Dataverse — Transcribe a FlipTop battle from YouTube"
    )
    parser.add_argument("--url",      required=True,  help="YouTube video URL")
    parser.add_argument("--title",    default=None,   help="Battle title (auto-detected if omitted)")
    parser.add_argument("--event",    default=None,   help="Event name (auto-detected if omitted)")
    parser.add_argument("--date",     default=None,   help="Event date YYYY-MM-DD (auto-detected if omitted)")
    parser.add_argument("--device",   default="cuda", choices=["cuda", "cpu"], help="Device for inference")
    parser.add_argument("--save-json",    default=None, help="Path to save raw transcript JSON")
    parser.add_argument("--upload-only",  default=None, metavar="JSON_FILE",
                        help="Skip transcription — upload from existing JSON file")
    parser.add_argument("--no-auto-metadata", action="store_true",
                        help="Disable automatic metadata detection from YouTube")
    args = parser.parse_args()

    youtube_id = extract_youtube_id(args.url)

    # --- Check for Excluded Status ---
    # If the video is already in the DB as 'excluded', skip immediately.
    existing_battle = supabase.table("battles").select("status").eq("youtube_id", youtube_id).execute()
    if existing_battle.data and existing_battle.data[0].get("status") == "excluded":
        print(f"\n[SKIP] Video {youtube_id} is marked as 'excluded' (not a battle). Skipping pipeline.")
        return

    # --- Resolve metadata ---
    title        = args.title
    event_name   = args.event
    event_date   = args.date
    battle_format = None
    participants  = []

    if not args.no_auto_metadata and (not title or not event_name or not event_date):
        try:
            video_meta = fetch_video_metadata(args.url)
            parsed = parse_fliptop_metadata(video_meta)

            title        = title or parsed["battle_title"]
            event_name   = event_name or parsed["event_name"]
            event_date   = event_date or parsed["event_date"]
            battle_format = parsed.get("battle_format")
            participants  = parsed.get("participants", [])

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

    # Parse participants from title if metadata fetch was skipped
    if title and not participants:
        info = parse_battle_participants(title)
        battle_format = info.get("format")
        participants  = info.get("participants", [])

    if not title:
        print("Error: --title is required")
        return

    # --- Upload-only mode ---
    if args.upload_only:
        print(f"[Upload Only] Loading transcript from: {args.upload_only}")
        segments = load_transcript_json(args.upload_only)
        print(f"  Loaded {len(segments)} segments")
        upload_to_supabase(
            segments=segments, youtube_id=youtube_id, title=title,
            event_name=event_name, event_date=event_date,
            battle_format=battle_format, participants=participants,
        )
        return

    # --- Full pipeline: download → transcribe → upload ---
    with tempfile.TemporaryDirectory() as tmpdir:
        audio_path = download_audio(args.url, tmpdir)
        segments = transcribe_and_diarize(audio_path, device=args.device)

        if args.save_json:
            save_transcript_json(segments, args.save_json)

        upload_to_supabase(
            segments=segments, youtube_id=youtube_id, title=title,
            event_name=event_name, event_date=event_date,
            battle_format=battle_format, participants=participants,
        )


if __name__ == "__main__":
    main()
