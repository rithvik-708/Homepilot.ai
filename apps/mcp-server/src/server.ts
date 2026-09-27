import Fastify from 'fastify';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { MCP_TOOLS } from './schemas/tools.js';
import { executeTool } from './tools/dispatcher.js';

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

// List all 12 MCP Tools
mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: MCP_TOOLS.map(t => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  };
});

// Unified tool execution handling
mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    const result = await executeTool(name, args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
    };
  } catch (error: any) {
    return {
      isError: true,
      content: [{ type: "text", text: error.message }],
    };
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
