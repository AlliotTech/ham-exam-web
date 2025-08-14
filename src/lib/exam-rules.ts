import type { QuestionBank } from "@/lib/load-questions";

export type ExamRule = {
  total: number;
  singles: number;
  multiples: number;
  minutes: number;
  pass: number;
};

export const RULES: Record<QuestionBank, ExamRule> = {
  A: { total: 40, singles: 32, multiples: 8, minutes: 40, pass: 30 },
  B: { total: 60, singles: 45, multiples: 15, minutes: 60, pass: 45 },
  C: { total: 90, singles: 70, multiples: 20, minutes: 90, pass: 70 },
} as const;

export function getRule(bank: QuestionBank): ExamRule {
  return RULES[bank] ?? RULES.A;
}


