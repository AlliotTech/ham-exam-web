import { useEffect, useState } from "react";

export function useCountdown(endAtMs: number | null, onElapsed?: () => void): number {
  const [remainingMs, setRemainingMs] = useState<number>(0);

  useEffect(() => {
    if (!endAtMs) return;
    const id = window.setInterval(() => {
      const left = Math.max(0, endAtMs - Date.now());
      setRemainingMs(left);
      if (left <= 0) {
        window.clearInterval(id);
        onElapsed?.();
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [endAtMs, onElapsed]);

  return remainingMs;
}
