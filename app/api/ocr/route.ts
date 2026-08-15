import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { ocrExtract } from "@/lib/ai/ocr";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** OCR a scanned page image (base64 data URL) → cleaned text via Groq vision. */
export async function POST(request: Request) {
  const uid = await getSessionUserId();
  if (!uid) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: { image?: unknown };
  try {
    body = (await request.json()) as { image?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (
    typeof body.image !== "string" ||
    !body.image.startsWith("data:image/") ||
    body.image.length === 0
  ) {
    return NextResponse.json({ ok: false, error: "Missing or invalid image." }, { status: 400 });
  }

  try {
    const { text } = await ocrExtract(body.image);
    return NextResponse.json({ ok: true, data: { text } });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: (error as Error).message || "OCR failed" },
      { status: 500 },
    );
  }
}
