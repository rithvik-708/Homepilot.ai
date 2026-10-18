'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AgentStep } from '../../types/events';
import { CheckCircle2, Circle, XCircle, Sparkles, Home } from 'lucide-react';

type ExecutionCardProps = {
  intent: string | null;
  steps: AgentStep[];
  latencyMs?: number | null;
  modelId?: string | null;
  connected: boolean;
};

const CONVERSATIONAL_ACTIONS: Record<
  string,
  { running: string; completed: string; failed: string }
> = {
  home_set_environment: {
    running: 'Adjusting climate and lighting...',
    completed: 'Set room climate and lighting',
    failed: 'Could not adjust room climate',
  },
  home_get_state: {
    running: 'Checking room climate and lights...',
    completed: 'Checked current room conditions',
    failed: 'Could not read room conditions',
  },
  media_launch_playback: {
    running: 'Starting media playback on Fire TV...',
    completed: 'Playing movie on Fire TV',
    failed: 'Could not launch media stream',
  },
  media_pause_playback: {
    running: 'Pausing media playback...',
    completed: 'Paused Fire TV playback',
    failed: 'Could not pause media stream',
  },
  calendar_get_schedule: {
    running: 'Reviewing your calendar schedule...',
    completed: 'Checked your household schedule',
    failed: 'Could not read calendar schedule',
  },
  calendar_create_event: {
    running: 'Adding appointment to your calendar...',
    completed: 'Added new calendar appointment',
    failed: 'Could not create calendar event',
  },
  shopping_get_list: {
    running: 'Reviewing your shopping list...',
    completed: 'Checked your current shopping list',
    failed: 'Could not retrieve shopping items',
  },
  shopping_add_item: {
    running: 'Adding supplies to your shopping list...',
    completed: 'Updated your shopping list with new items',
    failed: 'Could not update shopping list',
  },
  mcp_tool_create: {
    running: 'Configuring new device integration...',
    completed: 'Integrated new smart device',
    failed: 'Device integration failed security check',
  },
  mcp_tool_test: {
    running: 'Verifying device safety in sandbox...',
    completed: 'Tested device safety response',
    failed: 'Device sandbox test failed',
  },
  device_reboot: {
    running: 'Rebooting smart device...',
    completed: 'Restarted device successfully',
    failed: 'Device reboot failed',
  },
  device_get_info: {
    running: 'Reading device diagnostics...',
    completed: 'Retrieved device diagnostics',
    failed: 'Could not read device diagnostics',
  },
  user_get_preferences: {
    running: 'Applying your personalized preferences...',
    completed: 'Loaded your household preferences',
    failed: 'Could not load user preferences',
  },
};

function formatConversationalStep(text: string, status: 'running' | 'completed' | 'failed' | 'suspended') {
  for (const [toolKey, mapping] of Object.entries(CONVERSATIONAL_ACTIONS)) {
    if (text.includes(toolKey)) {
      if (status === 'running') return mapping.running;
      if (status === 'completed') return mapping.completed;
      if (status === 'failed') return mapping.failed;
    }
  }

  // Friendly fallback formatting
  let clean = text
    .replace('Running ', '')
    .replace('Completed ', '')
    .replace('Failed ', '')
    .replace(/_/g, ' ');

  if (status === 'running') return `Working on ${clean}...`;
  if (status === 'completed') return `Completed ${clean}`;
  return clean;
}

function formatIntentLabel(intent: string) {
  const map: Record<string, string> = {
    movie_night: 'Movie Night',
    house_prep: 'Hosting Guests',
    shopping: 'Shopping List',
    calendar: 'Calendar Event',
    tool_synthesis: 'Device Integration',
    general_automation: 'Smart Home Routine',
  };
  return map[intent] || intent.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ExecutionCard({ intent, steps, connected }: ExecutionCardProps) {
  return (
    <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-5 flex flex-col h-full overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-xs font-semibold tracking-wider text-zinc-300 uppercase">
            Assistant Activity
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              connected ? 'bg-emerald-400' : 'bg-rose-400'
            }`}
          />
          <span className="text-[11px] text-zinc-500 font-medium">
            {connected ? 'Active' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Goal Pill */}
      <div className="mb-4">
        {intent ? (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800/80 text-zinc-200 text-xs font-medium border border-zinc-700/50">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            <span>{formatIntentLabel(intent)}</span>
          </div>
        ) : (
          <div className="text-zinc-500 text-xs flex items-center gap-1.5">
            <Home className="w-3.5 h-3.5 text-zinc-600" />
            <span>Listening for instructions...</span>
          </div>
        )}
      </div>

      {/* Conversational Action Stream */}
      <div className="flex-1 overflow-y-auto mb-2 pr-1 space-y-2.5 min-h-[140px]">
        <AnimatePresence>
          {steps.map((step) => {
            const isRunning = step.status === 'running';
            const isCompleted = step.status === 'completed';
            const isFailed = step.status === 'failed';

            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`p-3 rounded-xl border flex items-start gap-2.5 transition-colors ${
                  isRunning
                    ? 'bg-indigo-500/5 border-indigo-500/20'
                    : isFailed
                    ? 'bg-rose-500/5 border-rose-500/20'
                    : 'bg-zinc-950/40 border-zinc-800/40'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {isCompleted && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  {isRunning && (
                    <motion.div
                      animate={{ scale: [1, 1.15, 1] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                    >
                      <Circle className="w-4 h-4 text-indigo-400 fill-indigo-400/20" />
                    </motion.div>
                  )}
                  {isFailed && <XCircle className="w-4 h-4 text-rose-400" />}
                </div>

                <div className="flex-1 min-w-0">
                  <p
                    className={`text-xs leading-relaxed ${
                      isCompleted
                        ? 'text-zinc-200'
                        : isRunning
                        ? 'text-indigo-200'
                        : 'text-rose-300'
                    }`}
                  >
                    {formatConversationalStep(step.text, step.status)}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {steps.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center py-6 text-center text-zinc-500 text-xs">
            <p>Your home is quiet and ready.</p>
            <p className="text-[11px] text-zinc-600 mt-1">Speak or tap a routine to begin.</p>
          </div>
        )}
      </div>
    </div>
  );
}
