"use client";

import { useEffect, useRef, useState } from "react";

export function useVideoLooping(
  youtubeId: string | undefined,
  startTime: number | undefined,
  endTime: number | undefined,
  elementId: string,
) {
  const [isLooping, setIsLooping] = useState(true);
  const ytPlayerInstance = useRef<YT.Player | null>(null);
  const playInterval = useRef<NodeJS.Timeout | null>(null);

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
          start: Math.floor(startTime || 0),
          origin: typeof window !== "undefined" ? window.location.origin : "",
        },
        events: {
          onReady: (event) => {
            event.target.playVideo();
          },
        },
      });
    }

    return () => {
      if (playInterval.current) clearInterval(playInterval.current);
      if (ytPlayerInstance.current) {
        try {
          ytPlayerInstance.current.destroy();
        } catch {}
      }
    };
  }, [youtubeId, startTime, elementId]);

  // Video looping logic
  useEffect(() => {
    if (!endTime || !startTime || !ytPlayerInstance.current) return;

    if (playInterval.current) {
      clearInterval(playInterval.current);
    }

    if (!isLooping) return;

    playInterval.current = setInterval(() => {
      const player = ytPlayerInstance.current;
      if (player && typeof player.getCurrentTime === "function") {
        const currentTime = player.getCurrentTime();
        if (currentTime >= endTime) {
          player.seekTo(startTime, true);
        }
      }
    }, 100);

    return () => {
      if (playInterval.current) clearInterval(playInterval.current);
    };
  }, [startTime, endTime, isLooping]);

  const seekToStart = () => {
    if (
      ytPlayerInstance.current &&
      typeof ytPlayerInstance.current.seekTo === "function" &&
      startTime !== undefined
    ) {
      ytPlayerInstance.current.seekTo(startTime, true);
      ytPlayerInstance.current.playVideo();
    }
  };

  return {
    isLooping,
    setIsLooping,
    seekToStart,
  };
}
