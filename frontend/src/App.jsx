import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  BookOpen, 
  Sparkles, 
  Heart, 
  MapPin, 
  Navigation, 
  Compass, 
  RotateCcw, 
  Terminal, 
  HelpCircle, 
  Skull, 
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  Award,
  Layers
} from 'lucide-react';
import LootModal from './components/LootModal';
import CheatModal from './components/CheatModal';

const API_BASE = 'http://127.0.0.1:8000';

const ZONE_DETAILS = {
  STR: { name: 'Strength', color: 'bg-red-500', text: 'text-red-400', border: 'border-red-500/30', desc: 'Boosted by history, war, and physics' },
  INT: { name: 'Intelligence', color: 'bg-blue-500', text: 'text-blue-400', border: 'border-blue-500/30', desc: 'Boosted by science, math, and theory' },
  CHA: { name: 'Charisma', color: 'bg-pink-500', text: 'text-pink-400', border: 'border-pink-500/30', desc: 'Boosted by culture, art, and music' },
  CON: { name: 'Constitution', color: 'bg-emerald-500', text: 'text-emerald-400', border: 'border-emerald-500/30', desc: 'Boosted by nature, biology, and crops' },
};

const LOADING_TIPS = [
  "Consulting the starchy oracle...",
  "Digging up deep-fried lore...",
  "Peeling back the layers of space-time...",
  "Running anti-cheat scans on your temporal footprint...",
  "Summoning the Dungeon Master...",
  "Harvesting page links from the digital fields...",
  "Spawning hidden artifacts in the footnotes..."
];

export default function App() {
  // Game state
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tipIndex, setTipIndex] = useState(0);

  // Player RPG state
  const [player, setPlayer] = useState({
    level: 1,
    xp: 0,
    xpNeeded: 100,
    stats: { STR: 10, INT: 10, CHA: 10, CON: 10 },
    inventory: []
  });

  // History path
  const [pathHistory, setPathHistory] = useState(['Potato']);

  // Coordinates
  const [gps, setGps] = useState({ latitude: 40.7128, longitude: -74.0060 });
  const [lastActionTimestamp, setLastActionTimestamp] = useState(Date.now() / 1000);

  // Modal control
  const [lootItem, setLootItem] = useState(null);
  const [cheatAlert, setCheatAlert] = useState(null);

  // Cheats / Dev variables
  const [cheatSpeedActive, setCheatSpeedActive] = useState(false);
  const [cheatTeleportActive, setCheatTeleportActive] = useState(false);
  const [showTooltip, setShowTooltip] = useState(null);

  // Rotate loading tips
  useEffect(() => {
    let interval;
    if (loading) {
      interval = setInterval(() => {
        setTipIndex((prev) => (prev + 1) % LOADING_TIPS.length);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [loading]);

  // Initial GPS lock
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGps({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        },
        (err) => console.log("GPS access denied. Using simulated coordinates.")
      );
    }
  }, []);

  // Initialize game on "Potato"
  useEffect(() => {
    loadPage('Potato', true);
  }, []);

  // Fetch page details from API
  const loadPage = async (pageTitle, isInitial = false) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/wiki/${encodeURIComponent(pageTitle)}`);
      if (!response.ok) {
        throw new Error(`Failed to load page: ${response.statusText}`);
      }
      const data = await response.json();
      setPage(data);
      
      if (isInitial) {
        setLastActionTimestamp(Date.now() / 1000);
      } else {
        // Award XP and process attribute boost on valid page load
        awardRewards(data);
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Check click and handle transitions with Anti-Cheat validation
  const handleTransition = async (toPageTitle) => {
    if (toPageTitle === page?.title) return;
    
    const clientTimestamp = Date.now() / 1000;
    
    // Simulate cheat options if developer flags are active
    const elapsed = cheatSpeedActive ? 0.1 : (clientTimestamp - lastActionTimestamp);
    const simulatedTimestamp = clientTimestamp - (cheatSpeedActive ? 0 : 0); // Keep it normal or bot speed
    
    let currentLat = gps.latitude;
    let currentLng = gps.longitude;
    
    // Teleport location check
    if (cheatTeleportActive) {
      currentLat += 15.0; // Jump by ~1600 km
      currentLng += 25.0;
      setGps({ latitude: currentLat, longitude: currentLng });
    } else {
      // Simulate minor GPS drift of walking/minor changes
      currentLat += (Math.random() - 0.5) * 0.0002;
      currentLng += (Math.random() - 0.5) * 0.0002;
      setGps({ latitude: currentLat, longitude: currentLng });
    }

    const payload = {
      fromPage: page?.title || "Potato",
      toPage: toPageTitle,
      deviceMetadata: {
        clientTimestamp: clientTimestamp.toString(),
        lastActionTimestamp: (clientTimestamp - elapsed).toString(), // Backtrack previous action timestamp based on elapsed
        userAgent: navigator.userAgent,
        prev_latitude: gps.latitude.toString(),
        prev_longitude: gps.longitude.toString()
      },
      gpsLocation: {
        latitude: currentLat,
        longitude: currentLng
      },
      currentStats: {
        level: player.level,
        xp: player.xp,
        STR: player.stats.STR,
        INT: player.stats.INT,
        CHA: player.stats.CHA,
        CON: player.stats.CON
      }
    };

    try {
      // 1. Call Anti-Cheat validator endpoint
      const checkRes = await fetch(`${API_BASE}/api/validate-transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!checkRes.ok) {
        throw new Error("Anti-cheat validator endpoint failed.");
      }
      
      const checkData = await checkRes.json();
      
      if (!checkData.isValid) {
        // Trigger cheat alert and apply penalty
        setCheatAlert({
          fromPage: page?.title,
          toPage: toPageTitle,
          reason: checkData.reason,
          dmNarration: checkData.dmNarration
        });
        
        // Apply XP / Stat deduction penalty
        setPlayer(prev => {
          const newXp = Math.max(0, prev.xp - 15);
          return {
            ...prev,
            xp: newXp
          };
        });
        
        // Reset cheat options to prevent loop
        setCheatSpeedActive(false);
        setCheatTeleportActive(false);
        return;
      }
      
      // 2. If valid, check for hidden item trigger
      checkForLoot(toPageTitle);
      
      // 3. Load the target Wikipedia page
      await loadPage(toPageTitle);
      
      // 4. Update state variables
      setPathHistory(prev => [...prev, toPageTitle]);
      setLastActionTimestamp(clientTimestamp);
      
      // Clear cheat active states
      setCheatSpeedActive(false);
      setCheatTeleportActive(false);
      
    } catch (err) {
      console.error("Transition failed: ", err);
      // Fallback: load page anyway
      await loadPage(toPageTitle);
    }
  };

  // Check if link matches a triggerKeyword of hidden items from the current page
  const checkForLoot = (clickedTitle) => {
    if (!page?.hiddenItems || page.hiddenItems.length === 0) return;
    
    const clickedLower = clickedTitle.toLowerCase();
    
    // Find matching item
    const matchedItem = page.hiddenItems.find(item => {
      const keyword = item.triggerKeyword.toLowerCase();
      // Check if keyword is part of the clicked title or text
      return clickedLower.includes(keyword) || keyword.includes(clickedLower);
    });
    
    if (matchedItem) {
      // Create new instance of item
      const newItem = {
        ...matchedItem,
        lootedFrom: page.title,
        lootedAt: new Date().toLocaleTimeString(),
        loreSnippet: page.loreSnippet
      };
      
      // Add to inventory and boost stats
      setPlayer(prev => {
        const updatedStats = { ...prev.stats };
        Object.entries(newItem.effect || {}).map(([stat, val]) => {
          if (stat in updatedStats) {
            updatedStats[stat] += val;
          }
        });
        
        return {
          ...prev,
          inventory: [...prev.inventory, newItem].slice(0, 16), // limit 16 slots
          stats: updatedStats
        };
      });
      
      // Trigger Loot Discovery Modal
      setLootItem(newItem);
    }
  };

  // Award XP and increment attribute corresponding to current page zone
  const awardRewards = (newPageData) => {
    const xpReward = newPageData.xpReward || 20;
    const zone = newPageData.attributeZone || 'CON';
    
    setPlayer(prev => {
      let newXp = prev.xp + xpReward;
      let newLevel = prev.level;
      let xpNeeded = prev.xpNeeded;
      let leveledUp = false;
      
      // Level up checks
      if (newXp >= xpNeeded) {
        newXp -= xpNeeded;
        newLevel += 1;
        xpNeeded = newLevel * 100;
        leveledUp = true;
      }
      
      // Boost page zone attribute
      const updatedStats = { ...prev.stats };
      if (zone in updatedStats) {
        updatedStats[zone] += 2; // general +2 boost for reading in this zone
      }
      
      // Extra level up boost
      if (leveledUp) {
        Object.keys(updatedStats).forEach(s => {
          updatedStats[s] += 1; // +1 to all stats on level up
        });
      }
      
      return {
        ...prev,
        level: newLevel,
        xp: newXp,
        xpNeeded: xpNeeded,
        stats: updatedStats
      };
    });
  };

  // Intercept click on Wiki html content
  const handleContentClick = (e) => {
    const anchor = e.target.closest('a');
    if (anchor) {
      e.preventDefault();
      const href = anchor.getAttribute('href');
      if (href) {
        // Wikipedia internal paths usually formatted as './Title' or '/wiki/Title'
        let title = href;
        if (href.startsWith('./')) {
          title = href.substring(2);
        } else if (href.startsWith('/wiki/')) {
          title = href.substring(6);
        } else if (href.startsWith('http://') || href.startsWith('https://')) {
          // parse absolute wikipedia link if it matches
          try {
            const urlObj = new URL(href);
            if (urlObj.hostname.endsWith('wikipedia.org')) {
              title = urlObj.pathname.substring(6);
            } else {
              // External link, block it
              return;
            }
          } catch(e) { return; }
        }
        
        // Format clean page title
        title = decodeURIComponent(title).replace(/_/g, ' ');
        handleTransition(title);
      }
    }
  };

  const resetGame = () => {
    setPlayer({
      level: 1,
      xp: 0,
      xpNeeded: 100,
      stats: { STR: 10, INT: 10, CHA: 10, CON: 10 },
      inventory: []
    });
    setPathHistory(['Potato']);
    loadPage('Potato', true);
  };

  const getStatIcon = (stat) => {
    switch (stat) {
      case 'STR': return <Shield className="w-4 h-4 text-rpg-str" />;
      case 'INT': return <BookOpen className="w-4 h-4 text-rpg-int" />;
      case 'CHA': return <Sparkles className="w-4 h-4 text-rpg-cha" />;
      case 'CON': return <Heart className="w-4 h-4 text-rpg-con" />;
      default: return null;
    }
  };

  const activeZoneDetails = page ? ZONE_DETAILS[page.attributeZone] : null;

  return (
    <div className="min-h-screen bg-rpg-bg text-slate-100 flex flex-col font-sans select-none relative overflow-hidden">
      
      {/* Visual background grids/ambient lights */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-950/15 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-emerald-950/10 blur-[100px] pointer-events-none"></div>

      {/* Header Bar */}
      <header className="h-16 shrink-0 border-b border-rpg-border/60 bg-rpg-card/60 backdrop-blur-md px-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rpg-primary to-amber-600 flex items-center justify-center shadow-lg shadow-purple-900/30">
            <Compass className="w-5 h-5 text-white animate-spin-slow" />
          </div>
          <div>
            <h1 className="font-extrabold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-slate-100 via-purple-300 to-amber-400 text-lg">
              WikiQuest
            </h1>
            <p className="text-[10px] text-rpg-accent font-bold uppercase tracking-widest mt-[-2px]">
              Potato Edition
            </p>
          </div>
        </div>

        {/* Global Travel Stats */}
        <div className="hidden md:flex items-center gap-5 text-xs font-semibold text-slate-400">
          <div className="flex items-center gap-1.5 bg-slate-950/50 px-3 py-1.5 rounded-lg border border-rpg-border/40">
            <Navigation className="w-3.5 h-3.5 text-rpg-primary" />
            <span>Path Length: <strong className="text-slate-200">{pathHistory.length} articles</strong></span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-950/50 px-3 py-1.5 rounded-lg border border-rpg-border/40">
            <MapPin className="w-3.5 h-3.5 text-rpg-con" />
            <span>GPS Coordinates: <strong className="text-slate-200">{gps.latitude.toFixed(4)}, {gps.longitude.toFixed(4)}</strong></span>
          </div>
        </div>

        <button 
          onClick={resetGame}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-rpg-border bg-slate-900/60 text-xs font-bold hover:bg-slate-800 transition-colors text-slate-300 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset Game
        </button>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        
        {/* LEFT SIDEBAR - 30% Width */}
        <section className="w-full md:w-[30%] shrink-0 border-r border-rpg-border/60 bg-rpg-card/30 flex flex-col overflow-y-auto p-5 gap-6 custom-scrollbar">
          
          {/* CHARACTER SUMMARY */}
          <div className="glass-panel rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-rpg-primary/10 to-transparent rounded-full pointer-events-none"></div>
            
            <div className="flex items-center gap-4 mb-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rpg-primary to-indigo-600 flex items-center justify-center shadow-lg border border-white/10">
                  <span className="text-2xl font-extrabold text-white">{player.level}</span>
                </div>
                <div className="absolute bottom-[-5px] right-[-5px] bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded text-[9px] font-black uppercase">
                  LVL
                </div>
              </div>
              <div>
                <h3 className="font-extrabold text-slate-100 text-lg">Starchy Wanderer</h3>
                <p className="text-xs text-slate-400">Class: Wiki Archaeologist</p>
              </div>
            </div>

            {/* XP PROGRESS BAR */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-400">Experience</span>
                <span className="text-rpg-accent">{player.xp} / {player.xpNeeded} XP</span>
              </div>
              <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                <div 
                  className="h-full bg-gradient-to-r from-rpg-primary to-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${(player.xp / player.xpNeeded) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* ATTRIBUTE RADARS / BARS */}
          <div className="glass-panel rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-rpg-border/40 pb-2">
              <h3 className="font-extrabold text-slate-200 text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-rpg-primary" /> Character Attributes
              </h3>
              <span className="text-[10px] text-rpg-textMuted bg-slate-950 px-2 py-0.5 rounded font-mono">
                Total Boosts
              </span>
            </div>

            <div className="space-y-3.5">
              {Object.entries(player.stats).map(([stat, val]) => {
                const details = ZONE_DETAILS[stat];
                return (
                  <div key={stat} className="space-y-1 relative group cursor-help">
                    <div className="flex justify-between text-xs items-center">
                      <span className="flex items-center gap-1.5 font-bold text-slate-300">
                        {getStatIcon(stat)}
                        {details.name} ({stat})
                      </span>
                      <span className={`font-mono font-bold ${details.text}`}>{val}</span>
                    </div>
                    {/* Bar */}
                    <div className="h-2 w-full bg-slate-950/60 rounded-full overflow-hidden border border-slate-900 relative">
                      {/* Base stat represent */}
                      <div 
                        className={`h-full ${details.color} rounded-full opacity-90 transition-all duration-500`}
                        style={{ width: `${Math.min(100, (val / 50) * 100)}%` }}
                      ></div>
                    </div>
                    {/* Tooltip on hover */}
                    <div className="absolute left-0 bottom-7 bg-slate-950 border border-rpg-border p-2 rounded-lg text-[10px] opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-20 shadow-xl max-w-xs leading-normal">
                      <p className="font-bold text-slate-200 mb-0.5">{details.name}</p>
                      <p className="text-slate-400">{details.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ITEM INVENTORY */}
          <div className="glass-panel rounded-2xl p-5 flex-1 flex flex-col min-h-[220px]">
            <h3 className="font-extrabold text-slate-200 text-sm border-b border-rpg-border/40 pb-2 mb-3 flex items-center gap-2">
              <Award className="w-4 h-4 text-rpg-accent" /> Item Inventory ({player.inventory.length}/16)
            </h3>

            {/* Inventory Grid */}
            <div className="grid grid-cols-4 gap-2 flex-1 auto-rows-max overflow-y-auto pr-1">
              {Array.from({ length: 16 }).map((_, idx) => {
                const item = player.inventory[idx];
                const isHovered = showTooltip === idx;
                
                if (!item) {
                  return (
                    <div 
                      key={idx} 
                      className="aspect-square rounded-xl bg-slate-950/40 border border-rpg-border/20 flex items-center justify-center text-slate-700 font-mono text-xs"
                    >
                      {idx + 1}
                    </div>
                  );
                }

                // Setup color classes for item inventory based on rarity
                let borderCol = 'border-slate-800';
                let bgCol = 'bg-slate-900/60 hover:bg-slate-800/80';
                let glowCol = '';
                if (item.rarity === 'Uncommon') { borderCol = 'border-emerald-500/40'; glowCol = 'shadow-emerald-950/20'; }
                if (item.rarity === 'Rare') { borderCol = 'border-blue-500/40'; glowCol = 'shadow-blue-950/20'; }
                if (item.rarity === 'Epic') { borderCol = 'border-purple-500/40'; glowCol = 'shadow-purple-950/20'; }
                if (item.rarity === 'Legendary') { borderCol = 'border-amber-500/60'; glowCol = 'shadow-amber-950/30'; bgCol = 'bg-slate-900/60 animate-pulse'; }

                return (
                  <div
                    key={idx}
                    onMouseEnter={() => setShowTooltip(idx)}
                    onMouseLeave={() => setShowTooltip(null)}
                    className={`aspect-square rounded-xl border flex items-center justify-center relative cursor-pointer shadow-sm transition-all hover:scale-105 ${borderCol} ${bgCol} ${glowCol}`}
                  >
                    {/* Item icon token */}
                    <Shield className={`w-6 h-6 ${item.rarity === 'Legendary' ? 'text-amber-400' : item.rarity === 'Epic' ? 'text-purple-400' : item.rarity === 'Rare' ? 'text-blue-400' : item.rarity === 'Uncommon' ? 'text-emerald-400' : 'text-slate-400'}`} />
                    
                    {/* Rarity small dot */}
                    <span className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${item.rarity === 'Legendary' ? 'bg-amber-400' : item.rarity === 'Epic' ? 'bg-purple-400' : item.rarity === 'Rare' ? 'bg-blue-400' : item.rarity === 'Uncommon' ? 'bg-emerald-400' : 'bg-slate-500'}`}></span>
                    
                    {/* Tooltip Overlay */}
                    {isHovered && (
                      <div className="absolute left-[110%] top-0 bg-slate-950 border border-slate-800 rounded-xl p-3 shadow-2xl z-30 w-52 pointer-events-none leading-normal">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${item.rarity === 'Legendary' ? 'bg-amber-700 text-amber-100' : item.rarity === 'Epic' ? 'bg-purple-800 text-purple-200' : item.rarity === 'Rare' ? 'bg-blue-800 text-blue-200' : item.rarity === 'Uncommon' ? 'bg-emerald-800 text-emerald-200' : 'bg-slate-700 text-slate-300'}`}>
                          {item.rarity}
                        </span>
                        <h4 className="font-extrabold text-sm text-slate-100 mt-2">{item.itemName}</h4>
                        <p className="text-[10px] text-slate-400 italic my-1.5">"{item.loreSnippet}"</p>
                        
                        <div className="pt-2 border-t border-slate-900 mt-2 space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Stat Boosts:</span>
                          <div className="flex gap-1.5 flex-wrap">
                            {Object.entries(item.effect || {}).map(([s, val]) => (
                              <span key={s} className="text-[10px] font-bold text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                                {s} +{val}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="text-[8px] text-slate-500 mt-2 pt-1 border-t border-slate-900 flex justify-between">
                          <span>From: {item.lootedFrom}</span>
                          <span>{item.lootedAt}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* DM PORTAL DEVELOPMENT BOX (For Testing Anti-Cheat Validator) */}
          <div className="glass-panel rounded-2xl p-4 space-y-3">
            <h3 className="font-extrabold text-slate-200 text-xs flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-amber-500 animate-pulse" /> Dungeon Master Dev Console
            </h3>
            <p className="text-[10px] text-slate-400 leading-normal">
              Activate options below, then click any link to force-test the automated AI Anti-Cheat validator.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setCheatSpeedActive(!cheatSpeedActive)}
                className={`py-2 px-1 text-[10px] font-black rounded-lg border cursor-pointer transition-colors text-center ${cheatSpeedActive ? 'bg-red-500/20 border-red-500 text-red-200' : 'bg-slate-950/60 border-rpg-border hover:bg-slate-900 text-slate-400'}`}
              >
                {cheatSpeedActive ? 'Bot Click (0.1s) ON' : 'Bot Click (0.1s)'}
              </button>
              <button
                onClick={() => setCheatTeleportActive(!cheatTeleportActive)}
                className={`py-2 px-1 text-[10px] font-black rounded-lg border cursor-pointer transition-colors text-center ${cheatTeleportActive ? 'bg-red-500/20 border-red-500 text-red-200' : 'bg-slate-950/60 border-rpg-border hover:bg-slate-900 text-slate-400'}`}
              >
                {cheatTeleportActive ? 'Spoof GPS (Teleport) ON' : 'Spoof GPS (Teleport)'}
              </button>
            </div>
            
            {/* Visual indicators */}
            <div className="flex gap-2 justify-center text-[8px] text-slate-500 font-mono">
              <span className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${cheatSpeedActive ? 'bg-red-500 animate-ping' : 'bg-slate-700'}`}></span> Bot Trigger
              </span>
              <span className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${cheatTeleportActive ? 'bg-red-500 animate-ping' : 'bg-slate-700'}`}></span> Geolocation Spoof
              </span>
            </div>
          </div>

        </section>

        {/* RIGHT WIKI CORE ARENA - 70% Width */}
        <section className="flex-1 flex flex-col overflow-hidden bg-slate-950/30">
          
          {loading ? (
            /* Loading State with random fun RPG tips */
            <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4 animate-pulse">
              <div className="w-16 h-16 rounded-full border-4 border-rpg-primary border-t-transparent animate-spin"></div>
              <div className="text-center space-y-1.5 max-w-sm">
                <p className="font-bold text-slate-200 text-sm tracking-wider">LOADING WIKI ARTICLE...</p>
                <p className="text-xs text-rpg-accent font-semibold italic">"{LOADING_TIPS[tipIndex]}"</p>
              </div>
            </div>
          ) : error ? (
            /* Error state */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
              <div className="w-14 h-14 rounded-full bg-red-950/40 border border-red-500 flex items-center justify-center text-red-400">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-extrabold text-slate-100 text-lg">Failed to Summon Realm</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">{error}</p>
              </div>
              <button 
                onClick={() => loadPage(pathHistory[pathHistory.length - 1] || 'Potato')}
                className="px-5 py-2 rounded-xl bg-rpg-primary hover:bg-rpg-primaryHover text-xs font-bold transition-all shadow-md shadow-purple-900/30 cursor-pointer"
              >
                Re-Try Summoning
              </button>
            </div>
          ) : (
            /* Wiki Core Arena Content */
            <div className="flex-1 flex flex-col overflow-hidden">
              
              {/* Region Metadata Bar */}
              <div className="px-6 py-4 border-b border-rpg-border/40 bg-rpg-card/25 shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black bg-slate-900 px-2 py-0.5 rounded border border-rpg-border text-slate-400 font-mono tracking-wider">
                      ARTICLE REALM
                    </span>
                    {activeZoneDetails && (
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wide ${activeZoneDetails.color} text-slate-950`}>
                        ZONE: {activeZoneDetails.name}
                      </span>
                    )}
                  </div>
                  <h2 className="text-3xl font-black text-slate-100 tracking-tight">{page.title}</h2>
                </div>

                <div className="flex items-center gap-3 self-start sm:self-center">
                  <div className="bg-slate-900/80 px-4 py-2 rounded-xl border border-rpg-border/60 text-right flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-rpg-accent" />
                    <div>
                      <div className="text-[8px] text-slate-400 font-bold uppercase tracking-widest leading-none">XP reward</div>
                      <div className="text-sm font-black text-slate-100 leading-none mt-1">+{page.xpReward} XP</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dungeon Master Narrator */}
              {page.loreSnippet && (
                <div className="mx-6 mt-4 p-4 rounded-xl bg-gradient-to-r from-rpg-card/80 to-slate-900/60 border border-rpg-border/60 relative overflow-hidden flex items-start gap-3 shrink-0">
                  <div className="w-8 h-8 rounded-lg bg-purple-950/60 border border-rpg-primary/50 flex items-center justify-center text-rpg-primary shrink-0">
                    <Skull className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <h5 className="text-[10px] font-black text-rpg-primary uppercase tracking-widest">Dungeon Master AI</h5>
                    <p className="text-xs text-slate-200 italic leading-relaxed">"{page.loreSnippet}"</p>
                  </div>
                  
                  {/* Subtle pulsing background dot */}
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rpg-primary/40 animate-ping"></span>
                </div>
              )}

              {/* Wikipedia Content Box */}
              <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar select-text">
                <div className="glass-panel border-rpg-border/40 rounded-2xl p-6 bg-slate-950/20 shadow-inner">
                  {/* Render the sanitized HTML text, intercepts clicks */}
                  <div 
                    className="prose prose-invert lg:prose-lg max-w-none text-slate-300 leading-relaxed font-sans"
                    dangerouslySetInnerHTML={{ __html: page.html }}
                    onClick={handleContentClick}
                  />
                  
                  {/* Footer message */}
                  <div className="mt-8 pt-6 border-t border-slate-900 text-center text-xs text-slate-500 flex justify-center gap-1">
                    <span>Double click or click any</span> 
                    <strong className="text-rpg-primary font-semibold border-b border-dashed border-rpg-primary/40">hyperlinked path</strong> 
                    <span>to navigate to the next page.</span>
                  </div>
                </div>
              </div>

              {/* Traversed Portal Path logs */}
              <footer className="h-10 border-t border-rpg-border/40 bg-rpg-card/35 px-6 flex items-center shrink-0 text-[10px] font-bold text-slate-400 overflow-x-auto whitespace-nowrap gap-2">
                <span className="text-rpg-accent uppercase shrink-0">Journey Log:</span>
                <div className="flex items-center gap-1 font-mono">
                  {pathHistory.map((item, idx) => (
                    <React.Fragment key={idx}>
                      {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />}
                      <span className={`px-1.5 py-0.5 rounded shrink-0 ${idx === pathHistory.length - 1 ? 'bg-rpg-primary/20 text-rpg-primary border border-rpg-primary/30' : 'bg-slate-950 text-slate-400 border border-slate-900'}`}>
                        {item}
                      </span>
                    </React.Fragment>
                  ))}
                </div>
              </footer>

            </div>
          )}

        </section>

      </main>

      {/* LOOT SUCCESS DIALOG OVERLAY */}
      <LootModal 
        item={lootItem} 
        onClose={() => setLootItem(null)} 
      />

      {/* CHEAT WARNING DIALOG OVERLAY */}
      <CheatModal 
        alert={cheatAlert} 
        onClose={() => setCheatAlert(null)} 
      />

    </div>
  );
}
