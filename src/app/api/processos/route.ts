import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function summarizeText(value: string | null | undefined, limit = 140) {
  const text = (value ?? "").replace(/\s+/g, " ").trim();
  if (text.length <= limit) return text;
  const sentence = text.match(/^.{35,}?\.\s/);
  return `${(sentence?.[0] ?? text.slice(0, limit)).trim()}...`;
}

function summarizeStatus(status: string | null) {
  const text = (status ?? "").toLowerCase();
  if (text === "invalid_process_number") return "Revisar";
  if (/intima|intimad|prazo|manifestar|emendar|comprovar|recolher/.test(text)) return "Possível pendência";
  if (/conclus|aguardando|remetid|distribui/.test(text)) return "Aguardando judiciário";
  if (/em dia|regular|cumprid|petição protocolada|manifestação protocolada/.test(text)) return "Em dia";
  return "Revisar";
}

export async function GET() {
  try {
    const processes = await prisma.process.findMany({
      where: { active: true },
      orderBy: { updatedAt: "desc" },
      include: { 
        client: true, 
        movements: { orderBy: { movementDate: "desc" }, take: 5 },
        communications: { orderBy: { publishedAt: "desc" }, take: 5 }
      },
    });
    return NextResponse.json(processes.map((process) => {
      const movement = process.movements[0];
      const movementDetail = movement?.movementDescription ?? process.importedLastMovement ?? "Sem movimentação registrada";
      return { 
        client: process.client?.name ?? "Sem cliente", 
        debtor: process.debtorName ?? "Não informado", 
        number: process.processNumber, 
        court: process.court ?? process.courtAlias ?? "Tribunal não informado", 
        movement: summarizeText(movement?.movementName ?? movementDetail, 72), 
        movementDetail: summarizeText(movementDetail, 600), 
        date: movement?.movementDate?.toISOString() ?? process.importedDate?.toISOString() ?? "", 
        status: summarizeStatus(process.currentStatus), 
        statusDetail: summarizeText(process.currentStatus, 600), 
        owner: "Sem responsável", 
        rj: false,
        recentMovements: process.movements.map(m => ({ date: m.movementDate?.toISOString() ?? "", description: m.movementDescription ?? m.movementName })),
        recentCommunications: process.communications.map(c => ({ date: c.publishedAt?.toISOString() ?? "", description: c.fullText ?? c.description ?? "" }))
      };
    }));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível carregar os processos." }, { status: 503 });
  }
}