'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, Loader2 } from 'lucide-react';

export function VoiceInput({ onCommand }: { onCommand: (cmd: string) => void }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setSupported(false);
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };

      recognition.onend = () => {
        if (isListening) {
          // If it ended automatically but we still thought we were listening, grab the last transcript.
          // In practice, we handle the final submission via a manual stop or when the user stops talking.
          if (transcript.trim().length > 0) {
            onCommand(transcript.trim());
          }
          setIsListening(false);
          setTranscript('');
        }
      };

      recognition.onerror = (e: any) => {
        console.error('Speech recognition error:', e.error);
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [isListening, transcript, onCommand]);

  const toggleListening = () => {
    if (!supported) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      if (transcript.trim().length > 0) {
        onCommand(transcript.trim());
      }
      setTranscript('');
    } else {
      setTranscript('');
      setIsListening(true);
      recognitionRef.current?.start();
    }
  };

  if (!supported) {
    return (
      <div className="text-xs text-rose-500/80 bg-rose-500/10 px-3 py-2 rounded-md border border-rose-500/20">
        Voice input is not supported in this browser.
      </div>
    );
  }

  return (
    <div className="relative">
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute bottom-full mb-4 left-0 right-0 bg-zinc-900 border border-zinc-700 p-4 rounded-xl shadow-2xl overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-indigo-500 opacity-50" />
            <div className="flex items-center gap-3 mb-2 text-emerald-400">
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="w-2 h-2 rounded-full bg-emerald-500"
              />
              <span className="text-xs font-semibold tracking-wider">LISTENING...</span>
            </div>
            <p className="text-sm text-zinc-200 italic h-10 overflow-hidden">
              {transcript || "Listening for command..."}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={toggleListening}
        className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all duration-300 border ${
          isListening 
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20' 
            : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white'
        }`}
      >
        {isListening ? (
          <>
            <Square className="w-4 h-4 fill-current" /> Stop Listening
          </>
        ) : (
          <>
            <Mic className="w-4 h-4" /> Use Voice Input
          </>
        )}
      </button>
    </div>
  );
}
