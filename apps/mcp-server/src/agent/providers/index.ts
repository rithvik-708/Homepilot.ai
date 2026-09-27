import { AgentProvider } from './AgentProvider.js';
import { OllamaProvider } from './OllamaProvider.js';
import { NIMProvider } from './NIMProvider.js';
import { BedrockProvider } from './BedrockProvider.js';

export function createProvider(): AgentProvider {
  const providerType = process.env.AI_PROVIDER || 'nim';

  switch (providerType.toLowerCase()) {
    case 'ollama':
      return new OllamaProvider();
    case 'nim':
      return new NIMProvider();
    case 'bedrock':
      return new BedrockProvider();
    default:
      throw new Error(`Unsupported AI_PROVIDER: ${providerType}`);
  }
}
