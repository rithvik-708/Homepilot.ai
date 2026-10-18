import { Message } from '@aws-sdk/client-bedrock-runtime';
import { AgentProvider } from './AgentProvider.js';

/**
 * AutonomousToolPlannerProvider:
 * A deterministic local planner for autonomous tool synthesis, evaluation,
 * and execution across smart home workflows. Enables dependable testing and
 * offline execution without external cloud dependencies.
 */
export class AutonomousToolPlannerProvider implements AgentProvider {
  public async invoke(messages: Message[]): Promise<Message | undefined> {
    const userMsg = messages.find((m) => (m.role as string) === 'user');
    const userPrompt = userMsg?.content?.[0]?.text || '';
    const lower = userPrompt.toLowerCase();

    // Check last assistant message and tool results in the conversation
    const lastMessage = messages[messages.length - 1];
    const hasToolResults =
      Array.isArray(lastMessage?.content) &&
      lastMessage.content.some((c: any) => c.toolResult);

    if (hasToolResults) {
      // Analyze tool results to formulate next action or final response
      const toolResults = (lastMessage.content as any[])
        .filter((c) => c.toolResult)
        .map((c) => c.toolResult);

      const createResult = toolResults.find((tr) => tr.toolUseId?.startsWith('call_tool_create'));
      if (createResult) {
        const payload = createResult.content?.[0]?.json || {};
        if (payload.status === 'authorized_and_registered') {
          return {
            role: 'assistant',
            content: [
              {
                text: `Dynamic capability '${payload.name}' authorized by homeowner. Tool registered and active in the MCP control plane. Executing initial operational sequence.`,
              },
            ],
          };
        } else if (payload.status === 'denied_by_homeowner') {
          return {
            role: 'assistant',
            content: [
              {
                text: `Dynamic tool creation for '${payload.name}' was denied by homeowner. Physical action safely aborted.`,
              },
            ],
          };
        } else if (payload.status === 'registered') {
          return {
            role: 'assistant',
            content: [
              {
                text: `Tool '${payload.name}' auto-approved (Class ${payload.riskClass}). Dynamic sensor stream active.`,
              },
            ],
          };
        }
      }

      // Default final response after tool execution
      return {
        role: 'assistant',
        content: [{ text: `Task sequence completed successfully.` }],
      };
    }

    // First turn: Deterministically plan tools based on natural language goal
    if (lower.includes('deadbolt') || lower.includes('lock') || lower.includes('door')) {
      return {
        role: 'assistant',
        content: [
          {
            toolUse: {
              toolUseId: `call_tool_create_${Date.now()}`,
              name: 'mcp_tool_create',
              input: {
                name: 'smart_deadbolt_unlock',
                description: 'Unlock front door perimeter deadbolt latch and grant physical access',
                runtime: 'declarative_http',
                inputSchema: { type: 'object', properties: { lockId: { type: 'string' } } },
                codeDefinition: {
                  method: 'POST',
                  urlTemplate: 'https://locks.internal/unlock',
                  headers: { 'Content-Type': 'application/json' },
                },
                allowedDomains: ['locks.internal'],
              },
            },
          },
        ],
      };
    }

    if (lower.includes('heater') || lower.includes('thermal') || lower.includes('heat')) {
      return {
        role: 'assistant',
        content: [
          {
            toolUse: {
              toolUseId: `call_tool_create_${Date.now()}`,
              name: 'mcp_tool_create',
              input: {
                name: 'garage_space_heater_boost',
                description: 'Turn on high wattage space heater and thermal heating coil',
                runtime: 'declarative_http',
                inputSchema: { type: 'object', properties: { heatLevel: { type: 'number' } } },
                codeDefinition: {
                  method: 'POST',
                  urlTemplate: 'https://devices.internal/heater/on',
                  headers: { 'Content-Type': 'application/json' },
                },
                allowedDomains: ['devices.internal'],
              },
            },
          },
        ],
      };
    }

    if (lower.includes('sensor') || lower.includes('aqi') || lower.includes('air quality') || lower.includes('weather')) {
      return {
        role: 'assistant',
        content: [
          {
            toolUse: {
              toolUseId: `call_tool_create_${Date.now()}`,
              name: 'mcp_tool_create',
              input: {
                name: 'air_quality_sensor_read',
                description: 'Read particulate matter AQI index and room humidity sensor telemetry',
                runtime: 'declarative_http',
                inputSchema: { type: 'object', properties: {} },
                codeDefinition: {
                  method: 'GET',
                  urlTemplate: 'https://sensors.internal/aqi',
                  headers: {},
                },
                allowedDomains: ['sensors.internal'],
              },
            },
          },
        ],
      };
    }

    if (lower.includes('movie')) {
      return {
        role: 'assistant',
        content: [
          {
            toolUse: {
              toolUseId: `call_env_${Date.now()}`,
              name: 'home_set_environment',
              input: { zoneId: 'living_room', temperature: 21, lightsOn: true, lightingMode: 'warm_movie_mode' },
            },
          },
          {
            toolUse: {
              toolUseId: `call_playback_${Date.now()}`,
              name: 'media_launch_playback',
              input: { mediaId: 'movie_interstellar', zoneId: 'living_room', maxRentalCost: 1500 },
            },
          },
        ],
      };
    }

    // Default: Check environment state
    return {
      role: 'assistant',
      content: [
        {
          toolUse: {
            toolUseId: `call_state_${Date.now()}`,
            name: 'home_get_state',
            input: { zoneId: 'living_room' },
          },
        },
      ],
    };
  }
}

