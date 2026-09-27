import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentOrchestrator, LLMProvider } from '../src/agent/orchestrator.js';
import { stateManager } from '../src/tools/dispatcher.js';
import { Message } from '@aws-sdk/client-bedrock-runtime';

describe('AgentOrchestrator Scenario Test Suites', () => {
  beforeEach(() => {
    stateManager.reset();
  });

  it('Scenario 1: Movie Night Scenario (Budget under ₹1,500)', async () => {
    // Mock LLM Provider simulating Claude 3.5 Sonnet Converse turns
    const mockProvider: LLMProvider = {
      invoke: vi.fn().mockImplementation(async (messages: Message[]): Promise<Message> => {
        const turnCount = messages.length;

        // Turn 1: User asks for Movie night
        if (turnCount === 1) {
          return {
            role: 'assistant',
            content: [
              { text: 'Planning Movie Night within budget of ₹1,500.' },
              {
                toolUse: {
                  toolUseId: 'call_pref_1',
                  name: 'user_get_preferences',
                  input: { userId: 'user_alexa_01' },
                },
              },
            ],
          };
        }

        // Turn 2: LLM received user preferences, now configures environment and launches movie
        if (turnCount === 3) {
          return {
            role: 'assistant',
            content: [
              {
                toolUse: {
                  toolUseId: 'call_env_1',
                  name: 'home_set_environment',
                  input: { zoneId: 'living_room', temperature: 21, lightsOn: true },
                },
              },
              {
                toolUse: {
                  toolUseId: 'call_media_1',
                  name: 'media_launch_playback',
                  input: { mediaId: 'movie_interstellar_4k', zoneId: 'living_room', budget: 499 },
                },
              },
            ],
          };
        }

        // Turn 3: Final confirmation summary
        return {
          role: 'assistant',
          content: [
            {
              text: 'Movie Night is ready! Living room set to 21°C, warm movie lighting activated, and Interstellar started for ₹499 (well within your ₹1,500 budget).',
            },
          ],
        };
      }),
    };

    const orchestrator = new AgentOrchestrator({
      provider: mockProvider,
      skipDbLogging: true,
    });

    const result = await orchestrator.executeTask('Set up Movie Night under ₹1,500 budget in the living room');

    expect(result).toContain('Movie Night is ready');
    expect(result).toContain('₹499');
    expect(mockProvider.invoke).toHaveBeenCalledTimes(3);
  });

  it('Scenario 2: House Prep Scenario (11 AM Guest Arrival)', async () => {
    // Mock Provider simulating guest preparation flow
    const mockProvider: LLMProvider = {
      invoke: vi.fn().mockImplementation(async (messages: Message[]): Promise<Message> => {
        const turnCount = messages.length;

        // Turn 1: Check schedule
        if (turnCount === 1) {
          return {
            role: 'assistant',
            content: [
              { text: 'Checking schedule for guest arrival.' },
              {
                toolUse: {
                  toolUseId: 'call_cal_1',
                  name: 'calendar_get_schedule',
                  input: { date: '2026-09-27' },
                },
              },
            ],
          };
        }

        // Turn 2: Prepare the living room and check AC device
        if (turnCount === 3) {
          return {
            role: 'assistant',
            content: [
              {
                toolUse: {
                  toolUseId: 'call_env_prep',
                  name: 'home_set_environment',
                  input: { zoneId: 'living_room', temperature: 22, lightsOn: true },
                },
              },
              {
                toolUse: {
                  toolUseId: 'call_dev_check',
                  name: 'device_get_info',
                  input: { deviceId: 'ac_living_room' },
                },
              },
            ],
          };
        }

        // Turn 3: Final confirmation
        return {
          role: 'assistant',
          content: [
            {
              text: 'House prep completed for 11:00 AM guest arrival: Living room set to 22°C and AC is verified online.',
            },
          ],
        };
      }),
    };

    const orchestrator = new AgentOrchestrator({
      provider: mockProvider,
      skipDbLogging: true,
    });

    const result = await orchestrator.executeTask('Prepare the house for guests arriving at 11 AM');

    expect(result).toContain('House prep completed');
    expect(result).toContain('11:00 AM');
    expect(mockProvider.invoke).toHaveBeenCalledTimes(3);
  });

  it('Scenario 3: Error Recovery and Budget Guardrail', async () => {
    const mockProvider = { invoke: vi.fn() };
    const orchestrator = new AgentOrchestrator({ provider: mockProvider, skipDbLogging: true });
    const budgetExceededResult = await orchestrator.routeToolCall('media_launch_playback', {
      budget: 2500,
      mediaId: 'expensive_movie',
      zoneId: 'living_room',
    });

    expect(budgetExceededResult.status).toBe('budget_exceeded');
    expect(budgetExceededResult.error).toContain('exceeds maximum permissible budget');

    // Test within budget execution
    const validBudgetResult = await orchestrator.routeToolCall('media_launch_playback', {
      budget: 1200,
      mediaId: 'movie_interstellar_4k',
      zoneId: 'living_room',
    });

    expect(validBudgetResult.rentalPrice).toBe(499);
    expect(validBudgetResult.status).toBe('playing');
  });

  it('Direct Tool Routing Coverage', async () => {
    const mockProvider = { invoke: vi.fn() };
    const orchestrator = new AgentOrchestrator({ provider: mockProvider, skipDbLogging: true });
    const state = await orchestrator.routeToolCall('home_get_state', { zoneId: 'living_room' });
    expect(state.temperature).toBe(24);

    // Test shopping list
    const shopping = await orchestrator.routeToolCall('shopping_get_list', {});
    expect(shopping.items.length).toBeGreaterThan(0);

    // Test device reboot
    const reboot = await orchestrator.routeToolCall('device_reboot', { deviceId: 'router_01' });
    expect(reboot.status).toBe('rebooting');
  });
});
