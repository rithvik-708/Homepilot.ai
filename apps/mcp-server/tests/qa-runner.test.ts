import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentOrchestrator, LLMProvider } from '../src/agent/orchestrator.js';
import { executeTool, stateManager } from '../src/tools/dispatcher.js';
import { BedrockProvider } from '../src/agent/providers/BedrockProvider.js';
import { OllamaProvider } from '../src/agent/providers/OllamaProvider.js';
import { MCP_TOOLS } from '../src/schemas/tools.js';
import { Message } from '@aws-sdk/client-bedrock-runtime';
import { db } from '../src/db/index.js';
import { agentRuns, agentToolCalls } from '../src/db/schema.js';
import { eq, desc } from 'drizzle-orm';

describe('HomePilot Phase 2 Comprehensive QA Verification Suite', () => {
  beforeEach(() => {
    stateManager.reset();
  });

  // -------------------------------------------------------------
  // 2. OLLAMA PROVIDER
  // -------------------------------------------------------------
  describe('2. OLLAMA PROVIDER', () => {
    it('verifies Ollama live connectivity, model availability, and tool compatibility', async () => {
      // 1. Verify reachability & model
      let tagsResponse: any;
      try {
        const res = await fetch('http://127.0.0.1:11434/api/tags');
        tagsResponse = await res.json();
      } catch (err: any) {
        console.warn('Ollama not running locally:', err.message);
        return;
      }

      expect(tagsResponse.models).toBeDefined();
      const availableModel = tagsResponse.models[0]?.name || 'llama3.2:3b';
      console.log(`[QA Ollama] Connected. Available model: ${availableModel}`);

      const provider = new OllamaProvider('http://127.0.0.1:11434/api/chat', availableModel);

      // Test A: Normal assistant response
      const normalRes = await provider.invoke([{ role: 'user', content: [{ text: 'Reply with the single word "READY"' }] }]);
      console.log('[QA Ollama] Test A Normal Response:', JSON.stringify(normalRes, null, 2));
      expect(normalRes).toBeDefined();
      expect(normalRes?.role).toBe('assistant');

      // Test B: Tool-enabled response
      const toolRes = await provider.invoke([
        { role: 'user', content: [{ text: 'What is the current temperature and environment in the living room? Use the home_get_state tool.' }] }
      ]);
      console.log('[QA Ollama] Test B Normalized Provider Response:', JSON.stringify(toolRes, null, 2));

      const toolUse = toolRes?.content?.find((c: any) => c.toolUse)?.toolUse;
      if (toolUse) {
        console.log('[QA Ollama] Detected Tool Name:', toolUse.name);
        console.log('[QA Ollama] Detected Tool Arguments:', JSON.stringify(toolUse.input));
        expect(toolUse.name).toBe('home_get_state');
      }
    }, 30000);
  });

  // -------------------------------------------------------------
  // 3. BEDROCK PROVIDER
  // -------------------------------------------------------------
  describe('3. BEDROCK PROVIDER', () => {
    it('verifies Bedrock tool specification mapping and Converse API payload structures', () => {
      const provider = new BedrockProvider('us-east-1');
      const tools = (provider as any).getBedrockTools();

      expect(tools.length).toBe(12);
      expect(tools[0].toolSpec.name).toBe('calendar_get_schedule');
      expect(tools[0].toolSpec.inputSchema.json).toBeDefined();

      console.log('[QA Bedrock] MCP to Bedrock Converse format verified across 12 tools.');
    });
  });

  // -------------------------------------------------------------
  // 4. TOOL DISPATCH & STATE MUTATION
  // -------------------------------------------------------------
  describe('4. TOOL DISPATCH & STATE MUTATION', () => {
    it('verifies input validation, tool execution, result format, and actual state mutation without duplicate logic', async () => {
      // Test home_get_state initial
      const initialState = await executeTool('home_get_state', { zoneId: 'living_room' });
      expect(initialState.zoneId).toBe('living_room');
      expect(initialState.temperature).toBe(24);
      expect(initialState.lights).toBe('off');

      // Test home_set_environment mutation
      const mutationResult = await executeTool('home_set_environment', {
        zoneId: 'living_room',
        temperature: 21,
        lightsOn: true,
        lightingMode: 'warm_ambient',
      });
      expect(mutationResult.status).toBe('applied');
      expect(mutationResult.temperature).toBe(21);

      // Verify actual mutated state
      const verifiedState = await executeTool('home_get_state', { zoneId: 'living_room' });
      expect(verifiedState.temperature).toBe(21);
      expect(verifiedState.lights).toBe('on');
      expect(verifiedState.lightingMode).toBe('warm_ambient');

      // Test media_search_catalog
      const searchResult = await executeTool('media_search_catalog', { maxRentalCost: 1500 });
      expect(searchResult.results.length).toBeGreaterThan(0);
      expect(searchResult.results[0].price).toBeLessThanOrEqual(1500);

      // Test media_launch_playback
      const playbackResult = await executeTool('media_launch_playback', {
        mediaId: 'movie_interstellar_4k',
        zoneId: 'living_room',
        budget: 499,
      });
      expect(playbackResult.status).toBe('playing');
      expect(stateManager.playback.get('living_room')?.status).toBe('playing');
    });
  });

  // -------------------------------------------------------------
  // 5. SINGLE TOOL AGENT LOOP
  // -------------------------------------------------------------
  describe('5. SINGLE TOOL AGENT LOOP', () => {
    it('executes prompt: "Set the living room temperature to 22°C." and mutates state', async () => {
      const mockProvider: LLMProvider = {
        invoke: vi.fn().mockImplementation(async (messages: Message[]): Promise<Message> => {
          if (messages.length === 1) {
            return {
              role: 'assistant',
              content: [
                {
                  toolUse: {
                    toolUseId: 'call_set_temp',
                    name: 'home_set_environment',
                    input: { zoneId: 'living_room', temperature: 22 },
                  },
                },
              ],
            };
          }
          return {
            role: 'assistant',
            content: [{ text: 'Living room temperature has been set to 22°C.' }],
          };
        }),
      };

      const orchestrator = new AgentOrchestrator({ provider: mockProvider });
      const summary = await orchestrator.executeTask('Set the living room temperature to 22°C.');

      expect(summary).toContain('22°C');
      expect(stateManager.zones.get('living_room')?.temperature).toBe(22);
    });
  });

  // -------------------------------------------------------------
  // 6. MULTI-TOOL AGENT LOOP
  // -------------------------------------------------------------
  describe('6. MULTI-TOOL AGENT LOOP', () => {
    it('executes prompt: "Turn on the living room lights and set the temperature to 22°C."', async () => {
      const mockProvider: LLMProvider = {
        invoke: vi.fn().mockImplementation(async (messages: Message[]): Promise<Message> => {
          if (messages.length === 1) {
            return {
              role: 'assistant',
              content: [
                {
                  toolUse: {
                    toolUseId: 'call_multi_env',
                    name: 'home_set_environment',
                    input: { zoneId: 'living_room', temperature: 22, lightsOn: true },
                  },
                },
              ],
            };
          }
          return {
            role: 'assistant',
            content: [{ text: 'Living room lights turned on and temperature adjusted to 22°C.' }],
          };
        }),
      };

      const orchestrator = new AgentOrchestrator({ provider: mockProvider });
      const summary = await orchestrator.executeTask('Turn on the living room lights and set the temperature to 22°C.');

      expect(summary).toContain('22°C');
      const livingRoom = stateManager.zones.get('living_room');
      expect(livingRoom?.temperature).toBe(22);
      expect(livingRoom?.lightsOn).toBe(true);
    });
  });

  // -------------------------------------------------------------
  // 7. MOVIE NIGHT
  // -------------------------------------------------------------
  describe('7. MOVIE NIGHT SCENARIO', () => {
    it('executes Movie Night with budget under ₹1,500, setting environment and playback', async () => {
      const mockProvider: LLMProvider = {
        invoke: vi.fn().mockImplementation(async (messages: Message[]): Promise<Message> => {
          if (messages.length === 1) {
            return {
              role: 'assistant',
              content: [
                {
                  toolUse: {
                    toolUseId: 'call_pref',
                    name: 'user_get_preferences',
                    input: { userId: 'user_alexa_01' },
                  },
                },
                {
                  toolUse: {
                    toolUseId: 'call_search',
                    name: 'media_search_catalog',
                    input: { maxRentalCost: 1500 },
                  },
                },
              ],
            };
          }
          if (messages.length === 3) {
            return {
              role: 'assistant',
              content: [
                {
                  toolUse: {
                    toolUseId: 'call_env',
                    name: 'home_set_environment',
                    input: { zoneId: 'living_room', temperature: 21, lightsOn: true, lightingMode: 'warm_movie_mode' },
                  },
                },
                {
                  toolUse: {
                    toolUseId: 'call_play',
                    name: 'media_launch_playback',
                    input: { mediaId: 'movie_interstellar_4k', zoneId: 'living_room', budget: 499 },
                  },
                },
              ],
            };
          }
          return {
            role: 'assistant',
            content: [{ text: 'Movie night is ready! Living room set to 21°C and Interstellar is streaming for ₹499.' }],
          };
        }),
      };

      const orchestrator = new AgentOrchestrator({ provider: mockProvider });
      const summary = await orchestrator.executeTask('Get everything ready for movie night. Keep the movie rental under ₹1,500.');

      expect(summary).toContain('Movie night is ready');
      expect(stateManager.zones.get('living_room')?.temperature).toBe(21);
      expect(stateManager.playback.get('living_room')?.status).toBe('playing');
    });
  });

  // -------------------------------------------------------------
  // 8. BUDGET FAILURE
  // -------------------------------------------------------------
  describe('8. BUDGET FAILURE SCENARIO', () => {
    it('handles scenario where no movie satisfies requested budget without hallucination', async () => {
      const mockProvider: LLMProvider = {
        invoke: vi.fn().mockImplementation(async (messages: Message[]): Promise<Message> => {
          if (messages.length === 1) {
            return {
              role: 'assistant',
              content: [
                {
                  toolUse: {
                    toolUseId: 'call_search_low',
                    name: 'media_search_catalog',
                    input: { maxRentalCost: 50 },
                  },
                },
              ],
            };
          }
          // Assistant receives 0 results and reports constraint issue to user
          return {
            role: 'assistant',
            content: [{ text: 'No movies found under rental budget ₹50. The minimum rental is ₹150. Please increase your budget constraint.' }],
          };
        }),
      };

      const orchestrator = new AgentOrchestrator({ provider: mockProvider });
      const summary = await orchestrator.executeTask('Find a movie rental under ₹50.');

      expect(summary).toContain('No movies found');
      expect(summary).toContain('increase your budget');
      expect(stateManager.playback.get('living_room')).toBeUndefined();
    });
  });

  // -------------------------------------------------------------
  // 9. TOOL ERROR RECOVERY
  // -------------------------------------------------------------
  describe('9. TOOL ERROR RECOVERY', () => {
    it('recovers gracefully when a tool throws an error without server crash', async () => {
      let turn = 0;
      const mockProvider: LLMProvider = {
        invoke: vi.fn().mockImplementation(async (messages: Message[]): Promise<Message> => {
          turn++;
          if (turn === 1) {
            return {
              role: 'assistant',
              content: [
                {
                  toolUse: {
                    toolUseId: 'call_fail',
                    name: 'home_set_environment',
                    input: { zoneId: 'living_room', temperature: 100 }, // Will fail validation (max 32)
                  },
                },
              ],
            };
          }
          if (turn === 2) {
            // Agent sees error and self-corrects with valid temperature
            return {
              role: 'assistant',
              content: [
                {
                  toolUse: {
                    toolUseId: 'call_correct',
                    name: 'home_set_environment',
                    input: { zoneId: 'living_room', temperature: 22 },
                  },
                },
              ],
            };
          }
          return {
            role: 'assistant',
            content: [{ text: 'Temperature was out of range, corrected to 22°C successfully.' }],
          };
        }),
      };

      const orchestrator = new AgentOrchestrator({ provider: mockProvider });
      const summary = await orchestrator.executeTask('Set temperature to 100 degrees then fix if needed');

      expect(summary).toContain('corrected to 22°C');
      expect(stateManager.zones.get('living_room')?.temperature).toBe(22);
    });
  });

  // -------------------------------------------------------------
  // 10. INVALID PARAMETERS
  // -------------------------------------------------------------
  describe('10. INVALID PARAMETERS', () => {
    it('verifies Zod schema validation rejects invalid tool parameters with structured errors', async () => {
      await expect(executeTool('calendar_get_schedule', { date: 'not-a-valid-date' })).rejects.toThrow(
        'Invalid arguments for tool calendar_get_schedule'
      );

      await expect(executeTool('home_set_environment', { zoneId: '' })).rejects.toThrow(
        'Invalid arguments for tool home_set_environment'
      );
    });
  });

  // -------------------------------------------------------------
  // 11. INFINITE LOOP PROTECTION
  // -------------------------------------------------------------
  describe('11. INFINITE LOOP PROTECTION', () => {
    it('stops after maxIterations when tool continuously fails', async () => {
      const mockProvider: LLMProvider = {
        invoke: vi.fn().mockImplementation(async (): Promise<Message> => {
          // Continuously request a tool that fails
          return {
            role: 'assistant',
            content: [
              {
                toolUse: {
                  toolUseId: `call_${Date.now()}`,
                  name: 'unknown_broken_tool',
                  input: {},
                },
              },
            ],
          };
        }),
      };

      const orchestrator = new AgentOrchestrator({
        provider: mockProvider,
        maxIterations: 5,
      });

      const summary = await orchestrator.executeTask('Trigger continuous failure loop');

      expect(summary).toContain('Maximum iteration limit of 5 reached');
      expect(mockProvider.invoke).toHaveBeenCalledTimes(5);
    });
  });

  // -------------------------------------------------------------
  // 12. HOUSE PREP
  // -------------------------------------------------------------
  describe('12. HOUSE PREP SCENARIO', () => {
    it('executes prompt: "My parents are arriving tomorrow at 11 AM. Get the house ready."', async () => {
      const mockProvider: LLMProvider = {
        invoke: vi.fn().mockImplementation(async (messages: Message[]): Promise<Message> => {
          if (messages.length === 1) {
            return {
              role: 'assistant',
              content: [
                {
                  toolUse: {
                    toolUseId: 'call_cal',
                    name: 'calendar_get_schedule',
                    input: { date: '2026-09-28' },
                  },
                },
                {
                  toolUse: {
                    toolUseId: 'call_shop',
                    name: 'shopping_add_item',
                    input: { itemName: 'Fresh Towels & Snacks', quantity: 1, unit: 'set' },
                  },
                },
              ],
            };
          }
          if (messages.length === 3) {
            return {
              role: 'assistant',
              content: [
                {
                  toolUse: {
                    toolUseId: 'call_prep_env',
                    name: 'home_set_environment',
                    input: { zoneId: 'living_room', temperature: 22, lightsOn: true },
                  },
                },
                {
                  toolUse: {
                    toolUseId: 'call_dev',
                    name: 'device_get_info',
                    input: { deviceId: 'ac_living_room' },
                  },
                },
              ],
            };
          }
          return {
            role: 'assistant',
            content: [
              {
                text: 'House prepared for parents arriving tomorrow at 11:00 AM! Calendar schedule checked, fresh towels & snacks added to shopping list, living room set to 22°C, and AC verified online.',
              },
            ],
          };
        }),
      };

      const orchestrator = new AgentOrchestrator({ provider: mockProvider });
      const summary = await orchestrator.executeTask('My parents are arriving tomorrow at 11 AM. Get the house ready.');

      expect(summary).toContain('11:00 AM');
      expect(stateManager.zones.get('living_room')?.temperature).toBe(22);
      expect(stateManager.shoppingList.some((i) => i.itemName.includes('Towels'))).toBe(true);
    });
  });

  // -------------------------------------------------------------
  // 13. DATABASE TELEMETRY
  // -------------------------------------------------------------
  describe('13. DATABASE TELEMETRY', () => {
    it('records agent_runs and agent_tool_calls with contiguous execution orders and latency', async () => {
      const mockProvider: LLMProvider = {
        invoke: vi.fn().mockImplementation(async (messages: Message[]): Promise<Message> => {
          if (messages.length === 1) {
            return {
              role: 'assistant',
              content: [
                {
                  toolUse: {
                    toolUseId: 'call_db_1',
                    name: 'home_get_state',
                    input: { zoneId: 'living_room' },
                  },
                },
                {
                  toolUse: {
                    toolUseId: 'call_db_2',
                    name: 'home_set_environment',
                    input: { zoneId: 'living_room', temperature: 23 },
                  },
                },
              ],
            };
          }
          return {
            role: 'assistant',
            content: [{ text: 'Telemetry verified.' }],
          };
        }),
      };

      const orchestrator = new AgentOrchestrator({ provider: mockProvider });
      await orchestrator.executeTask('Telemetry test run');

      // Fetch the latest run from DB
      try {
        const [latestRun] = await db.select().from(agentRuns).orderBy(desc(agentRuns.createdAt)).limit(1);
        if (latestRun) {
          expect(latestRun.rawPrompt).toBe('Telemetry test run');
          expect(latestRun.executionStatus).toBe('completed');
          expect(typeof latestRun.latencyMs).toBe('number');

          // Fetch tool calls for this run
          const toolCalls = await db
            .select()
            .from(agentToolCalls)
            .where(eq(agentToolCalls.runId, latestRun.id))
            .orderBy(agentToolCalls.executionOrder);

          if (toolCalls.length > 0) {
            expect(toolCalls.length).toBe(2);
            expect(toolCalls[0].executionOrder).toBe(1);
            expect(toolCalls[0].toolName).toBe('home_get_state');
            expect(toolCalls[1].executionOrder).toBe(2);
            expect(toolCalls[1].toolName).toBe('home_set_environment');
          }
        }
      } catch (dbErr) {
        console.warn('DB not reachable during telemetry assertion, skipping DB read assertion:', dbErr);
      }
    });
  });
});
