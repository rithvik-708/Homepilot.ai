export type AgentStep = {
  id: string;
  text: string;
  status: 'running' | 'completed' | 'failed';
};

export type AgentUpdate = {
  type:
    | 'agent_started'
    | 'intent_detected'
    | 'tool_started'
    | 'tool_completed'
    | 'tool_failed'
    | 'agent_completed'
    | 'agent_failed';
  runId: string;
  timestamp: string;
  intent?: string;
  tool?: string;
  step?: AgentStep;
  latencyMs?: number;
  modelId?: string;
  summary?: string;
  error?: string;
};

export type DeviceUpdate = {
  type:
    | 'device_state_changed'
    | 'media_playback_started'
    | 'media_playback_stopped';
  runId?: string;
  timestamp: string;
  device: string;
  state: Record<string, any>;
};

export interface DeviceStates {
  [device: string]: Record<string, any>;
}
