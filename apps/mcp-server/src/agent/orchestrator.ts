import { db } from '../db/index.js';
import { agentRuns, agentToolCalls } from '../db/schema.js';
import { BedrockProvider } from './providers/BedrockProvider.js';
import { OllamaProvider } from './providers/OllamaProvider.js';
import { executeTool } from '../tools/dispatcher.js';
import { Message, ToolResultBlock } from '@aws-sdk/client-bedrock-runtime';
import { eq } from 'drizzle-orm';

export interface LLMProvider {
  invoke(messages: Message[]): Promise<Message | undefined>;
}

export interface OrchestratorOptions {
  useLocal?: boolean;
  provider?: LLMProvider;
  skipDbLogging?: boolean;
  maxIterations?: number;
}

export class AgentOrchestrator {
  private provider: LLMProvider;
  private modelId: string;
  private skipDbLogging: boolean;
  private maxIterations: number;

  constructor(options: OrchestratorOptions | boolean = false) {
    if (typeof options === 'boolean') {
      this.provider = options ? new OllamaProvider() : new BedrockProvider();
      this.modelId = options ? 'llama3.2:3b' : 'anthropic.claude-3-5-sonnet-20241022-v2:0';
      this.skipDbLogging = false;
      this.maxIterations = 10;
    } else {
      if (options.provider) {
        this.provider = options.provider;
        this.modelId = 'custom-mock-provider';
      } else if (options.useLocal) {
        this.provider = new OllamaProvider();
        this.modelId = 'llama3.2:3b';
      } else {
        this.provider = new BedrockProvider();
        this.modelId = 'anthropic.claude-3-5-sonnet-20241022-v2:0';
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

        try {
          // Unified tool execution (Matches Fastify handler & updates shared state)
          const resultPayload = await executeTool(tool.name, tool.input);

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
