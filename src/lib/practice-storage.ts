import type { QuestionBank } from "@/lib/load-questions";

export type SavedState = {
  version: 1;
  bank: QuestionBank;
  timestamp: number;
  index: number;
  order: "sequential" | "random";
  showAnswer: boolean;
  orderIndices: number[];
  answersByPosition: (string[] | null)[];
  total: number;
};

// ---------- Local persistence helpers ----------
function storageKey(bank: string | null): string {
  return `practice:${bank ?? "default"}`;
}

export function loadSavedState(bank: string | null): SavedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(bank));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedState;
    if (parsed && parsed.version === 1) return parsed;
    return null;
  } catch {
    return null;
  }
}

export function saveState(state: SavedState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(state.bank), JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function clearSavedState(bank: string | null) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storageKey(bank));
  } catch {
    // ignore
  }
}

// ---------- User preference: last mode ----------
function lastModeKey(): string {
  return "practice:lastMode";
}

export function loadLastMode(): "sequential" | "random" | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(lastModeKey());
    if (v === "sequential" || v === "random") return v;
    return null;
  } catch {
    return null;
  }
}

export function saveLastMode(mode: "sequential" | "random") {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(lastModeKey(), mode);
  } catch {
    // ignore
  }
}

// ---------- Per-bank 'no resume prompt' preference ----------
function noResumeKey(bank: string | null): string {
  return `practice:noResumePrompt:${bank ?? "default"}`;
}

export function loadNoResume(bank: string | null): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(noResumeKey(bank)) === "1";
  } catch {
    return false;
  }
}

export function saveNoResume(bank: string | null, value: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (value) window.localStorage.setItem(noResumeKey(bank), "1");
    else window.localStorage.removeItem(noResumeKey(bank));
  } catch {
    // ignore
  }
}

// ---------- Resume prompt gating ----------
export const RESUME_MIN_ANSWERED = 3;
export const RESUME_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function shouldResume(saved: SavedState): boolean {
  const now = Date.now();
  if (now - saved.timestamp > RESUME_EXPIRY_MS) return false;
  const answeredCount = (saved.answersByPosition || []).filter(Boolean).length;
  if (answeredCount < RESUME_MIN_ANSWERED) return false;
  if (saved.index <= 0) return false;
  if (saved.index >= (saved.total || 0) - 1) return false;
  return true;
}

// ---------- Jump by J code (sequential only) ----------
export function normalizeJ(input: string): string {
  return (input || "").trim().toUpperCase();
}


