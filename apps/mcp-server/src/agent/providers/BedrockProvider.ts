import { BedrockRuntimeClient, ConverseCommand, Tool, Message } from '@aws-sdk/client-bedrock-runtime';
import { MCP_TOOLS } from '../../schemas/tools.js';

export class BedrockProvider {
  private client: BedrockRuntimeClient;
  private modelId = 'anthropic.claude-3-5-sonnet-20241022-v2:0'; // Recommended AWS Builder model

  constructor(region: string = process.env.AWS_REGION || 'us-east-1') {
    this.client = new BedrockRuntimeClient({ region });
  }

  // Maps Phase 1 MCP Zod/JSON schemas to Bedrock's Converse API Tool Format
  private getBedrockTools(): Tool[] {
    return MCP_TOOLS.map((tool) => ({
      toolSpec: {
        name: tool.name,
        description: tool.description,
        inputSchema: {
          json: tool.inputSchema as any,
        },
      },
    }));
  }

  public async invoke(messages: Message[]): Promise<Message | undefined> {
    const command = new ConverseCommand({
      modelId: this.modelId,
      messages,
      inferenceConfig: {
        maxTokens: 4096,
        temperature: 0.4, // Lower temperature for deterministic planning
      },
      toolConfig: {
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
