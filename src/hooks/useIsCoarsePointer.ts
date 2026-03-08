import { useEffect, useState } from "react";

/**
 * True when the primary input is touch/coarse (most phones/tablets).
 * Used to apply lighter UI/motion variants on mobile.
 */
export function useIsCoarsePointer() {
  const [isCoarse, setIsCoarse] = useState(() => {
    try {
      return window.matchMedia("(pointer: coarse)").matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    let mq: MediaQueryList | null = null;
    try {
      mq = window.matchMedia("(pointer: coarse)");
      const update = () => setIsCoarse(mq?.matches ?? false);
      update();

      if (typeof mq.addEventListener === "function") {
        mq.addEventListener("change", update);
        return () => mq?.removeEventListener("change", update);
      }

      // Safari fallback
      mq.addListener(update);
      return () => mq?.removeListener(update);
    } catch {
      return;
    }
  }, []);

  return isCoarse;
}
