/**
 * @homepilot/mcp-streamable-http
 * Streamable HTTP transport implementation for MCP
 */

export interface StreamableHttpOptions {
  endpoint?: string;
  authHeader?: string;
}

export class StreamableHttpTransport {
  constructor(public options: StreamableHttpOptions = {}) {}

  async send(message: unknown): Promise<unknown> {
    return { ok: true, message };
  }
}
