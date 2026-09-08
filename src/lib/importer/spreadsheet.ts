import * as XLSX from "xlsx";
import { createHash } from "node:crypto";
import { normalizeCNJNumber } from "@/lib/normalize-cnj";

export const IMPORT_FIELDS = ["client", "debtorName", "processNumber", "court", "caseValue", "currentStatus", "judicialReorganization", "importedLastMovement", "importedDate", "notes"] as const;
export type ImportField = typeof IMPORT_FIELDS[number];
export type ColumnMapping = Partial<Record<ImportField, string>>;
export type ImportedRow = Record<string, string>;

const aliases: Record<ImportField, string[]> = {
  client: ["cliente", "client", "empresa", "credor"], debtorName: ["devedor", "devedorname", "debtorname", "executado", "parte passiva"], processNumber: ["processo", "processnumber", "numero processo", "n processo", "cnj"], court: ["tribunal", "comarca", "vara", "juizo", "court", "orgao julgador", "câmara", "camara"], caseValue: ["valor", "casevalue", "valor da causa"], currentStatus: ["situacao", "status", "currentstatus"], judicialReorganization: ["recuperacao judicial", "judicialreorganization", "rj"], importedLastMovement: ["ultima movimentacao", "ultimamovimentacao", "ultimo movimento", "importedlastmovement"], importedDate: ["data", "data movimentacao", "data da movimentacao", "importeddate"], notes: ["observacao", "observacoes", "nota", "notas"],
};

function clean(value: unknown): string { return String(value ?? "").trim(); }
function normalizeHeader(value: string): string { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }

export function suggestMapping(columns: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  for (const field of IMPORT_FIELDS) {
    const match = columns.find((column) => {
      const header = normalizeHeader(column);
      const compactHeader = header.replace(/\s/g, "");
      return aliases[field].some((alias) => header === alias || header.includes(alias) || compactHeader === alias.replace(/\s/g, ""));
    });
    if (match) mapping[field] = match;
  }
  return mapping;
}

export function parseSpreadsheet(buffer: Buffer, filename: string) {
  const extension = filename.toLowerCase().split(".").pop();
  if (!extension || !["xlsx", "xls", "csv"].includes(extension)) throw new Error("Formato inválido. Use .xlsx, .xls ou .csv.");
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true, raw: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error("A planilha não possui uma aba legível.");
  const rows = XLSX.utils.sheet_to_json<ImportedRow>(sheet, { defval: "" });
  const columns = rows.length ? Object.keys(rows[0]) : [];
  if (!columns.length) throw new Error("A planilha está vazia.");
  return { rows, columns, suggestedMapping: suggestMapping(columns), sheetName: workbook.SheetNames[0] };
}

export function mapImportedRow(row: ImportedRow, mapping: ColumnMapping) {
  const value = (field: ImportField) => clean(mapping[field] ? row[mapping[field]!] : "");
  const cnjPattern = /\b\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}\b|\b\d{20}\b/;
  
  let rawClient = value("client");
  let parsedClient = rawClient;
  let parsedCourt = value("court");

  if (rawClient.includes("\n")) {
    const lines = rawClient.split("\n").map(l => l.trim()).filter(Boolean);
    parsedClient = lines[0];
    
    if (!parsedCourt) {
      const courtLine = lines.find(l => /\b(TJ[A-Z]{2}|TRT|TRF|STJ|STF|PJE|SAJ|Esaj|Comarca|Vara)\b/i.test(l) && !cnjPattern.test(l) && l.length < 50);
      if (courtLine) parsedCourt = courtLine;
    }
  }

  const processNumber = value("processNumber") || Object.values(row).map(clean).map((item) => item.match(cnjPattern)?.[0] ?? "").find(Boolean) || "";
  const normalized = normalizeCNJNumber(processNumber);
  const rowKey = createHash("sha256").update(JSON.stringify(row)).digest("hex").slice(0, 12);
  const technicalNumber = normalized.validStructure ? normalized.formatted : `INVALID-${rowKey}`;
  const technicalKey = normalized.validStructure ? normalized.normalized : `invalid_${rowKey}`;
  
  return { client: parsedClient, debtorName: value("debtorName"), processNumber: technicalNumber, processNumberNormalized: technicalKey, validProcessNumber: normalized.validStructure, court: parsedCourt, caseValue: value("caseValue"), currentStatus: value("currentStatus"), judicialReorganization: value("judicialReorganization"), importedLastMovement: value("importedLastMovement"), importedDate: value("importedDate"), notes: value("notes") };
}
