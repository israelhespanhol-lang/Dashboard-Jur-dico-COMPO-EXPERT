import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE() {
  try {
    // Apagar na ordem correta das dependências (filhos primeiro)
    await prisma.processReview.deleteMany();
    await prisma.alert.deleteMany();
    await prisma.internalAction.deleteMany();
    await prisma.communication.deleteMany();
    await prisma.movement.deleteMany();
    await prisma.process.deleteMany();
    await prisma.client.deleteMany();
    // Você também pode adicionar await prisma.syncRun.deleteMany() se quiser limpar o histórico de sincronização.

    return NextResponse.json({ success: true, message: "Banco de dados limpo com sucesso." });
  } catch (error) {
    console.error("Erro ao limpar banco:", error);
    return NextResponse.json({ error: "Não foi possível limpar o banco de dados." }, { status: 500 });
  }
}
