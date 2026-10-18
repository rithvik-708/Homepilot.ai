import { AgentProvider } from './AgentProvider.js';
import { OllamaProvider } from './OllamaProvider.js';
import { NIMProvider } from './NIMProvider.js';
import { BedrockProvider } from './BedrockProvider.js';
import { AutonomousToolPlannerProvider } from './AutonomousToolPlannerProvider.js';

export function createProvider(): AgentProvider {
  const providerType = (process.env.AI_PROVIDER || 'nim').toLowerCase();

  switch (providerType) {
    case 'ollama':
      return new OllamaProvider();
    case 'nim':
      if (!process.env.NVIDIA_NIM_API_KEY) {
        console.warn('[AI Provider] NVIDIA_NIM_API_KEY is not set. Operating in autonomous local planner mode.');
        return new AutonomousToolPlannerProvider();
      }
      return new NIMProvider();
    case 'bedrock':
      return new BedrockProvider();
    case 'autonomous':
    case 'simulated':
    case 'local':
      return new AutonomousToolPlannerProvider();
    default:
      throw new Error(`Unsupported AI_PROVIDER: ${providerType}`);
  }
}
