import { JudicialCommunication, JudicialMovement, JudicialProvider, ProviderHealth } from "./provider.types";
import { requireServerEnv } from "./provider.utils";

export class DomicilioProvider implements JudicialProvider {
  readonly name = "DOMICILIO";
  private readonly clientId = requireServerEnv("DOMICILIO_CLIENT_ID");
  private readonly clientSecret = requireServerEnv("DOMICILIO_CLIENT_SECRET");

  async healthCheck(): Promise<ProviderHealth> {
    const configured = Boolean(this.clientId && this.clientSecret);
    return { provider: this.name, status: configured ? "not_configured" : "not_configured", checkedAt: new Date().toISOString(), message: configured ? "Adapter preparado; endpoint oficial ainda não habilitado" : "Credenciais oficiais não configuradas" };
  }

  async getMovements(_processNumber: string): Promise<JudicialMovement[]> { return []; }
  async getCommunications(_processNumber: string): Promise<JudicialCommunication[]> { return []; }
}
