"use client";

import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import Image from "next/image";

interface YouTubeLoopPlayerProps {
  videoId: string;
  /** Start time in seconds for the looped segment */
  startTime: number;
  /** End time in seconds (video will jump back to startTime when reached) */
  endTime: number;
  /** Whether to play the video segment automatically on load */
  autoplay?: boolean;
  /** Optional CSS classes for the container div */
  className?: string;
  /** Optional callback fired when the YouTube API player is ready */
  onReady?: (player: YT.Player) => void;
  /** A key used to force player re-initialization (e.g. for seeking) */
  playerKey?: string | number;
}

/**
 * A specialized YouTube player that loops a specific video segment using the IFrame API.
 * This is used for precise transcript review where the context needs to repeat.
 */
export default function YouTubeLoopPlayer({
  videoId,
  startTime,
  endTime,
  autoplay = false,
  className = "",
  onReady,
  playerKey,
}: YouTubeLoopPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const [hasInteracted, setHasInteracted] = useState(autoplay || !!playerKey);
  const [prevProps, setPrevProps] = useState({ autoplay, playerKey });

  // Update state when props change during render to avoid cascading useEffect renders
  if (prevProps.autoplay !== autoplay || prevProps.playerKey !== playerKey) {
    if (autoplay || playerKey) {
      setHasInteracted(true);
    }
    setPrevProps({ autoplay, playerKey });
  }

  useEffect(() => {
    if (!hasInteracted) return;

    let mounted = true;

    const loadApi = () => {
      if (!window.YT) {
        const tag = document.createElement("script");
        tag.id = "youtube-iframe-api";
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName("script")[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      }
    };

    const initPlayer = () => {
      if (!mounted || !containerRef.current) return;

      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {}
      }

      // Create a specific container inside the ref
      containerRef.current.innerHTML = "";
      const playerDiv = document.createElement("div");
      playerDiv.className = "w-full h-full";
      containerRef.current.appendChild(playerDiv);

      playerRef.current = new YT.Player(playerDiv, {
        width: "100%",
        height: "100%",
        videoId,
        playerVars: {
          start: Math.round(startTime),
          autoplay: 1, // Auto-play is safely 1 here because user interacted to reach here
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          controls: 1,
          origin: typeof window !== "undefined" ? window.location.origin : "",
        },
        events: {
          onReady: (event: YT.PlayerEvent) => {
            if (!mounted) return;
            if (onReady) onReady(event.target);
            event.target.playVideo();
          },
        },
      });
    };

    loadApi();

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prevCallback) prevCallback();
        initPlayer();
      };
    }

    return () => {
      mounted = false;
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {}
      }
    };
  }, [videoId, startTime, endTime, playerKey, hasInteracted, onReady]);

  useEffect(() => {
    if (!hasInteracted) return;

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      if (
        playerRef.current &&
        typeof playerRef.current.getCurrentTime === "function"
      ) {
        const state = playerRef.current.getPlayerState();
        if (state === 1) {
          // 1 = Playing
          const currentTime = playerRef.current.getCurrentTime();
          if (currentTime >= endTime + 0.5) {
            // small buffer
            playerRef.current.seekTo(startTime, true);
          }
        }
      }
    }, 200);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startTime, endTime, hasInteracted]);

  if (!hasInteracted) {
    return (
      <div
        className={`group focus-within:ring-primary relative flex cursor-pointer items-center justify-center bg-black outline-none focus-within:ring-2 ${className}`}
        onClick={() => setHasInteracted(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setHasInteracted(true);
        }}
        tabIndex={0}
      >
        <Image
          src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
          alt="Video thumbnail"
          fill
          unoptimized={true}
          className="absolute inset-0 h-full w-full object-cover opacity-60 transition-opacity duration-300 group-hover:opacity-100"
          loading="lazy"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-full border border-white/10 bg-black/80 p-4 shadow-xl backdrop-blur-md transition-all duration-300">
            <Play className="ml-1 h-6 w-6 fill-white text-white transition-colors" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`youtube-loop-container ${className}`}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
