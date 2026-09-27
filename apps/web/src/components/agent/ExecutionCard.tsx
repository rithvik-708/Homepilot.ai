'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AgentStep } from '../../types/events';
import { CheckCircle2, Circle, XCircle, Activity, Box } from 'lucide-react';

type ExecutionCardProps = {
  intent: string | null;
  steps: AgentStep[];
  latencyMs: number | null;
  modelId: string | null;
  connected: boolean;
};

const TOOL_LABELS: Record<string, string> = {
  home_get_state: 'Checking home state',
  home_set_environment: 'Setting home environment',
  media_search_catalog: 'Searching media',
  media_launch_playback: 'Starting playback',
  calendar_get_schedule: 'Checking calendar',
  calendar_create_event: 'Creating calendar event',
  shopping_get_list: 'Checking shopping list',
  shopping_add_item: 'Adding to shopping list',
};

function formatToolName(text: string) {
  for (const [key, label] of Object.entries(TOOL_LABELS)) {
    if (text.includes(key)) {
      return text.replace(key, label).replace('Running ', '').replace('Completed ', '').replace('Failed ', '');
    }
  }
  return text;
}

export function ExecutionCard({ intent, steps, latencyMs, modelId, connected }: ExecutionCardProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-semibold tracking-wider text-zinc-400">LIVE EXECUTION</h2>
        <div className="flex items-center gap-2">
          {connected ? (
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          ) : (
            <span className="h-2 w-2 rounded-full bg-rose-500"></span>
          )}
          <span className="text-xs text-zinc-500 font-medium">{connected ? 'ONLINE' : 'RECONNECTING'}</span>
        </div>
      </div>

      <div className="mb-8">
        <div className="text-xs text-zinc-500 mb-2 font-medium">DETECTED INTENT</div>
        {intent ? (
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-sm font-medium border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.15)]">
            {intent.replace('_', ' ').toUpperCase()}
          </div>
        ) : (
          <div className="text-zinc-600 text-sm">Awaiting command...</div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto mb-4 min-h-[160px] pr-2">
        <div className="text-xs text-zinc-500 mb-3 font-medium">ACTIONS</div>
        <div className="space-y-4">
          <AnimatePresence>
            {steps.map((step) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-3"
              >
                <div className="mt-0.5">
                  {step.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  {step.status === 'running' && (
                    <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                      <Circle className="w-4 h-4 text-indigo-400 fill-indigo-400/20" />
                    </motion.div>
                  )}
                  {step.status === 'failed' && <XCircle className="w-4 h-4 text-rose-400" />}
                </div>
                <div>
                  <div className={`text-sm ${step.status === 'completed' ? 'text-zinc-300' : step.status === 'failed' ? 'text-rose-400' : 'text-indigo-300'}`}>
                    {formatToolName(step.text)}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {steps.length === 0 && (
            <div className="text-zinc-700 text-sm flex items-center gap-2">
              <Activity className="w-4 h-4" /> No active tasks
            </div>
          )}
        </div>
      </div>

      <div className="pt-4 border-t border-zinc-800/50 grid grid-cols-2 gap-4">
        <div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Box className="w-3 h-3" /> Model
          </div>
          <div className="text-xs text-zinc-300 truncate" title={modelId || 'None'}>
            {modelId ? modelId.split('/').pop() : '-'}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Activity className="w-3 h-3" /> Latency
          </div>
          <div className="text-xs text-zinc-300">
            {latencyMs ? `${latencyMs}ms` : '-'}
          </div>
        </div>
      </div>
    </div>
  );
}
