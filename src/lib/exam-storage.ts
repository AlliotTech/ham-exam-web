import type { QuestionBank } from "@/lib/load-questions";
import type { QuestionItem } from "@/types/question";
import type { QuestionVersionId } from "@/types/question-bank";

export type ExamSavedState = {
  version: 2; // 升级版本号以支持版本信息
  bank: QuestionBank;
  versionId?: QuestionVersionId; // 新增版本ID字段，向后兼容
  timestamp: number;
  endAtMs: number; // absolute epoch ms when the exam should end
  index: number; // current position
  // Answers and flags are stored by position to avoid key-strategy drift
  answersByPosition: (string[] | null)[];
  flagsByPosition: boolean[];
  total: number; // number of questions in the picked set
  // To reconstruct the exact picked question set deterministically
  questionIds?: (string | null)[]; // prefer QuestionItem.id (or codes.J)
  questionsSnapshot?: QuestionItem[]; // fallback snapshot for resiliency
};

function storageKey(bank: string | null, versionId?: string): string {
  // 如果有版本信息，将其包含在key中
  if (versionId) {
    return `exam:savedState:${versionId}:${bank ?? "default"}`;
  }
  // 向后兼容：没有版本信息的旧key
  return `exam:savedState:${bank ?? "default"}`;
}

// 保留原有函数以确保向后兼容性
export function loadExamSavedState(bank: string | null): ExamSavedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(bank));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ExamSavedState;
    if (!parsed || (parsed.version < 1 || parsed.version > 2)) return null;
    // ignore expired exam (time's up)
    if (!parsed.endAtMs || parsed.endAtMs <= Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

// 新增支持版本的函数
export function loadExamSavedStateWithVersion(
  bank: string | null,
  versionId?: QuestionVersionId
): ExamSavedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(bank, versionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ExamSavedState;
    if (!parsed || (parsed.version < 1 || parsed.version > 2)) return null;
    // ignore expired exam (time's up)
    if (!parsed.endAtMs || parsed.endAtMs <= Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

// 保留原有函数以确保向后兼容性
export function saveExamState(state: ExamSavedState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(state.bank, state.versionId), JSON.stringify(state));
  } catch {
    // ignore
  }
}

// 保留原有函数以确保向后兼容性
export function clearExamSavedState(bank: string | null): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storageKey(bank));
  } catch {
    // ignore
  }
}

// 新增支持版本的函数
export function clearExamSavedStateWithVersion(bank: string | null, versionId?: QuestionVersionId): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storageKey(bank, versionId));
  } catch {
    // ignore
  }
}

export function shouldResumeExam(saved: ExamSavedState): boolean {
  const now = Date.now();
  if (saved.endAtMs <= now) return false;
  const answeredCount = (saved.answersByPosition || []).filter(Boolean).length;
  if (answeredCount < 1 && saved.index <= 0) return false; // nothing meaningful to resume
  if (saved.total <= 0) return false;
  return true;
}


