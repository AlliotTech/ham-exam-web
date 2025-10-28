import type { QuestionBank } from "@/lib/load-questions";
import type { QuestionVersionId } from "@/types/question-bank";

export type SavedState = {
  version: 2; // 升级版本号以支持版本信息
  bank: QuestionBank;
  versionId?: QuestionVersionId; // 新增版本ID字段，向后兼容
  timestamp: number;
  index: number;
  order: "sequential" | "random";
  showAnswer: boolean;
  showExplanation?: boolean;
  orderIndices: number[];
  answersByPosition: (string[] | null)[];
  total: number;
};

// ---------- Local persistence helpers ----------
function storageKey(bank: string | null, versionId?: string): string {
  // 如果有版本信息，将其包含在key中
  if (versionId) {
    return `practice:${versionId}:${bank ?? "default"}`;
  }
  // 向后兼容：没有版本信息的旧key
  return `practice:${bank ?? "default"}`;
}

// 保留原有函数以确保向后兼容性
export function loadSavedState(bank: string | null): SavedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(bank));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedState;
    if (parsed && (parsed.version >= 1 && parsed.version <= 2)) return parsed;
    return null;
  } catch {
    return null;
  }
}

// 新增支持版本的函数
export function loadSavedStateWithVersion(bank: string | null, versionId?: QuestionVersionId): SavedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(bank, versionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedState;
    if (parsed && (parsed.version >= 1 && parsed.version <= 2)) return parsed;
    return null;
  } catch {
    return null;
  }
}

// 保存练习状态（已支持版本ID）
export function saveState(state: SavedState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(state.bank, state.versionId), JSON.stringify(state));
  } catch {
    // ignore
  }
}

// 保留原有函数以确保向后兼容性
export function clearSavedState(bank: string | null) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storageKey(bank));
  } catch {
    // ignore
  }
}

// 新增支持版本的函数
export function clearSavedStateWithVersion(bank: string | null, versionId?: QuestionVersionId) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storageKey(bank, versionId));
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
function noResumeKey(bank: string | null, versionId?: string): string {
  // 如果有版本信息，将其包含在key中
  if (versionId) {
    return `practice:noResumePrompt:${versionId}:${bank ?? "default"}`;
  }
  // 向后兼容：没有版本信息的旧key
  return `practice:noResumePrompt:${bank ?? "default"}`;
}

// 保留原有函数以确保向后兼容性
export function loadNoResume(bank: string | null): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(noResumeKey(bank)) === "1";
  } catch {
    return false;
  }
}

// 新增支持版本的函数
export function loadNoResumeWithVersion(bank: string | null, versionId?: QuestionVersionId): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(noResumeKey(bank, versionId)) === "1";
  } catch {
    return false;
  }
}

// 保留原有函数以确保向后兼容性
export function saveNoResume(bank: string | null, value: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (value) window.localStorage.setItem(noResumeKey(bank), "1");
    else window.localStorage.removeItem(noResumeKey(bank));
  } catch {
    // ignore
  }
}

// 新增支持版本的函数
export function saveNoResumeWithVersion(bank: string | null, value: boolean, versionId?: QuestionVersionId) {
  if (typeof window === "undefined") return;
  try {
    if (value) window.localStorage.setItem(noResumeKey(bank, versionId), "1");
    else window.localStorage.removeItem(noResumeKey(bank, versionId));
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
