import { describe, it, expect, beforeAll } from 'vitest';
import { NIMProvider } from '../src/agent/providers/NIMProvider.js';
import { AgentOrchestrator } from '../src/agent/orchestrator.js';

describe('NVIDIA NIM Provider Integration', () => {
  const hasApiKey = !!process.env.NVIDIA_NIM_API_KEY;

  beforeAll(() => {
    if (!hasApiKey) {
      console.log('SKIPPED — NVIDIA_NIM_API_KEY not configured');
    }
  });

  it.skipIf(!hasApiKey)('should reach NIM endpoint and return text response', async () => {
    const provider = new NIMProvider();
    const result = await provider.invoke([
      {
        role: 'user',
        content: [{ text: 'Hello! Just say "Hi" and nothing else.' }]
      }
    ]);
    
    expect(result).toBeDefined();
    expect(result?.role).toBe('assistant');
    expect(result?.content?.[0].text).toBeDefined();
  }, 10000);

  it.skipIf(!hasApiKey)('should trigger tool calls with NIM (e.g. home_get_state)', async () => {
    const provider = new NIMProvider();
    const result = await provider.invoke([
      {
        role: 'user',
        content: [{ text: 'What is the current state of my living room?' }]
      }
    ]);

    expect(result).toBeDefined();
    expect(result?.role).toBe('assistant');
    
    const toolCall = result?.content?.find((c: any) => c.toolUse);
    expect(toolCall).toBeDefined();
    expect(toolCall?.toolUse?.name).toBe('home_get_state');
  }, 15000);

  it.skipIf(!hasApiKey)('should work with AgentOrchestrator for single tool request', async () => {
    process.env.AI_PROVIDER = 'nim'; // Ensure the factory picks NIM
    const orchestrator = new AgentOrchestrator({ skipDbLogging: true });
    
    const result = await orchestrator.executeTask('Set the living room temperature to 22°C.');
    
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  }, 30000);

  it.skipIf(!hasApiKey)('should work with AgentOrchestrator for multi-tool request', async () => {
    process.env.AI_PROVIDER = 'nim';
    const orchestrator = new AgentOrchestrator({ skipDbLogging: true });
    
    const result = await orchestrator.executeTask('Turn on the living room lights and set the temperature to 22°C.');
    
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  }, 30000);
});
