/**
 * Type declarations for the YouTube IFrame Player API.
 * @see https://developers.google.com/youtube/iframe_api_reference
 */

declare namespace YT {
  const PlayerState: {
    UNSTARTED: -1;
    ENDED: 0;
    PLAYING: 1;
    PAUSED: 2;
    BUFFERING: 3;
    CUED: 5;
  };

  interface PlayerEvent {
    target: Player;
  }

  interface OnStateChangeEvent extends PlayerEvent {
    data: number;
  }

  interface PlayerOptions {
    videoId?: string;
    width?: number | string;
    height?: number | string;
    playerVars?: {
      playsinline?: number;
      modestbranding?: number;
      rel?: number;
      start?: number;
      end?: number;
      autoplay?: number;
      origin?: string;
      controls?: number;
      loop?: number;
      mute?: number;
      fs?: number;
      iv_load_policy?: number;
      [key: string]: string | number | undefined;
    };
    events?: {
      onReady?: (event: PlayerEvent) => void;
      onStateChange?: (event: OnStateChangeEvent) => void;
      onError?: (event: PlayerEvent) => void;
    };
  }

  class Player {
    constructor(elementId: string | HTMLElement, options: PlayerOptions);
    playVideo(): void;
    pauseVideo(): void;
    seekTo(seconds: number, allowSeekAhead: boolean): void;
    getCurrentTime(): number;
    getDuration(): number;
    getPlayerState(): number;
    destroy(): void;
    loadVideoById(videoId: string, startSeconds?: number): void;
  }
}

interface Window {
  YT?: typeof YT;
  onYouTubeIframeAPIReady?: (() => void) | null;
}
