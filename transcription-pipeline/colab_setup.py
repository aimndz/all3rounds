"""
Google Colab Setup Script for Dataverse Transcription Pipeline

Run this cell FIRST in your Colab notebook:
    !python colab_setup.py

Then restart the session before running the pipeline.
"""

import subprocess
import sys
import os


def pip(packages: str, extra_flags: str = ""):
    """Run pip install via the current Python executable."""
    cmd = f"{sys.executable} -m pip install --no-cache-dir {extra_flags} {packages}"
    print(f"\n$ {cmd}")
    result = subprocess.run(cmd, shell=True)
    if result.returncode != 0:
        print(f"  ⚠️ Failed (code {result.returncode})")
        return False
    return True


def shell(cmd: str):
    """Run a non-pip shell command."""
    print(f"\n$ {cmd}")
    result = subprocess.run(cmd, shell=True)
    return result.returncode == 0


def main():
    print("🚀 Dataverse Colab Setup")

    # ── Step 1: Node.js v20 + Deno (JS runtimes yt-dlp needs) ──────────────
    # Colab ships Node 12 which is too old for YouTube's JS challenges.
    print("\n📦 [1/4] Installing JS runtimes (Node 20 + Deno)...")
    shell("curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs -qq")
    shell("ln -sf /usr/bin/node /usr/local/bin/node")   # Make sure yt-dlp finds it
    shell("curl -fsSL https://deno.land/x/install/install.sh | sh -s -- -y 2>/dev/null")
    shell("ln -sf ~/.deno/bin/deno /usr/local/bin/deno")
    shell("node -v")
    shell("deno --version 2>&1 | head -1")

    # Uninstall packages that we need to control exact versions of.
    # pyannote.audio is included because upgrading it drags in a new torch.
    print("\n📦 [2/4] Clearing conflicting packages...")
    shell(f"{sys.executable} -m pip uninstall -y "
          "torch torchvision torchaudio whisperx pyannote.audio 2>/dev/null")

    # ── Step 3: Install pipeline deps ───────────────────────────────────────
    # NOTE: numpy and torch are intentionally NOT installed here.
    # They must be force-pinned LAST (step 4) so that pyannote/faster-whisper
    # cannot silently upgrade them during their own installs.
    print("\n📦 [3/4] Installing pipeline deps...")
    pip("transformers==4.36.0")
    pip("pyannote.audio faster-whisper supabase python-dotenv")
    # Install whisperx HEAD with --no-deps to get the latest API without
    # pulling in torch 2.8+ which doesn't exist on cu121 yet.
    pip("git+https://github.com/m-bain/whisperX.git", "--no-deps --upgrade")
    # yt-dlp: always want bleeding-edge for YouTube compatibility
    pip("git+https://github.com/yt-dlp/yt-dlp.git", "--upgrade")

    # ── Step 4: Force-pin PyTorch + NumPy LAST ──────────────────────────────
    # These MUST be last. Dependencies installed above silently upgrade both
    # numpy (to 2.x) and torch, which breaks pyannote and whisperx.
    # --force-reinstall --no-deps ensures OUR versions win.
    print("\n📦 [4/4] Force-pinning PyTorch 2.5.1 + NumPy 1.26.4...")

    if not pip(
        "torch==2.5.1 torchvision==0.20.1 torchaudio==2.5.1 "
        "--index-url https://download.pytorch.org/whl/cu121",
        "--force-reinstall --no-deps",
    ):
        print("❌ PyTorch install failed — check GPU runtime is enabled.")
        return

    # Re-pin numpy AFTER torch because pyannote.audio may have pulled numpy 2.x
    pip("numpy==1.26.4", "--force-reinstall")

    # ── Verify ───────────────────────────────────────────────────────────────
    print("\n🔍 Verifying...")
    verify = (
        f'{sys.executable} -c "'
        "import torch, torchvision, numpy, whisperx, yt_dlp; "
        "print(f'torch {torch.__version__}'); "
        "print(f'numpy {numpy.__version__}'); "
        "print('whisperx OK'); print('yt-dlp OK')"
        '"'
    )
    shell(verify)

    print(f"\n{'='*60}")
    print("✅ Setup complete! IMPORTANT: Restart the session now.")
    print("   Runtime → Restart session")
    print("="*60)
    print("""
After restarting, upload these two files and run:
  • .env          (Supabase + HuggingFace credentials)
  • cookies.txt   (YouTube session cookies)

Then run:
  !python mass_pipeline.py --limit 2 --fast-test  # Quick smoke test
  !python mass_pipeline.py                         # Full pipeline
""")


if __name__ == "__main__":
    main()
