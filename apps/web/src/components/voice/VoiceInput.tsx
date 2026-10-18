'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, X, AlertCircle } from 'lucide-react';

export function VoiceInput({ onCommand }: { onCommand: (cmd: string) => void }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [supported, setSupported] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const onCommandRef = useRef(onCommand);
  const isListeningRef = useRef(false);
  const transcriptRef = useRef('');

  // Keep callback reference updated without triggering re-initialization of SpeechRecognition
  useEffect(() => {
    onCommandRef.current = onCommand;
  }, [onCommand]);

  // Single mount effect: initialize SpeechRecognition once
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        isListeningRef.current = true;
        setIsListening(true);
        setErrorMessage(null);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        transcriptRef.current = currentTranscript;
        setTranscript(currentTranscript);
      };

      recognition.onend = () => {
        const wasListening = isListeningRef.current;
        isListeningRef.current = false;
        setIsListening(false);

        const finalSpeech = transcriptRef.current.trim();
        if (wasListening && finalSpeech.length > 0) {
          onCommandRef.current(finalSpeech);
        }
        transcriptRef.current = '';
        setTranscript('');
      };

      recognition.onerror = (e: any) => {
        const errorType = e.error || 'unknown';
        isListeningRef.current = false;
        setIsListening(false);

        if (errorType === 'no-speech') {
          // Normal timeout when user doesn't say anything - ignore silently
          return;
        }

        if (errorType === 'aborted') {
          // User or manual abort - ignore silently
          return;
        }

        if (errorType === 'network') {
          console.warn(
            '[VoiceInput] Speech recognition network notice (browser speech service unreachable or connection dropped).'
          );
          setErrorMessage('Voice recognition service is currently unreachable. Please type your command.');
          return;
        }

        if (errorType === 'not-allowed' || errorType === 'service-not-allowed') {
          setErrorMessage('Microphone access was denied. Please allow microphone permissions in your browser.');
          return;
        }

        console.warn('[VoiceInput] Speech recognition notice:', errorType);
        setErrorMessage(`Voice recognition unavailable (${errorType}). Please type your command.`);
      };

      recognitionRef.current = recognition;
    } catch (initErr) {
      console.warn('[VoiceInput] Failed to initialize SpeechRecognition:', initErr);
      setSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
        recognitionRef.current = null;
      }
    };
  }, []);

  const toggleListening = () => {
    if (!supported || !recognitionRef.current) return;
    setErrorMessage(null);

    if (isListening) {
      isListeningRef.current = false;
      setIsListening(false);
      try {
        recognitionRef.current.stop();
      } catch {
        try {
          recognitionRef.current.abort();
        } catch {}
      }

      const finalSpeech = transcriptRef.current.trim();
      if (finalSpeech.length > 0) {
        onCommandRef.current(finalSpeech);
      }
      transcriptRef.current = '';
      setTranscript('');
    } else {
      transcriptRef.current = '';
      setTranscript('');
      setErrorMessage(null);

      try {
        recognitionRef.current.start();
      } catch {
        // If recognition is in transition state, clean-up abort and restart cleanly
        try {
          recognitionRef.current.abort();
          setTimeout(() => {
            try {
              recognitionRef.current?.start();
            } catch (err: any) {
              setErrorMessage('Could not activate voice input. Please try again.');
            }
          }, 100);
        } catch {
          setErrorMessage('Could not activate voice input. Please try again.');
        }
      }
    }
  };

  if (!supported) {
    return (
      <div className="text-[11px] text-zinc-400 bg-zinc-950/40 px-3 py-2 rounded-xl border border-zinc-800/50">
        Voice input not supported on this browser. You can type commands above.
      </div>
    );
  }

  return (
    <div className="relative flex flex-col gap-2">
      {/* Listening Banner Overlay */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="absolute bottom-full mb-3 left-0 right-0 bg-zinc-900 border border-zinc-700/60 p-3.5 rounded-2xl shadow-xl overflow-hidden z-30"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-indigo-500 opacity-60" />
            <div className="flex items-center gap-2 mb-1.5 text-emerald-400">
              <motion.div
                animate={{ scale: [1, 1.25, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="w-2 h-2 rounded-full bg-emerald-400"
              />
              <span className="text-[11px] font-semibold tracking-wider uppercase">
                Listening...
              </span>
            </div>
            <p className="text-xs text-zinc-200 italic line-clamp-2 min-h-[1.5rem]">
              {transcript || 'Say your command...'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice Toggle Button */}
      <button
        type="button"
        onClick={toggleListening}
        className={`w-full flex items-center justify-center gap-2 py-2 px-3.5 rounded-xl text-xs font-semibold transition-all duration-200 border ${
          isListening
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
            : 'bg-zinc-800/80 border-zinc-700/50 text-zinc-300 hover:bg-zinc-700/80 hover:text-white shadow-sm'
        }`}
      >
        {isListening ? (
          <>
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Stop Listening</span>
          </>
        ) : (
          <>
            <Mic className="w-3.5 h-3.5 text-indigo-400" />
            <span>Use Voice Input</span>
          </>
        )}
      </button>

      {/* Graceful Network / Permission Error Message */}
      {errorMessage && (
        <div className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-xl flex items-start justify-between gap-2 animate-in fade-in">
          <div className="flex items-start gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <span className="leading-tight">{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-zinc-400 hover:text-zinc-200 shrink-0"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
