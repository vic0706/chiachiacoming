
import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { DataRecord, LookupItem } from '../types';
import { RotateCcw, CheckCircle, ChevronDown, X, Settings2, Check, Key, Lock, Unlock } from 'lucide-react';
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
  
  // 鎖定狀態管理
  const [isLocked, setIsLocked] = useState(true);
  const [guestOtpInput, setGuestOtpInput] = useState('');
  
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

  const handleNumberClick = (num: string) => {
    if (inputValue.length > 10) return;
    if (num === '.' && inputValue.includes('.')) return;
    if (inputValue.includes('.')) {
        const parts = inputValue.split('.');
        if (parts[1].length >= 4) return;
    }
    setInputValue(prev => prev + num);
  };

  const handleBackspace = () => setInputValue(prev => prev.slice(0, -1));
  const handleClear = () => setInputValue('');

  const handleUnlock = () => {
    if (guestOtpInput.length >= 4) {
      setIsLocked(false);
    } else {
      alert('請輸入有效的一次性密碼 (OTP)');
    }
  };

  const handleSubmit = async () => {
    if (!selectedTypeId) {
        alert('請先在設定中新增訓練項目');
        return;
    }
    
    // 雖然前端解鎖了，但後端還會驗證，所以這裡直接使用解鎖時輸入的 OTP
    if (!guestOtpInput) {
        alert('請重新輸入一次性密碼');
        setIsLocked(true);
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
      value: val.toFixed(4) 
    };

    const success = await api.submitRecord(record, guestOtpInput);
    if (success) {
      setLastRecord(`${val.toFixed(4)}s`);
      setInputValue('');
      setStatus('success');
      await refreshData();
      setTimeout(() => setStatus('idle'), 1500);
    } else {
      setStatus('error');
      alert('上傳失敗：密碼錯誤或已過期，請重新輸入');
      setIsLocked(true); // 失敗代表密碼可能有問題，重新鎖定要求輸入
      setTimeout(() => setStatus('idle'), 1500);
    }
  };

  const todayHistory = data
    .filter(d => 
      d.item === 'training' && 
      d.date === format(new Date(), 'yyyy-MM-dd') && 
      d.name === selectedTypeName &&
      String(d.people_id) === String(activePersonId)
    )
    .sort((a, b) => Number(b.id) - Number(a.id))
    .slice(0, 5);

  // ------------------------------------------------
  // 鎖定畫面
  // ------------------------------------------------
  if (isLocked) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-6 animate-fade-in space-y-8 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[60%] bg-gradient-to-b from-sunset-rose/10 to-transparent blur-3xl pointer-events-none rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[80%] h-[50%] bg-gradient-to-t from-sunset-gold/10 to-transparent blur-3xl pointer-events-none rounded-full"></div>

        <div className="text-center space-y-2 z-10">
           <div className="w-20 h-20 bg-zinc-900/80 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-white/10 shadow-glass relative">
              <Lock size={36} className="text-zinc-400" />
              <div className="absolute inset-0 bg-white/5 blur-lg rounded-3xl animate-pulse-slow"></div>
           </div>
           <h2 className="text-2xl font-black text-white tracking-tighter">系統鎖定</h2>
           <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Training Data Access Control</p>
        </div>

        <div className="w-full max-w-xs z-10 space-y-4">
           <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-1.5 flex items-center shadow-inner">
              <div className="w-10 h-10 flex items-center justify-center text-zinc-500">
                 <Key size={18} />
              </div>
              <input 
                 type="tel" // use tel for numeric keypad
                 autoFocus
                 placeholder="輸入一次性密碼 (OTP)"
                 className="flex-1 bg-transparent text-center text-xl font-mono font-black text-white outline-none placeholder:text-zinc-700 tracking-[0.2em]"
                 value={guestOtpInput}
                 onChange={(e) => setGuestOtpInput(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
              />
           </div>
           <button 
             onClick={handleUnlock}
             className="w-full py-4 bg-gradient-to-r from-zinc-800 to-zinc-700 hover:from-sunset-rose hover:to-rose-600 text-zinc-300 hover:text-white font-black text-sm tracking-[0.3em] rounded-2xl transition-all shadow-lg active:scale-95 border border-white/5 uppercase"
           >
             解鎖紀錄板
           </button>
        </div>
      </div>
    );
  }

  // ------------------------------------------------
  // 正常紀錄介面
  // ------------------------------------------------
  return (
    <div className="flex flex-col h-full px-3 pt-1 pb-0 relative animate-fade-in overflow-hidden">
      
      {/* 1. 頂部：訓練項目 & 選手設定按鈕 */}
      <div className="flex-none mb-1 flex gap-2 items-stretch">
        <div className="flex-1 relative">
          <select 
            value={selectedTypeId}
            onChange={(e) => setSelectedTypeId(e.target.value)}
            className="w-full h-8 appearance-none bg-zinc-900 border border-white/10 text-white rounded-lg px-3 text-[11px] font-black shadow-sm focus:border-sunset-rose/50 outline-none"
          >
            {trainingTypes.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
            <ChevronDown size={12} />
          </div>
        </div>

        <button 
          onClick={() => setShowPeopleModal(true)}
          className="flex-none px-3 h-8 bg-zinc-900/60 border border-white/10 text-zinc-400 rounded-lg flex items-center justify-center active:scale-95 transition-all gap-1.5 shadow-sm"
        >
          <Settings2 size={12} />
        </button>
      </div>

      {/* 2. 選手 ICON 快速切換 - 改為純文字 */}
      <div className="flex-none mb-1">
        <div className="max-h-[88px] overflow-y-auto no-scrollbar">
          <div className="grid grid-cols-6 gap-1">
            {pinnedPeople.length > 0 ? (
              pinnedPeople.map((p) => {
                const isActive = String(p.id) === String(activePersonId);
                return (
                  <button
                    key={p.id}
                    onClick={() => onSelectPerson(p.id)}
                    className={`h-10 rounded-lg border transition-all active:scale-90 flex items-center justify-center relative overflow-hidden ${isActive ? 'bg-gradient-to-b from-sunset-rose/30 to-black border-sunset-rose/60 shadow-glow-rose z-10' : 'bg-zinc-900/60 border-white/5 text-zinc-500'}`}
                  >
                    <span className={`text-xs font-black tracking-wide truncate px-0.5 ${isActive ? 'text-white' : 'text-zinc-600'}`}>{p.name}</span>
                  </button>
                );
              })
            ) : (
              <div className="col-span-6 py-2 text-center">
                 <button onClick={() => setShowPeopleModal(true)} className="text-[8px] text-zinc-600 font-black uppercase tracking-widest underline italic">點此釘選選手</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. 顯示視窗 */}
      <div className="flex-none mb-1">
        <div className="glass-card rounded-xl p-2 text-right relative overflow-hidden border-t border-t-white/10 shadow-lg min-h-[60px] flex flex-col justify-center">
          <div className="absolute top-1 left-2 flex items-center gap-2">
            {status === 'saving' && <span className="text-rose-500 text-[8px] font-black flex items-center animate-pulse">SAVING...</span>}
            {status === 'success' && <span className="text-green-500 text-[8px] font-black flex items-center">DONE</span>}
            {lastRecord && !status.includes('s') && (
               <div className="text-[8px] text-zinc-500 font-mono font-bold">Last: {lastRecord}</div>
            )}
          </div>
          <span className={`text-4xl font-black leading-none font-mono tracking-tighter block relative z-10 transition-colors ${inputValue ? 'text-white' : 'text-zinc-800'}`}>
            {inputValue || '0.0000'}
          </span>
        </div>
      </div>

      {/* 4. 計算機按鈕 */}
      <div className="flex-1 min-h-0 flex flex-col pb-2">
        <div className="grid grid-cols-3 gap-1 flex-1 mb-1">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0].map(val => (
            <button key={val} onClick={() => typeof val === 'number' || val === '.' ? handleNumberClick(String(val)) : null} 
              className="glass-card bg-[#111]/90 hover:bg-[#161616] text-white text-2xl font-black rounded-lg flex items-center justify-center active:scale-95 border border-white/5 shadow-liquid">
              {val}
            </button>
          ))}
          <button onClick={handleBackspace} className="glass-card bg-[#111]/90 text-rose-500 flex items-center justify-center active:scale-95 rounded-lg border border-white/5 font-black text-lg">DEL</button>
        </div>

        <div className="grid grid-cols-4 gap-1 h-12 shrink-0">
           <button onClick={handleClear} className="bg-zinc-900 text-zinc-500 font-black rounded-lg active:scale-95 border border-white/5 text-[9px] uppercase tracking-widest">Clear</button>
           <button onClick={handleSubmit} disabled={!inputValue || status === 'saving'}
             className={`col-span-3 font-black rounded-lg text-xs tracking-[0.3em] uppercase transition-all active:scale-[0.98] shadow-lg ${!inputValue || status === 'saving' ? 'bg-zinc-900 text-zinc-800' : 'bg-gradient-to-r from-rose-600 to-amber-500 text-white shadow-glow'}`}>
             {status === 'saving' ? 'Saving...' : 'Record Data'}
           </button>
        </div>

        {todayHistory.length > 0 && (
           <div className="mt-1 pt-1 border-t border-white/5 flex items-center justify-between">
             <div className="text-[7px] text-zinc-600 font-black tracking-widest uppercase italic">{activePerson?.name} Today</div>
             <div className="flex space-x-1 overflow-x-auto no-scrollbar">
               {todayHistory.map((h, i) => (
                 <span key={i} className="bg-zinc-900 text-zinc-400 text-[7px] px-1.5 py-0.5 rounded border border-white/5 font-mono">{parseFloat(h.value).toFixed(4)}</span>
               ))}
             </div>
           </div>
        )}
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
