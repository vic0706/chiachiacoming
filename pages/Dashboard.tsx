
import React, { useState, useMemo } from 'react';
import { DataRecord, LookupItem } from '../types';
import { Calendar, ChevronRight, X, ChevronDown, Activity, BarChart3, MapPin, ExternalLink, Trophy, Filter, Users, Download } from 'lucide-react';
import { ComposedChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import { format, differenceInYears, subMonths, subWeeks } from 'date-fns';

interface DashboardProps {
  data: DataRecord[];
  refreshData: () => Promise<void>;
  onNavigateToRaces: () => void;
  onNavigateToPerson: (name: string) => void;
  defaultTrainingType?: string;
  people?: LookupItem[];
}

interface PlayerDailyStats {
    name: string;
    avg: number;
    best: number;
    stability: number;
    count: number;
}

interface DailySummary {
    date: string;
    itemName: string;
    players: PlayerDailyStats[];
}

const Dashboard: React.FC<DashboardProps> = ({ data, refreshData, onNavigateToRaces, onNavigateToPerson, defaultTrainingType, people = [] }) => {
  const [selectedChartType, setSelectedChartType] = useState<string>(defaultTrainingType || '');
  
  // Date Filters (Default 1 Week)
  const [startDate, setStartDate] = useState(format(subWeeks(new Date(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  // Date Filter UI State
  const [activeRange, setActiveRange] = useState<'1W' | '1M' | '3M' | 'custom'>('1W');
  const [showCustomDate, setShowCustomDate] = useState(false);

  // State for Expanded Chart View
  const [expandedChart, setExpandedChart] = useState<{data: any[], title: string, date: string, itemName: string} | null>(null);
  
  // State for Drill Down Detail Modal (Bottom Sheet)
  const [drillDownData, setDrillDownData] = useState<{title: string, records: DataRecord[]} | null>(null);

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

  // Date Range Helper
  const setQuickRange = (range: '1W' | '1M' | '3M') => {
      setActiveRange(range);
      setShowCustomDate(false);
      
      const end = new Date();
      let start = new Date();
      
      if (range === '1W') start = subWeeks(end, 1);
      if (range === '1M') start = subMonths(end, 1);
      if (range === '3M') start = subMonths(end, 3);
      
      setStartDate(format(start, 'yyyy-MM-dd'));
      setEndDate(format(end, 'yyyy-MM-dd'));
  };

  const toggleCustomDate = () => {
      if (activeRange !== 'custom') {
          setActiveRange('custom');
          setShowCustomDate(true);
      } else {
          setShowCustomDate(!showCustomDate);
      }
  };

  // Complex Stats Logic
  const trainingStats = useMemo(() => {
    const grouped = new Map<string, DataRecord[]>();
    
    // Filter by Date Range
    const filteredData = data.filter(r => 
        r.item === 'training' && 
        r.date >= startDate && 
        r.date <= endDate
    );

    filteredData.forEach(r => {
        const key = `${r.date}_${r.name}`;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(r);
    });

    const summaries: DailySummary[] = [];

    grouped.forEach((records, key) => {
        const [date, itemName] = key.split('_');
        
        const personGroup = new Map<string, number[]>();
        const personNameMap = new Map<string, string>();

        records.forEach(r => {
            const pid = String(r.people_id);
            if (!personGroup.has(pid)) personGroup.set(pid, []);
            personGroup.get(pid)!.push(parseFloat(r.value));
            personNameMap.set(pid, r.person_name);
        });

        const players: PlayerDailyStats[] = [];
        personGroup.forEach((values, pid) => {
            const sum = values.reduce((a, b) => a + b, 0);
            const avg = sum / values.length;
            const best = Math.min(...values);
            const max = Math.max(...values);
            const range = max - best;

            const squareDiffs = values.map(v => Math.pow(v - avg, 2));
            const variance = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
            const stdDev = Math.sqrt(variance);
            
            // New Stability Formula
            const cv = avg === 0 ? 0 : stdDev / avg;
            const s_cv = 100 - (cv * 700);
            const s_range = 100 - (range * 50);
            const stability = Math.max(0, Math.min(100, (s_cv * 0.6) + (s_range * 0.4)));

            players.push({
                name: personNameMap.get(pid) || 'Unknown',
                avg,
                best,
                stability,
                count: values.length
            });
        });

        summaries.push({
            date,
            itemName,
            players: players.sort((a, b) => a.best - b.best) // Sort players by best time
        });
    });

    return summaries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [data, startDate, endDate]);

  const trainingTypesList = useMemo(() => {
      // Get types from ALL data, not just filtered, so selector isn't empty if date range is small
      const allTraining = data.filter(r => r.item === 'training');
      return Array.from(new Set(allTraining.map(s => s.name)));
  }, [data]);

  const currentTypeSummaries = useMemo(() => trainingStats.filter(s => s.itemName === selectedChartType), [trainingStats, selectedChartType]);

  // Helper to calculate age at record date
  const calculateAge = (birthday: string, recordDate: string) => {
      if (!birthday) return 0;
      return differenceInYears(new Date(recordDate), new Date(birthday));
  };

  // Logic for Age Group Bests (3yo - 6yo) - Based on ALL data for "Legend", not filtered by date
  const ageBests = useMemo(() => {
      if (!selectedChartType) return { 3: null, 4: null, 5: null, 6: null };
      
      const records = data.filter(r => r.item === 'training' && r.name === selectedChartType);
      const bests: Record<number, { value: number; person: LookupItem } | null> = { 3: null, 4: null, 5: null, 6: null };

      records.forEach(r => {
          const person = people.find(p => String(p.id) === String(r.people_id));
          if (!person?.birthday) return;
          
          const age = calculateAge(person.birthday, r.date);
          
          if (age >= 3 && age <= 6) {
              const val = parseFloat(r.value);
              if (!bests[age] || val < bests[age]!.value) {
                  bests[age] = { value: val, person };
              }
          }
      });
      return bests;
  }, [data, selectedChartType, people]);

  const handleChartClick = (summary: DailySummary) => {
      const chartData = summary.players.map(p => ({
        name: p.name,
        '平均': parseFloat(p.avg.toFixed(3)),
        '最快': parseFloat(p.best.toFixed(3)),
        stability: parseFloat(p.stability.toFixed(0))
      }));
      setExpandedChart({
          data: chartData,
          title: `${format(new Date(summary.date), 'yyyy.MM.dd')} - ${summary.itemName}`,
          date: summary.date,
          itemName: summary.itemName
      });
  };

  const handleDrillDown = (activeLabel: string) => {
      if (!expandedChart) return;
      
      const records = data.filter(r => 
          r.item === 'training' && 
          r.date === expandedChart.date && 
          r.name === expandedChart.itemName && 
          r.person_name === activeLabel
      ).sort((a, b) => parseFloat(a.value) - parseFloat(b.value)); // Sort by best time

      setDrillDownData({
          title: `${activeLabel} @ ${expandedChart.date}`,
          records: records
      });
  };

  const handleExportChartCSV = () => {
      if (!expandedChart) return;

      const targetRecords = data.filter(r => 
          r.item === 'training' && 
          r.date === expandedChart.date && 
          r.name === expandedChart.itemName
      ).sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));

      if (targetRecords.length === 0) {
          alert("無數據可導出");
          return;
      }

      const grouped = new Map<string, string[]>();
      targetRecords.forEach(r => {
          const key = r.person_name;
          if (!grouped.has(key)) grouped.set(key, []);
          grouped.get(key)!.push(r.value);
      });

      let csvContent = "\uFEFF"; 
      csvContent += "Date,Name,null,null,Score1,Score2,Score3,Score4,Score5,Score6,Score7,Score8,Score9,Score10\n";
      
      const sortedNames = Array.from(grouped.keys()).sort();
      
      sortedNames.forEach(name => {
          const scores = grouped.get(name) || [];
          const row = [
              expandedChart.date, 
              name, 
              "", 
              "", 
              ...scores
          ].join(",");
          csvContent += row + "\n";
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `LR_${expandedChart.itemName}_${expandedChart.date}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  // Filter ages that actually have a record
  const activeAges = [3, 4, 5, 6].filter(age => ageBests[age as 3|4|5|6] !== null);
  
  // Create looped array for marquee only if we have active ages
  const marqueeItems = activeAges.length > 0 
      ? [...activeAges, ...activeAges, ...activeAges, ...activeAges, ...activeAges, ...activeAges] 
      : [];

  return (
    <div className="h-full overflow-y-auto px-4 py-6 space-y-8 animate-fade-in no-scrollbar pb-24">
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xs font-black text-zinc-500 tracking-[0.2em] uppercase flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-chiachia-green shadow-[0_0_5px_#39e75f]"></span> 近期賽事預報
          </h2>
          {upcomingRaces.hasMore && (
            <button onClick={onNavigateToRaces} className="text-xs text-chiachia-green font-black tracking-widest uppercase flex items-center gap-1">
              查看更多 <ChevronRight size={14} />
            </button>
          )}
        </div>
        
        <div className="space-y-3">
          {upcomingRaces.topTwo.length > 0 ? (
            upcomingRaces.topTwo.map((race, idx) => (
              <div key={idx} className="rounded-2xl p-4 flex items-center gap-4 relative overflow-hidden group border border-chiachia-green/40 shadow-[0_4px_15px_rgba(57,231,95,0.15)] bg-zinc-900/40 backdrop-blur-md">
                 <div className="absolute inset-0 bg-black/65 z-0"></div>
                 <div className="flex-none flex flex-col items-center justify-center bg-black/70 border border-white/20 rounded-xl w-14 h-14 relative z-10 shadow-lg">
                    <span className="text-[10px] text-chiachia-green uppercase font-black">{format(race.dateObj, 'MMM')}</span>
                    <span className="text-xl font-black text-white font-mono leading-none">{format(race.dateObj, 'dd')}</span>
                 </div>
                 <div className="flex-1 min-w-0 relative z-10">
                   <h3 className="text-white font-bold text-base truncate drop-shadow-md">{race.name}</h3>
                   <div className="text-xs text-chiachia-green font-black uppercase tracking-wider mt-1 drop-shadow-sm">{race.race_group || 'BxB'}</div>
                 </div>
                 {race.address && (
                   <button 
                     onClick={(e) => { e.stopPropagation(); handleNavigate(race.address); }} 
                     className="p-2.5 rounded-xl bg-black/60 text-white border border-white/20 backdrop-blur-md active:scale-90 transition-all z-10 shadow-liquid hover:bg-chiachia-green/20"
                   >
                      {race.address.startsWith('http') ? <ExternalLink size={16} /> : <MapPin size={16} />}
                   </button>
                 )}
              </div>
            ))
          ) : (
             <div className="py-10 glass-card rounded-2xl flex flex-col items-center justify-center border-dashed border-zinc-800">
              <Trophy size={20} className="text-zinc-800 mb-2" />
              <p className="text-zinc-600 text-xs font-black uppercase tracking-widest">目前無規劃賽程</p>
            </div>
          )}
        </div>
      </section>

      {/* Age Group Bests Marquee */}
      {selectedChartType && activeAges.length > 0 && (
            <div className="w-full relative overflow-hidden h-28 -mt-4 mb-[-50px]">
                 {/* Left/Right Gradient Masks - Match Black BG */}
                <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none"></div>
                <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none"></div>

                <div className="flex gap-16 animate-marquee-horizontal w-max items-center px-4 h-full">
                    {marqueeItems.map((age, i) => {
                        const info = ageBests[age as 3|4|5|6];
                        if (!info) return null;

                        let avatar = null;
                        if (info.person) {
                            const [sUrlBase, sUrlFragment] = (info.person.s_url || '').split('#');
                            let sz=1, sx=50, sy=50;
                            if(sUrlFragment) {
                                const sp = new URLSearchParams(sUrlFragment);
                                sz = parseFloat(sp.get('z')||'1');
                                sx = parseFloat(sp.get('x')||'50');
                                sy = parseFloat(sp.get('y')||'50');
                            }
                            avatar = sUrlBase ? (
                                <img src={sUrlBase} className="w-full h-full object-contain bg-black" style={{transform: `translate(${(sx - 50) * 1.5}%, ${(sy - 50) * 1.5}%) scale(${sz})`}} />
                            ) : (
                                <span className="text-xl font-black text-white">{info.person.name.charAt(0)}</span>
                            );
                        }

                        return (
                            <div key={`${age}-${i}`} className="flex items-center gap-4 shrink-0">
                                {/* Left: Text Info */}
                                <div className="flex flex-col items-end">
                                    <span className="text-xs font-black text-zinc-400 tracking-wider mb-0.5 italic flex items-center">
                                       <span className="text-chiachia-green not-italic mr-1.5 bg-chiachia-green/10 px-1.5 rounded shadow-sm">{age}歲</span>最速伝説
                                    </span>
                                    {/* Gold Glory Effect */}
                                    <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 font-mono italic tracking-tighter leading-none drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]">
                                        {info.value.toFixed(3)}s
                                    </span>
                                </div>
                                
                                {/* Right: Avatar */}
                                <div className="w-20 h-20 rounded-full border-2 border-yellow-400/80 shadow-[0_0_15px_rgba(251,191,36,0.4)] relative overflow-hidden bg-zinc-900 flex items-center justify-center shrink-0">
                                   {avatar}
                                   <div className="absolute inset-0 rounded-full shadow-[inset_0_0_10px_rgba(0,0,0,0.5)] pointer-events-none"></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <style>{`
                    .animate-marquee-horizontal {
                        animation: marqueeH 40s linear infinite;
                    }
                    @keyframes marqueeH {
                        0% { transform: translateX(0); }
                        100% { transform: translateX(-50%); } 
                    }
                `}</style>
            </div>
      )}

      {/* Stats List Section - Restored to Chart Cards */}
      <section className="mt-4">
          <div className="mb-2">
              <h2 className="text-xs font-black text-zinc-500 tracking-[0.2em] uppercase flex items-center gap-1.5">
                  <Activity size={14} className="text-chiachia-green" /> 訓練趨勢分析
              </h2>
          </div>

          <div className="flex flex-col gap-2 mb-4">
                {/* Unified Row for Select and Date Controls */}
                <div className="flex items-center justify-between gap-2">
                    {/* Selector */}
                    <div className="relative group flex-1 h-10">
                        <div className="absolute inset-0 bg-white/5 rounded-xl border border-white/10 pointer-events-none group-hover:bg-white/10 transition-colors"></div>
                        <select 
                            value={selectedChartType}
                            onChange={(e) => setSelectedChartType(e.target.value)}
                            className="w-full h-full appearance-none bg-transparent text-white font-black text-sm rounded-xl pl-3 pr-8 outline-none text-left"
                        >
                            {trainingTypesList.map(t => <option key={t} value={t} className="text-black">{t}</option>)}
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                    </div>

                    {/* Date Buttons */}
                    <div className="flex items-center bg-zinc-900/50 p-1 rounded-xl border border-white/5 gap-1 shrink-0 h-10">
                        {(['1W', '1M', '3M'] as const).map(range => (
                            <button 
                                key={range}
                                onClick={() => setQuickRange(range)} 
                                className={`text-[11px] font-bold px-3 h-full rounded-lg transition-all ${activeRange === range ? 'bg-white/10 text-white shadow-inner' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                {range}
                            </button>
                        ))}
                        <div className="w-[1px] h-3 bg-white/10 mx-0.5"></div>
                        <button 
                            onClick={toggleCustomDate} 
                            className={`px-2.5 h-full rounded-lg transition-all flex items-center justify-center ${activeRange === 'custom' ? 'bg-chiachia-green/20 text-chiachia-green' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            <Calendar size={16} />
                        </button>
                    </div>
                </div>

                {showCustomDate && (
                    <div className="flex items-center justify-end gap-2 animate-fade-in bg-zinc-900/30 p-2 rounded-xl border border-white/5 border-dashed">
                        <span className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider mr-1">Range</span>
                        <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setActiveRange('custom'); }} className="bg-zinc-950 text-xs font-mono text-zinc-300 outline-none w-auto min-w-[90px] text-center p-1 rounded border border-white/10" />
                        <span className="text-zinc-600 text-xs">-</span>
                        <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setActiveRange('custom'); }} className="bg-zinc-950 text-xs font-mono text-zinc-300 outline-none w-auto min-w-[90px] text-center p-1 rounded border border-white/10" />
                    </div>
                )}
          </div>
          
          {selectedChartType ? (
            <div className="space-y-6">
                 {currentTypeSummaries.length > 0 ? currentTypeSummaries.map((summary, idx) => {
                     // Prepare Data for Recharts
                     const chartData = summary.players.map(p => ({
                        name: p.name,
                        '平均': parseFloat(p.avg.toFixed(3)),
                        '最快': parseFloat(p.best.toFixed(3)),
                        stability: parseFloat(p.stability.toFixed(0))
                     }));

                     return (
                     <div key={idx} onClick={() => handleChartClick(summary)} className="glass-card rounded-2xl p-4 border-l-2 border-l-transparent hover:border-l-chiachia-green group transition-all cursor-pointer active:scale-[0.99]">
                       <div className="flex justify-between items-center mb-4 pl-1">
                          <div className="flex items-center gap-2">
                              <Calendar size={16} className="text-zinc-400" />
                              <span className="text-lg font-black text-white font-mono tracking-wider">{format(new Date(summary.date), 'yyyy.MM.dd')}</span>
                          </div>
                          <span className="text-[11px] text-zinc-500 font-bold bg-white/5 px-2.5 py-1 rounded-full border border-white/5">{summary.players.length} 位選手</span>
                       </div>
                       
                       {/* Chart Visualization */}
                       <div className="h-44 w-full relative pointer-events-none">
                          <ResponsiveContainer width="100%" height="100%">
                             <ComposedChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }} barGap={2}>
                                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis 
                                    dataKey="name" 
                                    tick={{fontSize: 12, fill: '#a1a1aa', fontWeight: 800}} 
                                    axisLine={false} 
                                    tickLine={false}
                                    interval={0}
                                />
                                <YAxis 
                                    yAxisId="left"
                                    tick={{fontSize: 11, fill: '#71717a', fontFamily: 'monospace'}} 
                                    axisLine={false} 
                                    tickLine={false} 
                                    domain={['auto', 'auto']}
                                />
                                <YAxis 
                                    yAxisId="right"
                                    orientation="right"
                                    tick={{fontSize: 11, fill: '#39e75f', fontFamily: 'monospace'}} 
                                    axisLine={false} 
                                    tickLine={false} 
                                    domain={[0, 100]}
                                    hide={false}
                                />
                                <Tooltip 
                                    cursor={{fill: 'rgba(255,255,255,0.03)'}}
                                    contentStyle={{backgroundColor: '#09090b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)'}}
                                    itemStyle={{padding: 0}}
                                    formatter={(value: number, name: string) => {
                                        if (name === 'stability' || name === '穩定度') return [`${value}%`, '穩定度'];
                                        return [`${value.toFixed(3)}s`, name];
                                    }}
                                    labelStyle={{color: '#a1a1aa', fontWeight: 900, marginBottom: '4px'}}
                                />
                                <Legend iconSize={8} wrapperStyle={{fontSize: '11px', opacity: 0.7, marginTop: '5px'}} />
                                
                                <Line yAxisId="left" type="monotone" dataKey="平均" stroke="#71717a" strokeWidth={2} dot={{r: 2, fill:'#71717a'}} />
                                <Line yAxisId="left" type="monotone" dataKey="最快" stroke="#ffffff" strokeWidth={3} dot={{r: 3, fill:'#ffffff'}} />
                                <Line yAxisId="right" type="monotone" dataKey="stability" name="穩定度" stroke="#39e75f" strokeWidth={2} dot={{r: 2, fill: '#39e75f', stroke: '#39e75f'}} activeDot={{r: 4}} strokeDasharray="1 3" />
                             </ComposedChart>
                          </ResponsiveContainer>
                       </div>
                     </div>
                   )}) : (
                     <div className="py-12 flex flex-col items-center justify-center text-zinc-600">
                         <Activity size={32} className="mb-2 opacity-50"/>
                         <span className="text-xs font-black uppercase tracking-widest">在此區間無數據</span>
                     </div>
                 )}
            </div>
          ) : (
              <div className="py-20 text-center flex flex-col items-center">
                  <BarChart3 size={40} className="text-zinc-700 mb-4" />
                  <p className="text-zinc-500 text-sm font-black uppercase tracking-widest">請選擇訓練項目以查看分析</p>
              </div>
          )}
      </section>

      {/* Expanded Chart Modal */}
      {expandedChart && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in" onClick={() => setExpandedChart(null)}>
           <div className="w-full max-w-lg bg-[#0f0508] border-t sm:border border-white/10 sm:rounded-3xl rounded-t-[32px] p-6 shadow-2xl h-[85vh] flex flex-col animate-slide-up" onClick={e => e.stopPropagation()}>
               <div className="flex justify-between items-center mb-6 shrink-0">
                   <div>
                       <h3 className="text-2xl font-black text-white tracking-tight">{expandedChart.title}</h3>
                       <p className="text-xs text-zinc-500 font-black uppercase tracking-[0.3em] mt-0.5">Detailed Analytics</p>
                   </div>
                   <div className="flex gap-3">
                        {/* CSV Export Button */}
                        <button onClick={handleExportChartCSV} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-full text-emerald-500 border border-emerald-500/20 active:scale-95 transition-all hover:bg-emerald-500/10">
                            <Download size={20} />
                        </button>
                        <button onClick={() => setExpandedChart(null)} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-full text-zinc-500 active:scale-95 border border-white/5"><X size={20} /></button>
                   </div>
               </div>
               
               <div className="h-[45%] w-full shrink-0 mb-4 border-b border-white/5 pb-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                            data={expandedChart.data}
                            margin={{ top: 10, right: 0, left: -20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                            
                            <XAxis 
                                dataKey="name" 
                                tick={{fontSize: 14, fill: '#fff', fontWeight: 700}} 
                                axisLine={false} 
                                tickLine={false}
                                dy={10}
                                interval={0}
                            />
                            
                            <YAxis 
                                yAxisId="left"
                                tick={{fontSize: 12, fill: '#a1a1aa'}} 
                                axisLine={false} 
                                tickLine={false} 
                                domain={['auto', 'auto']}
                            />

                            <YAxis 
                                yAxisId="right"
                                orientation="right"
                                tick={{fontSize: 12, fill: '#39e75f'}} 
                                axisLine={false} 
                                tickLine={false} 
                                domain={[0, 100]}
                            />

                            <Tooltip 
                                cursor={{fill: 'rgba(255,255,255,0.05)'}}
                                contentStyle={{backgroundColor: '#000', border: '1px solid #333', borderRadius: '12px', padding: '12px'}}
                                itemStyle={{fontSize: '14px', fontWeight: 700}}
                                formatter={(value: number, name: string) => {
                                    if (name === 'stability' || name === '穩定度') return [`${value}%`, '穩定度'];
                                    return [`${value.toFixed(3)}s`, name];
                                }}
                            />
                            <Legend wrapperStyle={{fontSize: '12px', paddingTop: '10px'}} />
                            
                            <Line yAxisId="left" dataKey="最快" stroke="#ffffff" strokeWidth={3} dot={{r: 4, fill: '#ffffff'}} activeDot={{r: 6}} />
                            <Line yAxisId="left" dataKey="平均" stroke="#71717a" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                            <Line yAxisId="right" dataKey="stability" name="穩定度" stroke="#39e75f" strokeWidth={2} dot={{r: 3, fill: '#39e75f'}} activeDot={{r: 5}} />
                        </ComposedChart>
                    </ResponsiveContainer>
               </div>

               <div className="flex-1 overflow-y-auto no-scrollbar pr-1">
                   {expandedChart.data.map((item, idx) => (
                       <div key={idx} onClick={() => handleDrillDown(item.name)} className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/50 border border-white/5 active:scale-[0.98] transition-all mb-2">
                           <div className="flex items-center gap-3">
                               <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-black text-zinc-400">{idx + 1}</div>
                               <span className="text-base font-bold text-zinc-300">{item.name}</span>
                           </div>
                           <div className="flex items-center gap-4">
                               <div className="text-right">
                                   <div className="text-[10px] text-zinc-500 uppercase font-bold">Best</div>
                                   <div className="text-base font-mono font-black text-white">{item['最快']}s</div>
                               </div>
                               <div className="text-right">
                                   <div className="text-[10px] text-zinc-500 uppercase font-bold">Stability</div>
                                   <div className={`text-base font-mono font-bold ${item.stability >= 80 ? 'text-emerald-500' : 'text-amber-500'}`}>{item.stability}%</div>
                               </div>
                               <ChevronRight size={18} className="text-zinc-600" />
                           </div>
                       </div>
                   ))}
               </div>
           </div>
        </div>
      )}

      {/* Drill Down Modal */}
      {drillDownData && (
          <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setDrillDownData(null)}>
              <div className="glass-card w-full max-w-md rounded-t-[32px] p-6 shadow-2xl animate-slide-up bg-[#1a1a1a] border-white/10 max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-4 shrink-0">
                       <h3 className="text-xl font-black text-white">{drillDownData.title}</h3>
                       <button onClick={() => setDrillDownData(null)} className="p-2 bg-white/5 rounded-full"><X size={18} /></button>
                  </div>
                  <div className="flex-1 overflow-y-auto no-scrollbar space-y-2">
                      {drillDownData.records.map((rec, i) => (
                          <div key={i} className="flex justify-between items-center p-3 bg-black/40 rounded-xl border border-white/5">
                              <span className="text-zinc-400 font-mono text-sm">#{i + 1}</span>
                              <span className="text-2xl font-mono font-black text-white">{parseFloat(rec.value).toFixed(3)}s</span>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Dashboard;
