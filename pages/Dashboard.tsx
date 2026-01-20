
import React, { useState, useMemo } from 'react';
import { DataRecord, LookupItem } from '../types';
import { api } from '../services/api';
import { Calendar, ChevronRight, X, ChevronDown, Activity, Clock, Award, BarChart3, MapPin, ExternalLink, Trophy, Trash2, Edit2, Check, Loader2, AlertTriangle, Info, Zap } from 'lucide-react';
import { ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { format } from 'date-fns';

interface DashboardProps {
  data: DataRecord[];
  refreshData: () => Promise<void>;
  onNavigateToRaces: () => void;
  defaultTrainingType?: string;
}

interface DailySummary {
    date: string;
    itemName: string;
    players: {
        name: string;
        avg: number;
        best: number;
        stability: number;
        count: number;
    }[];
}

const Dashboard: React.FC<DashboardProps> = ({ data, refreshData, onNavigateToRaces, defaultTrainingType }) => {
  const [selectedChartType, setSelectedChartType] = useState<string>(defaultTrainingType || '');
  
  // Get upcoming races
  const upcomingRaces = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const races = data
      .filter(r => r.item === 'race')
      .filter(r => r.date >= todayStr)
      .map(r => ({ ...r, dateObj: new Date(r.date) }))
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
    
    return {
      topTwo: races.slice(0, 2),
      hasMore: races.length > 2
    };
  }, [data]);

  const handleNavigate = (address: string) => {
    if (!address) return;
    if (address.startsWith('http')) {
      window.open(address, '_blank');
    } else {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
    }
  };

  // Complex Stats Logic - Group by Date, then by Player
  const trainingStats = useMemo(() => {
    // 1. Group by Date + Training Type
    const grouped = new Map<string, DataRecord[]>();
    data.filter(r => r.item === 'training').forEach(r => {
        const key = `${r.date}_${r.name}`;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(r);
    });

    const summaries: DailySummary[] = [];

    grouped.forEach((records, key) => {
        const [date, itemName] = key.split('_');
        
        // Group by Player within this date/type
        const playerMap = new Map<string, DataRecord[]>();
        records.forEach(r => {
            const pKey = r.person_name;
            if(!playerMap.has(pKey)) playerMap.set(pKey, []);
            playerMap.get(pKey)!.push(r);
        });

        const playerStats = Array.from(playerMap.entries()).map(([name, pRecs]) => {
            const values = pRecs.map(r => parseFloat(r.value));
            const sum = values.reduce((a, b) => a + b, 0);
            const avg = sum / values.length;
            const best = Math.min(...values);

            // Stability
            const squareDiffs = values.map(v => Math.pow(v - avg, 2));
            const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
            const stdDev = Math.sqrt(avgSquareDiff);
            // Limit stability to 0-100, slightly more lenient formula
            const stability = Math.max(0, 100 - (stdDev * 20));

            return {
                name: name.length > 3 ? name.substring(0,2)+'..' : name, // Truncate name for chart
                fullName: name,
                avg: parseFloat(avg.toFixed(3)),
                best: parseFloat(best.toFixed(3)),
                stability: parseFloat(stability.toFixed(0)),
                count: values.length
            };
        });

        // Sort by average time (faster first)
        summaries.push({
            date,
            itemName,
            players: playerStats.sort((a,b) => a.avg - b.avg)
        });
    });

    return summaries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [data]);

  const trainingTypesList = useMemo(() => Array.from(new Set(trainingStats.map(s => s.itemName))), [trainingStats]);
  const currentTypeSummaries = useMemo(() => trainingStats.filter(s => s.itemName === selectedChartType), [trainingStats, selectedChartType]);

  const allTimeBest = useMemo(() => {
    if (!selectedChartType) return null;
    const filtered = data.filter(r => r.item === 'training' && r.name === selectedChartType);
    if (filtered.length === 0) return null;
    return Math.min(...filtered.map(r => parseFloat(r.value)));
  }, [data, selectedChartType]);

  return (
    <div className="h-full overflow-y-auto px-4 py-6 space-y-8 animate-fade-in no-scrollbar pb-10">
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-[10px] font-black text-zinc-500 tracking-[0.2em] uppercase flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-sunset-rose"></span> 近期賽事預報
          </h2>
          {upcomingRaces.hasMore && (
            <button onClick={onNavigateToRaces} className="text-[10px] text-sunset-gold font-black tracking-widest uppercase flex items-center gap-1">
              查看更多 <ChevronRight size={12} />
            </button>
          )}
        </div>
        
        <div className="space-y-3">
          {upcomingRaces.topTwo.length > 0 ? (
            upcomingRaces.topTwo.map((race, idx) => (
              <div key={idx} className="glass-card-gold rounded-2xl p-4 flex items-center gap-4 relative overflow-hidden group">
                 <div className="absolute inset-0 bg-black/65 z-0"></div>
                 <div className="flex-none flex flex-col items-center justify-center bg-black/70 border border-white/20 rounded-xl w-12 h-12 relative z-10 shadow-lg">
                    <span className="text-[8px] text-sunset-gold uppercase font-black">{format(race.dateObj, 'MMM')}</span>
                    <span className="text-lg font-black text-white font-mono leading-none">{format(race.dateObj, 'dd')}</span>
                 </div>
                 <div className="flex-1 min-w-0 relative z-10">
                   <h3 className="text-white font-bold text-sm truncate drop-shadow-md">{race.name}</h3>
                   <div className="text-[10px] text-sunset-gold font-black uppercase tracking-wider mt-1 drop-shadow-sm">{race.race_group || 'BxB'}</div>
                 </div>
                 {race.address && (
                   <button 
                     onClick={(e) => { e.stopPropagation(); handleNavigate(race.address); }} 
                     className="p-2 rounded-xl bg-black/60 text-white border border-white/20 backdrop-blur-md active:scale-90 transition-all z-10 shadow-liquid"
                   >
                      {race.address.startsWith('http') ? <ExternalLink size={14} /> : <MapPin size={14} />}
                   </button>
                 )}
              </div>
            ))
          ) : (
             <div className="py-10 glass-card rounded-2xl flex flex-col items-center justify-center border-dashed border-zinc-800">
              <Trophy size={20} className="text-zinc-800 mb-2" />
              <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest">目前無規劃賽程</p>
            </div>
          )}
        </div>
      </section>

      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-[10px] font-black text-zinc-500 tracking-[0.2em] uppercase flex items-center gap-1.5">
             <Activity size={12} className="text-sunset-rose" /> 近期表現
          </h2>
        </div>

        {/* Filters and Best Record */}
        <div className="grid grid-cols-5 gap-3 mb-6 z-20 items-stretch">
            <div className="col-span-3 relative">
                <select 
                  value={selectedChartType}
                  onChange={(e) => setSelectedChartType(e.target.value)}
                  className="w-full h-full appearance-none bg-zinc-900/60 backdrop-blur-md border border-white/10 text-white font-black text-lg rounded-xl py-3 pl-4 pr-10 outline-none transition-all shadow-inner"
                >
                  {trainingTypesList.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
            </div>

            <div className="col-span-2 glass-card rounded-xl py-2 px-3 border-sunset-gold/30 shadow-glow-gold relative overflow-hidden group flex flex-col justify-center">
               <div className="absolute inset-0 bg-gradient-to-br from-sunset-gold/10 via-transparent to-transparent opacity-60"></div>
               <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-gradient-to-r from-transparent via-sunset-gold/5 to-transparent rotate-45 animate-[shimmer_4s_infinite] pointer-events-none"></div>
               <div className="relative z-10">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Zap size={9} className="text-sunset-gold fill-sunset-gold animate-bounce" style={{ animationDuration: '3s' }} />
                    <span className="text-[7.5px] font-black text-sunset-gold uppercase tracking-tighter">最速紀錄</span>
                  </div>
                  <div className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-sunset-gold via-white to-sunset-gold font-mono tracking-tighter drop-shadow-[0_0_8px_rgba(251,191,36,0.3)] leading-tight">
                    {allTimeBest ? allTimeBest.toFixed(4) : '--'}<span className="text-[8px] ml-0.5 text-zinc-500 font-normal">s</span>
                  </div>
               </div>
            </div>
        </div>

        {selectedChartType ? (
            <div className="space-y-6 pb-4">
               {currentTypeSummaries.map((summary, idx) => (
                 <div key={idx} className="glass-card rounded-2xl p-5 border-l-2 border-l-transparent hover:border-l-sunset-rose group">
                   <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-white font-mono tracking-wider">{format(new Date(summary.date), 'yyyy.MM.dd')}</span>
                          <span className="text-[10px] text-zinc-500 font-black bg-white/5 px-2 py-0.5 rounded uppercase">
                             {summary.players.reduce((acc, p) => acc + p.count, 0)} SETS
                          </span>
                      </div>
                      <div className="flex gap-2 text-[8px] font-black uppercase">
                        <span className="flex items-center gap-1 text-zinc-400"><div className="w-1.5 h-1.5 bg-zinc-500 rounded-sm"></div>平均</span>
                        <span className="flex items-center gap-1 text-sunset-gold"><div className="w-1.5 h-1.5 bg-sunset-gold rounded-full"></div>最快</span>
                        <span className="flex items-center gap-1 text-emerald-500"><div className="w-2 h-0.5 bg-emerald-500"></div>穩定度</span>
                      </div>
                   </div>
                   
                   {/* Combined Composed Chart */}
                   <div className="h-56 w-full">
                       <ResponsiveContainer width="100%" height="100%">
                           <ComposedChart data={summary.players} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis 
                                    dataKey="name" 
                                    tick={{fontSize: 9, fill: '#71717a', fontWeight: 900}} 
                                    axisLine={false} 
                                    tickLine={false} 
                                    interval={0}
                                />
                                {/* Left Y-Axis for Time (Seconds) */}
                                <YAxis 
                                    yAxisId="left"
                                    tick={{fontSize: 9, fill: '#71717a', fontWeight: 900}} 
                                    axisLine={false} 
                                    tickLine={false}
                                    domain={['auto', 'auto']}
                                />
                                {/* Right Y-Axis for Stability (0-100) */}
                                <YAxis 
                                    yAxisId="right"
                                    orientation="right"
                                    domain={[0, 100]}
                                    hide
                                />
                                <Tooltip 
                                    cursor={{fill: 'rgba(255,255,255,0.05)'}}
                                    contentStyle={{backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '10px'}}
                                    itemStyle={{padding: 0}}
                                    formatter={(value: number, name: string) => {
                                        if (name === 'avg') return [`${value}s`, '平均時間'];
                                        if (name === 'best') return [`${value}s`, '最快時間'];
                                        if (name === 'stability') return [`${value}`, '穩定分數'];
                                        return [value, name];
                                    }}
                                    labelFormatter={(label) => `選手: ${label}`}
                                />
                                
                                {/* Bars for Average Time */}
                                <Bar yAxisId="left" dataKey="avg" barSize={12} radius={[4, 4, 0, 0]} fill="#52525b" fillOpacity={0.6} />
                                
                                {/* Points/Scatter for Best Time (using Bar hack or Scatter inside composed) -> Use Bar for simplicity but colored Gold */}
                                {/* To overlap, we can use another Bar with thinner width, or just side-by-side. 
                                    Let's put Best Time as a distinct colored bar next to Avg, or use Line/Scatter. 
                                    Let's try a small diamond shape via Line with dots only? No, use Bar for comparison.
                                */}
                                <Bar yAxisId="left" dataKey="best" barSize={6} radius={[4, 4, 0, 0]} fill="#fbbf24" />

                                {/* Line for Stability */}
                                <Line 
                                    yAxisId="right" 
                                    type="monotone" 
                                    dataKey="stability" 
                                    stroke="#10b981" 
                                    strokeWidth={2} 
                                    dot={{r: 2, fill: '#10b981', strokeWidth: 0}} 
                                    activeDot={{r: 4}} 
                                />
                           </ComposedChart>
                       </ResponsiveContainer>
                   </div>
                 </div>
               ))}
            </div>
        ) : (
           <div className="text-center py-20 opacity-30">
             <BarChart3 size={32} className="mx-auto mb-4" />
             <p className="text-[10px] font-black uppercase tracking-widest">目前無任何戰術數據</p>
           </div>
        )}
      </section>
    </div>
  );
};

export default Dashboard;
