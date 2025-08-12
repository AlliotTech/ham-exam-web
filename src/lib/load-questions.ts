import type { QuestionItem } from "@/types/question";

export type QuestionBank = "A" | "B" | "C";

export function resolveQuestionsUrl(bank?: QuestionBank): string {
  // Prefer static JSON under /questions/ generated at build time.
  const b = bank ? bank : "A";
  return b === "A" || b === "B" || b === "C" ? `/questions/${b}.json` : `/questions/full.json`;
}

export async function bankAvailable(bank: QuestionBank): Promise<boolean> {
  const url = resolveQuestionsUrl(bank);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return false;
  try {
    const data = (await res.json()) as unknown;
    return Array.isArray(data) && data.length > 0;
  } catch {
    return false;
  }
}

export async function loadQuestions(bank?: QuestionBank, opts?: { strict?: boolean }): Promise<QuestionItem[]> {
  const strict = opts?.strict ?? false;
  const url = resolveQuestionsUrl(bank);
  let res = await fetch(url, { cache: "no-store" });
  // Fallback to API if static not available (useful in dev/local)
  if (!res.ok) {
    const apiUrl = bank ? `/api/questions?bank=${bank}` : "/api/questions?bank=A";
    res = await fetch(apiUrl, { cache: "no-store" });
  }
  if (!res.ok) throw new Error("Failed to load questions JSON");
  const data = (await res.json()) as QuestionItem[];
  if (strict && (!Array.isArray(data) || data.length === 0)) {
    throw new Error(`Questions for bank ${bank ?? "default"} empty`);
  }
  return data;
}

export function shuffle<T>(arr: T[], rng = Math.random): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}



