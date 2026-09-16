import { NextResponse } from "next/server";
import { profileById } from "@/lib/config";
import { setSession, verifyPin } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { profileId?: string; pin?: string };
    const profile = body.profileId ? profileById(body.profileId) : undefined;
    if (!profile || !body.pin || !verifyPin(body.pin, profile.pinHash)) return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
    await setSession(profile);
    return NextResponse.json({ id: profile.id, displayName: profile.displayName });
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
}
