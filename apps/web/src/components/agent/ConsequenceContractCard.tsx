'use client';

import React, { useState } from 'react';
import { Lock, ShieldCheck, Check, X } from 'lucide-react';

export interface ConsequenceContractCardProps {
  interruptId?: string;
  toolName: string;
  plainTitle: string;
  consequenceSummary: string;
  safetyRules?: string[];
  onDecide?: (decision: 'approved' | 'rejected') => void;
}

export const ConsequenceContractCard: React.FC<ConsequenceContractCardProps> = ({
  interruptId,
  toolName,
  plainTitle,
  consequenceSummary,
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
      <div className="border border-emerald-500/30 bg-zinc-900/90 rounded-2xl p-4 text-white shadow-sm animate-in fade-in">
        <div className="flex items-center gap-2.5 text-emerald-400">
          <ShieldCheck className="w-5 h-5 shrink-0" />
          <div>
            <h3 className="font-semibold text-xs">Action Approved</h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Permission granted to operate &apos;{plainTitle || toolName}&apos;.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (decisionMade === 'rejected') {
    return (
      <div className="border border-rose-500/30 bg-zinc-900/90 rounded-2xl p-4 text-white shadow-sm animate-in fade-in">
        <div className="flex items-center gap-2.5 text-rose-400">
          <Lock className="w-5 h-5 shrink-0" />
          <div>
            <h3 className="font-semibold text-xs">Action Denied</h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              The request for &apos;{plainTitle || toolName}&apos; was safely cancelled.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-zinc-700/40 bg-zinc-900/95 rounded-2xl p-4 shadow-xl text-white">
      {/* OS-Style Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20 shrink-0">
          <Lock className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400 block mb-0.5">
            High Security Action: Approval Required
          </span>
          <h3 className="text-xs font-semibold text-zinc-100 truncate">
            {plainTitle || `Authorize ${toolName}`}
          </h3>
        </div>
      </div>

      {/* Plain-English Consequence Summary (No Checklists or Technical Jargon) */}
      <div className="text-xs text-zinc-300 mb-4 leading-relaxed bg-zinc-950/50 p-3 rounded-xl border border-zinc-800/60">
        {consequenceSummary ||
          'Homepilot is requesting your permission to operate a physical security or high-wattage home device.'}
      </div>

      {/* Clean iOS/Android-Style Action Buttons */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800/60">
        <button
          onClick={() => handleDecision('rejected')}
          disabled={submitting}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition disabled:opacity-50"
        >
          <X className="w-3.5 h-3.5" />
          <span>Deny</span>
        </button>
        <button
          onClick={() => handleDecision('approved')}
          disabled={submitting}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition disabled:opacity-50 shadow-sm"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Approve</span>
        </button>
      </div>
    </div>
  );
};
