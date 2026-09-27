import { Message } from '@aws-sdk/client-bedrock-runtime';

export interface AgentProvider {
  invoke(messages: Message[]): Promise<Message | undefined>;
}
