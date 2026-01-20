
import React, { useState, useMemo } from 'react';
import { DataRecord, TrainingStat } from '../types';
import { api } from '../services/api';
import { Calendar, ChevronRight, X, ChevronDown, Activity, Clock, Award, BarChart3, MapPin, ExternalLink, Trophy, Trash2, Edit2, Check, Loader2, AlertTriangle, Info, Zap } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

interface DashboardProps {
  data: DataRecord[];
  refreshData: () => Promise<void>;
  onNavigateToRaces: () => void;
  defaultTrainingType?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ data, refreshData, onNavigateToRaces, defaultTrainingType }) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedChartType, setSelectedChartType] = useState<string>(defaultTrainingType || '');
  const [editingLap, setEditingLap] = useState<DataRecord | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | number | null>(null);
  const [showStabilityInfo, setShowStabilityInfo] = useState(false);

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

  const trainingStats = useMemo(() => {
    const stats = new Map<string, { [key: string]: { id: string | number, value: number, fullRecord: DataRecord }[] }>();
    data.filter(r => r.item === 'training').forEach(record => {
      if (!stats.has(record.date)) stats.set(record.date, {});
      const dayStats = stats.get(record.date)!;
      if (!dayStats[record.name]) dayStats[record.name] = [];
      dayStats[record.name].push({ id: record.id!, value: parseFloat(record.value), fullRecord: record });
    });

    const result: TrainingStat[] = [];
    stats.forEach((items, date) => {
      Object.keys(items).forEach(itemName => {
        const records = items[itemName];
        const values = records.map(r => r.value);
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = sum / values.length;
        
        const squareDiffs = values.map(v => Math.pow(v - avg, 2));
        const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
        const stdDev = Math.sqrt(avgSquareDiff);
        
        // 調整穩定度邏輯：當標準差為 0.5s 時，得分約為 85 (100 - 0.5 * 30)
        const stability = Math.max(0, 100 - (stdDev * 30));

        result.push({
          date, itemName, avg: parseFloat(avg.toFixed(4)), best: Math.min(...values),
          count: values.length, records: records.map(r => ({ id: r.id, value: r.value })), stabilityScore: parseFloat(stability.toFixed(1))
        });
      });
    });
    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [data]);

  const trainingTypesList = useMemo(() => Array.from(new Set(trainingStats.map(s => s.itemName))), [trainingStats]);
  const currentTypeStats = useMemo(() => trainingStats.filter(s => s.itemName === selectedChartType), [trainingStats, selectedChartType]);

  const chartData = useMemo(() => {
    if (!selectedChartType) return [];
    return currentTypeStats.slice(0, 5).reverse().map(s => ({ 
      date: format(new Date(s.date), 'MM/dd'), 
      avg: s.avg,
      best: s.best
    }));
  }, [currentTypeStats, selectedChartType]);

  const allTimeBest = useMemo(() => {
    if (!selectedChartType) return null;
    const filtered = data.filter(r => r.item === 'training' && r.name === selectedChartType);
    if (filtered.length === 0) return null;
    return Math.min(...filtered.map(r => parseFloat(r.value)));
  }, [data, selectedChartType]);

  const detailStats = useMemo(() => {
    if (!selectedDate) return null;
    return trainingStats.find(s => s.date === selectedDate && s.itemName === selectedChartType);
  }, [selectedDate, trainingStats, selectedChartType]);

  const handleUpdateLap = async () => {
    if (!editingLap) return;
    setIsUpdating(true);
    const success = await api.submitRecord({
      ...editingLap,
      value: parseFloat(editingLap.value).toFixed(4)
    });
    if (success) {
      await refreshData();
      setEditingLap(null);
    } else {
      alert('同步失敗');
    }
    setIsUpdating(false);
  };

  const executeDelete = async () => {
    if (!confirmDeleteId) return;
    setIsUpdating(true);
    const success = await api.deleteRecord(confirmDeleteId, 'training');
    if (success) {
      await refreshData();
      const stillHasData = data.some(d => d.id !== confirmDeleteId && d.date === selectedDate && d.name === selectedChartType && d.item === 'training');
      if (!stillHasData) setSelectedDate(null);
      setConfirmDeleteId(null);
      setEditingLap(null);
    } else {
      alert('伺服器刪除失敗');
    }
    setIsUpdating(false);
  };

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

        {/* 下拉選單與卡片高度同步縮小 (矮一點) */}
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
          <>
            <div className="glass-card rounded-3xl p-5 h-60 relative mb-6">
               <div className="absolute top-3 right-5 flex gap-4">
                  <div className="flex items-center gap-1.5"><div className="w-2 h-0.5 bg-sunset-rose"></div><span className="text-[8px] font-black text-zinc-500 uppercase">平均</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2 h-0.5 bg-sunset-gold"></div><span className="text-[8px] font-black text-zinc-500 uppercase">最快</span></div>
               </div>
               {chartData.length > 0 ? (
                 <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={chartData} margin={{ top: 25, right: 10, left: -20, bottom: 0 }}>
                     <defs>
                       <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.25}/>
                         <stop offset="100%" stopColor="#f43f5e" stopOpacity={0}/>
                       </linearGradient>
                     </defs>
                     <XAxis dataKey="date" stroke="#52525b" fontSize={9} tickLine={false} axisLine={false} tickMargin={10} tick={{fill: '#71717a', fontWeight: 700}} />
                     <YAxis hide domain={['dataMin - 0.01', 'dataMax + 0.01']} />
                     <Tooltip cursor={{stroke: 'rgba(255,255,255,0.1)'}} content={({ active, payload }) => active && payload && (
                       <div className="bg-black/90 backdrop-blur border border-white/10 px-3 py-2 rounded-lg text-[10px] font-mono font-black space-y-1 shadow-2xl">
                         <div className="text-sunset-rose">AVG: {Number(payload[0].value).toFixed(4)}s</div>
                         <div className="text-sunset-gold">BEST: {Number(payload[1].value).toFixed(4)}s</div>
                       </div>
                     )} />
                     <Area type="monotone" dataKey="avg" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#chartGrad)" dot={{ r: 6, fill: '#f43f5e', strokeWidth: 0 }} activeDot={{ r: 8, strokeWidth: 0 }} />
                     <Area type="monotone" dataKey="best" stroke="#fbbf24" strokeWidth={2} strokeDasharray="5 5" fill="transparent" dot={{ r: 6, fill: '#fbbf24', strokeWidth: 0 }} activeDot={{ r: 8, strokeWidth: 0 }} />
                   </AreaChart>
                 </ResponsiveContainer>
               ) : (
                 <div className="flex h-full items-center justify-center text-zinc-600 text-[10px] font-black uppercase">等待雲端數據同步...</div>
               )}
            </div>

            <div className="space-y-3 pb-4">
               {currentTypeStats.map((stat, idx) => (
                 <div key={idx} onClick={() => setSelectedDate(stat.date)} className="glass-card rounded-2xl p-5 cursor-pointer active:scale-[0.98] transition-all border-l-2 border-l-transparent hover:border-l-sunset-rose group">
                   <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-black text-white font-mono tracking-wider">{format(new Date(stat.date), 'yyyy.MM.dd')}</span>
                      <div className="text-[10px] text-zinc-500 font-black uppercase tracking-widest bg-white/5 px-2 py-1 rounded border border-white/5">{stat.count} SETS</div>
                   </div>
                   <div className="grid grid-cols-3 gap-3">
                      <div className="flex flex-col bg-black/20 p-2 rounded-xl">
                        <span className="text-[9px] text-zinc-500 uppercase font-black mb-0.5">平均</span>
                        <span className="text-xl font-black text-white font-mono tracking-tight">{stat.avg.toFixed(4)}<span className="text-xs ml-0.5 text-zinc-500">s</span></span>
                      </div>
                      <div className="flex flex-col bg-black/20 p-2 rounded-xl border border-sunset-gold/10">
                        <span className="text-[9px] text-sunset-gold uppercase font-black mb-0.5">最快</span>
                        <span className="text-xl font-black text-sunset-gold font-mono tracking-tight">{stat.best.toFixed(4)}<span className="text-xs ml-0.5 text-sunset-gold/50">s</span></span>
                      </div>
                      <div className="flex flex-col bg-black/20 p-2 rounded-xl relative">
                         <div className="flex justify-between items-center mb-0.5">
                            <span className="text-[9px] text-zinc-500 uppercase font-black">穩定度</span>
                            <button 
                                onClick={(e) => { e.stopPropagation(); setShowStabilityInfo(!showStabilityInfo); }}
                                className="text-zinc-600 hover:text-zinc-400"
                            >
                                <Info size={10} />
                            </button>
                         </div>
                        <div className="h-1.5 w-full bg-zinc-800 rounded-full mt-auto overflow-hidden">
                           <div className={`h-full rounded-full ${stat.stabilityScore > 85 ? 'bg-green-500' : stat.stabilityScore > 70 ? 'bg-amber-500' : 'bg-sunset-rose'}`} style={{ width: `${stat.stabilityScore}%` }}></div>
                        </div>
                        <span className="text-[10px] font-mono font-black text-right mt-1 text-zinc-400">{stat.stabilityScore.toFixed(0)}</span>
                      </div>
                   </div>
                 </div>
               ))}
            </div>
          </>
        ) : (
           <div className="text-center py-20 opacity-30">
             <BarChart3 size={32} className="mx-auto mb-4" />
             <p className="text-[10px] font-black uppercase tracking-widest">目前無任何戰術數據</p>
           </div>
        )}
      </section>

      {detailStats && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in" onClick={() => { if(!isUpdating) setSelectedDate(null); }}>
          <div className="glass-card w-full max-w-md rounded-[32px] p-5 shadow-2xl animate-slide-up bg-[#0f0508] max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
             <div className="flex justify-between items-start mb-6 shrink-0">
               <div>
                 <p className="text-[9px] text-sunset-rose font-black uppercase tracking-[0.2em] mb-1">詳細數據</p>
                 <h3 className="text-2xl font-black text-white font-mono">{format(new Date(detailStats.date), 'yyyy.MM.dd')}</h3>
                 <p className="text-zinc-500 text-[10px] font-black uppercase mt-1 tracking-widest">{detailStats.itemName}</p>
               </div>
               <button onClick={() => setSelectedDate(null)} className="p-2.5 bg-white/5 rounded-full text-zinc-500"><X size={20} /></button>
             </div>
             
             <div className="grid grid-cols-2 gap-4 mb-6 shrink-0">
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex flex-col items-center">
                   <Clock size={16} className="text-sunset-rose mb-2" />
                   <div className="text-2xl font-black text-white font-mono">{detailStats.avg.toFixed(4)}</div>
                   <span className="text-[8px] text-zinc-500 font-black uppercase mt-1">平均秒數</span>
                </div>
                <div className="bg-sunset-gold/5 rounded-2xl p-4 border border-sunset-gold/10 flex flex-col items-center">
                   <Award size={16} className="text-sunset-gold mb-2" />
                   <div className="text-2xl font-black text-sunset-gold font-mono">{detailStats.best.toFixed(4)}</div>
                   <span className="text-[8px] text-zinc-500 font-black uppercase mt-1">最佳單趟</span>
                </div>
             </div>

             <div className="bg-black/20 rounded-2xl p-4 border border-white/5 flex-1 overflow-hidden flex flex-col">
               <h4 className="text-[9px] text-zinc-600 font-black uppercase tracking-widest mb-3 shrink-0 italic">單趟數據管理</h4>
               <div className="space-y-2 overflow-y-auto no-scrollbar flex-1 pb-2 px-1">
                 {data.filter(d => d.date === detailStats.date && d.name === detailStats.itemName && d.item === 'training').map((record) => (
                   <div key={record.id} className="flex items-center gap-2 bg-white/5 rounded-xl p-2 border border-white/5 relative min-h-[48px] overflow-hidden">
                     {editingLap?.id === record.id ? (
                        <div className="flex items-center gap-2 w-full animate-fade-in">
                          <input 
                            autoFocus
                            type="number" 
                            step="0.0001"
                            onInput={(e) => {
                                const target = e.target as HTMLInputElement;
                                const parts = target.value.split('.');
                                if (parts[1] && parts[1].length > 4) {
                                    target.value = parts[0] + '.' + parts[1].slice(0, 4);
                                }
                            }}
                            className="flex-1 bg-black/50 text-white text-lg font-mono font-black outline-none p-2 rounded-lg border border-sunset-rose/50 min-w-0"
                            value={editingLap.value}
                            onChange={(e) => setEditingLap({...editingLap, value: e.target.value})}
                          />
                          <div className="flex gap-1 shrink-0">
                            <button 
                              onClick={handleUpdateLap} 
                              disabled={isUpdating} 
                              className="w-10 h-10 flex items-center justify-center bg-green-500/20 text-green-500 rounded-lg active:scale-95 transition-all border border-green-500/20"
                            >
                              {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <Check size={18} />}
                            </button>
                            <button 
                              onClick={() => setConfirmDeleteId(record.id!)}
                              className="w-10 h-10 flex items-center justify-center bg-rose-500/20 text-rose-500 rounded-lg active:scale-95 transition-all border border-rose-500/20"
                            >
                              <Trash2 size={18} />
                            </button>
                            <button 
                              onClick={() => setEditingLap(null)}
                              className="w-10 h-10 flex items-center justify-center bg-zinc-800 text-zinc-400 rounded-lg active:scale-95"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        </div>
                     ) : (
                       <div className="flex items-center justify-between w-full">
                        <div 
                          className={`flex-1 text-lg font-mono font-black px-2 py-2 truncate ${parseFloat(record.value) === detailStats.best ? 'text-sunset-gold' : 'text-zinc-300'}`}
                        >
                          {parseFloat(record.value).toFixed(4)} <span className="text-[10px] text-zinc-600 font-normal">s</span>
                        </div>
                        
                        <button 
                          onClick={(e) => { e.stopPropagation(); setEditingLap({ ...record }); }}
                          className="w-10 h-10 flex items-center justify-center text-zinc-500 hover:text-white bg-white/5 rounded-lg active:scale-95 transition-all border border-white/5"
                        >
                          <Edit2 size={16} />
                        </button>
                       </div>
                     )}
                   </div>
                 ))}
               </div>
             </div>
          </div>
        </div>
      )}

      {confirmDeleteId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-xs rounded-3xl p-6 shadow-2xl border-sunset-rose/30 animate-scale-in text-center">
            <div className="w-16 h-16 bg-sunset-rose/20 rounded-full flex items-center justify-center mx-auto mb-4">
               <AlertTriangle size={32} className="text-sunset-rose" />
            </div>
            <h3 className="text-lg font-black text-white mb-2">確認移除數據？</h3>
            <p className="text-xs text-zinc-400 mb-6 leading-relaxed">此筆紀錄將從資料庫中永久抹除，此操作無法復原。</p>
            <div className="grid grid-cols-2 gap-3 mt-6">
              <button onClick={() => setConfirmDeleteId(null)} className="py-3 bg-zinc-900 text-zinc-400 font-bold text-xs rounded-xl active:bg-zinc-800 transition-colors border border-white/5">取消</button>
              <button onClick={executeDelete} className="py-3 bg-sunset-rose text-white font-bold text-xs rounded-xl active:scale-95 transition-all shadow-glow-rose">確定刪除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
