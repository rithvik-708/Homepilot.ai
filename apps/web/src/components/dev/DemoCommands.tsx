'use client';

import { Play, Sparkles } from 'lucide-react';

interface DemoCommand {
  category: string;
  title: string;
  command: string;
  badge?: string;
  badgeColor?: string;
}

const DEMOS: DemoCommand[] = [
  {
    category: 'Autonomous Tool Synthesis & HITL Clearance',
    title: 'Integrate Smart Deadbolt (Class 4 Clearance)',
    command: 'I installed a new Yale Smart Deadbolt at https://locks.internal/unlock. Integrate it as a tool and unlock the front door.',
    badge: 'Class 4 HITL',
    badgeColor: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  },
  {
    category: 'Autonomous Tool Synthesis & HITL Clearance',
    title: 'Integrate Space Heater (Class 3 Clearance)',
    command: 'Connect to the high-wattage garage space heater at https://devices.internal/heater and turn on max heat.',
    badge: 'Class 3 HITL',
    badgeColor: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
  },
  {
    category: 'Autonomous Tool Synthesis & HITL Clearance',
    title: 'Connect Air Quality Sensor (Class 0 Auto-Approved)',
    command: 'Connect to the outdoor particulate sensor at https://sensors.internal/aqi and report current AQI index.',
    badge: 'Class 0 Auto',
    badgeColor: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  },
  {
    category: 'Multi-Tool Smart Home Routines',
    title: 'Movie Night Routine',
    command: 'Get everything ready for movie night in the living room.',
    badge: 'Multi-Tool',
    badgeColor: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10',
  },
  {
    category: 'Multi-Tool Smart Home Routines',
    title: 'Host Guests Prep',
    command: 'My parents are arriving tomorrow at 11 AM. Get the house ready.',
    badge: 'Multi-Tool',
    badgeColor: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10',
  },
];

export function DemoCommands({ onCommand, isLoading }: { onCommand: (cmd: string) => void, isLoading: boolean }) {
  const toolSynthesisDemos = DEMOS.filter((d) => d.category.includes('Autonomous'));
  const routineDemos = DEMOS.filter((d) => d.category.includes('Routines'));

  return (
    <div className="flex flex-col gap-4">
      {/* Dynamic Tool Synthesis & Interrupt Verification Prompts */}
      <div>
        <div className="text-xs text-indigo-400 font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          Autonomous Tool Synthesis Prompts
        </div>
        <div className="flex flex-col gap-2">
          {toolSynthesisDemos.map((demo) => (
            <button
              key={demo.title}
              disabled={isLoading}
              onClick={() => onCommand(demo.command)}
              className="flex items-center justify-between bg-zinc-900/80 hover:bg-zinc-800/80 border border-zinc-800 hover:border-zinc-700 text-zinc-200 text-xs px-3.5 py-2.5 rounded-lg transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-2">
                <Play className="w-3 h-3 text-indigo-400 shrink-0" />
                <span className="font-medium">{demo.title}</span>
              </div>
              {demo.badge && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${demo.badgeColor}`}>
                  {demo.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Routine Demos */}
      <div>
        <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-2">Standard Agent Routines</div>
        <div className="flex flex-wrap gap-2">
          {routineDemos.map((demo) => (
            <button
              key={demo.title}
              disabled={isLoading}
              onClick={() => onCommand(demo.command)}
              className="flex items-center gap-2 bg-zinc-800/50 hover:bg-zinc-700/80 border border-zinc-700/50 text-zinc-300 text-xs px-3.5 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-3 h-3" />
              {demo.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
