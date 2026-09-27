'use client';

import { Play } from 'lucide-react';

const DEMOS = [
  {
    title: 'Movie Night',
    command: 'Get everything ready for movie night.',
  },
  {
    title: 'Host Guests',
    command: 'My parents are coming tomorrow. Make the house ready.',
  },
  {
    title: 'Make Evening Better',
    command: "I'm tired. Make the evening better.",
  }
];

export function DemoCommands({ onCommand, isLoading }: { onCommand: (cmd: string) => void, isLoading: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-2">Quick Demos</div>
      <div className="flex flex-wrap gap-2">
        {DEMOS.map((demo) => (
          <button
            key={demo.title}
            disabled={isLoading}
            onClick={() => onCommand(demo.command)}
            className="flex items-center gap-2 bg-zinc-800/50 hover:bg-zinc-700/80 border border-zinc-700/50 text-zinc-300 text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-3.5 h-3.5" />
            {demo.title}
          </button>
        ))}
      </div>
    </div>
  );
}
