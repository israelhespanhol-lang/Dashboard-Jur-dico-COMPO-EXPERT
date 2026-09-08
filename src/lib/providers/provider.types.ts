export type ProviderStatus = "operational" | "not_configured" | "unavailable";

export type JudicialMovement = {
  externalId?: string;
  processNumber: string;
  code?: string;
  name: string;
  description?: string;
  movementDate?: string;
  publishedAt?: string;
  source: string;
  rawPayload?: unknown;
  contentHash: string;
};

export type JudicialCommunication = {
  externalId?: string;
  processNumber: string;
  type?: string;
  availableAt?: string;
  publishedAt?: string;
  description?: string;
  fullText?: string;
  source: string;
  rawPayload?: unknown;
  contentHash: string;
};

export type ProviderHealth = {
  provider: string;
  status: ProviderStatus;
  checkedAt: string;
  message?: string;
};

export interface JudicialProvider {
  readonly name: string;
  healthCheck(): Promise<ProviderHealth>;
  getMovements(processNumber: string): Promise<JudicialMovement[]>;
  getCommunications(processNumber: string): Promise<JudicialCommunication[]>;
}
