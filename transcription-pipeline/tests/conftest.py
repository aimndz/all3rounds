"""Shared fixtures for pipeline tests."""

import os
import sys
import pytest

# Ensure the pipeline package is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Stub heavy third-party modules before any pipeline code is imported
# so tests can run without GPU / large model dependencies.

import types

def _make_stub(name):
    mod = types.ModuleType(name)
    return mod

for _mod_name in [
    "torch", "whisperx", "pyannote", "pyannote.audio",
    "faster_whisper", "speechbrain", "torchaudio",
]:
    if _mod_name not in sys.modules:
        sys.modules[_mod_name] = _make_stub(_mod_name)

# Stub torch attributes used at module level in transcribe.py
_torch = sys.modules["torch"]
_torch.load = lambda *a, **kw: None
_torch.cuda = _make_stub("torch.cuda")
_torch.cuda.empty_cache = lambda: None
_torch.device = lambda x: x
_torch.from_numpy = lambda x: type("T", (), {"unsqueeze": lambda s, d: s, "to": lambda s, d: s})()

# Provide env vars so module-level code doesn't crash
os.environ.setdefault("SUPABASE_URL", "http://localhost:54321")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "test-key")
os.environ.setdefault("HF_TOKEN", "test-hf-token")

# Stub supabase create_client before transcribe imports it
_supabase_mod = _make_stub("supabase")
_supabase_mod.create_client = lambda url, key: None
_supabase_mod.Client = type("Client", (), {})
sys.modules["supabase"] = _supabase_mod
