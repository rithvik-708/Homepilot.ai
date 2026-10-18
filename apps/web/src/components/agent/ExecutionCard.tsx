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

// Conversational first-person mapping for raw backend actions
export const TOOL_LABELS: Record<
  string,
  { completed: string; running: string; failed: string }
> = {
  home_set_environment: {
    completed: "I've set the living room to 21°C and adjusted the lighting",
    running: "I'm adjusting the living room climate and lighting...",
    failed: "I couldn't adjust the climate and lighting",
  },
  home_get_state: {
    completed: "I've checked the current room temperatures and lights",
    running: "I'm checking the room temperatures and lights...",
    failed: "I couldn't read the room conditions",
  },
  media_launch_playback: {
    completed: "I've started playback on Fire TV",
    running: "I'm launching your stream on Fire TV...",
    failed: "I couldn't launch playback on Fire TV",
  },
  media_pause_playback: {
    completed: "I've paused Fire TV playback",
    running: "I'm pausing Fire TV playback...",
    failed: "I couldn't pause playback on Fire TV",
  },
  calendar_get_schedule: {
    completed: "I've checked your household calendar schedule",
    running: "I'm reviewing your calendar schedule...",
    failed: "I couldn't read your calendar schedule",
  },
  calendar_create_event: {
    completed: "I've added the event to your calendar",
    running: "I'm scheduling the event on your calendar...",
    failed: "I couldn't create the calendar event",
  },
  shopping_get_list: {
    completed: "I've retrieved your shopping list",
    running: "I'm reviewing your shopping list...",
    failed: "I couldn't fetch your shopping list",
  },
  shopping_add_item: {
    completed: "I've added the requested items to your shopping list",
    running: "I'm adding items to your shopping list...",
    failed: "I couldn't update the shopping list",
  },
  mcp_tool_create: {
    completed: "I've configured and connected the new smart device",
    running: "I'm setting up the new smart device...",
    failed: "The device setup failed security checks",
  },
  mcp_tool_test: {
    completed: "I've verified the device safety in the sandbox",
    running: "I'm testing the device safety in the sandbox...",
    failed: "The device sandbox test failed",
  },
  mcp_tool_delete: {
    completed: "I've removed the device integration",
    running: "I'm removing the device integration...",
    failed: "I couldn't remove the device integration",
  },
  device_reboot: {
    completed: "I've restarted the smart device",
    running: "I'm restarting the smart device...",
    failed: "I couldn't restart the smart device",
  },
  device_get_info: {
    completed: "I've retrieved the device details",
    running: "I'm reading the device details...",
    failed: "I couldn't retrieve device details",
  },
  user_get_preferences: {
    completed: "I've loaded your personalized home preferences",
    running: "I'm reading your home preferences...",
    failed: "I couldn't load your preferences",
  },
  user_update_preferences: {
    completed: "I've updated your home preferences",
    running: "I'm saving your home preferences...",
    failed: "I couldn't update your preferences",
  },
};

function formatConversationalStep(
  text: string,
  status: 'running' | 'completed' | 'failed' | 'suspended'
) {
  for (const [toolKey, label] of Object.entries(TOOL_LABELS)) {
    if (text.includes(toolKey)) {
      if (status === 'running') return label.running;
      if (status === 'failed') return label.failed;
      return label.completed;
    }
  }

  // Friendly first-person fallback
  const clean = text
    .replace('Running ', '')
    .replace('Completed ', '')
    .replace('Failed ', '')
    .replace(/_/g, ' ');

  if (status === 'running') return `I'm working on ${clean}...`;
  if (status === 'failed') return `I couldn't complete ${clean}`;
  return `I've completed ${clean}`;
}

function formatIntentLabel(intent: string) {
  const map: Record<string, string> = {
    movie_night: 'Movie Night',
    house_prep: 'Hosting Guests',
    shopping: 'Shopping List',
    calendar: 'Calendar Event',
    tool_synthesis: 'Device Setup',
    general_automation: 'Smart Home Routine',
  };
  return map[intent] || intent.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ExecutionCard({ intent, steps, connected }: ExecutionCardProps) {
  return (
    <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-2xl p-5 flex flex-col h-full overflow-hidden shadow-sm">
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

      {/* Goal Pill (Soft pastel styling without glowing shadows) */}
      <div className="mb-4">
        {intent ? (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800/80 text-zinc-200 text-xs font-medium border border-zinc-700/40">
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
                exit={{ opacity: 0, y: -4 }}
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
