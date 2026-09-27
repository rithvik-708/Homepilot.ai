import Fastify from 'fastify';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { MCP_TOOLS } from './schemas/tools.js';

const fastify = Fastify({ logger: true });

// Core MCP Server initialization
const mcpServer = new Server({
  name: "homepilot-mcp",
  version: "1.0.0"
}, {
  capabilities: {
    tools: {}
  }
});

// Setup tool handling based on your 12 locked contracts
mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  // Day 3-4 implementation logic will inject here
  switch (name) {
    case "home_get_state":
      return { content: [{ type: "text", text: `Mock state for ${(args as any).zoneId}` }] };
    default:
      throw new Error(`Tool ${name} not implemented`);
  }
});

// Streamable HTTP Endpoint (Spec: 2025-11-25)
fastify.post('/mcp', async (request, reply) => {
  // 1. Verify OAuth 2.1 / Bearer Token (Phase 4 requirement)
  const authHeader = request.headers.authorization;
  if (!authHeader) return reply.code(401).send({ error: "Unauthorized" });

  // 2. Parse JSON-RPC payload
  const rpcMessage = request.body;
  
  try {
    // Note: The custom open-source package @homepilot/mcp-streamable-http 
    // will eventually handle this exact bridge. 
    // For Day 1, we simulate the transport response execution.
    const result = await (mcpServer as any).handleMessage(rpcMessage as any);
    
    return reply
      .code(200)
      .header('Content-Type', 'application/json')
      .send(result);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: "Internal MCP Server Error" });
  }
});

const start = async () => {
  try {
    await fastify.listen({ port: 8080, host: '0.0.0.0' });
    console.log(`[Homepilot MCP] Server listening on port 8080`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
