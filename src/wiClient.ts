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
      // Log the GraphQL request for debugging
      console.log(`[WiClient] Executing ${operationName || 'unnamed'} operation`);
      console.log(`[WiClient] Query: ${query.substring(0, 100)}${query.length > 100 ? '...' : ''}`);
      console.log(`[WiClient] Variables:`, JSON.stringify(variables, null, 2));

      const headers = perCallToken ? { Authorization: `Bearer ${perCallToken}` } : undefined;
      const result = await this.client.request<T>(query, variables, { ...(headers ?? {}), "x-operation-name": operationName ?? "" });

      // Log successful response
      console.log(`[WiClient] ${operationName || 'Operation'} completed successfully`);
      console.log(`[WiClient] Response keys:`, Object.keys(result || {}));

      return result;
    } catch (err) {
      if (err instanceof ClientError) {
        const { response } = err;
        console.error(`[WiClient] GraphQL error for ${operationName || 'operation'}:`);
        console.error(`[WiClient] Status: ${response.status}`);
        console.error(`[WiClient] Errors:`, JSON.stringify(response.errors, null, 2));
        throw new Error(`GraphQL error: ${response.status} ${JSON.stringify(response.errors ?? [])}`);
      }
      console.error(`[WiClient] Unexpected error for ${operationName || 'operation'}:`, err);
      throw err;
    }
  }
}
