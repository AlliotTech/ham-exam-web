import type { QuestionBank } from "@/lib/load-questions";
import type { QuestionItem } from "@/types/question";

export type ExamSavedState = {
  version: 1;
  bank: QuestionBank;
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

function storageKey(bank: string | null): string {
  return `exam:savedState:${bank ?? "default"}`;
}

export function loadExamSavedState(bank: string | null): ExamSavedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(bank));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ExamSavedState;
    if (!parsed || parsed.version !== 1) return null;
    // ignore expired exam (time's up)
    if (!parsed.endAtMs || parsed.endAtMs <= Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveExamState(state: ExamSavedState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(state.bank), JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function clearExamSavedState(bank: string | null): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storageKey(bank));
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


