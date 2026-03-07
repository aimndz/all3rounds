"""Tests for mass_pipeline.py — pure-logic functions only."""

import pytest

# conftest.py stubs heavy deps before any import
from mass_pipeline import is_battle_video


# ============================================================================
# is_battle_video
# ============================================================================

class TestIsBattleVideo:
    def test_standard_vs(self):
        assert is_battle_video("FlipTop - Loonie vs Abra") is True

    def test_vs_dot(self):
        assert is_battle_video("FlipTop - CripLi vs. Zaki") is True

    def test_uppercase_vs(self):
        assert is_battle_video("LOONIE VS ABRA") is True

    def test_no_vs(self):
        assert is_battle_video("FlipTop Festival 2024 Highlights") is False

    def test_behind_the_scenes(self):
        assert is_battle_video("Behind the Scenes - Ahon 16") is False

    def test_empty_string(self):
        assert is_battle_video("") is False
