import { BedrockRuntimeClient, ConverseCommand, Tool, Message } from '@aws-sdk/client-bedrock-runtime';
import { dynamicRegistry } from '../../tools/dynamic/registry.js';
import { AgentProvider, InvokeOptions } from './AgentProvider.js';

export class BedrockProvider implements AgentProvider {
  private client: BedrockRuntimeClient;
  private modelId = 'anthropic.claude-3-5-sonnet-20241022-v2:0'; // Recommended AWS Builder model

  constructor(region: string = process.env.AWS_REGION || 'us-east-1') {
    this.client = new BedrockRuntimeClient({ region });
  }

  // Maps Phase 1 MCP Zod/JSON schemas to Bedrock's Converse API Tool Format
  private getBedrockTools(): Tool[] {
    return dynamicRegistry.getActiveTools().map((tool) => ({
      toolSpec: {
        name: tool.name,
        description: tool.description,
        inputSchema: {
          json: tool.inputSchema as any,
        },
      },
    }));
  }

  public async invoke(messages: Message[], options?: InvokeOptions): Promise<Message | undefined> {
    const systemMessages = messages.filter(m => (m.role as string) === 'system');
    const nonSystemMessages = messages.filter(m => (m.role as string) !== 'system');

    let systemConfig: any[] | undefined = undefined;
    const systemText = options?.systemInstruction || (systemMessages[0]?.content?.[0]?.text);
    if (systemText) {
      systemConfig = [{ text: systemText }];
    } else if (systemMessages.length > 0) {
      systemConfig = systemMessages.map(sm => ({
        text: typeof sm.content === 'string' ? sm.content : (sm.content?.[0]?.text || '')
      }));
    }

    const command = new ConverseCommand({
      modelId: this.modelId,
      system: systemConfig,
      messages: nonSystemMessages,
      inferenceConfig: {
        maxTokens: 4096,
        temperature: 0.4, // Lower temperature for deterministic planning
      },
      toolConfig: options?.forceSummary ? undefined : {
        tools: this.getBedrockTools(),
      },
    });

    try {
      const response = await this.client.send(command);
      return response.output?.message;
    } catch (error) {
      console.error('[BedrockProvider] Invocation Error:', error);
      throw error;
    }
  }
}
