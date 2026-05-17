"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

type HomeStat = {
  label: string;
  value: number;
  format: (value: number) => string;
};

const HOME_STATS: HomeStat[] = [
  {
    label: "Emcees",
    value: 400,
    format: (value) => `${value.toLocaleString()}+`,
  },
  {
    label: "Battles",
    value: 1300,
    format: (value) => `${value.toLocaleString()}+`,
  },
  {
    label: "Lines",
    value: 500000,
    format: (value) => `${Math.round(value / 1000).toLocaleString()}k+`,
  },
];

const ANIMATION_DURATION_MS = 850;
const START_RATIO = 0.72;

function easeOutExpo(progress: number) {
  if (progress === 1) {
    return 1;
  }

  return 1 - Math.pow(2, -10 * progress);
}

const START_VALUES = HOME_STATS.map((stat) =>
  Math.round(stat.value * START_RATIO),
);

export default function HomeStats() {
  const prefersReducedMotion = useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") {
        return () => {};
      }

      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      mediaQuery.addEventListener("change", onStoreChange);
      return () => {
        mediaQuery.removeEventListener("change", onStoreChange);
      };
    },
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
  const [displayValues, setDisplayValues] = useState<number[]>(
    START_VALUES,
  );

  useEffect(() => {
    if (typeof window === "undefined" || prefersReducedMotion) {
      return;
    }

    let animationFrameId = 0;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / ANIMATION_DURATION_MS, 1);
      const easedProgress = easeOutExpo(progress);

      setDisplayValues(
        HOME_STATS.map((stat, index) => {
          const startValue = START_VALUES[index] ?? 0;
          const delta = stat.value - startValue;
          return Math.round(startValue + delta * easedProgress);
        }),
      );

      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(tick);
      }
    };

    animationFrameId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [prefersReducedMotion]);

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-6 sm:gap-x-12">
      {HOME_STATS.map((stat, index) => (
        <div key={stat.label} className="contents">
          {index > 0 && <div className="bg-border hidden h-8 w-px sm:block" />}
          <div className="flex flex-col items-center gap-1">
            <span className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
              {stat.format(
                prefersReducedMotion
                  ? stat.value
                  : (displayValues[index] ?? 0),
              )}
            </span>
            <span className="text-muted-foreground/60 text-[10px] font-bold tracking-[0.2em] uppercase">
              {stat.label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
