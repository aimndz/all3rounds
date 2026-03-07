"use client";

import { useEffect, useRef } from "react";

export function useAutoScroll(
  activeLineId: number | undefined,
  editMode: boolean,
  lastClickedLineId: number | null,
) {
  const transcriptContainerRef = useRef<HTMLDivElement>(null);
  const scrollAnimationFrameRef = useRef<number | null>(null);

  // Spotify-style auto-scroll
  useEffect(() => {
    if (!transcriptContainerRef.current || editMode || !activeLineId) return;

    const container = transcriptContainerRef.current;
    const activeEl = container.querySelector(
      `[data-line-id="${activeLineId}"]`,
    ) as HTMLElement;

    if (activeEl) {
      const containerRect = container.getBoundingClientRect();
      const elRect = activeEl.getBoundingClientRect();
      const containerMiddle = containerRect.top + containerRect.height / 2;

      if (elRect.top > containerMiddle) {
        if (scrollAnimationFrameRef.current) {
          cancelAnimationFrame(scrollAnimationFrameRef.current);
        }

        const start = container.scrollTop;
        const targetScrollTop =
          start +
          (elRect.top - containerRect.top) -
          containerRect.height / 2 +
          elRect.height / 2;

        const change = targetScrollTop - start;
        const duration = 700;
        let startTime: number | null = null;

        const animateScroll = (timestamp: number) => {
          if (!startTime) startTime = timestamp;
          const progress = timestamp - startTime;
          const percentage = Math.min(progress / duration, 1);
          const easing = 1 - Math.pow(1 - percentage, 4);

          container.scrollTop = start + change * easing;

          if (progress < duration) {
            scrollAnimationFrameRef.current =
              requestAnimationFrame(animateScroll);
          } else {
            scrollAnimationFrameRef.current = null;
          }
        };

        scrollAnimationFrameRef.current = requestAnimationFrame(animateScroll);
      }
    }

    return () => {
      if (scrollAnimationFrameRef.current) {
        cancelAnimationFrame(scrollAnimationFrameRef.current);
      }
    };
  }, [activeLineId, editMode]);

  // Scroll to last clicked line when entering edit mode
  useEffect(() => {
    if (editMode && lastClickedLineId && transcriptContainerRef.current) {
      const container = transcriptContainerRef.current;
      setTimeout(() => {
        const targetEl = container.querySelector(
          `[data-line-id="${lastClickedLineId}"]`,
        ) as HTMLElement;
        if (targetEl) {
          const containerRect = container.getBoundingClientRect();
          const targetRect = targetEl.getBoundingClientRect();
          const targetScrollTop =
            container.scrollTop +
            (targetRect.top - containerRect.top) -
            containerRect.height / 2 +
            targetRect.height / 2;

          container.scrollTo({
            top: targetScrollTop,
            behavior: "smooth",
          });
        }
      }, 50);
    }
  }, [editMode, lastClickedLineId]);

  return { transcriptContainerRef };
}
