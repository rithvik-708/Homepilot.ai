export type AgentStep = {
  id: string;
  text: string;
  status: 'running' | 'completed' | 'failed' | 'suspended';
};

export interface ConsequenceContract {
  plainTitle: string;
  consequenceSummary: string;
  safetyRules: string[];
  riskClass: number;
  capabilityToken: string;
}

export interface AgentInterrupt {
  interruptId: string;
  runId: string;
  type: 'tool_clearance_required' | 'confirmation_required' | 'input_required';
  toolName: string;
  toolCallId: string;
  contract?: ConsequenceContract;
  payload?: Record<string, any>;
  timestamp: string;
  status: 'pending' | 'resolved' | 'rejected' | 'timeout';
}

export type AgentUpdate = {
  type:
    | 'agent_started'
    | 'intent_detected'
    | 'tool_started'
    | 'tool_completed'
    | 'tool_failed'
    | 'agent_completed'
    | 'agent_failed'
    | 'agent_interrupted'
    | 'interrupt_resolved'
    | 'tool_approval_required'
    | 'tool_approved'
    | 'tool_rejected'
    | 'tool_auto_approved';
  runId?: string;
  timestamp: string;
  intent?: string;
  tool?: string;
  toolName?: string;
  riskClass?: number;
  contract?: ConsequenceContract;
  interrupt?: AgentInterrupt;
  interruptId?: string;
  decision?: 'approved' | 'rejected';
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
