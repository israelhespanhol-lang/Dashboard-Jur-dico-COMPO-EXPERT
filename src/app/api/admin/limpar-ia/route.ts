import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

export async function POST() {
  try {
    // Se a chave não existir, retornar erro amigável
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Chave da OpenAI não configurada (OPENAI_API_KEY)." }, { status: 400 });
    }

    // Buscar processos
    // Como o Prisma não suporta filtrar por tamanho de string diretamente, buscamos 100 e filtramos
    const processes = await prisma.process.findMany({
      take: 200,
      orderBy: { createdAt: 'desc' }
    });

    // Identificar processos "sujos" (textos gigantes indicam que veio poluído do Excel)
    const toClean = processes.filter(p => 
      (p.client && p.client.length > 70) || 
      (p.debtorName && p.debtorName.length > 70)
    ).slice(0, 10); // Processar 10 por vez para evitar timeout na Vercel

    if (toClean.length === 0) {
      return NextResponse.json({ message: "Sua base está impecável! Nenhum processo precisa de limpeza.", count: 0 });
    }

    let successCount = 0;

    for (const proc of toClean) {
      const rawText = `
        Número: ${proc.processNumber}
        Cliente (Bruto): ${proc.client}
        Devedor (Bruto): ${proc.debtorName}
        Última movimentação: ${proc.movementDetail || ''}
      `;
      
      try {
        const { object } = await generateObject({
          model: openai('gpt-4o-mini'),
          schema: z.object({
            clientName: z.string().describe("Nome limpo, puro e exato do cliente/autor, sem número do processo, juiz ou CPF/CNPJ."),
            debtorName: z.string().describe("Nome limpo, puro e exato do devedor/réu, sem informações processuais."),
            summary: z.string().describe("Resumo do caso jurídico em 1 ou 2 frases curtas (ex: 'Execução de Título Extrajudicial no valor de R$ X'). Se não houver info, coloque 'Sem informações detalhadas'.")
          }),
          prompt: `Você é um analista de dados jurídicos. O objetivo é higienizar os nomes das partes que vieram bagunçados de uma planilha Excel e extrair um resumo.\n\nDados brutos:\n${rawText}`
        });

        // Atualizar no banco
        await prisma.process.update({
          where: { id: proc.id },
          data: {
            client: object.clientName,
            debtorName: object.debtorName,
            subject: object.summary // Guardamos o resumo da IA no campo subject
          }
        });

        successCount++;
      } catch (err) {
        console.error(`Erro ao processar IA no processo ${proc.processNumber}:`, err);
      }
    }

    return NextResponse.json({ 
      message: `${successCount} processos higienizados com sucesso pela IA!`,
      count: successCount 
    });

  } catch (error: any) {
    console.error("Erro na rota de limpeza IA:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
