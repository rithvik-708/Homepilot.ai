import { Message } from '@aws-sdk/client-bedrock-runtime';

export interface InvokeOptions {
  forceSummary?: boolean;
  systemInstruction?: string;
}

export interface AgentProvider {
  invoke(messages: Message[], options?: InvokeOptions): Promise<Message | undefined>;
}
