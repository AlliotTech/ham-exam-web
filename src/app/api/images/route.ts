import { NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { resolveImagePathByJ } from "@/lib/dataset";

export const runtime = "nodejs";

function resolveContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".gif") return "image/gif";
  if (ext === ".webp") return "image/webp";
  return "application/octet-stream";
}

export async function GET(req: NextRequest): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const j = (searchParams.get("j") || "").trim().toUpperCase();
  if (!j) {
    return new Response(JSON.stringify({ error: "missing j" }), { status: 400 });
  }
  try {
    const absPath = await resolveImagePathByJ(j);
    if (!absPath) {
      return new Response(JSON.stringify({ error: "image not found" }), { status: 404 });
    }
    const data = await fs.readFile(absPath);
    const contentType = resolveContentType(absPath);
    const body = new Uint8Array(data);
    return new Response(body, {
      headers: {
        "content-type": contentType,
        "cache-control": "public, max-age=31536000, immutable",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: "failed to load image" }), { status: 500 });
  }
}


