'use client';

import { Play, Sparkles, Film, Users } from 'lucide-react';

interface Routine {
  title: string;
  description: string;
  command: string;
  icon: typeof Film;
}

const ROUTINES: Routine[] = [
  {
    title: 'Movie Night',
    description: 'Dim living room lights & start Fire TV',
    command: 'Get everything ready for movie night in the living room.',
    icon: Film,
  },
  {
    title: 'Host Guests Prep',
    description: 'Check calendar, prep climate & guest towels',
    command: 'My parents are arriving tomorrow at 11 AM. Get the house ready.',
    icon: Users,
  },
];

export function QuickActions({
  onCommand,
  isLoading,
}: {
  onCommand: (cmd: string) => void;
  isLoading: boolean;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
        One-Tap Routines
      </div>

      <div className="flex flex-col gap-2">
        {ROUTINES.map((routine) => {
          const Icon = routine.icon;
          return (
            <button
              key={routine.title}
              disabled={isLoading}
              onClick={() => onCommand(routine.command)}
              className="group flex items-center justify-between p-3 rounded-xl bg-zinc-900/60 hover:bg-zinc-800/60 border border-zinc-800/60 hover:border-zinc-700/60 text-left transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500/20 transition-colors">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-zinc-200 group-hover:text-white">
                    {routine.title}
                  </div>
                  <div className="text-[11px] text-zinc-400 leading-snug">
                    {routine.description}
                  </div>
                </div>
              </div>
              <div className="w-6 h-6 rounded-full bg-zinc-800/80 flex items-center justify-center text-zinc-400 group-hover:text-indigo-400 group-hover:bg-indigo-500/10 transition-colors">
                <Play className="w-3 h-3 fill-current ml-0.5" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
