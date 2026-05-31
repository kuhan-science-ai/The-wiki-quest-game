import React from 'react';
import { Sparkles, Shield, Zap, BookOpen, Star, Trophy } from 'lucide-react';

const RARITY_COLORS = {
  Common: {
    text: 'text-slate-400',
    border: 'border-slate-500',
    bg: 'bg-slate-500/10',
    glow: 'shadow-slate-500/20',
    badge: 'bg-slate-700 text-slate-300',
  },
  Uncommon: {
    text: 'text-emerald-400',
    border: 'border-emerald-500',
    bg: 'bg-emerald-500/10',
    glow: 'shadow-emerald-500/20',
    badge: 'bg-emerald-800 text-emerald-300',
  },
  Rare: {
    text: 'text-blue-400',
    border: 'border-blue-500',
    bg: 'bg-blue-500/10',
    glow: 'shadow-blue-500/30',
    badge: 'bg-blue-800 text-blue-300',
  },
  Epic: {
    text: 'text-purple-400',
    border: 'border-purple-500',
    bg: 'bg-purple-500/10',
    glow: 'shadow-purple-500/40',
    badge: 'bg-purple-800 text-purple-300',
  },
  Legendary: {
    text: 'text-amber-400',
    border: 'border-amber-500',
    bg: 'bg-amber-500/10',
    glow: 'shadow-amber-500/50',
    badge: 'bg-amber-700 text-amber-100 animate-pulse',
  },
};

export default function LootModal({ item, onClose }) {
  if (!item) return null;

  const rarity = item.rarity || 'Common';
  const theme = RARITY_COLORS[rarity] || RARITY_COLORS.Common;

  // Choose icon based on effect
  const getEffectIcon = (effect) => {
    if ('STR' in effect) return <Zap className="w-5 h-5 text-rpg-str" />;
    if ('INT' in effect) return <BookOpen className="w-5 h-5 text-rpg-int" />;
    if ('CHA' in effect) return <Sparkles className="w-5 h-5 text-rpg-cha" />;
    if ('CON' in effect) return <Shield className="w-5 h-5 text-rpg-con" />;
    return <Trophy className="w-5 h-5 text-rpg-accent" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in-up">
      <div 
        className={`relative max-w-md w-full glass-panel border-2 rounded-2xl p-6 text-center shadow-2xl animate-scale-in ${theme.border} ${theme.glow}`}
      >
        {/* Particle sparkles in background */}
        <div className="absolute top-4 left-4 text-slate-600">
          <Sparkles className="w-6 h-6 animate-pulse" />
        </div>
        <div className="absolute top-4 right-4 text-slate-600">
          <Star className="w-5 h-5 animate-spin-slow" />
        </div>

        {/* Item Rarity Badge */}
        <span className={`inline-block px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider mb-4 ${theme.badge}`}>
          {rarity} LOOT DISCOVERED!
        </span>

        {/* Big Animated Item Token */}
        <div className={`mx-auto w-24 h-24 rounded-2xl border-2 flex items-center justify-center mb-6 relative overflow-hidden bg-slate-950/80 ${theme.border} animate-loot-glow`}>
          <div className="absolute inset-0 opacity-10 bg-gradient-to-tr from-transparent to-white"></div>
          {/* Choose central display icon */}
          {rarity === 'Legendary' || rarity === 'Epic' ? (
            <Trophy className={`w-12 h-12 ${theme.text}`} />
          ) : (
            <Shield className={`w-10 h-10 ${theme.text}`} />
          )}
        </div>

        {/* Item Info */}
        <h2 className={`text-2xl font-extrabold tracking-wide mb-2 ${theme.text}`}>
          {item.itemName}
        </h2>
        
        <p className="text-slate-300 italic text-sm px-4 mb-5 border-l-2 border-slate-700 bg-slate-900/40 py-2 rounded-r-lg">
          "{item.loreSnippet || 'An ancient artifact discovered in the depths of Wikipedia.'}"
        </p>

        {/* Stats Effects */}
        <div className="bg-slate-950/60 rounded-xl p-4 border border-rpg-border/60 mb-6">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Stat Bonuses</h4>
          <div className="flex flex-wrap gap-2 justify-center">
            {Object.entries(item.effect || {}).map(([stat, val]) => (
              <div key={stat} className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                {getEffectIcon({ [stat]: val })}
                <span className="font-bold text-sm text-slate-200">
                  {stat} +{val}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Button */}
        <button
          onClick={onClose}
          className="w-full py-3 bg-gradient-to-r from-rpg-primary to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-purple-900/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          Equip Item & Continue
        </button>
      </div>
    </div>
  );
}
