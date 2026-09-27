# 🏡 Homepilot

**Homepilot** is an intelligent smart-home orchestration platform built for the **Alexa+ Hackathon**. It features a modern, type-safe monorepo architecture with a Fastify-powered **Model Context Protocol (MCP)** server implementing the Streamable HTTP transport specification, a Next.js 16 frontend, PostgreSQL managed via Drizzle ORM, and Redis for caching.

---

## 🏗️ Architecture & Monorepo Layout

This project is organized as a `pnpm` workspace orchestrated with **Turborepo**:

```
homepilot/
├── apps/
│   ├── mcp-server/                # Fastify MCP Server & Database Gateway
│   │   ├── src/
│   │   │   ├── db/
│   │   │   │   └── schema.ts      # Drizzle ORM PostgreSQL schema
│   │   │   ├── schemas/
│   │   │   │   └── tools.ts       # 12 Locked MCP Tool definitions
│   │   │   └── server.ts          # Fastify server with POST /mcp endpoint
│   │   ├── drizzle/               # Generated SQL migrations
│   │   ├── drizzle.config.ts      # Drizzle ORM config
│   │   └── tsconfig.json
│   └── web/                       # Next.js 16 Frontend application
│       ├── app/                   # Next.js App Router (layout, page)
│       └── tsconfig.json
├── packages/
│   └── mcp-streamable-http/       # Custom TypeScript library for Streamable HTTP transport
│       ├── src/
│       │   └── index.ts
│       └── tsconfig.json
├── .env                           # Local environment configuration
├── .gitignore                     # Git ignore rules
├── drizzle.config.ts              # Root Drizzle configuration for workspace-level CLI
├── package.json                   # Root package definition & delegated scripts
├── pnpm-workspace.yaml            # PNPM workspace definition
└── turbo.json                     # Turborepo task pipeline (build, lint, dev, db:push)
```

---

## 🚀 Phase 1 Implementation Summary

- [x] **Monorepo Scaffold:** Established `pnpm-workspace.yaml` and `turbo.json` with pipeline tasks for `build`, `lint`, `dev`, and `db:push`.
- [x] **Database Schema (`Drizzle ORM`):** Strictly typed PostgreSQL tables in `apps/mcp-server/src/db/schema.ts`:
  - `users` — User identification and timestamps.
  - `user_preferences` — Extensible JSONB user preferences.
  - `devices` — Smart device states, zones, and online status.
  - `calendar_events` — Schedule, time ranges, and routines.
  - `shopping_items` — Dynamic shopping list items with units and prices.
  - `media_catalog` — Movies/shows catalog with ratings, genres, and pricing.
- [x] **Fastify & MCP Core Gateway:** Fastify server running on port `8080` with a `POST /mcp` JSON-RPC handler bridging MCP Server tool execution.
- [x] **12 Locked Tool Schemas:** Defined in `apps/mcp-server/src/schemas/tools.ts`:
  - `calendar_get_schedule`, `calendar_create_event`
  - `home_set_environment`, `home_get_state`
  - `media_launch_playback`, `media_pause_playback`
  - `shopping_add_item`, `shopping_get_list`
  - `device_get_info`, `device_reboot`
  - `user_get_preferences`, `user_update_preferences`
- [x] **Streamable HTTP Library Package:** Initialized `@homepilot/mcp-streamable-http` library structure.

---

## ⚙️ Prerequisites & Environment Setup

- **Node.js**: `v20+` or `v22+`
- **pnpm**: `v9+` or `v12+`
- **PostgreSQL**: Local or hosted database instance

### 1. Configure Environment Variables

Create or update `.env` in the project root:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/homepilot
```

---

## 💻 Getting Started & Commands

### Install Dependencies
```bash
pnpm install
```

### Run Development Servers
Start all workspace apps simultaneously with Turborepo:
```bash
pnpm dev
```

Or run individual apps:
```bash
# Start MCP Server (Port 8080)
pnpm --filter mcp-server dev

# Start Next.js Frontend (Port 3000)
pnpm --filter web dev
```

### Build & Type-Check
```bash
# Run build across all packages
pnpm turbo build

# Run type-checking / linting across all packages
pnpm turbo lint
```

### Database Management (Drizzle ORM)
Run database commands from anywhere in the workspace:
```bash
# Validate schema consistency
pnpm db:check
# (or: pnpm exec drizzle-kit check)

# Generate SQL migration files
pnpm db:generate

# Push schema directly to database
pnpm db:push

# Open Drizzle Studio web GUI
pnpm db:studio
```

---

## 🧪 Testing the MCP Server Endpoint

Start the MCP server with `pnpm --filter mcp-server dev`, then send an MCP JSON-RPC payload:

### PowerShell (Windows)
```powershell
curl.exe -X POST http://localhost:8080/mcp `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer dev-token" `
  -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"initialize\",\"params\":{\"protocolVersion\":\"2025-11-25\",\"capabilities\":{},\"clientInfo\":{\"name\":\"phase1-test\",\"version\":\"1.0.0\"}}}'
```

### Bash / Linux / macOS
```bash
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-token" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2025-11-25",
      "capabilities": {},
      "clientInfo": {
        "name": "phase1-test",
        "version": "1.0.0"
      }
    }
  }'
```

### Call a Tool (`home_get_state`)
```powershell
curl.exe -X POST http://localhost:8080/mcp `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer dev-token" `
  -d '{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"tools/call\",\"params\":{\"name\":\"home_get_state\",\"arguments\":{\"zoneId\":\"living_room\"}}}'
```

---

## 🗺️ Roadmap

- **Phase 1 (Days 1–5):** Monorepo foundation, Fastify MCP server, Drizzle ORM schema, locked tool schemas. *(Completed)*
- **Phase 2:** Complete Next.js 16 Web Dashboard UI & Alexa simulation components.
- **Phase 3:** Full tool execution logic (database queries, IoT device control state machines).
- **Phase 4:** Productionize `@homepilot/mcp-streamable-http` transport package and OAuth 2.1 authentication.
