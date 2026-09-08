import { NextResponse } from "next/server";
import { z } from "zod";
import { mapImportedRow, parseSpreadsheet, type ColumnMapping } from "@/lib/importer/spreadsheet";
import { prisma } from "@/lib/prisma";

const mappingSchema = z.record(z.string(), z.string()).default({});

async function readFile(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("Envie um arquivo de planilha.");
  if (file.size > 10 * 1024 * 1024) throw new Error("O arquivo deve ter no máximo 10 MB.");
  const parsed = parseSpreadsheet(Buffer.from(await file.arrayBuffer()), file.name);
  const mapping = mappingSchema.parse(JSON.parse(String(formData.get("mapping") ?? JSON.stringify(parsed.suggestedMapping)))) as ColumnMapping;
  const mappedRows = parsed.rows.map((row) => mapImportedRow(row, mapping)).filter(row => row.client || row.validProcessNumber);
  return { file, parsed, mapping, mappedRows };
}

export async function POST(request: Request) {
  try {
    const { parsed, mapping, mappedRows } = await readFile(request);
    const mode = new URL(request.url).searchParams.get("mode") ?? "preview";
    const invalid = mappedRows.filter((row) => !row.validProcessNumber).length;
    if (mode !== "commit") return NextResponse.json({ mode: "preview", sheetName: parsed.sheetName, columns: parsed.columns, mapping, totalRows: mappedRows.length, invalidProcessNumbers: invalid, preview: mappedRows.slice(0, 20) });
    if (!process.env.DATABASE_URL) return NextResponse.json({ error: "Banco não configurado. Preencha DATABASE_URL e aplique a migration antes de importar definitivamente.", preview: mappedRows.slice(0, 20), totalRows: mappedRows.length }, { status: 503 });
    let imported = 0;
    let updated = 0;
    for (const row of mappedRows) {
      const client = row.client ? await prisma.client.upsert({ where: { id: `import-${row.client.toLowerCase()}` }, update: { name: row.client }, create: { id: `import-${row.client.toLowerCase()}`, name: row.client } }) : undefined;
      const existing = await prisma.process.findUnique({ where: { processNumberNormalized: row.processNumberNormalized } });
      await prisma.process.upsert({ where: { processNumberNormalized: row.processNumberNormalized }, update: { processNumber: row.processNumber, clientId: client?.id, debtorName: row.debtorName || undefined, court: row.court || undefined, currentStatus: row.validProcessNumber ? row.currentStatus || undefined : "INVALID_PROCESS_NUMBER", importedStatus: row.currentStatus || undefined, importedLastMovement: row.importedLastMovement || undefined, importedDate: row.importedDate ? new Date(row.importedDate) : undefined, origin: "PLANILHA" }, create: { processNumber: row.processNumber, processNumberNormalized: row.processNumberNormalized, clientId: client?.id, debtorName: row.debtorName || undefined, court: row.court || undefined, currentStatus: row.validProcessNumber ? row.currentStatus || undefined : "INVALID_PROCESS_NUMBER", importedStatus: row.currentStatus || undefined, importedLastMovement: row.importedLastMovement || undefined, importedDate: row.importedDate ? new Date(row.importedDate) : undefined, origin: "PLANILHA" } });
      existing ? updated++ : imported++;
    }
    return NextResponse.json({ mode: "commit", imported, updated, skipped: 0, invalidProcessNumbers: invalid });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível processar a planilha.";
    const databaseError = message.includes("Can't reach database") || message.includes("P1001") || message.includes("ECONNREFUSED");
    return NextResponse.json({ error: databaseError ? "Banco de dados indisponível. Inicie o PostgreSQL e tente novamente." : message }, { status: databaseError ? 503 : 400 });
  }
}
