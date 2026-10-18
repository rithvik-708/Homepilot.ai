'use client';

import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, Check, X, AlertTriangle } from 'lucide-react';

export interface ConsequenceContractCardProps {
  interruptId?: string;
  toolName: string;
  plainTitle: string;
  consequenceSummary: string;
  safetyRules: string[];
  onDecide?: (decision: 'approved' | 'rejected') => void;
}

export const ConsequenceContractCard: React.FC<ConsequenceContractCardProps> = ({
  interruptId,
  toolName,
  plainTitle,
  consequenceSummary,
  safetyRules,
  onDecide,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [decisionMade, setDecisionMade] = useState<'approved' | 'rejected' | null>(null);

  const handleDecision = async (decision: 'approved' | 'rejected') => {
    setSubmitting(true);
    try {
      if (interruptId) {
        await fetch('/api/agent/interrupt/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ interruptId, decision }),
        });
      } else {
        await fetch('/api/tool-approval', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ toolName, decision }),
        });
      }
      setDecisionMade(decision);
      onDecide?.(decision);
    } catch (err) {
      console.error('[ConsequenceContract] Failed to submit decision:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (decisionMade === 'approved') {
    return (
      <div className="border border-emerald-500/40 bg-zinc-900/90 rounded-xl p-5 text-white max-w-lg mx-auto shadow-lg animate-in fade-in">
        <div className="flex items-center space-x-3 text-emerald-400">
          <ShieldCheck className="w-6 h-6" />
          <h3 className="font-bold text-sm">Action Authorized</h3>
        </div>
        <p className="text-xs text-zinc-400 mt-1">
          Dynamic capability for &apos;{toolName}&apos; has been registered and activated.
        </p>
      </div>
    );
  }

  if (decisionMade === 'rejected') {
    return (
      <div className="border border-rose-500/40 bg-zinc-900/90 rounded-xl p-5 text-white max-w-lg mx-auto shadow-lg animate-in fade-in">
        <div className="flex items-center space-x-3 text-rose-400">
          <ShieldAlert className="w-6 h-6" />
          <h3 className="font-bold text-sm">Action Denied</h3>
        </div>
        <p className="text-xs text-zinc-400 mt-1">
          Tool &apos;{toolName}&apos; has been safely blocked and marked deprecated.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-amber-500/40 bg-zinc-900/95 rounded-xl p-5 shadow-2xl text-white max-w-lg mx-auto">
      <div className="flex items-center space-x-3 mb-3">
        <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400 border border-amber-500/20">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Security Clearance Required</span>
          <h3 className="text-sm font-bold text-zinc-100">{plainTitle}</h3>
        </div>
      </div>

      <p className="text-xs text-zinc-300 mb-4 leading-relaxed bg-zinc-950/60 p-3 rounded-lg border border-zinc-800">
        {consequenceSummary}
      </p>

      <div className="rounded-lg p-3 mb-4 bg-zinc-950/40 border border-zinc-800/80 text-[11px] space-y-2 text-zinc-400">
        <div className="font-semibold text-zinc-300 uppercase tracking-wide text-[10px] flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Automated Safety Guardrails Enforced:</span>
        </div>
        {safetyRules.map((rule, idx) => (
          <div key={idx} className="flex items-start space-x-2 pl-1">
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
            <span className="text-zinc-300">{rule}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
        <span className="text-[11px] text-zinc-500">Decide physical authorization</span>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleDecision('rejected')}
            disabled={submitting}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition disabled:opacity-50"
          >
            <X className="w-3.5 h-3.5" />
            <span>Deny</span>
          </button>
          <button
            onClick={() => handleDecision('approved')}
            disabled={submitting}
            className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-lg shadow-amber-600/30 transition disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Authorize Action</span>
          </button>
        </div>
      </div>
    </div>
  );
};

