import { useEffect, useState } from "react";

export function useCountdown(endAtMs: number | null, onElapsed?: () => void): number {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!endAtMs) return;
    const id = window.setInterval(() => {
      const now = Date.now();
      setNowMs(now);
      if (now >= endAtMs) {
        window.clearInterval(id);
        onElapsed?.();
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [endAtMs, onElapsed]);

  return endAtMs ? Math.max(0, endAtMs - nowMs) : 0;
}
