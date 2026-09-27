'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Tv, Play, Film, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { DeviceStates } from '../../types/events';

type FireTVSimulatorProps = {
  deviceStates: DeviceStates;
};

export function FireTVSimulator({ deviceStates }: FireTVSimulatorProps) {
  const [currentTime, setCurrentTime] = useState('');
  
  // Look for any zone playing media
  const playingZone = Object.values(deviceStates).find(state => state.status === 'playing' || state.status === 'paused');
  const isPlaying = playingZone?.status === 'playing';
  const isPaused = playingZone?.status === 'paused';
  const title = playingZone?.title || 'Unknown Title';

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden h-full flex flex-col shadow-2xl relative">
      <div className="bg-zinc-950 px-4 py-3 border-b border-zinc-800/80 flex items-center justify-between z-20">
        <div className="flex items-center gap-2">
          <Tv className="w-4 h-4 text-zinc-500" />
          <span className="text-xs font-semibold tracking-widest text-zinc-400">FIRE TV</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
          <Clock className="w-3.5 h-3.5" />
          {currentTime}
        </div>
      </div>

      <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait">
          {(!isPlaying && !isPaused) ? (
            <motion.div
              key="standby"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center text-zinc-700"
            >
              <Film className="w-12 h-12 mb-4 opacity-50" />
              <div className="text-sm font-medium tracking-widest uppercase">Standby</div>
            </motion.div>
          ) : (
            <motion.div
              key="playing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col"
            >
              {/* Cinematic Background Gradient */}
              <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/40 via-black to-black z-0" />
              
              <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-8">
                <div className="text-[10px] text-indigo-400 font-semibold tracking-[0.2em] mb-4 border border-indigo-500/30 px-3 py-1 rounded-full bg-indigo-500/10">
                  NOW PLAYING
                </div>
                
                <h2 className="text-3xl font-bold text-white mb-8 tracking-wide text-center max-w-full truncate px-4">
                  {title}
                </h2>

                {/* Fake Audio Waveform */}
                <div className="flex items-end justify-center gap-1.5 h-12 mb-8">
                  {[...Array(16)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="w-1.5 bg-indigo-500/80 rounded-t-sm"
                      initial={{ height: '20%' }}
                      animate={isPlaying ? { 
                        height: ['20%', `${Math.random() * 80 + 20}%`, '20%'] 
                      } : { height: '20%' }}
                      transition={{ 
                        repeat: isPlaying ? Infinity : 0, 
                        duration: 0.8 + Math.random() * 0.5,
                        ease: "easeInOut"
                      }}
                    />
                  ))}
                </div>

                {/* Progress Bar */}
                <div className="w-3/4 max-w-md flex items-center gap-3 text-xs text-zinc-400 font-medium">
                  <span>01:24</span>
                  <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden relative">
                    <motion.div 
                      className="absolute top-0 left-0 bottom-0 bg-indigo-500"
                      initial={{ width: '30%' }}
                      animate={isPlaying ? { width: '100%' } : {}}
                      transition={{ duration: 7200, ease: "linear" }}
                    />
                  </div>
                  <span>02:49</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
