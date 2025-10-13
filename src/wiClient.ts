import "dotenv/config";
import { GraphQLClient, ClientError } from "graphql-request";

export class WiClient {
  private client: GraphQLClient;
  private token: string;

  constructor() {
    const endpoint = process.env.WI_GRAPHQL_ENDPOINT ?? "https://api.wildlifeinsights.org/graphql";
    this.token = process.env.WI_BEARER_TOKEN ?? "";
    const ua = process.env.WI_USER_AGENT ?? "wi-mcp/0.2.1";
    const timeoutMs = Number(process.env.WI_TIMEOUT_MS ?? 60000);
    this.client = new GraphQLClient(endpoint, {
      headers: { Authorization: this.token ? `Bearer ${this.token}` : "", "User-Agent": ua },
      // @ts-expect-error for undici
      timeout: timeoutMs,
    });
  }

  setToken(token: string) {
    this.token = token;
    const existing = (this.client as any).options?.headers ?? {};
    (this.client as any).setHeaders({ ...existing, Authorization: token ? `Bearer ${token}` : "" });
  }

  async exec<T = any>(query: string, variables: any = {}, operationName?: string, perCallToken?: string): Promise<T> {
    try {
      const headers = perCallToken ? { Authorization: `Bearer ${perCallToken}` } : undefined;
      return await this.client.request<T>(query, variables, { ...(headers ?? {}), "x-operation-name": operationName ?? "" });
    } catch (err) {
      if (err instanceof ClientError) {
        const { response } = err;
        throw new Error(`GraphQL error: ${response.status} ${JSON.stringify(response.errors ?? [])}`);
      }
      throw err;
    }
  }
}
