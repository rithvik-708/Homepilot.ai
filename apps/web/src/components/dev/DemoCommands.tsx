'use client';

import { useState } from 'react';
import { Lock, Flame, Wind, Plus, Play } from 'lucide-react';

interface DevicePreset {
  id: string;
  name: string;
  category: string;
  endpoint: string;
  description: string;
  prompt: string;
  buttonLabel: string;
  permissionLevel: 'Requires Approval' | 'Instant Setup';
  icon: typeof Lock;
}

const DEVICE_PRESETS: DevicePreset[] = [
  {
    id: 'deadbolt',
    name: 'Yale Smart Deadbolt',
    category: 'Perimeter Access',
    endpoint: 'https://locks.internal/unlock',
    description: 'Physical front door locking and unlocking control.',
    prompt: 'I installed a new Yale Smart Deadbolt at https://locks.internal/unlock. Integrate it as a tool and unlock the front door.',
    buttonLabel: 'Connect New Smart Lock',
    permissionLevel: 'Requires Approval',
    icon: Lock,
  },
  {
    id: 'heater',
    name: 'Garage Space Heater',
    category: 'Climate & Heat',
    endpoint: 'https://devices.internal/heater',
    description: 'High-wattage secondary thermal heater relay control.',
    prompt: 'Connect to the high-wattage garage space heater at https://devices.internal/heater and turn on max heat.',
    buttonLabel: 'Pair Space Heater',
    permissionLevel: 'Requires Approval',
    icon: Flame,
  },
  {
    id: 'aqi',
    name: 'Outdoor Air Quality Sensor',
    category: 'Environmental Sensor',
    endpoint: 'https://sensors.internal/aqi',
    description: 'Real-time air particulate and AQI index monitor.',
    prompt: 'Connect to the outdoor particulate sensor at https://sensors.internal/aqi and report current AQI index.',
    buttonLabel: 'Pair Climate Sensor',
    permissionLevel: 'Instant Setup',
    icon: Wind,
  },
];

export function DeviceIntegrations({
  onCommand,
  isLoading,
}: {
  onCommand: (cmd: string) => void;
  isLoading: boolean;
}) {
  const [customUrl, setCustomUrl] = useState('');

  const handleCustomConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim()) return;
    onCommand(`Connect to the new device endpoint at ${customUrl.trim()} and integrate it into Homepilot.`);
    setCustomUrl('');
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header Info */}
      <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Plus className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">Add New Device</h3>
            <p className="text-xs text-zinc-400">
              Homepilot automatically connects to your smart home endpoints using dynamic tool synthesis.
            </p>
          </div>
        </div>

        {/* Custom URL Input */}
        <form onSubmit={handleCustomConnect} className="mt-4 flex gap-2">
          <input
            type="url"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            placeholder="Enter device URL (e.g. https://sensors.internal/aqi)"
            className="flex-1 bg-zinc-950/70 border border-zinc-800/70 rounded-xl px-4 py-2.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !customUrl.trim()}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" /> Connect
          </button>
        </form>
      </div>

      {/* Verified Preset Integrations */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Smart Home Integrations
          </span>
          <span className="text-[11px] text-zinc-500">Tap to pair and test device</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {DEVICE_PRESETS.map((device) => {
            const Icon = device.icon;
            const isHighSecurity = device.permissionLevel === 'Requires Approval';

            return (
              <div
                key={device.id}
                className="bg-zinc-900/60 border border-zinc-800/50 rounded-2xl p-5 flex flex-col justify-between hover:border-zinc-700/60 transition-all duration-200 shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center text-zinc-200">
                      <Icon className="w-4 h-4 text-indigo-400" />
                    </div>
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                        isHighSecurity
                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                      }`}
                    >
                      {device.permissionLevel}
                    </span>
                  </div>

                  <h4 className="text-sm font-semibold text-zinc-100 mb-1">{device.name}</h4>
                  <div className="text-[11px] font-mono text-zinc-500 mb-2 truncate">
                    {device.endpoint}
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                    {device.description}
                  </p>
                </div>

                <button
                  onClick={() => onCommand(device.prompt)}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white text-xs font-medium transition-colors disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{device.buttonLabel}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Export for backward compatibility
export const DemoCommands = DeviceIntegrations;
