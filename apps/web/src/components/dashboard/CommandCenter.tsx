'use client';

import { useState } from 'react';
import { useAgentStream } from '../../hooks/useAgentStream';
import { ExecutionCard } from '../agent/ExecutionCard';
import { HardwareSimulator } from '../devices/HardwareSimulator';
import { FireTVSimulator } from '../media/FireTVSimulator';
import { VoiceInput } from '../voice/VoiceInput';
import { DemoCommands } from '../dev/DemoCommands';
import { Send, Loader2, Activity } from 'lucide-react';

export function CommandCenter() {
  const agentStream = useAgentStream();
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCommand = async (command: string) => {
    if (!command.trim()) return;
    setIsSubmitting(true);
    setInput('');
    
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: command }),
      });
      
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        console.warn('[Chat] Request failed:', errJson);
      }
    } catch (e: any) {
      console.warn('[Chat] Network error submitting command:', e.message || e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto p-4 md:p-8 flex flex-col min-h-screen gap-8">
      {/* Header */}
      <header className="flex items-center justify-between pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-500" />
            HOMEPILOT
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Goal-Oriented AI Home Agent</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold tracking-widest text-zinc-400">
          <span className={`w-2 h-2 rounded-full ${agentStream.connected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          SYSTEM {agentStream.connected ? 'ONLINE' : 'OFFLINE'}
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Command & Execution */}
        <div className="lg:col-span-4 flex flex-col gap-8">
          
          {/* Command Input Area */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-lg">
            <h2 className="text-sm font-semibold tracking-wider text-zinc-400 mb-4">COMMAND</h2>
            
            <form 
              onSubmit={(e) => { e.preventDefault(); handleCommand(input); }}
              className="relative mb-4"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="What would you like your home to do?"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-4 pr-12 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                disabled={isSubmitting}
              />
              <button 
                type="submit"
                disabled={isSubmitting || !input.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-zinc-400 hover:text-white disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>

            <VoiceInput onCommand={handleCommand} />
          </section>

          {/* Demos */}
          <section className="mt-2">
             <DemoCommands onCommand={handleCommand} isLoading={isSubmitting} />
          </section>

          {/* Execution Card */}
          <section className="flex-1 min-h-[350px]">
            <ExecutionCard 
              intent={agentStream.currentIntent}
              steps={agentStream.agentSteps}
              latencyMs={agentStream.latencyMs}
              modelId={agentStream.modelId}
              connected={agentStream.connected}
            />
          </section>
        </div>

        {/* Right Column: Simulators */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          
          {/* Hardware Simulator (Lights & Climate) */}
          <section className="h-[350px]">
             <HardwareSimulator deviceStates={agentStream.deviceStates} />
          </section>

          {/* Fire TV Simulator */}
          <section className="flex-1 min-h-[250px]">
             <FireTVSimulator deviceStates={agentStream.deviceStates} />
          </section>

        </div>
      </main>
    </div>
  );
}
