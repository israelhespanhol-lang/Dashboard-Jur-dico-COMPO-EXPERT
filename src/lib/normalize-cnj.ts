const CNJ_DIGITS = 20;

export type NormalizedCNJ = {
  normalized: string;
  formatted: string;
  validStructure: boolean;
};

export function normalizeCNJNumber(value: string): NormalizedCNJ {
  const normalized = value.replace(/\D/g, "");
  const validStructure = normalized.length === CNJ_DIGITS;
  const formatted = validStructure
    ? `${normalized.slice(0, 7)}-${normalized.slice(7, 9)}.${normalized.slice(9, 13)}.${normalized.slice(13, 14)}.${normalized.slice(14, 16)}.${normalized.slice(16)}`
    : value.trim();

  return { normalized, formatted, validStructure };
}
