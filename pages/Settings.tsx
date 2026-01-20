
import React, { useState, useRef, useEffect } from 'react';
import { Plus, Star, User, Activity, Settings as SettingsIcon, Edit2, Save, X, Flag, Loader2, AlertTriangle, Lock, Unlock, Eye, EyeOff, Cake, CalendarDays, Trash2, Image as ImageIcon, Maximize, Download, FileSpreadsheet } from 'lucide-react';
import { LookupItem, DataRecord } from '../types';
import { api } from '../services/api';
import { format } from 'date-fns';

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

// Helper Component for Image Cropper
const ImageCropperInput = ({ label, urlValue, onChange, ratioClass = 'h-32 w-full' }: { label: string, urlValue: string, onChange: (val: string) => void, ratioClass?: string }) => {
  const [baseUrl, fragment] = urlValue.split('#');
  
  // Initialize state
  const [z, setZ] = useState(1);
  const [x, setX] = useState(50);
  const [y, setY] = useState(50);

  // Sync state with props
  useEffect(() => {
      const [, frag] = urlValue.split('#');
      const params = new URLSearchParams(frag || '');
      setZ(parseFloat(params.get('z') || '1'));
      setX(parseFloat(params.get('x') || '50'));
      setY(parseFloat(params.get('y') || '50'));
  }, [urlValue]);
  
  const cropperRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const lastPoint = useRef({ x: 0, y: 0 });

  const updateUrl = (newZ: number, newX: number, newY: number) => {
      if (!baseUrl) return;
      onChange(`${baseUrl}#z=${newZ}&x=${newX}&y=${newY}`);
  };

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
      isDragging.current = true;
      const point = 'touches' in e ? e.touches[0] : (e as React.MouseEvent);
      lastPoint.current = { x: point.clientX, y: point.clientY };
  };
  
  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDragging.current || !cropperRef.current) return;
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
          <input 
              type="text" 
              placeholder="https://..."
              value={baseUrl}
              onChange={(e) => { onChange(e.target.value); }}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white text-xs font-mono outline-none focus:border-rose-500/50 transition-colors shadow-inner"
          />
          {baseUrl && (
               <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/10 shadow-lg mt-2">
                  <div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1"><Maximize size={10}/> 縮放與位置調整</div>
                  <div className="flex justify-center bg-black rounded-xl border border-white/5 p-2">
                    <div 
                        ref={cropperRef}
                        className={`relative overflow-hidden bg-zinc-900 border border-white/10 shadow-inner group cursor-move touch-none ${ratioClass}`}
                        style={{ touchAction: 'none' }}
                        onMouseDown={handleDragStart}
                        onMouseMove={handleDragMove}
                        onMouseUp={handleDragEnd}
                        onMouseLeave={handleDragEnd}
                        onTouchStart={handleDragStart}
                        onTouchMove={handleDragMove}
                        onTouchEnd={handleDragEnd}
                    >
                        {/* 修正：使用 object-contain 顯示原圖，不裁切，方便調整 */}
                        <img 
                            src={baseUrl} 
                            className="w-full h-full object-contain pointer-events-none select-none"
                            style={{ 
                                transform: `translate(${(x - 50) * 1.5}%, ${(y - 50) * 1.5}%) scale(${z})`
                            }}
                        />
                        {/* Grid Overlay */}
                        <div className="absolute inset-0 pointer-events-none opacity-20">
                            <div className="w-full h-full border border-white/30 flex">
                                <div className="flex-1 border-r border-white/30"></div>
                                <div className="flex-1 border-r border-white/30"></div>
                                <div className="flex-1"></div>
                            </div>
                            <div className="absolute inset-0 flex flex-col">
                                <div className="flex-1 border-b border-white/30"></div>
                                <div className="flex-1 border-b border-white/30"></div>
                                <div className="flex-1"></div>
                            </div>
                        </div>
                    </div>
                  </div>
                  <div className="px-1">
                      <div className="flex justify-between text-[8px] text-zinc-500 font-mono mb-1">
                          <span>ZOOM: {z.toFixed(2)}x</span>
                          <span>POS: {x.toFixed(0)},{y.toFixed(0)}</span>
                      </div>
                      <input 
                          type="range" 
                          min="0.1" max="5" step="0.01" 
                          value={z} 
                          onChange={e => {
                              const val = parseFloat(e.target.value);
                              setZ(val);
                              updateUrl(val, x, y);
                          }} 
                          className="w-full accent-sunset-rose h-1.5 bg-zinc-800 rounded-full appearance-none shadow-inner" 
                      />
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

  const [isPeopleUnlocked, setIsPeopleUnlocked] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonBirthday, setNewPersonBirthday] = useState('');
  
  const [editingPerson, setEditingPerson] = useState<LookupItem | null>(null);
  const [showEditPersonModal, setShowEditPersonModal] = useState(false);

  const [tempSUrl, setTempSUrl] = useState('');
  const [tempBUrl, setTempBUrl] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<{table: 'training-types' | 'races' | 'people', id: number | string, name: string} | null>(null);

  // CSV Export State - 預設為今天 (yyyy-MM-dd)
  const [exportDate, setExportDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [exportType, setExportType] = useState(defaultType || (trainingTypes[0]?.name || ''));

  // Update exportType when trainingTypes loaded
  useEffect(() => {
    if (!exportType && trainingTypes.length > 0) {
        setExportType(trainingTypes[0].name);
    }
  }, [trainingTypes, exportType]);

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
  };

  const handleAddType = () => handleAction(() => api.manageLookup('training-types', newType).then(res => { setNewType(''); return res; }));
  
  const handleToggleDefault = async (type: LookupItem) => {
    await handleAction(() => api.manageLookup('training-types', type.name, type.id, false, true));
    onUpdateDefault(type.name); 
  };

  const handleUpdateType = () => editingType && handleAction(() => api.manageLookup('training-types', editingType.name, editingType.id, false, editingType.is_default).then(res => { setEditingType(null); return res; }));
  
  const handleAddGroup = () => handleAction(() => api.manageLookup('races', newGroup).then(res => { setNewGroup(''); return res; }));
  const handleUpdateGroup = () => editingGroup && handleAction(() => api.manageLookup('races', editingGroup.name, editingGroup.id).then(res => { setEditingGroup(null); return res; }));

  const handleUnlock = async () => {
    if (passwordInput === 'chiachiacm') {
      setIsPeopleUnlocked(true);
      setShowPasswordModal(false);
      setPasswordInput('');
      
      // Auto-authenticate with API when unlocking UI
      // This solves the 401 Upload Error
      await api.authenticate('chiachiacm'); 
    } else {
      alert('密碼錯誤');
    }
  };

  const handleAddPerson = () => {
    if (!newPersonName) return;
    handleAction(() => api.manageLookup(
        'people', 
        newPersonName, 
        undefined, 
        false, 
        false, 
        { 
            birthday: newPersonBirthday || '', 
            is_hidden: false 
        }
    ).then(res => { 
        setNewPersonName(''); 
        setNewPersonBirthday('');
        return res; 
    }));
  };

  const handleOpenEditPerson = (p: LookupItem) => {
    setEditingPerson({ ...p });
    setTempSUrl(p.s_url || '');
    setTempBUrl(p.b_url || '');
    setShowEditPersonModal(true);
  };

  const handleSavePerson = () => {
    if (!editingPerson) return;
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
            b_url: tempBUrl
        }
    ).then(res => { 
        setShowEditPersonModal(false);
        setEditingPerson(null); 
        return res; 
    }));
  };

  const handleTogglePersonVisibility = (person: LookupItem) => {
    const newStatus = !person.is_hidden;
    handleAction(() => api.manageLookup(
        'people', 
        person.name, 
        person.id, 
        false, 
        false, 
        { 
            birthday: person.birthday || '', 
            is_hidden: newStatus,
            s_url: person.s_url || '',
            b_url: person.b_url || ''
        }
    ), person.id);
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

    // Filter records: Strict Date Match (YYYY-MM-DD)
    const filteredRecords = data.filter(r => {
        if (r.item !== 'training') return false;
        if (r.name !== exportType) return false;
        if (r.date !== exportDate) return false; // Exact match
        return true;
    }).sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0)); // Sort by ID asc (Sequence 1, 2, 3...)

    if (filteredRecords.length === 0) {
        alert("無符合條件的數據");
        return;
    }

    // Group by (Person Name)
    const grouped = new Map<string, string[]>();
    filteredRecords.forEach(r => {
        const key = r.person_name;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(r.value);
    });

    // Generate CSV Content with BOM for Chinese support
    let csvContent = "\uFEFF"; // BOM
    // Header
    csvContent += "Date,Name,null,null,Score1,Score2,Score3,Score4,Score5,Score6,Score7,Score8,Score9,Score10\n";
    
    // Sort by Name for tidiness
    const sortedNames = Array.from(grouped.keys()).sort();
    
    sortedNames.forEach(name => {
        const scores = grouped.get(name) || [];
        // Format: Date, Name, null, null, score1, score2...
        // Note: Using empty strings for "null" columns in CSV
        const row = [
            exportDate, 
            name, 
            "", 
            "", 
            ...scores
        ].join(",");
        csvContent += row + "\n";
    });

    // Create Download Link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `LR_${exportType}_${exportDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="h-full overflow-y-auto px-3 pt-4 pb-20 space-y-6 animate-fade-in no-scrollbar relative">
      
      {/* Header */}
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

      {/* 選手名單管理區塊 */}
      <section className="glass-card rounded-2xl p-5 border border-white/5">
        <div className="flex items-center justify-between mb-4">
           <h3 className="text-xs font-bold text-zinc-500 flex items-center tracking-widest uppercase gap-2">
             <User size={14} className="text-rose-500" /> 選手名單管理
           </h3>
        </div>

        {isPeopleUnlocked ? (
          <>
            {/* 新增選手輸入框 */}
            <div className="flex flex-col gap-3 mb-5 p-3 bg-zinc-900/50 rounded-xl border border-white/5">
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">新增選手</span>
              <div className="flex flex-col gap-3">
                <input 
                    type="text" 
                    value={newPersonName} 
                    onChange={(e) => setNewPersonName(e.target.value)} 
                    placeholder="姓名" 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-3 text-white text-xs outline-none focus:border-rose-500/50 transition-colors shadow-inner" 
                />
                <div className="flex gap-2">
                    <input 
                        type="date" 
                        value={newPersonBirthday} 
                        onChange={(e) => setNewPersonBirthday(e.target.value)} 
                        className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-3 text-white text-xs font-mono outline-none focus:border-rose-500/50 transition-colors shadow-inner" 
                    />
                    <button 
                        onClick={handleAddPerson} 
                        disabled={!newPersonName || isSyncing} 
                        className="w-12 bg-rose-600 text-white rounded-lg flex items-center justify-center border border-white/5 shadow-lg active:scale-95 transition-all disabled:opacity-50"
                    >
                        <Plus size={18} />
                    </button>
                </div>
              </div>
            </div>
            
            {/* 選手列表 */}
            <div className="grid grid-cols-4 gap-2 max-h-96 overflow-y-auto no-scrollbar pr-1">
              {people.map((p) => {
                const isLoading = togglingId === p.id;
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
                    
                    {/* 頭像區域 */}
                    <div className="relative mb-2 w-12 h-12">
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
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleTogglePersonVisibility(p); }} 
                            disabled={isLoading}
                            className="absolute -top-1 -right-2 w-6 h-6 flex items-center justify-center rounded-full bg-black/60 backdrop-blur-sm border border-white/10 text-white z-20"
                        >
                            {isLoading ? <Loader2 size={10} className="animate-spin" /> : (p.is_hidden ? <EyeOff size={10} className="text-zinc-400"/> : <Eye size={10} className="text-emerald-400"/>)}
                        </button>
                    </div>

                    {/* 名字區域 */}
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
          </>
        ) : (
          <div className="flex flex-wrap gap-2">
            {people.map(p => {
               const [sUrlBase, sUrlFragment] = (p.s_url || '').split('#');
               let sz=1, sx=50, sy=50;
               if(sUrlFragment) {
                  const sp = new URLSearchParams(sUrlFragment);
                  sz = parseFloat(sp.get('z')||'1');
                  sx = parseFloat(sp.get('x')||'50');
                  sy = parseFloat(sp.get('y')||'50');
               }
               return (
               <div key={p.id} className={`border rounded-xl px-2 py-1 text-[10px] font-black tracking-wider shadow-sm flex items-center gap-1.5 ${p.is_hidden ? 'bg-zinc-900/30 border-zinc-800/30 text-zinc-600' : 'bg-zinc-950/50 border-zinc-800/50 text-white'}`}>
                 <div className="w-4 h-4 rounded-full overflow-hidden flex items-center justify-center bg-zinc-800">
                     {sUrlBase ? (
                         <img src={sUrlBase} className="w-full h-full object-cover" style={{ transform: `translate(${(sx - 50) * 1.5}%, ${(sy - 50) * 1.5}%) scale(${sz})` }}/>
                     ) : (
                         <span className="text-[7px]">{p.name.charAt(0)}</span>
                     )}
                 </div>
                 {p.name}
                 {p.is_hidden && <span className="text-[7px] border border-zinc-700 px-0.5 rounded">退</span>}
               </div>
            )})}
            {people.length === 0 && <span className="text-zinc-600 text-[10px] italic">暫無名單</span>}
          </div>
        )}
      </section>

      {/* 訓練項目管理 */}
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

      {/* 賽事系列管理 */}
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

      {/* 數據導出 CSV */}
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

      {/* 編輯選手資料 Modal */}
      {showEditPersonModal && editingPerson && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/85 backdrop-blur-md animate-fade-in" onClick={() => setShowEditPersonModal(false)}>
           <div className="glass-card w-full max-w-xs rounded-3xl p-6 shadow-2xl border-white/10 animate-scale-in max-h-[90vh] overflow-y-auto no-scrollbar" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                 <div>
                    <h3 className="text-lg font-black text-white">編輯選手資料</h3>
                    <p className="text-[10px] text-zinc-500 mt-0.5 font-bold uppercase tracking-wider">Player Profile</p>
                 </div>
                 <button onClick={() => setShowEditPersonModal(false)} className="w-8 h-8 flex items-center justify-center bg-white/5 rounded-full text-zinc-400 active:scale-95"><X size={18} /></button>
              </div>

              <div className="space-y-4 mb-6">
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
                       value={editingPerson.birthday || ''}
                       onChange={(e) => setEditingPerson({...editingPerson, birthday: e.target.value})}
                       className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-mono outline-none focus:border-rose-500/50 transition-colors shadow-inner"
                    />
                 </div>

                 {/* 圖片 Croppers - Changed to show Original Image via ImageCropperInput modification */}
                 <ImageCropperInput 
                    label="頭像 (Small URL)" 
                    urlValue={tempSUrl} 
                    onChange={setTempSUrl} 
                    ratioClass="aspect-square w-32 mx-auto"
                 />
                 <ImageCropperInput 
                    label="全身照 (Big URL)" 
                    urlValue={tempBUrl} 
                    onChange={setTempBUrl} 
                    ratioClass="aspect-square w-full mx-auto"
                 />
                 
                 <div className="flex items-center gap-2 mt-2 p-2 rounded-lg border border-zinc-800 bg-zinc-900/50">
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

      {/* 刪除確認 Modal */}
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

      {/* 密碼驗證 Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="glass-card w-full max-w-xs rounded-3xl p-6 shadow-2xl border-white/10 animate-scale-in">
            <div className="text-center mb-6">
               <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
                 <Lock size={20} className="text-white" />
               </div>
               <h3 className="text-lg font-black text-white">管理員驗證</h3>
               <p className="text-[10px] text-zinc-500 mt-1">請輸入密碼以編輯選手名單及解鎖上傳權限</p>
            </div>
            <input 
              autoFocus
              type="password" 
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Password"
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-center tracking-widest mb-4 outline-none focus:border-rose-500/50"
            />
            <div className="grid grid-cols-2 gap-3">
               <button onClick={() => { setShowPasswordModal(false); setPasswordInput(''); }} className="py-3 bg-zinc-900 text-zinc-400 font-bold text-xs rounded-xl">取消</button>
               <button onClick={handleUnlock} className="py-3 bg-rose-600 text-white font-bold text-xs rounded-xl">解鎖</button>
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
