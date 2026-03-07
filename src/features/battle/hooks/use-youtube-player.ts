"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";

export function useYouTubePlayer(
  youtubeId: string | undefined,
  elementId: string,
) {
  const [player, setPlayer] = useState<YT.Player | null>(null);
  const [activeTime, setActiveTime] = useState(0);
  const ytPlayerInstance = useRef<YT.Player | null>(null);
  const lastUrlSeek = useRef<string | null>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();

  // YouTube IFrame API Initialization
  useEffect(() => {
    if (!youtubeId) return;

    if (!window.YT) {
      const tag = document.createElement("script");
      tag.id = "youtube-iframe-api";
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (previousCallback) previousCallback();
      initPlayer();
    };

    if (window.YT?.Player) {
      initPlayer();
    }

    function initPlayer() {
      if (ytPlayerInstance.current) {
        try {
          ytPlayerInstance.current.destroy();
        } catch {}
      }

      ytPlayerInstance.current = new YT.Player(elementId, {
        videoId: youtubeId,
        playerVars: {
          playsinline: 1,
          modestbranding: 1,
          rel: 0,
          origin: typeof window !== "undefined" ? window.location.origin : "",
        },
        events: {
          onReady: (event) => {
            setPlayer(event.target);
          },
        },
      });
    }
  }, [youtubeId, elementId]);

  // Handle URL-based seeking
  useEffect(() => {
    if (!player || typeof player.seekTo !== "function") return;
    const t = searchParams.get("t");
    if (t && t !== lastUrlSeek.current) {
      const seconds = parseInt(t);
      if (!isNaN(seconds)) {
        player.seekTo(seconds, true);
        player.playVideo();
        lastUrlSeek.current = t;
      }
    }
  }, [player, searchParams]);

  // Playback time sync (10Hz)
  useEffect(() => {
    if (!player) return;
    const interval = setInterval(() => {
      if (player && typeof player.getCurrentTime === "function") {
        setActiveTime(player.getCurrentTime());
      }
    }, 100);
    return () => clearInterval(interval);
  }, [player]);

  const seekTo = useCallback(
    (seconds: number) => {
      if (player && typeof player.seekTo === "function") {
        player.seekTo(seconds, true);
        player.playVideo();
        playerRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    },
    [player],
  );

  return { player, activeTime, playerRef, seekTo };
}
