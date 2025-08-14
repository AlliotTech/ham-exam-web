import type { QuestionItem } from "@/types/question";
import { arraysEqual, sorted } from "@/lib/utils";

export type GetKeyFn = (q: QuestionItem | undefined, pos: number) => string;

export function calculateScore(
  questions: QuestionItem[],
  answers: Record<string, string[]>,
  getKeyByStrategy: GetKeyFn,
): { correct: number; total: number } {
  let correct = 0;
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const key = getKeyByStrategy(q, i);
    const s = answers[key] ?? [];
    if (arraysEqual(sorted(s), sorted(q.answer_keys))) correct += 1;
  }
  return { correct, total: questions.length };
}

export function isPassed(correct: number, passLine: number): boolean {
  return correct >= passLine;
}


