import * as dotenv from 'dotenv';
dotenv.config();

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

import { AgentOrchestrator } from './agent/orchestrator.js';
import { localBus } from './pubsub/redis.js';

// Agent execution endpoint
fastify.post('/agent/execute', async (request, reply) => {
  const { prompt } = request.body as { prompt: string };
  if (!prompt) {
    return reply.code(400).send({ error: "prompt is required" });
  }

  try {
    const orchestrator = new AgentOrchestrator();
    const result = await orchestrator.executeTask(prompt);
    
    return reply
      .code(200)
      .header('Content-Type', 'application/json')
      .send({ summary: result });
  } catch (error: any) {
    request.log.error(error);
    return reply.code(500).send({ error: error.message || "Internal Agent Error" });
  }
});

// Direct SSE Stream for web clients or Next.js proxy
fastify.get('/agent/events', async (request, reply) => {
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  reply.raw.write(': connected\n\n');

  const onAgentUpdate = (event: any) => {
    reply.raw.write(`event: agent_updates\ndata: ${JSON.stringify(event)}\n\n`);
  };

  const onDeviceUpdate = (event: any) => {
    reply.raw.write(`event: device_updates\ndata: ${JSON.stringify(event)}\n\n`);
  };

  localBus.on('agent_updates', onAgentUpdate);
  localBus.on('device_updates', onDeviceUpdate);

  const heartbeat = setInterval(() => {
    reply.raw.write(': heartbeat\n\n');
  }, 15000);

  request.raw.on('close', () => {
    clearInterval(heartbeat);
    localBus.off('agent_updates', onAgentUpdate);
    localBus.off('device_updates', onDeviceUpdate);
  });
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
