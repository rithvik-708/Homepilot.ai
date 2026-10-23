# 🏡 Homepilot

[![Turborepo](https://img.shields.io/badge/Monorepo-Turborepo-0284c7?style=flat&logo=turborepo)](https://turbo.build/)
[![Next.js 16](https://img.shields.io/badge/Frontend-Next.js%2016%20(React%2019)-000000?style=flat&logo=nextdotjs)](https://nextjs.org/)
[![Fastify](https://img.shields.io/badge/Backend-Fastify%205-000000?style=flat&logo=fastify)](https://fastify.dev/)
[![Model Context Protocol](https://img.shields.io/badge/Protocol-MCP%20Streamable%20HTTP%20(2025--11--25)-7c3aed?style=flat)](https://modelcontextprotocol.io/)
[![ONNX Runtime](https://img.shields.io/badge/Security-ONNX%20Edge%20Neural%20Classifier-005ced?style=flat&logo=onnx)](https://onnxruntime.ai/)
[![Drizzle ORM](https://img.shields.io/badge/Database-Drizzle%20ORM%20(PostgreSQL)-c5f82a?style=flat&labelColor=1a1a1a)](https://orm.drizzle.team/)
[![NVIDIA NIM](https://img.shields.io/badge/AI%20Provider-NVIDIA%20NIM%20(Llama%203.2)-76b900?style=flat&logo=nvidia)](https://build.nvidia.com/)
[![Amazon Bedrock](https://img.shields.io/badge/AI%20Provider-Amazon%20Bedrock%20(Claude%203.5)-ff9900?style=flat&logo=amazonaws)](https://aws.amazon.com/bedrock/)

**Homepilot** is an enterprise-grade, goal-oriented AI smart-home orchestration platform built for the **Alexa+ Hackathon**. It translates open-ended human intent into real-time physical device execution through the **Model Context Protocol (MCP)**. 

Homepilot pairs a **3-Ring Defense-in-Depth Security Control Plane** (Deterministic AST, Edge Neural ONNX classification, and Cryptographic Human-in-the-Loop Consequence Contracts) with **Dynamic Tool Synthesis (CRUD)**, **Multi-User Identity & Session Authentication**, interchangeable LLM providers, and an interactive **Next.js 16 Web Dashboard** featuring living hardware and Fire TV simulators.

---

## 🏛️ System Architecture

```text
                               ┌──────────────────────────────────────────────────────────────┐
                               │                 Next.js 16 Web Dashboard                    │
                               │  - NextAuth v5 (Amazon OAuth 2.0 & One-Click Demo Auth)      │
                               │  - Command Center & Web Speech API Voice Recognition         │
                               │  - Live Execution Card (Reasoning Traces, Step Latency)      │
                               │  - Consequence Contract Card (Ring 2 HITL Approvals)         │
                               │  - Living Hardware Simulators (Smart Lights & HVAC Dial)     │
                               │  - Fire TV 4K Media Simulator (Cover Art & Playback)         │
                               └──────────────────────────────┬───────────────────────────────┘
                                                              │
                     POST /api/chat (Authenticated Context)   │   GET /api/sse (Server-Sent Events)
                     POST /api/agent/interrupt/resolve        │
                                                              ▼
                               ┌──────────────────────────────────────────────────────────────┐
                               │              Fastify MCP Server & Control Plane              │
                               │                                                              │
                               │  - POST /agent/execute (Session Bearer Verification)         │
                               │  - GET /agent/events (Direct SSE Stream via Redis / PubSub)  │
                               │  - GET /agent/interrupts & POST /agent/interrupt/resolve     │
                               │  - POST /mcp (Open-Source Streamable HTTP Spec 2025-11-25)   │
                               │  - GET /health (Health & Provider Status Probes)             │
                               └──────────────┬───────────────────────────────┬───────────────┘
                                              │                               │
                                              ▼                               ▼
                       ┌──────────────────────────────┐              ┌──────────────────────────────┐
                       │   Multi-Turn Orchestrator    │              │  PubSub / State Propagation  │
                       │   - Intent Classification    │              │  - Redis PubSub Channels     │
                       │   - Self-Healing Tool Loop   │              │  - In-Memory Fallback Bus    │
                       │   - DB Telemetry & Audit     │              └──────────────┬───────────────┘
                       └──────────────┬───────────────┘                             │
                                      │                                             ▼
                                      │                              ┌──────────────────────────────┐
                                      ▼                              │     PostgreSQL (Drizzle)     │
            ┌──────────────────────────────────────────────────┐     │  - Users & Preferences       │
            │     3-Ring Defense-in-Depth Security Plane       │     │  - Devices & Media Catalog   │
            │                                                  │     │  - Agent Runs & Tool Calls   │
            │  ┌────────────────────────────────────────────┐  │     │  - Dynamic Tools & Contracts │
            │  │ Ring 0: Deterministic AST & SSRF Boundary  │  │     │  - Security Audit Logs       │
            │  │ - Static Lexical Scan (eval/process/proto) │  │     └──────────────────────────────┘
            │  │ - Egress & Cloud IMDS Isolation (RFC 1918) │  │
            │  └─────────────────────┬──────────────────────┘  │
            │                        ▼                         │
            │  ┌────────────────────────────────────────────┐  │
            │  │ Ring 1: Edge Neural ONNX Classifier        │  │
            │  │ - all-MiniLM-L6-v2 Quantized Transformer   │  │
            │  │ - 7-Class Cosine Risk Vector Analysis      │  │
            │  │ - Strict Fail-Secure to Ring 2 HITL        │  │
            │  └─────────────────────┬──────────────────────┘  │
            │                        ▼                         │
            │  ┌────────────────────────────────────────────┐  │
            │  │ Ring 2: Human-in-the-Loop (HITL) Interrupt │  │
            │  │ - Ed25519 Cryptographic Capability Tokens  │  │
            │  │ - Jargon-Free Consequence Contracts        │  │
            │  │ - InterruptManager Pause / Resume Cycle    │  │
            │  └────────────────────────────────────────────┘  │
            └─────────────────────────┬────────────────────────┘
                                      │
                                      ▼
            ┌──────────────────────────────────────────────────┐
            │        Dynamic Tool CRUD & Execution Engines     │
            │                                                  │
            │  ┌────────────────────────┐ ┌─────────────────┐  │
            │  │ Declarative HTTP Engine│ │  Sandboxed VM   │  │
            │  │ (Template + Whitelist) │ │ (V8 Isolated)   │  │
            │  └────────────────────────┘ └─────────────────┘  │
            │  - Meta-Tools: tool_create, tool_test, tool_del  │
            │  - Runtime In-Memory Registry & Device Pairings  │
            └─────────────────────────┬────────────────────────┘
                                      │
                                      ▼
            ┌──────────────────────────────────────────────────┐
            │              Pluggable AI Providers              │
            │                                                  │
            │  ┌──────────────┐ ┌──────────────┐ ┌──────────┐  │
            │  │  NVIDIA NIM  │ │Amazon Bedrock│ │  Ollama  │  │
            │  │ (Llama 3.2)  │ │ (Claude 3.5) │ │(Local 3) │  │
            │  └──────────────┘ └──────────────┘ └──────────┘  │
            │  ┌─────────────────────────────────────────────┐ │
            │  │     Autonomous Tool Planner (Local/Offline) │ │
            │  └─────────────────────────────────────────────┘ │
            └─────────────────────────┬────────────────────────┘
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

```text
homepilot/
├── apps/
│   ├── mcp-server/                   # Fastify MCP Server, Security Plane & Agent Orchestrator
│   │   ├── models/
│   │   │   └── all-MiniLM-L6-v2/     # Quantized ONNX weights & WordPiece tokenizer for Ring 1
│   │   │       ├── model_quantized.onnx
│   │   │       └── tokenizer.json
│   │   ├── src/
│   │   │   ├── agent/                # Multi-Turn Agent Loop & Pluggable Providers
│   │   │   │   ├── providers/
│   │   │   │   │   ├── AgentProvider.ts                 # Unified abstract AI Provider interface
│   │   │   │   │   ├── NIMProvider.ts                   # NVIDIA NIM (Llama 3.2 Vision / Instruct)
│   │   │   │   │   ├── BedrockProvider.ts               # Amazon Bedrock (Claude 3.5 Sonnet)
│   │   │   │   │   ├── OllamaProvider.ts                # Ollama Local Fallback (Llama 3.2 / 3.1)
│   │   │   │   │   ├── AutonomousToolPlannerProvider.ts # Autonomous dynamic planner & evaluator
│   │   │   │   │   └── index.ts                         # Provider factory & fallback resolver
│   │   │   │   └── orchestrator.ts   # Multi-turn Loop, Telemetry, Self-Healing & Interrupts
│   │   │   ├── auth/
│   │   │   │   ├── oauth2.ts         # Alexa+ OAuth 2.0 Bearer token verification
│   │   │   │   └── sessionAuth.ts    # Web UI JWT / Bearer verification & user resolution
│   │   │   ├── db/
│   │   │   │   ├── index.ts          # Resilient Drizzle PostgreSQL connection client
│   │   │   │   ├── schema.ts         # Strictly typed schema (10 tables, audit logs, tools)
│   │   │   │   └── seed.ts           # Demo homeowner account seed (Alice & Guest)
│   │   │   ├── logging/
│   │   │   │   └── cloudwatch.ts     # AWS CloudWatch structured JSON telemetry logger
│   │   │   ├── pubsub/
│   │   │   │   └── redis.ts          # Redis Pub/Sub with in-memory EventEmitter fallback
│   │   │   ├── schemas/
│   │   │   │   └── tools.ts          # 12 Locked Static MCP Tools + 3 Dynamic Meta-Tools
│   │   │   ├── security/             # 3-Ring Defense-in-Depth Security Control Plane
│   │   │   │   ├── ring0Guard.ts     # AST static analysis, forbidden identifiers & SSRF egress
│   │   │   │   ├── ring1Classifier.ts# ONNX transformer 7-class neural risk scoring
│   │   │   │   ├── ring2Contract.ts  # Ed25519 cryptographic tokens & consequence contracts
│   │   │   │   ├── interruptManager.ts# First-class pause/resume cycle & timeout safety
│   │   │   │   └── wordpieceTokenizer.ts# Native TypeScript BERT/MiniLM subword tokenizer
│   │   │   ├── tools/
│   │   │   │   ├── dispatcher.ts     # Static tool executor & simulated home state
│   │   │   │   └── dynamic/          # Dynamic Tool CRUD & Dual-Engine Runners
│   │   │   │       ├── dualEngineRunner.ts # Declarative HTTP & Isolated V8 script runners
│   │   │   │       ├── metaTools.ts        # Handlers for tool creation, testing & deprecation
│   │   │   │       └── registry.ts         # In-memory runtime tool registry
│   │   │   └── server.ts             # Fastify Server (MCP, SSE, Agent endpoints, HITL resolve)
│   │   └── tests/                    # Vitest Verification Suites (62 test cases)
│   │       ├── adversarial-tool-benchmark.test.ts # AST injection & IMDS/SSRF egress tests
│   │       ├── agent-interrupt.test.ts            # Pause/resume & capability token tests
│   │       ├── agent.test.ts                      # Multi-turn loop regression tests
│   │       ├── auth-identity.test.ts              # Session auth & multi-tenant isolation tests
│   │       ├── dynamic-tools.test.ts              # Dynamic tool CRUD & dual-engine tests
│   │       ├── nim-smoke.test.ts                  # Live NVIDIA NIM tool calling smoke tests
│   │       ├── qa-runner.test.ts                  # Comprehensive QA verification suite
│   │       └── tool-creation-scenarios.test.ts    # Autonomous tool planner synthesis tests
│   │
│   └── web/                          # Next.js 16 Web Dashboard (React 19 + Tailwind CSS)
│       ├── src/
│       │   ├── app/
│       │   │   ├── api/
│       │   │   │   ├── agent/interrupt/resolve/route.ts # HITL interrupt resolution proxy
│       │   │   │   ├── auth/[...nextauth]/route.ts       # NextAuth.js v5 route handler
│       │   │   │   ├── chat/route.ts                    # Authenticated command dispatch proxy
│       │   │   │   ├── sse/route.ts                     # SSE event streaming proxy
│       │   │   │   └── tool-approval/route.ts           # Tool approval webhook endpoint
│       │   │   ├── login/page.tsx   # Login page with demo one-click credentials
│       │   │   ├── layout.tsx       # Root layout with Inter font & dark theme
│       │   │   └── page.tsx         # Dashboard page
│       │   ├── auth.ts              # Auth.js v5 configuration (Amazon OAuth & Credentials)
│       │   ├── components/
│       │   │   ├── agent/
│       │   │   │   ├── ConsequenceContractCard.tsx # Ring 2 interactive HITL approval card
│       │   │   │   └── ExecutionCard.tsx           # Step-by-step reasoning & tool timeline
│       │   │   ├── dashboard/
│       │   │   │   ├── CommandCenter.tsx           # Main container (My Home & Settings tabs)
│       │   │   │   └── QuickActions.tsx            # One-tap smart routines (Movie, Sleep, etc.)
│       │   │   ├── dev/
│       │   │   │   └── DemoCommands.tsx            # Device integration presets & custom modal
│       │   │   ├── devices/
│       │   │   │   └── HardwareSimulator.tsx       # Interactive lights & HVAC thermostat dial
│       │   │   ├── media/
│       │   │   │   └── FireTVSimulator.tsx         # 4K TV screen, album cover & volume slider
│       │   │   └── voice/
│       │   │       └── VoiceInput.tsx              # Web Speech API with live visual wave
│       │   ├── hooks/
│       │   │   └── useAgentStream.ts# Resilient SSE hook for real-time agent & device telemetry
│       │   ├── middleware.ts        # Next.js edge auth protection & redirect middleware
│       │   └── types/events.ts      # Strictly typed SSE, device and interrupt definitions
│
├── packages/
│   └── mcp-streamable-http/          # Standalone Open-Source Streamable HTTP MCP Transport
│       ├── src/
│       │   ├── transport.ts          # Fastify / Express request handler wrapper (Spec 2025-11-25)
│       │   └── index.ts              # Clean package exports
│       └── package.json
│
├── manifest.json                     # Alexa+ Add-on Skill Manifest
├── FRICTION_LOG.md                   # Developer friction log for MCP & Alexa+ integration
├── drizzle.config.ts                 # Drizzle Kit CLI configuration
├── pnpm-workspace.yaml               # PNPM workspace definition
└── turbo.json                        # Turborepo task pipeline
```

---

## 🌟 Key Features & Architectural Pillars

### 1. 🛡️ 3-Ring Defense-in-Depth Security Plane & HITL Interrupts

Homepilot enforces strict zero-trust runtime boundaries before any code or tool can execute against physical devices:

| Security Ring | Mechanism | Responsibility | Enforcement Policy |
| :--- | :--- | :--- | :--- |
| **Ring 0** | **Deterministic AST & Egress Isolation** | Static lexical inspection eliminating forbidden runtime identifiers (`eval`, `Function`, `process`, `globalThis`, `require`, `child_process`, `fs`, `WebAssembly`, prototype pollution `__proto__`). Network egress check blocking private RFC 1918 subnets, loopback `127.0.0.1`, and Cloud IMDS (`169.254.169.254`). | **Hard Reject**: Throws immediately; code never reaches VM or network. |
| **Ring 1** | **Edge Neural ONNX Transformer** | In-process classification using an INT8-quantized `sentence-transformers/all-MiniLM-L6-v2` ONNX model (D=384) with native C++ `onnxruntime-node` CPUExecutionProvider and WordPiece tokenizer. Computes cosine similarity across a 7-class canonical risk taxonomy. | **Strict Fail-Secure**: Auto-approves benign reads/ambient adjustments; strictly escalates hazards/finances to Ring 2; rejects destructive attacks. |
| **Ring 2** | **Human-in-the-Loop (HITL) Consequence Contracts** | Generates non-technical, plain-language Consequence Contracts presenting action impact, allowed domains, and rate limits. Issues asymmetric **Ed25519 cryptographic capability tokens** upon user authorization. | **First-Class Interrupt**: Pauses agent loop, emits `agent_interrupted` via SSE, and fails secure (rejects) on 120s timeout. |

#### Ring 1 Neural Risk Taxonomy

```text
Class 0: Harmless Read / Idempotent Observation ──────► [Auto-Approved] (Sensors, Metrics, Uptime)
Class 1: Scoped Reversible Ambient Actuation    ──────► [Auto-Approved] (Lights, Blinds, TV Volume)
Class 2: Financial & E-Commerce Transactions    ──────► [Ring 2 HITL Required] (Ordering, Rentals)
Class 3: Thermal / High-Wattage Equipment Hazard ──────► [Ring 2 HITL Required] (Space Heaters, Furnaces)
Class 4: Perimeter & Physical Access Security   ──────► [Ring 2 HITL Required] (Smart Locks, Garage Doors)
Class 5: Destructive Host Corruption / DoS      ──────► [Hard Reject] (File Purges, Fork Bombs)
Class 6: Privilege Escalation & Secret Stealing ──────► [Hard Reject] (Shadow Files, Reverse Shells)
```

---

### 2. ⚡ Dynamic Tool Synthesis (CRUD) & Dual-Engine Runner

Homepilot allows agents to autonomously extend their own tool catalog at runtime when facing novel hardware:

- **Meta-Tools**:
  - `mcp_tool_create`: Synthesizes and registers dynamic tools into the MCP server with automated Ring 0 and Ring 1 security verification.
  - `mcp_tool_test`: Sandboxed dry-run verification against test inputs before activating tools.
  - `mcp_tool_delete`: Deprecates or unregisters tools from the active in-memory registry.
- **Dual Execution Engines**:
  - **Declarative HTTP Engine**: Parameterized URL templates, headers, and body interpolation with strict 2000ms timeouts and domain whitelisting.
  - **Sandboxed Script Runner**: Isolated V8 execution with instruction quotas and strict memory boundaries.
- **Device Integrations UI (`Settings` Tab)**:
  - Pre-configured dynamic device scenarios: **Yale Smart Deadbolt** (Perimeter Access, Ring 2 HITL), **Garage Space Heater** (Thermal Hazard, Ring 2 HITL), and **Outdoor Air Quality Sensor** (Ambient Sensor, Auto-Approved).
  - Custom device integration modal allowing direct URL template and schema pairing.

---

### 3. 🔒 12 Locked Static MCP Tools

Homepilot provides 12 core static tools locked to verified internal smart-home capabilities:

| Tool Name | Category | Primary Parameters | Description |
| :--- | :--- | :--- | :--- |
| `home_get_state` | Climate / Lighting | `zoneId` | Inspects current temperature, lighting state, and occupancy for a home zone. |
| `home_set_environment` | Climate / Lighting | `zoneId`, `temperature`, `lightsOn` | Adjusts thermostat setpoint and lighting state for a zone. |
| `media_launch_playback` | Media & Fire TV | `mediaId`, `zoneId` | Launches playback on Fire TV, sets media metadata and active stream. |
| `media_pause_playback` | Media & Fire TV | `zoneId` | Pauses active media stream on Fire TV. |
| `calendar_get_schedule` | Schedule | `date` | Retrieves user calendar events and schedule for a given date. |
| `calendar_create_event` | Schedule | `title`, `startTime`, `endTime` | Schedules a new event on the homeowner's calendar. |
| `shopping_get_list` | Smart Shopping | `userId` | Fetches pending grocery and shopping items with estimated costs. |
| `shopping_add_item` | Smart Shopping | `userId`, `itemName`, `quantity`, `unit` | Adds a new item to the shopping list. |
| `device_get_info` | Hardware Diagnostics | `deviceId` | Checks device health, network latency, and firmware information. |
| `device_reboot` | Hardware Diagnostics | `deviceId` | Triggers a simulated hardware diagnostic restart. |
| `user_get_preferences` | Memory & Context | `userId` | Retrieves stored homeowner preferences (e.g., preferred evening temperature). |
| `user_update_preferences`| Memory & Context | `userId`, `preferences` | Persists updated personal preferences across sessions. |

---

### 4. 🧠 Pluggable AI Providers & Autonomous Planner

Homepilot provides a unified abstract `AgentProvider` interface with runtime model hot-swapping:

- **NVIDIA NIM (`nim`)**: Ultra-fast tool calling using `meta/llama-3.2-11b-vision-instruct` with self-healing JSON parsing, structured argument recovery, and fallback text extraction.
- **Amazon Bedrock (`bedrock`)**: Native AWS Bedrock Converse API integration supporting `anthropic.claude-3-5-sonnet-20241022-v2:0`.
- **Ollama (`ollama`)**: Local offline privacy mode using `llama3.2:3b`.
- **Autonomous Tool Planner (`autonomous`)**: Deterministic local planner enabling offline autonomous tool synthesis, evaluation, and end-to-end testing without external cloud API dependencies.
- **Self-Healing Loop**: If tool execution encounters an error, the orchestrator feeds the structured failure payload back into the model to adjust arguments and recover automatically.

---

### 5. 🔑 Multi-User Identity & Session Authentication

Homepilot implements comprehensive multi-tenant identity propagation and session protection:

- **NextAuth.js (Auth.js v5)**:
  - **Amazon OAuth 2.0 Provider**: Native Alexa+ / Amazon account sign-in.
  - **One-Click Demo Authentication**: Instantly sign in as the pre-configured homeowner.
  - **Edge Protection Middleware**: Automatically protects `/` and internal routes, redirecting unauthenticated visitors to `/login`.
- **Fastify Session Middleware (`verifyWebSessionToken`)**:
  - Protects `/agent/execute` and `/agent/interrupt/resolve`.
  - Supports JWT Bearer verification, Auth.js session token inspection, and dev tokens.
  - Propagates homeowner identity (`x-user-id`, `x-user-email`) into the `AgentOrchestrator`.
- **Database Multi-Tenancy**:
  - All `agent_runs`, `calendar_events`, `shopping_items`, and `user_preferences` are scoped to the authenticated user ID with foreign-key cascade integrity.

---

### 6. 🎛️ Reactive Web Dashboard & Living Simulators

Built with **Next.js 16**, **React 19**, **Framer Motion**, and **Tailwind CSS**:

- **Dual-Tab Interface**:
  - **My Home**: Unified Command Center, Voice Input, Quick Action Routines, Living Hardware, and Fire TV Simulator.
  - **Settings**: Dynamic Device Integrations, Smart Lock pairing, and custom capability creation.
- **Voice Command Input**:
  - Web Speech API integration with dynamic audio waveform animations, silence auto-dispatch, and transcript editing.
- **One-Tap Quick Actions**:
  - Instant pre-configured smart home routines: **Movie Night**, **Sleep Routine**, **Focus Mode**, **Morning Wakeup**, and **Away Mode**.
- **Live Step-by-Step Execution Card**:
  - Real-time intent badge, reasoning steps, tool execution status (`running`, `completed`, `failed`), capability tokens, and step latency tracking.
- **Living Hardware Simulator**:
  - Interactive smart bulbs with live status, brightness sliders, and color rendering.
  - Dynamic HVAC Thermostat dial with ambient vs. target temperature controls.
- **Fire TV 4K Media Simulator**:
  - Live television screen visualizer rendering active movie titles, cover art, genres, volume controls, and play/pause states.

---

### 7. 🌐 Open-Source Streamable HTTP Transport

Extracted into [`packages/mcp-streamable-http`](file:///c:/Coding%20Stuff/homepilot/packages/mcp-streamable-http):
- Standalone open-source transport wrapper conforming to the **MCP Streamable HTTP Specification (2025-11-25)**.
- Compatible with Fastify and Express handlers.
- Integrated with Alexa+ OAuth 2.0 Bearer validation for secure smart speaker integration.

```typescript
import { createStreamableHttpTransport } from '@homepilot/mcp-streamable-http';

fastify.post('/mcp', { preHandler: verifyAlexaOAuth }, createStreamableHttpTransport({
  mcpServer: homepilotMcpServer
}));
```

---

## ⚙️ Environment Configuration

Create a `.env` file in the project root:

```env
# Database Configuration (PostgreSQL with Drizzle ORM)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/homepilot

# Active AI Provider: "nim" (default), "bedrock", "ollama", or "autonomous"
AI_PROVIDER=nim

# NVIDIA NIM Provider Configuration
NVIDIA_NIM_API_KEY=your_nvidia_nim_api_key_here
NVIDIA_NIM_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_NIM_MODEL=meta/llama-3.2-11b-vision-instruct

# Amazon Bedrock Configuration (Optional)
AWS_REGION=us-east-1
# AWS_ACCESS_KEY_ID=your_aws_access_key
# AWS_SECRET_ACCESS_KEY=your_aws_secret_key

# Ollama Local Fallback Configuration (Optional)
OLLAMA_BASE_URL=http://127.0.0.1:11434/api/chat
OLLAMA_MODEL=llama3.2:3b

# Redis Event Bus (Optional - falls back to in-memory EventEmitter if absent)
REDIS_URL=redis://127.0.0.1:6379

# Web UI & Session Authentication Secret (Minimum 32 characters)
AUTH_SECRET=homepilot-auth-secret-key-at-least-32-chars-long

# Amazon OAuth 2.0 for Auth.js (Optional for production Amazon login)
AUTH_AMAZON_ID=amzn1.application-oa2-client.homepilot
AUTH_AMAZON_SECRET=your_amazon_client_secret

# Alexa+ Smart Speaker Verification Secret
ALEXA_OAUTH_TOKEN=dev-token
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: `v20.0.0+`
- **pnpm**: `v9+` or `v12+`
- **PostgreSQL**: Running locally or via Docker (`postgresql://postgres:postgres@localhost:5432/homepilot`)

### 2. Install Workspace Dependencies
```bash
pnpm install
```

### 3. Push Database Schema
```bash
# Push schema migrations to PostgreSQL using Drizzle Kit
pnpm db:push
```

### 4. Build Workspace Packages
```bash
pnpm turbo build
```

### 5. Launch Development Servers
```bash
# Starts both MCP Server (port 8080) and Next.js Web Dashboard (port 3000)
pnpm dev
```

Visit the dashboard in your browser: **[http://localhost:3000](http://localhost:3000)**

> **Tip:** On the `/login` screen, click **"Sign In with Demo Homeowner"** to instantly access the dashboard with full administrative permissions.

---

## 📡 API & Endpoints Reference

| Endpoint | Method | Auth | Description |
| :--- | :---: | :---: | :--- |
| `/health` | `GET` | None | Returns server status, active AI provider, and model information. |
| `/mcp` | `POST` | Alexa OAuth | Official MCP Streamable HTTP endpoint for tool discovery and invocation. |
| `/agent/execute` | `POST` | Bearer Token | Dispatches multi-turn goal execution to the agent orchestrator. |
| `/agent/events` | `GET` | None | Direct Server-Sent Events (SSE) stream broadcasting agent and device telemetry. |
| `/agent/interrupts` | `GET` | None | Lists currently pending Ring 2 Human-in-the-Loop interrupts. |
| `/agent/interrupt/resolve` | `POST` | Bearer Token | Resolves an active interrupt (`approved` or `rejected`) with Ed25519 token attestation. |
| `/agent/tool-approval` | `POST` | None | Legacy compatibility endpoint for tool authorization. |
| `/api/chat` | `POST` | Web Session | Next.js API route proxying user messages to the agent orchestrator. |
| `/api/sse` | `GET` | Web Session | Next.js SSE proxy forwarding real-time events to web clients. |

### Example 1: Streamable HTTP MCP Tool Call (`POST /mcp`)
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

### Example 2: Authenticated Agent Goal Execution (`POST /agent/execute`)
```bash
curl -X POST http://localhost:8080/agent/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-session-token" \
  -H "x-user-id: 00000000-0000-0000-0000-000000000001" \
  -d '{"prompt": "Prepare the living room for movie night under 500 rupees"}'
```

### Example 3: Resolving a Ring 2 Security Interrupt (`POST /agent/interrupt/resolve`)
```bash
curl -X POST http://localhost:8080/agent/interrupt/resolve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-session-token" \
  -d '{
    "interruptId": "int_1792722198334_m77cd1",
    "decision": "approved"
  }'
```

---

## 🧪 Comprehensive Automated Test Suites

Homepilot includes an automated Vitest verification suite spanning 8 test files:

```bash
# Run all Vitest suites across the monorepo
pnpm test
```

| Test Suite | Purpose | Key Scenarios Tested |
| :--- | :--- | :--- |
| [`adversarial-tool-benchmark.test.ts`](file:///c:/Coding%20Stuff/homepilot/apps/mcp-server/tests/adversarial-tool-benchmark.test.ts) | Security Efficacy | Lexical AST violation detection (`eval`, `process`, prototype traversal), cloud IMDS (`169.254.169.254`) egress blocking, and private RFC 1918 subnet isolation. |
| [`agent-interrupt.test.ts`](file:///c:/Coding%20Stuff/homepilot/apps/mcp-server/tests/agent-interrupt.test.ts) | First-Class HITL | Interrupt lifecycle, orchestrator pause/resume cycle, Ed25519 capability token attestation, and fail-secure timeout handling. |
| [`dynamic-tools.test.ts`](file:///c:/Coding%20Stuff/homepilot/apps/mcp-server/tests/dynamic-tools.test.ts) | Dynamic Tool Engine | In-memory registry CRUD, dual-engine declarative HTTP runner, sandboxed VM execution, and fail-secure fallback. |
| [`tool-creation-scenarios.test.ts`](file:///c:/Coding%20Stuff/homepilot/apps/mcp-server/tests/tool-creation-scenarios.test.ts) | Autonomous Planning | Autonomous Tool Planner synthesis of smart locks, heaters, sensors, and multi-step tool execution. |
| [`auth-identity.test.ts`](file:///c:/Coding%20Stuff/homepilot/apps/mcp-server/tests/auth-identity.test.ts) | Identity & Access Control | JWT/Bearer session validation, NextAuth header propagation, user-scoped telemetry, and 401 unauthorized rejections. |
| [`nim-smoke.test.ts`](file:///c:/Coding%20Stuff/homepilot/apps/mcp-server/tests/nim-smoke.test.ts) | NVIDIA NIM Integration | Live NVIDIA NIM endpoint reachability, structured tool calling, and single & multi-turn loop resolution. |
| [`qa-runner.test.ts`](file:///c:/Coding%20Stuff/homepilot/apps/mcp-server/tests/qa-runner.test.ts) | System Integration | 12 locked static tools, state mutations, movie night budget enforcement, error recovery, and database telemetry tracking. |
| [`agent.test.ts`](file:///c:/Coding%20Stuff/homepilot/apps/mcp-server/tests/agent.test.ts) | Multi-Turn Loop | Core orchestrator loop execution, self-healing recovery, and max-iteration guardrails. |

---

## 📄 License

MIT © 2026 Homepilot Contributors. Built for the Alexa+ Hackathon.
