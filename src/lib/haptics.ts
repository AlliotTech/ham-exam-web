// Simple Vibration API wrapper with graceful fallback
// Note: Supported on most Android browsers; iOS Safari may ignore these calls.

export function supportsVibrate(): boolean {
  try {
    return typeof navigator !== "undefined" && typeof (navigator as any).vibrate === "function";
  } catch {
    return false;
  }
}

export function vibrate(pattern: number | number[]): void {
  try {
    if (!supportsVibrate()) return;
    (navigator as any).vibrate(pattern);
  } catch {
    // ignore
  }
}

export const haptics = {
  selection(): void {
    vibrate(12);
  },
  light(): void {
    vibrate(18);
  },
  medium(): void {
    vibrate([12, 30, 12]);
  },
  heavy(): void {
    vibrate([24, 40, 24]);
  },
  success(): void {
    vibrate([18, 35, 18, 35]);
  },
  error(): void {
    vibrate([60, 50, 60]);
  },
};


