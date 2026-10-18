'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { ShieldCheck, Sparkles, Lock, ArrowRight, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [isLoadingAmazon, setIsLoadingAmazon] = useState(false);
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);

  const handleAmazonSignIn = async () => {
    setIsLoadingAmazon(true);
    try {
      await signIn('amazon', { callbackUrl: '/' });
    } catch (err) {
      console.error('Amazon sign in error:', err);
      setIsLoadingAmazon(false);
    }
  };

  const handleDemoSignIn = async () => {
    setIsLoadingDemo(true);
    try {
      await signIn('demo-amazon', { callbackUrl: '/' });
    } catch (err) {
      console.error('Demo sign in error:', err);
      setIsLoadingDemo(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-center items-center px-4 relative overflow-hidden selection:bg-zinc-800">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-[450px] h-[300px] bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-8 backdrop-blur-xl shadow-2xl relative z-10">
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center space-y-3 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center shadow-inner relative group">
            <ShieldCheck className="w-7 h-7 text-indigo-400 transition-transform group-hover:scale-110 duration-200" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-zinc-900 animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
              Homepilot
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono border border-indigo-500/30 font-medium">
                v2.0
              </span>
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Autonomous Smart Home Orchestration OS
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Sign in with Amazon Primary Button */}
          <button
            id="amazon-signin-btn"
            onClick={handleAmazonSignIn}
            disabled={isLoadingAmazon || isLoadingDemo}
            className="w-full py-3.5 px-4 bg-zinc-800 hover:bg-zinc-750 active:bg-zinc-700 border border-zinc-700/80 hover:border-amber-500/50 rounded-xl text-white font-medium flex items-center justify-center gap-3 transition-all duration-200 shadow-sm group hover:shadow-amber-500/10 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoadingAmazon ? (
              <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                <path
                  d="M13.9 12.8c-1.4 0-2.5-.2-3.4-.6-.9-.4-1.4-1-1.4-1.8 0-.9.6-1.5 1.7-1.9 1.1-.4 2.5-.5 4.1-.5h.6v1.4c0 1.1-.1 1.9-.3 2.4-.3.5-.7.8-1.3 1zm1.7-6.2c-.7-.3-1.6-.4-2.6-.4-1.7 0-3.1.4-4.2 1.3-1.1.9-1.6 2.1-1.6 3.6 0 1.2.4 2.2 1.1 3 .8.8 1.8 1.3 3.1 1.6 1.3.2 2.7.3 4.2.3.8 0 1.6-.1 2.3-.2v1.5c-.8.2-1.7.3-2.6.3-1.8 0-3.4-.2-5-.6-1.5-.4-2.8-1.2-3.8-2.3-1-1.1-1.5-2.5-1.5-4.1 0-1.8.6-3.3 1.8-4.5 1.2-1.2 2.8-1.8 4.8-1.8 1.2 0 2.4.2 3.6.5v1.8z"
                  fill="#FF9900"
                />
                <path
                  d="M18.8 18.2c-3.1 2.3-7.5 3.5-11.4 2.8-3.9-.7-7.2-2.7-8.9-5.1-.2-.2-.2-.5 0-.7.2-.2.5-.1.7.1 1.6 2.2 4.7 4.1 8.4 4.8 3.7.6 7.8-.5 10.8-2.6.3-.2.6-.1.8.2.2.3.1.6-.4.5z"
                  fill="#FF9900"
                />
                <path
                  d="M19.9 16.7c-.3-.4-1.8-.2-2.7-.1-.3 0-.3-.3-.1-.5 1.3-1 3.5-.7 3.8-.4.3.3.1 2.5-1.2 3.6-.2.2-.4.1-.3-.2.4-.8.8-2 .5-2.4z"
                  fill="#FF9900"
                />
              </svg>
            )}
            <span className="text-sm font-semibold tracking-wide">
              {isLoadingAmazon ? 'Connecting to Amazon...' : 'Sign in with Amazon'}
            </span>
          </button>

          {/* 1-Click Instant Demo Login (Dev/Demo fallback) */}
          <button
            id="demo-signin-btn"
            onClick={handleDemoSignIn}
            disabled={isLoadingAmazon || isLoadingDemo}
            className="w-full py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800/80 active:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-xl text-zinc-300 hover:text-white font-medium flex items-center justify-between text-xs transition-all duration-200 group cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 group-hover:rotate-12 transition-transform" />
              <span>Instant 1-Click Homeowner Access</span>
            </div>
            {isLoadingDemo ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />
            ) : (
              <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:translate-x-0.5 transition-transform" />
            )}
          </button>
        </div>

        {/* Security Assurance Badge */}
        <div className="mt-8 pt-6 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-500">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-zinc-400" />
            <span>Zero-Trust Ring 0-2 Security</span>
          </div>
          <span className="font-mono text-zinc-600">ID: Auth.js v5</span>
        </div>
      </div>
    </div>
  );
}
