import { promises as fs } from "fs";
import path from "path";
import type { QuestionItem } from "@/types/question";

// Prefer env var for portability; fallback to known absolute path in this workspace
export function datasetDir(): string {
  return process.env.DATASET_DIR || "/Users/alliot/Downloads/tmp/crac-amateur-radio-exam-questions-2025-csv";
}

// Minimal RFC4180 CSV parser supporting quotes and commas inside quotes
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let i = 0;
  const len = text.length;
  let current: string[] = [];
  let field = "";
  let inQuotes = false;
  while (i < len) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        const next = text[i + 1];
        if (next === '"') {
          field += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
          i += 1;
          continue;
        }
      } else {
        field += char;
        i += 1;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i += 1;
        continue;
      }
      if (char === ",") {
        current.push(field);
        field = "";
        i += 1;
        continue;
      }
      if (char === "\n") {
        current.push(field);
        rows.push(current);
        current = [];
        field = "";
        i += 1;
        continue;
      }
      if (char === "\r") {
        // normalize CRLF -> consume CR; LF will be handled in next loop
        i += 1;
        continue;
      }
      field += char;
      i += 1;
    }
  }
  // flush last field/row
  current.push(field);
  // avoid trailing empty row when file ends with newline
  if (!(current.length === 1 && current[0] === "")) {
    rows.push(current);
  }
  return rows;
}

type HeaderIndex = { [key: string]: number };

function indexHeader(header: string[]): HeaderIndex {
  const map: HeaderIndex = {};
  header.forEach((name, idx) => {
    map[name.trim()] = idx;
  });
  return map;
}

let cachedImageMap: Map<string, string> | null = null;

async function loadImageMap(): Promise<Map<string, string>> {
  if (cachedImageMap) return cachedImageMap;
  const file = path.join(datasetDir(), "images.csv");
  const raw = await fs.readFile(file, "utf8");
  const rows = parseCsv(raw);
  const header = rows.shift() || [];
  const idx = indexHeader(header);
  const jIndex = idx["J"] ?? 0;
  const pIndex = idx["ImagePath"] ?? 1;
  const map = new Map<string, string>();
  for (const r of rows) {
    const j = (r[jIndex] || "").trim();
    const p = (r[pIndex] || "").trim();
    if (j && p) map.set(j, p);
  }
  cachedImageMap = map;
  return map;
}

export async function resolveImagePathByJ(jCode: string): Promise<string | null> {
  const map = await loadImageMap();
  const rel = map.get(jCode);
  if (!rel) return null;
  // only allow images/ prefix
  if (!rel.startsWith("images/")) return null;
  const full = path.join(datasetDir(), rel);
  return full;
}

export async function loadQuestionsFromBank(bank: "A" | "B" | "C" | "full" = "A"): Promise<QuestionItem[]> {
  const filename = bank === "full"
    ? "full.csv"
    : bank === "A"
      ? "class_a.csv"
      : bank === "B"
        ? "class_b.csv"
        : "class_c.csv";
  const file = path.join(datasetDir(), filename);
  const raw = await fs.readFile(file, "utf8");
  const rows = parseCsv(raw);
  if (!rows.length) return [];
  const header = rows.shift()!;
  const idx = indexHeader(header);
  const imageMap = await loadImageMap();

  const questions: QuestionItem[] = [];
  for (const r of rows) {
    if (!r || r.length === 0) continue;
    const j = (r[idx["J"]] ?? "").trim();
    const p = (r[idx["P"]] ?? "").trim();
    const q = (r[idx["Q"]] ?? "").trim();
    const t = (r[idx["T"]] ?? "").trim();
    const a = (r[idx["A"]] ?? "").trim();
    const b = (r[idx["B"]] ?? "").trim();
    const c = (r[idx["C"]] ?? "").trim();
    const d = (r[idx["D"]] ?? "").trim();
    if (!q) continue;
    const options = [
      a ? { key: "A", text: a } : null,
      b ? { key: "B", text: b } : null,
      c ? { key: "C", text: c } : null,
      d ? { key: "D", text: d } : null,
    ].filter(Boolean) as QuestionItem["options"];
    const answer_keys = (t || "").split("").filter((ch) => ch >= "A" && ch <= "Z");
    const type: QuestionItem["type"] = answer_keys.length <= 1 ? "single" : "multiple";
    // Handle multi-J codes: some questions may have two J codes separated by comma
    const primaryJ = j.includes(",") ? j.split(",")[0].trim() : j;
    const imagePath = primaryJ ? imageMap.get(primaryJ) ?? null : null;
    const imageUrl = imagePath ? `/api/images?j=${encodeURIComponent(primaryJ)}` : null;
    questions.push({
      id: j || null,
      codes: { J: j || null, P: p || null },
      question: q,
      options,
      answer_keys,
      type,
      pages: undefined,
      imageUrl,
    });
  }
  return questions;
}


