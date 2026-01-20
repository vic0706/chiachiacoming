
import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { DataRecord, LookupItem } from '../types';
import { ChevronDown, Settings2, Check, X } from 'lucide-react';
import { format } from 'date-fns';

interface TrainingProps {
  trainingTypes: LookupItem[];
  defaultType: string;
  refreshData: () => Promise<void>;
  data: DataRecord[];
  people: LookupItem[];
  activePersonId: string | number;
  onSelectPerson: (id: string | number) => void;
  pinnedPeopleIds: string[];
  onTogglePinned: (id: string) => void;
}

const Training: React.FC<TrainingProps> = ({ 
  trainingTypes, 
  defaultType, 
  refreshData, 
  data, 
  people, 
  activePersonId, 
  onSelectPerson,
  pinnedPeopleIds,
  onTogglePinned
}) => {
  const [selectedTypeId, setSelectedTypeId] = useState<string>('');
  const [inputValue, setInputValue] = useState('');
  
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [lastRecord, setLastRecord] = useState<string | null>(null);
  const [showPeopleModal, setShowPeopleModal] = useState(false);

  useEffect(() => {
    if (defaultType && trainingTypes.length > 0) {
        const found = trainingTypes.find(t => t.name === defaultType);
        if (found) setSelectedTypeId(String(found.id));
    } else if (trainingTypes.length > 0 && !selectedTypeId) {
        setSelectedTypeId(String(trainingTypes[0].id));
    }
  }, [defaultType, trainingTypes]);

  const selectedTypeName = useMemo(() => {
    return trainingTypes.find(t => String(t.id) === selectedTypeId)?.name || '';
  }, [selectedTypeId, trainingTypes]);

  const activePerson = useMemo(() => {
    return people.find(p => String(p.id) === String(activePersonId));
  }, [people, activePersonId]);

  const pinnedPeople = useMemo(() => {
    return people.filter(p => pinnedPeopleIds.includes(String(p.id)));
  }, [people, pinnedPeopleIds]);

  // ★★★ 動態網格配置：確保填滿空間不滑動，依人數最大化按鈕，純文字顯示 ★★★
  const gridConfig = useMemo(() => {
    const count = pinnedPeople.length;
    let cols = 1;
    let rows = 1;
    let textSize = 'text-2xl';
    let radius = 'rounded-2xl';

    // 依照人數決定網格切割方式 (Grid Template)
    if (count <= 1) {
       // 1人: 滿版
       cols = 1; rows = 1; 
       textSize = 'text-[80px]'; radius = 'rounded-[40px]';
    } else if (count === 2) {
       // 2人: 上下兩塊
       cols = 1; rows = 2; 
       textSize = 'text-6xl'; radius = 'rounded-[32px]';
    } else if (count === 3) {
       // 3人: 上下三塊
       cols = 1; rows = 3; 
       textSize = 'text-5xl'; radius = 'rounded-3xl';
    } else if (count === 4) {
       // 4人: 2x2
       cols = 2; rows = 2; 
       textSize = 'text-4xl'; radius = 'rounded-3xl';
    } else if (count <= 6) {
       // 5-6人: 2x3
       cols = 2; rows = 3; 
       textSize = 'text-3xl'; radius = 'rounded-2xl';
    } else if (count <= 8) {
       // 7-8人: 2x4
       cols = 2; rows = 4; 
       textSize = 'text-2xl'; radius = 'rounded-2xl';
    } else if (count <= 9) {
       // 9人: 3x3
       cols = 3; rows = 3; 
       textSize = 'text-2xl'; radius = 'rounded-xl';
    } else {
       // 10-12人: 3x4
       cols = 3; rows = 4; 
       textSize = 'text-xl'; radius = 'rounded-xl';
    }

    return { cols, rows, textSize, radius };
  }, [pinnedPeople.length]);

  const handleNumberClick = (num: string) => {
    if (inputValue.length > 10) return;
    if (num === '.' && inputValue.includes('.')) return;
    if (inputValue.includes('.')) {
        const parts = inputValue.split('.');
        if (parts[1].length >= 3) return; // Limit to 3 decimal places
    }
    setInputValue(prev => prev + num);
  };

  const handleBackspace = () => setInputValue(prev => prev.slice(0, -1));
  const handleClear = () => setInputValue('');

  const handleSubmit = async () => {
    if (!selectedTypeId) {
        alert('請先在設定中新增訓練項目');
        return;
    }
    
    const val = parseFloat(inputValue);
    if (isNaN(val) || val <= 0 || val > 500) {
      alert('請輸入有效秒數');
      return;
    }

    setStatus('saving');
    
    const record: Partial<DataRecord> = {
      date: format(new Date(), 'yyyy-MM-dd'),
      item: 'training',
      training_type_id: selectedTypeId,
      people_id: activePersonId,
      value: val.toFixed(3) // Change to 3 decimals
    };

    const success = await api.submitRecord(record);
    if (success) {
      setLastRecord(`${val.toFixed(3)}s`);
      setInputValue('');
      setStatus('success');
      await refreshData();
      setTimeout(() => setStatus('idle'), 1500);
    } else {
      setStatus('error');
      alert('上傳失敗');
      setTimeout(() => setStatus('idle'), 1500);
    }
  };

  const todayRecords = data.filter(d => 
      d.item === 'training' && 
      d.date === format(new Date(), 'yyyy-MM-dd') && 
      d.name === selectedTypeName &&
      String(d.people_id) === String(activePersonId)
  );

  const todayHistory = todayRecords
    .sort((a, b) => Number(b.id) - Number(a.id))
    .slice(0, 5);
  
  const todayCount = todayRecords.length;

  return (
    <div className="flex flex-col h-full px-3 pt-3 pb-1 relative animate-fade-in overflow-hidden">
      
      {/* 1. TOP BAR: [Select] [Display] [Settings] */}
      {/* 固定高度 flex-none，確保不會被壓縮或拉伸 */}
      <div className="flex-none flex items-stretch gap-2 mb-2 h-16 z-20">
        
        {/* Left: Selector */}
        <div className="w-[30%] relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent rounded-xl blur-sm opacity-50 group-hover:opacity-100 transition-all"></div>
          <select 
            value={selectedTypeId}
            onChange={(e) => setSelectedTypeId(e.target.value)}
            className="relative w-full h-full appearance-none bg-zinc-900 border border-white/10 text-white rounded-2xl pl-3 pr-6 text-xs font-black shadow-lg focus:border-sunset-rose/50 outline-none transition-all"
          >
            {trainingTypes.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
            <ChevronDown size={14} />
          </div>
        </div>

        {/* Center: Main Display */}
        <div className="flex-1 glass-card rounded-2xl px-4 flex flex-col justify-center text-right relative overflow-hidden border-t border-t-white/10 shadow-xl">
           <div className="absolute top-2 left-3 flex items-center gap-2">
            {status === 'saving' && <span className="text-rose-500 text-[9px] font-black flex items-center animate-pulse tracking-widest">SAVING...</span>}
            {status === 'success' && <span className="text-emerald-500 text-[9px] font-black flex items-center tracking-widest">SUCCESS</span>}
            {lastRecord && !status.includes('s') && (
               <div className="text-[9px] text-zinc-500 font-mono font-bold tracking-wider">L: {lastRecord}</div>
            )}
          </div>
          <span className={`text-4xl font-black leading-none font-mono tracking-tighter block relative z-10 transition-colors truncate ${inputValue ? 'text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'text-zinc-800'}`}>
            {inputValue || '0.000'}
          </span>
        </div>

        {/* Right: Settings Button */}
        <button 
          onClick={() => setShowPeopleModal(true)}
          className="flex-none w-16 h-full bg-zinc-900 border border-white/10 text-zinc-400 rounded-2xl flex items-center justify-center active:scale-95 transition-all shadow-lg hover:text-white hover:border-white/20 group"
        >
          <Settings2 size={24} className="group-active:rotate-45 transition-transform" />
        </button>
      </div>

      {/* 2. MIDDLE: Player Grid */}
      {/* 
         關鍵修正：
         1. 父層 `flex-1 relative min-h-0`：佔據剩餘空間，但不強制撐開，避免跑版到下方計算機背面。
         2. 子層 `absolute inset-0`：強制填滿父層空間，無論內容多大都被限制住。
      */}
      <div className="flex-1 relative min-h-0 mb-2 z-10">
          <div className="absolute inset-0 rounded-2xl p-0.5">
             <div 
                className="grid gap-2 h-full w-full"
                style={{ 
                   gridTemplateColumns: `repeat(${gridConfig.cols}, minmax(0, 1fr))`,
                   gridTemplateRows: `repeat(${gridConfig.rows}, minmax(0, 1fr))`
                }}
             >
                {pinnedPeople.length > 0 ? (
                  pinnedPeople.map((p) => {
                    const isActive = String(p.id) === String(activePersonId);
                    return (
                      <button
                        key={p.id}
                        onClick={() => onSelectPerson(p.id)}
                        className={`h-full w-full ${gridConfig.radius} border transition-all duration-200 active:scale-[0.98] flex items-center justify-center relative overflow-hidden shrink-0 ${isActive ? 'bg-gradient-to-b from-sunset-rose/30 to-black border-sunset-rose/60 shadow-glow-rose z-10' : 'bg-zinc-900/60 border-white/5 text-zinc-500 hover:bg-zinc-800'}`}
                      >
                        <span className={`${gridConfig.textSize} font-black tracking-wide truncate w-full px-2 transition-all duration-300 ${isActive ? 'text-white scale-110 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'text-zinc-600'}`}>
                            {p.name}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <div className="col-span-full row-span-full flex items-center justify-center h-full">
                     <button onClick={() => setShowPeopleModal(true)} className="text-xs text-zinc-500 font-black uppercase tracking-widest underline italic hover:text-sunset-gold transition-colors p-4 border border-dashed border-zinc-700 rounded-2xl w-full h-full flex items-center justify-center">點此設定常駐選手</button>
                  </div>
                )}
             </div>
          </div>
      </div>

      {/* 3. BOTTOM: Keypad */}
      {/* 固定高度 flex-none，確保計算機永遠在底部，且有足夠空間 */}
      <div className="flex-none flex flex-col pb-1 z-20">
        
        {/* Today's History Row */}
        <div className="h-5 mb-1 px-1 flex items-center justify-between">
           {todayHistory.length > 0 && (
             <>
               <div className="text-[9px] text-zinc-500 font-black tracking-widest uppercase italic flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                  {activePerson?.name} Today <span className="text-zinc-400">({todayCount})</span>
               </div>
               <div className="flex space-x-1 overflow-x-auto no-scrollbar">
                 {todayHistory.map((h, i) => (
                   <span key={i} className="bg-zinc-900 text-zinc-300 text-[9px] px-2 rounded border border-white/10 font-mono">{parseFloat(h.value).toFixed(3)}</span>
                 ))}
               </div>
             </>
           )}
        </div>

        {/* Keypad Grid (4 rows: 1-9 + . 0 DEL) */}
        <div className="grid grid-cols-3 gap-1.5 mb-1.5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0].map(val => (
            <button key={val} onClick={() => typeof val === 'number' || val === '.' ? handleNumberClick(String(val)) : null} 
              className="glass-card bg-[#111]/90 hover:bg-[#161616] text-white text-2xl font-black rounded-xl flex items-center justify-center active:scale-95 border border-white/5 shadow-liquid h-14 transition-colors">
              {val}
            </button>
          ))}
          <button onClick={handleBackspace} className="glass-card bg-[#111]/90 text-rose-500 flex items-center justify-center active:scale-95 rounded-xl border border-white/5 font-black text-xl h-14 hover:bg-rose-500/10 transition-colors">DEL</button>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-4 gap-1.5 h-14 shrink-0">
           <button onClick={handleClear} className="bg-zinc-900 text-zinc-500 font-black rounded-xl active:scale-95 border border-white/5 text-[10px] uppercase tracking-widest hover:text-white transition-colors">Clear</button>
           <button onClick={handleSubmit} disabled={!inputValue || status === 'saving'}
             className={`col-span-3 font-black rounded-xl text-sm tracking-[0.3em] uppercase transition-all active:scale-[0.98] shadow-lg ${!inputValue || status === 'saving' ? 'bg-zinc-900 text-zinc-800' : 'bg-gradient-to-r from-rose-600 to-amber-500 text-white shadow-glow'}`}>
             {status === 'saving' ? 'Saving...' : 'Record Data'}
           </button>
        </div>
      </div>

      {/* 選手管理 Modal */}
      {showPeopleModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/85 backdrop-blur-md animate-fade-in" onClick={() => setShowPeopleModal(false)}>
           <div className="glass-card w-full max-w-md rounded-t-[32px] p-6 shadow-2xl animate-slide-up bg-[#0f0508] border-white/10 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6 shrink-0">
                <div>
                  <h3 className="text-xl font-black text-white tracking-tight italic">設定快速切換選手</h3>
                  <p className="text-[9px] text-sunset-rose font-black uppercase tracking-[0.3em] mt-0.5 italic underline">已選中的選手會出現在紀錄板</p>
                </div>
                <button onClick={() => setShowPeopleModal(false)} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-full text-zinc-500"><X size={20} /></button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar pb-6 px-1">
                <div className="grid grid-cols-1 gap-2">
                  {people.length > 0 ? (
                    people.map((p) => {
                      const isPinned = pinnedPeopleIds.includes(String(p.id));
                      return (
                        <button 
                          key={p.id}
                          onClick={() => onTogglePinned(String(p.id))}
                          className={`flex items-center gap-4 p-4 rounded-2xl border transition-all active:scale-[0.98] ${isPinned ? 'bg-gradient-to-r from-sunset-gold/10 to-transparent border-sunset-gold/30' : 'bg-white/5 border-white/5'}`}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black border ${isPinned ? 'bg-sunset-gold text-black border-sunset-gold/50 shadow-glow-gold' : 'bg-zinc-800 text-zinc-500 border-white/5'}`}>
                            {p.name.charAt(0)}
                          </div>
                          <div className="flex-1 text-left">
                            <span className={`text-base font-bold tracking-widest ${isPinned ? 'text-white' : 'text-zinc-600'}`}>
                              {p.name}
                            </span>
                          </div>
                          <div className={`w-7 h-7 rounded-xl flex items-center justify-center border transition-all ${isPinned ? 'bg-sunset-rose border-sunset-rose text-white shadow-glow-rose' : 'bg-black/40 border-white/10 text-transparent'}`}>
                            <Check size={16} strokeWidth={4} />
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="text-center py-10 text-zinc-600 text-[10px] font-black uppercase tracking-widest">載入名單中...</div>
                  )}
                </div>
              </div>
              
              <div className="pt-4 shrink-0">
                <button 
                  onClick={() => setShowPeopleModal(false)}
                  className="w-full py-4 bg-zinc-900 border border-white/10 text-white font-black text-xs tracking-[0.4em] rounded-2xl active:scale-95 transition-all shadow-lg uppercase"
                >
                  確認並返回
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Training;
