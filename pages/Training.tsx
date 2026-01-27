
import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { DataRecord, LookupItem } from '../types';
import { ChevronDown, Settings2, Check, X, Lock, Unlock, KeyRound, Loader2, Edit2 } from 'lucide-react';
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

  // Edit History State
  const [editingHistoryRecord, setEditingHistoryRecord] = useState<DataRecord | null>(null);
  const [historyEditValue, setHistoryEditValue] = useState('');

  // OTP Lock State
  const [isOtpUnlocked, setIsOtpUnlocked] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [initialCheckDone, setInitialCheckDone] = useState(false);

  // Check for existing OTP on mount and VERIFY it
  useEffect(() => {
    const checkAuth = async () => {
        // 1. First check Global Admin Cache
        const adminAuth = localStorage.getItem('louie_admin_auth_ts');
        if (adminAuth && Date.now() < Number(adminAuth)) {
            setIsOtpUnlocked(true);
            setInitialCheckDone(true);
            return;
        }

        // 2. Then check local Training Cache
        const cachedAuth = localStorage.getItem('louie_training_auth_ts');
        if (cachedAuth && Date.now() < Number(cachedAuth)) {
            setIsOtpUnlocked(true);
            setInitialCheckDone(true);
            return;
        }

        // 3. Finally check stored OTP (Legacy)
        const savedOtp = api.getOtp();
        if (savedOtp) {
            const isValid = await api.verifyOtp(savedOtp);
            if (isValid) {
                setIsOtpUnlocked(true);
                // Refresh cache
                localStorage.setItem('louie_training_auth_ts', String(Date.now() + 5 * 60 * 1000));
            } else {
                // If invalid/expired, clear it
                api.setOtp('');
            }
        }
        setInitialCheckDone(true);
    };
    checkAuth();
  }, []);

  useEffect(() => {
    // 修正：只有在 selectedTypeId 為空時才進行初始化設定
    // 這樣可以避免每次 refreshData (造成 trainingTypes 參考更新) 時，選項被重置回預設值
    if (!selectedTypeId && trainingTypes.length > 0) {
        if (defaultType) {
            const found = trainingTypes.find(t => t.name === defaultType);
            if (found) {
                setSelectedTypeId(String(found.id));
                return;
            }
        }
        // 如果沒有預設值或找不到預設值，選第一個
        setSelectedTypeId(String(trainingTypes[0].id));
    }
  }, [defaultType, trainingTypes, selectedTypeId]);

  const handleLogin = async () => {
      if (!otpInput) {
          alert('請輸入密碼');
          return;
      }
      setIsVerifying(true);

      // 1. Try Admin Password first
      const adminResult = await api.authenticate(otpInput);
      
      if (adminResult.success && adminResult.otp) {
          // Success: User entered Admin Password
          api.setOtp(adminResult.otp); // Store the generated OTP
          setIsOtpUnlocked(true);
          // Cache Global Admin Auth for 5 mins
          localStorage.setItem('louie_admin_auth_ts', String(Date.now() + 5 * 60 * 1000));
      } else {
          // 2. Try verifying as Guest OTP
          const isValidOtp = await api.verifyOtp(otpInput);
          if (isValidOtp) {
             api.setOtp(otpInput); // Store the valid OTP
             setIsOtpUnlocked(true);
             // Cache auth for 5 mins
             localStorage.setItem('louie_training_auth_ts', String(Date.now() + 5 * 60 * 1000));
          } else {
             alert('密碼錯誤');
          }
      }
      setIsVerifying(false);
  };

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
    let textSize = 'text-3xl'; // Default bumped up
    let radius = 'rounded-2xl';

    if (count <= 1) {
       cols = 1; rows = 1; textSize = 'text-[90px]'; radius = 'rounded-[40px]';
    } else if (count === 2) {
       cols = 1; rows = 2; textSize = 'text-7xl'; radius = 'rounded-[32px]';
    } else if (count === 3) {
       cols = 1; rows = 3; textSize = 'text-6xl'; radius = 'rounded-3xl';
    } else if (count === 4) {
       cols = 2; rows = 2; textSize = 'text-5xl'; radius = 'rounded-3xl';
    } else if (count <= 6) {
       cols = 2; rows = 3; textSize = 'text-4xl'; radius = 'rounded-2xl';
    } else if (count <= 8) {
       cols = 2; rows = 4; textSize = 'text-3xl'; radius = 'rounded-2xl';
    } else if (count <= 9) {
       cols = 3; rows = 3; textSize = 'text-3xl'; radius = 'rounded-xl';
    } else {
       cols = 3; rows = 4; textSize = 'text-2xl'; radius = 'rounded-xl';
    }

    return { cols, rows, textSize, radius };
  }, [pinnedPeople.length]);

  const handleNumberClick = (num: string) => {
    // 4-2 & 4-3: Strict check for active person selection
    if (!activePersonId) {
        alert('請先點選人物 (Please select a rider first)');
        return;
    }

    if (inputValue.length > 10) return;
    if (num === '.' && inputValue.includes('.')) return;
    if (inputValue.includes('.')) {
        const parts = inputValue.split('.');
        if (parts[1].length >= 3) return; 
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

    if (!activePersonId) {
        alert('請先點選人物 (Please select a rider first)');
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
      value: val.toFixed(3)
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
      alert('上傳失敗，請確認密碼是否正確或已過期');
      setTimeout(() => setStatus('idle'), 1500);
    }
  };

  const handleEditHistory = (record: DataRecord) => {
      setEditingHistoryRecord(record);
      setHistoryEditValue(record.value);
  };

  const handleSaveHistory = async () => {
      if (!editingHistoryRecord) return;
      const val = parseFloat(historyEditValue);
      if (isNaN(val) || val <= 0) {
          alert("請輸入有效數值");
          return;
      }

      // Preserve all original fields needed for submitRecord
      const payload: Partial<DataRecord> = {
          id: editingHistoryRecord.id,
          date: editingHistoryRecord.date,
          item: 'training',
          people_id: editingHistoryRecord.people_id,
          training_type_id: editingHistoryRecord.training_type_id,
          value: val.toFixed(3)
      };

      const success = await api.submitRecord(payload);
      if (success) {
          setEditingHistoryRecord(null);
          await refreshData();
      } else {
          alert("更新失敗");
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

  if (!initialCheckDone) return null;

  if (!isOtpUnlocked) {
      return (
        <div className="h-full flex flex-col items-center justify-center p-6 animate-fade-in relative">
           <div className="glass-card w-full max-w-xs rounded-3xl p-8 shadow-2xl border-white/10 text-center">
               <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                 <KeyRound size={32} className="text-white opacity-80" />
               </div>
               <h3 className="text-xl font-black text-white tracking-tight mb-2">紀錄功能鎖定</h3>
               <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-6">Enter OTP or Admin Password</p>
               
               <input 
                  autoFocus
                  type="password" 
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  placeholder="Password / OTP"
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-center tracking-widest mb-4 outline-none focus:border-chiachia-green/50 shadow-inner"
               />
               <button 
                  onClick={handleLogin}
                  disabled={!otpInput || isVerifying}
                  className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-500 text-white font-bold text-xs rounded-xl shadow-glow active:scale-95 transition-all flex items-center justify-center gap-2"
               >
                  {isVerifying ? <Loader2 size={16} className="animate-spin" /> : <Unlock size={16} />} 
                  驗證並進入
               </button>
           </div>
        </div>
      );
  }

  return (
    <div className="flex flex-col h-full px-3 pt-3 pb-1 relative animate-fade-in overflow-hidden">
      
      {/* 1. TOP BAR */}
      <div className="flex-none flex items-stretch gap-2 mb-2 h-16 z-20">
        <div className="w-[30%] relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-chiachia-green/10 to-transparent rounded-xl blur-sm opacity-50 group-hover:opacity-100 transition-all"></div>
          <select 
            value={selectedTypeId}
            onChange={(e) => setSelectedTypeId(e.target.value)}
            className="relative w-full h-full appearance-none bg-zinc-900 border border-white/10 text-white rounded-2xl pl-3 pr-6 text-base font-black shadow-lg focus:border-chiachia-green/50 outline-none transition-all"
          >
            {trainingTypes.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
            <ChevronDown size={14} />
          </div>
        </div>

        <div className="flex-1 glass-card rounded-2xl px-4 flex flex-col justify-center text-right relative overflow-hidden border-t border-t-white/10 shadow-xl">
           <div className="absolute top-2 left-3 flex items-center gap-2">
            {status === 'saving' && <span className="text-chiachia-green text-[9px] font-black flex items-center animate-pulse tracking-widest">SAVING...</span>}
            {status === 'success' && <span className="text-emerald-500 text-[9px] font-black flex items-center tracking-widest">SUCCESS</span>}
            {lastRecord && !status.includes('s') && (
               <div className="text-[9px] text-zinc-500 font-mono font-bold tracking-wider">L: {lastRecord}</div>
            )}
          </div>
          <span className={`text-4xl font-black leading-none font-mono tracking-tighter block relative z-10 transition-colors truncate ${inputValue ? 'text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'text-zinc-800'}`}>
            {inputValue || '0.000'}
          </span>
        </div>

        <button 
          onClick={() => setShowPeopleModal(true)}
          className="flex-none w-16 h-full bg-zinc-900 border border-white/10 text-zinc-400 rounded-2xl flex items-center justify-center active:scale-95 transition-all shadow-lg hover:text-white hover:border-white/20 group"
        >
          <Settings2 size={28} className="group-active:rotate-45 transition-transform" />
        </button>
      </div>

      {/* 2. MIDDLE: Player Grid */}
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
                        className={`h-full w-full ${gridConfig.radius} border transition-all duration-200 active:scale-[0.98] flex items-center justify-center relative overflow-hidden shrink-0 ${isActive ? 'bg-gradient-to-b from-chiachia-green/20 to-black border-chiachia-green/60 shadow-glow-green z-10' : 'bg-zinc-900/60 border-white/5 text-zinc-500 hover:bg-zinc-800'}`}
                      >
                        <span className={`${gridConfig.textSize} font-black tracking-wide truncate w-full px-2 transition-all duration-300 ${isActive ? 'text-white scale-110 drop-shadow-[0_0_10px_rgba(57,231,95,0.4)]' : 'text-zinc-600'}`}>
                            <span className="relative z-10">{p.name}</span>
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <div className="col-span-full row-span-full flex items-center justify-center h-full">
                     <button onClick={() => setShowPeopleModal(true)} className="text-sm text-zinc-500 font-black uppercase tracking-widest underline italic hover:text-chiachia-green transition-colors p-4 border border-dashed border-zinc-700 rounded-2xl w-full h-full flex items-center justify-center">點此設定常駐選手</button>
                  </div>
                )}
             </div>
          </div>
      </div>

      {/* 3. BOTTOM: Keypad */}
      <div className="flex-none flex flex-col pb-1 z-20">
        <div className="h-6 mb-1 px-1 flex items-center justify-between">
           {todayHistory.length > 0 && (
             <>
               <div className="text-[11px] text-zinc-500 font-black tracking-widest uppercase italic flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                  {activePerson?.name} Today <span className="text-zinc-400">({todayCount})</span>
               </div>
               <div className="flex space-x-1 overflow-x-auto no-scrollbar">
                 {todayHistory.map((h, i) => (
                   <button 
                    key={i} 
                    onClick={() => handleEditHistory(h)}
                    className="bg-zinc-900 text-zinc-300 text-xs px-2 rounded border border-white/10 font-mono font-bold active:bg-zinc-800 active:scale-95 transition-all"
                   >
                       {parseFloat(h.value).toFixed(3)}
                   </button>
                 ))}
               </div>
             </>
           )}
        </div>

        <div className="grid grid-cols-3 gap-1.5 mb-1.5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0].map(val => (
            <button key={val} onClick={() => typeof val === 'number' || val === '.' ? handleNumberClick(String(val)) : null} 
              className="glass-card bg-[#111]/90 hover:bg-[#161616] text-white text-4xl font-black rounded-xl flex items-center justify-center active:scale-95 border border-white/5 shadow-liquid h-14 transition-colors font-mono">
              {val}
            </button>
          ))}
          <button onClick={handleBackspace} className="glass-card bg-[#111]/90 text-rose-500 flex items-center justify-center active:scale-95 rounded-xl border border-white/5 font-black text-2xl h-14 hover:bg-rose-500/10 transition-colors">DEL</button>
        </div>

        <div className="grid grid-cols-4 gap-1.5 h-14 shrink-0">
           <button onClick={handleClear} className="bg-zinc-900 text-zinc-500 font-black rounded-xl active:scale-95 border border-white/5 text-xs uppercase tracking-widest hover:text-white transition-colors">Clear</button>
           <button onClick={handleSubmit} disabled={!inputValue || status === 'saving'}
             className={`col-span-3 font-black rounded-xl text-xl tracking-[0.2em] uppercase transition-all active:scale-[0.98] shadow-lg ${!inputValue || status === 'saving' ? 'bg-zinc-900 text-zinc-800' : 'bg-gradient-to-r from-green-600 to-emerald-500 text-white shadow-glow-green'}`}>
             {status === 'saving' ? 'Saving...' : 'Record Data'}
           </button>
        </div>
      </div>

      {showPeopleModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/85 backdrop-blur-md animate-fade-in" onClick={() => setShowPeopleModal(false)}>
           <div className="glass-card w-full max-w-md rounded-t-[32px] p-6 shadow-2xl animate-slide-up bg-[#0f0508] border-white/10 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6 shrink-0">
                <div>
                  <h3 className="text-xl font-black text-white tracking-tight italic">設定快速切換選手</h3>
                  <p className="text-[11px] text-chiachia-green font-black uppercase tracking-[0.3em] mt-0.5 italic underline">已選中的選手會出現在紀錄板</p>
                </div>
                <button onClick={() => setShowPeopleModal(false)} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-full text-zinc-500"><X size={20} /></button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar pb-6 px-1">
                <div className="grid grid-cols-4 gap-2">
                  {people.length > 0 ? (
                    people.map((p) => {
                      const isPinned = pinnedPeopleIds.includes(String(p.id));
                      const [sUrlBase, sUrlFragment] = (p.s_url || '').split('#');
                      let sz=1, sx=50, sy=50;
                      if(sUrlFragment) {
                          const sp = new URLSearchParams(sUrlFragment);
                          sz = parseFloat(sp.get('z')||'1');
                          sx = parseFloat(sp.get('x')||'50');
                          sy = parseFloat(sp.get('y')||'50');
                      }

                      return (
                        <button 
                          key={p.id}
                          onClick={() => onTogglePinned(String(p.id))}
                          className={`flex flex-col items-center justify-start py-2.5 px-1 rounded-xl transition-all active:scale-[0.95] border aspect-[3/4] relative overflow-hidden group ${isPinned ? 'bg-gradient-to-b from-chiachia-green/20 to-black border-chiachia-green shadow-glow-green' : 'bg-zinc-900/40 border-white/10 hover:bg-zinc-800'}`}
                        >
                          <div className={`w-12 h-12 rounded-full flex-none overflow-hidden flex items-center justify-center border-2 shadow-lg relative z-10 shrink-0 ${isPinned ? 'border-white bg-zinc-950' : 'border-white/10 bg-zinc-950'}`}>
                            {sUrlBase ? (
                                <img src={sUrlBase} alt={p.name} className="w-full h-full object-contain bg-black" style={{transform: `translate(${(sx - 50) * 1.5}%, ${(sy - 50) * 1.5}%) scale(${sz})`}} />
                            ) : (
                                <span className="text-base font-black">{p.name.charAt(0)}</span>
                            )}
                          </div>
                          
                          <span className={`text-xs font-black tracking-wider truncate w-full relative z-10 mt-2 ${isPinned ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'}`}>
                            {p.name}
                          </span>
                          
                          {isPinned && <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-chiachia-green rounded-full shadow-[0_0_8px_rgba(57,231,95,0.8)] animate-pulse z-20"></div>}
                        </button>
                      );
                    })
                  ) : (
                    <div className="col-span-4 text-center py-10 text-zinc-600 text-xs font-black uppercase tracking-widest">載入名單中...</div>
                  )}
                </div>
              </div>
              
              <div className="pt-4 shrink-0">
                <button 
                  onClick={() => setShowPeopleModal(false)}
                  className="w-full py-4 bg-zinc-900 border border-white/10 text-white font-black text-base tracking-[0.4em] rounded-2xl active:scale-95 transition-all shadow-lg uppercase"
                >
                  確認並返回
                </button>
              </div>
           </div>
        </div>
      )}

      {/* Edit History Modal */}
      {editingHistoryRecord && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85 backdrop-blur-md animate-fade-in" onClick={() => setEditingHistoryRecord(null)}>
            <div className="glass-card w-full max-w-xs rounded-3xl p-6 shadow-2xl animate-scale-in bg-[#0f0508] border-white/10 text-center" onClick={e => e.stopPropagation()}>
                <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                    <Edit2 size={24} className="text-zinc-400" />
                </div>
                <h3 className="text-lg font-black text-white mb-1">修改紀錄</h3>
                <p className="text-xs text-zinc-500 font-bold mb-4">Editing {activePerson?.name}'s Record</p>
                
                <input 
                    autoFocus
                    type="text" 
                    inputMode="decimal"
                    value={historyEditValue}
                    onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || /^\d*\.?\d{0,3}$/.test(val)) {
                            setHistoryEditValue(val);
                        }
                    }}
                    className="w-full bg-black border border-chiachia-green/50 rounded-xl px-4 py-3 text-white text-2xl font-mono text-center outline-none mb-6 shadow-inner"
                />

                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setEditingHistoryRecord(null)} className="py-3 bg-zinc-900 text-zinc-400 font-bold text-sm rounded-xl active:scale-95 transition-all border border-white/5">取消</button>
                    <button onClick={handleSaveHistory} className="py-3 bg-gradient-to-r from-green-600 to-emerald-500 text-white font-bold text-sm rounded-xl shadow-glow-green active:scale-95 transition-all">確認修改</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Training;
