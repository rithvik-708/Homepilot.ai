import { db } from '../db/index.js';
import { agentRuns, agentToolCalls } from '../db/schema.js';
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

  public async executeTask(prompt: string): Promise<string> {
    const startTime = Date.now();
    let runId: string | null = null;

    // 1. Initialize Trace in DB
    if (!this.skipDbLogging) {
      try {
        const [run] = await db
          .insert(agentRuns)
          .values({
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

    const messages: Message[] = [
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

    // 2. Multi-turn Agent Loop with Infinite Loop Protection
    while (!isComplete && iterationCount < this.maxIterations) {
      iterationCount++;
      const responseMessage = await this.provider.invoke(messages);
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
  }

  public async routeToolCall(name: string, input: any): Promise<Record<string, any>> {
    return executeTool(name, input);
  }

  private detectIntent(prompt: string): string {
    const lower = prompt.toLowerCase();
    if (lower.includes('movie') || lower.includes('watch') || lower.includes('cinema')) return 'movie_night';
    if (lower.includes('guest') || lower.includes('prep') || lower.includes('arrival') || lower.includes('parent')) return 'house_prep';
    if (lower.includes('shop') || lower.includes('grocery') || lower.includes('buy')) return 'shopping';
    if (lower.includes('calendar') || lower.includes('schedule') || lower.includes('event')) return 'calendar';
    return 'general_automation';
  }
}
