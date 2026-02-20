"""
Google Colab Setup Script for Dataverse Transcription Pipeline

Run this cell FIRST in your Colab notebook:
    !python colab_setup.py

Handles the tricky version compatibility between PyTorch, torchvision,
transformers, and whisperx inside Google Colab's environment.
"""

import subprocess
import sys


def run(cmd):
    """Run a shell command and report success/failure."""
    print(f"\n{'='*60}")
    print(f"Running: {cmd}")
    print("=" * 60)
    result = subprocess.run(cmd, shell=True)
    if result.returncode != 0:
        print(f"⚠️ Command failed with code {result.returncode}")
    return result.returncode == 0


def main():
    print("🚀 Dataverse Colab Setup")
    print("Installing all dependencies with compatible versions.\n")

    # Step 1: NodeJS (required by yt-dlp for YouTube JS challenge)
    print("\n📦 Step 1/5: Installing NodeJS for yt-dlp...")
    run("apt-get update && apt-get install -y nodejs")

    # Step 2: Remove conflicting pre-installed packages
    print("\n📦 Step 2/5: Removing conflicting packages...")
    run("pip uninstall -y torch torchvision torchaudio transformers")

    # Step 3: Install PyTorch with CUDA 12.1 support
    print("\n📦 Step 3/5: Installing PyTorch 2.1.0 with CUDA...")
    run("pip install torch==2.1.0 torchvision==0.16.0 torchaudio==2.1.0 "
        "--index-url https://download.pytorch.org/whl/cu121")

    # Step 4: Install compatible transformers
    print("\n📦 Step 4/5: Installing transformers...")
    run("pip install transformers==4.36.0")

    # Step 5: Install whisperx and pipeline dependencies
    # Pin pyannote.audio==3.1.1 to avoid torchcodec/FFmpeg issues in Colab
    print("\n📦 Step 5/5: Installing whisperx and pipeline dependencies...")
    run("pip install whisperx pyannote.audio==3.1.1 faster-whisper "
        "yt-dlp supabase python-dotenv")

    print(f"\n{'='*60}")
    print("✅ Setup complete!")
    print("=" * 60)
    print("""
Next steps:
  1. Go to Runtime → Restart runtime
  2. Upload your .env file (or set environment variables)
  3. Run your transcription:

     # Single battle:
     !python transcribe.py --url "https://..." --title "..."

     # Mass pipeline:
     !python mass_pipeline.py --limit 1 --fast-test
""")


if __name__ == "__main__":
    main()
