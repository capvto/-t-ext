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
      e.preventDefault();
      target += e.deltaY;
      if (!raf) raf = requestAnimationFrame(tick);
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel as any);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return ref;
}
