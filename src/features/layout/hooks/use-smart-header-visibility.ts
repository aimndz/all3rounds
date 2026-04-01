"use client";

import { useEffect, useState } from "react";

const HEADER_HEIGHT = 56;
const TOP_LOCK_SCROLL_Y = 24;
const NAVBAR_HIDE_THRESHOLD = 12;
const SHOW_THRESHOLD = 12;
const BOTTOM_TOLERANCE = 2;
const MOBILE_MEDIA_QUERY = "(max-width: 767px)";

function setHeaderOffset(hidden: boolean) {
  document.documentElement.style.setProperty(
    "--smart-header-offset",
    hidden ? "0px" : `${HEADER_HEIGHT}px`,
  );
}

function setPageHeaderState(hidden: boolean) {
  document.documentElement.dataset.smartPageHeaderState = hidden
    ? "hidden"
    : "expanded";
}

function setPageHeaderTransition(mode: "hide" | "show") {
  document.documentElement.dataset.smartPageHeaderTransition = mode;
}

function getPageHeaderHideThreshold() {
  const totalSpace = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue(
      "--smart-page-header-total-space",
    ),
  );

  if (Number.isNaN(totalSpace) || totalSpace <= 0) {
    return NAVBAR_HIDE_THRESHOLD;
  }

  return NAVBAR_HIDE_THRESHOLD + totalSpace;
}

export function useSmartHeaderVisibility() {
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery =
      typeof window.matchMedia === "function"
        ? window.matchMedia(MOBILE_MEDIA_QUERY)
        : null;
    let previousScrollY = window.scrollY;
    let accumulatedDelta = 0;
    let navbarHidden = false;
    let pageHeaderHidden = false;
    let ticking = false;

    const resetHeader = () => {
      accumulatedDelta = 0;
      navbarHidden = false;
      pageHeaderHidden = false;
      setIsHidden(false);
      setHeaderOffset(false);
      setPageHeaderTransition("show");
      setPageHeaderState(false);
    };

    const applyDesktopState = () => {
      previousScrollY = window.scrollY;
      resetHeader();
    };

    if (!mediaQuery?.matches) {
      applyDesktopState();
    } else {
      setHeaderOffset(false);
      setPageHeaderState(false);
    }

    const updateVisibility = () => {
      if (!mediaQuery?.matches) {
        applyDesktopState();
        ticking = false;
        return;
      }

      const currentScrollY = window.scrollY;
      const maxScrollY =
        document.documentElement.scrollHeight - window.innerHeight;
      const isNearBottom =
        maxScrollY > 0 && currentScrollY >= maxScrollY - BOTTOM_TOLERANCE;
      const delta = currentScrollY - previousScrollY;
      const pageHeaderHideThreshold = getPageHeaderHideThreshold();

      if (currentScrollY <= TOP_LOCK_SCROLL_Y) {
        resetHeader();
        previousScrollY = currentScrollY;
        ticking = false;
        return;
      }

      if (delta > 0) {
        accumulatedDelta = Math.max(0, accumulatedDelta + delta);

        if (
          !navbarHidden &&
          (accumulatedDelta >= NAVBAR_HIDE_THRESHOLD || isNearBottom)
        ) {
          navbarHidden = true;
          setIsHidden(true);
          setHeaderOffset(true);
        }

        if (
          navbarHidden &&
          !pageHeaderHidden &&
          (accumulatedDelta >= pageHeaderHideThreshold || isNearBottom)
        ) {
          pageHeaderHidden = true;
          setPageHeaderTransition("hide");
          setPageHeaderState(true);
        }
      } else if (delta < 0) {
        accumulatedDelta = Math.min(0, accumulatedDelta + delta);

        if (accumulatedDelta <= -SHOW_THRESHOLD) {
          navbarHidden = false;
          pageHeaderHidden = false;
          setIsHidden(false);
          setHeaderOffset(false);
          setPageHeaderTransition("show");
          setPageHeaderState(false);
          accumulatedDelta = 0;
        }
      }

      previousScrollY = currentScrollY;
      ticking = false;
    };

    const handleScroll = () => {
      if (!mediaQuery?.matches) return;
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(updateVisibility);
    };

    const handleMediaChange = () => {
      previousScrollY = window.scrollY;
      if (!mediaQuery?.matches) {
        applyDesktopState();
      } else {
        resetHeader();
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    mediaQuery?.addEventListener("change", handleMediaChange);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      mediaQuery?.removeEventListener("change", handleMediaChange);
      document.documentElement.style.removeProperty("--smart-header-offset");
      delete document.documentElement.dataset.smartPageHeaderState;
      delete document.documentElement.dataset.smartPageHeaderTransition;
    };
  }, []);

  return { isHidden };
}
