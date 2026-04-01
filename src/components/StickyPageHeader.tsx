"use client";

import type { ComponentPropsWithoutRef } from "react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type StickyPageHeaderProps = ComponentPropsWithoutRef<"div">;

export function StickyPageHeader({
  children,
  className,
  ...props
}: StickyPageHeaderProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const updateMetrics = () => {
      const styles = window.getComputedStyle(element);
      const totalSpace = element.offsetHeight + parseFloat(styles.marginBottom);

      element.style.setProperty(
        "--smart-page-header-height",
        `${element.offsetHeight}px`,
      );
      element.style.setProperty(
        "--smart-page-header-margin-bottom",
        styles.marginBottom,
      );
      element.style.setProperty(
        "--smart-page-header-total-space-local",
        `${totalSpace}px`,
      );
      document.documentElement.style.setProperty(
        "--smart-page-header-total-space",
        `${totalSpace}px`,
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
      document.documentElement.style.removeProperty(
        "--smart-page-header-total-space",
      );
      element.style.removeProperty("--smart-page-header-total-space-local");
    };
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "smart-page-header sticky top-(--smart-header-offset,56px) z-30 overflow-hidden",
        className,
      )}
      {...props}
    >
      <div className="smart-page-header__inner">{children}</div>
    </div>
  );
}
