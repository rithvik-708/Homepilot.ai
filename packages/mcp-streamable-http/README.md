# `@homepilot/mcp-streamable-http`

This is the reusable library for the Open Source Challenge track that wraps the standard MCP SDK into the specific Streamable HTTP format required by Alexa+.

## Usage

External developers can use this package to host their own Alexa+ compatible MCP servers.

```typescript
import Fastify from 'fastify';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createStreamableHttpTransport } from '@homepilot/mcp-streamable-http';

const fastify = Fastify();
const mcpServer = new Server({ name: 'my-mcp', version: '1.0.0' }, { capabilities: {} });

fastify.post('/mcp', createStreamableHttpTransport({
  mcpServer
}));

fastify.listen({ port: 8080 });
```
