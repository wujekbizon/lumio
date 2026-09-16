import crypto from "node:crypto";
import { libraryId, type LumioProfile } from "@/lib/config";

function baseUrl(): string {
  const value = process.env.HARNESS_BASE_URL;
  if (!value) throw new Error("HARNESS_BASE_URL is not configured");
  return value.replace(/\/$/, "");
}

function token(): string {
  const value = process.env.HARNESS_LUMIO_TOKEN;
  if (!value) throw new Error("HARNESS_LUMIO_TOKEN is not configured");
  return value;
}

function mockMode(): boolean {
  return process.env.LUMIO_MOCK_HARNESS === "true";
}

async function request(path: string, profile: LumioProfile, init: RequestInit = {}, requestId = crypto.randomUUID()): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("X-Wesa-Capability-Token", token());
  headers.set("X-Lumio-Child-Id", profile.id);
  headers.set("X-Request-Id", requestId);
  console.info("[lumio:harness] request", { requestId, childId: profile.id, path, baseUrl: baseUrl() });
  return fetch(`${baseUrl()}${path}`, { ...init, headers, cache: "no-store" });
}

export async function harnessHealth(profile: LumioProfile): Promise<unknown> {
  const response = await request("/api/client/v1/lumio/health", profile);
  if (!response.ok) throw new Error(`Harness health failed: ${response.status}`);
  return response.json();
}

export async function uploadMaterial(profile: LumioProfile, file: File): Promise<unknown> {
  if (mockMode()) return { jobId: `mock-${crypto.randomUUID()}`, status: "ready", source: file.name, childId: profile.id };
  const body = new FormData();
  body.set("file", file, file.name);
  body.set("displayName", file.name);
  const targetLibrary = libraryId(profile);
  const requestId = crypto.randomUUID();
  console.info("[lumio:upload] start", { requestId, childId: profile.id, libraryId: targetLibrary, fileName: file.name, bytes: file.size });
  const response = await request(`/api/client/v1/lumio/libraries/${encodeURIComponent(targetLibrary)}/sources`, profile, {
    method: "POST",
    body,
  }, requestId);
  const responseBody = await response.text();
  console.info("[lumio:upload] response", { requestId, status: response.status, body: responseBody.slice(0, 1000) });
  if (!response.ok) throw new Error(`Material upload failed: ${response.status} ${responseBody}`);
  return JSON.parse(responseBody);
}

export async function chat(profile: LumioProfile, question: string): Promise<unknown> {
  if (mockMode()) return { answer: `Tryb testowy. Pytanie zapisane dla profilu ${profile.displayName}: ${question}`, grounding: "mock", citations: [] };
  const response = await request("/api/client/v1/lumio/chat", profile, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, libraryId: libraryId(profile) }),
  });
  if (!response.ok) throw new Error(`Harness chat failed: ${response.status} ${await response.text()}`);
  return response.json();
}

export async function chatStream(profile: LumioProfile, question: string): Promise<Response> {
  if (mockMode()) {
    const payload = JSON.stringify({
      answer: `Tryb testowy. Pytanie zapisane dla profilu ${profile.displayName}: ${question}`,
      grounding: "mock",
      citations: [],
    });
    return new Response(
      `event: progress\ndata: ${JSON.stringify({ stage: "generating", progress: 55, message: "Tryb testowy…" })}\n\n` +
      `event: complete\ndata: ${payload}\n\n`,
      { headers: { "Content-Type": "text/event-stream; charset=utf-8" } },
    );
  }
  const response = await request("/api/client/v1/lumio/chat/stream", profile, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify({ question, libraryId: libraryId(profile) }),
  });
  if (!response.ok) throw new Error(`Harness chat failed: ${response.status} ${await response.text()}`);
  return response;
}
