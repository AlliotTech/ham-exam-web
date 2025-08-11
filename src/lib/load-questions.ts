import type { QuestionItem } from "@/types/question";

export async function loadQuestions(): Promise<QuestionItem[]> {
  const res = await fetch("/questions.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load questions.json");
  const data = (await res.json()) as QuestionItem[];
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



