import { Message } from '@aws-sdk/client-bedrock-runtime';

export interface InvokeOptions {
  forceSummary?: boolean;
}

export interface AgentProvider {
  invoke(messages: Message[], options?: InvokeOptions): Promise<Message | undefined>;
}
