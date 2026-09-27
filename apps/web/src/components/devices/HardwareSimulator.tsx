'use client';

import { motion } from 'framer-motion';
import { Thermometer, Lightbulb } from 'lucide-react';
import { DeviceStates } from '../../types/events';

type HardwareSimulatorProps = {
  deviceStates: DeviceStates;
};

const DEFAULT_ZONES = [
  { id: 'living_room', name: 'Living Room', defaultTemp: 22, defaultLights: false },
  { id: 'guest_room', name: 'Guest Room', defaultTemp: 20, defaultLights: false },
  { id: 'entryway', name: 'Entryway', defaultTemp: 21, defaultLights: true },
];

export function HardwareSimulator({ deviceStates }: HardwareSimulatorProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 h-full flex flex-col">
      <h2 className="text-sm font-semibold tracking-wider text-zinc-400 mb-6">HOME STATE</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
        {DEFAULT_ZONES.map((zone) => {
          const state = deviceStates[zone.id] || {};
          const lightsOn = state.lightsOn ?? zone.defaultLights;
          const temp = state.temperature ?? zone.defaultTemp;
          const targetTemp = state.targetTemperature ?? temp;

          return (
            <div key={zone.id} className="bg-zinc-950/50 border border-zinc-800/80 rounded-lg p-4 relative overflow-hidden flex flex-col">
              {/* Light Background Glow Animation */}
              <motion.div
                className="absolute inset-0 bg-yellow-400 mix-blend-overlay pointer-events-none"
                animate={{ opacity: lightsOn ? 0.08 : 0 }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
              />

              <h3 className="text-xs font-semibold text-zinc-300 tracking-wider mb-4">{zone.name.toUpperCase()}</h3>

              <div className="flex flex-col gap-6 relative z-10 flex-1">
                {/* Lights Section */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-xs text-zinc-500 uppercase tracking-wider">
                      <Lightbulb className="w-3.5 h-3.5" /> Lights
                    </div>
                    <motion.div 
                      className={`text-xs font-bold px-2 py-0.5 rounded ${lightsOn ? 'bg-yellow-500/20 text-yellow-400' : 'bg-zinc-800 text-zinc-500'}`}
                      animate={{ color: lightsOn ? '#facc15' : '#71717a' }}
                    >
                      {lightsOn ? 'ON' : 'OFF'}
                    </motion.div>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-2">
                    <motion.div 
                      className="h-full bg-yellow-400"
                      initial={{ width: 0 }}
                      animate={{ width: lightsOn ? '78%' : '0%' }}
                      transition={{ duration: 0.8, ease: "easeInOut" }}
                    />
                  </div>
                </div>

                {/* Thermostat Section */}
                <div className="mt-auto">
                  <div className="flex items-center gap-2 text-xs text-zinc-500 uppercase tracking-wider mb-3">
                    <Thermometer className="w-3.5 h-3.5" /> Climate
                  </div>
                  <div className="flex items-center justify-center py-2">
                    <div className="relative w-20 h-20 rounded-full bg-zinc-900 border-4 border-zinc-800 flex items-center justify-center shadow-inner">
                      {/* Dial Indicator */}
                      <motion.div
                        className="absolute inset-[-4px] rounded-full border-4 border-transparent border-t-indigo-500"
                        animate={{ rotate: (targetTemp - 15) * 10 }}
                        transition={{ duration: 1, type: "spring" }}
                      />
                      <div className="text-center">
                        <motion.div 
                          className="text-xl font-light text-zinc-200"
                          key={targetTemp}
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          {targetTemp}°
                        </motion.div>
                        <div className="text-[9px] text-zinc-500 tracking-widest">TARGET</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
