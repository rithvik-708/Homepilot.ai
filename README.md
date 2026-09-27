# 🏡 Homepilot

**Homepilot** is an intelligent, goal-oriented AI smart-home orchestration platform built for the **Alexa+ Hackathon**. It bridges natural human intent with real-time physical device execution through the **Model Context Protocol (MCP)**, featuring interchangeable LLM backends (NVIDIA NIM, Amazon Bedrock, Ollama), a real-time reactive Web Dashboard with living hardware simulators, and an open-source Streamable HTTP transport wrapper.

---

## 🏛️ System Architecture

```text
                               ┌──────────────────────────────────────────────┐
                               │           Next.js 16 Web Dashboard           │
                               │  - Command Center & Speech Recognition       │
                               │  - Live Step-by-Step Execution Card          │
                               │  - Living Hardware & Fire TV Simulators      │
                               └──────────────────────┬───────────────────────┘
                                                      │
                       POST /api/chat (Commands)      │      GET /api/sse (Server-Sent Events)
                                                      ▼
                               ┌──────────────────────────────────────────────┐
                               │       Fastify MCP Server & Orchestrator      │
                               │                                              │
                               │  - POST /agent/execute                       │
                               │  - GET /agent/events (SSE Direct Stream)     │
                               │  - POST /mcp (Streamable HTTP 2025-11-25)    │
                               │  - GET /health                               │
                               └──────────┬───────────────────────┬───────────┘
                                          │                       │
                                          ▼                       ▼
                   ┌──────────────────────────────┐    ┌──────────────────────────────┐
                   │    Multi-Turn Orchestrator   │    │  PubSub / State Propagation  │
                   │   - Intent Classification    │    │  - Redis PubSub Channels     │
                   │   - Self-Healing Tool Loop   │    │  - In-Memory Fallback Bus    │
                   │   - DB Telemetry & Traces    │    └──────────────┬───────────────┘
                   └──────────────┬───────────────┘                   │
                                  │                                   ▼
         ┌────────────────────────┴────────────────────────┐   ┌──────────────────────┐
         │              Pluggable AI Providers             │   │ PostgreSQL (Drizzle) │
         │                                                 │   │  - Users & Prefs     │
         │  ┌──────────────┐ ┌──────────────┐ ┌─────────┐ │   │  - Devices & Catalog │
         │  │  NVIDIA NIM  │ │Amazon Bedrock│ │ Ollama  │ │   │  - Agent Telemetry   │
         │  │ (Llama 3.2)  │ │ (Claude 3.5) │ │(Local 3)│ │   └──────────────────────┘
         │  └──────────────┘ └──────────────┘ └─────────┘ │
         └────────────────────────┬────────────────────────┘
                                  │
                                  ▼
                   ┌──────────────────────────────┐
                   │     12 Locked MCP Tools      │
                   │  - Climate & Environment     │
                   │  - Smart Lighting Scenes     │
                   │  - Media & Fire TV Playback  │
                   │  - Calendar & Shopping List  │
                   │  - User Preferences & Memory │
                   └──────────────────────────────┘
```

---

## 📂 Monorepo Structure

Managed via **pnpm workspaces** and **Turborepo**:

```
homepilot/
├── apps/
│   ├── mcp-server/                   # Fastify MCP Server & Multi-Turn Agent Orchestrator
│   │   ├── src/
│   │   │   ├── agent/                # Multi-Turn Agent Loop & Pluggable Providers
│   │   │   │   ├── providers/
│   │   │   │   │   ├── AgentProvider.ts   # Unified abstract AI Provider interface
│   │   │   │   │   ├── NIMProvider.ts     # NVIDIA NIM (Llama 3.2 Vision / Instruct)
│   │   │   │   │   ├── BedrockProvider.ts # Amazon Bedrock (Claude 3.5 Sonnet)
│   │   │   │   │   └── OllamaProvider.ts  # Ollama Local Fallback (Llama 3.2 / 3.1)
│   │   │   │   └── orchestrator.ts     # Multi-turn Loop, Telemetry & Guardrails
│   │   │   ├── auth/
│   │   │   │   └── oauth2.ts          # Alexa+ OAuth 2.0 Bearer verification
│   │   │   ├── db/
│   │   │   │   ├── index.ts          # Resilient Drizzle PostgreSQL client
│   │   │   │   └── schema.ts         # Strictly typed schema & telemetry tables
│   │   │   ├── logging/
│   │   │   │   └── cloudwatch.ts     # AWS CloudWatch structured telemetry logger
│   │   │   ├── pubsub/
│   │   │   │   └── redis.ts          # Redis Pub/Sub with in-memory EventEmitter fallback
│   │   │   ├── schemas/
│   │   │   │   └── tools.ts          # 12 Locked MCP Tool JSON schemas
│   │   │   ├── tools/
│   │   │   │   └── dispatcher.ts     # Unified tool execution engine & simulated state
│   │   │   └── server.ts             # Fastify Server (MCP, SSE, Agent endpoints)
│   │   ├── tests/
│   │   │   ├── agent.test.ts         # Agent scenario test suite
│   │   │   └── qa-runner.test.ts     # Comprehensive QA verification suite
│   │   └── drizzle/                  # Generated SQL migrations
│   │
│   └── web/                          # Next.js 16 Web Dashboard (Turbopack + Tailwind CSS)
│       ├── src/
│       │   ├── app/                  # Next.js App Router (/api/chat, /api/sse)
│       │   ├── components/
│       │   │   ├── agent/            # ExecutionCard (Live step-by-step agent progress)
│       │   │   ├── dashboard/        # CommandCenter main container
│       │   │   ├── devices/          # HardwareSimulator (Smart Lights & HVAC Thermostat)
│       │   │   ├── dev/              # DemoCommands quick-trigger chips
│       │   │   ├── media/            # FireTVSimulator (Media playback & cover art)
│       │   │   └── voice/            # VoiceInput (Web Speech API microphone trigger)
│       │   └── hooks/
│       │       └── useAgentStream.ts # Resilient SSE hook for real-time telemetry
│
├── packages/
│   └── mcp-streamable-http/          # Open-Source Streamable HTTP MCP Transport (Spec 2025-11-25)
│       ├── src/
│       │   ├── transport.ts          # Fastify / Express request handler wrapper
│       │   └── index.ts              # Clean package exports
│       └── package.json
│
├── manifest.json                     # Alexa+ Add-on Skill Manifest
├── FRICTION_LOG.md                   # Developer friction log for MCP & Alexa+ integration
├── drizzle.config.ts                 # Workspace Drizzle CLI config
├── pnpm-workspace.yaml               # Workspace configuration
└── turbo.json                        # Turborepo task pipeline (build, lint, dev, test)
```

---

## 🌟 Key Features by Phase

### Phase 1: Foundation & 12 Locked MCP Tools
- **PostgreSQL Database (`Drizzle ORM`)**: Tables for `users`, `user_preferences`, `devices`, `calendar_events`, `shopping_items`, and `media_catalog`.
- **12 Locked MCP Tools**:
  - `home_get_state`, `home_set_environment` (Lighting & Climate)
  - `media_launch_playback`, `media_pause_playback` (Fire TV)
  - `calendar_get_schedule`, `calendar_create_event` (Calendar)
  - `shopping_get_list`, `shopping_add_item` (Smart Shopping)
  - `device_get_info`, `device_reboot` (Hardware Diagnostics)
  - `user_get_preferences`, `user_update_preferences` (Personalization Memory)

### Phase 2: Multi-Turn Loop & Pluggable Providers
- **Abstract `AgentProvider` Interface**: Seamless runtime switching between **NVIDIA NIM**, **Amazon Bedrock**, and **Ollama**.
- **NVIDIA NIM Integration**: Ultra-low latency tool calling using `meta/llama-3.2-11b-vision-instruct` / `meta/llama-3.2-90b-vision-instruct`.
- **Amazon Bedrock Provider**: Native Converse API tool calling with `anthropic.claude-3-5-sonnet-20241022-v2:0`.
- **Ollama Local Provider**: Local offline support using `llama3.2:3b`.
- **Self-Healing Error Recovery**: Tool failure payloads are automatically fed back to the LLM to adjust and recover.
- **Trace Logging**: Full run execution traces stored in PostgreSQL (`agent_runs`, `agent_tool_calls`).

### Phase 3: Web Dashboard & Living Hardware Simulator
- **Real-Time SSE Stream**: Direct server-sent events (`agent_updates`, `device_updates`) connecting Fastify, Redis, and Next.js.
- **Live Execution Card**: Displays active intent, real-time reasoning steps, tool statuses (`running`, `completed`, `failed`), latency metrics, and model information.
- **Living Hardware Simulator**: Interactive visualizer showing live light bulbs (color, brightness, status) and HVAC climate dials.
- **Fire TV Simulator**: Interactive TV screen rendering active media titles, cover art, playback state, and volume controls.
- **Voice Command Input**: Integrated browser Web Speech API for voice-activated home automation.

### Phase 4: Protocol Bridge & Open Source Extraction
- **`@homepilot/mcp-streamable-http`**: Extracted standalone open-source package conforming to the 2025-11-25 MCP Streamable HTTP transport standard.
- **Alexa+ OAuth 2.0 Auth**: Pre-handler middleware validating Bearer tokens for secure Alexa+ communication.
- **Add-on Manifest (`manifest.json`)**: Configured for Alexa+ developer console integration.
- **AWS CloudWatch Telemetry**: Structured JSON logger for AWS CloudWatch log groups.
- **Developer Friction Log (`FRICTION_LOG.md`)**: Comprehensive documentation of developer pain points and architectural recommendations.

---

## ⚙️ Environment Configuration

Copy `.env.example` to `.env` in the root directory:

```bash
cp .env.example .env
```

Configure your parameters:

```env
# Database Configuration (PostgreSQL)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/homepilot

# Active AI Provider: "nim" (default), "bedrock", or "ollama"
AI_PROVIDER=nim

# NVIDIA NIM Configuration
NVIDIA_NIM_API_KEY=your_nvidia_nim_api_key
NVIDIA_NIM_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_NIM_MODEL=meta/llama-3.2-11b-vision-instruct

# Ollama Fallback (Optional)
OLLAMA_BASE_URL=http://127.0.0.1:11434/api/chat
OLLAMA_MODEL=llama3.2:3b

# Amazon Bedrock (Optional)
AWS_REGION=us-east-1
# AWS_ACCESS_KEY_ID=your_aws_access_key
# AWS_SECRET_ACCESS_KEY=your_aws_secret_key

# Redis (Optional - falls back to in-memory EventEmitter if absent)
REDIS_URL=redis://127.0.0.1:6379

# Alexa+ OAuth Secret (Optional)
ALEXA_OAUTH_TOKEN=dev-token
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Setup Database Schema
```bash
# Push schema migrations to PostgreSQL
pnpm db:push
```

### 3. Build All Workspace Packages
```bash
pnpm turbo build
```

### 4. Run Development Servers
```bash
# Starts both MCP Server (port 8080) and Next.js Web Dashboard (port 3000)
pnpm dev
```

Visit the dashboard in your browser at: **[http://localhost:3000](http://localhost:3000)**

---

## 🧪 Testing & Verification

### Running Automated Test Suites
```bash
# Run Vitest test suite (Agent scenarios, QA validation, tool execution)
pnpm test
```

### Health Check Endpoint
```bash
curl http://127.0.0.1:8080/health
```
**Response:**
```json
{
  "status": "ok",
  "provider": "nim",
  "model": "meta/llama-3.2-11b-vision-instruct",
  "timestamp": "2026-09-27T14:50:00.000Z"
}
```

### Testing MCP Tool Call via Streamable HTTP (`POST /mcp`)
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

### Testing Agent Execution (`POST /agent/execute`)
```bash
curl -X POST http://localhost:8080/agent/execute \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Set up movie night in the living room"}'
```

---

## 📦 Open Source Package

The standalone Streamable HTTP transport wrapper is located in [`packages/mcp-streamable-http`](file:///c:/Coding%20Stuff/homepilot/packages/mcp-streamable-http):

```typescript
import { createStreamableHttpTransport } from '@homepilot/mcp-streamable-http';

fastify.post('/mcp', createStreamableHttpTransport({
  mcpServer: myMcpServer
}));
```

---

## 📄 License
MIT © 2026 Homepilot Contributors. Built for the Alexa+ Hackathon.
