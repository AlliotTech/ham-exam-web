import type { QuestionItem } from "@/types/question";
import type { QuestionVersionId, QuestionBankType } from "@/types/question-bank";
import { questionBankManager } from "@/lib/question-bank-manager";

export type { QuestionItem };

export type QuestionBank = "A" | "B" | "C";

// 保留原有函数以确保向后兼容性
export function resolveQuestionsUrl(bank?: QuestionBank): string {
  // Prefer static JSON under /questions/ generated at build time.
  const b = bank ? bank : "A";
  return b === "A" || b === "B" || b === "C" ? `/questions/${b}.json` : `/questions/full.json`;
}

// 新增支持版本的函数
export async function resolveQuestionsUrlWithVersion(
  versionId: QuestionVersionId | undefined,
  bank: QuestionBankType
): Promise<string> {
  // 如果没有指定版本，使用默认逻辑（向后兼容）
  if (!versionId) {
    return resolveQuestionsUrl(bank);
  }

  try {
    return await questionBankManager.resolveQuestionsUrl(versionId, bank);
  } catch (error) {
    // 如果版本不存在，回退到默认逻辑
    console.warn(`Version ${versionId} not found, falling back to default:`, error);
    return resolveQuestionsUrl(bank);
  }
}

// 保留原有函数以确保向后兼容性
export async function bankAvailable(bank: QuestionBank): Promise<boolean> {
  const url = resolveQuestionsUrl(bank);
  const res = await fetch(url, { cache: "force-cache" });
  if (!res.ok) return false;
  try {
    const data = (await res.json()) as unknown;
    return Array.isArray(data) && data.length > 0;
  } catch {
    return false;
  }
}

// 新增支持版本的函数
export async function bankAvailableWithVersion(
  versionId: QuestionVersionId | undefined,
  bank: QuestionBankType
): Promise<boolean> {
  // 如果没有指定版本，使用默认逻辑（向后兼容）
  if (!versionId) {
    return await bankAvailable(bank);
  }

  try {
    return await questionBankManager.checkBankAvailable(versionId, bank);
  } catch (error) {
    // 如果版本不存在，回退到默认逻辑
    console.warn(`Version ${versionId} not found, falling back to default:`, error);
    return await bankAvailable(bank);
  }
}

// 保留原有函数以确保向后兼容性
export async function loadQuestions(
  bank?: QuestionBank,
  opts?: { strict?: boolean },
): Promise<QuestionItem[]> {
  const strict = opts?.strict ?? false;
  const url = resolveQuestionsUrl(bank);
  const res = await fetch(url, { cache: "force-cache" });
  if (!res.ok) throw new Error("Failed to load questions JSON");
  const data = (await res.json()) as QuestionItem[];
  if (strict && (!Array.isArray(data) || data.length === 0)) {
    throw new Error(`Questions for bank ${bank ?? "default"} empty`);
  }
  return data;
}

// 新增支持版本的函数
export async function loadQuestionsWithVersion(
  versionId: QuestionVersionId | undefined,
  bank: QuestionBankType,
  opts?: { strict?: boolean },
): Promise<QuestionItem[]> {
  const strict = opts?.strict ?? false;
  const url = await resolveQuestionsUrlWithVersion(versionId, bank);
  const res = await fetch(url, { cache: "force-cache" });
  if (!res.ok) throw new Error("Failed to load questions JSON");
  const data = (await res.json()) as QuestionItem[];
  if (strict && (!Array.isArray(data) || data.length === 0)) {
    throw new Error(`Questions for bank ${bank} (version ${versionId || 'default'}) empty`);
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
