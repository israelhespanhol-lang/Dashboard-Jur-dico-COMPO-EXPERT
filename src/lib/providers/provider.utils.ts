import { createHash } from "node:crypto";

export function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function toIsoDate(value: unknown): string | undefined {
  if (!value) return undefined;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 15000): Promise<Response> {
  const signal = AbortSignal.timeout(timeoutMs);
  return fetch(url, { ...init, signal, headers: { Accept: "application/json", ...(init.headers ?? {}) } });
}

export function requireServerEnv(name: string): string | undefined {
  if (typeof window !== "undefined") throw new Error("Providers só podem ser executados no servidor");
  return process.env[name];
}
