
import React, { useState, useMemo, useEffect } from 'react';
import { DataRecord, LookupItem } from '../types';
import { api } from '../services/api';
import { ChevronDown, Trophy, Zap, Calendar, Activity, X, Trash2, Edit2, Check, ArrowRight, ChevronLeft, ChevronRight, Star, Users } from 'lucide-react';
import { format } from 'date-fns';

interface PersonalProps {
  data: DataRecord[];
  people: LookupItem[];
  trainingTypes: LookupItem[];
  refreshData: () => Promise<void>;
  activePersonId: string | number;
  onSelectPerson: (id: string | number) => void;
}

const Personal: React.FC<PersonalProps> = ({ data, people, trainingTypes, refreshData, activePersonId, onSelectPerson }) => {
  const [selectedType, setSelectedType] = useState<string>(trainingTypes[0]?.name || '');

  // Detail Modal State
  const [detailDate, setDetailDate] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | number | null>(null);
  const [editValue, setEditValue] = useState('');

  // Player Selection Modal State
  const [showPlayerList, setShowPlayerList] = useState(false);

  // Image Error State for Fallback
  const [imgError, setImgError] = useState(false);

  // Randomize player list order on mount (random sort)
  const activePeople = useMemo(() => {
    const list = people.filter(p => !p.is_hidden);
    // Fisher-Yates shuffle approximation for randomization
    return list.sort(() => Math.random() - 0.5);
  }, [people]);

  // Auto-select a random player when entering the page (so it's not always the same person)
  useEffect(() => {
    if (activePeople.length > 0) {
        // Only select random if no specific person was passed (though parent keeps state)
        // Actually, let's respect the passed activePersonId if it exists in the list
        const exists = activePeople.find(p => String(p.id) === String(activePersonId));
        if (!exists && activePeople.length > 0) {
            const randomIndex = Math.floor(Math.random() * activePeople.length);
            onSelectPerson(activePeople[randomIndex].id);
        }
    }
  }, []); // Run only on mount

  const currentIndex = activePeople.findIndex(p => String(p.id) === String(activePersonId));
  const person = activePeople[currentIndex >= 0 ? currentIndex : 0] || activePeople[0];

  // Reset error state when person changes
  useEffect(() => {
      setImgError(false);
  }, [person?.id]);

  // Parse Image URL for Hero (b_url preferred for large image)
  // Logic: Use b_url if exists, otherwise fallback to local file /riders/{name}.jpg
  const [bUrlBase, bUrlFragment] = useMemo(() => {
      if (!person) return ['', ''];
      
      let url = person.b_url || person.s_url || '';
      // If no URL is provided in DB, assume local file based on name
      if (!url) {
          url = `/riders/${person.name}.jpg`;
      }
      return url.split('#');
  }, [person]);

  let bz=1, bx=50, by=50;
  if(bUrlFragment) {
     const sp = new URLSearchParams(bUrlFragment);
     bz = parseFloat(sp.get('z')||'1');
     bx = parseFloat(sp.get('x')||'50');
     by = parseFloat(sp.get('y')||'50');
  }

  const handlePrevPerson = () => {
    if (activePeople.length === 0) return;
    const nextIndex = currentIndex > 0 ? currentIndex - 1 : activePeople.length - 1;
    onSelectPerson(activePeople[nextIndex].id);
  };

  const handleNextPerson = () => {
    if (activePeople.length === 0) return;
    const nextIndex = currentIndex < activePeople.length - 1 ? currentIndex + 1 : 0;
    onSelectPerson(activePeople[nextIndex].id);
  };

  // Filter Data
  const personRecords = useMemo(() => {
    if (!person) return [];
    return data.filter(d => 
        String(d.people_id) === String(person.id) && 
        d.item === 'training' && 
        (!selectedType || d.name === selectedType)
    );
  }, [data, person, selectedType]);

  // Aggregate by Date
  const dailyStats = useMemo(() => {
    const grouped = new Map<string, number[]>();
    personRecords.forEach(r => {
        if (!grouped.has(r.date)) grouped.set(r.date, []);
        grouped.get(r.date)!.push(parseFloat(r.value));
    });

    const stats: { date: string, avg: number, best: number, stability: number, count: number }[] = [];
    grouped.forEach((values, date) => {
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = sum / values.length;
        const best = Math.min(...values);

        const squareDiffs = values.map(v => Math.pow(v - avg, 2));
        const variance = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
        const stdDev = Math.sqrt(variance);
        const stability = Math.max(0, 100 - (stdDev * 40));

        stats.push({ date, avg, best, stability, count: values.length });
    });

    return stats.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [personRecords]);

  const allTimeBest = useMemo(() => {
     if (personRecords.length === 0) return null;
     return Math.min(...personRecords.map(r => parseFloat(r.value)));
  }, [personRecords]);

  // Modal Records
  const detailRecords = useMemo(() => {
      if (!detailDate) return [];
      return personRecords
        .filter(r => r.date === detailDate)
        .sort((a, b) => parseFloat(a.value) - parseFloat(b.value)); // Sort by best time
  }, [personRecords, detailDate]);

  const handleUpdateRecord = async (id: string | number) => {
      const val = parseFloat(editValue);
      if (isNaN(val) || val <= 0) return;
      
      const rec = detailRecords.find(r => r.id === id);
      if (!rec) return;

      const success = await api.submitRecord({ 
          ...rec, 
          value: val.toFixed(3)
      });
      
      if (success) {
          setEditingRecordId(null);
          refreshData();
      }
  };

  const handleDeleteRecord = async (id: string | number) => {
      if (!confirm('確定刪除此筆數據？')) return;
      const success = await api.deleteRecord(id, 'training');
      if (success) refreshData();
  };

  const getAge = (birthday?: string) => {
    if (!birthday) return 'PRO';
    const birthDate = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return `${age} Years`;
  };

  if (!person) return null;

  return (
    <div className="h-full overflow-y-auto animate-fade-in no-scrollbar pb-24 relative bg-[#0a0508]">
        
        {/* 1. Hero Image Area - 80vh for full visual impact */}
        <div className="relative w-full h-[80vh] z-0 overflow-hidden">
            {/* Base Background */}
            <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 via-[#1c1016] to-[#0a0508] z-0"></div>

            {/* The Image - 4:6 Crop within container */}
            <div className="absolute inset-0 z-10 w-full h-full flex justify-center">
               {!imgError && bUrlBase ? (
                   <img 
                   src={bUrlBase} 
                   onError={() => setImgError(true)}
                   className="h-full w-auto max-w-none object-cover" 
                   style={{ 
                       // Ensure 4:6 aspect preservation if possible by container
                       aspectRatio: '2/3',
                       transform: `translate(${(bx - 50) * 1.0}%, ${(by - 50) * 1.0}%) scale(${bz})`,
                       maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)',
                       WebkitMaskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)'
                   }}
                 />
               ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-800 text-9xl font-black opacity-30">
                      {person.name.charAt(0)}
                  </div>
               )}
            </div>

            {/* Gray Gradient Mask for Top Navigation Visibility */}
            <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-zinc-900/90 via-zinc-900/40 to-transparent z-20 pointer-events-none"></div>

            {/* Glory Light Effects (Highlights from bottom) */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[140%] h-[60%] bg-gradient-to-t from-sunset-gold/30 via-sunset-rose/10 to-transparent blur-3xl z-20 pointer-events-none mix-blend-screen"></div>
            <div className="absolute bottom-[-10%] left-1/2 -translate-x-1/2 w-[80%] h-[40%] bg-radial-gradient from-sunset-gold/40 to-transparent blur-2xl z-20 pointer-events-none"></div>

            {/* Navigation & Name Overlay */}
            <div className="absolute top-0 left-0 right-0 p-4 pt-safe-top z-30 flex items-center justify-between mt-4">
                <button onClick={handlePrevPerson} className="w-10 h-10 flex-none flex items-center justify-center rounded-full bg-black/40 text-white/80 backdrop-blur-md border border-white/10 active:scale-90 transition-all shadow-lg hover:bg-black/60 hover:text-white"><ChevronLeft size={24} /></button>
                
                <div 
                    className="flex-1 flex flex-col items-center mx-4 relative min-w-0 cursor-pointer group"
                    onClick={() => setShowPlayerList(true)}
                >
                    {/* Golden Glory Light Effect behind Name - Enhanced */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] bg-sunset-gold/50 blur-3xl rounded-full pointer-events-none mix-blend-screen animate-pulse-slow"></div>
                    
                    {/* Full width 20% Black Mask under Name */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-black/20 blur-xl rounded-full pointer-events-none"></div>
                    
                    {/* Name - Fixed Right Cutoff by adding pr-6 */}
                    <div className="w-full px-2 flex justify-center items-center gap-1 transition-transform group-active:scale-95">
                        <h1 className="relative max-w-full text-center text-4xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-sunset-gold/90 drop-shadow-[0_4px_12px_rgba(0,0,0,1)] filter z-10 break-keep whitespace-nowrap overflow-visible">
                            {person.name}
                        </h1>
                        <ChevronDown size={20} className="text-white/50 drop-shadow-md group-hover:text-sunset-gold transition-colors relative z-20 mt-1" />
                    </div>
                    
                    <div className="flex items-center gap-1.5 mt-1 bg-black/50 backdrop-blur-md px-3 py-0.5 rounded-full border border-white/15 shadow-lg relative z-10">
                        <Star size={10} className="text-sunset-gold fill-sunset-gold animate-pulse" />
                        <span className="text-[9px] font-bold text-sunset-gold tracking-[0.2em] uppercase shadow-black drop-shadow-md">{getAge(person.birthday)}</span>
                        <Star size={10} className="text-sunset-gold fill-sunset-gold animate-pulse" />
                    </div>
                </div>

                <button onClick={handleNextPerson} className="w-10 h-10 flex-none flex items-center justify-center rounded-full bg-black/40 text-white/80 backdrop-blur-md border border-white/10 active:scale-90 transition-all shadow-lg hover:bg-black/60 hover:text-white"><ChevronRight size={24} /></button>
            </div>
        </div>

        {/* Content Section - Controls floating over the bottom of the image */}
        {/* -mt-24 to overlap comfortably with the bottom of the 80vh image */}
        <div className="px-4 relative z-30 -mt-24 space-y-6">
            
            {/* 3. Controls & All Time Best */}
            <div className="grid grid-cols-5 gap-3">
                <div className="col-span-3 relative h-20 group">
                    {/* Beautified Select Box */}
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-xl rounded-2xl border border-sunset-gold/20 shadow-glow-gold pointer-events-none z-0"></div>
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl pointer-events-none z-0"></div>
                    
                    <select 
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                        className="relative z-10 w-full h-full appearance-none bg-transparent rounded-2xl px-5 text-white font-black outline-none text-lg tracking-wide"
                    >
                        {trainingTypes.map(t => <option key={t.id} value={t.name} className="text-black">{t.name}</option>)}
                    </select>
                    <div className="absolute top-1/2 right-4 -translate-y-1/2 pointer-events-none z-20">
                        <ChevronDown size={20} className="text-sunset-gold" />
                    </div>
                    <div className="absolute top-2 left-5 pointer-events-none z-20">
                        <span className="text-[8px] text-zinc-400 uppercase tracking-widest font-black">訓練項目</span>
                    </div>
                </div>

                <div className="col-span-2 glass-card-gold rounded-2xl p-3 flex flex-col justify-center relative overflow-hidden shadow-[0_0_30px_rgba(251,191,36,0.2)]">
                    <div className="absolute -top-2 -right-2 p-2 opacity-20 rotate-12"><Trophy size={60} /></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-sunset-gold/10 to-transparent"></div>
                    <span className="text-[9px] text-sunset-gold uppercase tracking-wider font-black flex items-center gap-1 z-10"><Zap size={10} fill="currentColor"/> 最速紀錄</span>
                    <span className="text-2xl font-black text-white font-mono tracking-tighter z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] truncate">
                        {allTimeBest ? allTimeBest.toFixed(3) : '--'}
                    </span>
                </div>
            </div>

            {/* 4. Daily Stats List - Scrolling area starts here */}
            <div className="space-y-3 pb-8 pt-4">
                {dailyStats.map((stat, idx) => (
                    <div 
                        key={idx} 
                        onClick={() => { setDetailDate(stat.date); setShowDetailModal(true); }}
                        className="glass-card rounded-2xl p-4 active:scale-[0.98] transition-all border border-white/5 hover:border-sunset-rose/40 group cursor-pointer relative overflow-hidden"
                    >
                        {/* Subtle shimmer effect on card hover */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                        
                        <div className="flex justify-between items-start mb-3 relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-zinc-900/60 flex flex-col items-center justify-center border border-white/10 shadow-inner backdrop-blur-sm">
                                    <span className="text-[8px] text-zinc-500 uppercase font-bold tracking-widest">{format(new Date(stat.date), 'MMM')}</span>
                                    <span className="text-lg font-black text-white font-mono leading-none">{format(new Date(stat.date), 'dd')}</span>
                                </div>
                                <div>
                                    <div className="text-[9px] text-zinc-500 font-black uppercase tracking-wider mb-0.5 flex items-center gap-1">Stability <Activity size={8}/></div>
                                    <div className="flex items-center gap-2">
                                        <div className="h-1.5 w-16 bg-zinc-800 rounded-full overflow-hidden border border-white/5">
                                            <div 
                                                className={`h-full rounded-full ${stat.stability >= 80 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : stat.stability >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`} 
                                                style={{width: `${stat.stability}%`}}
                                            ></div>
                                        </div>
                                        <span className={`text-sm font-black font-mono ${stat.stability >= 80 ? 'text-emerald-400' : stat.stability >= 60 ? 'text-amber-400' : 'text-rose-400'}`}>
                                            {stat.stability.toFixed(0)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <ArrowRight size={18} className="text-zinc-600 group-hover:text-white transition-colors mt-1" />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 relative z-10">
                            <div className="bg-black/30 rounded-xl p-2.5 border border-white/5 flex flex-col">
                                <span className="text-[8px] text-zinc-500 uppercase font-bold mb-0.5">Average</span>
                                <span className="text-sm font-mono font-bold text-zinc-300">{stat.avg.toFixed(3)}s</span>
                            </div>
                            <div className="bg-black/30 rounded-xl p-2.5 border border-white/5 flex flex-col">
                                <span className="text-[8px] text-zinc-500 uppercase font-bold mb-0.5">Best</span>
                                <span className="text-sm font-mono font-black text-sunset-gold drop-shadow-sm">{stat.best.toFixed(3)}s</span>
                            </div>
                        </div>
                    </div>
                ))}
                {dailyStats.length === 0 && (
                    <div className="text-center py-10 opacity-30">
                        <Activity size={32} className="mx-auto mb-2" />
                        <p className="text-[10px] font-black uppercase tracking-widest">無數據資料</p>
                    </div>
                )}
            </div>
        </div>

        {/* 5. Detail Modal */}
        {showDetailModal && (
            <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/85 backdrop-blur-md animate-fade-in" onClick={() => setShowDetailModal(false)}>
                <div className="glass-card w-full max-w-md rounded-t-[32px] p-6 shadow-2xl animate-slide-up bg-[#0f0508] border-white/10 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-6 shrink-0">
                        <div>
                            <h3 className="text-xl font-black text-white tracking-tight">{detailDate}</h3>
                            <p className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.3em] mt-0.5">Detailed Records</p>
                        </div>
                        <button onClick={() => setShowDetailModal(false)} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-full text-zinc-500 active:scale-95"><X size={20} /></button>
                    </div>

                    <div className="flex-1 overflow-y-auto no-scrollbar pb-6 space-y-2">
                        {detailRecords.map((rec, i) => (
                            <div key={rec.id} className="flex items-center justify-between bg-zinc-900/50 p-3 rounded-2xl border border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black font-mono ${i===0 ? 'bg-sunset-gold text-black shadow-glow-gold' : 'bg-zinc-800 text-zinc-500'}`}>
                                        {i + 1}
                                    </div>
                                    {editingRecordId === rec.id ? (
                                        <input 
                                            autoFocus
                                            type="number" 
                                            step="0.001"
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            className="w-24 bg-black border border-sunset-rose rounded px-2 py-1 text-white font-mono text-sm outline-none"
                                            onBlur={() => { /* Optional: cancel on blur */ }}
                                        />
                                    ) : (
                                        <span className={`text-lg font-mono font-bold ${i===0 ? 'text-sunset-gold' : 'text-zinc-300'}`}>
                                            {parseFloat(rec.value).toFixed(3)}
                                        </span>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    {editingRecordId === rec.id ? (
                                        <button onClick={() => handleUpdateRecord(rec.id!)} className="p-2 bg-green-500/20 text-green-500 rounded-lg active:scale-90"><Check size={16} /></button>
                                    ) : (
                                        <button onClick={() => { setEditingRecordId(rec.id!); setEditValue(rec.value); }} className="p-2 text-zinc-600 hover:text-white rounded-lg active:scale-90"><Edit2 size={16} /></button>
                                    )}
                                    <button onClick={() => handleDeleteRecord(rec.id!)} className="p-2 text-zinc-600 hover:text-rose-500 rounded-lg active:scale-90"><Trash2 size={16} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* 6. Player Selection Modal */}
        {showPlayerList && (
          <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/90 backdrop-blur-md animate-fade-in" onClick={() => setShowPlayerList(false)}>
             <div className="glass-card w-full max-w-md rounded-t-[32px] p-6 shadow-2xl animate-slide-up bg-[#0f0508] border-white/10 flex flex-col max-h-[70vh]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6 shrink-0">
                  <div>
                    <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2"><Users size={20} className="text-sunset-rose"/> 切換檢視選手</h3>
                    <p className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.3em] mt-0.5">Select Rider</p>
                  </div>
                  <button onClick={() => setShowPlayerList(false)} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-full text-zinc-500 active:scale-95"><X size={20} /></button>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar pb-6">
                   <div className="grid grid-cols-2 gap-3">
                      {people.filter(p => !p.is_hidden).map(p => {
                          const isActive = String(p.id) === String(person.id);
                          // Determine Avatar for list
                          let avatar = null;
                          const [sUrl, sFrag] = (p.s_url || '').split('#');
                          let sz=1, sx=50, sy=50;
                          if(sFrag) {
                             const sp = new URLSearchParams(sFrag);
                             sz = parseFloat(sp.get('z')||'1');
                             sx = parseFloat(sp.get('x')||'50');
                             sy = parseFloat(sp.get('y')||'50');
                          }

                          if (sUrl) {
                              avatar = <img src={sUrl} className="w-full h-full object-cover" style={{transform: `translate(${(sx - 50) * 1.5}%, ${(sy - 50) * 1.5}%) scale(${sz})`}} />;
                          } else {
                              avatar = <span className="text-sm font-black text-zinc-500">{p.name.charAt(0)}</span>;
                          }

                          return (
                            <button 
                                key={p.id}
                                onClick={() => { onSelectPerson(p.id); setShowPlayerList(false); }}
                                className={`flex items-center gap-3 p-3 rounded-xl border transition-all active:scale-[0.98] ${isActive ? 'bg-white/10 border-sunset-rose/50 shadow-glow-rose' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                            >
                                <div className={`w-10 h-10 rounded-full flex-none overflow-hidden flex items-center justify-center border ${isActive ? 'border-sunset-rose' : 'border-white/10 bg-zinc-900'}`}>
                                    {avatar}
                                </div>
                                <span className={`text-sm font-bold truncate ${isActive ? 'text-white' : 'text-zinc-400'}`}>{p.name}</span>
                                {isActive && <Check size={16} className="ml-auto text-sunset-rose" />}
                            </button>
                          );
                      })}
                   </div>
                </div>
             </div>
          </div>
        )}
    </div>
  );
};

export default Personal;
