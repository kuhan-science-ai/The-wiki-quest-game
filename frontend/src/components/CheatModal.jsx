import React from 'react';
import { AlertOctagon, Skull, ShieldAlert, Sparkles } from 'lucide-react';

export default function CheatModal({ alert, onClose }) {
  if (!alert) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in-up">
      <div 
        className="relative max-w-md w-full glass-panel border-2 border-red-500 shadow-2xl shadow-red-950/40 rounded-2xl p-6 text-center animate-scale-in"
      >
        {/* Warning Icon */}
        <div className="mx-auto w-16 h-16 rounded-full bg-red-950/60 border-2 border-red-500 flex items-center justify-center mb-6 text-red-500 animate-pulse">
          <AlertOctagon className="w-8 h-8" />
        </div>

        {/* Header */}
        <h2 className="text-2xl font-extrabold text-red-500 tracking-wide mb-2 flex items-center justify-center gap-2">
          <ShieldAlert className="w-6 h-6" /> PORTAL DEFENSE ACTIVATED
        </h2>
        
        <div className="text-xs font-semibold text-red-400 uppercase tracking-widest mb-4">
          Warp Detected: {alert.fromPage || 'Unknown'} ➔ {alert.toPage || 'Unknown'}
        </div>

        {/* Narrative Box */}
        <p className="text-slate-200 bg-red-950/20 border border-red-900/40 px-4 py-4 rounded-xl text-sm italic mb-5 leading-relaxed">
          "{alert.dmNarration || 'The fabric of time and space rejects your transition. A suspicious anomaly has been logged by the Dungeon Master.'}"
        </p>

        {/* Explanation */}
        <div className="bg-slate-950/60 rounded-xl p-4 border border-rpg-border/60 mb-6 text-left">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <Skull className="w-3.5 h-3.5 text-red-400" /> System Report
          </h4>
          <p className="text-xs text-slate-300">
            <strong>Reason:</strong> {alert.reason || 'Continuity validation failed or transition rate is too high.'}
          </p>
          <div className="mt-3 pt-3 border-t border-slate-900 flex justify-between text-[11px] text-red-400">
            <span>Penalty: Transition Cancelled</span>
            <span>XP Cost: 0 XP (Shielded)</span>
          </div>
        </div>

        {/* Bottom Button */}
        <button
          onClick={onClose}
          className="w-full py-3 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white font-bold rounded-xl shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          Recalibrate Portal (Dismiss)
        </button>
      </div>
    </div>
  );
}
