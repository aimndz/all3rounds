"use client";

import { useEffect, useRef } from "react";
import BetaBanner from "@/components/BetaBanner";
import Header from "@/components/Header";
import { useSmartHeaderVisibility } from "@/features/layout/hooks/use-smart-header-visibility";

export default function TopChrome() {
  const ref = useRef<HTMLDivElement | null>(null);
  const { isHidden } = useSmartHeaderVisibility();

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const updateMetrics = () => {
      document.documentElement.style.setProperty(
        "--smart-header-height",
        `${element.offsetHeight}px`,
      );
    };

    updateMetrics();

    const observer = new ResizeObserver(() => {
      updateMetrics();
    });

    observer.observe(element);
    window.addEventListener("resize", updateMetrics);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateMetrics);
      document.documentElement.style.removeProperty("--smart-header-height");
    };
  }, []);

  return (
    <div ref={ref} className="relative overflow-hidden">
      <div
        className="transform-gpu transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform"
        style={
          isHidden
            ? {
                transform:
                  "translateY(calc(-1 * var(--smart-header-height, 56px) - 0.75rem))",
                pointerEvents: "none",
              }
            : undefined
        }
      >
        <BetaBanner />
        <Header />
      </div>
    </div>
  );
}
