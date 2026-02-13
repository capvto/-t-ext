import { useEffect, useRef } from "react";
import { clamp } from "../lib/utils";

/**
 * Lightweight inertial scrolling for a scrollable container.
 * - Intercepts wheel and lerps scrollTop toward a target value.
 * - Respects prefers-reduced-motion.
 */
export function useInertialScroll<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    if (reduce) return;

    let raf = 0;
    let target = el.scrollTop;
    let current = el.scrollTop;

    // Heuristic detection: let trackpads (and other high-resolution / momentum
    // devices) use native scrolling, and only smooth classic mouse wheels.
    // This avoids the "floaty" / stuttery feel on macOS trackpads.
    let lastWheelTs = 0;

    const resetToNative = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      target = el.scrollTop;
      current = el.scrollTop;
    };

    const isLikelyTrackpad = (e: WheelEvent) => {
      // Horizontal two-finger scrolling / gestures → let the browser handle it.
      if (Math.abs(e.deltaX) > 0.01) return true;
      // If the wheel reports lines/pages, it's almost certainly a mouse wheel.
      if (e.deltaMode === 1 || e.deltaMode === 2) return false;

      const dy = Math.abs(e.deltaY);
      const now = performance.now();
      const dt = now - lastWheelTs;
      lastWheelTs = now;

      // Trackpads often emit many small, high-frequency deltas (sometimes fractional).
      if (dy === 0) return true;
      if (dy < 18) return true;
      if (dy < 60 && dt < 50) return true;
      if (dy % 1 !== 0 && dy < 120) return true;

      return false;
    };

    const tick = () => {
      const max = el.scrollHeight - el.clientHeight;
      target = clamp(target, 0, Math.max(0, max));
      current += (target - current) * 0.12;
      if (Math.abs(target - current) < 0.5) {
        el.scrollTop = target;
        raf = 0;
        return;
      }
      el.scrollTop = current;
      raf = requestAnimationFrame(tick);
    };

    const onWheel = (e: WheelEvent) => {
      // Allow native pinch zoom / horizontal gestures
      if (e.ctrlKey) return;

      // Let trackpads keep native momentum (fixes weird scrolling on macOS).
      if (isLikelyTrackpad(e)) {
        resetToNative();
        return;
      }

      e.preventDefault();
      // Normalize delta across modes.
      let dy = e.deltaY;
      if (e.deltaMode === 1) dy *= 16; // lines → px (approx)
      if (e.deltaMode === 2) dy *= el.clientHeight; // pages → px

      target += dy;
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const onScroll = () => {
      // Keep targets aligned with native scroll changes (e.g. trackpad).
      if (!raf) {
        target = el.scrollTop;
        current = el.scrollTop;
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("wheel", onWheel as any);
      el.removeEventListener("scroll", onScroll as any);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return ref;
}
