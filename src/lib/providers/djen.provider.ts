import { JudicialCommunication, JudicialMovement, JudicialProvider, ProviderHealth } from "./provider.types";
import { fetchWithTimeout, sha256, toIsoDate } from "./provider.utils";

export class DJENProvider implements JudicialProvider {
  readonly name = "DJEN";
  private readonly baseUrl = process.env.DJEN_BASE_URL || "https://comunicaapi.pje.jus.br/api/v1";

  async healthCheck(): Promise<ProviderHealth> {
    try {
      const url = new URL(`${this.baseUrl}/comunicacao`);
      url.searchParams.set("siglaTribunal", process.env.DJEN_HEALTH_COURT ?? "TJCE");
      url.searchParams.set("pagina", "1");
      url.searchParams.set("itensPorPagina", "5");
      url.searchParams.set("meio", "D");
      const response = await fetchWithTimeout(url.toString(), {}, 10000);
      return { provider: this.name, status: response.ok ? "operational" : "unavailable", checkedAt: new Date().toISOString(), message: response.ok ? undefined : response.status === 429 ? "Limite de requisições atingido; aguarde 1 minuto" : `HTTP ${response.status}` };
    } catch { return { provider: this.name, status: "unavailable", checkedAt: new Date().toISOString(), message: "Fonte temporariamente indisponível" }; }
  }

  async getMovements(_processNumber: string): Promise<JudicialMovement[]> { return []; }

  async getCommunications(processNumber: string): Promise<JudicialCommunication[]> {
    const url = new URL(`${this.baseUrl}/comunicacao`);
    url.searchParams.set("numeroProcesso", processNumber.replace(/\D/g, ""));
    url.searchParams.set("pagina", "1");
    url.searchParams.set("itensPorPagina", "100");
    url.searchParams.set("meio", "D");
    const response = await fetchWithTimeout(url.toString());
    if (response.status === 429) throw new Error("DJEN atingiu o limite de requisições; aguarde 1 minuto");
    if (!response.ok) throw new Error(`DJEN respondeu HTTP ${response.status}`);
    const data = await response.json() as { items?: Array<Record<string, unknown>> };
    return (data.items ?? []).map((item) => {
      const fullText = String(item.texto ?? "");
      const externalId = item.hash ? String(item.hash) : item.id ? String(item.id) : undefined;
      const publishedAt = item.data_disponibilizacao ?? item.datadisponibilizacao;
      return { externalId, processNumber, type: item.tipoComunicacao ? String(item.tipoComunicacao) : undefined, availableAt: toIsoDate(publishedAt), publishedAt: toIsoDate(publishedAt), description: item.nomeOrgao ? String(item.nomeOrgao) : undefined, fullText, source: this.name, rawPayload: item, contentHash: sha256([processNumber, this.name, externalId, fullText, publishedAt].join("|")) };
    });
  }
}
