import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

async function main() {
  const server = new McpServer({ name: "wi-graphql-mcp", version: "0.2.1" });

  server.registerTool(
    "whoami",
    {
      title: "Identity Check",
      description: "Return basic info about this server",
      inputSchema: {},
    },
    async () => ({
      content: [
        { type: "text", text: "wi-graphql-mcp v0.2.1" },
        { type: "text", text: `endpoint=${process.env.WI_GRAPHQL_ENDPOINT}` },
      ],
    })
  );

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  await server.connect(serverTransport);

  const client = new Client({ name: "local-runner", version: "0.0.0" });
  await client.connect(clientTransport);

  const result = await client.callTool({ name: "whoami", arguments: {} });
  console.log(JSON.stringify(result, null, 2));

  await client.close();
  await server.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
