import { db } from '../db/index.js';
import { agentRuns, agentToolCalls, toolApprovalRequests } from '../db/schema.js';
import { AgentProvider } from './providers/AgentProvider.js';
import { createProvider } from './providers/index.js';
import { executeTool } from '../tools/dispatcher.js';
import { Message, ToolResultBlock } from '@aws-sdk/client-bedrock-runtime';
import { eq } from 'drizzle-orm';
import { publishAgentEvent } from '../pubsub/redis.js';
import { interruptManager } from '../security/interruptManager.js';
import { dynamicRegistry } from '../tools/dynamic/registry.js';

export interface OrchestratorOptions {
  useLocal?: boolean;
  provider?: AgentProvider;
  skipDbLogging?: boolean;
  maxIterations?: number;
}

export class AgentOrchestrator {
  private provider: AgentProvider;
  private modelId: string;
  private skipDbLogging: boolean;
  private maxIterations: number;

  constructor(options: OrchestratorOptions | boolean = false) {
    if (typeof options === 'boolean') {
      // Legacy boolean support, defaults to created provider
      this.provider = createProvider();
      this.modelId = process.env.AI_PROVIDER || 'nim';
      this.skipDbLogging = false;
      this.maxIterations = 10;
    } else {
      if (options.provider) {
        this.provider = options.provider;
        this.modelId = 'custom-mock-provider';
      } else {
        this.provider = createProvider();
        this.modelId = process.env.AI_PROVIDER || 'nim';
      }
      this.skipDbLogging = options.skipDbLogging || false;
      this.maxIterations = options.maxIterations || 10;
    }
  }

  public async executeTask(prompt: string, userId?: string): Promise<string> {
    const startTime = Date.now();
    let runId: string | null = null;

    // 1. Initialize Trace in DB with authenticated userId
    if (!this.skipDbLogging) {
      try {
        const [run] = await db
          .insert(agentRuns)
          .values({
            userId: userId || null,
            rawPrompt: prompt,
            intentDetected: this.detectIntent(prompt),
            bedrockModelId: this.modelId,
            executionStatus: 'running',
          })
          .returning();
        runId = run?.id || null;
      } catch (dbError) {
        console.warn('[AgentOrchestrator] DB telemetry init error:', dbError);
      }
    }

    publishAgentEvent({
      type: 'agent_started',
      runId: runId || 'unknown',
      timestamp: new Date().toISOString(),
      intent: this.detectIntent(prompt),
      modelId: this.modelId,
    });

    const currentDate = new Date().toISOString().slice(0, 10);
    const activeUserId = userId || '00000000-0000-0000-0000-000000000001';
    const systemInstruction = `You are Homepilot, an autonomous smart-home orchestration AI assistant.
Your job is to execute targeted physical device commands and smart home actions using your available tools.

AUTHENTICATED HOMEOWNER IDENTITY:
- Active Authenticated Homeowner User ID: "${activeUserId}".
- When inspecting or querying user preferences with user_get_preferences, ALWAYS pass userId: "${activeUserId}".
- When checking calendar schedules with calendar_get_schedule or performing routines, associate context with "${activeUserId}".

CORE RULES:
1. Target Specific Goals: ONLY execute tools that directly serve the user's specific request. NEVER execute unrelated actions (e.g., do NOT start media playback, do NOT add shopping items, and do NOT change climate unless explicitly requested or clearly part of the requested routine).
2. Dynamic Tool Synthesis (ONLY for unintegrated URLs / new endpoints):
   - ONLY use 'mcp_tool_create' when the user explicitly provides a new URL or external endpoint (e.g., URLs ending in .internal like https://sensors.internal/aqi, https://locks.internal/unlock, https://devices.internal/heater).
   - NEVER use 'mcp_tool_create' for normal household tasks (climate, lights, media, calendar, shopping)! Use standard tools like home_set_environment, media_launch_playback, etc. directly.
   - For new URLs:
     - name: descriptive identifier (e.g. "air_quality_sensor_read", "smart_deadbolt_unlock", "garage_space_heater_boost")
     - description: purpose of the tool
     - runtime: "declarative_http"
     - codeDefinition: { method: "GET" for sensors/reads, "POST" for commands/controls, urlTemplate: "<endpoint_url>", headers: {} }
     - allowedDomains: [extracted domain from the URL, e.g. "sensors.internal", "locks.internal", "devices.internal"]
     - inputSchema: { type: "object", properties: {} }
3. Standard Routines (ONLY apply when specifically requested):
   - House Preparation / Hosting Guests (e.g. "My parents are coming tomorrow. Make the house ready."):
     - Check the schedule with calendar_get_schedule (date: "${currentDate}").
     - Query user preferences with user_get_preferences (userId: "${activeUserId}").
     - Adjust climate and lights using home_set_environment (zoneId: "living_room", temperature: 22, lightsOn: true, lightingMode: "bright_welcoming"; and zoneId: "bedroom", temperature: 22, lightsOn: true, lightingMode: "soft").
     - Add guest supplies using shopping_add_item (itemName: "Fresh Towels", quantity: 2; itemName: "Snacks & Refreshments", quantity: 4).
   - Movie Night:
     - Query user preferences with user_get_preferences (userId: "${activeUserId}").
     - Set lighting & climate using home_set_environment (zoneId: "living_room", temperature: 21, lightsOn: true, lightingMode: "warm").
     - Start media playback with media_launch_playback (mediaId: "movie_interstellar_4k", zoneId: "living_room").
4. Completion & Stopping:
   - Perform ONLY the minimum necessary actions to fulfill the user's request.
   - Once the requested action has been performed (e.g. environment set, media launched, or tool synthesized), DO NOT brainstorm additional tools, DO NOT add unrequested shopping items or devices, and DO NOT call any more tools.
   - Provide a concise, pleasant summary of the completed actions immediately.`;

    const messages: Message[] = [
      {
        role: 'system' as any,
        content: [{ text: systemInstruction }],
      },
      {
        role: 'user',
        content: [{ text: prompt }],
      },
    ];

    let executionOrder = 0;
    let iterationCount = 0;
    let isComplete = false;
    let finalSummary = '';
    let loopTerminatedPrematurely = false;
    let shouldForceSummary = false;
    const executedTools = new Set<string>();
    const intent = this.detectIntent(prompt);

    // 2. Multi-turn Agent Loop with Infinite Loop Protection
    try {
      while (!isComplete && iterationCount < this.maxIterations) {
        iterationCount++;
        const responseMessage = await this.provider.invoke(messages, { forceSummary: shouldForceSummary });
        if (!responseMessage) {
          finalSummary = 'No response from model provider.';
          isComplete = true;
          break;
        }

      messages.push(responseMessage); // Add assistant response to history

      const toolRequests = responseMessage.content?.filter((c) => c.toolUse);

      // If no tools were requested, the agent is providing the final summary
      if (!toolRequests || toolRequests.length === 0) {
        finalSummary =
          responseMessage.content?.find((c) => c.text)?.text || 'Task complete.';
        isComplete = true;
        break;
      }

      // 3. Execute Tools Sequentially via Unified Dispatcher
      const toolResults: ToolResultBlock[] = [];

      for (const block of toolRequests) {
        executionOrder++;
        const tool = block.toolUse;
        if (!tool || !tool.name) continue;
        executedTools.add(tool.name);

        publishAgentEvent({
          type: 'tool_started',
          runId: runId || 'unknown',
          timestamp: new Date().toISOString(),
          tool: tool.name,
          step: { id: tool.toolUseId, text: `Running ${tool.name}`, status: 'running' }
        });

        try {
          // Unified tool execution (Matches Fastify handler & updates shared state)
          let resultPayload = await executeTool(tool.name, tool.input);

          // Human-in-the-Loop Interrupt handling (Security Control Plane)
          if (resultPayload && resultPayload.status === 'awaiting_human_approval') {
            const { interrupt, promise: resolutionPromise } = interruptManager.createInterrupt({
              runId: runId || 'unknown',
              toolName: resultPayload.name || tool.name,
              toolCallId: tool.toolUseId || 'unknown_call',
              contract: resultPayload.contract,
              type: 'tool_clearance_required',
            });

            // Insert initial pending tool approval request into DB audit trail
            let approvalRequestId: string | null = null;
            if (runId && !this.skipDbLogging) {
              try {
                const [appReq] = await db.insert(toolApprovalRequests).values({
                  runId: runId,
                  plainTitle: resultPayload.contract?.plainTitle || tool.name,
                  consequenceSummary: resultPayload.contract?.consequenceSummary || 'Clearance requested',
                  safetyRules: resultPayload.contract?.safetyRules || [],
                  status: 'pending',
                }).returning();
                approvalRequestId = appReq?.id || null;
              } catch (appErr) {
                console.warn('[AgentOrchestrator] Failed to insert initial tool approval request:', appErr);
              }
            }

            publishAgentEvent({
              type: 'agent_interrupted',
              runId: runId || 'unknown',
              interrupt,
              timestamp: new Date().toISOString(),
              step: {
                id: tool.toolUseId,
                text: `Security clearance required for '${resultPayload.name}': ${resultPayload.contract?.plainTitle || 'Authorization needed'}`,
                status: 'running',
              },
            });

            // Await homeowner clearance (with default fail-secure timeout)
            const decision = await resolutionPromise;

            // Update tool approval request audit in DB with decidedBy homeowner user ID
            if (runId && !this.skipDbLogging) {
              try {
                const decidedByUserId = interrupt.decidedBy || userId || null;
                if (approvalRequestId) {
                  await db.update(toolApprovalRequests)
                    .set({
                      status: decision,
                      decidedBy: decidedByUserId,
                      decidedAt: new Date(),
                    })
                    .where(eq(toolApprovalRequests.id, approvalRequestId));
                } else {
                  await db.insert(toolApprovalRequests).values({
                    runId: runId,
                    plainTitle: resultPayload.contract?.plainTitle || tool.name,
                    consequenceSummary: resultPayload.contract?.consequenceSummary || 'Clearance requested',
                    safetyRules: resultPayload.contract?.safetyRules || [],
                    status: decision,
                    decidedBy: decidedByUserId,
                    decidedAt: new Date(),
                  });
                }
              } catch (appErr) {
                console.warn('[AgentOrchestrator] Failed to update tool approval request audit in DB:', appErr);
              }
            }

            if (decision === 'approved') {
              const registeredTool = dynamicRegistry.getTool(resultPayload.name);
              if (registeredTool) {
                registeredTool.status = 'active';
                dynamicRegistry.register(registeredTool);
              }

              publishAgentEvent({
                type: 'interrupt_resolved',
                runId: runId || 'unknown',
                interruptId: interrupt.interruptId,
                decision: 'approved',
                toolName: resultPayload.name,
                timestamp: new Date().toISOString(),
                step: {
                  id: tool.toolUseId,
                  text: `Authorization Granted by Homeowner for '${resultPayload.name}'`,
                  status: 'completed',
                },
              });

              resultPayload = {
                status: 'authorized_and_registered',
                name: resultPayload.name,
                riskClass: resultPayload.contract?.riskClass,
                message: `Physical authorization granted by homeowner for '${resultPayload.name}'. The tool is now active and ready for invocation.`,
              };
            } else {
              dynamicRegistry.unregister(resultPayload.name);

              publishAgentEvent({
                type: 'interrupt_resolved',
                runId: runId || 'unknown',
                interruptId: interrupt.interruptId,
                decision: 'rejected',
                toolName: resultPayload.name,
                timestamp: new Date().toISOString(),
                step: {
                  id: tool.toolUseId,
                  text: `Authorization Denied by Homeowner for '${resultPayload.name}'`,
                  status: 'failed',
                },
              });

              resultPayload = {
                status: 'denied_by_homeowner',
                name: resultPayload.name,
                message: `Physical authorization denied by homeowner for '${resultPayload.name}'. Action was aborted.`,
              };
            }
          }

          // Log Tool Execution to DB
          if (runId && !this.skipDbLogging) {
            try {
              await db.insert(agentToolCalls).values({
                runId: runId,
                toolName: tool.name,
                inputPayload: tool.input as any,
                outputPayload: resultPayload as any,
                executionOrder,
              });
            } catch (dbError) {
              console.warn('[AgentOrchestrator] Tool call DB logging error:', dbError);
            }
          }

          toolResults.push({
            toolUseId: tool.toolUseId,
            content: [{ json: resultPayload as any }],
            status: 'success',
          });

          publishAgentEvent({
            type: 'tool_completed',
            runId: runId || 'unknown',
            timestamp: new Date().toISOString(),
            tool: tool.name,
            step: { id: tool.toolUseId, text: `Completed ${tool.name}`, status: 'completed' }
          });
        } catch (error: any) {
          // Day 11 Error Recovery: Structured error fed back to LLM for auto-correction
          if (runId && !this.skipDbLogging) {
            try {
              await db.insert(agentToolCalls).values({
                runId: runId,
                toolName: tool.name,
                inputPayload: tool.input as any,
                outputPayload: { error: error.message },
                executionOrder,
              });
            } catch (dbError) {
              console.warn('[AgentOrchestrator] Tool error DB logging error:', dbError);
            }
          }

          toolResults.push({
            toolUseId: tool.toolUseId,
            content: [{ text: `Error: ${error.message}` }],
            status: 'error',
          });

          publishAgentEvent({
            type: 'tool_failed',
            runId: runId || 'unknown',
            timestamp: new Date().toISOString(),
            tool: tool.name,
            error: error.message,
            step: { id: tool.toolUseId, text: `Failed ${tool.name}`, status: 'failed' }
          });
        }
      }

      // 4. Provide Tool Results back to the LLM for the next turn
      messages.push({
        role: 'user',
        content: toolResults.map((tr) => ({ toolResult: tr })),
      });

      // Assess if the user's primary goal has completed to avoid runaway tool loops
      const nonQueryMutationTools = [
        'home_set_environment',
        'media_launch_playback',
        'media_pause_playback',
        'shopping_add_item',
        'device_reboot',
        'calendar_create_event',
      ];

      if (intent === 'general_automation' || intent === 'shopping' || intent === 'calendar') {
        if (toolRequests.some((tr) => nonQueryMutationTools.includes(tr.toolUse?.name || ''))) {
          shouldForceSummary = true;
        }
      } else if (intent === 'movie_night') {
        if (executedTools.has('media_launch_playback') || executedTools.has('home_set_environment')) {
          shouldForceSummary = true;
        }
      } else if (intent === 'house_prep') {
        if (executedTools.has('shopping_add_item') && executedTools.has('home_set_environment')) {
          shouldForceSummary = true;
        }
      } else if (intent === 'tool_synthesis') {
        if (toolRequests.some((tr) => tr.toolUse?.name && !tr.toolUse.name.startsWith('mcp_'))) {
          shouldForceSummary = true;
        }
      }
      }

      // Check if loop protection was triggered
      if (iterationCount >= this.maxIterations && !isComplete) {
        loopTerminatedPrematurely = true;
        finalSummary = `Execution stopped: Maximum iteration limit of ${this.maxIterations} reached.`;
      }

      // 5. Finalize DB Trace
      if (runId && !this.skipDbLogging) {
        try {
          await db
            .update(agentRuns)
            .set({
              executionStatus: loopTerminatedPrematurely ? 'max_iterations_exceeded' : 'completed',
              latencyMs: Date.now() - startTime,
            })
            .where(eq(agentRuns.id, runId));
        } catch (dbError) {
          console.warn('[AgentOrchestrator] DB telemetry finalize error:', dbError);
        }
      }

      publishAgentEvent({
        type: 'agent_completed',
        runId: runId || 'unknown',
        timestamp: new Date().toISOString(),
        summary: finalSummary,
        latencyMs: Date.now() - startTime,
      });

      return finalSummary;
    } catch (loopError: any) {
      console.error('[AgentOrchestrator] AI provider error:', loopError);
      const isTimeout = loopError.message?.includes('504') || loopError.message?.includes('timed out');
      
      finalSummary = isTimeout
        ? "I'm sorry, but the cloud AI service timed out while processing your request. The upstream server is under high demand. Please try again in a moment, or switch to an alternate model/provider."
        : `I'm sorry, an issue occurred while processing with the AI provider: ${loopError.message}`;

      if (runId && !this.skipDbLogging) {
        try {
          await db
            .update(agentRuns)
            .set({
              executionStatus: 'failed',
              latencyMs: Date.now() - startTime,
            })
            .where(eq(agentRuns.id, runId));
        } catch (dbError) {
          console.warn('[AgentOrchestrator] DB telemetry error finalize:', dbError);
        }
      }

      publishAgentEvent({
        type: 'agent_failed',
        runId: runId || 'unknown',
        timestamp: new Date().toISOString(),
        error: loopError.message,
        summary: finalSummary,
        latencyMs: Date.now() - startTime,
      });

      return finalSummary;
    }
  }

  public async routeToolCall(name: string, input: any): Promise<Record<string, any>> {
    return executeTool(name, input);
  }

  private detectIntent(prompt: string): string {
    const lower = prompt.toLowerCase();
    if (lower.includes('integrate') || lower.includes('sensor') || lower.includes('deadbolt') || lower.includes('heater') || lower.includes('tool') || lower.includes('.internal')) return 'tool_synthesis';
    if (lower.includes('movie') || lower.includes('watch') || lower.includes('cinema')) return 'movie_night';
    if (lower.includes('guest') || lower.includes('prep') || lower.includes('arrival') || lower.includes('parent')) return 'house_prep';
    if (lower.includes('shop') || lower.includes('grocery') || lower.includes('buy')) return 'shopping';
    if (lower.includes('calendar') || lower.includes('schedule') || lower.includes('event')) return 'calendar';
    return 'general_automation';
  }
}
