
import React, { useState, useRef, useEffect } from 'react';
import { Plus, Star, User, Activity, Settings as SettingsIcon, Edit2, Save, X, Flag, Loader2, AlertTriangle, Lock, Unlock, Eye, EyeOff, CalendarDays, Trash2, Image as ImageIcon, Maximize, Download, FileSpreadsheet, KeyRound, RefreshCcw, UploadCloud } from 'lucide-react';
import { LookupItem, DataRecord } from '../types';
import { api } from '../services/api';
import { uploadImage } from '../services/supabase';
import { format, addHours, isAfter, parseISO } from 'date-fns';

interface SettingsProps {
  data: DataRecord[];
  trainingTypes: LookupItem[];
  raceGroups: LookupItem[];
  defaultType: string;
  personName: string;
  people: LookupItem[];
  refreshData: () => Promise<void>;
  onUpdateDefault: (type: string) => void;
  onUpdateName: (name: string) => void;
}

const ImageCropperInput = ({ 
    label, 
    urlValue, 
    onChange, 
    ratioClass = 'h-32 w-full',
    personId,
    typeSuffix
}: { 
    label: string, 
    urlValue: string, 
    onChange: (val: string) => void, 
    ratioClass?: string,
    personId?: string | number,
    typeSuffix: 's' | 'b'
}) => {
  const [baseUrl, fragment] = urlValue.split('#');
  const [z, setZ] = useState(1);
  const [x, setX] = useState(50);
  const [y, setY] = useState(50);
  const [error, setError] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      const [, frag] = urlValue.split('#');
      const params = new URLSearchParams(frag || '');
      setZ(parseFloat(params.get('z') || '1'));
      setX(parseFloat(params.get('x') || '50'));
      setY(parseFloat(params.get('y') || '50'));
  }, [urlValue]);

  useEffect(() => { setError(false); }, [baseUrl]);
  
  const cropperRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const lastPoint = useRef({ x: 0, y: 0 });

  const updateUrl = (newZ: number, newX: number, newY: number) => {
      if (!baseUrl) return;
      onChange(`${baseUrl}#z=${newZ}&x=${newX}&y=${newY}`);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setIsUploading(true);
          const file = e.target.files[0];
          const customName = personId ? `${personId}_${typeSuffix}` : undefined;
          
          const result = await uploadImage(file, 'people', customName);
          
          if (result.url) {
              const timestampUrl = `${result.url}?t=${Date.now()}`;
              onChange(`${timestampUrl}#z=1&x=50&y=50`); 
              setIsLocked(false);
          } else {
              alert(`上傳失敗: ${result.error}`);
          }
          setIsUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
      if (isLocked) return;
      isDragging.current = true;
      const point = 'touches' in e ? e.touches[0] : (e as React.MouseEvent);
      lastPoint.current = { x: point.clientX, y: point.clientY };
  };
  
  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDragging.current || !cropperRef.current || isLocked) return;
      if(e.cancelable) e.preventDefault();
      
      const point = 'touches' in e ? e.touches[0] : (e as React.MouseEvent);
      const dx = point.clientX - lastPoint.current.x;
      const dy = point.clientY - lastPoint.current.y;
      
      const rect = cropperRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
          const sensitivity = 0.8; 
          const deltaX = (dx / rect.width) * 100 * sensitivity;
          const deltaY = (dy / rect.height) * 100 * sensitivity;
          const newX = Math.min(100, Math.max(0, x + deltaX));
          const newY = Math.min(100, Math.max(0, y + deltaY));
          
          setX(newX);
          setY(newY);
          updateUrl(z, newX, newY);
      }
      lastPoint.current = { x: point.clientX, y: point.clientY };
  };
  const handleDragEnd = () => isDragging.current = false;

  return (
      <div className="space-y-2">
          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 flex items-center gap-1"><ImageIcon size={12}/> {label}</label>
          <div className="flex gap-2">
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect}/>
            <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="w-full px-4 py-3 bg-zinc-800 rounded-xl text-white active:scale-95 border border-white/5 flex items-center justify-center gap-2 hover:bg-zinc-700 transition-all shadow-lg text-xs font-bold tracking-wider">
                {isUploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
                {isUploading ? '選擇照片並上傳' : '選擇照片並上傳'}
            </button>
          </div>

          {baseUrl && (
               <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/10 shadow-lg mt-2 relative">
                  <div className="flex justify-between items-center text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">
                      <span className="flex items-center gap-1"><Maximize size={10}/> 縮放與位置調整</span>
                      <button type="button" onClick={() => setIsLocked(!isLocked)} className={`flex items-center gap-1 px-2 py-1 rounded-lg border ${isLocked ? 'border-zinc-700 bg-zinc-800 text-zinc-400' : 'border-rose-500/50 bg-rose-500/10 text-rose-500'}`}>
                          {isLocked ? <Lock size={10} /> : <Unlock size={10} />}
                          {isLocked ? '鎖定' : '編輯中'}
                      </button>
                  </div>
                  <div className="flex justify-center bg-black rounded-xl border border-white/5 p-2">
                    <div ref={cropperRef} className={`relative overflow-hidden bg-zinc-900 border border-white/10 shadow-inner group touch-none ${ratioClass}`} style={{ touchAction: 'none' }} onMouseDown={handleDragStart} onMouseMove={handleDragMove} onMouseUp={handleDragEnd} onMouseLeave={handleDragEnd} onTouchStart={handleDragStart} onTouchMove={handleDragMove} onTouchEnd={handleDragEnd}>
                        {!error ? (
                            <img src={baseUrl} className={`w-full h-full object-cover pointer-events-none select-none ${isLocked ? 'opacity-80' : ''}`} style={{ transform: `translate(${(x - 50) * 1.5}%, ${(y - 50) * 1.5}%) scale(${z})` }} onError={() => setError(true)} />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 text-zinc-600 space-y-2"><ImageIcon size={24} className="opacity-30"/></div>
                        )}
                        <div className={`absolute inset-0 pointer-events-none transition-opacity ${isLocked ? 'opacity-0' : 'opacity-20'}`}><div className="w-full h-full border border-white/30 flex"><div className="flex-1 border-r border-white/30"></div><div className="flex-1 border-r border-white/30"></div><div className="flex-1"></div></div><div className="absolute inset-0 flex flex-col"><div className="flex-1 border-b border-white/30"></div><div className="flex-1 border-b border-white/30"></div><div className="flex-1"></div></div></div>
                        {isLocked && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><Lock size={24} className="text-white/20" /></div>}
                    </div>
                  </div>
                  <div className={`px-1 transition-opacity ${isLocked ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                      <div className="flex justify-between text-[8px] text-zinc-500 font-mono mb-1"><span>ZOOM: {z.toFixed(2)}x</span><span>POS: {x.toFixed(0)},{y.toFixed(0)}</span></div>
                      <input type="range" min="0.1" max="5" step="0.01" value={z} onChange={e => { const val = parseFloat(e.target.value); setZ(val); updateUrl(val, x, y); }} className="w-full accent-sunset-rose h-1.5 bg-zinc-800 rounded-full appearance-none shadow-inner" />
                  </div>
              </div>
          )}
      </div>
  );
};

const Settings: React.FC<SettingsProps> = ({ data, trainingTypes, raceGroups, defaultType, personName, people, refreshData, onUpdateDefault, onUpdateName }) => {
  const [newType, setNewType] = useState('');
  const [newGroup, setNewGroup] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [togglingId, setTogglingId] = useState<string | number | null>(null);
  const [editingType, setEditingType] = useState<LookupItem | null>(null);
  const [editingGroup, setEditingGroup] = useState<LookupItem | null>(null);

  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [cachedAdminPassword, setCachedAdminPassword] = useState(''); 
  const [otpInfo, setOtpInfo] = useState<{code: string, expires: string} | null>(null);
  const [isGeneratingOtp, setIsGeneratingOtp] = useState(false);
  
  const [editingPerson, setEditingPerson] = useState<LookupItem | null>(null);
  const [showEditPersonModal, setShowEditPersonModal] = useState(false);

  const [tempSUrl, setTempSUrl] = useState('');
  const [tempBUrl, setTempBUrl] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<{table: 'training-types' | 'races' | 'people', id: number | string, name: string} | null>(null);

  const [exportDate, setExportDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [exportType, setExportType] = useState(defaultType || (trainingTypes[0]?.name || ''));

  useEffect(() => {
    // Check for cached admin auth (Global 5 mins)
    const cachedAuth = localStorage.getItem('louie_admin_auth_ts');
    if (cachedAuth && Date.now() < Number(cachedAuth)) {
        setIsAdminUnlocked(true);
    }

    const savedOtpJson = localStorage.getItem('louie_admin_generated_otp');
    if (savedOtpJson) {
      try {
        const saved = JSON.parse(savedOtpJson);
        if (saved.expiresAt && isAfter(new Date(saved.expiresAt), new Date())) {
            setOtpInfo({
                code: saved.code,
                expires: format(new Date(saved.expiresAt), 'MM/dd HH:mm')
            });
        } else {
            localStorage.removeItem('louie_admin_generated_otp');
        }
      } catch (e) {
        localStorage.removeItem('louie_admin_generated_otp');
      }
    }
  }, []);

  useEffect(() => {
    if (!exportType && trainingTypes.length > 0) {
        setExportType(trainingTypes[0].name);
    }
  }, [trainingTypes, exportType]);

  const handleAdminLogin = async () => {
      setIsSyncing(true);
      const result = await api.authenticate(adminPasswordInput);
      setIsSyncing(false);
      
      if (result.success) {
          setIsAdminUnlocked(true);
          setCachedAdminPassword(adminPasswordInput);
          setAdminPasswordInput('');
          // Cache for 5 minutes (Global Admin Key)
          localStorage.setItem('louie_admin_auth_ts', String(Date.now() + 5 * 60 * 1000));
          if(result.otp) {
              api.setOtp(result.otp);
          }
      } else {
          alert('密碼錯誤');
      }
  };

  const handleGenerateOtp = async () => {
      if (!cachedAdminPassword) return;
      setIsGeneratingOtp(true);
      const result = await api.authenticate(cachedAdminPassword);
      setIsGeneratingOtp(false);

      if (result.success && result.otp) {
          const expiryDate = addHours(new Date(), 3);
          const newOtpInfo = {
              code: result.otp,
              expires: format(expiryDate, 'MM/dd HH:mm')
          };
          setOtpInfo(newOtpInfo);
          localStorage.setItem('louie_admin_generated_otp', JSON.stringify({
              code: result.otp,
              expiresAt: expiryDate.getTime()
          }));
      }
  };

  const handleAction = async (action: () => Promise<boolean>, targetId?: string | number) => {
    if (targetId) setTogglingId(targetId);
    else setIsSyncing(true);

    const success = await action();
    if (success) {
        await refreshData();
    } else {
        alert('同步操作失敗，請檢查網路連線或確認是否已解鎖上傳權限');
    }

    if (targetId) setTogglingId(null);
    else setIsSyncing(false);
    return success;
  };

  const handleAddType = () => handleAction(() => api.manageLookup('training-types', newType).then(res => { setNewType(''); return res; }));
  
  const handleToggleDefault = async (type: LookupItem) => {
    await handleAction(() => api.manageLookup('training-types', type.name, type.id, false, true));
    onUpdateDefault(type.name); 
  };

  const handleUpdateType = () => editingType && handleAction(() => api.manageLookup('training-types', editingType.name, editingType.id, false, editingType.is_default).then(res => { setEditingType(null); return res; }));
  
  const handleAddGroup = () => handleAction(() => api.manageLookup('races', newGroup).then(res => { setNewGroup(''); return res; }));
  const handleUpdateGroup = () => editingGroup && handleAction(() => api.manageLookup('races', editingGroup.name, editingGroup.id).then(res => { setEditingGroup(null); return res; }));

  const handleAddPersonClick = () => {
    setEditingPerson({ id: '', name: '', birthday: '', is_hidden: false, s_url: '', b_url: '', myword: '' });
    setTempSUrl('');
    setTempBUrl('');
    setShowEditPersonModal(true);
  };

  const handleOpenEditPerson = (p: LookupItem) => {
    setEditingPerson({ ...p });
    setTempSUrl(p.s_url || `/riders/${p.id}_s.jpg`);
    setTempBUrl(p.b_url || `/riders/${p.id}_b.jpg`);
    setShowEditPersonModal(true);
  };

  const handleSavePerson = () => {
    if (!editingPerson) return;
    const personId = editingPerson.id ? editingPerson.id : undefined;

    handleAction(() => api.manageLookup(
        'people', 
        editingPerson.name, 
        personId, 
        false, 
        false, 
        { 
            birthday: editingPerson.birthday || '', 
            is_hidden: editingPerson.is_hidden,
            s_url: tempSUrl,
            b_url: tempBUrl,
            myword: editingPerson.myword
        }
    ).then(res => { 
        setShowEditPersonModal(false);
        setEditingPerson(null); 
        return res; 
    }));
  };

  const handleResetPassword = () => {
      if (!editingPerson) return;
      if (!confirm(`確定重置 ${editingPerson.name} 的密碼為 "123456"？`)) return;
      
      handleAction(() => api.manageLookup(
          'people',
          editingPerson.name,
          editingPerson.id,
          false,
          false,
          {
              birthday: editingPerson.birthday || '',
              is_hidden: editingPerson.is_hidden,
              s_url: tempSUrl,
              b_url: tempBUrl,
              myword: editingPerson.myword,
              password: '123456'
          }
      )).then(res => {
          if (res) alert("密碼重置成功");
      });
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    await handleAction(() => api.manageLookup(deleteTarget.table, '', deleteTarget.id, true));
    setDeleteTarget(null);
  };

  const handleExportCSV = () => {
    if (!exportType) {
        alert("請選擇訓練項目");
        return;
    }

    const filteredRecords = data.filter(r => {
        if (r.item !== 'training') return false;
        if (r.name !== exportType) return false;
        if (r.date !== exportDate) return false;
        return true;
    }).sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0)); 

    if (filteredRecords.length === 0) {
        alert("無符合條件的數據");
        return;
    }

    const grouped = new Map<string, string[]>();
    filteredRecords.forEach(r => {
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
            exportDate, 
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
    link.setAttribute("download", `LR_${exportType}_${exportDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isAdminUnlocked) {
      return (
        <div className="h-full flex flex-col items-center justify-center p-6 animate-fade-in relative">
           <div className="glass-card w-full max-w-xs rounded-3xl p-8 shadow-2xl border-white/10 text-center">
               <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                 <Lock size={32} className="text-white opacity-80" />
               </div>
               <h3 className="text-xl font-black text-white tracking-tight mb-2">系統設定鎖定</h3>
               <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-6">Admin Access Required</p>
               
               <input 
                  autoFocus
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*" 
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  placeholder="Admin Password"
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-center tracking-widest mb-4 outline-none focus:border-rose-500/50 shadow-inner"
               />
               <button 
                  onClick={handleAdminLogin}
                  disabled={!adminPasswordInput || isSyncing}
                  className="w-full py-3 bg-gradient-to-r from-rose-600 to-amber-500 text-white font-bold text-xs rounded-xl shadow-glow active:scale-95 transition-all flex items-center justify-center gap-2"
               >
                  {isSyncing ? <Loader2 size={16} className="animate-spin" /> : <Unlock size={16} />} 
                  驗證並登入
               </button>
           </div>
        </div>
      );
  }

  return (
    <div className="h-full overflow-y-auto px-3 pt-4 pb-20 space-y-6 animate-fade-in no-scrollbar relative">
      {/* ... (Existing Settings UI) ... */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center border border-white/5 shadow-inner">
            <SettingsIcon size={20} className="text-zinc-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">系統設定</h2>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">SYSTEM CONFIGURATION</p>
          </div>
        </div>
        {isSyncing && <Loader2 size={16} className="animate-spin text-rose-500" />}
      </div>

      <div className="glass-card-gold rounded-2xl p-4 animate-slide-up border-sunset-gold/30">
          <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center text-sunset-gold">
                      <KeyRound size={20} />
                  </div>
                  <div>
                      <div className="text-[9px] text-sunset-gold font-black uppercase tracking-widest">Guest OTP</div>
                      {otpInfo ? (
                          <div className="text-2xl font-mono font-black text-white tracking-widest">{otpInfo.code}</div>
                      ) : (
                          <div className="text-xs font-bold text-zinc-400 mt-0.5">尚未生成</div>
                      )}
                  </div>
              </div>
              
              <div className="flex flex-col items-end gap-2">
                  {otpInfo && (
                      <div className="text-right">
                          <div className="text-[8px] text-zinc-400 font-bold uppercase tracking-wider">Expires</div>
                          <div className="text-[10px] font-mono text-zinc-200">{otpInfo.expires}</div>
                      </div>
                  )}
                  <button 
                      onClick={handleGenerateOtp}
                      disabled={isGeneratingOtp}
                      className="bg-black/40 hover:bg-black/60 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg border border-white/10 active:scale-95 transition-all flex items-center gap-1.5"
                  >
                      {isGeneratingOtp ? <Loader2 size={10} className="animate-spin"/> : <Plus size={10}/>}
                      獲取訪客密鑰
                  </button>
              </div>
          </div>
      </div>

      <section className="glass-card rounded-2xl p-5 border border-white/5">
        <div className="flex items-center justify-between mb-4">
           <h3 className="text-xs font-bold text-zinc-500 flex items-center tracking-widest uppercase gap-2">
             <User size={14} className="text-rose-500" /> 選手名單管理
           </h3>
           <button 
                onClick={handleAddPersonClick}
                className="text-[10px] font-black bg-rose-600/10 text-rose-500 px-3 py-1.5 rounded-lg border border-rose-500/20 active:scale-95 transition-all flex items-center gap-1 hover:bg-rose-500/20"
           >
               <Plus size={12} /> 新增選手
           </button>
        </div>

        <div className="grid grid-cols-4 gap-2 max-h-96 overflow-y-auto no-scrollbar pr-1">
            {people.map((p) => {
            const [sUrlBase, sUrlFragment] = (p.s_url || '').split('#');
            let sz=1, sx=50, sy=50;
            if(sUrlFragment) {
                const sp = new URLSearchParams(sUrlFragment);
                sz = parseFloat(sp.get('z')||'1');
                sx = parseFloat(sp.get('x')||'50');
                sy = parseFloat(sp.get('y')||'50');
            }

            return (
                <div key={p.id} onClick={() => handleOpenEditPerson(p)} className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all relative overflow-hidden active:scale-95 cursor-pointer ${p.is_hidden ? 'bg-zinc-950/40 border-zinc-800 opacity-70' : 'bg-zinc-900/40 border-white/10 hover:bg-zinc-800'}`}>
                
                <div className="relative mb-2 w-16 h-16">
                    <div className={`w-full h-full rounded-full flex items-center justify-center overflow-hidden border-2 transition-colors relative ${p.is_hidden ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-800 border-rose-500 shadow-glow-rose'}`}>
                        {sUrlBase ? (
                            <img 
                                src={sUrlBase} 
                                alt={p.name} 
                                className="w-full h-full object-cover" 
                                style={{ transform: `translate(${(sx - 50) * 1.5}%, ${(sy - 50) * 1.5}%) scale(${sz})` }}
                            />
                        ) : (
                            <span className={`text-xs font-black ${p.is_hidden ? 'text-zinc-600' : 'text-white'}`}>{p.name.charAt(0)}</span>
                        )}
                    </div>
                    {p.is_hidden && (
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-700 z-10">
                            <span className="text-[8px] text-zinc-500 font-bold">退</span>
                            </div>
                    )}
                </div>

                <div className="flex flex-col items-center w-full">
                    <span className={`text-[9px] font-bold tracking-wider truncate max-w-full ${p.is_hidden ? 'text-zinc-600 line-through' : 'text-zinc-300'}`}>
                        {p.name}
                    </span>
                    {p.birthday && (
                            <span className="text-[7px] text-zinc-600 font-mono scale-90">{p.birthday.split('-')[0]}</span>
                    )}
                </div>
                </div>
            );
            })}
        </div>
      </section>

      {/* Rest of the sections (Training Types, Races, CSV) ... */}
      <section className="glass-card rounded-2xl p-5 border border-white/5">
        <h3 className="text-xs font-bold text-zinc-500 mb-4 flex items-center tracking-widest uppercase gap-2"><Activity size={14} className="text-amber-500" /> 訓練項目管理</h3>
        <div className="flex gap-3 mb-5">
          <input type="text" value={newType} onChange={(e) => setNewType(e.target.value)} placeholder="新增訓練項目..." className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-500/50 shadow-inner transition-colors" />
          <button onClick={handleAddType} disabled={!newType || isSyncing} className="bg-zinc-800 text-white rounded-xl px-4 border border-white/5 shadow-lg active:scale-95 transition-all"><Plus size={20} /></button>
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar pr-1">
          {trainingTypes.map((t) => (
            <div key={t.id} className="flex items-center justify-between bg-zinc-900/40 p-3 rounded-xl border border-white/5">
              {editingType?.id === t.id ? (
                <div className="flex-1 flex gap-2 mr-2">
                  <input autoFocus className="w-full bg-black/60 text-white text-xs px-2 py-1 rounded border border-amber-500/50 outline-none" value={editingType.name} onChange={(e) => setEditingType({...editingType, name: e.target.value})} />
                  <button onClick={handleUpdateType} className="text-green-500"><Save size={16}/></button>
                  <button onClick={() => setEditingType(null)} className="text-zinc-500"><X size={16}/></button>
                </div>
              ) : (
                <span className="text-xs font-black text-zinc-300 tracking-wider pl-2">{t.name}</span>
              )}
              <div className="flex items-center gap-1">
                 {!editingType && (
                   <>
                    <button onClick={() => handleToggleDefault(t)} className={`p-2 rounded-lg transition-colors ${t.is_default ? 'text-amber-500 bg-amber-500/10' : 'text-zinc-600 hover:text-amber-500'}`}><Star size={16} fill={t.is_default ? "currentColor" : "none"} /></button>
                    <button onClick={() => setEditingType({id: t.id, name: t.name, is_default: t.is_default})} className="p-2 text-zinc-600 hover:text-blue-400"><Edit2 size={16} /></button>
                    <button onClick={() => setDeleteTarget({table: 'training-types', id: t.id, name: t.name})} className="p-2 text-zinc-600 hover:text-rose-500"><Trash2 size={16} /></button>
                   </>
                 )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="glass-card rounded-2xl p-5 border border-white/5">
        <h3 className="text-xs font-bold text-zinc-500 mb-4 flex items-center tracking-widest uppercase gap-2"><Flag size={14} className="text-cyan-500" /> 賽事系列管理</h3>
        <div className="flex gap-3 mb-5">
          <input type="text" value={newGroup} onChange={(e) => setNewGroup(e.target.value)} placeholder="新增賽事系列..." className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan-500/50 shadow-inner transition-colors" />
          <button onClick={handleAddGroup} disabled={!newGroup || isSyncing} className="bg-zinc-800 text-white rounded-xl px-4 border border-white/5 shadow-lg active:scale-95 transition-all"><Plus size={20} /></button>
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar pr-1">
          {raceGroups.map((g) => (
            <div key={g.id} className="flex items-center justify-between bg-zinc-900/40 p-3 rounded-xl border border-white/5">
              {editingGroup?.id === g.id ? (
                <div className="flex-1 flex gap-2 mr-2">
                  <input autoFocus className="w-full bg-black/60 text-white text-xs px-2 py-1 rounded border border-cyan-500/50 outline-none" value={editingGroup.name} onChange={(e) => setEditingGroup({...editingGroup, name: e.target.value})} />
                  <button onClick={handleUpdateGroup} className="text-green-500"><Save size={16}/></button>
                  <button onClick={() => setEditingGroup(null)} className="text-zinc-500"><X size={16}/></button>
                </div>
              ) : (
                <span className="text-xs font-black text-zinc-300 tracking-wider pl-2">{g.name}</span>
              )}
              <div className="flex items-center gap-1">
                 {!editingGroup && (
                   <>
                    <button onClick={() => setEditingGroup({id: g.id, name: g.name})} className="p-2 text-zinc-600 hover:text-blue-400"><Edit2 size={16} /></button>
                    <button onClick={() => setDeleteTarget({table: 'races', id: g.id, name: g.name})} className="p-2 text-zinc-600 hover:text-rose-500"><Trash2 size={16} /></button>
                   </>
                 )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="glass-card rounded-2xl p-5 border border-white/5">
        <h3 className="text-xs font-bold text-zinc-500 mb-4 flex items-center tracking-widest uppercase gap-2"><FileSpreadsheet size={14} className="text-emerald-500" /> 數據導出 (CSV)</h3>
        <div className="flex flex-col gap-3">
            <div className="flex gap-3">
                <input 
                    type="date" 
                    value={exportDate} 
                    onChange={(e) => setExportDate(e.target.value)}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-emerald-500/50 shadow-inner" 
                />
                <div className="relative flex-1">
                    <select 
                        value={exportType}
                        onChange={(e) => setExportType(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-emerald-500/50 shadow-inner appearance-none"
                    >
                        {trainingTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                    </select>
                </div>
            </div>
            <button 
                onClick={handleExportCSV}
                className="w-full bg-zinc-800 text-emerald-500 font-bold text-xs tracking-widest py-3 rounded-xl border border-emerald-500/20 shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-zinc-700"
            >
                <Download size={16} /> 導出 CSV
            </button>
        </div>
      </section>

      {showEditPersonModal && editingPerson && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/85 backdrop-blur-md animate-fade-in" onClick={() => setShowEditPersonModal(false)}>
           <div className="glass-card w-full max-w-xs rounded-3xl p-6 shadow-2xl border-white/10 animate-scale-in max-h-[90vh] overflow-y-auto no-scrollbar" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                 <div>
                    <h3 className="text-lg font-black text-white">{editingPerson.id ? '編輯選手資料' : '新增選手'}</h3>
                    <p className="text-[10px] text-zinc-500 mt-0.5 font-bold uppercase tracking-wider">{editingPerson.id ? 'Player Profile' : 'New Player'}</p>
                 </div>
                 <button onClick={() => setShowEditPersonModal(false)} className="w-8 h-8 flex items-center justify-center bg-white/5 rounded-full text-zinc-400 active:scale-95"><X size={18} /></button>
              </div>

              <div className="space-y-4 mb-6">
                 <div className="flex items-center gap-2 mb-2 p-2 rounded-lg border border-zinc-800 bg-zinc-900/50">
                    <button 
                         onClick={() => setEditingPerson({...editingPerson, is_hidden: !editingPerson.is_hidden})}
                         className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${editingPerson.is_hidden ? 'bg-zinc-800 text-zinc-400 border border-zinc-700' : 'bg-green-500/10 text-green-500 border border-green-500/20'}`}
                    >
                         {editingPerson.is_hidden ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-white">{editingPerson.is_hidden ? '已退役' : '現役選手'}</span>
                        <span className="text-[9px] text-zinc-500">{editingPerson.is_hidden ? '選手將隱藏於紀錄板' : '正常顯示於所有列表'}</span>
                    </div>
                 </div>

                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">姓名</label>
                    <input 
                       autoFocus
                       type="text" 
                       value={editingPerson.name}
                       onChange={(e) => setEditingPerson({...editingPerson, name: e.target.value})}
                       className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-rose-500/50 transition-colors shadow-inner"
                    />
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 flex items-center gap-1"><CalendarDays size={12}/> 生日</label>
                    <input 
                       type="date"
                       lang="en-US"
                       value={editingPerson.birthday || ''}
                       onChange={(e) => setEditingPerson({...editingPerson, birthday: e.target.value})}
                       className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-mono outline-none focus:border-rose-500/50 transition-colors shadow-inner block appearance-none"
                       style={{colorScheme: 'dark'}}
                    />
                 </div>

                 {editingPerson.id && (
                    <>
                        <ImageCropperInput 
                            label={`頭像`}
                            urlValue={tempSUrl} 
                            onChange={setTempSUrl} 
                            ratioClass="aspect-square w-44 mx-auto rounded-full border-2 border-white/10"
                            personId={editingPerson.id}
                            typeSuffix="s"
                        />
                        <ImageCropperInput 
                            label={`全身照`}
                            urlValue={tempBUrl} 
                            onChange={setTempBUrl} 
                            ratioClass="aspect-[2/3] w-full mx-auto rounded-xl"
                            personId={editingPerson.id}
                            typeSuffix="b"
                        />
                    </>
                 )}

                 {editingPerson.id && (
                    <div className="pt-2 border-t border-white/10">
                        <button onClick={handleResetPassword} className="w-full py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all">
                            <RefreshCcw size={12} /> 重置密碼 (123456)
                        </button>
                    </div>
                 )}
              </div>

              <div className="flex gap-3">
                 <button 
                    onClick={handleSavePerson}
                    className="w-full py-3 bg-gradient-to-r from-rose-600 to-amber-500 text-white font-bold text-xs rounded-xl shadow-glow active:scale-95 transition-all flex items-center justify-center gap-2"
                 >
                    <Save size={16} /> 儲存變更
                 </button>
              </div>
           </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-xs rounded-3xl p-6 shadow-2xl border-rose-500/30 text-center animate-scale-in">
            <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
               <AlertTriangle size={32} className="text-rose-500" />
            </div>
            <h3 className="text-lg font-black text-white mb-2">確認移除項目？</h3>
            <p className="text-[10px] text-zinc-400 mb-6 leading-relaxed uppercase tracking-wider font-bold">
              項目「{deleteTarget.name}」的所有相關數據與關聯將會失效。
            </p>
            <div className="grid grid-cols-2 gap-3 mt-6">
              <button onClick={() => setDeleteTarget(null)} className="py-3 bg-zinc-900 text-zinc-400 font-bold text-xs rounded-xl active:bg-zinc-800 transition-colors border border-white/5">取消</button>
              <button onClick={executeDelete} className="py-3 bg-rose-600 text-white font-bold text-xs rounded-xl active:scale-95 transition-all shadow-glow-rose">
                確定刪除
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="text-center pt-8 opacity-30">
        <div className="text-[10px] font-black text-zinc-500 tracking-[0.4em] uppercase">Louie Professional</div>
        <div className="text-[8px] text-zinc-600 mt-2 font-mono italic">Performance Core v3.3 (D1 Engine)</div>
      </section>
    </div>
  );
};

export default Settings;
