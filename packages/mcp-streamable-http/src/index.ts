import { FastifyRequest, FastifyReply } from 'fastify';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

export interface StreamableHttpConfig {
  mcpServer: Server;
  requireAuth?: boolean;
}

export function createStreamableHttpTransport(config: StreamableHttpConfig) {
  return async function mcpTransportHandler(request: FastifyRequest, reply: FastifyReply) {
    // Validate JSON-RPC 2.0 format
    const payload = request.body as any;
    if (!payload || payload.jsonrpc !== "2.0") {
      return reply.code(400).send({ error: "Invalid JSON-RPC 2.0 payload" });
    }

    try {
      // In a real streamable implementation, we configure chunked transfer encoding
      reply.raw.setHeader('Content-Type', 'application/json');
      reply.raw.setHeader('Transfer-Encoding', 'chunked');
      reply.raw.setHeader('X-MCP-Spec-Version', '2025-11-25');

      // Hand off to the core MCP SDK server instance
      const result = await (config.mcpServer as any).handleMessage(payload);
      
      // Send standard response
      return reply.code(200).send(result);
    } catch (error: any) {
      request.log.error("[MCP Transport Error]", error);
      return reply.code(500).send({
        jsonrpc: "2.0",
        id: payload.id || null,
        error: { code: -32603, message: "Internal MCP Server Error" }
      });
    }
  };
}
