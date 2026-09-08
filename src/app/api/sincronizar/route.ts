import { NextResponse } from "next/server";
import { z } from "zod";
import { getProviders } from "@/lib/providers/provider.registry";
import { normalizeCNJNumber } from "@/lib/normalize-cnj";
import { prisma } from "@/lib/prisma";
import type { JudicialCommunication, JudicialMovement } from "@/lib/providers/provider.types";

const requestSchema = z.object({ processNumbers: z.array(z.string().min(1)).min(1).max(500) });

async function persistResults(processNumbers: string[], movements: JudicialMovement[], communications: JudicialCommunication[]) {
  if (!process.env.DATABASE_URL) return { savedMovements: 0, savedCommunications: 0 };
  const processIds = new Map<string, string>();
  for (const processNumber of processNumbers) {
    const normalized = normalizeCNJNumber(processNumber);
    if (!normalized.normalized) continue;
    const process = await prisma.process.upsert({
      where: { processNumberNormalized: normalized.normalized },
      update: { lastSyncAt: new Date(), lastExternalMovementAt: movements.filter((item) => item.processNumber === processNumber).map((item) => item.movementDate ? new Date(item.movementDate) : null).filter(Boolean).sort((a, b) => b!.getTime() - a!.getTime())[0] ?? undefined },
      create: { processNumber: normalized.formatted, processNumberNormalized: normalized.normalized, origin: "SINCRONIZACAO", lastSyncAt: new Date() },
    });
    processIds.set(processNumber, process.id);
  }
  let savedMovements = 0;
  for (const movement of movements) {
    const processId = processIds.get(movement.processNumber);
    if (!processId) continue;
    try {
      await prisma.movement.create({ data: { processId, provider: movement.source, externalId: movement.externalId, movementCode: movement.code, movementName: movement.name, movementDescription: movement.description, movementDate: movement.movementDate ? new Date(movement.movementDate) : undefined, publishedAt: movement.publishedAt ? new Date(movement.publishedAt) : undefined, rawPayload: movement.rawPayload as object, contentHash: movement.contentHash } });
      savedMovements++;
    } catch (error) { if (!(error instanceof Error) || !error.message.includes("Unique constraint")) throw error; }
  }
  let savedCommunications = 0;
  for (const communication of communications) {
    const processId = processIds.get(communication.processNumber);
    if (!processId) continue;
    try {
      await prisma.communication.create({ data: { processId, provider: communication.source, externalId: communication.externalId, type: communication.type, availableAt: communication.availableAt ? new Date(communication.availableAt) : undefined, publishedAt: communication.publishedAt ? new Date(communication.publishedAt) : undefined, description: communication.description, fullText: communication.fullText, rawPayload: communication.rawPayload as object, contentHash: communication.contentHash } });
      savedCommunications++;
    } catch (error) { if (!(error instanceof Error) || !error.message.includes("Unique constraint")) throw error; }
  }
  return { savedMovements, savedCommunications };
}

export async function POST(request: Request) {
  try {
    const input = requestSchema.parse(await request.json());
    const results = await Promise.all(getProviders().map(async (provider) => {
      const movements: unknown[] = [];
      const communications: unknown[] = [];
      const errors: string[] = [];
      for (const processNumber of input.processNumbers) {
        try {
          movements.push(...await provider.getMovements(processNumber));
          communications.push(...await provider.getCommunications(processNumber));
        } catch (error) {
          errors.push(`${processNumber}: ${error instanceof Error ? error.message : "falha desconhecida"}`);
        }
      }
      return { provider: provider.name, movements, communications, errors };
    }));
    const allMovements = results.flatMap((result) => result.movements) as JudicialMovement[];
    const allCommunications = results.flatMap((result) => result.communications) as JudicialCommunication[];
    const persisted = await persistResults(input.processNumbers, allMovements, allCommunications);
    return NextResponse.json({ totalProcesses: input.processNumbers.length, results, persisted, completedAt: new Date().toISOString() });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Entrada inválida", details: error.issues }, { status: 400 });
    return NextResponse.json({ error: "Não foi possível iniciar a sincronização" }, { status: 500 });
  }
}
