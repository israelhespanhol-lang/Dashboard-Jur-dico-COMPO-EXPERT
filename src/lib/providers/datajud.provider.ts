import { normalizeCNJNumber } from "@/lib/normalize-cnj";
import { JudicialCommunication, JudicialMovement, JudicialProvider, ProviderHealth } from "./provider.types";
import { fetchWithTimeout, requireServerEnv, sha256, toIsoDate } from "./provider.utils";

type DataJudMovement = { id?: string; codigo?: string; nome?: string; descricao?: string; dataHora?: string; complemento?: string };
type DataJudHit = { _id?: string; _source?: { numero?: string; movimentos?: DataJudMovement[] } };

export class DataJudProvider implements JudicialProvider {
  readonly name = "DATAJUD";
  private readonly apiKey = requireServerEnv("DATAJUD_API_KEY");
  private readonly baseUrl = process.env.DATAJUD_BASE_URL ?? "https://api-publica.datajud.cnj.jus.br";
  private readonly alias = process.env.DATAJUD_COURT_ALIAS ?? "api_publica_tjce";

  async healthCheck(): Promise<ProviderHealth> {
    if (!this.apiKey) return { provider: this.name, status: "not_configured", checkedAt: new Date().toISOString(), message: "DATAJUD_API_KEY não configurada" };
    try {
      const response = await fetchWithTimeout(`${this.baseUrl}/${this.alias}/_search`, { method: "POST", headers: { Authorization: `APIKey ${this.apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ size: 0 }) }, 10000);
      return { provider: this.name, status: response.ok ? "operational" : "unavailable", checkedAt: new Date().toISOString(), message: response.ok ? undefined : `HTTP ${response.status}` };
    } catch { return { provider: this.name, status: "unavailable", checkedAt: new Date().toISOString(), message: "Fonte temporariamente indisponível" }; }
  }

  private getCourtAliasFromCNJ(cnj: string): string {
    const parts = cnj.split('.');
    if (parts.length >= 5) {
      const j = parts[3]; // Justiça
      const tr = parts[4]; // Tribunal
      
      if (j === '8') { // Justiça Estadual (TJ)
        const ufs: Record<string, string> = {
          '01': 'ac', '02': 'al', '03': 'ap', '04': 'am', '05': 'ba', '06': 'ce',
          '07': 'df', '08': 'es', '09': 'go', '10': 'ma', '11': 'mt', '12': 'ms',
          '13': 'mg', '14': 'pa', '15': 'pb', '16': 'pr', '17': 'pe', '18': 'pi',
          '19': 'rj', '20': 'rn', '21': 'rs', '22': 'ro', '23': 'rr', '24': 'sc',
          '25': 'se', '26': 'sp', '27': 'to'
        };
        const uf = ufs[tr];
        if (uf) return `api_publica_tj${uf}`;
      } else if (j === '5') { // Justiça do Trabalho (TRT)
        return `api_publica_trt${parseInt(tr)}`;
      } else if (j === '4') { // Justiça Federal (TRF)
        return `api_publica_trf${parseInt(tr)}`;
      }
    }
    return this.alias; // Fallback
  }

  async getMovements(processNumber: string): Promise<JudicialMovement[]> {
    if (!this.apiKey) return [];
    const { normalized, validStructure } = normalizeCNJNumber(processNumber);
    if (!validStructure) return [];
    
    const courtAlias = this.getCourtAliasFromCNJ(normalized);
    
    const response = await fetchWithTimeout(`${this.baseUrl}/${courtAlias}/_search`, { method: "POST", headers: { Authorization: `APIKey ${this.apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ size: 1, query: { match: { numero: normalized } } }) });
    if (!response.ok) throw new Error(`DataJud respondeu HTTP ${response.status}`);
    const data = await response.json() as { hits?: { hits?: DataJudHit[] } };
    const source = data.hits?.hits?.[0]?._source;
    return (source?.movimentos ?? []).map((movement) => {
      const description = [movement.descricao, movement.complemento].filter(Boolean).join(" ");
      return { externalId: movement.id, processNumber, code: movement.codigo, name: movement.nome ?? "Movimentação processual", description, movementDate: toIsoDate(movement.dataHora), source: this.name, rawPayload: movement, contentHash: sha256([normalized, this.name, movement.dataHora, movement.codigo, description].join("|")) };
    });
  }

  async getCommunications(_processNumber: string): Promise<JudicialCommunication[]> { return []; }
}
