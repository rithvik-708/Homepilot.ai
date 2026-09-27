import { useState, useEffect, useRef } from 'react';
import { AgentStep, AgentUpdate, DeviceUpdate, DeviceStates } from '../types/events';

export function useAgentStream() {
  const [connected, setConnected] = useState(false);
  const [currentIntent, setCurrentIntent] = useState<string | null>(null);
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([]);
  const [deviceStates, setDeviceStates] = useState<DeviceStates>({});
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [modelId, setModelId] = useState<string | null>(null);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

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
  };
}
