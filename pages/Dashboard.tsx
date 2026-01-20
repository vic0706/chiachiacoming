
import React, { useState, useMemo } from 'react';
import { DataRecord, LookupItem } from '../types';
import { api } from '../services/api';
import { Calendar, ChevronRight, X, ChevronDown, Activity, Clock, Award, BarChart3, MapPin, ExternalLink, Trophy, Trash2, Edit2, Check, Loader2, AlertTriangle, Info, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
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
    totalAvg: number;
    totalBest: number;
    totalStability: number;
    recordCount: number;
    players: any[];
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

  // Complex Stats Logic
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
        
        const values = records.map(r => parseFloat(r.value));
        const sum = values.reduce((a, b) => a + b, 0);
        const totalAvg = sum / values.length;
        const totalBest = Math.min(...values);
        
        // Overall Stability
        const squareDiffs = values.map(v => Math.pow(v - totalAvg, 2));
        const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
        const stdDev = Math.sqrt(avgSquareDiff);
        const totalStability = Math.max(0, 100 - (stdDev * 30));

        summaries.push({
            date,
            itemName,
            totalAvg,
            totalBest,
            totalStability,
            recordCount: values.length,
            players: [] // Not needed for display anymore
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
            <div className="space-y-4 pb-4">
               {currentTypeSummaries.map((summary, idx) => {
                 const chartData = [
                    { name: '平均', value: summary.totalAvg, color: '#a1a1aa' },
                    { name: '最快', value: summary.totalBest, color: '#fbbf24' },
                    { name: '穩定', value: summary.totalStability, color: summary.totalStability > 80 ? '#22c55e' : '#f43f5e' },
                 ];

                 return (
                 <div key={idx} className="glass-card rounded-2xl p-5 border-l-2 border-l-transparent hover:border-l-sunset-rose group">
                   <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-white font-mono tracking-wider">{format(new Date(summary.date), 'yyyy.MM.dd')}</span>
                          <span className="text-[10px] text-zinc-500 font-black bg-white/5 px-2 py-0.5 rounded uppercase">{summary.recordCount} SETS</span>
                      </div>
                   </div>
                   
                   {/* Chart Visualization */}
                   <div className="h-28 w-full mt-2">
                      <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={40} tick={{fontSize: 10, fill: '#71717a', fontWeight: 900}} axisLine={false} tickLine={false} />
                            <Tooltip 
                                cursor={{fill: 'rgba(255,255,255,0.05)'}}
                                contentStyle={{backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '10px'}}
                                itemStyle={{color: '#fff'}}
                                formatter={(value: number, name: string) => [name === '穩定' ? value.toFixed(0) : `${value.toFixed(4)}s`, name]}
                            />
                            <Bar dataKey="value" barSize={12} radius={[0, 4, 4, 0]}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Bar>
                         </BarChart>
                      </ResponsiveContainer>
                   </div>
                   
                   {/* Values Row (Optional for quick glance) */}
                   <div className="flex justify-between mt-1 px-1">
                      <div className="text-[9px] text-zinc-500 font-mono">AVG: {summary.totalAvg.toFixed(3)}s</div>
                      <div className="text-[9px] text-sunset-gold font-mono">BEST: {summary.totalBest.toFixed(3)}s</div>
                   </div>
                 </div>
               )})}
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
