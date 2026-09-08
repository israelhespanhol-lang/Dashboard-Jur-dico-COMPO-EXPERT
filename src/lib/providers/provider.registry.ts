import { DataJudProvider } from "./datajud.provider";
import { DJENProvider } from "./djen.provider";
import { DomicilioProvider } from "./domicilio.provider";
import { JudicialProvider } from "./provider.types";

export function getProviders(): JudicialProvider[] {
  return [new DataJudProvider(), new DJENProvider(), new DomicilioProvider()];
}

export async function providerHealth() {
  return Promise.all(getProviders().map(async (provider) => {
    try { return await provider.healthCheck(); }
    catch { return { provider: provider.name, status: "unavailable" as const, checkedAt: new Date().toISOString(), message: "Falha isolada no provider" }; }
  }));
}
