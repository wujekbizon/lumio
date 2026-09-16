import { NextResponse } from "next/server";
import { chatStream } from "@/lib/harness-client";
import { currentProfile } from "@/lib/session";

export async function POST(request: Request) {
  const profile = await currentProfile();
  if (!profile) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json() as { question?: string };
  if (!body.question?.trim() || body.question.length > 4000) return NextResponse.json({ error: "invalid_question" }, { status: 400 });
  try {
    const response = await chatStream(profile, body.question.trim());
    return new Response(response.body, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("Content-Type") ?? "text/event-stream; charset=utf-8", "Cache-Control": "no-cache" },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "chat_failed" }, { status: 502 });
  }
}
