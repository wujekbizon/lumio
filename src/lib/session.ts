import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";
import { profileById, type LumioProfile } from "@/lib/config";

const COOKIE = "lumio_session";
const MAX_AGE_SECONDS = 12 * 60 * 60;

type Session = { childId: string; issuedAt: number };

function secret(): string {
  const value = process.env.LUMIO_SESSION_SECRET;
  if (value && value.length >= 32 && !value.startsWith("<")) return value;
  const directory = process.env.LUMIO_DATA_DIR ?? path.join(process.cwd(), ".data");
  const secretPath = path.join(directory, "session-secret");
  fs.mkdirSync(directory, { recursive: true });
  if (fs.existsSync(secretPath)) return fs.readFileSync(secretPath, "utf8").trim();
  const generated = crypto.randomBytes(32).toString("base64url");
  fs.writeFileSync(secretPath, generated, { encoding: "utf8", mode: 0o600, flag: "wx" });
  return generated;
}

function sign(value: string): string {
  return crypto.createHmac("sha256", secret()).update(value).digest("base64url");
}

function encode(session: Session): string {
  const body = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${body}.${sign(body)}`;
}

function decode(value: string): Session | null {
  const [body, signature] = value.split(".");
  if (!body || !signature || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(sign(body)))) return null;
  try {
    const session = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Session;
    if (!session.childId || Date.now() / 1000 - session.issuedAt > MAX_AGE_SECONDS) return null;
    return session;
  } catch {
    return null;
  }
}

export async function currentProfile(): Promise<LumioProfile | null> {
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value) return null;
  const session = decode(value);
  return session ? profileById(session.childId) ?? null : null;
}

export async function setSession(profile: LumioProfile): Promise<void> {
  (await cookies()).set(COOKIE, encode({ childId: profile.id, issuedAt: Math.floor(Date.now() / 1000) }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE_SECONDS,
    path: "/",
  });
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

export function verifyPin(pin: string, encoded: string): boolean {
  const [algorithm, saltText, hashText] = encoded.split("$");
  if (algorithm !== "scrypt" || !saltText || !hashText) return false;
  const salt = Buffer.from(saltText, "base64url");
  const expected = Buffer.from(hashText, "base64url");
  const actual = crypto.scryptSync(pin, salt, expected.length, { N: 16384, r: 8, p: 1 });
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}
