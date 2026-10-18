'use client';

import { useState } from 'react';
import { useAgentStream } from '../../hooks/useAgentStream';
import { ExecutionCard } from '../agent/ExecutionCard';
import { ConsequenceContractCard } from '../agent/ConsequenceContractCard';
import { HardwareSimulator } from '../devices/HardwareSimulator';
import { FireTVSimulator } from '../media/FireTVSimulator';
import { VoiceInput } from '../voice/VoiceInput';
import { QuickActions } from './QuickActions';
import { DeviceIntegrations } from '../dev/DemoCommands';
import { Send, Loader2, Home, SlidersHorizontal, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function CommandCenter() {
  const agentStream = useAgentStream();
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'settings'>('home');

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
    <div className="max-w-[1520px] mx-auto p-4 md:p-6 lg:p-8 flex flex-col min-h-screen gap-6">
      {/* Header with Navigation Tabs */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-800/50 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              HOMEPILOT
            </h1>
            <p className="text-xs text-zinc-400">Intelligent Smart Home Assistant</p>
          </div>
        </div>

        {/* Center Tabs: My Home & Settings */}
        <div className="flex items-center self-start sm:self-center bg-zinc-950/60 p-1 rounded-xl border border-zinc-800/60">
          <button
            onClick={() => setActiveTab('home')}
            className={`relative flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'home' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {activeTab === 'home' && (
              <motion.div
                layoutId="activeTabBadge"
                className="absolute inset-0 bg-zinc-800 rounded-lg shadow-sm"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <Home className="w-3.5 h-3.5" />
              My Home
            </span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`relative flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'settings' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {activeTab === 'settings' && (
              <motion.div
                layoutId="activeTabBadge"
                className="absolute inset-0 bg-zinc-800 rounded-lg shadow-sm"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Settings
            </span>
          </button>
        </div>

        {/* Calm System Status Indicator */}
        <div className="flex items-center gap-2 text-[11px] font-medium tracking-wide text-zinc-400">
          <span
            className={`w-2 h-2 rounded-full ${
              agentStream.connected ? 'bg-emerald-400' : 'bg-rose-400'
            }`}
          />
          <span>{agentStream.connected ? 'System Ready' : 'Connecting...'}</span>
        </div>
      </header>

      {/* Main Tab Views */}
      <AnimatePresence mode="wait">
        {activeTab === 'home' ? (
          <motion.main
            key="home-tab"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* Left Column (3 Columns): Command & Assistant */}
            <div className="lg:col-span-3 flex flex-col gap-5">
              {/* Command Box */}
              <section className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleCommand(input);
                  }}
                  className="relative"
                >
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask Homepilot anything..."
                    className="w-full bg-zinc-950/70 border border-zinc-800/70 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                    disabled={isSubmitting}
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting || !input.trim()}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-zinc-400 hover:text-white disabled:opacity-40 transition-colors"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                  </button>
                </form>

                <VoiceInput onCommand={handleCommand} />
              </section>

              {/* One-Tap Routines */}
              <section>
                <QuickActions onCommand={handleCommand} isLoading={isSubmitting} />
              </section>

              {/* Security Approval Prompt (Consequence Contract) */}
              {(agentStream.activeInterrupt || agentStream.pendingApproval) && (
                <section className="animate-in fade-in slide-in-from-top-2 duration-200">
                  <ConsequenceContractCard
                    interruptId={agentStream.activeInterrupt?.interruptId}
                    toolName={
                      agentStream.activeInterrupt?.toolName ||
                      agentStream.pendingApproval?.toolName ||
                      'unknown_tool'
                    }
                    plainTitle={
                      agentStream.activeInterrupt?.contract?.plainTitle ||
                      agentStream.pendingApproval?.contract.plainTitle ||
                      'Action Authorization'
                    }
                    consequenceSummary={
                      agentStream.activeInterrupt?.contract?.consequenceSummary ||
                      agentStream.pendingApproval?.contract.consequenceSummary ||
                      'The assistant is requesting permission to operate physical hardware.'
                    }
                    safetyRules={
                      agentStream.activeInterrupt?.contract?.safetyRules ||
                      agentStream.pendingApproval?.contract.safetyRules ||
                      []
                    }
                  />
                </section>
              )}

              {/* Assistant Activity Card */}
              <section className="flex-1 min-h-[300px]">
                <ExecutionCard
                  intent={agentStream.currentIntent}
                  steps={agentStream.agentSteps}
                  connected={agentStream.connected}
                />
              </section>
            </div>

            {/* Right Column (9 Columns): Living Hardware & Media Simulators */}
            <div className="lg:col-span-9 flex flex-col gap-6">
              {/* Hardware Simulator (Smart Lights & HVAC) */}
              <section className="min-h-[340px]">
                <HardwareSimulator deviceStates={agentStream.deviceStates} />
              </section>

              {/* Fire TV Media Simulator */}
              <section className="flex-1 min-h-[280px]">
                <FireTVSimulator deviceStates={agentStream.deviceStates} />
              </section>
            </div>
          </motion.main>
        ) : (
          <motion.main
            key="settings-tab"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col gap-6 max-w-5xl mx-auto w-full"
          >
            {/* Device Integration Section */}
            <DeviceIntegrations onCommand={handleCommand} isLoading={isSubmitting} />

            {/* Running Interrupt Prompt inside Settings if triggered here */}
            {(agentStream.activeInterrupt || agentStream.pendingApproval) && (
              <section className="animate-in fade-in slide-in-from-top-2 duration-200 max-w-xl mx-auto w-full">
                <ConsequenceContractCard
                  interruptId={agentStream.activeInterrupt?.interruptId}
                  toolName={
                    agentStream.activeInterrupt?.toolName ||
                    agentStream.pendingApproval?.toolName ||
                    'unknown_tool'
                  }
                  plainTitle={
                    agentStream.activeInterrupt?.contract?.plainTitle ||
                    agentStream.pendingApproval?.contract.plainTitle ||
                    'Action Authorization'
                  }
                  consequenceSummary={
                    agentStream.activeInterrupt?.contract?.consequenceSummary ||
                    agentStream.pendingApproval?.contract.consequenceSummary ||
                    'The assistant is requesting permission to operate physical hardware.'
                  }
                  safetyRules={
                    agentStream.activeInterrupt?.contract?.safetyRules ||
                    agentStream.pendingApproval?.contract.safetyRules ||
                    []
                  }
                />
              </section>
            )}
          </motion.main>
        )}
      </AnimatePresence>
    </div>
  );
}
