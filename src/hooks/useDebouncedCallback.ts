import { useCallback, useEffect, useRef } from "react";

export function useDebouncedCallback<T extends (...args: any[]) => void>(fn: T, delayMs: number) {
  const fnRef = useRef(fn);
  const tRef = useRef<number | null>(null);

  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  useEffect(() => {
    return () => {
      if (tRef.current) window.clearTimeout(tRef.current);
    };
  }, []);

  return useCallback((...args: Parameters<T>) => {
    if (tRef.current) window.clearTimeout(tRef.current);
    tRef.current = window.setTimeout(() => {
      fnRef.current(...args);
    }, delayMs);
  }, [delayMs]) as T;
}
