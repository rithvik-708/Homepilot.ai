import { useState, useEffect, useRef } from 'react';
import { AgentStep, AgentUpdate, DeviceUpdate, DeviceStates, AgentInterrupt } from '../types/events';

export interface PendingApproval {
  toolName: string;
  contract: {
    plainTitle: string;
    consequenceSummary: string;
    safetyRules: string[];
    riskClass: number;
    capabilityToken: string;
  };
}

export function useAgentStream() {
  const [connected, setConnected] = useState(false);
  const [currentIntent, setCurrentIntent] = useState<string | null>(null);
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([]);
  const [deviceStates, setDeviceStates] = useState<DeviceStates>({});
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [modelId, setModelId] = useState<string | null>(null);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [activeInterrupt, setActiveInterrupt] = useState<AgentInterrupt | null>(null);
  const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null);

  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      if (esRef.current) {
        esRef.current.close();
      }

      const eventSource = new EventSource('/api/sse');
      esRef.current = eventSource;

      eventSource.onopen = () => {
        setConnected(true);
        setLastError(null);
      };

      eventSource.onerror = () => {
        setConnected(false);
        setLastError('Connection lost. Reconnecting...');
        if (esRef.current) {
          esRef.current.close();
          esRef.current = null;
        }
        reconnectTimeout = setTimeout(connect, 3000);
      };

      eventSource.addEventListener('agent_updates', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data) as AgentUpdate;
          if (data.runId) setActiveRunId(data.runId);
          if (data.modelId) setModelId(data.modelId);
          if (data.intent) setCurrentIntent(data.intent);
          if (data.latencyMs) setLatencyMs(data.latencyMs);

          if (data.type === 'agent_started') {
            setAgentSteps([]);
            setLastError(null);
            setLatencyMs(null);
            setActiveInterrupt(null);
            setPendingApproval(null);
          } else if (data.step) {
            setAgentSteps((prev) => {
              const existing = prev.findIndex((s) => s.id === data.step!.id);
              if (existing >= 0) {
                const next = [...prev];
                next[existing] = data.step!;
                return next;
              }
              return [...prev, data.step!];
            });
          }
          
          if (data.type === 'agent_failed' || data.type === 'tool_failed') {
            if (data.error) setLastError(data.error);
          }

          // Structured Agent Interrupt Event
          if (data.type === 'agent_interrupted' && data.interrupt) {
            setActiveInterrupt(data.interrupt);
            if (data.interrupt.contract) {
              setPendingApproval({
                toolName: data.interrupt.toolName,
                contract: data.interrupt.contract,
              });
            }
          }

          // Interrupt Resolution Event
          if (data.type === 'interrupt_resolved') {
            setActiveInterrupt(null);
            setPendingApproval(null);
          }

          // Legacy compatibility events
          if (data.type === 'tool_approval_required' && data.contract) {
            setPendingApproval({
              toolName: data.toolName || 'unknown_tool',
              contract: data.contract,
            });
          }

          if (data.type === 'tool_approved' || data.type === 'tool_rejected') {
            setPendingApproval(null);
            setActiveInterrupt(null);
          }
        } catch (err) {
          console.error('[SSE] Failed to parse agent update:', err);
        }
      });

      eventSource.addEventListener('device_updates', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data) as DeviceUpdate;
          setDeviceStates((prev) => ({
            ...prev,
            [data.device]: data.state,
          }));
        } catch (err) {
          console.error('[SSE] Failed to parse device update:', err);
        }
      });
    };

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      if (esRef.current) {
        esRef.current.close();
      }
    };
  }, []);

  return {
    connected,
    currentIntent,
    agentSteps,
    deviceStates,
    latencyMs,
    modelId,
    activeRunId,
    lastError,
    activeInterrupt,
    setActiveInterrupt,
    pendingApproval,
    setPendingApproval,
  };
}
