
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { DataRecord, LookupItem } from '../types';
import { api } from '../services/api';
import { Search, Plus, X, Trophy, Calendar, Trash2, Edit2, Camera, Filter, ChevronDown, Loader2, MapPin, ExternalLink, Maximize, AlertTriangle, FileText, Link as LinkIcon } from 'lucide-react';
import { format } from 'date-fns';

interface RacesProps {
  data: DataRecord[];
  refreshData: () => Promise<void>;
  personName: string;
  raceGroups: LookupItem[]; 
}

const Races: React.FC<RacesProps> = ({ data, refreshData, personName, raceGroups }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedRaceId, setExpandedRaceId] = useState<string | number | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'future' | 'past'>('all');

  const initialForm: Partial<DataRecord> = {
    date: format(new Date(), 'yyyy-MM-dd'),
    name: '', // Maps to race_name
    race_id: raceGroups[0]?.id || '',
    value: '', // Maps to rank_text
    url: '',
    address: '',
    item: 'race',
    people_id: 1,
    note: '' 
  };

  const [formData, setFormData] = useState<Partial<DataRecord>>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  const [confirmDeleteData, setConfirmDeleteData] = useState<{id: string|number, name: string} | null>(null);

  const [zoomScale, setZoomScale] = useState(1);
  const [posX, setPosX] = useState(50); 
  const [posY, setPosY] = useState(50); 
  const cropperRef = useRef<HTMLDivElement>(null);

  const isDragging = useRef(false);
  const lastPoint = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!isEditMode && showAddModal) {
      setFormData(prev => ({ 
        ...prev, 
        race_id: raceGroups[0]?.id || '' 
      }));
    }
  }, [raceGroups, isEditMode, showAddModal]);

  const filteredRaces = useMemo(() => {
    let list = data.filter(r => r.item === 'race');
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      list = list.filter(r => r.name.toLowerCase().includes(lower) || r.race_group.toLowerCase().includes(lower));
    }
    if (selectedGroup) list = list.filter(r => r.race_group === selectedGroup);
    
    if (filterType === 'future') {
      list = list.filter(r => r.date >= todayStr);
    } else if (filterType === 'past') {
      list = list.filter(r => r.date < todayStr);
    }
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [data, searchTerm, filterType, selectedGroup]);

  const handleOpenAdd = () => {
    setFormData({ ...initialForm, race_id: raceGroups[0]?.id || '' });
    setZoomScale(1);
    setPosX(50);
    setPosY(50);
    setIsEditMode(false);
    setShowAddModal(true);
  };

  const handleEdit = (race: DataRecord) => {
    const [baseUrl, fragment] = race.url.split('#');
    let z = 1, x = 50, y = 50;
    if (fragment) {
      const params = new URLSearchParams(fragment);
      z = parseFloat(params.get('z') || '1');
      x = parseFloat(params.get('x') || '50');
      y = parseFloat(params.get('y') || '50');
    }
    setFormData({ ...race, url: baseUrl });
    setZoomScale(z);
    setPosX(x);
    setPosY(y);
    setIsEditMode(true);
    setShowAddModal(true);
  };

  const executeDelete = async () => {
    if (!confirmDeleteData) return;
    setIsDeleting(true);
    const success = await api.deleteRecord(confirmDeleteData.id, 'race');
    if (success) {
      await refreshData();
      setShowAddModal(false);
      setConfirmDeleteData(null);
    } else {
      alert("刪除失敗。");
    }
    setIsDeleting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.date || !formData.race_id) return;
    setIsSubmitting(true);
    
    const finalUrl = formData.url ? `${formData.url}#z=${zoomScale}&x=${posX}&y=${posY}` : '';
    const submissionData = { ...formData, url: finalUrl };

    const success = await api.submitRecord(submissionData);
    if (success) {
      await refreshData();
      setShowAddModal(false);
    } else {
      alert('同步失敗。');
    }
    setIsSubmitting(false);
  };

  const handleNavigate = (address: string) => {
    if (!address) return;
    if (address.startsWith('http')) {
      window.open(address, '_blank');
    } else {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
    }
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
        setPosX(prev => Math.min(100, Math.max(0, prev + deltaX)));
        setPosY(prev => Math.min(100, Math.max(0, prev + deltaY)));
    }
    lastPoint.current = { x: point.clientX, y: point.clientY };
  };

  const handleDragEnd = () => {
    isDragging.current = false;
  };

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="flex flex-col h-full w-full overflow-hidden animate-fade-in">
      <div className="flex-none px-4 pt-2 pb-3 space-y-4 bg-background/80 backdrop-blur-md z-30 border-b border-white/5 relative shadow-lg">
          <div className="flex justify-between items-end mt-1">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">賽事資訊</h2>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.3em] mt-0.5 italic">Elite Intelligence</p>
            </div>
            <button onClick={handleOpenAdd} className="w-11 h-11 rounded-2xl bg-gradient-to-br from-sunset-rose to-rose-700 flex items-center justify-center shadow-glow-rose active:scale-95 transition-all text-white border border-white/20">
              <Plus size={24} />
            </button>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 relative h-11">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                <input type="text" placeholder="檢索賽事..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full h-full bg-zinc-900/50 border border-white/10 rounded-xl pl-10 pr-3 text-white outline-none text-sm focus:border-sunset-rose/40 shadow-inner" />
            </div>
            <div className="relative w-[38%] h-11">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-sunset-gold" size={14} />
                <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)} className="w-full h-full appearance-none bg-zinc-900/50 border border-white/10 rounded-xl pl-9 pr-8 text-white text-xs font-black outline-none truncate shadow-inner">
                  <option value="">賽事系列</option>
                  {raceGroups.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={14} />
            </div>
          </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24 space-y-4 no-scrollbar">
        {filteredRaces.map((race, idx) => {
          const isUpcoming = race.date >= todayStr;
          const isExpanded = expandedRaceId === (race.id || idx);
          const [imageUrl, fragment] = race.url.split('#');
          let z = 1, x = 50, y = 50;
          if (fragment) {
             const params = new URLSearchParams(fragment);
             z = parseFloat(params.get('z') || '1');
             x = parseFloat(params.get('x') || '50');
             y = parseFloat(params.get('y') || '50');
          }

          return (
            <div 
              key={race.id || idx} 
              onClick={() => setExpandedRaceId(isExpanded ? null : (race.id || idx))}
              className={`${isUpcoming ? 'glass-card-gold border-sunset-gold/40' : 'glass-card border-white/10'} rounded-2xl p-0 relative overflow-hidden group animate-slide-up transition-all shadow-xl active:scale-[0.99]`} 
            >
              {imageUrl && (
                <div className="absolute inset-0 z-0 overflow-hidden rounded-2xl">
                  <div className={`absolute inset-0 z-10 transition-colors ${isUpcoming ? 'bg-black/20' : 'bg-black/70'}`} />
                  <img 
                    src={imageUrl} 
                    alt={race.name} 
                    className="w-full h-full object-cover" 
                    style={{ 
                       transform: `translate(${(x - 50) * 1.5}%, ${(y - 50) * 1.5}%) scale(${z})`
                    }}
                  />
                </div>
              )}
              <div className="relative z-10 p-5">
                <div className="flex justify-between items-start mb-4">
                  <div className="min-w-0 flex-1">
                    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-tighter mb-2 ${isUpcoming ? 'bg-sunset-gold text-amber-950 border-sunset-gold/50 shadow-glow-gold' : 'bg-white/10 text-white border-white/20 shadow-inner'}`}>
                       <Calendar size={10} />
                       <span className="font-mono">{race.date}</span>
                    </div>
                    <h3 className="text-xl font-black italic tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] leading-tight truncate">{race.name}</h3>
                    <p className="text-[11px] font-black text-white/95 mt-1 uppercase tracking-[0.15em] drop-shadow-md">{race.race_group || 'BxB'}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={(e) => { e.stopPropagation(); handleEdit(race); }} className="p-2 rounded-xl bg-white/10 text-white border border-white/20 backdrop-blur-md active:scale-90 shadow-lg"><Edit2 size={14} /></button>
                    {race.address && (
                      <button onClick={(e) => { e.stopPropagation(); handleNavigate(race.address); }} className="p-2 rounded-xl bg-black/60 text-white border border-white/20 backdrop-blur-md active:scale-90 shadow-lg">
                        {race.address.startsWith('http') ? <ExternalLink size={14} /> : <MapPin size={14} />}
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-end justify-between border-t border-white/20 pt-3 relative z-10">
                   <div className="flex flex-col min-w-0 flex-1">
                     <div className="flex items-center gap-2 mb-1">
                       <div className={`w-1.5 h-1.5 rounded-full ${isUpcoming ? 'bg-sunset-gold animate-pulse' : 'bg-emerald-500'}`}></div>
                       <span className="text-[10px] font-black text-white uppercase tracking-widest drop-shadow-sm">{isUpcoming ? '戰備預定' : '完賽紀錄'}</span>
                     </div>
                   </div>
                   <div className="flex items-baseline gap-2 shrink-0">
                      <Trophy size={16} className={race.value ? 'text-sunset-gold/90' : 'text-white/20'} />
                      <span className={`text-3xl font-black italic tracking-tighter drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] text-transparent bg-clip-text bg-gradient-to-r from-sunset-gold via-white to-white ${!race.value && 'opacity-20'}`}>
                        {race.value || '--'}
                      </span>
                   </div>
                </div>

                {isExpanded && race.note && (
                   <div className="mt-4 pt-4 border-t border-white/10 animate-fade-in relative z-10">
                      <div className="flex items-center gap-2 mb-2 text-sunset-gold/80">
                         <FileText size={12} />
                         <span className="text-[9px] font-black uppercase tracking-widest">心得筆記</span>
                      </div>
                      <p className="text-[11px] text-zinc-300 leading-relaxed font-medium bg-black/30 p-3 rounded-xl border border-white/5 shadow-inner">
                        {race.note}
                      </p>
                   </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-fade-in">
          <div className="glass-card w-full max-w-sm rounded-[32px] p-7 shadow-2xl relative bg-[#0a0508] border-white/20 animate-slide-up flex flex-col max-h-[95vh]">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-white tracking-tight">{isEditMode ? '修改紀錄' : '賽場登錄'}</h3>
                <p className="text-[9px] text-sunset-rose font-black uppercase tracking-[0.3em] mt-0.5">Race Deployment</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full text-zinc-400 active:scale-95"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto no-scrollbar pb-4 pr-1">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">日期</label>
                <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3.5 text-white font-mono outline-none shadow-inner" />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">比賽名稱</label>
                <input type="text" required placeholder="例如：全國滑步車邀請賽" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3.5 text-white outline-none shadow-inner" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">賽事系列 (下拉選擇)</label>
                  <div className="relative">
                    <select 
                      value={formData.race_id} 
                      onChange={e => setFormData({...formData, race_id: e.target.value})} 
                      className="w-full appearance-none bg-zinc-900 border border-white/10 rounded-xl px-4 py-3.5 text-white outline-none shadow-inner text-sm"
                    >
                      {raceGroups.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">最終排名</label>
                  <input type="text" placeholder="例如：冠軍" value={formData.value} onChange={e => setFormData({...formData, value: e.target.value})} className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3.5 text-white outline-none shadow-inner" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 flex items-center gap-1"><MapPin size={12}/> 比賽地址</label>
                <input type="text" placeholder="輸入地址或 Google Maps 連結..." value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3.5 text-white text-xs outline-none shadow-inner" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">心得筆記</label>
                <textarea rows={3} placeholder="記載參賽體感或技術細節..." value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-sunset-rose/50 resize-none shadow-inner" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 flex items-center gap-1"><Camera size={12}/> 照片連結 (URL)</label>
                <div className="flex gap-2">
                    <input type="url" placeholder="https://..." value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-4 py-3.5 text-white text-xs font-mono outline-none shadow-inner" />
                    {formData.url && (
                        <button type="button" onClick={() => window.open(formData.url, '_blank')} className="px-4 bg-zinc-800 rounded-xl text-sunset-gold active:scale-95 border border-white/5">
                            <LinkIcon size={14} />
                        </button>
                    )}
                </div>
              </div>

              {formData.url && (
                <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/10 shadow-lg">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1"><Maximize size={12}/> 照片校準</label>
                  <div 
                    ref={cropperRef}
                    className="relative h-48 rounded-xl overflow-hidden bg-black border border-white/10 shadow-inner group cursor-move touch-none"
                    style={{ touchAction: 'none' }}
                    onMouseDown={handleDragStart}
                    onMouseMove={handleDragMove}
                    onMouseUp={handleDragEnd}
                    onMouseLeave={handleDragEnd}
                    onTouchStart={handleDragStart}
                    onTouchMove={handleDragMove}
                    onTouchEnd={handleDragEnd}
                  >
                    <img 
                      src={formData.url} 
                      className="w-full h-full object-cover pointer-events-none select-none"
                      style={{ 
                        transform: `translate(${(posX - 50) * 1.5}%, ${(posY - 50) * 1.5}%) scale(${zoomScale})`
                      }}
                    />
                  </div>
                  <input type="range" min="1" max="5" step="0.01" value={zoomScale} onChange={e => setZoomScale(parseFloat(e.target.value))} className="w-full accent-sunset-rose h-1.5 bg-zinc-800 rounded-full appearance-none shadow-inner" />
                </div>
              )}

              <div className="pt-4 space-y-3">
                <button type="submit" disabled={isSubmitting} className="w-full bg-gradient-to-r from-sunset-rose to-rose-700 text-white font-black text-xs tracking-[0.3em] py-4 rounded-2xl active:scale-95 transition-all shadow-glow-rose">
                  {isSubmitting ? <Loader2 size={16} className="animate-spin mx-auto" /> : '同步變更數據'}
                </button>
                {isEditMode && (
                   <button 
                    type="button" 
                    onClick={() => setConfirmDeleteData({id: formData.id!, name: formData.name!})} 
                    disabled={isDeleting} 
                    className="w-full bg-rose-500/10 text-rose-500 font-bold text-[10px] tracking-widest py-3 rounded-2xl border border-rose-500/20 flex items-center justify-center gap-2 active:bg-rose-500/20 transition-all"
                  >
                    <Trash2 size={14} /> 永久移除紀錄
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDeleteData && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-xs rounded-3xl p-6 shadow-2xl border-rose-500/30 text-center animate-scale-in">
            <h3 className="text-lg font-black text-white mb-2">移除此場賽事？</h3>
            <div className="grid grid-cols-2 gap-3 mt-6">
              <button onClick={() => setConfirmDeleteData(null)} className="py-3 bg-zinc-900 text-zinc-400 font-bold text-xs rounded-xl active:bg-zinc-800 transition-colors border border-white/5">取消</button>
              <button onClick={executeDelete} disabled={isDeleting} className="py-3 bg-rose-600 text-white font-bold text-xs rounded-xl active:scale-95 transition-all shadow-glow-rose">
                {isDeleting ? '正在移除...' : '確定刪除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Races;
