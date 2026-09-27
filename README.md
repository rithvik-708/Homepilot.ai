# 🏡 Homepilot

**Homepilot** is an intelligent, context-aware smart-home orchestration platform built for the **Alexa+ Hackathon**. It features a modern, type-safe monorepo architecture with an Amazon Bedrock / Ollama powered multi-turn agent loop, a Fastify **Model Context Protocol (MCP)** server, PostgreSQL managed via Drizzle ORM, a Next.js 16 frontend, and Redis for low-latency state.

---

## 🏗️ Monorepo Architecture

The repository is managed as a `pnpm` workspace orchestrated with **Turborepo**:

```
homepilot/
├── apps/
│   ├── mcp-server/                # Fastify MCP Server & Multi-Turn Agent Orchestrator
│   │   ├── src/
│   │   │   ├── agent/             # Multi-Turn Agent Loop & LLM Providers
│   │   │   │   ├── providers/
│   │   │   │   │   ├── BedrockProvider.ts   # Amazon Bedrock (Claude 3.5 Sonnet)
│   │   │   │   │   └── OllamaProvider.ts    # Ollama Local Fallback (Llama 3.2 / 3.1)
│   │   │   │   └── orchestrator.ts          # Core Multi-turn Loop, Telemetry & Guardrails
│   │   │   ├── db/
│   │   │   │   ├── index.ts       # Drizzle PostgreSQL client instance
│   │   │   │   └── schema.ts      # Strictly typed schema & telemetry tables
│   │   │   ├── schemas/
│   │   │   │   └── tools.ts       # 12 Locked MCP Tool definitions
│   │   │   ├── tools/
│   │   │   │   └── dispatcher.ts  # Unified tool execution engine & state store
│   │   │   └── server.ts          # Fastify server with POST /mcp endpoint
│   │   ├── tests/
│   │   │   ├── agent.test.ts      # Agent scenario test suite
│   │   │   └── qa-runner.test.ts  # Comprehensive QA verification suite
│   │   ├── drizzle/               # Generated SQL migrations
│   │   ├── drizzle.config.ts      # Local Drizzle config
│   │   └── tsconfig.json
│   └── web/                       # Next.js 16 Frontend application
│       ├── app/                   # Next.js App Router (layout, page)
│       └── tsconfig.json
├── packages/
│   └── mcp-streamable-http/       # TypeScript library for Streamable HTTP transport
│       ├── src/
│       │   └── index.ts
│       └── tsconfig.json
├── .env                           # Local environment variables
├── .gitignore                     # Git ignore rules
├── drizzle.config.ts              # Root Drizzle configuration for workspace CLI
├── package.json                   # Root package configuration & delegated scripts
├── pnpm-workspace.yaml            # PNPM workspace definition
├── tsconfig.json                  # Root TypeScript workspace configuration
└── turbo.json                     # Turborepo task pipeline (build, lint, dev, db:push)
```

---

## 🚀 Implemented Features

### Phase 1: Monorepo Foundation & MCP Core
- **Monorepo Scaffold:** Established `pnpm-workspace.yaml` and `turbo.json` with pipeline tasks for `build`, `lint`, `dev`, and `db:push`.
- **Database Schema (`Drizzle ORM`):** Strictly typed PostgreSQL schema in [`schema.ts`](file:///c:/Coding%20Stuff/homepilot/apps/mcp-server/src/db/schema.ts):
  - `users` — User profiles and timestamps.
  - `user_preferences` — Extensible JSONB preference store.
  - `devices` — Smart device states, zones, and connectivity.
  - `calendar_events` — Events, routines, and scheduled time ranges.
  - `shopping_items` — Dynamic shopping lists with quantities and units.
  - `media_catalog` — Movie catalog with ratings, genres, and rental pricing.
- **Fastify MCP Gateway:** Fastify server on port `8080` with a `POST /mcp` JSON-RPC handler bridging MCP tools.
- **12 Locked MCP Tools:** Defined in [`tools.ts`](file:///c:/Coding%20Stuff/homepilot/apps/mcp-server/src/schemas/tools.ts):
  `calendar_get_schedule`, `calendar_create_event`, `home_set_environment`, `home_get_state`, `media_launch_playback`, `media_pause_playback`, `shopping_add_item`, `shopping_get_list`, `device_get_info`, `device_reboot`, `user_get_preferences`, `user_update_preferences`.

### Phase 2: Agent Orchestration & Multi-Turn Loop
- **Amazon Bedrock Provider ([`BedrockProvider.ts`](file:///c:/Coding%20Stuff/homepilot/apps/mcp-server/src/agent/providers/BedrockProvider.ts)):**
  - Powered by `@aws-sdk/client-bedrock-runtime` with `ConverseCommand`.
  - Configured for `anthropic.claude-3-5-sonnet-20241022-v2:0`.
  - Automatic conversion of all 12 MCP JSON schemas to Bedrock's native `toolConfig.tools` format.
- **Ollama Local Fallback ([`OllamaProvider.ts`](file:///c:/Coding%20Stuff/homepilot/apps/mcp-server/src/agent/providers/OllamaProvider.ts)):**
  - Connects to local endpoint (`http://127.0.0.1:11434/api/chat`) using `llama3.2:3b` or `llama3.1`.
  - Maps tool-call responses into uniform Bedrock `Message` structures.
- **Unified Tool Dispatcher ([`dispatcher.ts`](file:///c:/Coding%20Stuff/homepilot/apps/mcp-server/src/tools/dispatcher.ts)):**
  - Single source of truth for schema validation (Zod) and state mutations across the Fastify server and agent loop.
- **Multi-Turn Orchestrator Loop ([`orchestrator.ts`](file:///c:/Coding%20Stuff/homepilot/apps/mcp-server/src/agent/orchestrator.ts)):**
  - `Input` → `Intent Analysis` → `Sequential Tool Calls` → `State Mutation` → `Final Summary`.
  - Self-healing error recovery loop for invalid parameters and budget limits.
  - Infinite loop prevention (configurable `maxIterations`, default: 10).
- **Structured Database Telemetry:**
  - `agent_runs` — Tracks `rawPrompt`, `intentDetected`, `bedrockModelId`, `executionStatus`, and `latencyMs`.
  - `agent_tool_calls` — Logs `inputPayload` (JSONB), `outputPayload` (JSONB), and contiguous `executionOrder`.
- **Automated Test Suites ([`tests/`](file:///c:/Coding%20Stuff/homepilot/apps/mcp-server/tests)):**
  - 16 passing unit, integration, and scenario tests covering Movie Night (₹1,500 budget constraint), House Prep (11 AM guest arrival), tool error recovery, and database telemetry.

---

## ⚙️ Environment Configuration

Create or update `.env` in the project root:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/homepilot
AWS_REGION=us-east-1
# AWS_ACCESS_KEY_ID=your-key-here
# AWS_SECRET_ACCESS_KEY=your-secret-here
# OLLAMA_BASE_URL=http://127.0.0.1:11434/api/chat
# OLLAMA_MODEL=llama3.2:3b
```

---

## 💻 CLI Commands & Scripts

### Installation & Builds
```bash
# Install workspace dependencies
pnpm install

# Run type-checking across all packages
pnpm exec tsc --noEmit
# (or: pnpm turbo lint)

# Build all packages with Turborepo
pnpm turbo build
```

### Running Tests
```bash
# Run Vitest test suite across all scenarios
pnpm test
```

### Running Development Servers
```bash
# Start all workspace apps (Fastify MCP on 8080, Next.js on 3000)
pnpm dev

# Or start individually:
pnpm --filter mcp-server dev
pnpm --filter web dev
```

### Database Operations (Drizzle ORM)
```bash
# Check schema consistency
pnpm db:check

# Generate SQL migration files
pnpm db:generate

# Push schema changes directly to Postgres
pnpm db:push

# Launch Drizzle Studio web GUI
pnpm db:studio
```

---

## 🧪 Testing the MCP Gateway Endpoint

With the server running (`pnpm --filter mcp-server dev`), test the `POST /mcp` endpoint:

### PowerShell (Windows)
```powershell
curl.exe -X POST http://localhost:8080/mcp `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer dev-token" `
  -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"home_get_state\",\"arguments\":{\"zoneId\":\"living_room\"}}}'
```

### Bash / Linux / macOS
```bash
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-token" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "home_get_state",
      "arguments": { "zoneId": "living_room" }
    }
  }'
```
