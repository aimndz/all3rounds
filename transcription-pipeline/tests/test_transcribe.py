"""Tests for transcribe.py — pure-logic functions only (no GPU needed)."""

import json
import os
import tempfile
import pytest

# conftest.py stubs heavy deps; now we can import the functions we need.
from transcribe import (
    extract_youtube_id,
    parse_fliptop_metadata,
    parse_battle_participants,
    save_transcript_json,
    load_transcript_json,
    get_yt_dlp_cookies,
)


# ============================================================================
# extract_youtube_id
# ============================================================================

class TestExtractYoutubeId:
    def test_standard_url(self):
        assert extract_youtube_id("https://www.youtube.com/watch?v=abc123") == "abc123"

    def test_short_url(self):
        assert extract_youtube_id("https://youtu.be/xyz789") == "xyz789"

    def test_url_with_extra_params(self):
        assert extract_youtube_id("https://www.youtube.com/watch?v=abc123&t=120") == "abc123"

    def test_short_url_with_query(self):
        assert extract_youtube_id("https://youtu.be/xyz789?t=30") == "xyz789"

    def test_bare_id_passthrough(self):
        assert extract_youtube_id("dQw4w9WgXcQ") == "dQw4w9WgXcQ"


# ============================================================================
# get_yt_dlp_cookies
# ============================================================================

class TestGetYtDlpCookies:
    def test_no_cookies_file(self, tmp_path, monkeypatch):
        monkeypatch.chdir(tmp_path)
        assert get_yt_dlp_cookies() == []

    def test_cookies_file_exists(self, tmp_path, monkeypatch):
        monkeypatch.chdir(tmp_path)
        (tmp_path / "cookies.txt").write_text("cookie data")
        assert get_yt_dlp_cookies() == ["--cookies", "cookies.txt"]


# ============================================================================
# parse_battle_participants
# ============================================================================

class TestParseBattleParticipants:
    def test_1v1(self):
        result = parse_battle_participants("Loonie vs Abra")
        assert result["format"] == "1v1"
        assert result["participants"] == ["Loonie", "Abra"]
        assert result["teams"] == []

    def test_2v2_slash(self):
        result = parse_battle_participants("Loonie/Abra vs Shehyee/Smugglaz")
        assert result["format"] == "2v2"
        assert len(result["participants"]) == 4
        assert len(result["teams"]) == 2

    def test_royal_rumble(self):
        result = parse_battle_participants("A vs B vs C vs D")
        assert result["format"] == "royal_rumble"
        assert len(result["participants"]) == 4

    def test_empty_title(self):
        result = parse_battle_participants("")
        assert result["format"] == "unknown"
        assert result["participants"] == []

    def test_vs_dot(self):
        result = parse_battle_participants("CripLi vs. Zaki")
        assert result["format"] == "1v1"
        assert result["participants"] == ["CripLi", "Zaki"]

    def test_2v2_ampersand(self):
        result = parse_battle_participants("Loonie & Abra vs Shehyee & Smugglaz")
        assert result["format"] == "2v2"
        assert len(result["participants"]) == 4


# ============================================================================
# parse_fliptop_metadata
# ============================================================================

class TestParseFliptopMetadata:
    def test_basic_title(self):
        meta = {"title": "FlipTop - Loonie vs Abra", "description": ""}
        result = parse_fliptop_metadata(meta)
        assert result["battle_title"] == "Loonie vs Abra"
        assert result["battle_format"] == "1v1"
        assert result["participants"] == ["Loonie", "Abra"]

    def test_title_with_event_separator(self):
        meta = {"title": "FlipTop - Loonie vs Abra | Ahon 13", "description": ""}
        result = parse_fliptop_metadata(meta)
        assert result["battle_title"] == "Loonie vs Abra"

    def test_event_from_description(self):
        meta = {
            "title": "FlipTop - Loonie vs Abra",
            "description": "FlipTop presents: Ahon 16 @ The Tent, Las Pinas City",
        }
        result = parse_fliptop_metadata(meta)
        assert result["event_name"] == "Ahon 16"

    def test_event_date_from_description(self):
        meta = {
            "title": "FlipTop - CripLi vs Zaki",
            "description": "FlipTop presents: Ahon 16 @ The Tent... December 13, 2025.",
        }
        result = parse_fliptop_metadata(meta)
        assert result["event_date"] == "2025-12-13"

    def test_event_date_range(self):
        meta = {
            "title": "FlipTop - Test vs Battle",
            "description": "FlipTop presents: Event @ Location... June 14-15, 2024.",
        }
        result = parse_fliptop_metadata(meta)
        assert result["event_date"] == "2024-06-14"

    def test_known_event_fallback(self):
        meta = {
            "title": "FlipTop - A vs B",
            "description": "Watch this epic battle from Isabuhay 2023!",
        }
        result = parse_fliptop_metadata(meta)
        assert result["event_name"] == "Isabuhay 2023"

    def test_at_event_in_title(self):
        meta = {
            "title": "FlipTop - Poison13 vs Plaridhel @ Isabuhay 2023",
            "description": "",
        }
        result = parse_fliptop_metadata(meta)
        assert result["battle_title"] == "Poison13 vs Plaridhel"

    def test_star_tag_stripped(self):
        meta = {
            "title": "FlipTop - A vs B *FREESTYLE BATTLE*",
            "description": "",
        }
        result = parse_fliptop_metadata(meta)
        assert "*" not in result["battle_title"]
        assert result["battle_title"] == "A vs B"

    def test_no_description(self):
        meta = {"title": "FlipTop - Solo Title", "description": ""}
        result = parse_fliptop_metadata(meta)
        assert result["event_name"] is None
        assert result["event_date"] is None


# ============================================================================
# save_transcript_json / load_transcript_json round-trip
# ============================================================================

class TestTranscriptJsonRoundTrip:
    def test_round_trip(self, tmp_path):
        segments = [
            {"speaker": "SPEAKER_00", "text": "  Isa dalawa tatlo  ", "start": 0.123456, "end": 1.789012},
            {"text": "No speaker", "start": 2.0, "end": 3.5},
        ]
        path = str(tmp_path / "output.json")
        save_transcript_json(segments, path)

        loaded = load_transcript_json(path)
        assert len(loaded) == 2
        assert loaded[0]["speaker"] == "SPEAKER_00"
        assert loaded[0]["text"] == "Isa dalawa tatlo"
        assert loaded[0]["start"] == 0.12
        assert loaded[0]["end"] == 1.79

        assert loaded[1]["speaker"] == "UNKNOWN"

    def test_empty_segments(self, tmp_path):
        path = str(tmp_path / "empty.json")
        save_transcript_json([], path)
        loaded = load_transcript_json(path)
        assert loaded == []

    def test_unicode_content(self, tmp_path):
        segments = [{"speaker": "S", "text": "Magandang araw! 🎤", "start": 0, "end": 1}]
        path = str(tmp_path / "unicode.json")
        save_transcript_json(segments, path)
        loaded = load_transcript_json(path)
        assert "🎤" in loaded[0]["text"]
