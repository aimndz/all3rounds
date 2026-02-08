"""
Google Colab Setup Script for Talasalita Transcription Pipeline

Run this cell FIRST in your Colab notebook:
    !python colab_setup.py

This handles the tricky version compatibility issues between
PyTorch, torchvision, transformers, and whisperx.
"""

import subprocess
import sys

def run(cmd):
    """Run a shell command and print output."""
    print(f"\n{'='*60}")
    print(f"Running: {cmd}")
    print('='*60)
    result = subprocess.run(cmd, shell=True)
    if result.returncode != 0:
        print(f"⚠️ Command failed with code {result.returncode}")
    return result.returncode == 0

def main():
    print("🚀 Talasalita Colab Setup")
    print("This will install all dependencies with compatible versions.\n")
    
    # Step 1: Uninstall conflicting pre-installed packages
    print("\n📦 Step 1/4: Removing conflicting packages...")
    run("pip uninstall -y torch torchvision torchaudio transformers")
    
    # Step 2: Install PyTorch with CUDA support (compatible version)
    print("\n📦 Step 2/4: Installing PyTorch 2.1.0 with CUDA...")
    run("pip install torch==2.1.0 torchvision==0.16.0 torchaudio==2.1.0 --index-url https://download.pytorch.org/whl/cu121")
    
    # Step 3: Install transformers with compatible version
    print("\n📦 Step 3/4: Installing transformers...")
    run("pip install transformers==4.36.0")
    
    # Step 4: Install whisperx and other dependencies
    print("\n📦 Step 4/4: Installing whisperx and pipeline dependencies...")
    run("pip install whisperx pyannote.audio>=3.1 faster-whisper yt-dlp supabase python-dotenv")
    
    print("\n" + "="*60)
    print("✅ Setup complete!")
    print("="*60)
    print("""
Next steps:
1. Upload your .env file (or set environment variables)
2. Run your transcription:

   !python transcribe.py --url "https://..." --title "..." --event "..."

If you see CUDA errors, go to Runtime → Restart runtime, then run transcribe.py directly.
""")

if __name__ == "__main__":
    main()
