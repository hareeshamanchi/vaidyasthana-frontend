import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

/**
 * Resets the scroll position of the window, document, and common layout containers.
 * Instantly snaps to the top without fighting CSS smooth scrolling.
 */
export const resetDocumentScroll = () => {
  if (typeof window === "undefined") return;

  const docEl = document.documentElement;
  const body = document.body;

  // Temporarily bypass CSS smooth-scroll during route transition
  const originalScrollBehavior = docEl ? docEl.style.scrollBehavior : "";
  if (docEl) {
    docEl.style.scrollBehavior = "auto";
  }

  try {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  } catch (e) {
    window.scrollTo(0, 0);
  }

  if (docEl) {
    docEl.scrollTop = 0;
    docEl.scrollLeft = 0;
  }
  if (body) {
    body.scrollTop = 0;
    body.scrollLeft = 0;
  }

  // Reset potential scroll on root and main content wrappers
  const scrollContainers = document.querySelectorAll(
    ".App, main, .main-content, #root, [data-scroll-container]"
  );
  scrollContainers.forEach((container) => {
    if (container && container.scrollTop > 0) {
      container.scrollTop = 0;
    }
  });

  // Restore previous scrollBehavior on the next animation frame
  requestAnimationFrame(() => {
    if (docEl) {
      docEl.style.scrollBehavior = originalScrollBehavior;
    }
  });
};

/**
 * Global ScrollToTop component for React Router.
 * Automatically scrolls to top on route pathname changes.
 * Preserves scroll position on unrelated component re-renders, state changes, and modals.
 * Supports anchor / hash scrolling if a valid hash is present.
 */
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const prevPathnameRef = useRef(null);

  // useLayoutEffect runs synchronously before browser paint
  const useIsomorphicLayoutEffect =
    typeof window !== "undefined" ? useLayoutEffect : useEffect;

  useIsomorphicLayoutEffect(() => {
    // Check if the route pathname actually changed (or initial page mount)
    const pathnameChanged = prevPathnameRef.current !== pathname;
    prevPathnameRef.current = pathname;

    if (!pathnameChanged) {
      // If pathname did not change, check if user clicked an anchor hash on the same page
      if (hash) {
        const targetElement = document.getElementById(hash.replace("#", ""));
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: "smooth" });
        }
      }
      return;
    }

    // Pathname changed: if a hash is targeted, scroll to hash; otherwise snap to top
    if (hash) {
      // Allow slight tick for target DOM element in the new route to mount
      requestAnimationFrame(() => {
        const targetElement = document.getElementById(hash.replace("#", ""));
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: "smooth" });
        } else {
          resetDocumentScroll();
        }
      });
    } else {
      resetDocumentScroll();
      // Double-check on next frame in case async content or images expand layout
      requestAnimationFrame(() => {
        if (
          window.scrollY > 0 ||
          (document.documentElement && document.documentElement.scrollTop > 0)
        ) {
          resetDocumentScroll();
        }
      });
    }
  }, [pathname, hash]);

  return null;
}

export default ScrollToTop;
