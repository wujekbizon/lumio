import { NextResponse } from "next/server";
import { maxUploadBytes } from "@/lib/config";
import { uploadMaterial } from "@/lib/harness-client";
import { currentProfile } from "@/lib/session";

export async function POST(request: Request) {
  const profile = await currentProfile();
  if (!profile) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const form = await request.formData();
  const value = form.get("file");
  if (!(value instanceof File) || value.size === 0 || value.size > maxUploadBytes()) return NextResponse.json({ error: "invalid_file" }, { status: 400 });
  if (!["application/pdf", "text/plain", "text/markdown"].includes(value.type) && !/\.(pdf|txt|md)$/i.test(value.name)) return NextResponse.json({ error: "unsupported_type" }, { status: 415 });
  console.info("[lumio:materials] upload", { childId: profile.id, fileName: value.name, bytes: value.size });
  try { return NextResponse.json(await uploadMaterial(profile, value), { status: 202 }); } catch (error) { console.error("[lumio:materials] upload_failed", { childId: profile.id, error: error instanceof Error ? error.message : "upload_failed" }); return NextResponse.json({ error: error instanceof Error ? error.message : "upload_failed" }, { status: 502 }); }
}
