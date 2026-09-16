import { z } from "zod";

const profileSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  pinHash: z.string().min(1),
  libraryId: z.string().min(1).optional(),
});

export type LumioProfile = z.infer<typeof profileSchema>;

export function profiles(): LumioProfile[] {
  const raw = process.env.LUMIO_CHILD_PROFILES_JSON;
  if (!raw) return [];
  const value: unknown = JSON.parse(raw.replaceAll("\\$", "$").replaceAll("\\\"", "\""));
  return z.array(profileSchema).parse(value);
}

export function profileById(id: string): LumioProfile | undefined {
  return profiles().find((profile) => profile.id === id);
}

export function libraryId(profile: LumioProfile): string {
  return profile.libraryId ?? process.env.LUMIO_SHARED_CORPUS_ID ?? "lumio-shared-knowledge";
}

export function sharedCorpusId(): string {
  return process.env.LUMIO_SHARED_CORPUS_ID ?? "lumio-shared-knowledge";
}

export function maxUploadBytes(): number {
  const megabytes = Number(process.env.LUMIO_MAX_UPLOAD_MB ?? "20");
  return Math.max(1, Math.min(megabytes, 100)) * 1024 * 1024;
}
