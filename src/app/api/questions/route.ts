import { NextRequest } from "next/server";
import { loadQuestionsFromBank } from "@/lib/dataset";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const bank = ((searchParams.get("bank") || "A").toUpperCase()) as "A" | "B" | "C" | "FULL";
  if (!["A", "B", "C", "FULL"].includes(bank)) {
    return new Response(JSON.stringify({ error: "invalid bank" }), { status: 400 });
  }
  try {
    const normalized = bank === "FULL" ? "full" : bank;
    const data = await loadQuestionsFromBank(normalized);
    return new Response(JSON.stringify(data), {
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "failed to load questions" }), { status: 500 });
  }
}


